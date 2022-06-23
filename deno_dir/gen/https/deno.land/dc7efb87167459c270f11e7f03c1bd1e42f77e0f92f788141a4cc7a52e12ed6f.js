// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible. Do not rely on good formatting of values
// for AssertionError messages in browsers.
import { bold, gray, green, red, stripColor, white } from "../fmt/colors.ts";
import { diff, DiffType } from "./_diff.ts";
const CAN_NOT_DISPLAY = "[Cannot display]";
export class AssertionError extends Error {
    constructor(message){
        super(message);
        this.name = "AssertionError";
    }
}
/**
 * Converts the input into a string. Objects, Sets and Maps are sorted so as to
 * make tests less flaky
 * @param v Value to be formatted
 */ export function _format(v) {
    return globalThis.Deno ? Deno.inspect(v, {
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
 */ function createColor(diffType) {
    switch(diffType){
        case DiffType.added:
            return (s)=>green(bold(s));
        case DiffType.removed:
            return (s)=>red(bold(s));
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
function buildMessage(diffResult) {
    const messages = [];
    messages.push("");
    messages.push("");
    messages.push(`    ${gray(bold("[Diff]"))} ${red(bold("Actual"))} / ${green(bold("Expected"))}`);
    messages.push("");
    messages.push("");
    diffResult.forEach((result)=>{
        const c = createColor(result.type);
        messages.push(c(`${createSign(result.type)}${result.value}`));
    });
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
            for(const key in merged){
                if (!compare(a && a[key], b && b[key])) {
                    return false;
                }
            }
            seen.set(a, b);
            return true;
        }
        return false;
    }(c, d);
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
        const diffResult = diff(actualString.split("\n"), expectedString.split("\n"));
        const diffMsg = buildMessage(diffResult).join("\n");
        message = `Values are not equal:\n${diffMsg}`;
    } catch (e) {
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
    } catch (e) {
        actualString = "[Cannot display]";
    }
    try {
        expectedString = String(expected);
    } catch (e1) {
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
                const diffResult = diff(actualString.split("\n"), expectedString.split("\n"));
                const diffMsg = buildMessage(diffResult).join("\n");
                message = `Values are not strictly equal:\n${diffMsg}`;
            } catch (e) {
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
 * Make an assertion that actual is not null or undefined. If not
 * then thrown.
 */ export function assertExists(actual, msg) {
    if (actual === undefined || actual === null) {
        if (!msg) {
            msg = `actual: "${actual}" expected to match anything but null or undefined`;
        }
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that actual includes expected. If not
 * then thrown.
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
 * then thrown
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
 * then thrown
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
 */ export function assertObjectMatch(actual, expected) {
    const seen = new WeakMap();
    return assertEquals(function filter(a, b) {
        // Prevent infinite loop with circular references with same filter
        if (seen.has(a) && seen.get(a) === b) {
            return a;
        }
        seen.set(a, b);
        // Filter keys and symbols which are present in both actual and expected
        const filtered = {};
        const entries = [
            ...Object.getOwnPropertyNames(a),
            ...Object.getOwnPropertySymbols(a), 
        ].filter((key)=>key in b).map((key)=>[
                key,
                a[key]
            ]);
        // Build filtered object and filter recursively on nested objects references
        for (const [key, value] of entries){
            if (typeof value === "object") {
                const subset = b[key];
                if (typeof subset === "object" && subset) {
                    filtered[key] = filter(value, subset);
                    continue;
                }
            }
            filtered[key] = value;
        }
        return filtered;
    }(actual, expected), expected);
}
/**
 * Forcefully throws a failed assertion
 */ export function fail(msg) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    assert(false, `Failed assertion${msg ? `: ${msg}` : "."}`);
}
/**
 * Executes a function, expecting it to throw.  If it does not, then it
 * throws.  An error class and a string that should be included in the
 * error message can also be asserted.
 */ export function assertThrows(fn, ErrorClass, msgIncludes = "", msg) {
    let doesThrow = false;
    let error = null;
    try {
        fn();
    } catch (e) {
        if (e instanceof Error === false) {
            throw new AssertionError("A non-Error object was thrown.");
        }
        if (ErrorClass && !(e instanceof ErrorClass)) {
            msg = `Expected error to be instance of "${ErrorClass.name}", but was "${e.constructor.name}"${msg ? `: ${msg}` : "."}`;
            throw new AssertionError(msg);
        }
        if (msgIncludes && !stripColor(e.message).includes(stripColor(msgIncludes))) {
            msg = `Expected error message to include "${msgIncludes}", but got "${e.message}"${msg ? `: ${msg}` : "."}`;
            throw new AssertionError(msg);
        }
        doesThrow = true;
        error = e;
    }
    if (!doesThrow) {
        msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
    }
    return error;
}
/**
 * Executes a function which returns a promise, expecting it to throw or reject.
 * If it does not, then it throws.  An error class and a string that should be
 * included in the error message can also be asserted.
 */ export async function assertThrowsAsync(fn, ErrorClass, msgIncludes = "", msg) {
    let doesThrow = false;
    let error = null;
    try {
        await fn();
    } catch (e) {
        if (e instanceof Error === false) {
            throw new AssertionError("A non-Error object was thrown or rejected.");
        }
        if (ErrorClass && !(e instanceof ErrorClass)) {
            msg = `Expected error to be instance of "${ErrorClass.name}", but got "${e.name}"${msg ? `: ${msg}` : "."}`;
            throw new AssertionError(msg);
        }
        if (msgIncludes && !stripColor(e.message).includes(stripColor(msgIncludes))) {
            msg = `Expected error message to include "${msgIncludes}", but got "${e.message}"${msg ? `: ${msg}` : "."}`;
            throw new AssertionError(msg);
        }
        doesThrow = true;
        error = e;
    }
    if (!doesThrow) {
        msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
    }
    return error;
}
/** Use this to stub out methods that will throw when invoked. */ export function unimplemented(msg) {
    throw new AssertionError(msg || "unimplemented");
}
/** Use this to assert unreachable code. */ export function unreachable() {
    throw new AssertionError("unreachable");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjg2LjAvdGVzdGluZy9hc3NlcnRzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuIERvIG5vdCByZWx5IG9uIGdvb2QgZm9ybWF0dGluZyBvZiB2YWx1ZXNcbi8vIGZvciBBc3NlcnRpb25FcnJvciBtZXNzYWdlcyBpbiBicm93c2Vycy5cblxuaW1wb3J0IHsgYm9sZCwgZ3JheSwgZ3JlZW4sIHJlZCwgc3RyaXBDb2xvciwgd2hpdGUgfSBmcm9tIFwiLi4vZm10L2NvbG9ycy50c1wiO1xuaW1wb3J0IHsgZGlmZiwgRGlmZlJlc3VsdCwgRGlmZlR5cGUgfSBmcm9tIFwiLi9fZGlmZi50c1wiO1xuXG5jb25zdCBDQU5fTk9UX0RJU1BMQVkgPSBcIltDYW5ub3QgZGlzcGxheV1cIjtcblxuaW50ZXJmYWNlIENvbnN0cnVjdG9yIHtcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgbmV3ICguLi5hcmdzOiBhbnlbXSk6IGFueTtcbn1cblxuZXhwb3J0IGNsYXNzIEFzc2VydGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSBcIkFzc2VydGlvbkVycm9yXCI7XG4gIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0cyB0aGUgaW5wdXQgaW50byBhIHN0cmluZy4gT2JqZWN0cywgU2V0cyBhbmQgTWFwcyBhcmUgc29ydGVkIHNvIGFzIHRvXG4gKiBtYWtlIHRlc3RzIGxlc3MgZmxha3lcbiAqIEBwYXJhbSB2IFZhbHVlIHRvIGJlIGZvcm1hdHRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gX2Zvcm1hdCh2OiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGdsb2JhbFRoaXMuRGVub1xuICAgID8gRGVuby5pbnNwZWN0KHYsIHtcbiAgICAgIGRlcHRoOiBJbmZpbml0eSxcbiAgICAgIHNvcnRlZDogdHJ1ZSxcbiAgICAgIHRyYWlsaW5nQ29tbWE6IHRydWUsXG4gICAgICBjb21wYWN0OiBmYWxzZSxcbiAgICAgIGl0ZXJhYmxlTGltaXQ6IEluZmluaXR5LFxuICAgIH0pXG4gICAgOiBgXCIke1N0cmluZyh2KS5yZXBsYWNlKC8oPz1bXCJcXFxcXSkvZywgXCJcXFxcXCIpfVwiYDtcbn1cblxuLyoqXG4gKiBDb2xvcnMgdGhlIG91dHB1dCBvZiBhc3NlcnRpb24gZGlmZnNcbiAqIEBwYXJhbSBkaWZmVHlwZSBEaWZmZXJlbmNlIHR5cGUsIGVpdGhlciBhZGRlZCBvciByZW1vdmVkXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUNvbG9yKGRpZmZUeXBlOiBEaWZmVHlwZSk6IChzOiBzdHJpbmcpID0+IHN0cmluZyB7XG4gIHN3aXRjaCAoZGlmZlR5cGUpIHtcbiAgICBjYXNlIERpZmZUeXBlLmFkZGVkOlxuICAgICAgcmV0dXJuIChzOiBzdHJpbmcpOiBzdHJpbmcgPT4gZ3JlZW4oYm9sZChzKSk7XG4gICAgY2FzZSBEaWZmVHlwZS5yZW1vdmVkOlxuICAgICAgcmV0dXJuIChzOiBzdHJpbmcpOiBzdHJpbmcgPT4gcmVkKGJvbGQocykpO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gd2hpdGU7XG4gIH1cbn1cblxuLyoqXG4gKiBQcmVmaXhlcyBgK2Agb3IgYC1gIGluIGRpZmYgb3V0cHV0XG4gKiBAcGFyYW0gZGlmZlR5cGUgRGlmZmVyZW5jZSB0eXBlLCBlaXRoZXIgYWRkZWQgb3IgcmVtb3ZlZFxuICovXG5mdW5jdGlvbiBjcmVhdGVTaWduKGRpZmZUeXBlOiBEaWZmVHlwZSk6IHN0cmluZyB7XG4gIHN3aXRjaCAoZGlmZlR5cGUpIHtcbiAgICBjYXNlIERpZmZUeXBlLmFkZGVkOlxuICAgICAgcmV0dXJuIFwiKyAgIFwiO1xuICAgIGNhc2UgRGlmZlR5cGUucmVtb3ZlZDpcbiAgICAgIHJldHVybiBcIi0gICBcIjtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIFwiICAgIFwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkTWVzc2FnZShkaWZmUmVzdWx0OiBSZWFkb25seUFycmF5PERpZmZSZXN1bHQ8c3RyaW5nPj4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IG1lc3NhZ2VzOiBzdHJpbmdbXSA9IFtdO1xuICBtZXNzYWdlcy5wdXNoKFwiXCIpO1xuICBtZXNzYWdlcy5wdXNoKFwiXCIpO1xuICBtZXNzYWdlcy5wdXNoKFxuICAgIGAgICAgJHtncmF5KGJvbGQoXCJbRGlmZl1cIikpfSAke3JlZChib2xkKFwiQWN0dWFsXCIpKX0gLyAke1xuICAgICAgZ3JlZW4oYm9sZChcIkV4cGVjdGVkXCIpKVxuICAgIH1gLFxuICApO1xuICBtZXNzYWdlcy5wdXNoKFwiXCIpO1xuICBtZXNzYWdlcy5wdXNoKFwiXCIpO1xuICBkaWZmUmVzdWx0LmZvckVhY2goKHJlc3VsdDogRGlmZlJlc3VsdDxzdHJpbmc+KTogdm9pZCA9PiB7XG4gICAgY29uc3QgYyA9IGNyZWF0ZUNvbG9yKHJlc3VsdC50eXBlKTtcbiAgICBtZXNzYWdlcy5wdXNoKGMoYCR7Y3JlYXRlU2lnbihyZXN1bHQudHlwZSl9JHtyZXN1bHQudmFsdWV9YCkpO1xuICB9KTtcbiAgbWVzc2FnZXMucHVzaChcIlwiKTtcblxuICByZXR1cm4gbWVzc2FnZXM7XG59XG5cbmZ1bmN0aW9uIGlzS2V5ZWRDb2xsZWN0aW9uKHg6IHVua25vd24pOiB4IGlzIFNldDx1bmtub3duPiB7XG4gIHJldHVybiBbU3ltYm9sLml0ZXJhdG9yLCBcInNpemVcIl0uZXZlcnkoKGspID0+IGsgaW4gKHggYXMgU2V0PHVua25vd24+KSk7XG59XG5cbi8qKlxuICogRGVlcCBlcXVhbGl0eSBjb21wYXJpc29uIHVzZWQgaW4gYXNzZXJ0aW9uc1xuICogQHBhcmFtIGMgYWN0dWFsIHZhbHVlXG4gKiBAcGFyYW0gZCBleHBlY3RlZCB2YWx1ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXF1YWwoYzogdW5rbm93biwgZDogdW5rbm93bik6IGJvb2xlYW4ge1xuICBjb25zdCBzZWVuID0gbmV3IE1hcCgpO1xuICByZXR1cm4gKGZ1bmN0aW9uIGNvbXBhcmUoYTogdW5rbm93biwgYjogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIC8vIEhhdmUgdG8gcmVuZGVyIFJlZ0V4cCAmIERhdGUgZm9yIHN0cmluZyBjb21wYXJpc29uXG4gICAgLy8gdW5sZXNzIGl0J3MgbWlzdHJlYXRlZCBhcyBvYmplY3RcbiAgICBpZiAoXG4gICAgICBhICYmXG4gICAgICBiICYmXG4gICAgICAoKGEgaW5zdGFuY2VvZiBSZWdFeHAgJiYgYiBpbnN0YW5jZW9mIFJlZ0V4cCkgfHxcbiAgICAgICAgKGEgaW5zdGFuY2VvZiBVUkwgJiYgYiBpbnN0YW5jZW9mIFVSTCkpXG4gICAgKSB7XG4gICAgICByZXR1cm4gU3RyaW5nKGEpID09PSBTdHJpbmcoYik7XG4gICAgfVxuICAgIGlmIChhIGluc3RhbmNlb2YgRGF0ZSAmJiBiIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgY29uc3QgYVRpbWUgPSBhLmdldFRpbWUoKTtcbiAgICAgIGNvbnN0IGJUaW1lID0gYi5nZXRUaW1lKCk7XG4gICAgICAvLyBDaGVjayBmb3IgTmFOIGVxdWFsaXR5IG1hbnVhbGx5IHNpbmNlIE5hTiBpcyBub3RcbiAgICAgIC8vIGVxdWFsIHRvIGl0c2VsZi5cbiAgICAgIGlmIChOdW1iZXIuaXNOYU4oYVRpbWUpICYmIE51bWJlci5pc05hTihiVGltZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gYS5nZXRUaW1lKCkgPT09IGIuZ2V0VGltZSgpO1xuICAgIH1cbiAgICBpZiAoT2JqZWN0LmlzKGEsIGIpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGEgJiYgdHlwZW9mIGEgPT09IFwib2JqZWN0XCIgJiYgYiAmJiB0eXBlb2YgYiA9PT0gXCJvYmplY3RcIikge1xuICAgICAgaWYgKHNlZW4uZ2V0KGEpID09PSBiKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKE9iamVjdC5rZXlzKGEgfHwge30pLmxlbmd0aCAhPT0gT2JqZWN0LmtleXMoYiB8fCB7fSkubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChpc0tleWVkQ29sbGVjdGlvbihhKSAmJiBpc0tleWVkQ29sbGVjdGlvbihiKSkge1xuICAgICAgICBpZiAoYS5zaXplICE9PSBiLnNpemUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdW5tYXRjaGVkRW50cmllcyA9IGEuc2l6ZTtcblxuICAgICAgICBmb3IgKGNvbnN0IFthS2V5LCBhVmFsdWVdIG9mIGEuZW50cmllcygpKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBbYktleSwgYlZhbHVlXSBvZiBiLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgLyogR2l2ZW4gdGhhdCBNYXAga2V5cyBjYW4gYmUgcmVmZXJlbmNlcywgd2UgbmVlZFxuICAgICAgICAgICAgICogdG8gZW5zdXJlIHRoYXQgdGhleSBhcmUgYWxzbyBkZWVwbHkgZXF1YWwgKi9cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgKGFLZXkgPT09IGFWYWx1ZSAmJiBiS2V5ID09PSBiVmFsdWUgJiYgY29tcGFyZShhS2V5LCBiS2V5KSkgfHxcbiAgICAgICAgICAgICAgKGNvbXBhcmUoYUtleSwgYktleSkgJiYgY29tcGFyZShhVmFsdWUsIGJWYWx1ZSkpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgdW5tYXRjaGVkRW50cmllcy0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB1bm1hdGNoZWRFbnRyaWVzID09PSAwO1xuICAgICAgfVxuICAgICAgY29uc3QgbWVyZ2VkID0geyAuLi5hLCAuLi5iIH07XG4gICAgICBmb3IgKGNvbnN0IGtleSBpbiBtZXJnZWQpIHtcbiAgICAgICAgdHlwZSBLZXkgPSBrZXlvZiB0eXBlb2YgbWVyZ2VkO1xuICAgICAgICBpZiAoIWNvbXBhcmUoYSAmJiBhW2tleSBhcyBLZXldLCBiICYmIGJba2V5IGFzIEtleV0pKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzZWVuLnNldChhLCBiKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pKGMsIGQpO1xufVxuXG4vKiogTWFrZSBhbiBhc3NlcnRpb24sIGVycm9yIHdpbGwgYmUgdGhyb3duIGlmIGBleHByYCBkb2VzIG5vdCBoYXZlIHRydXRoeSB2YWx1ZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnQoZXhwcjogdW5rbm93biwgbXNnID0gXCJcIik6IGFzc2VydHMgZXhwciB7XG4gIGlmICghZXhwcikge1xuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICB9XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBhbmQgYGV4cGVjdGVkYCBhcmUgZXF1YWwsIGRlZXBseS4gSWYgbm90XG4gKiBkZWVwbHkgZXF1YWwsIHRoZW4gdGhyb3cuXG4gKlxuICogVHlwZSBwYXJhbWV0ZXIgY2FuIGJlIHNwZWNpZmllZCB0byBlbnN1cmUgdmFsdWVzIHVuZGVyIGNvbXBhcmlzb24gaGF2ZSB0aGUgc2FtZSB0eXBlLlxuICogRm9yIGV4YW1wbGU6XG4gKmBgYHRzXG4gKmFzc2VydEVxdWFsczxudW1iZXI+KDEsIDIpXG4gKmBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RXF1YWxzKFxuICBhY3R1YWw6IHVua25vd24sXG4gIGV4cGVjdGVkOiB1bmtub3duLFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydEVxdWFsczxUPihhY3R1YWw6IFQsIGV4cGVjdGVkOiBULCBtc2c/OiBzdHJpbmcpOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydEVxdWFscyhcbiAgYWN0dWFsOiB1bmtub3duLFxuICBleHBlY3RlZDogdW5rbm93bixcbiAgbXNnPzogc3RyaW5nLFxuKTogdm9pZCB7XG4gIGlmIChlcXVhbChhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgbWVzc2FnZSA9IFwiXCI7XG4gIGNvbnN0IGFjdHVhbFN0cmluZyA9IF9mb3JtYXQoYWN0dWFsKTtcbiAgY29uc3QgZXhwZWN0ZWRTdHJpbmcgPSBfZm9ybWF0KGV4cGVjdGVkKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBkaWZmUmVzdWx0ID0gZGlmZihcbiAgICAgIGFjdHVhbFN0cmluZy5zcGxpdChcIlxcblwiKSxcbiAgICAgIGV4cGVjdGVkU3RyaW5nLnNwbGl0KFwiXFxuXCIpLFxuICAgICk7XG4gICAgY29uc3QgZGlmZk1zZyA9IGJ1aWxkTWVzc2FnZShkaWZmUmVzdWx0KS5qb2luKFwiXFxuXCIpO1xuICAgIG1lc3NhZ2UgPSBgVmFsdWVzIGFyZSBub3QgZXF1YWw6XFxuJHtkaWZmTXNnfWA7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBtZXNzYWdlID0gYFxcbiR7cmVkKENBTl9OT1RfRElTUExBWSl9ICsgXFxuXFxuYDtcbiAgfVxuICBpZiAobXNnKSB7XG4gICAgbWVzc2FnZSA9IG1zZztcbiAgfVxuICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobWVzc2FnZSk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBhbmQgYGV4cGVjdGVkYCBhcmUgbm90IGVxdWFsLCBkZWVwbHkuXG4gKiBJZiBub3QgdGhlbiB0aHJvdy5cbiAqXG4gKiBUeXBlIHBhcmFtZXRlciBjYW4gYmUgc3BlY2lmaWVkIHRvIGVuc3VyZSB2YWx1ZXMgdW5kZXIgY29tcGFyaXNvbiBoYXZlIHRoZSBzYW1lIHR5cGUuXG4gKiBGb3IgZXhhbXBsZTpcbiAqYGBgdHNcbiAqYXNzZXJ0Tm90RXF1YWxzPG51bWJlcj4oMSwgMilcbiAqYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnROb3RFcXVhbHMoXG4gIGFjdHVhbDogdW5rbm93bixcbiAgZXhwZWN0ZWQ6IHVua25vd24sXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Tm90RXF1YWxzPFQ+KGFjdHVhbDogVCwgZXhwZWN0ZWQ6IFQsIG1zZz86IHN0cmluZyk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Tm90RXF1YWxzKFxuICBhY3R1YWw6IHVua25vd24sXG4gIGV4cGVjdGVkOiB1bmtub3duLFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkIHtcbiAgaWYgKCFlcXVhbChhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgYWN0dWFsU3RyaW5nOiBzdHJpbmc7XG4gIGxldCBleHBlY3RlZFN0cmluZzogc3RyaW5nO1xuICB0cnkge1xuICAgIGFjdHVhbFN0cmluZyA9IFN0cmluZyhhY3R1YWwpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgYWN0dWFsU3RyaW5nID0gXCJbQ2Fubm90IGRpc3BsYXldXCI7XG4gIH1cbiAgdHJ5IHtcbiAgICBleHBlY3RlZFN0cmluZyA9IFN0cmluZyhleHBlY3RlZCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBleHBlY3RlZFN0cmluZyA9IFwiW0Nhbm5vdCBkaXNwbGF5XVwiO1xuICB9XG4gIGlmICghbXNnKSB7XG4gICAgbXNnID0gYGFjdHVhbDogJHthY3R1YWxTdHJpbmd9IGV4cGVjdGVkOiAke2V4cGVjdGVkU3RyaW5nfWA7XG4gIH1cbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBhbmQgYGV4cGVjdGVkYCBhcmUgc3RyaWN0bHkgZXF1YWwuICBJZlxuICogbm90IHRoZW4gdGhyb3cuXG4gKiBgYGB0c1xuICogYXNzZXJ0U3RyaWN0RXF1YWxzKDEsIDIpXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFN0cmljdEVxdWFscyhcbiAgYWN0dWFsOiB1bmtub3duLFxuICBleHBlY3RlZDogdW5rbm93bixcbiAgbXNnPzogc3RyaW5nLFxuKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRTdHJpY3RFcXVhbHM8VD4oXG4gIGFjdHVhbDogVCxcbiAgZXhwZWN0ZWQ6IFQsXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0U3RyaWN0RXF1YWxzKFxuICBhY3R1YWw6IHVua25vd24sXG4gIGV4cGVjdGVkOiB1bmtub3duLFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkIHtcbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQgbWVzc2FnZTogc3RyaW5nO1xuXG4gIGlmIChtc2cpIHtcbiAgICBtZXNzYWdlID0gbXNnO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGFjdHVhbFN0cmluZyA9IF9mb3JtYXQoYWN0dWFsKTtcbiAgICBjb25zdCBleHBlY3RlZFN0cmluZyA9IF9mb3JtYXQoZXhwZWN0ZWQpO1xuXG4gICAgaWYgKGFjdHVhbFN0cmluZyA9PT0gZXhwZWN0ZWRTdHJpbmcpIHtcbiAgICAgIGNvbnN0IHdpdGhPZmZzZXQgPSBhY3R1YWxTdHJpbmdcbiAgICAgICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgICAgIC5tYXAoKGwpID0+IGAgICAgJHtsfWApXG4gICAgICAgIC5qb2luKFwiXFxuXCIpO1xuICAgICAgbWVzc2FnZSA9XG4gICAgICAgIGBWYWx1ZXMgaGF2ZSB0aGUgc2FtZSBzdHJ1Y3R1cmUgYnV0IGFyZSBub3QgcmVmZXJlbmNlLWVxdWFsOlxcblxcbiR7XG4gICAgICAgICAgcmVkKHdpdGhPZmZzZXQpXG4gICAgICAgIH1cXG5gO1xuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBkaWZmUmVzdWx0ID0gZGlmZihcbiAgICAgICAgICBhY3R1YWxTdHJpbmcuc3BsaXQoXCJcXG5cIiksXG4gICAgICAgICAgZXhwZWN0ZWRTdHJpbmcuc3BsaXQoXCJcXG5cIiksXG4gICAgICAgICk7XG4gICAgICAgIGNvbnN0IGRpZmZNc2cgPSBidWlsZE1lc3NhZ2UoZGlmZlJlc3VsdCkuam9pbihcIlxcblwiKTtcbiAgICAgICAgbWVzc2FnZSA9IGBWYWx1ZXMgYXJlIG5vdCBzdHJpY3RseSBlcXVhbDpcXG4ke2RpZmZNc2d9YDtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbWVzc2FnZSA9IGBcXG4ke3JlZChDQU5fTk9UX0RJU1BMQVkpfSArIFxcblxcbmA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1lc3NhZ2UpO1xufVxuXG4vKipcbiAqIE1ha2UgYW4gYXNzZXJ0aW9uIHRoYXQgYGFjdHVhbGAgYW5kIGBleHBlY3RlZGAgYXJlIG5vdCBzdHJpY3RseSBlcXVhbC5cbiAqIElmIHRoZSB2YWx1ZXMgYXJlIHN0cmljdGx5IGVxdWFsIHRoZW4gdGhyb3cuXG4gKiBgYGB0c1xuICogYXNzZXJ0Tm90U3RyaWN0RXF1YWxzKDEsIDEpXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE5vdFN0cmljdEVxdWFscyhcbiAgYWN0dWFsOiB1bmtub3duLFxuICBleHBlY3RlZDogdW5rbm93bixcbiAgbXNnPzogc3RyaW5nLFxuKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnROb3RTdHJpY3RFcXVhbHM8VD4oXG4gIGFjdHVhbDogVCxcbiAgZXhwZWN0ZWQ6IFQsXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Tm90U3RyaWN0RXF1YWxzKFxuICBhY3R1YWw6IHVua25vd24sXG4gIGV4cGVjdGVkOiB1bmtub3duLFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkIHtcbiAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IoXG4gICAgbXNnID8/IGBFeHBlY3RlZCBcImFjdHVhbFwiIHRvIGJlIHN0cmljdGx5IHVuZXF1YWwgdG86ICR7X2Zvcm1hdChhY3R1YWwpfVxcbmAsXG4gICk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBhY3R1YWwgaXMgbm90IG51bGwgb3IgdW5kZWZpbmVkLiBJZiBub3RcbiAqIHRoZW4gdGhyb3duLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RXhpc3RzKFxuICBhY3R1YWw6IHVua25vd24sXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQge1xuICBpZiAoYWN0dWFsID09PSB1bmRlZmluZWQgfHwgYWN0dWFsID09PSBudWxsKSB7XG4gICAgaWYgKCFtc2cpIHtcbiAgICAgIG1zZyA9XG4gICAgICAgIGBhY3R1YWw6IFwiJHthY3R1YWx9XCIgZXhwZWN0ZWQgdG8gbWF0Y2ggYW55dGhpbmcgYnV0IG51bGwgb3IgdW5kZWZpbmVkYDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBNYWtlIGFuIGFzc2VydGlvbiB0aGF0IGFjdHVhbCBpbmNsdWRlcyBleHBlY3RlZC4gSWYgbm90XG4gKiB0aGVuIHRocm93bi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFN0cmluZ0luY2x1ZGVzKFxuICBhY3R1YWw6IHN0cmluZyxcbiAgZXhwZWN0ZWQ6IHN0cmluZyxcbiAgbXNnPzogc3RyaW5nLFxuKTogdm9pZCB7XG4gIGlmICghYWN0dWFsLmluY2x1ZGVzKGV4cGVjdGVkKSkge1xuICAgIGlmICghbXNnKSB7XG4gICAgICBtc2cgPSBgYWN0dWFsOiBcIiR7YWN0dWFsfVwiIGV4cGVjdGVkIHRvIGNvbnRhaW46IFwiJHtleHBlY3RlZH1cImA7XG4gICAgfVxuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICB9XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBpbmNsdWRlcyB0aGUgYGV4cGVjdGVkYCB2YWx1ZXMuXG4gKiBJZiBub3QgdGhlbiBhbiBlcnJvciB3aWxsIGJlIHRocm93bi5cbiAqXG4gKiBUeXBlIHBhcmFtZXRlciBjYW4gYmUgc3BlY2lmaWVkIHRvIGVuc3VyZSB2YWx1ZXMgdW5kZXIgY29tcGFyaXNvbiBoYXZlIHRoZSBzYW1lIHR5cGUuXG4gKiBGb3IgZXhhbXBsZTpcbiAqYGBgdHNcbiAqYXNzZXJ0QXJyYXlJbmNsdWRlczxudW1iZXI+KFsxLCAyXSwgWzJdKVxuICpgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydEFycmF5SW5jbHVkZXMoXG4gIGFjdHVhbDogQXJyYXlMaWtlPHVua25vd24+LFxuICBleHBlY3RlZDogQXJyYXlMaWtlPHVua25vd24+LFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydEFycmF5SW5jbHVkZXM8VD4oXG4gIGFjdHVhbDogQXJyYXlMaWtlPFQ+LFxuICBleHBlY3RlZDogQXJyYXlMaWtlPFQ+LFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydEFycmF5SW5jbHVkZXMoXG4gIGFjdHVhbDogQXJyYXlMaWtlPHVua25vd24+LFxuICBleHBlY3RlZDogQXJyYXlMaWtlPHVua25vd24+LFxuICBtc2c/OiBzdHJpbmcsXG4pOiB2b2lkIHtcbiAgY29uc3QgbWlzc2luZzogdW5rbm93bltdID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZXhwZWN0ZWQubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IGFjdHVhbC5sZW5ndGg7IGorKykge1xuICAgICAgaWYgKGVxdWFsKGV4cGVjdGVkW2ldLCBhY3R1YWxbal0pKSB7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghZm91bmQpIHtcbiAgICAgIG1pc3NpbmcucHVzaChleHBlY3RlZFtpXSk7XG4gICAgfVxuICB9XG4gIGlmIChtaXNzaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIW1zZykge1xuICAgIG1zZyA9IGBhY3R1YWw6IFwiJHtfZm9ybWF0KGFjdHVhbCl9XCIgZXhwZWN0ZWQgdG8gaW5jbHVkZTogXCIke1xuICAgICAgX2Zvcm1hdChleHBlY3RlZClcbiAgICB9XCJcXG5taXNzaW5nOiAke19mb3JtYXQobWlzc2luZyl9YDtcbiAgfVxuICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbn1cblxuLyoqXG4gKiBNYWtlIGFuIGFzc2VydGlvbiB0aGF0IGBhY3R1YWxgIG1hdGNoIFJlZ0V4cCBgZXhwZWN0ZWRgLiBJZiBub3RcbiAqIHRoZW4gdGhyb3duXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRNYXRjaChcbiAgYWN0dWFsOiBzdHJpbmcsXG4gIGV4cGVjdGVkOiBSZWdFeHAsXG4gIG1zZz86IHN0cmluZyxcbik6IHZvaWQge1xuICBpZiAoIWV4cGVjdGVkLnRlc3QoYWN0dWFsKSkge1xuICAgIGlmICghbXNnKSB7XG4gICAgICBtc2cgPSBgYWN0dWFsOiBcIiR7YWN0dWFsfVwiIGV4cGVjdGVkIHRvIG1hdGNoOiBcIiR7ZXhwZWN0ZWR9XCJgO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgfVxufVxuXG4vKipcbiAqIE1ha2UgYW4gYXNzZXJ0aW9uIHRoYXQgYGFjdHVhbGAgbm90IG1hdGNoIFJlZ0V4cCBgZXhwZWN0ZWRgLiBJZiBtYXRjaFxuICogdGhlbiB0aHJvd25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE5vdE1hdGNoKFxuICBhY3R1YWw6IHN0cmluZyxcbiAgZXhwZWN0ZWQ6IFJlZ0V4cCxcbiAgbXNnPzogc3RyaW5nLFxuKTogdm9pZCB7XG4gIGlmIChleHBlY3RlZC50ZXN0KGFjdHVhbCkpIHtcbiAgICBpZiAoIW1zZykge1xuICAgICAgbXNnID0gYGFjdHVhbDogXCIke2FjdHVhbH1cIiBleHBlY3RlZCB0byBub3QgbWF0Y2g6IFwiJHtleHBlY3RlZH1cImA7XG4gICAgfVxuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICB9XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBvYmplY3QgaXMgYSBzdWJzZXQgb2YgYGV4cGVjdGVkYCBvYmplY3QsIGRlZXBseS5cbiAqIElmIG5vdCwgdGhlbiB0aHJvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE9iamVjdE1hdGNoKFxuICBhY3R1YWw6IFJlY29yZDxQcm9wZXJ0eUtleSwgdW5rbm93bj4sXG4gIGV4cGVjdGVkOiBSZWNvcmQ8UHJvcGVydHlLZXksIHVua25vd24+LFxuKTogdm9pZCB7XG4gIHR5cGUgbG9vc2UgPSBSZWNvcmQ8UHJvcGVydHlLZXksIHVua25vd24+O1xuICBjb25zdCBzZWVuID0gbmV3IFdlYWtNYXAoKTtcbiAgcmV0dXJuIGFzc2VydEVxdWFscyhcbiAgICAoZnVuY3Rpb24gZmlsdGVyKGE6IGxvb3NlLCBiOiBsb29zZSk6IGxvb3NlIHtcbiAgICAgIC8vIFByZXZlbnQgaW5maW5pdGUgbG9vcCB3aXRoIGNpcmN1bGFyIHJlZmVyZW5jZXMgd2l0aCBzYW1lIGZpbHRlclxuICAgICAgaWYgKChzZWVuLmhhcyhhKSkgJiYgKHNlZW4uZ2V0KGEpID09PSBiKSkge1xuICAgICAgICByZXR1cm4gYTtcbiAgICAgIH1cbiAgICAgIHNlZW4uc2V0KGEsIGIpO1xuICAgICAgLy8gRmlsdGVyIGtleXMgYW5kIHN5bWJvbHMgd2hpY2ggYXJlIHByZXNlbnQgaW4gYm90aCBhY3R1YWwgYW5kIGV4cGVjdGVkXG4gICAgICBjb25zdCBmaWx0ZXJlZCA9IHt9IGFzIGxvb3NlO1xuICAgICAgY29uc3QgZW50cmllcyA9IFtcbiAgICAgICAgLi4uT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYSksXG4gICAgICAgIC4uLk9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoYSksXG4gICAgICBdXG4gICAgICAgIC5maWx0ZXIoKGtleSkgPT4ga2V5IGluIGIpXG4gICAgICAgIC5tYXAoKGtleSkgPT4gW2tleSwgYVtrZXkgYXMgc3RyaW5nXV0pIGFzIEFycmF5PFtzdHJpbmcsIHVua25vd25dPjtcbiAgICAgIC8vIEJ1aWxkIGZpbHRlcmVkIG9iamVjdCBhbmQgZmlsdGVyIHJlY3Vyc2l2ZWx5IG9uIG5lc3RlZCBvYmplY3RzIHJlZmVyZW5jZXNcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIGVudHJpZXMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgIGNvbnN0IHN1YnNldCA9IChiIGFzIGxvb3NlKVtrZXldO1xuICAgICAgICAgIGlmICgodHlwZW9mIHN1YnNldCA9PT0gXCJvYmplY3RcIikgJiYgKHN1YnNldCkpIHtcbiAgICAgICAgICAgIGZpbHRlcmVkW2tleV0gPSBmaWx0ZXIodmFsdWUgYXMgbG9vc2UsIHN1YnNldCBhcyBsb29zZSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZmlsdGVyZWRba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgIH0pKGFjdHVhbCwgZXhwZWN0ZWQpLFxuICAgIGV4cGVjdGVkLFxuICApO1xufVxuXG4vKipcbiAqIEZvcmNlZnVsbHkgdGhyb3dzIGEgZmFpbGVkIGFzc2VydGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZmFpbChtc2c/OiBzdHJpbmcpOiB2b2lkIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11c2UtYmVmb3JlLWRlZmluZVxuICBhc3NlcnQoZmFsc2UsIGBGYWlsZWQgYXNzZXJ0aW9uJHttc2cgPyBgOiAke21zZ31gIDogXCIuXCJ9YCk7XG59XG5cbi8qKlxuICogRXhlY3V0ZXMgYSBmdW5jdGlvbiwgZXhwZWN0aW5nIGl0IHRvIHRocm93LiAgSWYgaXQgZG9lcyBub3QsIHRoZW4gaXRcbiAqIHRocm93cy4gIEFuIGVycm9yIGNsYXNzIGFuZCBhIHN0cmluZyB0aGF0IHNob3VsZCBiZSBpbmNsdWRlZCBpbiB0aGVcbiAqIGVycm9yIG1lc3NhZ2UgY2FuIGFsc28gYmUgYXNzZXJ0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRUaHJvd3M8VCA9IHZvaWQ+KFxuICBmbjogKCkgPT4gVCxcbiAgRXJyb3JDbGFzcz86IENvbnN0cnVjdG9yLFxuICBtc2dJbmNsdWRlcyA9IFwiXCIsXG4gIG1zZz86IHN0cmluZyxcbik6IEVycm9yIHtcbiAgbGV0IGRvZXNUaHJvdyA9IGZhbHNlO1xuICBsZXQgZXJyb3IgPSBudWxsO1xuICB0cnkge1xuICAgIGZuKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIEVycm9yID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKFwiQSBub24tRXJyb3Igb2JqZWN0IHdhcyB0aHJvd24uXCIpO1xuICAgIH1cbiAgICBpZiAoRXJyb3JDbGFzcyAmJiAhKGUgaW5zdGFuY2VvZiBFcnJvckNsYXNzKSkge1xuICAgICAgbXNnID1cbiAgICAgICAgYEV4cGVjdGVkIGVycm9yIHRvIGJlIGluc3RhbmNlIG9mIFwiJHtFcnJvckNsYXNzLm5hbWV9XCIsIGJ1dCB3YXMgXCIke2UuY29uc3RydWN0b3IubmFtZX1cIiR7XG4gICAgICAgICAgbXNnID8gYDogJHttc2d9YCA6IFwiLlwiXG4gICAgICAgIH1gO1xuICAgICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gICAgfVxuICAgIGlmIChcbiAgICAgIG1zZ0luY2x1ZGVzICYmXG4gICAgICAhc3RyaXBDb2xvcihlLm1lc3NhZ2UpLmluY2x1ZGVzKHN0cmlwQ29sb3IobXNnSW5jbHVkZXMpKVxuICAgICkge1xuICAgICAgbXNnID1cbiAgICAgICAgYEV4cGVjdGVkIGVycm9yIG1lc3NhZ2UgdG8gaW5jbHVkZSBcIiR7bXNnSW5jbHVkZXN9XCIsIGJ1dCBnb3QgXCIke2UubWVzc2FnZX1cIiR7XG4gICAgICAgICAgbXNnID8gYDogJHttc2d9YCA6IFwiLlwiXG4gICAgICAgIH1gO1xuICAgICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gICAgfVxuICAgIGRvZXNUaHJvdyA9IHRydWU7XG4gICAgZXJyb3IgPSBlO1xuICB9XG4gIGlmICghZG9lc1Rocm93KSB7XG4gICAgbXNnID0gYEV4cGVjdGVkIGZ1bmN0aW9uIHRvIHRocm93JHttc2cgPyBgOiAke21zZ31gIDogXCIuXCJ9YDtcbiAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgfVxuICByZXR1cm4gZXJyb3I7XG59XG5cbi8qKlxuICogRXhlY3V0ZXMgYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGEgcHJvbWlzZSwgZXhwZWN0aW5nIGl0IHRvIHRocm93IG9yIHJlamVjdC5cbiAqIElmIGl0IGRvZXMgbm90LCB0aGVuIGl0IHRocm93cy4gIEFuIGVycm9yIGNsYXNzIGFuZCBhIHN0cmluZyB0aGF0IHNob3VsZCBiZVxuICogaW5jbHVkZWQgaW4gdGhlIGVycm9yIG1lc3NhZ2UgY2FuIGFsc28gYmUgYXNzZXJ0ZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhc3NlcnRUaHJvd3NBc3luYzxUID0gdm9pZD4oXG4gIGZuOiAoKSA9PiBQcm9taXNlPFQ+LFxuICBFcnJvckNsYXNzPzogQ29uc3RydWN0b3IsXG4gIG1zZ0luY2x1ZGVzID0gXCJcIixcbiAgbXNnPzogc3RyaW5nLFxuKTogUHJvbWlzZTxFcnJvcj4ge1xuICBsZXQgZG9lc1Rocm93ID0gZmFsc2U7XG4gIGxldCBlcnJvciA9IG51bGw7XG4gIHRyeSB7XG4gICAgYXdhaXQgZm4oKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlIGluc3RhbmNlb2YgRXJyb3IgPT09IGZhbHNlKSB7XG4gICAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IoXCJBIG5vbi1FcnJvciBvYmplY3Qgd2FzIHRocm93biBvciByZWplY3RlZC5cIik7XG4gICAgfVxuICAgIGlmIChFcnJvckNsYXNzICYmICEoZSBpbnN0YW5jZW9mIEVycm9yQ2xhc3MpKSB7XG4gICAgICBtc2cgPVxuICAgICAgICBgRXhwZWN0ZWQgZXJyb3IgdG8gYmUgaW5zdGFuY2Ugb2YgXCIke0Vycm9yQ2xhc3MubmFtZX1cIiwgYnV0IGdvdCBcIiR7ZS5uYW1lfVwiJHtcbiAgICAgICAgICBtc2cgPyBgOiAke21zZ31gIDogXCIuXCJcbiAgICAgICAgfWA7XG4gICAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgbXNnSW5jbHVkZXMgJiZcbiAgICAgICFzdHJpcENvbG9yKGUubWVzc2FnZSkuaW5jbHVkZXMoc3RyaXBDb2xvcihtc2dJbmNsdWRlcykpXG4gICAgKSB7XG4gICAgICBtc2cgPVxuICAgICAgICBgRXhwZWN0ZWQgZXJyb3IgbWVzc2FnZSB0byBpbmNsdWRlIFwiJHttc2dJbmNsdWRlc31cIiwgYnV0IGdvdCBcIiR7ZS5tZXNzYWdlfVwiJHtcbiAgICAgICAgICBtc2cgPyBgOiAke21zZ31gIDogXCIuXCJcbiAgICAgICAgfWA7XG4gICAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgICB9XG4gICAgZG9lc1Rocm93ID0gdHJ1ZTtcbiAgICBlcnJvciA9IGU7XG4gIH1cbiAgaWYgKCFkb2VzVGhyb3cpIHtcbiAgICBtc2cgPSBgRXhwZWN0ZWQgZnVuY3Rpb24gdG8gdGhyb3cke21zZyA/IGA6ICR7bXNnfWAgOiBcIi5cIn1gO1xuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICB9XG4gIHJldHVybiBlcnJvcjtcbn1cblxuLyoqIFVzZSB0aGlzIHRvIHN0dWIgb3V0IG1ldGhvZHMgdGhhdCB3aWxsIHRocm93IHdoZW4gaW52b2tlZC4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmltcGxlbWVudGVkKG1zZz86IHN0cmluZyk6IG5ldmVyIHtcbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyB8fCBcInVuaW1wbGVtZW50ZWRcIik7XG59XG5cbi8qKiBVc2UgdGhpcyB0byBhc3NlcnQgdW5yZWFjaGFibGUgY29kZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bnJlYWNoYWJsZSgpOiBuZXZlciB7XG4gIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihcInVucmVhY2hhYmxlXCIpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSw4RUFBOEU7QUFDOUUsMkNBQTJDO0FBRTNDLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxLQUFLLFFBQVEsa0JBQWtCLENBQUM7QUFDN0UsU0FBUyxJQUFJLEVBQWMsUUFBUSxRQUFRLFlBQVksQ0FBQztBQUV4RCxNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQUFBQztBQU8zQyxPQUFPLE1BQU0sY0FBYyxTQUFTLEtBQUs7SUFDdkMsWUFBWSxPQUFlLENBQUU7UUFDM0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLElBQUksR0FBRyxnQkFBZ0IsQ0FBQztLQUM5QjtDQUNGO0FBRUQ7Ozs7R0FJRyxDQUNILE9BQU8sU0FBUyxPQUFPLENBQUMsQ0FBVSxFQUFVO0lBQzFDLE9BQU8sVUFBVSxDQUFD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