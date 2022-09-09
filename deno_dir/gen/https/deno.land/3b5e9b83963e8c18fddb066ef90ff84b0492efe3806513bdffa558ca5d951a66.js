function getLengths(b64) {
    const len = b64.length;
    // if (len % 4 > 0) {
    //   throw new TypeError("Invalid string. Length must be a multiple of 4");
    // }
    // Trim off extra bytes after placeholder bytes are found
    // See: https://github.com/beatgammit/base64-js/issues/42
    let validLen = b64.indexOf("=");
    if (validLen === -1) {
        validLen = len;
    }
    const placeHoldersLen = validLen === len ? 0 : 4 - validLen % 4;
    return [
        validLen,
        placeHoldersLen
    ];
}
export function init(lookup, revLookup, urlsafe = false) {
    function _byteLength(validLen, placeHoldersLen) {
        return Math.floor((validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen);
    }
    function tripletToBase64(num) {
        return lookup[num >> 18 & 0x3f] + lookup[num >> 12 & 0x3f] + lookup[num >> 6 & 0x3f] + lookup[num & 0x3f];
    }
    function encodeChunk(buf, start, end) {
        const out = new Array((end - start) / 3);
        for(let i = start, curTriplet = 0; i < end; i += 3){
            out[curTriplet++] = tripletToBase64((buf[i] << 16) + (buf[i + 1] << 8) + buf[i + 2]);
        }
        return out.join("");
    }
    return {
        // base64 is 4/3 + up to two characters of the original data
        byteLength (b64) {
            return _byteLength.apply(null, getLengths(b64));
        },
        toUint8Array (b64) {
            const [validLen, placeHoldersLen] = getLengths(b64);
            const buf = new Uint8Array(_byteLength(validLen, placeHoldersLen));
            // If there are placeholders, only get up to the last complete 4 chars
            const len = placeHoldersLen ? validLen - 4 : validLen;
            let tmp;
            let curByte = 0;
            let i;
            for(i = 0; i < len; i += 4){
                tmp = revLookup[b64.charCodeAt(i)] << 18 | revLookup[b64.charCodeAt(i + 1)] << 12 | revLookup[b64.charCodeAt(i + 2)] << 6 | revLookup[b64.charCodeAt(i + 3)];
                buf[curByte++] = tmp >> 16 & 0xff;
                buf[curByte++] = tmp >> 8 & 0xff;
                buf[curByte++] = tmp & 0xff;
            }
            if (placeHoldersLen === 2) {
                tmp = revLookup[b64.charCodeAt(i)] << 2 | revLookup[b64.charCodeAt(i + 1)] >> 4;
                buf[curByte++] = tmp & 0xff;
            } else if (placeHoldersLen === 1) {
                tmp = revLookup[b64.charCodeAt(i)] << 10 | revLookup[b64.charCodeAt(i + 1)] << 4 | revLookup[b64.charCodeAt(i + 2)] >> 2;
                buf[curByte++] = tmp >> 8 & 0xff;
                buf[curByte++] = tmp & 0xff;
            }
            return buf;
        },
        fromUint8Array (buf) {
            const maxChunkLength = 16383; // Must be multiple of 3
            const len = buf.length;
            const extraBytes = len % 3; // If we have 1 byte left, pad 2 bytes
            const len2 = len - extraBytes;
            const parts = new Array(Math.ceil(len2 / maxChunkLength) + (extraBytes ? 1 : 0));
            let curChunk = 0;
            let chunkEnd;
            // Go through the array every three bytes, we'll deal with trailing stuff later
            for(let i = 0; i < len2; i += maxChunkLength){
                chunkEnd = i + maxChunkLength;
                parts[curChunk++] = encodeChunk(buf, i, chunkEnd > len2 ? len2 : chunkEnd);
            }
            let tmp;
            // Pad the end with zeros, but make sure to not forget the extra bytes
            if (extraBytes === 1) {
                tmp = buf[len2];
                parts[curChunk] = lookup[tmp >> 2] + lookup[tmp << 4 & 0x3f];
                if (!urlsafe) parts[curChunk] += "==";
            } else if (extraBytes === 2) {
                tmp = buf[len2] << 8 | buf[len2 + 1] & 0xff;
                parts[curChunk] = lookup[tmp >> 10] + lookup[tmp >> 4 & 0x3f] + lookup[tmp << 2 & 0x3f];
                if (!urlsafe) parts[curChunk] += "=";
            }
            return parts.join("");
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvYmFzZTY0QHYwLjIuMS9iYXNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIGdldExlbmd0aHMoYjY0OiBzdHJpbmcpOiBbbnVtYmVyLCBudW1iZXJdIHtcbiAgY29uc3QgbGVuOiBudW1iZXIgPSBiNjQubGVuZ3RoO1xuXG4gIC8vIGlmIChsZW4gJSA0ID4gMCkge1xuICAvLyAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0XCIpO1xuICAvLyB9XG5cbiAgLy8gVHJpbSBvZmYgZXh0cmEgYnl0ZXMgYWZ0ZXIgcGxhY2Vob2xkZXIgYnl0ZXMgYXJlIGZvdW5kXG4gIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2JlYXRnYW1taXQvYmFzZTY0LWpzL2lzc3Vlcy80MlxuICBsZXQgdmFsaWRMZW46IG51bWJlciA9IGI2NC5pbmRleE9mKFwiPVwiKTtcblxuICBpZiAodmFsaWRMZW4gPT09IC0xKSB7XG4gICAgdmFsaWRMZW4gPSBsZW47XG4gIH1cblxuICBjb25zdCBwbGFjZUhvbGRlcnNMZW46IG51bWJlciA9IHZhbGlkTGVuID09PSBsZW4gPyAwIDogNCAtICh2YWxpZExlbiAlIDQpO1xuXG4gIHJldHVybiBbdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbl07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KFxuICBsb29rdXA6IHN0cmluZ1tdLFxuICByZXZMb29rdXA6IG51bWJlcltdLFxuICB1cmxzYWZlOiBib29sZWFuID0gZmFsc2UsXG4pIHtcbiAgZnVuY3Rpb24gX2J5dGVMZW5ndGgodmFsaWRMZW46IG51bWJlciwgcGxhY2VIb2xkZXJzTGVuOiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLmZsb29yKCgodmFsaWRMZW4gKyBwbGFjZUhvbGRlcnNMZW4pICogMykgLyA0IC0gcGxhY2VIb2xkZXJzTGVuKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NChudW06IG51bWJlcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIChcbiAgICAgIGxvb2t1cFsobnVtID4+IDE4KSAmIDB4M2ZdICtcbiAgICAgIGxvb2t1cFsobnVtID4+IDEyKSAmIDB4M2ZdICtcbiAgICAgIGxvb2t1cFsobnVtID4+IDYpICYgMHgzZl0gK1xuICAgICAgbG9va3VwW251bSAmIDB4M2ZdXG4gICAgKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVuY29kZUNodW5rKGJ1ZjogVWludDhBcnJheSwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IG91dDogc3RyaW5nW10gPSBuZXcgQXJyYXkoKGVuZCAtIHN0YXJ0KSAvIDMpO1xuXG4gICAgZm9yIChsZXQgaTogbnVtYmVyID0gc3RhcnQsIGN1clRyaXBsZXQ6IG51bWJlciA9IDA7IGkgPCBlbmQ7IGkgKz0gMykge1xuICAgICAgb3V0W2N1clRyaXBsZXQrK10gPSB0cmlwbGV0VG9CYXNlNjQoXG4gICAgICAgIChidWZbaV0gPDwgMTYpICsgKGJ1ZltpICsgMV0gPDwgOCkgKyBidWZbaSArIDJdLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0LmpvaW4oXCJcIik7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuICAgIGJ5dGVMZW5ndGgoYjY0OiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgcmV0dXJuIF9ieXRlTGVuZ3RoLmFwcGx5KG51bGwsIGdldExlbmd0aHMoYjY0KSk7XG4gICAgfSxcbiAgICB0b1VpbnQ4QXJyYXkoYjY0OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICAgIGNvbnN0IFt2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuXTogbnVtYmVyW10gPSBnZXRMZW5ndGhzKGI2NCk7XG5cbiAgICAgIGNvbnN0IGJ1ZiA9IG5ldyBVaW50OEFycmF5KF9ieXRlTGVuZ3RoKHZhbGlkTGVuLCBwbGFjZUhvbGRlcnNMZW4pKTtcblxuICAgICAgLy8gSWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICAgICAgY29uc3QgbGVuOiBudW1iZXIgPSBwbGFjZUhvbGRlcnNMZW4gPyB2YWxpZExlbiAtIDQgOiB2YWxpZExlbjtcblxuICAgICAgbGV0IHRtcDogbnVtYmVyO1xuICAgICAgbGV0IGN1ckJ5dGU6IG51bWJlciA9IDA7XG4gICAgICBsZXQgaTogbnVtYmVyO1xuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICAgICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHxcbiAgICAgICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgMTIpIHxcbiAgICAgICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfFxuICAgICAgICAgIHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldO1xuICAgICAgICBidWZbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gMTYpICYgMHhmZjtcbiAgICAgICAgYnVmW2N1ckJ5dGUrK10gPSAodG1wID4+IDgpICYgMHhmZjtcbiAgICAgICAgYnVmW2N1ckJ5dGUrK10gPSB0bXAgJiAweGZmO1xuICAgICAgfVxuXG4gICAgICBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAyKSB7XG4gICAgICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHxcbiAgICAgICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNCk7XG4gICAgICAgIGJ1ZltjdXJCeXRlKytdID0gdG1wICYgMHhmZjtcbiAgICAgIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAxKSB7XG4gICAgICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDEwKSB8XG4gICAgICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHxcbiAgICAgICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMik7XG4gICAgICAgIGJ1ZltjdXJCeXRlKytdID0gKHRtcCA+PiA4KSAmIDB4ZmY7XG4gICAgICAgIGJ1ZltjdXJCeXRlKytdID0gdG1wICYgMHhmZjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGJ1ZjtcbiAgICB9LFxuICAgIGZyb21VaW50OEFycmF5KGJ1ZjogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgICBjb25zdCBtYXhDaHVua0xlbmd0aDogbnVtYmVyID0gMTYzODM7IC8vIE11c3QgYmUgbXVsdGlwbGUgb2YgM1xuXG4gICAgICBjb25zdCBsZW46IG51bWJlciA9IGJ1Zi5sZW5ndGg7XG5cbiAgICAgIGNvbnN0IGV4dHJhQnl0ZXM6IG51bWJlciA9IGxlbiAlIDM7IC8vIElmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cbiAgICAgIGNvbnN0IGxlbjI6IG51bWJlciA9IGxlbiAtIGV4dHJhQnl0ZXM7XG5cbiAgICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IG5ldyBBcnJheShcbiAgICAgICAgTWF0aC5jZWlsKGxlbjIgLyBtYXhDaHVua0xlbmd0aCkgKyAoZXh0cmFCeXRlcyA/IDEgOiAwKSxcbiAgICAgICk7XG5cbiAgICAgIGxldCBjdXJDaHVuazogbnVtYmVyID0gMDtcbiAgICAgIGxldCBjaHVua0VuZDogbnVtYmVyO1xuXG4gICAgICAvLyBHbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG4gICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgbGVuMjsgaSArPSBtYXhDaHVua0xlbmd0aCkge1xuICAgICAgICBjaHVua0VuZCA9IGkgKyBtYXhDaHVua0xlbmd0aDtcbiAgICAgICAgcGFydHNbY3VyQ2h1bmsrK10gPSBlbmNvZGVDaHVuayhcbiAgICAgICAgICBidWYsXG4gICAgICAgICAgaSxcbiAgICAgICAgICBjaHVua0VuZCA+IGxlbjIgPyBsZW4yIDogY2h1bmtFbmQsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGxldCB0bXA6IG51bWJlcjtcblxuICAgICAgLy8gUGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICAgICAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICAgICAgdG1wID0gYnVmW2xlbjJdO1xuICAgICAgICBwYXJ0c1tjdXJDaHVua10gPSBsb29rdXBbdG1wID4+IDJdICsgbG9va3VwWyh0bXAgPDwgNCkgJiAweDNmXTtcbiAgICAgICAgaWYgKCF1cmxzYWZlKSBwYXJ0c1tjdXJDaHVua10gKz0gXCI9PVwiO1xuICAgICAgfSBlbHNlIGlmIChleHRyYUJ5dGVzID09PSAyKSB7XG4gICAgICAgIHRtcCA9IChidWZbbGVuMl0gPDwgOCkgfCAoYnVmW2xlbjIgKyAxXSAmIDB4ZmYpO1xuICAgICAgICBwYXJ0c1tjdXJDaHVua10gPSBsb29rdXBbdG1wID4+IDEwXSArXG4gICAgICAgICAgbG9va3VwWyh0bXAgPj4gNCkgJiAweDNmXSArXG4gICAgICAgICAgbG9va3VwWyh0bXAgPDwgMikgJiAweDNmXTtcbiAgICAgICAgaWYgKCF1cmxzYWZlKSBwYXJ0c1tjdXJDaHVua10gKz0gXCI9XCI7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwYXJ0cy5qb2luKFwiXCIpO1xuICAgIH0sXG4gIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxVQUFVLENBQUMsR0FBVyxFQUFvQjtJQUNqRCxNQUFNLEdBQUcsR0FBVyxHQUFHLENBQUMsTUFBTSxB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