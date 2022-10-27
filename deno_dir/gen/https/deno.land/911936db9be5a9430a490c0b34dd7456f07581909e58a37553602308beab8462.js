// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { promisify } from "./_util/_util_promisify.ts";
import { callbackify } from "./_util/_util_callbackify.ts";
import { ERR_INVALID_ARG_TYPE, ERR_OUT_OF_RANGE, errorMap } from "./_errors.ts";
import * as types from "./_util/_util_types.ts";
export { callbackify, promisify, types };
const NumberIsSafeInteger = Number.isSafeInteger;
const DEFAULT_INSPECT_OPTIONS = {
    showHidden: false,
    depth: 2,
    colors: false,
    customInspect: true,
    showProxy: false,
    maxArrayLength: 100,
    maxStringLength: Infinity,
    breakLength: 80,
    compact: 3,
    sorted: false,
    getters: false
};
inspect.defaultOptions = DEFAULT_INSPECT_OPTIONS;
inspect.custom = Symbol.for("nodejs.util.inspect.custom");
// TODO(schwarzkopfb): make it in-line with Node's implementation
// Ref: https://nodejs.org/dist/latest-v14.x/docs/api/util.html#util_util_inspect_object_options
// deno-lint-ignore no-explicit-any
export function inspect(object, ...opts) {
    // In Node.js, strings should be enclosed in single quotes.
    // TODO(uki00a): Strings in objects and arrays should also be enclosed in single quotes.
    if (typeof object === "string" && !object.includes("'")) {
        return `'${object}'`;
    }
    opts = {
        ...DEFAULT_INSPECT_OPTIONS,
        ...opts
    };
    return Deno.inspect(object, {
        depth: opts.depth,
        iterableLimit: opts.maxArrayLength,
        compact: !!opts.compact,
        sorted: !!opts.sorted,
        showProxy: !!opts.showProxy
    });
}
/** @deprecated - use `Array.isArray()` instead. */ export function isArray(value) {
    return Array.isArray(value);
}
/** @deprecated - use `typeof value === "boolean" || value instanceof Boolean` instead. */ export function isBoolean(value) {
    return typeof value === "boolean" || value instanceof Boolean;
}
/** @deprecated - use `value === null` instead. */ export function isNull(value) {
    return value === null;
}
/** @deprecated - use `value === null || value === undefined` instead. */ export function isNullOrUndefined(value) {
    return value === null || value === undefined;
}
/** @deprecated - use `typeof value === "number" || value instanceof Number` instead. */ export function isNumber(value) {
    return typeof value === "number" || value instanceof Number;
}
/** @deprecated - use `typeof value === "string" || value instanceof String` instead. */ export function isString(value) {
    return typeof value === "string" || value instanceof String;
}
/** @deprecated - use `typeof value === "symbol"` instead. */ export function isSymbol(value) {
    return typeof value === "symbol";
}
/** @deprecated - use `value === undefined` instead. */ export function isUndefined(value) {
    return value === undefined;
}
/** @deprecated - use `value !== null && typeof value === "object"` instead. */ export function isObject(value) {
    return value !== null && typeof value === "object";
}
/** @deprecated - use `e instanceof Error` instead. */ export function isError(e) {
    return e instanceof Error;
}
/** @deprecated - use `typeof value === "function"` instead. */ export function isFunction(value) {
    return typeof value === "function";
}
/** @deprecated - use `value instanceof RegExp` instead. */ export function isRegExp(value) {
    return value instanceof RegExp;
}
/** @deprecated - use `value === null || (typeof value !== "object" && typeof value !== "function")` instead. */ export function isPrimitive(value) {
    return value === null || typeof value !== "object" && typeof value !== "function";
}
/**
 * Returns a system error name from an error code number.
 * @param code error code number
 */ export function getSystemErrorName(code) {
    if (typeof code !== "number") {
        throw new ERR_INVALID_ARG_TYPE("err", "number", code);
    }
    if (code >= 0 || !NumberIsSafeInteger(code)) {
        throw new ERR_OUT_OF_RANGE("err", "a negative integer", code);
    }
    return errorMap.get(code)?.[0];
}
/**
 * https://nodejs.org/api/util.html#util_util_deprecate_fn_msg_code
 * @param _code This implementation of deprecate won't apply the deprecation code
 */ // deno-lint-ignore no-explicit-any
