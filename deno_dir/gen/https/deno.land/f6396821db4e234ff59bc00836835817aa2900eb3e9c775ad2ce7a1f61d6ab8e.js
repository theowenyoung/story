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
    for(let i1 = 0; i1 < compressedA.length; i1++){
        if (compressedA[i1] !== compressedB[i1]) return false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2J5dGVzL2VxdWFscy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiogQ2hlY2sgd2hldGhlciBiaW5hcnkgYXJyYXlzIGFyZSBlcXVhbCB0byBlYWNoIG90aGVyIHVzaW5nIDgtYml0IGNvbXBhcmlzb25zLlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSBhIGZpcnN0IGFycmF5IHRvIGNoZWNrIGVxdWFsaXR5XG4gKiBAcGFyYW0gYiBzZWNvbmQgYXJyYXkgdG8gY2hlY2sgZXF1YWxpdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsc05haXZlKGE6IFVpbnQ4QXJyYXksIGI6IFVpbnQ4QXJyYXkpOiBib29sZWFuIHtcbiAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKiogQ2hlY2sgd2hldGhlciBiaW5hcnkgYXJyYXlzIGFyZSBlcXVhbCB0byBlYWNoIG90aGVyIHVzaW5nIDMyLWJpdCBjb21wYXJpc29ucy5cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0gYSBmaXJzdCBhcnJheSB0byBjaGVjayBlcXVhbGl0eVxuICogQHBhcmFtIGIgc2Vjb25kIGFycmF5IHRvIGNoZWNrIGVxdWFsaXR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbHNTaW1kKGE6IFVpbnQ4QXJyYXksIGI6IFVpbnQ4QXJyYXkpOiBib29sZWFuIHtcbiAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBsZW4gPSBhLmxlbmd0aDtcbiAgY29uc3QgY29tcHJlc3NhYmxlID0gTWF0aC5mbG9vcihsZW4gLyA0KTtcbiAgY29uc3QgY29tcHJlc3NlZEEgPSBuZXcgVWludDMyQXJyYXkoYS5idWZmZXIsIDAsIGNvbXByZXNzYWJsZSk7XG4gIGNvbnN0IGNvbXByZXNzZWRCID0gbmV3IFVpbnQzMkFycmF5KGIuYnVmZmVyLCAwLCBjb21wcmVzc2FibGUpO1xuICBmb3IgKGxldCBpID0gY29tcHJlc3NhYmxlICogNDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbXByZXNzZWRBLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGNvbXByZXNzZWRBW2ldICE9PSBjb21wcmVzc2VkQltpXSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKiogQ2hlY2sgd2hldGhlciBiaW5hcnkgYXJyYXlzIGFyZSBlcXVhbCB0byBlYWNoIG90aGVyLlxuICogQHBhcmFtIGEgZmlyc3QgYXJyYXkgdG8gY2hlY2sgZXF1YWxpdHlcbiAqIEBwYXJhbSBiIHNlY29uZCBhcnJheSB0byBjaGVjayBlcXVhbGl0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXF1YWxzKGE6IFVpbnQ4QXJyYXksIGI6IFVpbnQ4QXJyYXkpOiBib29sZWFuIHtcbiAgaWYgKGEubGVuZ3RoIDwgMTAwMCkgcmV0dXJuIGVxdWFsc05haXZlKGEsIGIpO1xuICByZXR1cm4gZXF1YWxzU2ltZChhLCBiKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztDQUlDLEdBQ0QsT0FBTyxTQUFTLFdBQVcsQ0FBQyxDQUFhLEVBQUUsQ0FBYSxFQUFXO0lBQ2pFLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3hDLElBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFFO1FBQ2pDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEtBQUssQ0FBQztJQUNsQyxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQ7Ozs7Q0FJQyxHQUNELE9BQU8sU0FBUyxVQUFVLENBQUMsQ0FBYSxFQUFFLENBQWEsRUFBVztJQUNoRSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLEtBQUssQ0FBQztJQUN4QyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsTUFBTSxBQUFDO0lBQ3JCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxBQUFDO0lBQ3pDLE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLFlBQVksQ0FBQyxBQUFDO0lBQy9ELE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLFlBQVksQ0FBQyxBQUFDO0lBQy9ELElBQUssSUFBSSxDQUFDLEdBQUcsWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFFO1FBQzNDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEtBQUssQ0FBQztJQUNsQyxDQUFDO0lBQ0QsSUFBSyxJQUFJLEVBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFBQyxFQUFFLENBQUU7UUFDM0MsSUFBSSxXQUFXLENBQUMsRUFBQyxDQUFDLEtBQUssV0FBVyxDQUFDLEVBQUMsQ0FBQyxFQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3RELENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRDs7O0NBR0MsR0FDRCxPQUFPLFNBQVMsTUFBTSxDQUFDLENBQWEsRUFBRSxDQUFhLEVBQVc7SUFDNUQsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLElBQUksRUFBRSxPQUFPLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUMsT0FBTyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzFCLENBQUMifQ==