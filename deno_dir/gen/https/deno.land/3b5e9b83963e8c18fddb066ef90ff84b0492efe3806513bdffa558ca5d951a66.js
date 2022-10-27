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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvYmFzZTY0QHYwLjIuMS9iYXNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIGdldExlbmd0aHMoYjY0OiBzdHJpbmcpOiBbbnVtYmVyLCBudW1iZXJdIHtcbiAgY29uc3QgbGVuOiBudW1iZXIgPSBiNjQubGVuZ3RoO1xuXG4gIC8vIGlmIChsZW4gJSA0ID4gMCkge1xuICAvLyAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0XCIpO1xuICAvLyB9XG5cbiAgLy8gVHJpbSBvZmYgZXh0cmEgYnl0ZXMgYWZ0ZXIgcGxhY2Vob2xkZXIgYnl0ZXMgYXJlIGZvdW5kXG4gIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2JlYXRnYW1taXQvYmFzZTY0LWpzL2lzc3Vlcy80MlxuICBsZXQgdmFsaWRMZW46IG51bWJlciA9IGI2NC5pbmRleE9mKFwiPVwiKTtcblxuICBpZiAodmFsaWRMZW4gPT09IC0xKSB7XG4gICAgdmFsaWRMZW4gPSBsZW47XG4gIH1cblxuICBjb25zdCBwbGFjZUhvbGRlcnNMZW46IG51bWJlciA9IHZhbGlkTGVuID09PSBsZW4gPyAwIDogNCAtICh2YWxpZExlbiAlIDQpO1xuXG4gIHJldHVybiBbdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbl07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KFxuICBsb29rdXA6IHN0cmluZ1tdLFxuICByZXZMb29rdXA6IG51bWJlcltdLFxuICB1cmxzYWZlOiBib29sZWFuID0gZmFsc2UsXG4pIHtcbiAgZnVuY3Rpb24gX2J5dGVMZW5ndGgodmFsaWRMZW46IG51bWJlciwgcGxhY2VIb2xkZXJzTGVuOiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLmZsb29yKCgodmFsaWRMZW4gKyBwbGFjZUhvbGRlcnNMZW4pICogMykgLyA0IC0gcGxhY2VIb2xkZXJzTGVuKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NChudW06IG51bWJlcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIChcbiAgICAgIGxvb2t1cFsobnVtID4+IDE4KSAmIDB4M2ZdICtcbiAgICAgIGxvb2t1cFsobnVtID4+IDEyKSAmIDB4M2ZdICtcbiAgICAgIGxvb2t1cFsobnVtID4+IDYpICYgMHgzZl0gK1xuICAgICAgbG9va3VwW251bSAmIDB4M2ZdXG4gICAgKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVuY29kZUNodW5rKGJ1ZjogVWludDhBcnJheSwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IG91dDogc3RyaW5nW10gPSBuZXcgQXJyYXkoKGVuZCAtIHN0YXJ0KSAvIDMpO1xuXG4gICAgZm9yIChsZXQgaTogbnVtYmVyID0gc3RhcnQsIGN1clRyaXBsZXQ6IG51bWJlciA9IDA7IGkgPCBlbmQ7IGkgKz0gMykge1xuICAgICAgb3V0W2N1clRyaXBsZXQrK10gPSB0cmlwbGV0VG9CYXNlNjQoXG4gICAgICAgIChidWZbaV0gPDwgMTYpICsgKGJ1ZltpICsgMV0gPDwgOCkgKyBidWZbaSArIDJdLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0LmpvaW4oXCJcIik7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuICAgIGJ5dGVMZW5ndGgoYjY0OiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgcmV0dXJuIF9ieXRlTGVuZ3RoLmFwcGx5KG51bGwsIGdldExlbmd0aHMoYjY0KSk7XG4gICAgfSxcbiAgICB0b1VpbnQ4QXJyYXkoYjY0OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICAgIGNvbnN0IFt2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuXTogbnVtYmVyW10gPSBnZXRMZW5ndGhzKGI2NCk7XG5cbiAgICAgIGNvbnN0IGJ1ZiA9IG5ldyBVaW50OEFycmF5KF9ieXRlTGVuZ3RoKHZhbGlkTGVuLCBwbGFjZUhvbGRlcnNMZW4pKTtcblxuICAgICAgLy8gSWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICAgICAgY29uc3QgbGVuOiBudW1iZXIgPSBwbGFjZUhvbGRlcnNMZW4gPyB2YWxpZExlbiAtIDQgOiB2YWxpZExlbjtcblxuICAgICAgbGV0IHRtcDogbnVtYmVyO1xuICAgICAgbGV0IGN1ckJ5dGU6IG51bWJlciA9IDA7XG4gICAgICBsZXQgaTogbnVtYmVyO1xuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICAgICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHxcbiAgICAgICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgMTIpIHxcbiAgICAgICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfFxuICAgICAgICAgIHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldO1xuICAgICAgICBidWZbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gMTYpICYgMHhmZjtcbiAgICAgICAgYnVmW2N1ckJ5dGUrK10gPSAodG1wID4+IDgpICYgMHhmZjtcbiAgICAgICAgYnVmW2N1ckJ5dGUrK10gPSB0bXAgJiAweGZmO1xuICAgICAgfVxuXG4gICAgICBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAyKSB7XG4gICAgICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHxcbiAgICAgICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNCk7XG4gICAgICAgIGJ1ZltjdXJCeXRlKytdID0gdG1wICYgMHhmZjtcbiAgICAgIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAxKSB7XG4gICAgICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDEwKSB8XG4gICAgICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHxcbiAgICAgICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMik7XG4gICAgICAgIGJ1ZltjdXJCeXRlKytdID0gKHRtcCA+PiA4KSAmIDB4ZmY7XG4gICAgICAgIGJ1ZltjdXJCeXRlKytdID0gdG1wICYgMHhmZjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGJ1ZjtcbiAgICB9LFxuICAgIGZyb21VaW50OEFycmF5KGJ1ZjogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgICBjb25zdCBtYXhDaHVua0xlbmd0aDogbnVtYmVyID0gMTYzODM7IC8vIE11c3QgYmUgbXVsdGlwbGUgb2YgM1xuXG4gICAgICBjb25zdCBsZW46IG51bWJlciA9IGJ1Zi5sZW5ndGg7XG5cbiAgICAgIGNvbnN0IGV4dHJhQnl0ZXM6IG51bWJlciA9IGxlbiAlIDM7IC8vIElmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cbiAgICAgIGNvbnN0IGxlbjI6IG51bWJlciA9IGxlbiAtIGV4dHJhQnl0ZXM7XG5cbiAgICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IG5ldyBBcnJheShcbiAgICAgICAgTWF0aC5jZWlsKGxlbjIgLyBtYXhDaHVua0xlbmd0aCkgKyAoZXh0cmFCeXRlcyA/IDEgOiAwKSxcbiAgICAgICk7XG5cbiAgICAgIGxldCBjdXJDaHVuazogbnVtYmVyID0gMDtcbiAgICAgIGxldCBjaHVua0VuZDogbnVtYmVyO1xuXG4gICAgICAvLyBHbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG4gICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgbGVuMjsgaSArPSBtYXhDaHVua0xlbmd0aCkge1xuICAgICAgICBjaHVua0VuZCA9IGkgKyBtYXhDaHVua0xlbmd0aDtcbiAgICAgICAgcGFydHNbY3VyQ2h1bmsrK10gPSBlbmNvZGVDaHVuayhcbiAgICAgICAgICBidWYsXG4gICAgICAgICAgaSxcbiAgICAgICAgICBjaHVua0VuZCA+IGxlbjIgPyBsZW4yIDogY2h1bmtFbmQsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGxldCB0bXA6IG51bWJlcjtcblxuICAgICAgLy8gUGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICAgICAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICAgICAgdG1wID0gYnVmW2xlbjJdO1xuICAgICAgICBwYXJ0c1tjdXJDaHVua10gPSBsb29rdXBbdG1wID4+IDJdICsgbG9va3VwWyh0bXAgPDwgNCkgJiAweDNmXTtcbiAgICAgICAgaWYgKCF1cmxzYWZlKSBwYXJ0c1tjdXJDaHVua10gKz0gXCI9PVwiO1xuICAgICAgfSBlbHNlIGlmIChleHRyYUJ5dGVzID09PSAyKSB7XG4gICAgICAgIHRtcCA9IChidWZbbGVuMl0gPDwgOCkgfCAoYnVmW2xlbjIgKyAxXSAmIDB4ZmYpO1xuICAgICAgICBwYXJ0c1tjdXJDaHVua10gPSBsb29rdXBbdG1wID4+IDEwXSArXG4gICAgICAgICAgbG9va3VwWyh0bXAgPj4gNCkgJiAweDNmXSArXG4gICAgICAgICAgbG9va3VwWyh0bXAgPDwgMikgJiAweDNmXTtcbiAgICAgICAgaWYgKCF1cmxzYWZlKSBwYXJ0c1tjdXJDaHVua10gKz0gXCI9XCI7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwYXJ0cy5qb2luKFwiXCIpO1xuICAgIH0sXG4gIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxXQUFXLEdBQVcsRUFBb0I7SUFDakQsTUFBTSxNQUFjLElBQUksTUFBTTtJQUU5QixxQkFBcUI7SUFDckIsMkVBQTJFO0lBQzNFLElBQUk7SUFFSix5REFBeUQ7SUFDekQseURBQXlEO0lBQ3pELElBQUksV0FBbUIsSUFBSSxPQUFPLENBQUM7SUFFbkMsSUFBSSxhQUFhLENBQUMsR0FBRztRQUNuQixXQUFXO0lBQ2IsQ0FBQztJQUVELE1BQU0sa0JBQTBCLGFBQWEsTUFBTSxJQUFJLElBQUssV0FBVyxDQUFFO0lBRXpFLE9BQU87UUFBQztRQUFVO0tBQWdCO0FBQ3BDO0FBRUEsT0FBTyxTQUFTLEtBQ2QsTUFBZ0IsRUFDaEIsU0FBbUIsRUFDbkIsVUFBbUIsS0FBSyxFQUN4QjtJQUNBLFNBQVMsWUFBWSxRQUFnQixFQUFFLGVBQXVCLEVBQVU7UUFDdEUsT0FBTyxLQUFLLEtBQUssQ0FBQyxBQUFDLENBQUMsV0FBVyxlQUFlLElBQUksSUFBSyxJQUFJO0lBQzdEO0lBRUEsU0FBUyxnQkFBZ0IsR0FBVyxFQUFVO1FBQzVDLE9BQ0UsTUFBTSxDQUFDLEFBQUMsT0FBTyxLQUFNLEtBQUssR0FDMUIsTUFBTSxDQUFDLEFBQUMsT0FBTyxLQUFNLEtBQUssR0FDMUIsTUFBTSxDQUFDLEFBQUMsT0FBTyxJQUFLLEtBQUssR0FDekIsTUFBTSxDQUFDLE1BQU0sS0FBSztJQUV0QjtJQUVBLFNBQVMsWUFBWSxHQUFlLEVBQUUsS0FBYSxFQUFFLEdBQVcsRUFBVTtRQUN4RSxNQUFNLE1BQWdCLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxJQUFJO1FBRWhELElBQUssSUFBSSxJQUFZLE9BQU8sYUFBcUIsR0FBRyxJQUFJLEtBQUssS0FBSyxFQUFHO1lBQ25FLEdBQUcsQ0FBQyxhQUFhLEdBQUcsZ0JBQ2xCLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUU7UUFFbkQ7UUFFQSxPQUFPLElBQUksSUFBSSxDQUFDO0lBQ2xCO0lBRUEsT0FBTztRQUNMLDREQUE0RDtRQUM1RCxZQUFXLEdBQVcsRUFBVTtZQUM5QixPQUFPLFlBQVksS0FBSyxDQUFDLElBQUksRUFBRSxXQUFXO1FBQzVDO1FBQ0EsY0FBYSxHQUFXLEVBQWM7WUFDcEMsTUFBTSxDQUFDLFVBQVUsZ0JBQWdCLEdBQWEsV0FBVztZQUV6RCxNQUFNLE1BQU0sSUFBSSxXQUFXLFlBQVksVUFBVTtZQUVqRCxzRUFBc0U7WUFDdEUsTUFBTSxNQUFjLGtCQUFrQixXQUFXLElBQUksUUFBUTtZQUU3RCxJQUFJO1lBQ0osSUFBSSxVQUFrQjtZQUN0QixJQUFJO1lBRUosSUFBSyxJQUFJLEdBQUcsSUFBSSxLQUFLLEtBQUssRUFBRztnQkFDM0IsTUFBTSxBQUFDLFNBQVMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxHQUFHLElBQUksS0FDcEMsU0FBUyxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksR0FBRyxJQUFJLEtBQ3BDLFNBQVMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUNyQyxTQUFTLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxHQUFHO2dCQUNsQyxHQUFHLENBQUMsVUFBVSxHQUFHLEFBQUMsT0FBTyxLQUFNO2dCQUMvQixHQUFHLENBQUMsVUFBVSxHQUFHLEFBQUMsT0FBTyxJQUFLO2dCQUM5QixHQUFHLENBQUMsVUFBVSxHQUFHLE1BQU07WUFDekI7WUFFQSxJQUFJLG9CQUFvQixHQUFHO2dCQUN6QixNQUFNLEFBQUMsU0FBUyxDQUFDLElBQUksVUFBVSxDQUFDLEdBQUcsSUFBSSxJQUNwQyxTQUFTLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxHQUFHLElBQUk7Z0JBQ3ZDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsTUFBTTtZQUN6QixPQUFPLElBQUksb0JBQW9CLEdBQUc7Z0JBQ2hDLE1BQU0sQUFBQyxTQUFTLENBQUMsSUFBSSxVQUFVLENBQUMsR0FBRyxJQUFJLEtBQ3BDLFNBQVMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUNwQyxTQUFTLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxHQUFHLElBQUk7Z0JBQ3ZDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsQUFBQyxPQUFPLElBQUs7Z0JBQzlCLEdBQUcsQ0FBQyxVQUFVLEdBQUcsTUFBTTtZQUN6QixDQUFDO1lBRUQsT0FBTztRQUNUO1FBQ0EsZ0JBQWUsR0FBZSxFQUFVO1lBQ3RDLE1BQU0saUJBQXlCLE9BQU8sd0JBQXdCO1lBRTlELE1BQU0sTUFBYyxJQUFJLE1BQU07WUFFOUIsTUFBTSxhQUFxQixNQUFNLEdBQUcsc0NBQXNDO1lBRTFFLE1BQU0sT0FBZSxNQUFNO1lBRTNCLE1BQU0sUUFBa0IsSUFBSSxNQUMxQixLQUFLLElBQUksQ0FBQyxPQUFPLGtCQUFrQixDQUFDLGFBQWEsSUFBSSxDQUFDO1lBR3hELElBQUksV0FBbUI7WUFDdkIsSUFBSTtZQUVKLCtFQUErRTtZQUMvRSxJQUFLLElBQUksSUFBWSxHQUFHLElBQUksTUFBTSxLQUFLLGVBQWdCO2dCQUNyRCxXQUFXLElBQUk7Z0JBQ2YsS0FBSyxDQUFDLFdBQVcsR0FBRyxZQUNsQixLQUNBLEdBQ0EsV0FBVyxPQUFPLE9BQU8sUUFBUTtZQUVyQztZQUVBLElBQUk7WUFFSixzRUFBc0U7WUFDdEUsSUFBSSxlQUFlLEdBQUc7Z0JBQ3BCLE1BQU0sR0FBRyxDQUFDLEtBQUs7Z0JBQ2YsS0FBSyxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsTUFBTSxDQUFDLEFBQUMsT0FBTyxJQUFLLEtBQUs7Z0JBQzlELElBQUksQ0FBQyxTQUFTLEtBQUssQ0FBQyxTQUFTLElBQUk7WUFDbkMsT0FBTyxJQUFJLGVBQWUsR0FBRztnQkFDM0IsTUFBTSxBQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksSUFBTSxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUc7Z0JBQzFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLE9BQU8sR0FBRyxHQUNqQyxNQUFNLENBQUMsQUFBQyxPQUFPLElBQUssS0FBSyxHQUN6QixNQUFNLENBQUMsQUFBQyxPQUFPLElBQUssS0FBSztnQkFDM0IsSUFBSSxDQUFDLFNBQVMsS0FBSyxDQUFDLFNBQVMsSUFBSTtZQUNuQyxDQUFDO1lBRUQsT0FBTyxNQUFNLElBQUksQ0FBQztRQUNwQjtJQUNGO0FBQ0YsQ0FBQyJ9