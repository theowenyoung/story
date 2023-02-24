// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible. Do not rely on good formatting of values
// for AssertionError messages in browsers.
import { bgGreen, bgRed, bold, gray, green, red, stripColor, white } from "../fmt/colors.ts";
import { diff, diffstr, DiffType } from "./_diff.ts";
const CAN_NOT_DISPLAY = "[Cannot display]";
export class AssertionError extends Error {
    name = "AssertionError";
    constructor(message){
        super(message);
    }
}
/**
 * Converts the input into a string. Objects, Sets and Maps are sorted so as to
 * make tests less flaky
 * @param v Value to be formatted
 */ export function _format(v) {
    // deno-lint-ignore no-explicit-any
    const { Deno  } = globalThis;
    return typeof Deno?.inspect === "function" ? Deno.inspect(v, {
        depth: Infinity,
        sorted: true,
        trailingComma: true,
        compact: false,
        iterableLimit: Infinity
    }) : `"${String(v).replace(/(?=["\\])/g, "\\")}"`;
}
/**
 * Colors the output of assertion diffs
 * @param diffType Difference type, either added or removed
 */ function createColor(diffType, { background =false  } = {}) {
    switch(diffType){
        case DiffType.added:
            return (s)=>background ? bgGreen(white(s)) : green(bold(s));
        case DiffType.removed:
            return (s)=>background ? bgRed(white(s)) : red(bold(s));
        default:
            return white;
    }
}
/**
 * Prefixes `+` or `-` in diff output
 * @param diffType Difference type, either added or removed
 */ function createSign(diffType) {
    switch(diffType){
        case DiffType.added:
            return "+   ";
        case DiffType.removed:
            return "-   ";
        default:
            return "    ";
    }
}
function buildMessage(diffResult, { stringDiff =false  } = {}) {
    const messages = [], diffMessages = [];
    messages.push("");
    messages.push("");
    messages.push(`    ${gray(bold("[Diff]"))} ${red(bold("Actual"))} / ${green(bold("Expected"))}`);
    messages.push("");
    messages.push("");
    diffResult.forEach((result)=>{
        const c = createColor(result.type);
        const line = result.details?.map((detail)=>detail.type !== DiffType.common ? createColor(detail.type, {
                background: true
            })(detail.value) : detail.value).join("") ?? result.value;
        diffMessages.push(c(`${createSign(result.type)}${line}`));
    });
    messages.push(...stringDiff ? [
        diffMessages.join("")
    ] : diffMessages);
    messages.push("");
    return messages;
}
function isKeyedCollection(x) {
    return [
        Symbol.iterator,
        "size"
    ].every((k)=>k in x);
}
/**
 * Deep equality comparison used in assertions
 * @param c actual value
 * @param d expected value
 */ export function equal(c, d) {
    const seen = new Map();
    return function compare(a, b) {
        // Have to render RegExp & Date for string comparison
        // unless it's mistreated as object
        if (a && b && (a instanceof RegExp && b instanceof RegExp || a instanceof URL && b instanceof URL)) {
            return String(a) === String(b);
        }
        if (a instanceof Date && b instanceof Date) {
            const aTime = a.getTime();
            const bTime = b.getTime();
            // Check for NaN equality manually since NaN is not
            // equal to itself.
            if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
                return true;
            }
            return a.getTime() === b.getTime();
        }
        if (Object.is(a, b)) {
            return true;
        }
        if (a && typeof a === "object" && b && typeof b === "object") {
            if (a && b && !constructorsEqual(a, b)) {
                return false;
            }
            if (a instanceof WeakMap || b instanceof WeakMap) {
                if (!(a instanceof WeakMap && b instanceof WeakMap)) return false;
                throw new TypeError("cannot compare WeakMap instances");
            }
            if (a instanceof WeakSet || b instanceof WeakSet) {
                if (!(a instanceof WeakSet && b instanceof WeakSet)) return false;
                throw new TypeError("cannot compare WeakSet instances");
            }
            if (seen.get(a) === b) {
                return true;
            }
            if (Object.keys(a || {}).length !== Object.keys(b || {}).length) {
                return false;
            }
            if (isKeyedCollection(a) && isKeyedCollection(b)) {
                if (a.size !== b.size) {
                    return false;
                }
                let unmatchedEntries = a.size;
                for (const [aKey, aValue] of a.entries()){
                    for (const [bKey, bValue] of b.entries()){
                        /* Given that Map keys can be references, we need
             * to ensure that they are also deeply equal */ if (aKey === aValue && bKey === bValue && compare(aKey, bKey) || compare(aKey, bKey) && compare(aValue, bValue)) {
                            unmatchedEntries--;
                        }
                    }
                }
                return unmatchedEntries === 0;
            }
            const merged = {
                ...a,
                ...b
            };
            for (const key of [
                ...Object.getOwnPropertyNames(merged),
                ...Object.getOwnPropertySymbols(merged)
            ]){
                if (!compare(a && a[key], b && b[key])) {
                    return false;
                }
                if (key in a && !(key in b) || key in b && !(key in a)) {
                    return false;
                }
            }
            seen.set(a, b);
            if (a instanceof WeakRef || b instanceof WeakRef) {
                if (!(a instanceof WeakRef && b instanceof WeakRef)) return false;
                return compare(a.deref(), b.deref());
            }
            return true;
        }
        return false;
    }(c, d);
}
// deno-lint-ignore ban-types
function constructorsEqual(a, b) {
    return a.constructor === b.constructor || a.constructor === Object && !b.constructor || !a.constructor && b.constructor === Object;
}
/** Make an assertion, error will be thrown if `expr` does not have truthy value. */ export function assert(expr, msg = "") {
    if (!expr) {
        throw new AssertionError(msg);
    }
}
export function assertEquals(actual, expected, msg) {
    if (equal(actual, expected)) {
        return;
    }
    let message = "";
    const actualString = _format(actual);
    const expectedString = _format(expected);
    try {
        const stringDiff = typeof actual === "string" && typeof expected === "string";
        const diffResult = stringDiff ? diffstr(actual, expected) : diff(actualString.split("\n"), expectedString.split("\n"));
        const diffMsg = buildMessage(diffResult, {
            stringDiff
        }).join("\n");
        message = `Values are not equal:\n${diffMsg}`;
    } catch  {
        message = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
    }
    if (msg) {
        message = msg;
    }
    throw new AssertionError(message);
}
export function assertNotEquals(actual, expected, msg) {
    if (!equal(actual, expected)) {
        return;
    }
    let actualString;
    let expectedString;
    try {
        actualString = String(actual);
    } catch  {
        actualString = "[Cannot display]";
    }
    try {
        expectedString = String(expected);
    } catch  {
        expectedString = "[Cannot display]";
    }
    if (!msg) {
        msg = `actual: ${actualString} expected: ${expectedString}`;
    }
    throw new AssertionError(msg);
}
export function assertStrictEquals(actual, expected, msg) {
    if (actual === expected) {
        return;
    }
    let message;
    if (msg) {
        message = msg;
    } else {
        const actualString = _format(actual);
        const expectedString = _format(expected);
        if (actualString === expectedString) {
            const withOffset = actualString.split("\n").map((l)=>`    ${l}`).join("\n");
            message = `Values have the same structure but are not reference-equal:\n\n${red(withOffset)}\n`;
        } else {
            try {
                const stringDiff = typeof actual === "string" && typeof expected === "string";
                const diffResult = stringDiff ? diffstr(actual, expected) : diff(actualString.split("\n"), expectedString.split("\n"));
                const diffMsg = buildMessage(diffResult, {
                    stringDiff
                }).join("\n");
                message = `Values are not strictly equal:\n${diffMsg}`;
            } catch  {
                message = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
            }
        }
    }
    throw new AssertionError(message);
}
export function assertNotStrictEquals(actual, expected, msg) {
    if (actual !== expected) {
        return;
    }
    throw new AssertionError(msg ?? `Expected "actual" to be strictly unequal to: ${_format(actual)}\n`);
}
/**
 * Make an assertion that actual is not null or undefined.
 * If not then throw.
 */ export function assertExists(actual, msg) {
    if (actual === undefined || actual === null) {
        if (!msg) {
            msg = `actual: "${actual}" expected to not be null or undefined`;
        }
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that actual includes expected. If not
 * then throw.
 */ export function assertStringIncludes(actual, expected, msg) {
    if (!actual.includes(expected)) {
        if (!msg) {
            msg = `actual: "${actual}" expected to contain: "${expected}"`;
        }
        throw new AssertionError(msg);
    }
}
export function assertArrayIncludes(actual, expected, msg) {
    const missing = [];
    for(let i = 0; i < expected.length; i++){
        let found = false;
        for(let j = 0; j < actual.length; j++){
            if (equal(expected[i], actual[j])) {
                found = true;
                break;
            }
        }
        if (!found) {
            missing.push(expected[i]);
        }
    }
    if (missing.length === 0) {
        return;
    }
    if (!msg) {
        msg = `actual: "${_format(actual)}" expected to include: "${_format(expected)}"\nmissing: ${_format(missing)}`;
    }
    throw new AssertionError(msg);
}
/**
 * Make an assertion that `actual` match RegExp `expected`. If not
 * then throw.
 */ export function assertMatch(actual, expected, msg) {
    if (!expected.test(actual)) {
        if (!msg) {
            msg = `actual: "${actual}" expected to match: "${expected}"`;
        }
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that `actual` not match RegExp `expected`. If match
 * then throw.
 */ export function assertNotMatch(actual, expected, msg) {
    if (expected.test(actual)) {
        if (!msg) {
            msg = `actual: "${actual}" expected to not match: "${expected}"`;
        }
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that `actual` object is a subset of `expected` object, deeply.
 * If not, then throw.
 */ export function assertObjectMatch(// deno-lint-ignore no-explicit-any
actual, expected) {
    const seen = new WeakMap();
    function filter(a, b) {
        // Prevent infinite loop with circular references with same filter
        if (seen.has(a) && seen.get(a) === b) {
            return a;
        }
        seen.set(a, b);
        // Filter keys and symbols which are present in both actual and expected
        const filtered = {};
        const entries = [
            ...Object.getOwnPropertyNames(a),
            ...Object.getOwnPropertySymbols(a)
        ].filter((key)=>key in b).map((key)=>[
                key,
                a[key]
            ]);
        for (const [key, value] of entries){
            // On array references, build a filtered array and filter nested objects inside
            if (Array.isArray(value)) {
                const subset = b[key];
                if (Array.isArray(subset)) {
                    filtered[key] = value.slice(0, subset.length).map((element, index)=>{
                        const subsetElement = subset[index];
                        if (typeof subsetElement === "object" && subsetElement) {
                            return filter(element, subsetElement);
                        }
                        return element;
                    });
                    continue;
                }
            } else if (typeof value === "object") {
                const subset = b[key];
                if (typeof subset === "object" && subset) {
                    filtered[key] = filter(value, subset);
                    continue;
                }
            }
            filtered[key] = value;
        }
        return filtered;
    }
    return assertEquals(// get the intersection of "actual" and "expected"
    // side effect: all the instances' constructor field is "Object" now.
    filter(actual, expected), // set (nested) instances' constructor field to be "Object" without changing expected value.
    // see https://github.com/denoland/deno_std/pull/1419
    filter(expected, expected));
}
/**
 * Forcefully throws a failed assertion
 */ export function fail(msg) {
    assert(false, `Failed assertion${msg ? `: ${msg}` : "."}`);
}
/**
 * Make an assertion that `error` is an `Error`.
 * If not then an error will be thrown.
 * An error class and a string that should be included in the
 * error message can also be asserted.
 */ export function assertIsError(error, // deno-lint-ignore no-explicit-any
ErrorClass, msgIncludes, msg) {
    if (error instanceof Error === false) {
        throw new AssertionError(`Expected "error" to be an Error object.`);
    }
    if (ErrorClass && !(error instanceof ErrorClass)) {
        msg = `Expected error to be instance of "${ErrorClass.name}", but was "${typeof error === "object" ? error?.constructor?.name : "[not an object]"}"${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
    }
    if (msgIncludes && (!(error instanceof Error) || !stripColor(error.message).includes(stripColor(msgIncludes)))) {
        msg = `Expected error message to include "${msgIncludes}", but got "${error instanceof Error ? error.message : "[not an Error]"}"${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
    }
}
export function assertThrows(fn, errorClassOrCallback, msgIncludesOrMsg, msg) {
    // deno-lint-ignore no-explicit-any
    let ErrorClass = undefined;
    let msgIncludes = undefined;
    let errorCallback;
    if (errorClassOrCallback == null || errorClassOrCallback.prototype instanceof Error || errorClassOrCallback.prototype === Error.prototype) {
        // deno-lint-ignore no-explicit-any
        ErrorClass = errorClassOrCallback;
        msgIncludes = msgIncludesOrMsg;
        errorCallback = null;
    } else {
        errorCallback = errorClassOrCallback;
        msg = msgIncludesOrMsg;
    }
    let doesThrow = false;
    try {
        fn();
    } catch (error) {
        if (error instanceof Error === false) {
            throw new AssertionError("A non-Error object was thrown.");
        }
        assertIsError(error, ErrorClass, msgIncludes, msg);
        if (typeof errorCallback == "function") {
            errorCallback(error);
        }
        doesThrow = true;
    }
    if (!doesThrow) {
        msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
    }
}
export async function assertRejects(fn, errorClassOrCallback, msgIncludesOrMsg, msg) {
    // deno-lint-ignore no-explicit-any
    let ErrorClass = undefined;
    let msgIncludes = undefined;
    let errorCallback;
    if (errorClassOrCallback == null || errorClassOrCallback.prototype instanceof Error || errorClassOrCallback.prototype === Error.prototype) {
        // deno-lint-ignore no-explicit-any
        ErrorClass = errorClassOrCallback;
        msgIncludes = msgIncludesOrMsg;
        errorCallback = null;
    } else {
        errorCallback = errorClassOrCallback;
        msg = msgIncludesOrMsg;
    }
    let doesThrow = false;
    try {
        await fn();
    } catch (error) {
        if (error instanceof Error === false) {
            throw new AssertionError("A non-Error object was thrown or rejected.");
        }
        assertIsError(error, ErrorClass, msgIncludes, msg);
        if (typeof errorCallback == "function") {
            errorCallback(error);
        }
        doesThrow = true;
    }
    if (!doesThrow) {
        msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
    }
}
/**
 * Executes a function which returns a promise, expecting it to throw or reject.
 * If it does not, then it throws.  An error class and a string that should be
 * included in the error message can also be asserted.
 *
 * @deprecated
 */ export { assertRejects as assertThrowsAsync };
/** Use this to stub out methods that will throw when invoked. */ export function unimplemented(msg) {
    throw new AssertionError(msg || "unimplemented");
}
/** Use this to assert unreachable code. */ export function unreachable() {
    throw new AssertionError("unreachable");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL3Rlc3RpbmcvYXNzZXJ0cy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIxIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLiBEbyBub3QgcmVseSBvbiBnb29kIGZvcm1hdHRpbmcgb2YgdmFsdWVzXG4vLyBmb3IgQXNzZXJ0aW9uRXJyb3IgbWVzc2FnZXMgaW4gYnJvd3NlcnMuXG5cbmltcG9ydCB7XG4gIGJnR3JlZW4sXG4gIGJnUmVkLFxuICBib2xkLFxuICBncmF5LFxuICBncmVlbixcbiAgcmVkLFxuICBzdHJpcENvbG9yLFxuICB3aGl0ZSxcbn0gZnJvbSBcIi4uL2ZtdC9jb2xvcnMudHNcIjtcbmltcG9ydCB7IGRpZmYsIERpZmZSZXN1bHQsIGRpZmZzdHIsIERpZmZUeXBlIH0gZnJvbSBcIi4vX2RpZmYudHNcIjtcblxuY29uc3QgQ0FOX05PVF9ESVNQTEFZID0gXCJbQ2Fubm90IGRpc3BsYXldXCI7XG5cbmV4cG9ydCBjbGFzcyBBc3NlcnRpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgbmFtZSA9IFwiQXNzZXJ0aW9uRXJyb3JcIjtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0cyB0aGUgaW5wdXQgaW50byBhIHN0cmluZy4gT2JqZWN0cywgU2V0cyBhbmQgTWFwcyBhcmUgc29ydGVkIHNvIGFzIHRvXG4gKiBtYWtlIHRlc3RzIGxlc3MgZmxha3lcbiAqIEBwYXJhbSB2IFZhbHVlIHRvIGJlIGZvcm1hdHRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gX2Zvcm1hdCh2OiB1bmtub3duKTogc3RyaW5nIHtcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgY29uc3QgeyBEZW5vIH0gPSBnbG9iYWxUaGlzIGFzIGFueTtcbiAgcmV0dXJuIHR5cGVvZiBEZW5vPy5pbnNwZWN0ID09PSBcImZ1bmN0aW9uXCJcbiAgICA/IERlbm8uaW5zcGVjdCh2LCB7XG4gICAgICBkZXB0aDogSW5maW5pdHksXG4gICAgICBzb3J0ZWQ6IHRydWUsXG4gICAgICB0cmFpbGluZ0NvbW1hOiB0cnVlLFxuICAgICAgY29tcGFjdDogZmFsc2UsXG4gICAgICBpdGVyYWJsZUxpbWl0OiBJbmZpbml0eSxcbiAgICB9KVxuICAgIDogYFwiJHtTdHJpbmcodikucmVwbGFjZSgvKD89W1wiXFxcXF0pL2csIFwiXFxcXFwiKX1cImA7XG59XG5cbi8qKlxuICogQ29sb3JzIHRoZSBvdXRwdXQgb2YgYXNzZXJ0aW9uIGRpZmZzXG4gKiBAcGFyYW0gZGlmZlR5cGUgRGlmZmVyZW5jZSB0eXBlLCBlaXRoZXIgYWRkZWQgb3IgcmVtb3ZlZFxuICovXG5mdW5jdGlvbiBjcmVhdGVDb2xvcihcbiAgZGlmZlR5cGU6IERpZmZUeXBlLFxuICB7IGJhY2tncm91bmQgPSBmYWxzZSB9ID0ge30sXG4pOiAoczogc3RyaW5nKSA9PiBzdHJpbmcge1xuICBzd2l0Y2ggKGRpZmZUeXBlKSB7XG4gICAgY2FzZSBEaWZmVHlwZS5hZGRlZDpcbiAgICAgIHJldHVybiAoczogc3RyaW5nKTogc3RyaW5nID0+XG4gICAgICAgIGJhY2tncm91bmQgPyBiZ0dyZWVuKHdoaXRlKHMpKSA6IGdyZWVuKGJvbGQocykpO1xuICAgIGNhc2UgRGlmZlR5cGUucmVtb3ZlZDpcbiAgICAgIHJldHVybiAoczogc3RyaW5nKTogc3RyaW5nID0+IGJhY2tncm91bmQgPyBiZ1JlZCh3aGl0ZShzKSkgOiByZWQoYm9sZChzKSk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB3aGl0ZTtcbiAgfVxufVxuXG4vKipcbiAqIFByZWZpeGVzIGArYCBvciBgLWAgaW4gZGlmZiBvdXRwdXRcbiAqIEBwYXJhbSBkaWZmVHlwZSBEaWZmZXJlbmNlIHR5cGUsIGVpdGhlciBhZGRlZCBvciByZW1vdmVkXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVNpZ24oZGlmZlR5cGU6IERpZmZUeXBlKTogc3RyaW5nIHtcbiAgc3dpdGNoIChkaWZmVHlwZSkge1xuICAgIGNhc2UgRGlmZlR5cGUuYWRkZWQ6XG4gICAgICByZXR1cm4gXCIrICAgXCI7XG4gICAgY2FzZSBEaWZmVHlwZS5yZW1vdmVkOlxuICAgICAgcmV0dXJuIFwiLSAgIFwiO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gXCIgICAgXCI7XG4gIH1cbn1cblxuZnVuY3Rpb24gYnVpbGRNZXNzYWdlKFxuICBkaWZmUmVzdWx0OiBSZWFkb25seUFycmF5PERpZmZSZXN1bHQ8c3RyaW5nPj4sXG4gIHsgc3RyaW5nRGlmZiA9IGZhbHNlIH0gPSB7fSxcbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgbWVzc2FnZXM6IHN0cmluZ1tdID0gW10sIGRpZmZNZXNzYWdlczogc3RyaW5nW10gPSBbXTtcbiAgbWVzc2FnZXMucHVzaChcIlwiKTtcbiAgbWVzc2FnZXMucHVzaChcIlwiKTtcbiAgbWVzc2FnZXMucHVzaChcbiAgICBgICAgICR7Z3JheShib2xkKFwiW0RpZmZdXCIpKX0gJHtyZWQoYm9sZChcIkFjdHVhbFwiKSl9IC8gJHtcbiAgICAgIGdyZWVuKGJvbGQoXCJFeHBlY3RlZFwiKSlcbiAgICB9YCxcbiAgKTtcbiAgbWVzc2FnZXMucHVzaChcIlwiKTtcbiAgbWVzc2FnZXMucHVzaChcIlwiKTtcbiAgZGlmZlJlc3VsdC5mb3JFYWNoKChyZXN1bHQ6IERpZmZSZXN1bHQ8c3RyaW5nPik6IHZvaWQgPT4ge1xuICAgIGNvbnN0IGMgPSBjcmVhdGVDb2xvcihyZXN1bHQudHlwZSk7XG4gICAgY29uc3QgbGluZSA9IHJlc3VsdC5kZXRhaWxzPy5tYXAoKGRldGFpbCkgPT5cbiAgICAgIGRldGFpbC50eXBlICE9PSBEaWZmVHlwZS5jb21tb25cbiAgICAgICAgPyBjcmVhdGVDb2xvcihkZXRhaWwudHlwZSwgeyBiYWNrZ3JvdW5kOiB0cnVlIH0pKGRldGFpbC52YWx1ZSlcbiAgICAgICAgOiBkZXRhaWwudmFsdWVcbiAgICApLmpvaW4oXCJcIikgPz8gcmVzdWx0LnZhbHVlO1xuICAgIGRpZmZNZXNzYWdlcy5wdXNoKGMoYCR7Y3JlYXRlU2lnbihyZXN1bHQudHlwZSl9JHtsaW5lfWApKTtcbiAgfSk7XG4gIG1lc3NhZ2VzLnB1c2goLi4uKHN0cmluZ0RpZmYgPyBbZGlmZk1lc3NhZ2VzLmpvaW4oXCJcIildIDogZGlmZk1lc3NhZ2VzKSk7XG4gIG1lc3NhZ2VzLnB1c2goXCJcIik7XG5cbiAgcmV0dXJuIG1lc3NhZ2VzO1xufVxuXG5mdW5jdGlvbiBpc0tleWVkQ29sbGVjdGlvbih4OiB1bmtub3duKTogeCBpcyBTZXQ8dW5rbm93bj4ge1xuICByZXR1cm4gW1N5bWJvbC5pdGVyYXRvciwgXCJzaXplXCJdLmV2ZXJ5KChrKSA9PiBrIGluICh4IGFzIFNldDx1bmtub3duPikpO1xufVxuXG4vKipcbiAqIERlZXAgZXF1YWxpdHkgY29tcGFyaXNvbiB1c2VkIGluIGFzc2VydGlvbnNcbiAqIEBwYXJhbSBjIGFjdHVhbCB2YWx1ZVxuICogQHBhcmFtIGQgZXhwZWN0ZWQgdmFsdWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsKGM6IHVua25vd24sIGQ6IHVua25vd24pOiBib29sZWFuIHtcbiAgY29uc3Qgc2VlbiA9IG5ldyBNYXAoKTtcbiAgcmV0dXJuIChmdW5jdGlvbiBjb21wYXJlKGE6IHVua25vd24sIGI6IHVua25vd24pOiBib29sZWFuIHtcbiAgICAvLyBIYXZlIHRvIHJlbmRlciBSZWdFeHAgJiBEYXRlIGZvciBzdHJpbmcgY29tcGFyaXNvblxuICAgIC8vIHVubGVzcyBpdCdzIG1pc3RyZWF0ZWQgYXMgb2JqZWN0XG4gICAgaWYgKFxuICAgICAgYSAmJlxuICAgICAgYiAmJlxuICAgICAgKChhIGluc3RhbmNlb2YgUmVnRXhwICYmIGIgaW5zdGFuY2VvZiBSZWdFeHApIHx8XG4gICAgICAgIChhIGluc3RhbmNlb2YgVVJMICYmIGIgaW5zdGFuY2VvZiBVUkwpKVxuICAgICkge1xuICAgICAgcmV0dXJuIFN0cmluZyhhKSA9PT0gU3RyaW5nKGIpO1xuICAgIH1cbiAgICBpZiAoYSBpbnN0YW5jZW9mIERhdGUgJiYgYiBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgIGNvbnN0IGFUaW1lID0gYS5nZXRUaW1lKCk7XG4gICAgICBjb25zdCBiVGltZSA9IGIuZ2V0VGltZSgpO1xuICAgICAgLy8gQ2hlY2sgZm9yIE5hTiBlcXVhbGl0eSBtYW51YWxseSBzaW5jZSBOYU4gaXMgbm90XG4gICAgICAvLyBlcXVhbCB0byBpdHNlbGYuXG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKGFUaW1lKSAmJiBOdW1iZXIuaXNOYU4oYlRpbWUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGEuZ2V0VGltZSgpID09PSBiLmdldFRpbWUoKTtcbiAgICB9XG4gICAgaWYgKE9iamVjdC5pcyhhLCBiKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChhICYmIHR5cGVvZiBhID09PSBcIm9iamVjdFwiICYmIGIgJiYgdHlwZW9mIGIgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIGlmIChhICYmIGIgJiYgIWNvbnN0cnVjdG9yc0VxdWFsKGEsIGIpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChhIGluc3RhbmNlb2YgV2Vha01hcCB8fCBiIGluc3RhbmNlb2YgV2Vha01hcCkge1xuICAgICAgICBpZiAoIShhIGluc3RhbmNlb2YgV2Vha01hcCAmJiBiIGluc3RhbmNlb2YgV2Vha01hcCkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCBjb21wYXJlIFdlYWtNYXAgaW5zdGFuY2VzXCIpO1xuICAgICAgfVxuICAgICAgaWYgKGEgaW5zdGFuY2VvZiBXZWFrU2V0IHx8IGIgaW5zdGFuY2VvZiBXZWFrU2V0KSB7XG4gICAgICAgIGlmICghKGEgaW5zdGFuY2VvZiBXZWFrU2V0ICYmIGIgaW5zdGFuY2VvZiBXZWFrU2V0KSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IGNvbXBhcmUgV2Vha1NldCBpbnN0YW5jZXNcIik7XG4gICAgICB9XG4gICAgICBpZiAoc2Vlbi5nZXQoYSkgPT09IGIpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoT2JqZWN0LmtleXMoYSB8fCB7fSkubGVuZ3RoICE9PSBPYmplY3Qua2V5cyhiIHx8IHt9KS5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKGlzS2V5ZWRDb2xsZWN0aW9uKGEpICYmIGlzS2V5ZWRDb2xsZWN0aW9uKGIpKSB7XG4gICAgICAgIGlmIChhLnNpemUgIT09IGIuc2l6ZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB1bm1hdGNoZWRFbnRyaWVzID0gYS5zaXplO1xuXG4gICAgICAgIGZvciAoY29uc3QgW2FLZXksIGFWYWx1ZV0gb2YgYS5lbnRyaWVzKCkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IFtiS2V5LCBiVmFsdWVdIG9mIGIuZW50cmllcygpKSB7XG4gICAgICAgICAgICAvKiBHaXZlbiB0aGF0IE1hcCBrZXlzIGNhbiBiZSByZWZlcmVuY2VzLCB3ZSBuZWVkXG4gICAgICAgICAgICAgKiB0byBlbnN1cmUgdGhhdCB0aGV5IGFyZSBhbHNvIGRlZXBseSBlcXVhbCAqL1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAoYUtleSA9PT0gYVZhbHVlICYmIGJLZXkgPT09IGJWYWx1ZSAmJiBjb21wYXJlKGFLZXksIGJLZXkpKSB8fFxuICAgICAgICAgICAgICAoY29tcGFyZShhS2V5LCBiS2V5KSAmJiBjb21wYXJlKGFWYWx1ZSwgYlZhbHVlKSlcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICB1bm1hdGNoZWRFbnRyaWVzLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHVubWF0Y2hlZEVudHJpZXMgPT09IDA7XG4gICAgICB9XG4gICAgICBjb25zdCBtZXJnZWQgPSB7IC4uLmEsIC4uLmIgfTtcbiAgICAgIGZvciAoXG4gICAgICAgIGNvbnN0IGtleSBvZiBbXG4gICAgICAgICAgLi4uT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMobWVyZ2VkKSxcbiAgICAgICAgICAuLi5PYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG1lcmdlZCksXG4gICAgICAgIF1cbiAgICAgICkge1xuICAgICAgICB0eXBlIEtleSA9IGtleW9mIHR5cGVvZiBtZXJnZWQ7XG4gICAgICAgIGlmICghY29tcGFyZShhICYmIGFba2V5IGFzIEtleV0sIGIgJiYgYltrZXkgYXMgS2V5XSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCgoa2V5IGluIGEpICYmICghKGtleSBpbiBiKSkpIHx8ICgoa2V5IGluIGIpICYmICghKGtleSBpbiBhKSkpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzZWVuLnNldChhLCBiKTtcbiAgICAgIGlmIChhIGluc3RhbmNlb2YgV2Vha1JlZiB8fCBiIGluc3RhbmNlb2YgV2Vha1JlZikge1xuICAgICAgICBpZiAoIShhIGluc3RhbmNlb2YgV2Vha1JlZiAmJiBiIGluc3RhbmNlb2YgV2Vha1JlZikpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGNvbXBhcmUoYS5kZXJlZigpLCBiLmRlcmVmKCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSkoYywgZCk7XG59XG5cbi8vIGRlbm8tbGludC1pZ25vcmUgYmFuLXR5cGVzXG5mdW5jdGlvbiBjb25zdHJ1Y3RvcnNFcXVhbChhOiBvYmplY3QsIGI6IG9iamVjdCkge1xuICByZXR1cm4gYS5jb25zdHJ1Y3RvciA9PT0gYi5jb25zdHJ1Y3RvciB8fFxuICAgIGEuY29uc3RydWN0b3IgPT09IE9iamVjdCAmJiAhYi5jb25zdHJ1Y3RvciB8fFxuICAgICFhLmNvbnN0cnVjdG9yICYmIGIuY29uc3RydWN0b3IgPT09IE9iamVjdDtcbn1cblxuLyoqIE1ha2UgYW4gYXNzZXJ0aW9uLCBlcnJvciB3aWxsIGJlIHRocm93biBpZiBgZXhwcmAgZG9lcyBub3QgaGF2ZSB0cnV0aHkgdmFsdWUuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0KGV4cHI6IHVua25vd24sIG1zZyA9IFwiXCIpOiBhc3NlcnRzIGV4cHIge1xuICBpZiAoIWV4cHIpIHtcbiAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgfVxufVxuXG4vKipcbiAqIE1ha2UgYW4gYXNzZXJ0aW9uIHRoYXQgYGFjdHVhbGAgYW5kIGBleHBlY3RlZGAgYXJlIGVxdWFsLCBkZWVwbHkuIElmIG5vdFxuICogZGVlcGx5IGVxdWFsLCB0aGVuIHRocm93LlxuICpcbiAqIFR5cGUgcGFyYW1ldGVyIGNhbiBiZSBzcGVjaWZpZWQgdG8gZW5zdXJlIHZhbHVlcyB1bmRlciBjb21wYXJpc29uIGhhdmUgdGhlIHNhbWUgdHlwZS5cbiAqIEZvciBleGFtcGxlOlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGFzc2VydEVxdWFscyB9IGZyb20gXCIuL2Fzc2VydHMudHNcIjtcbiAqXG4gKiBhc3NlcnRFcXVhbHM8bnVtYmVyPigxLCAyKVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRFcXVhbHMoXG4gIGFjdHVhbDogdW5rbm93bixcbiAgZXhwZWN0ZWQ6IHVua25vd24sXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RXF1YWxzPFQ+KGFjdHVhbDogVCwgZXhwZWN0ZWQ6IFQsIG1zZz86IHN0cmluZyk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RXF1YWxzKFxuICBhY3R1YWw6IHVua25vd24sXG4gIGV4cGVjdGVkOiB1bmtub3duLFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkIHtcbiAgaWYgKGVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGxldCBtZXNzYWdlID0gXCJcIjtcbiAgY29uc3QgYWN0dWFsU3RyaW5nID0gX2Zvcm1hdChhY3R1YWwpO1xuICBjb25zdCBleHBlY3RlZFN0cmluZyA9IF9mb3JtYXQoZXhwZWN0ZWQpO1xuICB0cnkge1xuICAgIGNvbnN0IHN0cmluZ0RpZmYgPSAodHlwZW9mIGFjdHVhbCA9PT0gXCJzdHJpbmdcIikgJiZcbiAgICAgICh0eXBlb2YgZXhwZWN0ZWQgPT09IFwic3RyaW5nXCIpO1xuICAgIGNvbnN0IGRpZmZSZXN1bHQgPSBzdHJpbmdEaWZmXG4gICAgICA/IGRpZmZzdHIoYWN0dWFsIGFzIHN0cmluZywgZXhwZWN0ZWQgYXMgc3RyaW5nKVxuICAgICAgOiBkaWZmKGFjdHVhbFN0cmluZy5zcGxpdChcIlxcblwiKSwgZXhwZWN0ZWRTdHJpbmcuc3BsaXQoXCJcXG5cIikpO1xuICAgIGNvbnN0IGRpZmZNc2cgPSBidWlsZE1lc3NhZ2UoZGlmZlJlc3VsdCwgeyBzdHJpbmdEaWZmIH0pLmpvaW4oXCJcXG5cIik7XG4gICAgbWVzc2FnZSA9IGBWYWx1ZXMgYXJlIG5vdCBlcXVhbDpcXG4ke2RpZmZNc2d9YDtcbiAgfSBjYXRjaCB7XG4gICAgbWVzc2FnZSA9IGBcXG4ke3JlZChDQU5fTk9UX0RJU1BMQVkpfSArIFxcblxcbmA7XG4gIH1cbiAgaWYgKG1zZykge1xuICAgIG1lc3NhZ2UgPSBtc2c7XG4gIH1cbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1lc3NhZ2UpO1xufVxuXG4vKipcbiAqIE1ha2UgYW4gYXNzZXJ0aW9uIHRoYXQgYGFjdHVhbGAgYW5kIGBleHBlY3RlZGAgYXJlIG5vdCBlcXVhbCwgZGVlcGx5LlxuICogSWYgbm90IHRoZW4gdGhyb3cuXG4gKlxuICogVHlwZSBwYXJhbWV0ZXIgY2FuIGJlIHNwZWNpZmllZCB0byBlbnN1cmUgdmFsdWVzIHVuZGVyIGNvbXBhcmlzb24gaGF2ZSB0aGUgc2FtZSB0eXBlLlxuICogRm9yIGV4YW1wbGU6XG4gKiBgYGB0c1xuICogaW1wb3J0IHsgYXNzZXJ0Tm90RXF1YWxzIH0gZnJvbSBcIi4vYXNzZXJ0cy50c1wiO1xuICpcbiAqIGFzc2VydE5vdEVxdWFsczxudW1iZXI+KDEsIDIpXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE5vdEVxdWFscyhcbiAgYWN0dWFsOiB1bmtub3duLFxuICBleHBlY3RlZDogdW5rbm93bixcbiAgbXNnPzogc3RyaW5nLFxuKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnROb3RFcXVhbHM8VD4oYWN0dWFsOiBULCBleHBlY3RlZDogVCwgbXNnPzogc3RyaW5nKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnROb3RFcXVhbHMoXG4gIGFjdHVhbDogdW5rbm93bixcbiAgZXhwZWN0ZWQ6IHVua25vd24sXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQge1xuICBpZiAoIWVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGxldCBhY3R1YWxTdHJpbmc6IHN0cmluZztcbiAgbGV0IGV4cGVjdGVkU3RyaW5nOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgYWN0dWFsU3RyaW5nID0gU3RyaW5nKGFjdHVhbCk7XG4gIH0gY2F0Y2gge1xuICAgIGFjdHVhbFN0cmluZyA9IFwiW0Nhbm5vdCBkaXNwbGF5XVwiO1xuICB9XG4gIHRyeSB7XG4gICAgZXhwZWN0ZWRTdHJpbmcgPSBTdHJpbmcoZXhwZWN0ZWQpO1xuICB9IGNhdGNoIHtcbiAgICBleHBlY3RlZFN0cmluZyA9IFwiW0Nhbm5vdCBkaXNwbGF5XVwiO1xuICB9XG4gIGlmICghbXNnKSB7XG4gICAgbXNnID0gYGFjdHVhbDogJHthY3R1YWxTdHJpbmd9IGV4cGVjdGVkOiAke2V4cGVjdGVkU3RyaW5nfWA7XG4gIH1cbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBhbmQgYGV4cGVjdGVkYCBhcmUgc3RyaWN0bHkgZXF1YWwuIElmXG4gKiBub3QgdGhlbiB0aHJvdy5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgYXNzZXJ0U3RyaWN0RXF1YWxzIH0gZnJvbSBcIi4vYXNzZXJ0cy50c1wiO1xuICpcbiAqIGFzc2VydFN0cmljdEVxdWFscygxLCAyKVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRTdHJpY3RFcXVhbHMoXG4gIGFjdHVhbDogdW5rbm93bixcbiAgZXhwZWN0ZWQ6IHVua25vd24sXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0U3RyaWN0RXF1YWxzPFQ+KFxuICBhY3R1YWw6IFQsXG4gIGV4cGVjdGVkOiBULFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFN0cmljdEVxdWFscyhcbiAgYWN0dWFsOiB1bmtub3duLFxuICBleHBlY3RlZDogdW5rbm93bixcbiAgbXNnPzogc3RyaW5nLFxuKTogdm9pZCB7XG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IG1lc3NhZ2U6IHN0cmluZztcblxuICBpZiAobXNnKSB7XG4gICAgbWVzc2FnZSA9IG1zZztcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBhY3R1YWxTdHJpbmcgPSBfZm9ybWF0KGFjdHVhbCk7XG4gICAgY29uc3QgZXhwZWN0ZWRTdHJpbmcgPSBfZm9ybWF0KGV4cGVjdGVkKTtcblxuICAgIGlmIChhY3R1YWxTdHJpbmcgPT09IGV4cGVjdGVkU3RyaW5nKSB7XG4gICAgICBjb25zdCB3aXRoT2Zmc2V0ID0gYWN0dWFsU3RyaW5nXG4gICAgICAgIC5zcGxpdChcIlxcblwiKVxuICAgICAgICAubWFwKChsKSA9PiBgICAgICR7bH1gKVxuICAgICAgICAuam9pbihcIlxcblwiKTtcbiAgICAgIG1lc3NhZ2UgPVxuICAgICAgICBgVmFsdWVzIGhhdmUgdGhlIHNhbWUgc3RydWN0dXJlIGJ1dCBhcmUgbm90IHJlZmVyZW5jZS1lcXVhbDpcXG5cXG4ke1xuICAgICAgICAgIHJlZCh3aXRoT2Zmc2V0KVxuICAgICAgICB9XFxuYDtcbiAgICB9IGVsc2Uge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgc3RyaW5nRGlmZiA9ICh0eXBlb2YgYWN0dWFsID09PSBcInN0cmluZ1wiKSAmJlxuICAgICAgICAgICh0eXBlb2YgZXhwZWN0ZWQgPT09IFwic3RyaW5nXCIpO1xuICAgICAgICBjb25zdCBkaWZmUmVzdWx0ID0gc3RyaW5nRGlmZlxuICAgICAgICAgID8gZGlmZnN0cihhY3R1YWwgYXMgc3RyaW5nLCBleHBlY3RlZCBhcyBzdHJpbmcpXG4gICAgICAgICAgOiBkaWZmKGFjdHVhbFN0cmluZy5zcGxpdChcIlxcblwiKSwgZXhwZWN0ZWRTdHJpbmcuc3BsaXQoXCJcXG5cIikpO1xuICAgICAgICBjb25zdCBkaWZmTXNnID0gYnVpbGRNZXNzYWdlKGRpZmZSZXN1bHQsIHsgc3RyaW5nRGlmZiB9KS5qb2luKFwiXFxuXCIpO1xuICAgICAgICBtZXNzYWdlID0gYFZhbHVlcyBhcmUgbm90IHN0cmljdGx5IGVxdWFsOlxcbiR7ZGlmZk1zZ31gO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIG1lc3NhZ2UgPSBgXFxuJHtyZWQoQ0FOX05PVF9ESVNQTEFZKX0gKyBcXG5cXG5gO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtZXNzYWdlKTtcbn1cblxuLyoqXG4gKiBNYWtlIGFuIGFzc2VydGlvbiB0aGF0IGBhY3R1YWxgIGFuZCBgZXhwZWN0ZWRgIGFyZSBub3Qgc3RyaWN0bHkgZXF1YWwuXG4gKiBJZiB0aGUgdmFsdWVzIGFyZSBzdHJpY3RseSBlcXVhbCB0aGVuIHRocm93LlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBhc3NlcnROb3RTdHJpY3RFcXVhbHMgfSBmcm9tIFwiLi9hc3NlcnRzLnRzXCI7XG4gKlxuICogYXNzZXJ0Tm90U3RyaWN0RXF1YWxzKDEsIDEpXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE5vdFN0cmljdEVxdWFscyhcbiAgYWN0dWFsOiB1bmtub3duLFxuICBleHBlY3RlZDogdW5rbm93bixcbiAgbXNnPzogc3RyaW5nLFxuKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnROb3RTdHJpY3RFcXVhbHM8VD4oXG4gIGFjdHVhbDogVCxcbiAgZXhwZWN0ZWQ6IFQsXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Tm90U3RyaWN0RXF1YWxzKFxuICBhY3R1YWw6IHVua25vd24sXG4gIGV4cGVjdGVkOiB1bmtub3duLFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkIHtcbiAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IoXG4gICAgbXNnID8/IGBFeHBlY3RlZCBcImFjdHVhbFwiIHRvIGJlIHN0cmljdGx5IHVuZXF1YWwgdG86ICR7X2Zvcm1hdChhY3R1YWwpfVxcbmAsXG4gICk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBhY3R1YWwgaXMgbm90IG51bGwgb3IgdW5kZWZpbmVkLlxuICogSWYgbm90IHRoZW4gdGhyb3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRFeGlzdHM8VD4oXG4gIGFjdHVhbDogVCxcbiAgbXNnPzogc3RyaW5nLFxuKTogYXNzZXJ0cyBhY3R1YWwgaXMgTm9uTnVsbGFibGU8VD4ge1xuICBpZiAoYWN0dWFsID09PSB1bmRlZmluZWQgfHwgYWN0dWFsID09PSBudWxsKSB7XG4gICAgaWYgKCFtc2cpIHtcbiAgICAgIG1zZyA9IGBhY3R1YWw6IFwiJHthY3R1YWx9XCIgZXhwZWN0ZWQgdG8gbm90IGJlIG51bGwgb3IgdW5kZWZpbmVkYDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBNYWtlIGFuIGFzc2VydGlvbiB0aGF0IGFjdHVhbCBpbmNsdWRlcyBleHBlY3RlZC4gSWYgbm90XG4gKiB0aGVuIHRocm93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0U3RyaW5nSW5jbHVkZXMoXG4gIGFjdHVhbDogc3RyaW5nLFxuICBleHBlY3RlZDogc3RyaW5nLFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkIHtcbiAgaWYgKCFhY3R1YWwuaW5jbHVkZXMoZXhwZWN0ZWQpKSB7XG4gICAgaWYgKCFtc2cpIHtcbiAgICAgIG1zZyA9IGBhY3R1YWw6IFwiJHthY3R1YWx9XCIgZXhwZWN0ZWQgdG8gY29udGFpbjogXCIke2V4cGVjdGVkfVwiYDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBNYWtlIGFuIGFzc2VydGlvbiB0aGF0IGBhY3R1YWxgIGluY2x1ZGVzIHRoZSBgZXhwZWN0ZWRgIHZhbHVlcy5cbiAqIElmIG5vdCB0aGVuIGFuIGVycm9yIHdpbGwgYmUgdGhyb3duLlxuICpcbiAqIFR5cGUgcGFyYW1ldGVyIGNhbiBiZSBzcGVjaWZpZWQgdG8gZW5zdXJlIHZhbHVlcyB1bmRlciBjb21wYXJpc29uIGhhdmUgdGhlIHNhbWUgdHlwZS5cbiAqIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBhc3NlcnRBcnJheUluY2x1ZGVzIH0gZnJvbSBcIi4vYXNzZXJ0cy50c1wiO1xuICpcbiAqIGFzc2VydEFycmF5SW5jbHVkZXM8bnVtYmVyPihbMSwgMl0sIFsyXSlcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0QXJyYXlJbmNsdWRlcyhcbiAgYWN0dWFsOiBBcnJheUxpa2U8dW5rbm93bj4sXG4gIGV4cGVjdGVkOiBBcnJheUxpa2U8dW5rbm93bj4sXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0QXJyYXlJbmNsdWRlczxUPihcbiAgYWN0dWFsOiBBcnJheUxpa2U8VD4sXG4gIGV4cGVjdGVkOiBBcnJheUxpa2U8VD4sXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0QXJyYXlJbmNsdWRlcyhcbiAgYWN0dWFsOiBBcnJheUxpa2U8dW5rbm93bj4sXG4gIGV4cGVjdGVkOiBBcnJheUxpa2U8dW5rbm93bj4sXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQge1xuICBjb25zdCBtaXNzaW5nOiB1bmtub3duW10gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHBlY3RlZC5sZW5ndGg7IGkrKykge1xuICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgYWN0dWFsLmxlbmd0aDsgaisrKSB7XG4gICAgICBpZiAoZXF1YWwoZXhwZWN0ZWRbaV0sIGFjdHVhbFtqXSkpIHtcbiAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgbWlzc2luZy5wdXNoKGV4cGVjdGVkW2ldKTtcbiAgICB9XG4gIH1cbiAgaWYgKG1pc3NpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghbXNnKSB7XG4gICAgbXNnID0gYGFjdHVhbDogXCIke19mb3JtYXQoYWN0dWFsKX1cIiBleHBlY3RlZCB0byBpbmNsdWRlOiBcIiR7XG4gICAgICBfZm9ybWF0KGV4cGVjdGVkKVxuICAgIH1cIlxcbm1pc3Npbmc6ICR7X2Zvcm1hdChtaXNzaW5nKX1gO1xuICB9XG4gIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xufVxuXG4vKipcbiAqIE1ha2UgYW4gYXNzZXJ0aW9uIHRoYXQgYGFjdHVhbGAgbWF0Y2ggUmVnRXhwIGBleHBlY3RlZGAuIElmIG5vdFxuICogdGhlbiB0aHJvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE1hdGNoKFxuICBhY3R1YWw6IHN0cmluZyxcbiAgZXhwZWN0ZWQ6IFJlZ0V4cCxcbiAgbXNnPzogc3RyaW5nLFxuKTogdm9pZCB7XG4gIGlmICghZXhwZWN0ZWQudGVzdChhY3R1YWwpKSB7XG4gICAgaWYgKCFtc2cpIHtcbiAgICAgIG1zZyA9IGBhY3R1YWw6IFwiJHthY3R1YWx9XCIgZXhwZWN0ZWQgdG8gbWF0Y2g6IFwiJHtleHBlY3RlZH1cImA7XG4gICAgfVxuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICB9XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBub3QgbWF0Y2ggUmVnRXhwIGBleHBlY3RlZGAuIElmIG1hdGNoXG4gKiB0aGVuIHRocm93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Tm90TWF0Y2goXG4gIGFjdHVhbDogc3RyaW5nLFxuICBleHBlY3RlZDogUmVnRXhwLFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkIHtcbiAgaWYgKGV4cGVjdGVkLnRlc3QoYWN0dWFsKSkge1xuICAgIGlmICghbXNnKSB7XG4gICAgICBtc2cgPSBgYWN0dWFsOiBcIiR7YWN0dWFsfVwiIGV4cGVjdGVkIHRvIG5vdCBtYXRjaDogXCIke2V4cGVjdGVkfVwiYDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBNYWtlIGFuIGFzc2VydGlvbiB0aGF0IGBhY3R1YWxgIG9iamVjdCBpcyBhIHN1YnNldCBvZiBgZXhwZWN0ZWRgIG9iamVjdCwgZGVlcGx5LlxuICogSWYgbm90LCB0aGVuIHRocm93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0T2JqZWN0TWF0Y2goXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIGFjdHVhbDogUmVjb3JkPFByb3BlcnR5S2V5LCBhbnk+LFxuICBleHBlY3RlZDogUmVjb3JkPFByb3BlcnR5S2V5LCB1bmtub3duPixcbik6IHZvaWQge1xuICB0eXBlIGxvb3NlID0gUmVjb3JkPFByb3BlcnR5S2V5LCB1bmtub3duPjtcbiAgY29uc3Qgc2VlbiA9IG5ldyBXZWFrTWFwKCk7XG4gIGZ1bmN0aW9uIGZpbHRlcihhOiBsb29zZSwgYjogbG9vc2UpOiBsb29zZSB7XG4gICAgLy8gUHJldmVudCBpbmZpbml0ZSBsb29wIHdpdGggY2lyY3VsYXIgcmVmZXJlbmNlcyB3aXRoIHNhbWUgZmlsdGVyXG4gICAgaWYgKChzZWVuLmhhcyhhKSkgJiYgKHNlZW4uZ2V0KGEpID09PSBiKSkge1xuICAgICAgcmV0dXJuIGE7XG4gICAgfVxuICAgIHNlZW4uc2V0KGEsIGIpO1xuICAgIC8vIEZpbHRlciBrZXlzIGFuZCBzeW1ib2xzIHdoaWNoIGFyZSBwcmVzZW50IGluIGJvdGggYWN0dWFsIGFuZCBleHBlY3RlZFxuICAgIGNvbnN0IGZpbHRlcmVkID0ge30gYXMgbG9vc2U7XG4gICAgY29uc3QgZW50cmllcyA9IFtcbiAgICAgIC4uLk9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGEpLFxuICAgICAgLi4uT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhhKSxcbiAgICBdXG4gICAgICAuZmlsdGVyKChrZXkpID0+IGtleSBpbiBiKVxuICAgICAgLm1hcCgoa2V5KSA9PiBba2V5LCBhW2tleSBhcyBzdHJpbmddXSkgYXMgQXJyYXk8W3N0cmluZywgdW5rbm93bl0+O1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIGVudHJpZXMpIHtcbiAgICAgIC8vIE9uIGFycmF5IHJlZmVyZW5jZXMsIGJ1aWxkIGEgZmlsdGVyZWQgYXJyYXkgYW5kIGZpbHRlciBuZXN0ZWQgb2JqZWN0cyBpbnNpZGVcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBjb25zdCBzdWJzZXQgPSAoYiBhcyBsb29zZSlba2V5XTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3Vic2V0KSkge1xuICAgICAgICAgIGZpbHRlcmVkW2tleV0gPSB2YWx1ZVxuICAgICAgICAgICAgLnNsaWNlKDAsIHN1YnNldC5sZW5ndGgpXG4gICAgICAgICAgICAubWFwKChlbGVtZW50LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBzdWJzZXRFbGVtZW50ID0gc3Vic2V0W2luZGV4XTtcbiAgICAgICAgICAgICAgaWYgKCh0eXBlb2Ygc3Vic2V0RWxlbWVudCA9PT0gXCJvYmplY3RcIikgJiYgKHN1YnNldEVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcihlbGVtZW50LCBzdWJzZXRFbGVtZW50KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IC8vIE9uIG5lc3RlZCBvYmplY3RzIHJlZmVyZW5jZXMsIGJ1aWxkIGEgZmlsdGVyZWQgb2JqZWN0IHJlY3Vyc2l2ZWx5XG4gICAgICBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgY29uc3Qgc3Vic2V0ID0gKGIgYXMgbG9vc2UpW2tleV07XG4gICAgICAgIGlmICgodHlwZW9mIHN1YnNldCA9PT0gXCJvYmplY3RcIikgJiYgKHN1YnNldCkpIHtcbiAgICAgICAgICBmaWx0ZXJlZFtrZXldID0gZmlsdGVyKHZhbHVlIGFzIGxvb3NlLCBzdWJzZXQgYXMgbG9vc2UpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmaWx0ZXJlZFtrZXldID0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiBmaWx0ZXJlZDtcbiAgfVxuICByZXR1cm4gYXNzZXJ0RXF1YWxzKFxuICAgIC8vIGdldCB0aGUgaW50ZXJzZWN0aW9uIG9mIFwiYWN0dWFsXCIgYW5kIFwiZXhwZWN0ZWRcIlxuICAgIC8vIHNpZGUgZWZmZWN0OiBhbGwgdGhlIGluc3RhbmNlcycgY29uc3RydWN0b3IgZmllbGQgaXMgXCJPYmplY3RcIiBub3cuXG4gICAgZmlsdGVyKGFjdHVhbCwgZXhwZWN0ZWQpLFxuICAgIC8vIHNldCAobmVzdGVkKSBpbnN0YW5jZXMnIGNvbnN0cnVjdG9yIGZpZWxkIHRvIGJlIFwiT2JqZWN0XCIgd2l0aG91dCBjaGFuZ2luZyBleHBlY3RlZCB2YWx1ZS5cbiAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2Rlbm9sYW5kL2Rlbm9fc3RkL3B1bGwvMTQxOVxuICAgIGZpbHRlcihleHBlY3RlZCwgZXhwZWN0ZWQpLFxuICApO1xufVxuXG4vKipcbiAqIEZvcmNlZnVsbHkgdGhyb3dzIGEgZmFpbGVkIGFzc2VydGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZmFpbChtc2c/OiBzdHJpbmcpOiBuZXZlciB7XG4gIGFzc2VydChmYWxzZSwgYEZhaWxlZCBhc3NlcnRpb24ke21zZyA/IGA6ICR7bXNnfWAgOiBcIi5cIn1gKTtcbn1cblxuLyoqXG4gKiBNYWtlIGFuIGFzc2VydGlvbiB0aGF0IGBlcnJvcmAgaXMgYW4gYEVycm9yYC5cbiAqIElmIG5vdCB0aGVuIGFuIGVycm9yIHdpbGwgYmUgdGhyb3duLlxuICogQW4gZXJyb3IgY2xhc3MgYW5kIGEgc3RyaW5nIHRoYXQgc2hvdWxkIGJlIGluY2x1ZGVkIGluIHRoZVxuICogZXJyb3IgbWVzc2FnZSBjYW4gYWxzbyBiZSBhc3NlcnRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydElzRXJyb3I8RSBleHRlbmRzIEVycm9yID0gRXJyb3I+KFxuICBlcnJvcjogdW5rbm93bixcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgRXJyb3JDbGFzcz86IG5ldyAoLi4uYXJnczogYW55W10pID0+IEUsXG4gIG1zZ0luY2x1ZGVzPzogc3RyaW5nLFxuICBtc2c/OiBzdHJpbmcsXG4pOiBhc3NlcnRzIGVycm9yIGlzIEUge1xuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA9PT0gZmFsc2UpIHtcbiAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IoYEV4cGVjdGVkIFwiZXJyb3JcIiB0byBiZSBhbiBFcnJvciBvYmplY3QuYCk7XG4gIH1cbiAgaWYgKEVycm9yQ2xhc3MgJiYgIShlcnJvciBpbnN0YW5jZW9mIEVycm9yQ2xhc3MpKSB7XG4gICAgbXNnID0gYEV4cGVjdGVkIGVycm9yIHRvIGJlIGluc3RhbmNlIG9mIFwiJHtFcnJvckNsYXNzLm5hbWV9XCIsIGJ1dCB3YXMgXCIke1xuICAgICAgdHlwZW9mIGVycm9yID09PSBcIm9iamVjdFwiID8gZXJyb3I/LmNvbnN0cnVjdG9yPy5uYW1lIDogXCJbbm90IGFuIG9iamVjdF1cIlxuICAgIH1cIiR7bXNnID8gYDogJHttc2d9YCA6IFwiLlwifWA7XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbiAgaWYgKFxuICAgIG1zZ0luY2x1ZGVzICYmICghKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHx8XG4gICAgICAhc3RyaXBDb2xvcihlcnJvci5tZXNzYWdlKS5pbmNsdWRlcyhzdHJpcENvbG9yKG1zZ0luY2x1ZGVzKSkpXG4gICkge1xuICAgIG1zZyA9IGBFeHBlY3RlZCBlcnJvciBtZXNzYWdlIHRvIGluY2x1ZGUgXCIke21zZ0luY2x1ZGVzfVwiLCBidXQgZ290IFwiJHtcbiAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJbbm90IGFuIEVycm9yXVwiXG4gICAgfVwiJHttc2cgPyBgOiAke21zZ31gIDogXCIuXCJ9YDtcbiAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgfVxufVxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgZnVuY3Rpb24sIGV4cGVjdGluZyBpdCB0byB0aHJvdy4gIElmIGl0IGRvZXMgbm90LCB0aGVuIGl0XG4gKiB0aHJvd3MuIEFuIGVycm9yIGNsYXNzIGFuZCBhIHN0cmluZyB0aGF0IHNob3VsZCBiZSBpbmNsdWRlZCBpbiB0aGVcbiAqIGVycm9yIG1lc3NhZ2UgY2FuIGFsc28gYmUgYXNzZXJ0ZWQuIE9yIHlvdSBjYW4gcGFzcyBhXG4gKiBjYWxsYmFjayB3aGljaCB3aWxsIGJlIHBhc3NlZCB0aGUgZXJyb3IsIHVzdWFsbHkgdG8gYXBwbHkgc29tZSBjdXN0b21cbiAqIGFzc2VydGlvbnMgb24gaXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRUaHJvd3M8RSBleHRlbmRzIEVycm9yID0gRXJyb3I+KFxuICBmbjogKCkgPT4gdW5rbm93bixcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgRXJyb3JDbGFzcz86IG5ldyAoLi4uYXJnczogYW55W10pID0+IEUsXG4gIG1zZ0luY2x1ZGVzPzogc3RyaW5nLFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFRocm93cyhcbiAgZm46ICgpID0+IHVua25vd24sXG4gIGVycm9yQ2FsbGJhY2s6IChlOiBFcnJvcikgPT4gdW5rbm93bixcbiAgbXNnPzogc3RyaW5nLFxuKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRUaHJvd3M8RSBleHRlbmRzIEVycm9yID0gRXJyb3I+KFxuICBmbjogKCkgPT4gdW5rbm93bixcbiAgZXJyb3JDbGFzc09yQ2FsbGJhY2s/OlxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgfCAobmV3ICguLi5hcmdzOiBhbnlbXSkgPT4gRSlcbiAgICB8ICgoZTogRXJyb3IpID0+IHVua25vd24pLFxuICBtc2dJbmNsdWRlc09yTXNnPzogc3RyaW5nLFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkIHtcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgbGV0IEVycm9yQ2xhc3M6IChuZXcgKC4uLmFyZ3M6IGFueVtdKSA9PiBFKSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgbGV0IG1zZ0luY2x1ZGVzOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGxldCBlcnJvckNhbGxiYWNrO1xuICBpZiAoXG4gICAgZXJyb3JDbGFzc09yQ2FsbGJhY2sgPT0gbnVsbCB8fFxuICAgIGVycm9yQ2xhc3NPckNhbGxiYWNrLnByb3RvdHlwZSBpbnN0YW5jZW9mIEVycm9yIHx8XG4gICAgZXJyb3JDbGFzc09yQ2FsbGJhY2sucHJvdG90eXBlID09PSBFcnJvci5wcm90b3R5cGVcbiAgKSB7XG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBFcnJvckNsYXNzID0gZXJyb3JDbGFzc09yQ2FsbGJhY2sgYXMgbmV3ICguLi5hcmdzOiBhbnlbXSkgPT4gRTtcbiAgICBtc2dJbmNsdWRlcyA9IG1zZ0luY2x1ZGVzT3JNc2c7XG4gICAgZXJyb3JDYWxsYmFjayA9IG51bGw7XG4gIH0gZWxzZSB7XG4gICAgZXJyb3JDYWxsYmFjayA9IGVycm9yQ2xhc3NPckNhbGxiYWNrIGFzIChlOiBFcnJvcikgPT4gdW5rbm93bjtcbiAgICBtc2cgPSBtc2dJbmNsdWRlc09yTXNnO1xuICB9XG4gIGxldCBkb2VzVGhyb3cgPSBmYWxzZTtcbiAgdHJ5IHtcbiAgICBmbigpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKFwiQSBub24tRXJyb3Igb2JqZWN0IHdhcyB0aHJvd24uXCIpO1xuICAgIH1cbiAgICBhc3NlcnRJc0Vycm9yKFxuICAgICAgZXJyb3IsXG4gICAgICBFcnJvckNsYXNzLFxuICAgICAgbXNnSW5jbHVkZXMsXG4gICAgICBtc2csXG4gICAgKTtcbiAgICBpZiAodHlwZW9mIGVycm9yQ2FsbGJhY2sgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBlcnJvckNhbGxiYWNrKGVycm9yKTtcbiAgICB9XG4gICAgZG9lc1Rocm93ID0gdHJ1ZTtcbiAgfVxuICBpZiAoIWRvZXNUaHJvdykge1xuICAgIG1zZyA9IGBFeHBlY3RlZCBmdW5jdGlvbiB0byB0aHJvdyR7bXNnID8gYDogJHttc2d9YCA6IFwiLlwifWA7XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBFeGVjdXRlcyBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYSBwcm9taXNlLCBleHBlY3RpbmcgaXQgdG8gdGhyb3cgb3IgcmVqZWN0LlxuICogSWYgaXQgZG9lcyBub3QsIHRoZW4gaXQgdGhyb3dzLiBBbiBlcnJvciBjbGFzcyBhbmQgYSBzdHJpbmcgdGhhdCBzaG91bGQgYmVcbiAqIGluY2x1ZGVkIGluIHRoZSBlcnJvciBtZXNzYWdlIGNhbiBhbHNvIGJlIGFzc2VydGVkLiBPciB5b3UgY2FuIHBhc3MgYVxuICogY2FsbGJhY2sgd2hpY2ggd2lsbCBiZSBwYXNzZWQgdGhlIGVycm9yLCB1c3VhbGx5IHRvIGFwcGx5IHNvbWUgY3VzdG9tXG4gKiBhc3NlcnRpb25zIG9uIGl0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0UmVqZWN0czxFIGV4dGVuZHMgRXJyb3IgPSBFcnJvcj4oXG4gIGZuOiAoKSA9PiBQcm9taXNlPHVua25vd24+LFxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBFcnJvckNsYXNzPzogbmV3ICguLi5hcmdzOiBhbnlbXSkgPT4gRSxcbiAgbXNnSW5jbHVkZXM/OiBzdHJpbmcsXG4gIG1zZz86IHN0cmluZyxcbik6IFByb21pc2U8dm9pZD47XG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0UmVqZWN0cyhcbiAgZm46ICgpID0+IFByb21pc2U8dW5rbm93bj4sXG4gIGVycm9yQ2FsbGJhY2s6IChlOiBFcnJvcikgPT4gdW5rbm93bixcbiAgbXNnPzogc3RyaW5nLFxuKTogUHJvbWlzZTx2b2lkPjtcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhc3NlcnRSZWplY3RzPEUgZXh0ZW5kcyBFcnJvciA9IEVycm9yPihcbiAgZm46ICgpID0+IFByb21pc2U8dW5rbm93bj4sXG4gIGVycm9yQ2xhc3NPckNhbGxiYWNrPzpcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIHwgKG5ldyAoLi4uYXJnczogYW55W10pID0+IEUpXG4gICAgfCAoKGU6IEVycm9yKSA9PiB1bmtub3duKSxcbiAgbXNnSW5jbHVkZXNPck1zZz86IHN0cmluZyxcbiAgbXNnPzogc3RyaW5nLFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIGxldCBFcnJvckNsYXNzOiAobmV3ICguLi5hcmdzOiBhbnlbXSkgPT4gRSkgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGxldCBtc2dJbmNsdWRlczogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBsZXQgZXJyb3JDYWxsYmFjaztcbiAgaWYgKFxuICAgIGVycm9yQ2xhc3NPckNhbGxiYWNrID09IG51bGwgfHxcbiAgICBlcnJvckNsYXNzT3JDYWxsYmFjay5wcm90b3R5cGUgaW5zdGFuY2VvZiBFcnJvciB8fFxuICAgIGVycm9yQ2xhc3NPckNhbGxiYWNrLnByb3RvdHlwZSA9PT0gRXJyb3IucHJvdG90eXBlXG4gICkge1xuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgRXJyb3JDbGFzcyA9IGVycm9yQ2xhc3NPckNhbGxiYWNrIGFzIG5ldyAoLi4uYXJnczogYW55W10pID0+IEU7XG4gICAgbXNnSW5jbHVkZXMgPSBtc2dJbmNsdWRlc09yTXNnO1xuICAgIGVycm9yQ2FsbGJhY2sgPSBudWxsO1xuICB9IGVsc2Uge1xuICAgIGVycm9yQ2FsbGJhY2sgPSBlcnJvckNsYXNzT3JDYWxsYmFjayBhcyAoZTogRXJyb3IpID0+IHVua25vd247XG4gICAgbXNnID0gbXNnSW5jbHVkZXNPck1zZztcbiAgfVxuICBsZXQgZG9lc1Rocm93ID0gZmFsc2U7XG4gIHRyeSB7XG4gICAgYXdhaXQgZm4oKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA9PT0gZmFsc2UpIHtcbiAgICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihcIkEgbm9uLUVycm9yIG9iamVjdCB3YXMgdGhyb3duIG9yIHJlamVjdGVkLlwiKTtcbiAgICB9XG4gICAgYXNzZXJ0SXNFcnJvcihcbiAgICAgIGVycm9yLFxuICAgICAgRXJyb3JDbGFzcyxcbiAgICAgIG1zZ0luY2x1ZGVzLFxuICAgICAgbXNnLFxuICAgICk7XG4gICAgaWYgKHR5cGVvZiBlcnJvckNhbGxiYWNrID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgZXJyb3JDYWxsYmFjayhlcnJvcik7XG4gICAgfVxuICAgIGRvZXNUaHJvdyA9IHRydWU7XG4gIH1cbiAgaWYgKCFkb2VzVGhyb3cpIHtcbiAgICBtc2cgPSBgRXhwZWN0ZWQgZnVuY3Rpb24gdG8gdGhyb3cke21zZyA/IGA6ICR7bXNnfWAgOiBcIi5cIn1gO1xuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICB9XG59XG5cbi8qKlxuICogRXhlY3V0ZXMgYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGEgcHJvbWlzZSwgZXhwZWN0aW5nIGl0IHRvIHRocm93IG9yIHJlamVjdC5cbiAqIElmIGl0IGRvZXMgbm90LCB0aGVuIGl0IHRocm93cy4gIEFuIGVycm9yIGNsYXNzIGFuZCBhIHN0cmluZyB0aGF0IHNob3VsZCBiZVxuICogaW5jbHVkZWQgaW4gdGhlIGVycm9yIG1lc3NhZ2UgY2FuIGFsc28gYmUgYXNzZXJ0ZWQuXG4gKlxuICogQGRlcHJlY2F0ZWRcbiAqL1xuZXhwb3J0IHsgYXNzZXJ0UmVqZWN0cyBhcyBhc3NlcnRUaHJvd3NBc3luYyB9O1xuXG4vKiogVXNlIHRoaXMgdG8gc3R1YiBvdXQgbWV0aG9kcyB0aGF0IHdpbGwgdGhyb3cgd2hlbiBpbnZva2VkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaW1wbGVtZW50ZWQobXNnPzogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnIHx8IFwidW5pbXBsZW1lbnRlZFwiKTtcbn1cblxuLyoqIFVzZSB0aGlzIHRvIGFzc2VydCB1bnJlYWNoYWJsZSBjb2RlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVucmVhY2hhYmxlKCk6IG5ldmVyIHtcbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKFwidW5yZWFjaGFibGVcIik7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLDhFQUE4RTtBQUM5RSwyQ0FBMkM7QUFFM0MsU0FDRSxPQUFPLEVBQ1AsS0FBSyxFQUNMLElBQUksRUFDSixJQUFJLEVBQ0osS0FBSyxFQUNMLEdBQUcsRUFDSCxVQUFVLEVBQ1YsS0FBSyxRQUNBLG1CQUFtQjtBQUMxQixTQUFTLElBQUksRUFBYyxPQUFPLEVBQUUsUUFBUSxRQUFRLGFBQWE7QUFFakUsTUFBTSxrQkFBa0I7QUFFeEIsT0FBTyxNQUFNLHVCQUF1QjtJQUNsQyxPQUFPLGlCQUFpQjtJQUN4QixZQUFZLE9BQWUsQ0FBRTtRQUMzQixLQUFLLENBQUM7SUFDUjtBQUNGLENBQUM7QUFFRDs7OztDQUlDLEdBQ0QsT0FBTyxTQUFTLFFBQVEsQ0FBVSxFQUFVO0lBQzFDLG1DQUFtQztJQUNuQyxNQUFNLEVBQUUsS0FBSSxFQUFFLEdBQUc7SUFDakIsT0FBTyxPQUFPLE1BQU0s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