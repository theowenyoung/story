import SqliteError from "./error.ts";
// Move string to C
export function setStr(wasm, str, closure) {
    const bytes = new TextEncoder().encode(str);
    const ptr = wasm.malloc(bytes.length + 1);
    if (ptr === 0) {
        throw new SqliteError("Out of memory.");
    }
    const mem = new Uint8Array(wasm.memory.buffer, ptr, bytes.length + 1);
    mem.set(bytes);
    mem[bytes.length] = 0; // \0 terminator
    closure(ptr);
    wasm.free(ptr);
}
// Move Uint8Array to C
export function setArr(wasm, arr, closure) {
    const ptr = wasm.malloc(arr.length);
    if (ptr === 0) {
        throw new SqliteError("Out of memory.");
    }
    const mem = new Uint8Array(wasm.memory.buffer, ptr, arr.length);
    mem.set(arr);
    closure(ptr);
    wasm.free(ptr);
}
// Read string from C
export function getStr(wasm, ptr) {
    const len = wasm.str_len(ptr);
    const bytes = new Uint8Array(wasm.memory.buffer, ptr, len);
    if (len > 16) {
        return new TextDecoder().decode(bytes);
    } else {
        // This optimization is lifted from EMSCRIPTEN's glue code
        let str = "";
        let idx = 0;
        while(idx < len){
            var u0 = bytes[idx++];
            if (!(u0 & 0x80)) {
                str += String.fromCharCode(u0);
                continue;
            }
            var u1 = bytes[idx++] & 63;
            if ((u0 & 0xE0) == 0xC0) {
                str += String.fromCharCode((u0 & 31) << 6 | u1);
                continue;
            }
            var u2 = bytes[idx++] & 63;
            if ((u0 & 0xF0) == 0xE0) {
                u0 = (u0 & 15) << 12 | u1 << 6 | u2;
            } else {
                // cut warning
                u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | bytes[idx++] & 63;
            }
            if (u0 < 0x10000) {
                str += String.fromCharCode(u0);
            } else {
                var ch = u0 - 0x10000;
                str += String.fromCharCode(0xD800 | ch >> 10, 0xDC00 | ch & 0x3FF);
            }
        }
        return str;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvc3FsaXRlQHYyLjMuMi9zcmMvd2FzbS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgU3FsaXRlRXJyb3IgZnJvbSBcIi4vZXJyb3IudHNcIjtcblxuLy8gTW92ZSBzdHJpbmcgdG8gQ1xuZXhwb3J0IGZ1bmN0aW9uIHNldFN0cihcbiAgd2FzbTogYW55LFxuICBzdHI6IHN0cmluZyxcbiAgY2xvc3VyZTogKHB0cjogbnVtYmVyKSA9PiB2b2lkLFxuKSB7XG4gIGNvbnN0IGJ5dGVzID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHN0cik7XG4gIGNvbnN0IHB0ciA9IHdhc20ubWFsbG9jKGJ5dGVzLmxlbmd0aCArIDEpO1xuICBpZiAocHRyID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKFwiT3V0IG9mIG1lbW9yeS5cIik7XG4gIH1cbiAgY29uc3QgbWVtID0gbmV3IFVpbnQ4QXJyYXkod2FzbS5tZW1vcnkuYnVmZmVyLCBwdHIsIGJ5dGVzLmxlbmd0aCArIDEpO1xuICBtZW0uc2V0KGJ5dGVzKTtcbiAgbWVtW2J5dGVzLmxlbmd0aF0gPSAwOyAvLyBcXDAgdGVybWluYXRvclxuICBjbG9zdXJlKHB0cik7XG4gIHdhc20uZnJlZShwdHIpO1xufVxuXG4vLyBNb3ZlIFVpbnQ4QXJyYXkgdG8gQ1xuZXhwb3J0IGZ1bmN0aW9uIHNldEFycihcbiAgd2FzbTogYW55LFxuICBhcnI6IFVpbnQ4QXJyYXksXG4gIGNsb3N1cmU6IChwdHI6IG51bWJlcikgPT4gdm9pZCxcbikge1xuICBjb25zdCBwdHIgPSB3YXNtLm1hbGxvYyhhcnIubGVuZ3RoKTtcbiAgaWYgKHB0ciA9PT0gMCkge1xuICAgIHRocm93IG5ldyBTcWxpdGVFcnJvcihcIk91dCBvZiBtZW1vcnkuXCIpO1xuICB9XG4gIGNvbnN0IG1lbSA9IG5ldyBVaW50OEFycmF5KHdhc20ubWVtb3J5LmJ1ZmZlciwgcHRyLCBhcnIubGVuZ3RoKTtcbiAgbWVtLnNldChhcnIpO1xuICBjbG9zdXJlKHB0cik7XG4gIHdhc20uZnJlZShwdHIpO1xufVxuXG4vLyBSZWFkIHN0cmluZyBmcm9tIENcbmV4cG9ydCBmdW5jdGlvbiBnZXRTdHIod2FzbTogYW55LCBwdHI6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IGxlbiA9IHdhc20uc3RyX2xlbihwdHIpO1xuICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KHdhc20ubWVtb3J5LmJ1ZmZlciwgcHRyLCBsZW4pO1xuICBpZiAobGVuID4gMTYpIHtcbiAgICByZXR1cm4gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKGJ5dGVzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUaGlzIG9wdGltaXphdGlvbiBpcyBsaWZ0ZWQgZnJvbSBFTVNDUklQVEVOJ3MgZ2x1ZSBjb2RlXG4gICAgbGV0IHN0ciA9IFwiXCI7XG4gICAgbGV0IGlkeCA9IDA7XG4gICAgd2hpbGUgKGlkeCA8IGxlbikge1xuICAgICAgdmFyIHUwID0gYnl0ZXNbaWR4KytdO1xuICAgICAgaWYgKCEodTAgJiAweDgwKSkge1xuICAgICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSh1MCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIHUxID0gYnl0ZXNbaWR4KytdICYgNjM7XG4gICAgICBpZiAoKHUwICYgMHhFMCkgPT0gMHhDMCkge1xuICAgICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoKHUwICYgMzEpIDw8IDYpIHwgdTEpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciB1MiA9IGJ5dGVzW2lkeCsrXSAmIDYzO1xuICAgICAgaWYgKCh1MCAmIDB4RjApID09IDB4RTApIHtcbiAgICAgICAgdTAgPSAoKHUwICYgMTUpIDw8IDEyKSB8ICh1MSA8PCA2KSB8IHUyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY3V0IHdhcm5pbmdcbiAgICAgICAgdTAgPSAoKHUwICYgNykgPDwgMTgpIHwgKHUxIDw8IDEyKSB8ICh1MiA8PCA2KSB8IChieXRlc1tpZHgrK10gJiA2Myk7XG4gICAgICB9XG4gICAgICBpZiAodTAgPCAweDEwMDAwKSB7XG4gICAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHUwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjaCA9IHUwIC0gMHgxMDAwMDtcbiAgICAgICAgc3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoMHhEODAwIHwgKGNoID4+IDEwKSwgMHhEQzAwIHwgKGNoICYgMHgzRkYpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sV0FBVyxNQUFNLFlBQVksQ0FBQztBQUVyQyxtQkFBbUI7QUFDbkIsT0FBTyxTQUFTLE1BQU0sQ0FDcEIsSUFBUyxFQUNULEdBQVcsRUFDWCxPQUE4QixFQUM5QjtJQUNBLE1BQU0sS0FBSyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxBQUFDO0lBQzVDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQUFBQztJQUMxQyxJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUU7UUFDYixNQUFNLElBQUksV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUNELE1BQU0sR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxBQUFDO0lBQ3RFLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDZixHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQjtJQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFD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