export function deprecate(fn, msg, _code) {
    return function(...args) {
        console.warn(msg);
        return fn.apply(undefined, args);
    };
}
function toReplace(specifier, value) {
    if (specifier === "%s") {
        if (typeof value === "string" || value instanceof String) {
            return value;
        } else return Deno.inspect(value, {
            depth: 1
        });
    }
    if (specifier === "%d") {
        if (typeof value === "bigint") {
            return value + "n";
        }
        return Number(value).toString();
    }
    if (specifier === "%i") {
        if (typeof value === "bigint") {
            return value + "n";
        }
        return parseInt(value).toString();
    }
    if (specifier === "%f") {
        return parseFloat(value).toString();
    }
    if (specifier === "%j") {
        try {
            return JSON.stringify(value);
        } catch (e) {
            // nodeJS => 'cyclic object value' , deno => 'Converting circular structure to JSON ...'
            // ref: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify>
            if (e instanceof TypeError && e.message.match(/cyclic|circular/)) {
                return "[Circular]";
            } else throw e;
        }
    }
    if (specifier === "%o") {
        return Deno.inspect(value, {
            showHidden: true,
            showProxy: true
        });
    }
    if (specifier === "%O") {
        return Deno.inspect(value);
    }
    if (specifier === "%c") {
        return "";
    }
    return "";
}
// ref: <https://nodejs.org/docs/latest-v16.x/api/console.html#console_console_log_data_args>
// ref: <https://nodejs.org/docs/latest-v16.x/api/util.html#util_util_format_format_args>
// modified from <https://deno.land/std@0.105.0/node/util.ts#L247-L266>
export function format(...args) {
    const replacement = [];
    const formatSpecifierRx = /%(s|d|i|f|j|o|O|c|%)/g;
    const hasFormatTemplate = args.length > 0 && (typeof args[0] === "string" || args[0] instanceof String);
    const formatTemplate = hasFormatTemplate ? args[0] : "";
    let i = hasFormatTemplate ? 1 : 0;
    let arr = null;
    let done = false;
    while((arr = formatSpecifierRx.exec(formatTemplate)) !== null && !done){
        if (arr[0] === "%%") {
            replacement.push([
                arr["index"],
                "%"
            ]);
        } else if (i < args.length) {
            replacement.push([
                arr["index"],
                toReplace(arr[0], args[i])
            ]);
            i++;
        } else done = true;
    }
    const lastArgUsed = i;
    let result = "";
    let last = 0;
    for(let i1 = 0; i1 < replacement.length; i1++){
        const item = replacement[i1];
        result += formatTemplate.slice(last, item[0]);
        result += item[1];
        last = item[0] + 2;
    }
    result += formatTemplate.slice(last);
    for(let i2 = lastArgUsed; i2 < args.length; i2++){
        if (i2 > 0) result += " ";
        if (typeof args[i2] === "string") {
            result += args[i2];
        } else result += Deno.inspect(args[i2], {
            colors: true
        });
    }
    return result;
}
/**
 * https://nodejs.org/api/util.html#util_util_inherits_constructor_superconstructor
 * @param ctor Constructor function which needs to inherit the prototype.
 * @param superCtor Constructor function to inherit prototype from.
 */ export function inherits(ctor, superCtor) {
    if (ctor === undefined || ctor === null) {
        throw new ERR_INVALID_ARG_TYPE("ctor", "Function", ctor);
    }
    if (superCtor === undefined || superCtor === null) {
        throw new ERR_INVALID_ARG_TYPE("superCtor", "Function", superCtor);
    }
    if (superCtor.prototype === undefined) {
        throw new ERR_INVALID_ARG_TYPE("superCtor.prototype", "Object", superCtor.prototype);
    }
    Object.defineProperty(ctor, "super_", {
        value: superCtor,
        writable: true,
        configurable: true
    });
    Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
}
import { _TextDecoder, _TextEncoder } from "./_utils.ts";
export const TextDecoder = _TextDecoder;
export const TextEncoder = _TextEncoder;
export default {
    format,
    inspect,
    isArray,
    isBoolean,
    isNull,
    isNullOrUndefined,
    isNumber,
    isString,
    isSymbol,
    isUndefined,
    isObject,
    isError,
    isFunction,
    isRegExp,
    isPrimitive,
    getSystemErrorName,
    deprecate,
    callbackify,
    promisify,
    inherits,
    types,
    TextDecoder,
    TextEncoder
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL25vZGUvdXRpbC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIxIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSBcIi4vX3V0aWwvX3V0aWxfcHJvbWlzaWZ5LnRzXCI7XG5pbXBvcnQgeyBjYWxsYmFja2lmeSB9IGZyb20gXCIuL191dGlsL191dGlsX2NhbGxiYWNraWZ5LnRzXCI7XG5pbXBvcnQgeyBFUlJfSU5WQUxJRF9BUkdfVFlQRSwgRVJSX09VVF9PRl9SQU5HRSwgZXJyb3JNYXAgfSBmcm9tIFwiLi9fZXJyb3JzLnRzXCI7XG5pbXBvcnQgKiBhcyB0eXBlcyBmcm9tIFwiLi9fdXRpbC9fdXRpbF90eXBlcy50c1wiO1xuZXhwb3J0IHsgY2FsbGJhY2tpZnksIHByb21pc2lmeSwgdHlwZXMgfTtcblxuY29uc3QgTnVtYmVySXNTYWZlSW50ZWdlciA9IE51bWJlci5pc1NhZmVJbnRlZ2VyO1xuXG5jb25zdCBERUZBVUxUX0lOU1BFQ1RfT1BUSU9OUyA9IHtcbiAgc2hvd0hpZGRlbjogZmFsc2UsXG4gIGRlcHRoOiAyLFxuICBjb2xvcnM6IGZhbHNlLFxuICBjdXN0b21JbnNwZWN0OiB0cnVlLFxuICBzaG93UHJveHk6IGZhbHNlLFxuICBtYXhBcnJheUxlbmd0aDogMTAwLFxuICBtYXhTdHJpbmdMZW5ndGg6IEluZmluaXR5LFxuICBicmVha0xlbmd0aDogODAsXG4gIGNvbXBhY3Q6IDMsXG4gIHNvcnRlZDogZmFsc2UsXG4gIGdldHRlcnM6IGZhbHNlLFxufTtcblxuaW5zcGVjdC5kZWZhdWx0T3B0aW9ucyA9IERFRkFVTFRfSU5TUEVDVF9PUFRJT05TO1xuaW5zcGVjdC5jdXN0b20gPSBTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIik7XG5cbi8vIFRPRE8oc2Nod2FyemtvcGZiKTogbWFrZSBpdCBpbi1saW5lIHdpdGggTm9kZSdzIGltcGxlbWVudGF0aW9uXG4vLyBSZWY6IGh0dHBzOi8vbm9kZWpzLm9yZy9kaXN0L2xhdGVzdC12MTQueC9kb2NzL2FwaS91dGlsLmh0bWwjdXRpbF91dGlsX2luc3BlY3Rfb2JqZWN0X29wdGlvbnNcbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5leHBvcnQgZnVuY3Rpb24gaW5zcGVjdChvYmplY3Q6IHVua25vd24sIC4uLm9wdHM6IGFueSk6IHN0cmluZyB7XG4gIC8vIEluIE5vZGUuanMsIHN0cmluZ3Mgc2hvdWxkIGJlIGVuY2xvc2VkIGluIHNpbmdsZSBxdW90ZXMuXG4gIC8vIFRPRE8odWtpMDBhKTogU3RyaW5ncyBpbiBvYmplY3RzIGFuZCBhcnJheXMgc2hvdWxkIGFsc28gYmUgZW5jbG9zZWQgaW4gc2luZ2xlIHF1b3Rlcy5cbiAgaWYgKHR5cGVvZiBvYmplY3QgPT09IFwic3RyaW5nXCIgJiYgIW9iamVjdC5pbmNsdWRlcyhcIidcIikpIHtcbiAgICByZXR1cm4gYCcke29iamVjdH0nYDtcbiAgfVxuICBvcHRzID0geyAuLi5ERUZBVUxUX0lOU1BFQ1RfT1BUSU9OUywgLi4ub3B0cyB9O1xuICByZXR1cm4gRGVuby5pbnNwZWN0KG9iamVjdCwge1xuICAgIGRlcHRoOiBvcHRzLmRlcHRoLFxuICAgIGl0ZXJhYmxlTGltaXQ6IG9wdHMubWF4QXJyYXlMZW5ndGgsXG4gICAgY29tcGFjdDogISFvcHRzLmNvbXBhY3QsXG4gICAgc29ydGVkOiAhIW9wdHMuc29ydGVkLFxuICAgIHNob3dQcm94eTogISFvcHRzLnNob3dQcm94eSxcbiAgfSk7XG59XG5cbi8qKiBAZGVwcmVjYXRlZCAtIHVzZSBgQXJyYXkuaXNBcnJheSgpYCBpbnN0ZWFkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQXJyYXkodmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgLSB1c2UgYHR5cGVvZiB2YWx1ZSA9PT0gXCJib29sZWFuXCIgfHwgdmFsdWUgaW5zdGFuY2VvZiBCb29sZWFuYCBpbnN0ZWFkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQm9vbGVhbih2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcImJvb2xlYW5cIiB8fCB2YWx1ZSBpbnN0YW5jZW9mIEJvb2xlYW47XG59XG5cbi8qKiBAZGVwcmVjYXRlZCAtIHVzZSBgdmFsdWUgPT09IG51bGxgIGluc3RlYWQuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdWxsKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiB2YWx1ZSA9PT0gbnVsbDtcbn1cblxuLyoqIEBkZXByZWNhdGVkIC0gdXNlIGB2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkYCBpbnN0ZWFkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiB2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgLSB1c2UgYHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiB8fCB2YWx1ZSBpbnN0YW5jZW9mIE51bWJlcmAgaW5zdGVhZC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlcih2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiIHx8IHZhbHVlIGluc3RhbmNlb2YgTnVtYmVyO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgLSB1c2UgYHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiB8fCB2YWx1ZSBpbnN0YW5jZW9mIFN0cmluZ2AgaW5zdGVhZC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZyh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiIHx8IHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgLSB1c2UgYHR5cGVvZiB2YWx1ZSA9PT0gXCJzeW1ib2xcImAgaW5zdGVhZC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N5bWJvbCh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN5bWJvbFwiO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgLSB1c2UgYHZhbHVlID09PSB1bmRlZmluZWRgIGluc3RlYWQuICovXG5leHBvcnQgZnVuY3Rpb24gaXNVbmRlZmluZWQodmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIHZhbHVlID09PSB1bmRlZmluZWQ7XG59XG5cbi8qKiBAZGVwcmVjYXRlZCAtIHVzZSBgdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiYCBpbnN0ZWFkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCI7XG59XG5cbi8qKiBAZGVwcmVjYXRlZCAtIHVzZSBgZSBpbnN0YW5jZW9mIEVycm9yYCBpbnN0ZWFkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRXJyb3IoZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gZSBpbnN0YW5jZW9mIEVycm9yO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgLSB1c2UgYHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiYCBpbnN0ZWFkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgLSB1c2UgYHZhbHVlIGluc3RhbmNlb2YgUmVnRXhwYCBpbnN0ZWFkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVnRXhwKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cDtcbn1cblxuLyoqIEBkZXByZWNhdGVkIC0gdXNlIGB2YWx1ZSA9PT0gbnVsbCB8fCAodHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKWAgaW5zdGVhZC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByaW1pdGl2ZSh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gKFxuICAgIHZhbHVlID09PSBudWxsIHx8ICh0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpXG4gICk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIHN5c3RlbSBlcnJvciBuYW1lIGZyb20gYW4gZXJyb3IgY29kZSBudW1iZXIuXG4gKiBAcGFyYW0gY29kZSBlcnJvciBjb2RlIG51bWJlclxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3lzdGVtRXJyb3JOYW1lKGNvZGU6IG51bWJlcik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICh0eXBlb2YgY29kZSAhPT0gXCJudW1iZXJcIikge1xuICAgIHRocm93IG5ldyBFUlJfSU5WQUxJRF9BUkdfVFlQRShcImVyclwiLCBcIm51bWJlclwiLCBjb2RlKTtcbiAgfVxuICBpZiAoY29kZSA+PSAwIHx8ICFOdW1iZXJJc1NhZmVJbnRlZ2VyKGNvZGUpKSB7XG4gICAgdGhyb3cgbmV3IEVSUl9PVVRfT0ZfUkFOR0UoXCJlcnJcIiwgXCJhIG5lZ2F0aXZlIGludGVnZXJcIiwgY29kZSk7XG4gIH1cbiAgcmV0dXJuIGVycm9yTWFwLmdldChjb2RlKT8uWzBdO1xufVxuXG4vKipcbiAqIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvdXRpbC5odG1sI3V0aWxfdXRpbF9kZXByZWNhdGVfZm5fbXNnX2NvZGVcbiAqIEBwYXJhbSBfY29kZSBUaGlzIGltcGxlbWVudGF0aW9uIG9mIGRlcHJlY2F0ZSB3b24ndCBhcHBseSB0aGUgZGVwcmVjYXRpb24gY29kZVxuICovXG4vLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuZXhwb3J0IGZ1bmN0aW9uIGRlcHJlY2F0ZTxUIGV4dGVuZHMgKC4uLmFyZ3M6IGFueSkgPT4gYW55PihcbiAgZm46IFQsXG4gIG1zZzogc3RyaW5nLFxuICBfY29kZT86IHN0cmluZyxcbik6ICguLi5hcmdzOiBQYXJhbWV0ZXJzPFQ+KSA9PiBSZXR1cm5UeXBlPFQ+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgY29uc29sZS53YXJuKG1zZyk7XG4gICAgcmV0dXJuIGZuLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRvUmVwbGFjZShzcGVjaWZpZXI6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiBzdHJpbmcge1xuICBpZiAoc3BlY2lmaWVyID09PSBcIiVzXCIpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiIHx8IHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nKSB7XG4gICAgICByZXR1cm4gdmFsdWUgYXMgc3RyaW5nO1xuICAgIH0gZWxzZSByZXR1cm4gRGVuby5pbnNwZWN0KHZhbHVlLCB7IGRlcHRoOiAxIH0pO1xuICB9XG4gIGlmIChzcGVjaWZpZXIgPT09IFwiJWRcIikge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiYmlnaW50XCIpIHtcbiAgICAgIHJldHVybiB2YWx1ZSArIFwiblwiO1xuICAgIH1cbiAgICByZXR1cm4gTnVtYmVyKHZhbHVlKS50b1N0cmluZygpO1xuICB9XG4gIGlmIChzcGVjaWZpZXIgPT09IFwiJWlcIikge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiYmlnaW50XCIpIHtcbiAgICAgIHJldHVybiB2YWx1ZSArIFwiblwiO1xuICAgIH1cbiAgICByZXR1cm4gcGFyc2VJbnQodmFsdWUgYXMgc3RyaW5nKS50b1N0cmluZygpO1xuICB9XG4gIGlmIChzcGVjaWZpZXIgPT09IFwiJWZcIikge1xuICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbHVlIGFzIHN0cmluZykudG9TdHJpbmcoKTtcbiAgfVxuICBpZiAoc3BlY2lmaWVyID09PSBcIiVqXCIpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBub2RlSlMgPT4gJ2N5Y2xpYyBvYmplY3QgdmFsdWUnICwgZGVubyA9PiAnQ29udmVydGluZyBjaXJjdWxhciBzdHJ1Y3R1cmUgdG8gSlNPTiAuLi4nXG4gICAgICAvLyByZWY6IDxodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9KU09OL3N0cmluZ2lmeT5cbiAgICAgIGlmIChlIGluc3RhbmNlb2YgVHlwZUVycm9yICYmIGUubWVzc2FnZS5tYXRjaCgvY3ljbGljfGNpcmN1bGFyLykpIHtcbiAgICAgICAgcmV0dXJuIFwiW0NpcmN1bGFyXVwiO1xuICAgICAgfSBlbHNlIHRocm93IGU7XG4gICAgfVxuICB9XG4gIGlmIChzcGVjaWZpZXIgPT09IFwiJW9cIikge1xuICAgIHJldHVybiBEZW5vLmluc3BlY3QodmFsdWUsIHsgc2hvd0hpZGRlbjogdHJ1ZSwgc2hvd1Byb3h5OiB0cnVlIH0pO1xuICB9XG4gIGlmIChzcGVjaWZpZXIgPT09IFwiJU9cIikge1xuICAgIHJldHVybiBEZW5vLmluc3BlY3QodmFsdWUpO1xuICB9XG4gIGlmIChzcGVjaWZpZXIgPT09IFwiJWNcIikge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG4gIHJldHVybiBcIlwiO1xufVxuXG4vLyByZWY6IDxodHRwczovL25vZGVqcy5vcmcvZG9jcy9sYXRlc3QtdjE2LngvYXBpL2NvbnNvbGUuaHRtbCNjb25zb2xlX2NvbnNvbGVfbG9nX2RhdGFfYXJncz5cbi8vIHJlZjogPGh0dHBzOi8vbm9kZWpzLm9yZy9kb2NzL2xhdGVzdC12MTYueC9hcGkvdXRpbC5odG1sI3V0aWxfdXRpbF9mb3JtYXRfZm9ybWF0X2FyZ3M+XG4vLyBtb2RpZmllZCBmcm9tIDxodHRwczovL2Rlbm8ubGFuZC9zdGRAMC4xMDUuMC9ub2RlL3V0aWwudHMjTDI0Ny1MMjY2PlxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdCguLi5hcmdzOiB1bmtub3duW10pIHtcbiAgY29uc3QgcmVwbGFjZW1lbnQ6IFtudW1iZXIsIHN0cmluZ11bXSA9IFtdO1xuICBjb25zdCBmb3JtYXRTcGVjaWZpZXJSeCA9IC8lKHN8ZHxpfGZ8anxvfE98Y3wlKS9nO1xuICBjb25zdCBoYXNGb3JtYXRUZW1wbGF0ZSA9IGFyZ3MubGVuZ3RoID4gMCAmJlxuICAgICh0eXBlb2YgYXJnc1swXSA9PT0gXCJzdHJpbmdcIiB8fCBhcmdzWzBdIGluc3RhbmNlb2YgU3RyaW5nKTtcbiAgY29uc3QgZm9ybWF0VGVtcGxhdGUgPSBoYXNGb3JtYXRUZW1wbGF0ZSA/IChhcmdzWzBdIGFzIHN0cmluZykgOiBcIlwiO1xuICBsZXQgaSA9IGhhc0Zvcm1hdFRlbXBsYXRlID8gMSA6IDA7XG4gIGxldCBhcnI6IFJlZ0V4cEV4ZWNBcnJheSB8IG51bGwgPSBudWxsO1xuICBsZXQgZG9uZSA9IGZhbHNlO1xuICB3aGlsZSAoKGFyciA9IGZvcm1hdFNwZWNpZmllclJ4LmV4ZWMoZm9ybWF0VGVtcGxhdGUpKSAhPT0gbnVsbCAmJiAhZG9uZSkge1xuICAgIGlmIChhcnJbMF0gPT09IFwiJSVcIikge1xuICAgICAgcmVwbGFjZW1lbnQucHVzaChbYXJyW1wiaW5kZXhcIl0sIFwiJVwiXSk7XG4gICAgfSBlbHNlIGlmIChpIDwgYXJncy5sZW5ndGgpIHtcbiAgICAgIHJlcGxhY2VtZW50LnB1c2goW2FycltcImluZGV4XCJdLCB0b1JlcGxhY2UoYXJyWzBdLCBhcmdzW2ldKV0pO1xuICAgICAgaSsrO1xuICAgIH0gZWxzZSBkb25lID0gdHJ1ZTtcbiAgfVxuICBjb25zdCBsYXN0QXJnVXNlZCA9IGk7XG4gIGxldCByZXN1bHQgPSBcIlwiO1xuICBsZXQgbGFzdCA9IDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcmVwbGFjZW1lbnQubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBpdGVtID0gcmVwbGFjZW1lbnRbaV07XG4gICAgcmVzdWx0ICs9IGZvcm1hdFRlbXBsYXRlLnNsaWNlKGxhc3QsIGl0ZW1bMF0pO1xuICAgIHJlc3VsdCArPSBpdGVtWzFdO1xuICAgIGxhc3QgPSBpdGVtWzBdICsgMjtcbiAgfVxuICByZXN1bHQgKz0gZm9ybWF0VGVtcGxhdGUuc2xpY2UobGFzdCk7XG4gIGZvciAobGV0IGkgPSBsYXN0QXJnVXNlZDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoaSA+IDApIHJlc3VsdCArPSBcIiBcIjtcbiAgICBpZiAodHlwZW9mIGFyZ3NbaV0gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHJlc3VsdCArPSBhcmdzW2ldO1xuICAgIH0gZWxzZSByZXN1bHQgKz0gRGVuby5pbnNwZWN0KGFyZ3NbaV0sIHsgY29sb3JzOiB0cnVlIH0pO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG4vKipcbiAqIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvdXRpbC5odG1sI3V0aWxfdXRpbF9pbmhlcml0c19jb25zdHJ1Y3Rvcl9zdXBlcmNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZSBwcm90b3R5cGUuXG4gKiBAcGFyYW0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmhlcml0czxULCBVPihcbiAgY3RvcjogbmV3ICguLi5hcmdzOiB1bmtub3duW10pID0+IFQsXG4gIHN1cGVyQ3RvcjogbmV3ICguLi5hcmdzOiB1bmtub3duW10pID0+IFUsXG4pIHtcbiAgaWYgKGN0b3IgPT09IHVuZGVmaW5lZCB8fCBjdG9yID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVSUl9JTlZBTElEX0FSR19UWVBFKFwiY3RvclwiLCBcIkZ1bmN0aW9uXCIsIGN0b3IpO1xuICB9XG5cbiAgaWYgKHN1cGVyQ3RvciA9PT0gdW5kZWZpbmVkIHx8IHN1cGVyQ3RvciA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFUlJfSU5WQUxJRF9BUkdfVFlQRShcInN1cGVyQ3RvclwiLCBcIkZ1bmN0aW9uXCIsIHN1cGVyQ3Rvcik7XG4gIH1cblxuICBpZiAoc3VwZXJDdG9yLnByb3RvdHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVSUl9JTlZBTElEX0FSR19UWVBFKFxuICAgICAgXCJzdXBlckN0b3IucHJvdG90eXBlXCIsXG4gICAgICBcIk9iamVjdFwiLFxuICAgICAgc3VwZXJDdG9yLnByb3RvdHlwZSxcbiAgICApO1xuICB9XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjdG9yLCBcInN1cGVyX1wiLCB7XG4gICAgdmFsdWU6IHN1cGVyQ3RvcixcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gIH0pO1xuICBPYmplY3Quc2V0UHJvdG90eXBlT2YoY3Rvci5wcm90b3R5cGUsIHN1cGVyQ3Rvci5wcm90b3R5cGUpO1xufVxuXG5pbXBvcnQgeyBfVGV4dERlY29kZXIsIF9UZXh0RW5jb2RlciB9IGZyb20gXCIuL191dGlscy50c1wiO1xuXG4vKiogVGhlIGdsb2JhbCBUZXh0RGVjb2RlciAqL1xuZXhwb3J0IHR5cGUgVGV4dERlY29kZXIgPSBpbXBvcnQoXCIuL191dGlscy50c1wiKS5fVGV4dERlY29kZXI7XG5leHBvcnQgY29uc3QgVGV4dERlY29kZXIgPSBfVGV4dERlY29kZXI7XG5cbi8qKiBUaGUgZ2xvYmFsIFRleHRFbmNvZGVyICovXG5leHBvcnQgdHlwZSBUZXh0RW5jb2RlciA9IGltcG9ydChcIi4vX3V0aWxzLnRzXCIpLl9UZXh0RW5jb2RlcjtcbmV4cG9ydCBjb25zdCBUZXh0RW5jb2RlciA9IF9UZXh0RW5jb2RlcjtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBmb3JtYXQsXG4gIGluc3BlY3QsXG4gIGlzQXJyYXksXG4gIGlzQm9vbGVhbixcbiAgaXNOdWxsLFxuICBpc051bGxPclVuZGVmaW5lZCxcbiAgaXNOdW1iZXIsXG4gIGlzU3RyaW5nLFxuICBpc1N5bWJvbCxcbiAgaXNVbmRlZmluZWQsXG4gIGlzT2JqZWN0LFxuICBpc0Vycm9yLFxuICBpc0Z1bmN0aW9uLFxuICBpc1JlZ0V4cCxcbiAgaXNQcmltaXRpdmUsXG4gIGdldFN5c3RlbUVycm9yTmFtZSxcbiAgZGVwcmVjYXRlLFxuICBjYWxsYmFja2lmeSxcbiAgcHJvbWlzaWZ5LFxuICBpbmhlcml0cyxcbiAgdHlwZXMsXG4gIFRleHREZWNvZGVyLFxuICBUZXh0RW5jb2Rlcixcbn07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLFNBQVMsU0FBUyxRQUFRLDZCQUE2QjtBQUN2RCxTQUFTLFdBQVcsUUFBUSwrQkFBK0I7QUFDM0QsU0FBUyxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLFFBQVEsZUFBZTtBQUNoRixZQUFZLFdBQVcseUJBQXlCO0FBQ2hELFNBQVMsV0FBVyxFQUFFLFNBQVMsRUFBRSxLQUFLLEdBQUc7QUFFekMsTUFBTSxzQkFBc0IsT0FBTyxhQUFhO0FBRWhELE1BQU0sMEJBQTBCO0lBQzlCLFlBQVksS0FBSztJQUNqQixPQUFPO0lBQ1AsUUFBUSxLQUFLO0lBQ2IsZUFBZSxJQUFJO0lBQ25CLFdBQVcsS0FBSztJQUNoQixnQkFBZ0I7SUFDaEIsaUJBQWlCO0lBQ2pCLGFBQWE7SUFDYixTQUFT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