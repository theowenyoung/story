// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
// deno-fmt-ignore
const base64abc = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "+",
    "/"
];
/**
 * CREDIT: https://gist.github.com/enepomnyaschih/72c423f727d395eeaa09697058238727
 * Encodes a given Uint8Array, ArrayBuffer or string into RFC4648 base64 representation
 * @param data
 */ export function encode(data) {
    const uint8 = typeof data === "string" ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
    let result = "", i;
    const l = uint8.length;
    for(i = 2; i < l; i += 3){
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[(uint8[i - 2] & 0x03) << 4 | uint8[i - 1] >> 4];
        result += base64abc[(uint8[i - 1] & 0x0f) << 2 | uint8[i] >> 6];
        result += base64abc[uint8[i] & 0x3f];
    }
    if (i === l + 1) {
        // 1 octet yet to write
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[(uint8[i - 2] & 0x03) << 4];
        result += "==";
    }
    if (i === l) {
        // 2 octets yet to write
        result += base64abc[uint8[i - 2] >> 2];
        result += base64abc[(uint8[i - 2] & 0x03) << 4 | uint8[i - 1] >> 4];
        result += base64abc[(uint8[i - 1] & 0x0f) << 2];
        result += "=";
    }
    return result;
}
/**
 * Decodes a given RFC4648 base64 encoded string
 * @param b64
 */ export function decode(b64) {
    const binString = atob(b64);
    const size = binString.length;
    const bytes = new Uint8Array(size);
    for(let i = 0; i < size; i++){
        bytes[i] = binString.charCodeAt(i);
    }
    return bytes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjg2LjAvZW5jb2RpbmcvYmFzZTY0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8vIGRlbm8tZm10LWlnbm9yZVxuY29uc3QgYmFzZTY0YWJjID0gW1wiQVwiLCBcIkJcIiwgXCJDXCIsIFwiRFwiLCBcIkVcIiwgXCJGXCIsIFwiR1wiLCBcIkhcIiwgXCJJXCIsIFwiSlwiLCBcIktcIiwgXCJMXCIsIFxuICBcIk1cIiwgXCJOXCIsIFwiT1wiLCBcIlBcIiwgXCJRXCIsIFwiUlwiLCBcIlNcIiwgXCJUXCIsIFwiVVwiLCBcIlZcIiwgXCJXXCIsIFwiWFwiLCBcIllcIiwgXCJaXCIsIFwiYVwiLCBcbiAgXCJiXCIsIFwiY1wiLCBcImRcIiwgXCJlXCIsIFwiZlwiLCBcImdcIiwgXCJoXCIsIFwiaVwiLCBcImpcIiwgXCJrXCIsIFwibFwiLCBcIm1cIiwgXCJuXCIsIFwib1wiLCBcInBcIiwgXG4gIFwicVwiLCBcInJcIiwgXCJzXCIsIFwidFwiLCBcInVcIiwgXCJ2XCIsIFwid1wiLCBcInhcIiwgXCJ5XCIsIFwielwiLCBcIjBcIiwgXCIxXCIsIFwiMlwiLCBcIjNcIiwgXCI0XCIsIFxuICBcIjVcIiwgXCI2XCIsIFwiN1wiLCBcIjhcIiwgXCI5XCIsIFwiK1wiLCBcIi9cIl07XG5cbi8qKlxuICogQ1JFRElUOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9lbmVwb21ueWFzY2hpaC83MmM0MjNmNzI3ZDM5NWVlYWEwOTY5NzA1ODIzODcyN1xuICogRW5jb2RlcyBhIGdpdmVuIFVpbnQ4QXJyYXksIEFycmF5QnVmZmVyIG9yIHN0cmluZyBpbnRvIFJGQzQ2NDggYmFzZTY0IHJlcHJlc2VudGF0aW9uXG4gKiBAcGFyYW0gZGF0YVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlKGRhdGE6IEFycmF5QnVmZmVyIHwgc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdWludDggPSB0eXBlb2YgZGF0YSA9PT0gXCJzdHJpbmdcIlxuICAgID8gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKGRhdGEpXG4gICAgOiBkYXRhIGluc3RhbmNlb2YgVWludDhBcnJheVxuICAgID8gZGF0YVxuICAgIDogbmV3IFVpbnQ4QXJyYXkoZGF0YSk7XG4gIGxldCByZXN1bHQgPSBcIlwiLFxuICAgIGk7XG4gIGNvbnN0IGwgPSB1aW50OC5sZW5ndGg7XG4gIGZvciAoaSA9IDI7IGkgPCBsOyBpICs9IDMpIHtcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjW3VpbnQ4W2kgLSAyXSA+PiAyXTtcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjWygodWludDhbaSAtIDJdICYgMHgwMykgPDwgNCkgfCAodWludDhbaSAtIDFdID4+IDQpXTtcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjWygodWludDhbaSAtIDFdICYgMHgwZikgPDwgMikgfCAodWludDhbaV0gPj4gNildO1xuICAgIHJlc3VsdCArPSBiYXNlNjRhYmNbdWludDhbaV0gJiAweDNmXTtcbiAgfVxuICBpZiAoaSA9PT0gbCArIDEpIHtcbiAgICAvLyAxIG9jdGV0IHlldCB0byB3cml0ZVxuICAgIHJlc3VsdCArPSBiYXNlNjRhYmNbdWludDhbaSAtIDJdID4+IDJdO1xuICAgIHJlc3VsdCArPSBiYXNlNjRhYmNbKHVpbnQ4W2kgLSAyXSAmIDB4MDMpIDw8IDRdO1xuICAgIHJlc3VsdCArPSBcIj09XCI7XG4gIH1cbiAgaWYgKGkgPT09IGwpIHtcbiAgICAvLyAyIG9jdGV0cyB5ZXQgdG8gd3JpdGVcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjW3VpbnQ4W2kgLSAyXSA+PiAyXTtcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjWygodWludDhbaSAtIDJdICYgMHgwMykgPDwgNCkgfCAodWludDhbaSAtIDFdID4+IDQpXTtcbiAgICByZXN1bHQgKz0gYmFzZTY0YWJjWyh1aW50OFtpIC0gMV0gJiAweDBmKSA8PCAyXTtcbiAgICByZXN1bHQgKz0gXCI9XCI7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBEZWNvZGVzIGEgZ2l2ZW4gUkZDNDY0OCBiYXNlNjQgZW5jb2RlZCBzdHJpbmdcbiAqIEBwYXJhbSBiNjRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZShiNjQ6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICBjb25zdCBiaW5TdHJpbmcgPSBhdG9iKGI2NCk7XG4gIGNvbnN0IHNpemUgPSBiaW5TdHJpbmcubGVuZ3RoO1xuICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KHNpemUpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgIGJ5dGVzW2ldID0gYmluU3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gIH1cbiAgcmV0dXJuIGJ5dGVzO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUUxRSxrQkFBa0I7QUFDbEIsTUFBTSxTQUFTLEdBQUc7SUFBQyxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFDM0UsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFHO0lBQ3pFLEdBQUc7SUFBRSxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFHO0lBQUUsR0FBRztJQUFFLEdBQUc7SUFBRSxHQUFH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