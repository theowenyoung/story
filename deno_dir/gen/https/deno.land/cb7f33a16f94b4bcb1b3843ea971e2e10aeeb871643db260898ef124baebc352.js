// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
//
// Adapted from Node.js. Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
const _toString = Object.prototype.toString;
const _isObjectLike = (value)=>value !== null && typeof value === "object";
const _isFunctionLike = (value)=>value !== null && typeof value === "function";
export function isAnyArrayBuffer(value) {
    return _isObjectLike(value) && (_toString.call(value) === "[object ArrayBuffer]" || _toString.call(value) === "[object SharedArrayBuffer]");
}
export function isArrayBufferView(value) {
    return ArrayBuffer.isView(value);
}
export function isArgumentsObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Arguments]";
}
export function isArrayBuffer(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object ArrayBuffer]";
}
export function isAsyncFunction(value) {
    return _isFunctionLike(value) && _toString.call(value) === "[object AsyncFunction]";
}
export function isBigInt64Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object BigInt64Array]";
}
export function isBigUint64Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object BigUint64Array]";
}
export function isBooleanObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Boolean]";
}
export function isBoxedPrimitive(value) {
    return isBooleanObject(value) || isStringObject(value) || isNumberObject(value) || isSymbolObject(value) || isBigIntObject(value);
}
export function isDataView(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object DataView]";
}
export function isDate(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Date]";
}
// isExternal: Not implemented
export function isFloat32Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Float32Array]";
}
export function isFloat64Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Float64Array]";
}
export function isGeneratorFunction(value) {
    return _isFunctionLike(value) && _toString.call(value) === "[object GeneratorFunction]";
}
export function isGeneratorObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Generator]";
}
export function isInt8Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Int8Array]";
}
export function isInt16Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Int16Array]";
}
export function isInt32Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Int32Array]";
}
export function isMap(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Map]";
}
export function isMapIterator(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Map Iterator]";
}
export function isModuleNamespaceObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Module]";
}
export function isNativeError(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Error]";
}
export function isNumberObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Number]";
}
export function isBigIntObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object BigInt]";
}
export function isPromise(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Promise]";
}
export function isRegExp(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object RegExp]";
}
export function isSet(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Set]";
}
export function isSetIterator(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Set Iterator]";
}
export function isSharedArrayBuffer(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object SharedArrayBuffer]";
}
export function isStringObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object String]";
}
export function isSymbolObject(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Symbol]";
}
// Adapted from Lodash
export function isTypedArray(value) {
    /** Used to match `toStringTag` values of typed arrays. */ const reTypedTag = /^\[object (?:Float(?:32|64)|(?:Int|Uint)(?:8|16|32)|Uint8Clamped)Array\]$/;
    return _isObjectLike(value) && reTypedTag.test(_toString.call(value));
}
export function isUint8Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Uint8Array]";
}
export function isUint8ClampedArray(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Uint8ClampedArray]";
}
export function isUint16Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Uint16Array]";
}
export function isUint32Array(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object Uint32Array]";
}
export function isWeakMap(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object WeakMap]";
}
export function isWeakSet(value) {
    return _isObjectLike(value) && _toString.call(value) === "[object WeakSet]";
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL25vZGUvX3V0aWwvX3V0aWxfdHlwZXMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vXG4vLyBBZGFwdGVkIGZyb20gTm9kZS5qcy4gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmNvbnN0IF90b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmNvbnN0IF9pc09iamVjdExpa2UgPSAodmFsdWU6IHVua25vd24pOiBib29sZWFuID0+XG4gIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIjtcblxuY29uc3QgX2lzRnVuY3Rpb25MaWtlID0gKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiA9PlxuICB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzQW55QXJyYXlCdWZmZXIodmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICBfaXNPYmplY3RMaWtlKHZhbHVlKSAmJlxuICAgIChfdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBBcnJheUJ1ZmZlcl1cIiB8fFxuICAgICAgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgU2hhcmVkQXJyYXlCdWZmZXJdXCIpXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FycmF5QnVmZmVyVmlldyh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gQXJyYXlCdWZmZXIuaXNWaWV3KHZhbHVlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQXJndW1lbnRzT2JqZWN0KHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiBfaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBfdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBBcmd1bWVudHNdXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0FycmF5QnVmZmVyKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgQXJyYXlCdWZmZXJdXCJcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQXN5bmNGdW5jdGlvbih2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gKFxuICAgIF9pc0Z1bmN0aW9uTGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgQXN5bmNGdW5jdGlvbl1cIlxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNCaWdJbnQ2NEFycmF5KHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgQmlnSW50NjRBcnJheV1cIlxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNCaWdVaW50NjRBcnJheSh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gKFxuICAgIF9pc09iamVjdExpa2UodmFsdWUpICYmIF90b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEJpZ1VpbnQ2NEFycmF5XVwiXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Jvb2xlYW5PYmplY3QodmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIF9pc09iamVjdExpa2UodmFsdWUpICYmIF90b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEJvb2xlYW5dXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0JveGVkUHJpbWl0aXZlKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgaXNCb29sZWFuT2JqZWN0KHZhbHVlKSB8fFxuICAgIGlzU3RyaW5nT2JqZWN0KHZhbHVlKSB8fFxuICAgIGlzTnVtYmVyT2JqZWN0KHZhbHVlKSB8fFxuICAgIGlzU3ltYm9sT2JqZWN0KHZhbHVlKSB8fFxuICAgIGlzQmlnSW50T2JqZWN0KHZhbHVlKVxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNEYXRhVmlldyh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgRGF0YVZpZXddXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0RhdGUodmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIF9pc09iamVjdExpa2UodmFsdWUpICYmIF90b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IERhdGVdXCI7XG59XG5cbi8vIGlzRXh0ZXJuYWw6IE5vdCBpbXBsZW1lbnRlZFxuXG5leHBvcnQgZnVuY3Rpb24gaXNGbG9hdDMyQXJyYXkodmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICBfaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBfdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBGbG9hdDMyQXJyYXldXCJcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRmxvYXQ2NEFycmF5KHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgRmxvYXQ2NEFycmF5XVwiXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0dlbmVyYXRvckZ1bmN0aW9uKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgX2lzRnVuY3Rpb25MaWtlKHZhbHVlKSAmJlxuICAgIF90b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEdlbmVyYXRvckZ1bmN0aW9uXVwiXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0dlbmVyYXRvck9iamVjdCh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgR2VuZXJhdG9yXVwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbnQ4QXJyYXkodmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIF9pc09iamVjdExpa2UodmFsdWUpICYmIF90b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEludDhBcnJheV1cIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW50MTZBcnJheSh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gKFxuICAgIF9pc09iamVjdExpa2UodmFsdWUpICYmIF90b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEludDE2QXJyYXldXCJcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW50MzJBcnJheSh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gKFxuICAgIF9pc09iamVjdExpa2UodmFsdWUpICYmIF90b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEludDMyQXJyYXldXCJcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTWFwKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiBfaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBfdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBNYXBdXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc01hcEl0ZXJhdG9yKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgTWFwIEl0ZXJhdG9yXVwiXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc01vZHVsZU5hbWVzcGFjZU9iamVjdCh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgTW9kdWxlXVwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOYXRpdmVFcnJvcih2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgRXJyb3JdXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlck9iamVjdCh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgTnVtYmVyXVwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNCaWdJbnRPYmplY3QodmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIF9pc09iamVjdExpa2UodmFsdWUpICYmIF90b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEJpZ0ludF1cIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUHJvbWlzZSh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgUHJvbWlzZV1cIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUmVnRXhwKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiBfaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBfdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBSZWdFeHBdXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1NldCh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgU2V0XVwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTZXRJdGVyYXRvcih2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gKFxuICAgIF9pc09iamVjdExpa2UodmFsdWUpICYmIF90b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IFNldCBJdGVyYXRvcl1cIlxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTaGFyZWRBcnJheUJ1ZmZlcih2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gKFxuICAgIF9pc09iamVjdExpa2UodmFsdWUpICYmXG4gICAgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgU2hhcmVkQXJyYXlCdWZmZXJdXCJcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nT2JqZWN0KHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiBfaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBfdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBTdHJpbmddXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1N5bWJvbE9iamVjdCh2YWx1ZTogdW5rbm93bik6IGJvb2xlYW4ge1xuICByZXR1cm4gX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgU3ltYm9sXVwiO1xufVxuXG4vLyBBZGFwdGVkIGZyb20gTG9kYXNoXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlZEFycmF5KHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIC8qKiBVc2VkIHRvIG1hdGNoIGB0b1N0cmluZ1RhZ2AgdmFsdWVzIG9mIHR5cGVkIGFycmF5cy4gKi9cbiAgY29uc3QgcmVUeXBlZFRhZyA9XG4gICAgL15cXFtvYmplY3QgKD86RmxvYXQoPzozMnw2NCl8KD86SW50fFVpbnQpKD86OHwxNnwzMil8VWludDhDbGFtcGVkKUFycmF5XFxdJC87XG4gIHJldHVybiBfaXNPYmplY3RMaWtlKHZhbHVlKSAmJiByZVR5cGVkVGFnLnRlc3QoX3RvU3RyaW5nLmNhbGwodmFsdWUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVWludDhBcnJheSh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFVpbnQ4QXJyYXkge1xuICByZXR1cm4gKFxuICAgIF9pc09iamVjdExpa2UodmFsdWUpICYmIF90b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IFVpbnQ4QXJyYXldXCJcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVWludDhDbGFtcGVkQXJyYXkodmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICBfaXNPYmplY3RMaWtlKHZhbHVlKSAmJlxuICAgIF90b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XVwiXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1VpbnQxNkFycmF5KHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgX2lzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgX3RvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgVWludDE2QXJyYXldXCJcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVWludDMyQXJyYXkodmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICBfaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBfdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBVaW50MzJBcnJheV1cIlxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXZWFrTWFwKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiBfaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBfdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBXZWFrTWFwXVwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXZWFrU2V0KHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiBfaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBfdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBXZWFrU2V0XVwiO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxFQUFFO0FBQ0YsNEVBQTRFO0FBQzVFLEVBQUU7QUFDRiwwRUFBMEU7QUFDMUUsZ0VBQWdFO0FBQ2hFLHNFQUFzRTtBQUN0RSxzRUFBc0U7QUFDdEUsNEVBQTRFO0FBQzVFLHFFQUFxRTtBQUNyRSx3QkFBd0I7QUFDeEIsRUFBRTtBQUNGLDBFQUEwRTtBQUMxRSx5REFBeUQ7QUFDekQsRUFBRTtBQUNGLDBFQUEwRTtBQUMxRSw2REFBNkQ7QUFDN0QsNEVBQTRFO0FBQzVFLDJFQUEyRTtBQUMzRSx3RUFBd0U7QUFDeEUsNEVBQTRFO0FBQzVFLHlDQUF5QztBQUV6QyxNQUFN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