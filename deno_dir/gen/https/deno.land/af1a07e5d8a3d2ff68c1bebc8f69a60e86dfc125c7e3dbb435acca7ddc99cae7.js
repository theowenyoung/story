// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { deferred } from "../async/mod.ts";
import { assert, assertStringIncludes, fail } from "../testing/asserts.ts";
export function notImplemented(msg) {
    const message = msg ? `Not implemented: ${msg}` : "Not implemented";
    throw new Error(message);
}
export const _TextDecoder = TextDecoder;
export const _TextEncoder = TextEncoder;
export function intoCallbackAPI(// deno-lint-ignore no-explicit-any
func, cb, // deno-lint-ignore no-explicit-any
...args) {
    func(...args).then((value)=>cb && cb(null, value), (err)=>cb && cb(err));
}
export function intoCallbackAPIWithIntercept(// deno-lint-ignore no-explicit-any
func, interceptor, cb, // deno-lint-ignore no-explicit-any
...args) {
    func(...args).then((value)=>cb && cb(null, interceptor(value)), (err)=>cb && cb(err));
}
export function spliceOne(list, index) {
    for(; index + 1 < list.length; index++)list[index] = list[index + 1];
    list.pop();
}
// Taken from: https://github.com/nodejs/node/blob/ba684805b6c0eded76e5cd89ee00328ac7a59365/lib/internal/util.js#L125
// Return undefined if there is no match.
// Move the "slow cases" to a separate function to make sure this function gets
// inlined properly. That prioritizes the common case.
export function normalizeEncoding(enc) {
    if (enc == null || enc === "utf8" || enc === "utf-8") return "utf8";
    return slowCases(enc);
}
// https://github.com/nodejs/node/blob/ba684805b6c0eded76e5cd89ee00328ac7a59365/lib/internal/util.js#L130
function slowCases(enc) {
    switch(enc.length){
        case 4:
            if (enc === "UTF8") return "utf8";
            if (enc === "ucs2" || enc === "UCS2") return "utf16le";
            enc = `${enc}`.toLowerCase();
            if (enc === "utf8") return "utf8";
            if (enc === "ucs2") return "utf16le";
            break;
        case 3:
            if (enc === "hex" || enc === "HEX" || `${enc}`.toLowerCase() === "hex") {
                return "hex";
            }
            break;
        case 5:
            if (enc === "ascii") return "ascii";
            if (enc === "ucs-2") return "utf16le";
            if (enc === "UTF-8") return "utf8";
            if (enc === "ASCII") return "ascii";
            if (enc === "UCS-2") return "utf16le";
            enc = `${enc}`.toLowerCase();
            if (enc === "utf-8") return "utf8";
            if (enc === "ascii") return "ascii";
            if (enc === "ucs-2") return "utf16le";
            break;
        case 6:
            if (enc === "base64") return "base64";
            if (enc === "latin1" || enc === "binary") return "latin1";
            if (enc === "BASE64") return "base64";
            if (enc === "LATIN1" || enc === "BINARY") return "latin1";
            enc = `${enc}`.toLowerCase();
            if (enc === "base64") return "base64";
            if (enc === "latin1" || enc === "binary") return "latin1";
            break;
        case 7:
            if (enc === "utf16le" || enc === "UTF16LE" || `${enc}`.toLowerCase() === "utf16le") {
                return "utf16le";
            }
            break;
        case 8:
            if (enc === "utf-16le" || enc === "UTF-16LE" || `${enc}`.toLowerCase() === "utf-16le") {
                return "utf16le";
            }
            break;
        default:
            if (enc === "") return "utf8";
    }
}
export function validateIntegerRange(value, name, min = -2147483648, max = 2147483647) {
    // The defaults for min and max correspond to the limits of 32-bit integers.
    if (!Number.isInteger(value)) {
        throw new Error(`${name} must be 'an integer' but was ${value}`);
    }
    if (value < min || value > max) {
        throw new Error(`${name} must be >= ${min} && <= ${max}. Value was ${value}`);
    }
}
export function once(callback) {
    let called = false;
    return function(...args) {
        if (called) return;
        called = true;
        callback.apply(this, args);
    };
}
/**
 * @param {number} [expectedExecutions = 1]
 * @param {number} [timeout = 1000] Milliseconds to wait before the promise is forcefully exited
*/ export function mustCall(fn = ()=>{}, expectedExecutions = 1, timeout = 1000) {
    if (expectedExecutions < 1) {
        throw new Error("Expected executions can't be lower than 1");
    }
    let timesExecuted = 0;
    const completed = deferred();
    const abort = setTimeout(()=>completed.reject(), timeout);
    function callback(...args) {
        timesExecuted++;
        if (timesExecuted === expectedExecutions) {
            completed.resolve();
        }
        fn.apply(this, args);
    }
    const result = completed.then(()=>clearTimeout(abort)).catch(()=>fail(`Async operation not completed: Expected ${expectedExecutions}, executed ${timesExecuted}`));
    return [
        result,
        callback, 
    ];
}
/** Asserts that an error thrown in a callback will not be wrongly caught. */ export async function assertCallbackErrorUncaught({ prelude , invocation , cleanup  }) {
    // Since the error has to be uncaught, and that will kill the Deno process,
    // the only way to test this is to spawn a subprocess.
    const p = Deno.run({
        cmd: [
            Deno.execPath(),
            "eval",
            "--no-check",
            "--unstable",
            `${prelude ?? ""}

      ${invocation}(err) => {
        // If the bug is present and the callback is called again with an error,
        // don't throw another error, so if the subprocess fails we know it had the correct behaviour.
        if (!err) throw new Error("success");
      });`, 
        ],
        stderr: "piped"
    });
    const status = await p.status();
    const stderr = new TextDecoder().decode(await Deno.readAll(p.stderr));
    p.close();
    p.stderr.close();
    await cleanup?.();
    assert(!status.success);
    assertStringIncludes(stderr, "Error: success");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjg2LjAvbm9kZS9fdXRpbHMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbmltcG9ydCB7IGRlZmVycmVkIH0gZnJvbSBcIi4uL2FzeW5jL21vZC50c1wiO1xuaW1wb3J0IHsgYXNzZXJ0LCBhc3NlcnRTdHJpbmdJbmNsdWRlcywgZmFpbCB9IGZyb20gXCIuLi90ZXN0aW5nL2Fzc2VydHMudHNcIjtcblxuZXhwb3J0IHR5cGUgQmluYXJ5RW5jb2RpbmdzID0gXCJiaW5hcnlcIjtcblxuZXhwb3J0IHR5cGUgVGV4dEVuY29kaW5ncyA9XG4gIHwgXCJhc2NpaVwiXG4gIHwgXCJ1dGY4XCJcbiAgfCBcInV0Zi04XCJcbiAgfCBcInV0ZjE2bGVcIlxuICB8IFwidWNzMlwiXG4gIHwgXCJ1Y3MtMlwiXG4gIHwgXCJiYXNlNjRcIlxuICB8IFwibGF0aW4xXCJcbiAgfCBcImhleFwiO1xuXG5leHBvcnQgdHlwZSBFbmNvZGluZ3MgPSBCaW5hcnlFbmNvZGluZ3MgfCBUZXh0RW5jb2RpbmdzO1xuXG5leHBvcnQgZnVuY3Rpb24gbm90SW1wbGVtZW50ZWQobXNnPzogc3RyaW5nKTogbmV2ZXIge1xuICBjb25zdCBtZXNzYWdlID0gbXNnID8gYE5vdCBpbXBsZW1lbnRlZDogJHttc2d9YCA6IFwiTm90IGltcGxlbWVudGVkXCI7XG4gIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbn1cblxuZXhwb3J0IHR5cGUgX1RleHREZWNvZGVyID0gdHlwZW9mIFRleHREZWNvZGVyLnByb3RvdHlwZTtcbmV4cG9ydCBjb25zdCBfVGV4dERlY29kZXIgPSBUZXh0RGVjb2RlcjtcblxuZXhwb3J0IHR5cGUgX1RleHRFbmNvZGVyID0gdHlwZW9mIFRleHRFbmNvZGVyLnByb3RvdHlwZTtcbmV4cG9ydCBjb25zdCBfVGV4dEVuY29kZXIgPSBUZXh0RW5jb2RlcjtcblxuLy8gQVBJIGhlbHBlcnNcblxuZXhwb3J0IHR5cGUgTWF5YmVOdWxsPFQ+ID0gVCB8IG51bGw7XG5leHBvcnQgdHlwZSBNYXliZURlZmluZWQ8VD4gPSBUIHwgdW5kZWZpbmVkO1xuZXhwb3J0IHR5cGUgTWF5YmVFbXB0eTxUPiA9IFQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgZnVuY3Rpb24gaW50b0NhbGxiYWNrQVBJPFQ+KFxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBmdW5jOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8VD4sXG4gIGNiOiBNYXliZUVtcHR5PChlcnI6IE1heWJlTnVsbDxFcnJvcj4sIHZhbHVlPzogTWF5YmVFbXB0eTxUPikgPT4gdm9pZD4sXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIC4uLmFyZ3M6IGFueVtdXG4pOiB2b2lkIHtcbiAgZnVuYyguLi5hcmdzKS50aGVuKFxuICAgICh2YWx1ZSkgPT4gY2IgJiYgY2IobnVsbCwgdmFsdWUpLFxuICAgIChlcnIpID0+IGNiICYmIGNiKGVyciksXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnRvQ2FsbGJhY2tBUElXaXRoSW50ZXJjZXB0PFQxLCBUMj4oXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIGZ1bmM6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUMT4sXG4gIGludGVyY2VwdG9yOiAodjogVDEpID0+IFQyLFxuICBjYjogTWF5YmVFbXB0eTwoZXJyOiBNYXliZU51bGw8RXJyb3I+LCB2YWx1ZT86IE1heWJlRW1wdHk8VDI+KSA9PiB2b2lkPixcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgLi4uYXJnczogYW55W11cbik6IHZvaWQge1xuICBmdW5jKC4uLmFyZ3MpLnRoZW4oXG4gICAgKHZhbHVlKSA9PiBjYiAmJiBjYihudWxsLCBpbnRlcmNlcHRvcih2YWx1ZSkpLFxuICAgIChlcnIpID0+IGNiICYmIGNiKGVyciksXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGxpY2VPbmUobGlzdDogc3RyaW5nW10sIGluZGV4OiBudW1iZXIpOiB2b2lkIHtcbiAgZm9yICg7IGluZGV4ICsgMSA8IGxpc3QubGVuZ3RoOyBpbmRleCsrKSBsaXN0W2luZGV4XSA9IGxpc3RbaW5kZXggKyAxXTtcbiAgbGlzdC5wb3AoKTtcbn1cblxuLy8gVGFrZW4gZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2Jsb2IvYmE2ODQ4MDViNmMwZWRlZDc2ZTVjZDg5ZWUwMDMyOGFjN2E1OTM2NS9saWIvaW50ZXJuYWwvdXRpbC5qcyNMMTI1XG4vLyBSZXR1cm4gdW5kZWZpbmVkIGlmIHRoZXJlIGlzIG5vIG1hdGNoLlxuLy8gTW92ZSB0aGUgXCJzbG93IGNhc2VzXCIgdG8gYSBzZXBhcmF0ZSBmdW5jdGlvbiB0byBtYWtlIHN1cmUgdGhpcyBmdW5jdGlvbiBnZXRzXG4vLyBpbmxpbmVkIHByb3Blcmx5LiBUaGF0IHByaW9yaXRpemVzIHRoZSBjb21tb24gY2FzZS5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVFbmNvZGluZyhcbiAgZW5jOiBzdHJpbmcgfCBudWxsLFxuKTogVGV4dEVuY29kaW5ncyB8IHVuZGVmaW5lZCB7XG4gIGlmIChlbmMgPT0gbnVsbCB8fCBlbmMgPT09IFwidXRmOFwiIHx8IGVuYyA9PT0gXCJ1dGYtOFwiKSByZXR1cm4gXCJ1dGY4XCI7XG4gIHJldHVybiBzbG93Q2FzZXMoZW5jKTtcbn1cblxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2Jsb2IvYmE2ODQ4MDViNmMwZWRlZDc2ZTVjZDg5ZWUwMDMyOGFjN2E1OTM2NS9saWIvaW50ZXJuYWwvdXRpbC5qcyNMMTMwXG5mdW5jdGlvbiBzbG93Q2FzZXMoZW5jOiBzdHJpbmcpOiBUZXh0RW5jb2RpbmdzIHwgdW5kZWZpbmVkIHtcbiAgc3dpdGNoIChlbmMubGVuZ3RoKSB7XG4gICAgY2FzZSA0OlxuICAgICAgaWYgKGVuYyA9PT0gXCJVVEY4XCIpIHJldHVybiBcInV0ZjhcIjtcbiAgICAgIGlmIChlbmMgPT09IFwidWNzMlwiIHx8IGVuYyA9PT0gXCJVQ1MyXCIpIHJldHVybiBcInV0ZjE2bGVcIjtcbiAgICAgIGVuYyA9IGAke2VuY31gLnRvTG93ZXJDYXNlKCk7XG4gICAgICBpZiAoZW5jID09PSBcInV0ZjhcIikgcmV0dXJuIFwidXRmOFwiO1xuICAgICAgaWYgKGVuYyA9PT0gXCJ1Y3MyXCIpIHJldHVybiBcInV0ZjE2bGVcIjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMzpcbiAgICAgIGlmIChlbmMgPT09IFwiaGV4XCIgfHwgZW5jID09PSBcIkhFWFwiIHx8IGAke2VuY31gLnRvTG93ZXJDYXNlKCkgPT09IFwiaGV4XCIpIHtcbiAgICAgICAgcmV0dXJuIFwiaGV4XCI7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlIDU6XG4gICAgICBpZiAoZW5jID09PSBcImFzY2lpXCIpIHJldHVybiBcImFzY2lpXCI7XG4gICAgICBpZiAoZW5jID09PSBcInVjcy0yXCIpIHJldHVybiBcInV0ZjE2bGVcIjtcbiAgICAgIGlmIChlbmMgPT09IFwiVVRGLThcIikgcmV0dXJuIFwidXRmOFwiO1xuICAgICAgaWYgKGVuYyA9PT0gXCJBU0NJSVwiKSByZXR1cm4gXCJhc2NpaVwiO1xuICAgICAgaWYgKGVuYyA9PT0gXCJVQ1MtMlwiKSByZXR1cm4gXCJ1dGYxNmxlXCI7XG4gICAgICBlbmMgPSBgJHtlbmN9YC50b0xvd2VyQ2FzZSgpO1xuICAgICAgaWYgKGVuYyA9PT0gXCJ1dGYtOFwiKSByZXR1cm4gXCJ1dGY4XCI7XG4gICAgICBpZiAoZW5jID09PSBcImFzY2lpXCIpIHJldHVybiBcImFzY2lpXCI7XG4gICAgICBpZiAoZW5jID09PSBcInVjcy0yXCIpIHJldHVybiBcInV0ZjE2bGVcIjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgNjpcbiAgICAgIGlmIChlbmMgPT09IFwiYmFzZTY0XCIpIHJldHVybiBcImJhc2U2NFwiO1xuICAgICAgaWYgKGVuYyA9PT0gXCJsYXRpbjFcIiB8fCBlbmMgPT09IFwiYmluYXJ5XCIpIHJldHVybiBcImxhdGluMVwiO1xuICAgICAgaWYgKGVuYyA9PT0gXCJCQVNFNjRcIikgcmV0dXJuIFwiYmFzZTY0XCI7XG4gICAgICBpZiAoZW5jID09PSBcIkxBVElOMVwiIHx8IGVuYyA9PT0gXCJCSU5BUllcIikgcmV0dXJuIFwibGF0aW4xXCI7XG4gICAgICBlbmMgPSBgJHtlbmN9YC50b0xvd2VyQ2FzZSgpO1xuICAgICAgaWYgKGVuYyA9PT0gXCJiYXNlNjRcIikgcmV0dXJuIFwiYmFzZTY0XCI7XG4gICAgICBpZiAoZW5jID09PSBcImxhdGluMVwiIHx8IGVuYyA9PT0gXCJiaW5hcnlcIikgcmV0dXJuIFwibGF0aW4xXCI7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDc6XG4gICAgICBpZiAoXG4gICAgICAgIGVuYyA9PT0gXCJ1dGYxNmxlXCIgfHxcbiAgICAgICAgZW5jID09PSBcIlVURjE2TEVcIiB8fFxuICAgICAgICBgJHtlbmN9YC50b0xvd2VyQ2FzZSgpID09PSBcInV0ZjE2bGVcIlxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBcInV0ZjE2bGVcIjtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgODpcbiAgICAgIGlmIChcbiAgICAgICAgZW5jID09PSBcInV0Zi0xNmxlXCIgfHxcbiAgICAgICAgZW5jID09PSBcIlVURi0xNkxFXCIgfHxcbiAgICAgICAgYCR7ZW5jfWAudG9Mb3dlckNhc2UoKSA9PT0gXCJ1dGYtMTZsZVwiXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIFwidXRmMTZsZVwiO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGlmIChlbmMgPT09IFwiXCIpIHJldHVybiBcInV0ZjhcIjtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVJbnRlZ2VyUmFuZ2UoXG4gIHZhbHVlOiBudW1iZXIsXG4gIG5hbWU6IHN0cmluZyxcbiAgbWluID0gLTIxNDc0ODM2NDgsXG4gIG1heCA9IDIxNDc0ODM2NDcsXG4pOiB2b2lkIHtcbiAgLy8gVGhlIGRlZmF1bHRzIGZvciBtaW4gYW5kIG1heCBjb3JyZXNwb25kIHRvIHRoZSBsaW1pdHMgb2YgMzItYml0IGludGVnZXJzLlxuICBpZiAoIU51bWJlci5pc0ludGVnZXIodmFsdWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke25hbWV9IG11c3QgYmUgJ2FuIGludGVnZXInIGJ1dCB3YXMgJHt2YWx1ZX1gKTtcbiAgfVxuXG4gIGlmICh2YWx1ZSA8IG1pbiB8fCB2YWx1ZSA+IG1heCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGAke25hbWV9IG11c3QgYmUgPj0gJHttaW59ICYmIDw9ICR7bWF4fS4gVmFsdWUgd2FzICR7dmFsdWV9YCxcbiAgICApO1xuICB9XG59XG5cbnR5cGUgT3B0aW9uYWxTcHJlYWQ8VD4gPSBUIGV4dGVuZHMgdW5kZWZpbmVkID8gW11cbiAgOiBbVF07XG5cbmV4cG9ydCBmdW5jdGlvbiBvbmNlPFQgPSB1bmRlZmluZWQ+KFxuICBjYWxsYmFjazogKC4uLmFyZ3M6IE9wdGlvbmFsU3ByZWFkPFQ+KSA9PiB2b2lkLFxuKSB7XG4gIGxldCBjYWxsZWQgPSBmYWxzZTtcbiAgcmV0dXJuIGZ1bmN0aW9uICh0aGlzOiB1bmtub3duLCAuLi5hcmdzOiBPcHRpb25hbFNwcmVhZDxUPikge1xuICAgIGlmIChjYWxsZWQpIHJldHVybjtcbiAgICBjYWxsZWQgPSB0cnVlO1xuICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7bnVtYmVyfSBbZXhwZWN0ZWRFeGVjdXRpb25zID0gMV1cbiAqIEBwYXJhbSB7bnVtYmVyfSBbdGltZW91dCA9IDEwMDBdIE1pbGxpc2Vjb25kcyB0byB3YWl0IGJlZm9yZSB0aGUgcHJvbWlzZSBpcyBmb3JjZWZ1bGx5IGV4aXRlZFxuKi9cbmV4cG9ydCBmdW5jdGlvbiBtdXN0Q2FsbDxUIGV4dGVuZHMgdW5rbm93bltdPihcbiAgZm46ICgoLi4uYXJnczogVCkgPT4gdm9pZCkgPSAoKSA9PiB7fSxcbiAgZXhwZWN0ZWRFeGVjdXRpb25zID0gMSxcbiAgdGltZW91dCA9IDEwMDAsXG4pOiBbUHJvbWlzZTx2b2lkPiwgKC4uLmFyZ3M6IFQpID0+IHZvaWRdIHtcbiAgaWYgKGV4cGVjdGVkRXhlY3V0aW9ucyA8IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBleGVjdXRpb25zIGNhbid0IGJlIGxvd2VyIHRoYW4gMVwiKTtcbiAgfVxuICBsZXQgdGltZXNFeGVjdXRlZCA9IDA7XG4gIGNvbnN0IGNvbXBsZXRlZCA9IGRlZmVycmVkKCk7XG5cbiAgY29uc3QgYWJvcnQgPSBzZXRUaW1lb3V0KCgpID0+IGNvbXBsZXRlZC5yZWplY3QoKSwgdGltZW91dCk7XG5cbiAgZnVuY3Rpb24gY2FsbGJhY2sodGhpczogdW5rbm93biwgLi4uYXJnczogVCkge1xuICAgIHRpbWVzRXhlY3V0ZWQrKztcbiAgICBpZiAodGltZXNFeGVjdXRlZCA9PT0gZXhwZWN0ZWRFeGVjdXRpb25zKSB7XG4gICAgICBjb21wbGV0ZWQucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBmbi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdCA9IGNvbXBsZXRlZFxuICAgIC50aGVuKCgpID0+IGNsZWFyVGltZW91dChhYm9ydCkpXG4gICAgLmNhdGNoKCgpID0+XG4gICAgICBmYWlsKFxuICAgICAgICBgQXN5bmMgb3BlcmF0aW9uIG5vdCBjb21wbGV0ZWQ6IEV4cGVjdGVkICR7ZXhwZWN0ZWRFeGVjdXRpb25zfSwgZXhlY3V0ZWQgJHt0aW1lc0V4ZWN1dGVkfWAsXG4gICAgICApXG4gICAgKTtcblxuICByZXR1cm4gW1xuICAgIHJlc3VsdCxcbiAgICBjYWxsYmFjayxcbiAgXTtcbn1cbi8qKiBBc3NlcnRzIHRoYXQgYW4gZXJyb3IgdGhyb3duIGluIGEgY2FsbGJhY2sgd2lsbCBub3QgYmUgd3JvbmdseSBjYXVnaHQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXNzZXJ0Q2FsbGJhY2tFcnJvclVuY2F1Z2h0KFxuICB7IHByZWx1ZGUsIGludm9jYXRpb24sIGNsZWFudXAgfToge1xuICAgIC8qKiBBbnkgY29kZSB3aGljaCBuZWVkcyB0byBydW4gYmVmb3JlIHRoZSBhY3R1YWwgaW52b2NhdGlvbiAobm90YWJseSwgYW55IGltcG9ydCBzdGF0ZW1lbnRzKS4gKi9cbiAgICBwcmVsdWRlPzogc3RyaW5nO1xuICAgIC8qKiBcbiAgICAgKiBUaGUgc3RhcnQgb2YgdGhlIGludm9jYXRpb24gb2YgdGhlIGZ1bmN0aW9uLCBlLmcuIGBvcGVuKFwiZm9vLnR4dFwiLCBgLlxuICAgICAqIFRoZSBjYWxsYmFjayB3aWxsIGJlIGFkZGVkIGFmdGVyIGl0LiBcbiAgICAgKi9cbiAgICBpbnZvY2F0aW9uOiBzdHJpbmc7XG4gICAgLyoqIENhbGxlZCBhZnRlciB0aGUgc3VicHJvY2VzcyBpcyBmaW5pc2hlZCBidXQgYmVmb3JlIHJ1bm5pbmcgdGhlIGFzc2VydGlvbnMsIGUuZy4gdG8gY2xlYW4gdXAgY3JlYXRlZCBmaWxlcy4gKi9cbiAgICBjbGVhbnVwPzogKCkgPT4gUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG4gIH0sXG4pIHtcbiAgLy8gU2luY2UgdGhlIGVycm9yIGhhcyB0byBiZSB1bmNhdWdodCwgYW5kIHRoYXQgd2lsbCBraWxsIHRoZSBEZW5vIHByb2Nlc3MsXG4gIC8vIHRoZSBvbmx5IHdheSB0byB0ZXN0IHRoaXMgaXMgdG8gc3Bhd24gYSBzdWJwcm9jZXNzLlxuICBjb25zdCBwID0gRGVuby5ydW4oe1xuICAgIGNtZDogW1xuICAgICAgRGVuby5leGVjUGF0aCgpLFxuICAgICAgXCJldmFsXCIsXG4gICAgICBcIi0tbm8tY2hlY2tcIiwgLy8gUnVubmluZyBUU0MgZm9yIGV2ZXJ5IG9uZSBvZiB0aGVzZSB0ZXN0cyB3b3VsZCB0YWtlIHdheSB0b28gbG9uZ1xuICAgICAgXCItLXVuc3RhYmxlXCIsXG4gICAgICBgJHtwcmVsdWRlID8/IFwiXCJ9XG5cbiAgICAgICR7aW52b2NhdGlvbn0oZXJyKSA9PiB7XG4gICAgICAgIC8vIElmIHRoZSBidWcgaXMgcHJlc2VudCBhbmQgdGhlIGNhbGxiYWNrIGlzIGNhbGxlZCBhZ2FpbiB3aXRoIGFuIGVycm9yLFxuICAgICAgICAvLyBkb24ndCB0aHJvdyBhbm90aGVyIGVycm9yLCBzbyBpZiB0aGUgc3VicHJvY2VzcyBmYWlscyB3ZSBrbm93IGl0IGhhZCB0aGUgY29ycmVjdCBiZWhhdmlvdXIuXG4gICAgICAgIGlmICghZXJyKSB0aHJvdyBuZXcgRXJyb3IoXCJzdWNjZXNzXCIpO1xuICAgICAgfSk7YCxcbiAgICBdLFxuICAgIHN0ZGVycjogXCJwaXBlZFwiLFxuICB9KTtcbiAgY29uc3Qgc3RhdHVzID0gYXdhaXQgcC5zdGF0dXMoKTtcbiAgY29uc3Qgc3RkZXJyID0gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKGF3YWl0IERlbm8ucmVhZEFsbChwLnN0ZGVycikpO1xuICBwLmNsb3NlKCk7XG4gIHAuc3RkZXJyLmNsb3NlKCk7XG4gIGF3YWl0IGNsZWFudXA/LigpO1xuICBhc3NlcnQoIXN0YXR1cy5zdWNjZXNzKTtcbiAgYXNzZXJ0U3RyaW5nSW5jbHVkZXMoc3RkZXJyLCBcIkVycm9yOiBzdWNjZXNzXCIpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxTQUFTLFFBQVEsUUFBUSxpQkFBaUIsQ0FBQztBQUMzQyxTQUFTLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxJQUFJLFFBQVEsdUJBQXVCLENBQUM7QUFpQjNFLE9BQU8sU0FBUyxjQUFjLENBQUMsR0FBWSxFQUFTO0lBQ2xELE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxDQUFDLGlCQUFpQixF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