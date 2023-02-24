/** Check whether binary arrays are equal to each other using 8-bit comparisons.
 * @private
 * @param a first array to check equality
 * @param b second array to check equality
 */ export function equalsNaive(a, b) {
    if (a.length !== b.length) return false;
    for(let i = 0; i < b.length; i++){
        if (a[i] !== b[i]) return false;
    }
    return true;
}
/** Check whether binary arrays are equal to each other using 32-bit comparisons.
 * @private
 * @param a first array to check equality
 * @param b second array to check equality
 */ export function equalsSimd(a, b) {
    if (a.length !== b.length) return false;
    const len = a.length;
    const compressable = Math.floor(len / 4);
    const compressedA = new Uint32Array(a.buffer, 0, compressable);
    const compressedB = new Uint32Array(b.buffer, 0, compressable);
    for(let i = compressable * 4; i < len; i++){
        if (a[i] !== b[i]) return false;
    }
    for(let i = 0; i < compressedA.length; i++){
        if (compressedA[i] !== compressedB[i]) return false;
    }
    return true;
}
/** Check whether binary arrays are equal to each other.
 * @param a first array to check equality
 * @param b second array to check equality
 */ export function equals(a, b) {
    if (a.length < 1000) return equalsNaive(a, b);
    return equalsSimd(a, b);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL2J5dGVzL2VxdWFscy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiogQ2hlY2sgd2hldGhlciBiaW5hcnkgYXJyYXlzIGFyZSBlcXVhbCB0byBlYWNoIG90aGVyIHVzaW5nIDgtYml0IGNvbXBhcmlzb25zLlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSBhIGZpcnN0IGFycmF5IHRvIGNoZWNrIGVxdWFsaXR5XG4gKiBAcGFyYW0gYiBzZWNvbmQgYXJyYXkgdG8gY2hlY2sgZXF1YWxpdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsc05haXZlKGE6IFVpbnQ4QXJyYXksIGI6IFVpbnQ4QXJyYXkpOiBib29sZWFuIHtcbiAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKiogQ2hlY2sgd2hldGhlciBiaW5hcnkgYXJyYXlzIGFyZSBlcXVhbCB0byBlYWNoIG90aGVyIHVzaW5nIDMyLWJpdCBjb21wYXJpc29ucy5cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0gYSBmaXJzdCBhcnJheSB0byBjaGVjayBlcXVhbGl0eVxuICogQHBhcmFtIGIgc2Vjb25kIGFycmF5IHRvIGNoZWNrIGVxdWFsaXR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbHNTaW1kKGE6IFVpbnQ4QXJyYXksIGI6IFVpbnQ4QXJyYXkpOiBib29sZWFuIHtcbiAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBsZW4gPSBhLmxlbmd0aDtcbiAgY29uc3QgY29tcHJlc3NhYmxlID0gTWF0aC5mbG9vcihsZW4gLyA0KTtcbiAgY29uc3QgY29tcHJlc3NlZEEgPSBuZXcgVWludDMyQXJyYXkoYS5idWZmZXIsIDAsIGNvbXByZXNzYWJsZSk7XG4gIGNvbnN0IGNvbXByZXNzZWRCID0gbmV3IFVpbnQzMkFycmF5KGIuYnVmZmVyLCAwLCBjb21wcmVzc2FibGUpO1xuICBmb3IgKGxldCBpID0gY29tcHJlc3NhYmxlICogNDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbXByZXNzZWRBLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGNvbXByZXNzZWRBW2ldICE9PSBjb21wcmVzc2VkQltpXSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKiogQ2hlY2sgd2hldGhlciBiaW5hcnkgYXJyYXlzIGFyZSBlcXVhbCB0byBlYWNoIG90aGVyLlxuICogQHBhcmFtIGEgZmlyc3QgYXJyYXkgdG8gY2hlY2sgZXF1YWxpdHlcbiAqIEBwYXJhbSBiIHNlY29uZCBhcnJheSB0byBjaGVjayBlcXVhbGl0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXF1YWxzKGE6IFVpbnQ4QXJyYXksIGI6IFVpbnQ4QXJyYXkpOiBib29sZWFuIHtcbiAgaWYgKGEubGVuZ3RoIDwgMTAwMCkgcmV0dXJuIGVxdWFsc05haXZlKGEsIGIpO1xuICByZXR1cm4gZXF1YWxzU2ltZChhLCBiKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztDQUlDLEdBQ0QsT0FBTyxTQUFTLFlBQVksQ0FBYSxFQUFFLENBQWEsRUFBVztJQUNqRSxJQUFJLEVBQUUsTUFBTSxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sS0FBSztJQUN2QyxJQUFLLElBQUksSUFBSSxHQUFHLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSztRQUNqQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLEtBQUs7SUFDakM7SUFDQSxPQUFPLElBQUk7QUFDYixDQUFDO0FBRUQ7Ozs7Q0FJQyxHQUNELE9BQU8sU0FBUyxXQUFXLENBQWEsRUFBRSxDQUFhLEVBQVc7SUFDaEUsSUFBSSxFQUFFLE1BQU0sS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEtBQUs7SUFDdkMsTUFBTSxNQUFNLEVBQUUsTUFBTTtJQUNwQixNQUFNLGVBQWUsS0FBSyxLQUFLLENBQUMsTUFBTTtJQUN0QyxNQUFNLGNBQWMsSUFBSSxZQUFZLEVBQUUsTUFBTSxFQUFFLEdBQUc7SUFDakQsTUFBTSxjQUFjLElBQUksWUFBWSxFQUFFLE1BQU0sRUFBRSxHQUFHO0lBQ2pELElBQUssSUFBSSxJQUFJLGVBQWUsR0FBRyxJQUFJLEtBQUssSUFBSztRQUMzQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLEtBQUs7SUFDakM7SUFDQSxJQUFLLElBQUksSUFBSSxHQUFHLElBQUksWUFBWSxNQUFNLEVBQUUsSUFBSztRQUMzQyxJQUFJLFdBQVcsQ0FBQyxFQUFFLEtBQUssV0FBVyxDQUFDLEVBQUUsRUFBRSxPQUFPLEtBQUs7SUFDckQ7SUFDQSxPQUFPLElBQUk7QUFDYixDQUFDO0FBRUQ7OztDQUdDLEdBQ0QsT0FBTyxTQUFTLE9BQU8sQ0FBYSxFQUFFLENBQWEsRUFBVztJQUM1RCxJQUFJLEVBQUUsTUFBTSxHQUFHLE1BQU0sT0FBTyxZQUFZLEdBQUc7SUFDM0MsT0FBTyxXQUFXLEdBQUc7QUFDdkIsQ0FBQyJ9