// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
import { red, green, white, gray, bold } from "../fmt/colors.ts";
import diff, { DiffType } from "./diff.ts";
const CAN_NOT_DISPLAY = "[Cannot display]";
export class AssertionError extends Error {
    constructor(message){
        super(message);
        this.name = "AssertionError";
    }
}
function format(v) {
    let string = Deno.inspect(v);
    if (typeof v == "string") {
        string = `"${string.replace(/(?=["\\])/g, "\\")}"`;
    }
    return string;
}
function createColor(diffType) {
    switch(diffType){
        case DiffType.added:
            return (s)=>green(bold(s));
        case DiffType.removed:
            return (s)=>red(bold(s));
        default:
            return white;
    }
}
function createSign(diffType) {
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
export function equal(c, d) {
    const seen = new Map();
    return function compare(a, b) {
        // Have to render RegExp & Date for string comparison
        // unless it's mistreated as object
        if (a && b && (a instanceof RegExp && b instanceof RegExp || a instanceof Date && b instanceof Date)) {
            return String(a) === String(b);
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
/** Make an assertion, if not `true`, then throw. */ export function assert(expr, msg = "") {
    if (!expr) {
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that `actual` and `expected` are equal, deeply. If not
 * deeply equal, then throw.
 */ export function assertEquals(actual, expected, msg) {
    if (equal(actual, expected)) {
        return;
    }
    let message = "";
    const actualString = format(actual);
    const expectedString = format(expected);
    try {
        const diffResult = diff(actualString.split("\n"), expectedString.split("\n"));
        message = buildMessage(diffResult).join("\n");
    } catch (e) {
        message = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
    }
    if (msg) {
        message = msg;
    }
    throw new AssertionError(message);
}
/**
 * Make an assertion that `actual` and `expected` are not equal, deeply.
 * If not then throw.
 */ export function assertNotEquals(actual, expected, msg) {
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
    } catch (e) {
        expectedString = "[Cannot display]";
    }
    if (!msg) {
        msg = `actual: ${actualString} expected: ${expectedString}`;
    }
    throw new AssertionError(msg);
}
/**
 * Make an assertion that `actual` and `expected` are strictly equal.  If
 * not then throw.
 */ export function assertStrictEq(actual, expected, msg) {
    if (actual !== expected) {
        let actualString;
        let expectedString;
        try {
            actualString = String(actual);
        } catch (e) {
            actualString = "[Cannot display]";
        }
        try {
            expectedString = String(expected);
        } catch (e) {
            expectedString = "[Cannot display]";
        }
        if (!msg) {
            msg = `actual: ${actualString} expected: ${expectedString}`;
        }
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that actual contains expected. If not
 * then thrown.
 */ export function assertStrContains(actual, expected, msg) {
    if (!actual.includes(expected)) {
        if (!msg) {
            msg = `actual: "${actual}" expected to contains: "${expected}"`;
        }
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that `actual` contains the `expected` values
 * If not then thrown.
 */ export function assertArrayContains(actual, expected, msg) {
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
        msg = `actual: "${actual}" expected to contains: "${expected}"`;
        msg += "\n";
        msg += `missing: ${missing}`;
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
 * Forcefully throws a failed assertion
 */ export function fail(msg) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    assert(false, `Failed assertion${msg ? `: ${msg}` : "."}`);
}
/** Executes a function, expecting it to throw.  If it does not, then it
 * throws.  An error class and a string that should be included in the
 * error message can also be asserted.
 */ export function assertThrows(fn, ErrorClass, msgIncludes = "", msg) {
    let doesThrow = false;
    let error = null;
    try {
        fn();
    } catch (e) {
        if (ErrorClass && !(Object.getPrototypeOf(e) === ErrorClass.prototype)) {
            msg = `Expected error to be instance of "${ErrorClass.name}", but was "${e.constructor.name}"${msg ? `: ${msg}` : "."}`;
            throw new AssertionError(msg);
        }
        if (msgIncludes && !e.message.includes(msgIncludes)) {
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
export async function assertThrowsAsync(fn, ErrorClass, msgIncludes = "", msg) {
    let doesThrow = false;
    let error = null;
    try {
        await fn();
    } catch (e) {
        if (ErrorClass && !(Object.getPrototypeOf(e) === ErrorClass.prototype)) {
            msg = `Expected error to be instance of "${ErrorClass.name}", but got "${e.name}"${msg ? `: ${msg}` : "."}`;
            throw new AssertionError(msg);
        }
        if (msgIncludes && !e.message.includes(msgIncludes)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjUxLjAvdGVzdGluZy9hc3NlcnRzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjAgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5pbXBvcnQgeyByZWQsIGdyZWVuLCB3aGl0ZSwgZ3JheSwgYm9sZCB9IGZyb20gXCIuLi9mbXQvY29sb3JzLnRzXCI7XG5pbXBvcnQgZGlmZiwgeyBEaWZmVHlwZSwgRGlmZlJlc3VsdCB9IGZyb20gXCIuL2RpZmYudHNcIjtcblxuY29uc3QgQ0FOX05PVF9ESVNQTEFZID0gXCJbQ2Fubm90IGRpc3BsYXldXCI7XG5cbmludGVyZmFjZSBDb25zdHJ1Y3RvciB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIG5ldyAoLi4uYXJnczogYW55W10pOiBhbnk7XG59XG5cbmV4cG9ydCBjbGFzcyBBc3NlcnRpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gXCJBc3NlcnRpb25FcnJvclwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZvcm1hdCh2OiB1bmtub3duKTogc3RyaW5nIHtcbiAgbGV0IHN0cmluZyA9IERlbm8uaW5zcGVjdCh2KTtcbiAgaWYgKHR5cGVvZiB2ID09IFwic3RyaW5nXCIpIHtcbiAgICBzdHJpbmcgPSBgXCIke3N0cmluZy5yZXBsYWNlKC8oPz1bXCJcXFxcXSkvZywgXCJcXFxcXCIpfVwiYDtcbiAgfVxuICByZXR1cm4gc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVDb2xvcihkaWZmVHlwZTogRGlmZlR5cGUpOiAoczogc3RyaW5nKSA9PiBzdHJpbmcge1xuICBzd2l0Y2ggKGRpZmZUeXBlKSB7XG4gICAgY2FzZSBEaWZmVHlwZS5hZGRlZDpcbiAgICAgIHJldHVybiAoczogc3RyaW5nKTogc3RyaW5nID0+IGdyZWVuKGJvbGQocykpO1xuICAgIGNhc2UgRGlmZlR5cGUucmVtb3ZlZDpcbiAgICAgIHJldHVybiAoczogc3RyaW5nKTogc3RyaW5nID0+IHJlZChib2xkKHMpKTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHdoaXRlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVNpZ24oZGlmZlR5cGU6IERpZmZUeXBlKTogc3RyaW5nIHtcbiAgc3dpdGNoIChkaWZmVHlwZSkge1xuICAgIGNhc2UgRGlmZlR5cGUuYWRkZWQ6XG4gICAgICByZXR1cm4gXCIrICAgXCI7XG4gICAgY2FzZSBEaWZmVHlwZS5yZW1vdmVkOlxuICAgICAgcmV0dXJuIFwiLSAgIFwiO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gXCIgICAgXCI7XG4gIH1cbn1cblxuZnVuY3Rpb24gYnVpbGRNZXNzYWdlKGRpZmZSZXN1bHQ6IFJlYWRvbmx5QXJyYXk8RGlmZlJlc3VsdDxzdHJpbmc+Pik6IHN0cmluZ1tdIHtcbiAgY29uc3QgbWVzc2FnZXM6IHN0cmluZ1tdID0gW107XG4gIG1lc3NhZ2VzLnB1c2goXCJcIik7XG4gIG1lc3NhZ2VzLnB1c2goXCJcIik7XG4gIG1lc3NhZ2VzLnB1c2goXG4gICAgYCAgICAke2dyYXkoYm9sZChcIltEaWZmXVwiKSl9ICR7cmVkKGJvbGQoXCJBY3R1YWxcIikpfSAvICR7Z3JlZW4oXG4gICAgICBib2xkKFwiRXhwZWN0ZWRcIilcbiAgICApfWBcbiAgKTtcbiAgbWVzc2FnZXMucHVzaChcIlwiKTtcbiAgbWVzc2FnZXMucHVzaChcIlwiKTtcbiAgZGlmZlJlc3VsdC5mb3JFYWNoKChyZXN1bHQ6IERpZmZSZXN1bHQ8c3RyaW5nPik6IHZvaWQgPT4ge1xuICAgIGNvbnN0IGMgPSBjcmVhdGVDb2xvcihyZXN1bHQudHlwZSk7XG4gICAgbWVzc2FnZXMucHVzaChjKGAke2NyZWF0ZVNpZ24ocmVzdWx0LnR5cGUpfSR7cmVzdWx0LnZhbHVlfWApKTtcbiAgfSk7XG4gIG1lc3NhZ2VzLnB1c2goXCJcIik7XG5cbiAgcmV0dXJuIG1lc3NhZ2VzO1xufVxuXG5mdW5jdGlvbiBpc0tleWVkQ29sbGVjdGlvbih4OiB1bmtub3duKTogeCBpcyBTZXQ8dW5rbm93bj4ge1xuICByZXR1cm4gW1N5bWJvbC5pdGVyYXRvciwgXCJzaXplXCJdLmV2ZXJ5KChrKSA9PiBrIGluICh4IGFzIFNldDx1bmtub3duPikpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXF1YWwoYzogdW5rbm93biwgZDogdW5rbm93bik6IGJvb2xlYW4ge1xuICBjb25zdCBzZWVuID0gbmV3IE1hcCgpO1xuICByZXR1cm4gKGZ1bmN0aW9uIGNvbXBhcmUoYTogdW5rbm93biwgYjogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIC8vIEhhdmUgdG8gcmVuZGVyIFJlZ0V4cCAmIERhdGUgZm9yIHN0cmluZyBjb21wYXJpc29uXG4gICAgLy8gdW5sZXNzIGl0J3MgbWlzdHJlYXRlZCBhcyBvYmplY3RcbiAgICBpZiAoXG4gICAgICBhICYmXG4gICAgICBiICYmXG4gICAgICAoKGEgaW5zdGFuY2VvZiBSZWdFeHAgJiYgYiBpbnN0YW5jZW9mIFJlZ0V4cCkgfHxcbiAgICAgICAgKGEgaW5zdGFuY2VvZiBEYXRlICYmIGIgaW5zdGFuY2VvZiBEYXRlKSlcbiAgICApIHtcbiAgICAgIHJldHVybiBTdHJpbmcoYSkgPT09IFN0cmluZyhiKTtcbiAgICB9XG4gICAgaWYgKE9iamVjdC5pcyhhLCBiKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChhICYmIHR5cGVvZiBhID09PSBcIm9iamVjdFwiICYmIGIgJiYgdHlwZW9mIGIgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIGlmIChzZWVuLmdldChhKSA9PT0gYikge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChPYmplY3Qua2V5cyhhIHx8IHt9KS5sZW5ndGggIT09IE9iamVjdC5rZXlzKGIgfHwge30pLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoaXNLZXllZENvbGxlY3Rpb24oYSkgJiYgaXNLZXllZENvbGxlY3Rpb24oYikpIHtcbiAgICAgICAgaWYgKGEuc2l6ZSAhPT0gYi5zaXplKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHVubWF0Y2hlZEVudHJpZXMgPSBhLnNpemU7XG5cbiAgICAgICAgZm9yIChjb25zdCBbYUtleSwgYVZhbHVlXSBvZiBhLmVudHJpZXMoKSkge1xuICAgICAgICAgIGZvciAoY29uc3QgW2JLZXksIGJWYWx1ZV0gb2YgYi5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIC8qIEdpdmVuIHRoYXQgTWFwIGtleXMgY2FuIGJlIHJlZmVyZW5jZXMsIHdlIG5lZWRcbiAgICAgICAgICAgICAqIHRvIGVuc3VyZSB0aGF0IHRoZXkgYXJlIGFsc28gZGVlcGx5IGVxdWFsICovXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIChhS2V5ID09PSBhVmFsdWUgJiYgYktleSA9PT0gYlZhbHVlICYmIGNvbXBhcmUoYUtleSwgYktleSkpIHx8XG4gICAgICAgICAgICAgIChjb21wYXJlKGFLZXksIGJLZXkpICYmIGNvbXBhcmUoYVZhbHVlLCBiVmFsdWUpKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHVubWF0Y2hlZEVudHJpZXMtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdW5tYXRjaGVkRW50cmllcyA9PT0gMDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1lcmdlZCA9IHsgLi4uYSwgLi4uYiB9O1xuICAgICAgZm9yIChjb25zdCBrZXkgaW4gbWVyZ2VkKSB7XG4gICAgICAgIHR5cGUgS2V5ID0ga2V5b2YgdHlwZW9mIG1lcmdlZDtcbiAgICAgICAgaWYgKCFjb21wYXJlKGEgJiYgYVtrZXkgYXMgS2V5XSwgYiAmJiBiW2tleSBhcyBLZXldKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2Vlbi5zZXQoYSwgYik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KShjLCBkKTtcbn1cblxuLyoqIE1ha2UgYW4gYXNzZXJ0aW9uLCBpZiBub3QgYHRydWVgLCB0aGVuIHRocm93LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydChleHByOiB1bmtub3duLCBtc2cgPSBcIlwiKTogYXNzZXJ0cyBleHByIHtcbiAgaWYgKCFleHByKSB7XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBNYWtlIGFuIGFzc2VydGlvbiB0aGF0IGBhY3R1YWxgIGFuZCBgZXhwZWN0ZWRgIGFyZSBlcXVhbCwgZGVlcGx5LiBJZiBub3RcbiAqIGRlZXBseSBlcXVhbCwgdGhlbiB0aHJvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydEVxdWFscyhcbiAgYWN0dWFsOiB1bmtub3duLFxuICBleHBlY3RlZDogdW5rbm93bixcbiAgbXNnPzogc3RyaW5nXG4pOiB2b2lkIHtcbiAgaWYgKGVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGxldCBtZXNzYWdlID0gXCJcIjtcbiAgY29uc3QgYWN0dWFsU3RyaW5nID0gZm9ybWF0KGFjdHVhbCk7XG4gIGNvbnN0IGV4cGVjdGVkU3RyaW5nID0gZm9ybWF0KGV4cGVjdGVkKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBkaWZmUmVzdWx0ID0gZGlmZihcbiAgICAgIGFjdHVhbFN0cmluZy5zcGxpdChcIlxcblwiKSxcbiAgICAgIGV4cGVjdGVkU3RyaW5nLnNwbGl0KFwiXFxuXCIpXG4gICAgKTtcbiAgICBtZXNzYWdlID0gYnVpbGRNZXNzYWdlKGRpZmZSZXN1bHQpLmpvaW4oXCJcXG5cIik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBtZXNzYWdlID0gYFxcbiR7cmVkKENBTl9OT1RfRElTUExBWSl9ICsgXFxuXFxuYDtcbiAgfVxuICBpZiAobXNnKSB7XG4gICAgbWVzc2FnZSA9IG1zZztcbiAgfVxuICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobWVzc2FnZSk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBhbmQgYGV4cGVjdGVkYCBhcmUgbm90IGVxdWFsLCBkZWVwbHkuXG4gKiBJZiBub3QgdGhlbiB0aHJvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE5vdEVxdWFscyhcbiAgYWN0dWFsOiB1bmtub3duLFxuICBleHBlY3RlZDogdW5rbm93bixcbiAgbXNnPzogc3RyaW5nXG4pOiB2b2lkIHtcbiAgaWYgKCFlcXVhbChhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgYWN0dWFsU3RyaW5nOiBzdHJpbmc7XG4gIGxldCBleHBlY3RlZFN0cmluZzogc3RyaW5nO1xuICB0cnkge1xuICAgIGFjdHVhbFN0cmluZyA9IFN0cmluZyhhY3R1YWwpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgYWN0dWFsU3RyaW5nID0gXCJbQ2Fubm90IGRpc3BsYXldXCI7XG4gIH1cbiAgdHJ5IHtcbiAgICBleHBlY3RlZFN0cmluZyA9IFN0cmluZyhleHBlY3RlZCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBleHBlY3RlZFN0cmluZyA9IFwiW0Nhbm5vdCBkaXNwbGF5XVwiO1xuICB9XG4gIGlmICghbXNnKSB7XG4gICAgbXNnID0gYGFjdHVhbDogJHthY3R1YWxTdHJpbmd9IGV4cGVjdGVkOiAke2V4cGVjdGVkU3RyaW5nfWA7XG4gIH1cbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBhbmQgYGV4cGVjdGVkYCBhcmUgc3RyaWN0bHkgZXF1YWwuICBJZlxuICogbm90IHRoZW4gdGhyb3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRTdHJpY3RFcShcbiAgYWN0dWFsOiB1bmtub3duLFxuICBleHBlY3RlZDogdW5rbm93bixcbiAgbXNnPzogc3RyaW5nXG4pOiB2b2lkIHtcbiAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcbiAgICBsZXQgYWN0dWFsU3RyaW5nOiBzdHJpbmc7XG4gICAgbGV0IGV4cGVjdGVkU3RyaW5nOiBzdHJpbmc7XG4gICAgdHJ5IHtcbiAgICAgIGFjdHVhbFN0cmluZyA9IFN0cmluZyhhY3R1YWwpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGFjdHVhbFN0cmluZyA9IFwiW0Nhbm5vdCBkaXNwbGF5XVwiO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgZXhwZWN0ZWRTdHJpbmcgPSBTdHJpbmcoZXhwZWN0ZWQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGV4cGVjdGVkU3RyaW5nID0gXCJbQ2Fubm90IGRpc3BsYXldXCI7XG4gICAgfVxuICAgIGlmICghbXNnKSB7XG4gICAgICBtc2cgPSBgYWN0dWFsOiAke2FjdHVhbFN0cmluZ30gZXhwZWN0ZWQ6ICR7ZXhwZWN0ZWRTdHJpbmd9YDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBNYWtlIGFuIGFzc2VydGlvbiB0aGF0IGFjdHVhbCBjb250YWlucyBleHBlY3RlZC4gSWYgbm90XG4gKiB0aGVuIHRocm93bi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFN0ckNvbnRhaW5zKFxuICBhY3R1YWw6IHN0cmluZyxcbiAgZXhwZWN0ZWQ6IHN0cmluZyxcbiAgbXNnPzogc3RyaW5nXG4pOiB2b2lkIHtcbiAgaWYgKCFhY3R1YWwuaW5jbHVkZXMoZXhwZWN0ZWQpKSB7XG4gICAgaWYgKCFtc2cpIHtcbiAgICAgIG1zZyA9IGBhY3R1YWw6IFwiJHthY3R1YWx9XCIgZXhwZWN0ZWQgdG8gY29udGFpbnM6IFwiJHtleHBlY3RlZH1cImA7XG4gICAgfVxuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICB9XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBjb250YWlucyB0aGUgYGV4cGVjdGVkYCB2YWx1ZXNcbiAqIElmIG5vdCB0aGVuIHRocm93bi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydEFycmF5Q29udGFpbnMoXG4gIGFjdHVhbDogdW5rbm93bltdLFxuICBleHBlY3RlZDogdW5rbm93bltdLFxuICBtc2c/OiBzdHJpbmdcbik6IHZvaWQge1xuICBjb25zdCBtaXNzaW5nOiB1bmtub3duW10gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHBlY3RlZC5sZW5ndGg7IGkrKykge1xuICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgYWN0dWFsLmxlbmd0aDsgaisrKSB7XG4gICAgICBpZiAoZXF1YWwoZXhwZWN0ZWRbaV0sIGFjdHVhbFtqXSkpIHtcbiAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgbWlzc2luZy5wdXNoKGV4cGVjdGVkW2ldKTtcbiAgICB9XG4gIH1cbiAgaWYgKG1pc3NpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghbXNnKSB7XG4gICAgbXNnID0gYGFjdHVhbDogXCIke2FjdHVhbH1cIiBleHBlY3RlZCB0byBjb250YWluczogXCIke2V4cGVjdGVkfVwiYDtcbiAgICBtc2cgKz0gXCJcXG5cIjtcbiAgICBtc2cgKz0gYG1pc3Npbmc6ICR7bWlzc2luZ31gO1xuICB9XG4gIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xufVxuXG4vKipcbiAqIE1ha2UgYW4gYXNzZXJ0aW9uIHRoYXQgYGFjdHVhbGAgbWF0Y2ggUmVnRXhwIGBleHBlY3RlZGAuIElmIG5vdFxuICogdGhlbiB0aHJvd25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE1hdGNoKFxuICBhY3R1YWw6IHN0cmluZyxcbiAgZXhwZWN0ZWQ6IFJlZ0V4cCxcbiAgbXNnPzogc3RyaW5nXG4pOiB2b2lkIHtcbiAgaWYgKCFleHBlY3RlZC50ZXN0KGFjdHVhbCkpIHtcbiAgICBpZiAoIW1zZykge1xuICAgICAgbXNnID0gYGFjdHVhbDogXCIke2FjdHVhbH1cIiBleHBlY3RlZCB0byBtYXRjaDogXCIke2V4cGVjdGVkfVwiYDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBGb3JjZWZ1bGx5IHRocm93cyBhIGZhaWxlZCBhc3NlcnRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZhaWwobXNnPzogc3RyaW5nKTogdm9pZCB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdXNlLWJlZm9yZS1kZWZpbmVcbiAgYXNzZXJ0KGZhbHNlLCBgRmFpbGVkIGFzc2VydGlvbiR7bXNnID8gYDogJHttc2d9YCA6IFwiLlwifWApO1xufVxuXG4vKiogRXhlY3V0ZXMgYSBmdW5jdGlvbiwgZXhwZWN0aW5nIGl0IHRvIHRocm93LiAgSWYgaXQgZG9lcyBub3QsIHRoZW4gaXRcbiAqIHRocm93cy4gIEFuIGVycm9yIGNsYXNzIGFuZCBhIHN0cmluZyB0aGF0IHNob3VsZCBiZSBpbmNsdWRlZCBpbiB0aGVcbiAqIGVycm9yIG1lc3NhZ2UgY2FuIGFsc28gYmUgYXNzZXJ0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRUaHJvd3MoXG4gIGZuOiAoKSA9PiB2b2lkLFxuICBFcnJvckNsYXNzPzogQ29uc3RydWN0b3IsXG4gIG1zZ0luY2x1ZGVzID0gXCJcIixcbiAgbXNnPzogc3RyaW5nXG4pOiBFcnJvciB7XG4gIGxldCBkb2VzVGhyb3cgPSBmYWxzZTtcbiAgbGV0IGVycm9yID0gbnVsbDtcbiAgdHJ5IHtcbiAgICBmbigpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKEVycm9yQ2xhc3MgJiYgIShPYmplY3QuZ2V0UHJvdG90eXBlT2YoZSkgPT09IEVycm9yQ2xhc3MucHJvdG90eXBlKSkge1xuICAgICAgbXNnID0gYEV4cGVjdGVkIGVycm9yIHRvIGJlIGluc3RhbmNlIG9mIFwiJHtFcnJvckNsYXNzLm5hbWV9XCIsIGJ1dCB3YXMgXCIke1xuICAgICAgICBlLmNvbnN0cnVjdG9yLm5hbWVcbiAgICAgIH1cIiR7bXNnID8gYDogJHttc2d9YCA6IFwiLlwifWA7XG4gICAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgICB9XG4gICAgaWYgKG1zZ0luY2x1ZGVzICYmICFlLm1lc3NhZ2UuaW5jbHVkZXMobXNnSW5jbHVkZXMpKSB7XG4gICAgICBtc2cgPSBgRXhwZWN0ZWQgZXJyb3IgbWVzc2FnZSB0byBpbmNsdWRlIFwiJHttc2dJbmNsdWRlc31cIiwgYnV0IGdvdCBcIiR7XG4gICAgICAgIGUubWVzc2FnZVxuICAgICAgfVwiJHttc2cgPyBgOiAke21zZ31gIDogXCIuXCJ9YDtcbiAgICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICAgIH1cbiAgICBkb2VzVGhyb3cgPSB0cnVlO1xuICAgIGVycm9yID0gZTtcbiAgfVxuICBpZiAoIWRvZXNUaHJvdykge1xuICAgIG1zZyA9IGBFeHBlY3RlZCBmdW5jdGlvbiB0byB0aHJvdyR7bXNnID8gYDogJHttc2d9YCA6IFwiLlwifWA7XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbiAgcmV0dXJuIGVycm9yO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXNzZXJ0VGhyb3dzQXN5bmMoXG4gIGZuOiAoKSA9PiBQcm9taXNlPHZvaWQ+LFxuICBFcnJvckNsYXNzPzogQ29uc3RydWN0b3IsXG4gIG1zZ0luY2x1ZGVzID0gXCJcIixcbiAgbXNnPzogc3RyaW5nXG4pOiBQcm9taXNlPEVycm9yPiB7XG4gIGxldCBkb2VzVGhyb3cgPSBmYWxzZTtcbiAgbGV0IGVycm9yID0gbnVsbDtcbiAgdHJ5IHtcbiAgICBhd2FpdCBmbigpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKEVycm9yQ2xhc3MgJiYgIShPYmplY3QuZ2V0UHJvdG90eXBlT2YoZSkgPT09IEVycm9yQ2xhc3MucHJvdG90eXBlKSkge1xuICAgICAgbXNnID0gYEV4cGVjdGVkIGVycm9yIHRvIGJlIGluc3RhbmNlIG9mIFwiJHtFcnJvckNsYXNzLm5hbWV9XCIsIGJ1dCBnb3QgXCIke1xuICAgICAgICBlLm5hbWVcbiAgICAgIH1cIiR7bXNnID8gYDogJHttc2d9YCA6IFwiLlwifWA7XG4gICAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgICB9XG4gICAgaWYgKG1zZ0luY2x1ZGVzICYmICFlLm1lc3NhZ2UuaW5jbHVkZXMobXNnSW5jbHVkZXMpKSB7XG4gICAgICBtc2cgPSBgRXhwZWN0ZWQgZXJyb3IgbWVzc2FnZSB0byBpbmNsdWRlIFwiJHttc2dJbmNsdWRlc31cIiwgYnV0IGdvdCBcIiR7XG4gICAgICAgIGUubWVzc2FnZVxuICAgICAgfVwiJHttc2cgPyBgOiAke21zZ31gIDogXCIuXCJ9YDtcbiAgICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICAgIH1cbiAgICBkb2VzVGhyb3cgPSB0cnVlO1xuICAgIGVycm9yID0gZTtcbiAgfVxuICBpZiAoIWRvZXNUaHJvdykge1xuICAgIG1zZyA9IGBFeHBlY3RlZCBmdW5jdGlvbiB0byB0aHJvdyR7bXNnID8gYDogJHttc2d9YCA6IFwiLlwifWA7XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbiAgcmV0dXJuIGVycm9yO1xufVxuXG4vKiogVXNlIHRoaXMgdG8gc3R1YiBvdXQgbWV0aG9kcyB0aGF0IHdpbGwgdGhyb3cgd2hlbiBpbnZva2VkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuaW1wbGVtZW50ZWQobXNnPzogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnIHx8IFwidW5pbXBsZW1lbnRlZFwiKTtcbn1cblxuLyoqIFVzZSB0aGlzIHRvIGFzc2VydCB1bnJlYWNoYWJsZSBjb2RlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVucmVhY2hhYmxlKCk6IG5ldmVyIHtcbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKFwidW5yZWFjaGFibGVcIik7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLFNBQVMsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksUUFBUSxtQkFBbUI7QUFDakUsT0FBTyxRQUFRLFFBQVEsUUFBb0IsWUFBWTtBQUV2RCxNQUFNLGtCQUFrQjtBQU94QixPQUFPLE1BQU0sdUJBQXVCO0lBQ2xDLFlBQVksT0FBZSxDQUFFO1FBQzNCLEtBQUssQ0FBQztRQUNOLElBQUksQ0FBQyxJQUFJLEdBQUc7SUFDZDtBQUNGLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBVSxFQUFVO0lBQ2xDLElBQUksU0FBUyxLQUFLLE9BQU8sQ0FBQztJQUMxQixJQUFJLE9BQU8sS0FBSyxVQUFVO1FBQ3hCLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxPQUFPLENBQUMsY0FBYyxNQUFNLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBQ0QsT0FBTztBQUNUO0FBRUEsU0FBUyxZQUFZLFFBQWtCLEVBQXlCO0lBQzlELE9BQVE7UUFDTixLQUFLLFNBQVMsS0FBSztZQUNqQixPQUFPLENBQUMsSUFBc0IsTUFBTSxLQUFLO1FBQzNDLEtBQUssU0FBUyxPQUFPO1lBQ25CLE9BQU8sQ0FBQyxJQUFzQixJQUFJLEtBQUs7UUFDekM7WUFDRSxPQUFPO0lBQ1g7QUFDRjtBQUVBLFNBQVMsV0FB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