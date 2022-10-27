export function isObject(obj) {
    return typeof obj === "object" && !Array.isArray(obj) && obj !== null;
}
// export function isClass(func: unknown): boolean {
//   // Class constructor is also a function
//   if (
//     !(func && (func as Record<string, unknown>).constructor === Function) ||
//     (func as Record<string, unknown>).prototype === undefined
//   ) {
//     console.log("xxx");
//     return false;
//   }
//   // This is a class that extends other class
//   if (Function.prototype !== Object.getPrototypeOf(func)) {
//     return true;
//   }
//   console.log("xx2x");
//   // Usually a function will only have 'constructor' in the prototype
//   return Object.getOwnPropertyNames((func as Record<string, unknown>).prototype)
//     .length > 1;
// }
export function isClass(v) {
    return typeof v === "function" && /^\s*class\s+/.test(v.toString());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvdXRpbHMvb2JqZWN0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBpc09iamVjdChvYmo6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIgJiZcbiAgICAhQXJyYXkuaXNBcnJheShvYmopICYmXG4gICAgb2JqICE9PSBudWxsO1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gaXNDbGFzcyhmdW5jOiB1bmtub3duKTogYm9vbGVhbiB7XG4vLyAgIC8vIENsYXNzIGNvbnN0cnVjdG9yIGlzIGFsc28gYSBmdW5jdGlvblxuLy8gICBpZiAoXG4vLyAgICAgIShmdW5jICYmIChmdW5jIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5jb25zdHJ1Y3RvciA9PT0gRnVuY3Rpb24pIHx8XG4vLyAgICAgKGZ1bmMgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLnByb3RvdHlwZSA9PT0gdW5kZWZpbmVkXG4vLyAgICkge1xuLy8gICAgIGNvbnNvbGUubG9nKFwieHh4XCIpO1xuXG4vLyAgICAgcmV0dXJuIGZhbHNlO1xuLy8gICB9XG5cbi8vICAgLy8gVGhpcyBpcyBhIGNsYXNzIHRoYXQgZXh0ZW5kcyBvdGhlciBjbGFzc1xuLy8gICBpZiAoRnVuY3Rpb24ucHJvdG90eXBlICE9PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoZnVuYykpIHtcbi8vICAgICByZXR1cm4gdHJ1ZTtcbi8vICAgfVxuLy8gICBjb25zb2xlLmxvZyhcInh4MnhcIik7XG5cbi8vICAgLy8gVXN1YWxseSBhIGZ1bmN0aW9uIHdpbGwgb25seSBoYXZlICdjb25zdHJ1Y3RvcicgaW4gdGhlIHByb3RvdHlwZVxuLy8gICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoKGZ1bmMgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLnByb3RvdHlwZSlcbi8vICAgICAubGVuZ3RoID4gMTtcbi8vIH1cbmV4cG9ydCBmdW5jdGlvbiBpc0NsYXNzKHY6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIHR5cGVvZiB2ID09PSBcImZ1bmN0aW9uXCIgJiYgL15cXHMqY2xhc3NcXHMrLy50ZXN0KHYudG9TdHJpbmcoKSk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxTQUFTLFNBQVMsR0FBWSxFQUFXO0lBQzlDLE9BQU8sT0FBTyxRQUFRLFlBQ3BCLENBQUMsTUFBTSxPQUFPLENBQUMsUUFDZixRQUFRLElBQUk7QUFDaEIsQ0FBQztBQUVELG9EQUFvRDtBQUNwRCw0Q0FBNEM7QUFDNUMsU0FBUztBQUNULCtFQUErRTtBQUMvRSxnRUFBZ0U7QUFDaEUsUUFBUTtBQUNSLDBCQUEwQjtBQUUxQixvQkFBb0I7QUFDcEIsTUFBTTtBQUVOLGdEQUFnRDtBQUNoRCw4REFBOEQ7QUFDOUQsbUJBQW1CO0FBQ25CLE1BQU07QUFDTix5QkFBeUI7QUFFekIsd0VBQXdFO0FBQ3hFLG1GQUFtRjtBQUNuRixtQkFBbUI7QUFDbkIsSUFBSTtBQUNKLE9BQU8sU0FBUyxRQUFRLENBQVUsRUFBVztJQUMzQyxPQUFPLE9BQU8sTUFBTSxjQUFjLGVBQWUsSUFBSSxDQUFDLEVBQUUsUUFBUTtBQUNsRSxDQUFDIn0=