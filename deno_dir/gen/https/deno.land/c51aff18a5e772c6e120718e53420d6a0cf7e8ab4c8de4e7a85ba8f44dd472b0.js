// deno-lint-ignore no-explicit-any
export function removeEmptyValues(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, value])=>{
        if (value === null) return false;
        if (value === undefined) return false;
        if (value === "") return false;
        return true;
    }));
}
export function difference(arrA, arrB) {
    return arrA.filter((a)=>arrB.indexOf(a) < 0);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZG90ZW52QHYzLjEuMC91dGlsLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlRW1wdHlWYWx1ZXMoXG4gIG9iajogUmVjb3JkPHN0cmluZywgYW55Pixcbik6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICByZXR1cm4gT2JqZWN0LmZyb21FbnRyaWVzKFxuICAgIE9iamVjdC5lbnRyaWVzKG9iaikuZmlsdGVyKChbLCB2YWx1ZV0pID0+IHtcbiAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSksXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmZXJlbmNlKGFyckE6IHN0cmluZ1tdLCBhcnJCOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIGFyckEuZmlsdGVyKChhKSA9PiBhcnJCLmluZGV4T2YoYSkgPCAwKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxtQ0FBbUM7QUFDbkMsT0FBTyxTQUFTLGlCQUFpQixDQUMvQixHQUF3QixFQUNIO0lBQ3JCLE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FDdkIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFLO1FBQ3hDLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxPQUFPLEtBQUssQ0FBQztRQUNqQyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsT0FBTyxLQUFLLENBQUM7UUFDdEMsSUFBSSxLQUFLLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxDQUFDO1FBQy9CLE9BQU8sSUFBSSxDQUFDO0tBQ2IsQ0FBQyxDQUNILENBQUM7Q0FDSDtBQUVELE9BQU8sU0FBUyxVQUFVLENBQUMsSUFBYyxFQUFFLElBQWMsRUFBWTtJQUNuRSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztDQUNoRCJ9