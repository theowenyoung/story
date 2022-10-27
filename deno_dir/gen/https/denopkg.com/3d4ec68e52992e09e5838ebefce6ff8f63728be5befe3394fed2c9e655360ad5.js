import * as base64 from "https://deno.land/x/base64@v0.2.1/mod.ts";
import * as base64url from "https://deno.land/x/base64@v0.2.1/base64url.ts";
const decoder = new TextDecoder();
const encoder = new TextEncoder();
/** Serializes a Uint8Array to a hexadecimal string. */ function toHexString(buf) {
    return buf.reduce((hex, byte)=>`${hex}${byte < 16 ? "0" : ""}${byte.toString(16)}`, "");
}
/** Deserializes a Uint8Array from a hexadecimal string. */ function fromHexString(hex) {
    const len = hex.length;
    if (len % 2 || !/^[0-9a-fA-F]+$/.test(hex)) {
        throw new TypeError("Invalid hex string.");
    }
    hex = hex.toLowerCase();
    const buf = new Uint8Array(Math.floor(len / 2));
    const end = len / 2;
    for(let i = 0; i < end; ++i){
        buf[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return buf;
}
/** Decodes a Uint8Array to utf8-, base64-, or hex-encoded string. */ export function decode(buf, encoding = "utf8") {
    if (/^utf-?8$/i.test(encoding)) {
        return decoder.decode(buf);
    } else if (/^base64$/i.test(encoding)) {
        return base64.fromUint8Array(buf);
    } else if (/^base64url$/i.test(encoding)) {
        return base64url.fromUint8Array(buf);
    } else if (/^hex(?:adecimal)?$/i.test(encoding)) {
        return toHexString(buf);
    } else {
        throw new TypeError("Unsupported string encoding.");
    }
}
export function encode(str, encoding = "utf8") {
    if (/^utf-?8$/i.test(encoding)) {
        return encoder.encode(str);
    } else if (/^base64(?:url)?$/i.test(encoding)) {
        return base64.toUint8Array(str);
    } else if (/^hex(?:adecimal)?$/i.test(encoding)) {
        return fromHexString(str);
    } else {
        throw new TypeError("Unsupported string encoding.");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVub3BrZy5jb20vY2hpZWZiaWlrby9zdGQtZW5jb2RpbmdAdjEuMS4xL21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBiYXNlNjQgZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3gvYmFzZTY0QHYwLjIuMS9tb2QudHNcIjtcbmltcG9ydCAqIGFzIGJhc2U2NHVybCBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQveC9iYXNlNjRAdjAuMi4xL2Jhc2U2NHVybC50c1wiO1xuXG5jb25zdCBkZWNvZGVyOiBUZXh0RGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcigpO1xuY29uc3QgZW5jb2RlcjogVGV4dEVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcblxuLyoqIFNlcmlhbGl6ZXMgYSBVaW50OEFycmF5IHRvIGEgaGV4YWRlY2ltYWwgc3RyaW5nLiAqL1xuZnVuY3Rpb24gdG9IZXhTdHJpbmcoYnVmOiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgcmV0dXJuIGJ1Zi5yZWR1Y2UoXG4gICAgKGhleDogc3RyaW5nLCBieXRlOiBudW1iZXIpOiBzdHJpbmcgPT5cbiAgICAgIGAke2hleH0ke2J5dGUgPCAxNiA/IFwiMFwiIDogXCJcIn0ke2J5dGUudG9TdHJpbmcoMTYpfWAsXG4gICAgXCJcIixcbiAgKTtcbn1cblxuLyoqIERlc2VyaWFsaXplcyBhIFVpbnQ4QXJyYXkgZnJvbSBhIGhleGFkZWNpbWFsIHN0cmluZy4gKi9cbmZ1bmN0aW9uIGZyb21IZXhTdHJpbmcoaGV4OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgY29uc3QgbGVuOiBudW1iZXIgPSBoZXgubGVuZ3RoO1xuICBpZiAobGVuICUgMiB8fCAhL15bMC05YS1mQS1GXSskLy50ZXN0KGhleCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBoZXggc3RyaW5nLlwiKTtcbiAgfVxuICBoZXggPSBoZXgudG9Mb3dlckNhc2UoKTtcbiAgY29uc3QgYnVmOiBVaW50OEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoTWF0aC5mbG9vcihsZW4gLyAyKSk7XG4gIGNvbnN0IGVuZDogbnVtYmVyID0gbGVuIC8gMjtcbiAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IGVuZDsgKytpKSB7XG4gICAgYnVmW2ldID0gcGFyc2VJbnQoaGV4LnN1YnN0cihpICogMiwgMiksIDE2KTtcbiAgfVxuICByZXR1cm4gYnVmO1xufVxuXG4vKiogRGVjb2RlcyBhIFVpbnQ4QXJyYXkgdG8gdXRmOC0sIGJhc2U2NC0sIG9yIGhleC1lbmNvZGVkIHN0cmluZy4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGUoYnVmOiBVaW50OEFycmF5LCBlbmNvZGluZzogc3RyaW5nID0gXCJ1dGY4XCIpOiBzdHJpbmcge1xuICBpZiAoL151dGYtPzgkL2kudGVzdChlbmNvZGluZykpIHtcbiAgICByZXR1cm4gZGVjb2Rlci5kZWNvZGUoYnVmKTtcbiAgfSBlbHNlIGlmICgvXmJhc2U2NCQvaS50ZXN0KGVuY29kaW5nKSkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbVVpbnQ4QXJyYXkoYnVmKTtcbiAgfSBlbHNlIGlmICgvXmJhc2U2NHVybCQvaS50ZXN0KGVuY29kaW5nKSkge1xuICAgIHJldHVybiBiYXNlNjR1cmwuZnJvbVVpbnQ4QXJyYXkoYnVmKTtcbiAgfSBlbHNlIGlmICgvXmhleCg/OmFkZWNpbWFsKT8kL2kudGVzdChlbmNvZGluZykpIHtcbiAgICByZXR1cm4gdG9IZXhTdHJpbmcoYnVmKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiVW5zdXBwb3J0ZWQgc3RyaW5nIGVuY29kaW5nLlwiKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlKHN0cjogc3RyaW5nLCBlbmNvZGluZzogc3RyaW5nID0gXCJ1dGY4XCIpOiBVaW50OEFycmF5IHtcbiAgaWYgKC9edXRmLT84JC9pLnRlc3QoZW5jb2RpbmcpKSB7XG4gICAgcmV0dXJuIGVuY29kZXIuZW5jb2RlKHN0cik7XG4gIH0gZWxzZSBpZiAoL15iYXNlNjQoPzp1cmwpPyQvaS50ZXN0KGVuY29kaW5nKSkge1xuICAgIHJldHVybiBiYXNlNjQudG9VaW50OEFycmF5KHN0cik7XG4gIH0gZWxzZSBpZiAoL15oZXgoPzphZGVjaW1hbCk/JC9pLnRlc3QoZW5jb2RpbmcpKSB7XG4gICAgcmV0dXJuIGZyb21IZXhTdHJpbmcoc3RyKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiVW5zdXBwb3J0ZWQgc3RyaW5nIGVuY29kaW5nLlwiKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksWUFBWSwyQ0FBMkM7QUFDbkUsWUFBWSxlQUFlLGlEQUFpRDtBQUU1RSxNQUFNLFVBQXVCLElBQUk7QUFDakMsTUFBTSxVQUF1QixJQUFJO0FBRWpDLHFEQUFxRCxHQUNyRCxTQUFTLFlBQVksR0FBZSxFQUFVO0lBQzVDLE9BQU8sSUFBSSxNQUFNLENBQ2YsQ0FBQyxLQUFhLE9BQ1osQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFDckQ7QUFFSjtBQUVBLHlEQUF5RCxHQUN6RCxTQUFTLGNBQWMsR0FBVyxFQUFjO0lBQzlDLE1BQU0sTUFBYyxJQUFJLE1BQU07SUFDOUIsSUFBSSxNQUFNLEtBQUssQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLE1BQU07UUFDMUMsTUFBTSxJQUFJLFVBQVUsdUJBQXVCO0lBQzdDLENBQUM7SUFDRCxNQUFNLElBQUksV0FBVztJQUNyQixNQUFNLE1BQWtCLElBQUksV0FBVyxLQUFLLEtBQUssQ0FBQyxNQUFNO0lBQ3hELE1BQU0sTUFBYyxNQUFNO0lBQzFCLElBQUssSUFBSSxJQUFZLEdBQUcsSUFBSSxLQUFLLEVBQUUsRUFBRztRQUNwQyxHQUFHLENBQUMsRUFBRSxHQUFHLFNBQVMsSUFBSSxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUk7SUFDMUM7SUFDQSxPQUFPO0FBQ1Q7QUFFQSxtRUFBbUUsR0FDbkUsT0FBTyxTQUFTLE9BQU8sR0FBZSxFQUFFLFdBQW1CLE1BQU0sRUFBVTtJQUN6RSxJQUFJLFlBQVksSUFBSSxDQUFDLFdBQVc7UUFDOUIsT0FBTyxRQUFRLE1BQU0sQ0FBQztJQUN4QixPQUFPLElBQUksWUFBWSxJQUFJLENBQUMsV0FBVztRQUNyQyxPQUFPLE9BQU8sY0FBYyxDQUFDO0lBQy9CLE9BQU8sSUFBSSxlQUFlLElBQUksQ0FBQyxXQUFXO1FBQ3hDLE9BQU8sVUFBVSxjQUFjLENBQUM7SUFDbEMsT0FBTyxJQUFJLHNCQUFzQixJQUFJLENBQUMsV0FBVztRQUMvQyxPQUFPLFlBQVk7SUFDckIsT0FBTztRQUNMLE1BQU0sSUFBSSxVQUFVLGdDQUFnQztJQUN0RCxDQUFDO0FBQ0gsQ0FBQztBQUVELE9BQU8sU0FBUyxPQUFPLEdBQVcsRUFBRSxXQUFtQixNQUFNLEVBQWM7SUFDekUsSUFBSSxZQUFZLElBQUksQ0FBQyxXQUFXO1FBQzlCLE9BQU8sUUFBUSxNQUFNLENBQUM7SUFDeEIsT0FBTyxJQUFJLG9CQUFvQixJQUFJLENBQUMsV0FBVztRQUM3QyxPQUFPLE9BQU8sWUFBWSxDQUFDO0lBQzdCLE9BQU8sSUFBSSxzQkFBc0IsSUFBSSxDQUFDLFdBQVc7UUFDL0MsT0FBTyxjQUFjO0lBQ3ZCLE9BQU87UUFDTCxNQUFNLElBQUksVUFBVSxnQ0FBZ0M7SUFDdEQsQ0FBQztBQUNILENBQUMifQ==