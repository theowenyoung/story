// Ported from Go
// https://github.com/golang/go/blob/go1.12.5/src/encoding/hex/hex.go
// Copyright 2009 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
const hexTable = new TextEncoder().encode("0123456789abcdef");
/**
 * ErrInvalidByte takes an invalid byte and returns an Error.
 * @param byte
 */ export function errInvalidByte(byte) {
    return new Error("encoding/hex: invalid byte: " + new TextDecoder().decode(new Uint8Array([
        byte
    ])));
}
/** ErrLength returns an error about odd string length. */ export function errLength() {
    return new Error("encoding/hex: odd length hex string");
}
// fromHexChar converts a hex character into its value.
function fromHexChar(byte) {
    // '0' <= byte && byte <= '9'
    if (48 <= byte && byte <= 57) return byte - 48;
    // 'a' <= byte && byte <= 'f'
    if (97 <= byte && byte <= 102) return byte - 97 + 10;
    // 'A' <= byte && byte <= 'F'
    if (65 <= byte && byte <= 70) return byte - 65 + 10;
    throw errInvalidByte(byte);
}
/**
 * EncodedLen returns the length of an encoding of n source bytes. Specifically,
 * it returns n * 2.
 * @param n
 */ export function encodedLen(n) {
    return n * 2;
}
/**
 * Encode encodes `src` into `encodedLen(src.length)` bytes.
 * @param src
 */ export function encode(src) {
    const dst = new Uint8Array(encodedLen(src.length));
    for(let i = 0; i < dst.length; i++){
        const v = src[i];
        dst[i * 2] = hexTable[v >> 4];
        dst[i * 2 + 1] = hexTable[v & 0x0f];
    }
    return dst;
}
/**
 * EncodeToString returns the hexadecimal encoding of `src`.
 * @param src
 */ export function encodeToString(src) {
    return new TextDecoder().decode(encode(src));
}
/**
 * Decode decodes `src` into `decodedLen(src.length)` bytes
 * If the input is malformed an error will be thrown
 * the error.
 * @param src
 */ export function decode(src) {
    const dst = new Uint8Array(decodedLen(src.length));
    for(let i = 0; i < dst.length; i++){
        const a = fromHexChar(src[i * 2]);
        const b = fromHexChar(src[i * 2 + 1]);
        dst[i] = a << 4 | b;
    }
    if (src.length % 2 == 1) {
        // Check for invalid char before reporting bad length,
        // since the invalid char (if present) is an earlier problem.
        fromHexChar(src[dst.length * 2]);
        throw errLength();
    }
    return dst;
}
/**
 * DecodedLen returns the length of decoding `x` source bytes.
 * Specifically, it returns `x / 2`.
 * @param x
 */ export function decodedLen(x) {
    return x >>> 1;
}
/**
 * DecodeString returns the bytes represented by the hexadecimal string `s`.
 * DecodeString expects that src contains only hexadecimal characters and that
 * src has even length.
 * If the input is malformed, DecodeString will throw an error.
 * @param s the `string` to decode to `Uint8Array`
 */ export function decodeString(s) {
    return decode(new TextEncoder().encode(s));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjg2LjAvZW5jb2RpbmcvaGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFBvcnRlZCBmcm9tIEdvXG4vLyBodHRwczovL2dpdGh1Yi5jb20vZ29sYW5nL2dvL2Jsb2IvZ28xLjEyLjUvc3JjL2VuY29kaW5nL2hleC9oZXguZ29cbi8vIENvcHlyaWdodCAyMDA5IFRoZSBHbyBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGVcbi8vIGxpY2Vuc2UgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZS5cbi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbmNvbnN0IGhleFRhYmxlID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKFwiMDEyMzQ1Njc4OWFiY2RlZlwiKTtcblxuLyoqXG4gKiBFcnJJbnZhbGlkQnl0ZSB0YWtlcyBhbiBpbnZhbGlkIGJ5dGUgYW5kIHJldHVybnMgYW4gRXJyb3IuXG4gKiBAcGFyYW0gYnl0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXJySW52YWxpZEJ5dGUoYnl0ZTogbnVtYmVyKTogRXJyb3Ige1xuICByZXR1cm4gbmV3IEVycm9yKFxuICAgIFwiZW5jb2RpbmcvaGV4OiBpbnZhbGlkIGJ5dGU6IFwiICtcbiAgICAgIG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShuZXcgVWludDhBcnJheShbYnl0ZV0pKSxcbiAgKTtcbn1cblxuLyoqIEVyckxlbmd0aCByZXR1cm5zIGFuIGVycm9yIGFib3V0IG9kZCBzdHJpbmcgbGVuZ3RoLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVyckxlbmd0aCgpOiBFcnJvciB7XG4gIHJldHVybiBuZXcgRXJyb3IoXCJlbmNvZGluZy9oZXg6IG9kZCBsZW5ndGggaGV4IHN0cmluZ1wiKTtcbn1cblxuLy8gZnJvbUhleENoYXIgY29udmVydHMgYSBoZXggY2hhcmFjdGVyIGludG8gaXRzIHZhbHVlLlxuZnVuY3Rpb24gZnJvbUhleENoYXIoYnl0ZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gJzAnIDw9IGJ5dGUgJiYgYnl0ZSA8PSAnOSdcbiAgaWYgKDQ4IDw9IGJ5dGUgJiYgYnl0ZSA8PSA1NykgcmV0dXJuIGJ5dGUgLSA0ODtcbiAgLy8gJ2EnIDw9IGJ5dGUgJiYgYnl0ZSA8PSAnZidcbiAgaWYgKDk3IDw9IGJ5dGUgJiYgYnl0ZSA8PSAxMDIpIHJldHVybiBieXRlIC0gOTcgKyAxMDtcbiAgLy8gJ0EnIDw9IGJ5dGUgJiYgYnl0ZSA8PSAnRidcbiAgaWYgKDY1IDw9IGJ5dGUgJiYgYnl0ZSA8PSA3MCkgcmV0dXJuIGJ5dGUgLSA2NSArIDEwO1xuXG4gIHRocm93IGVyckludmFsaWRCeXRlKGJ5dGUpO1xufVxuXG4vKipcbiAqIEVuY29kZWRMZW4gcmV0dXJucyB0aGUgbGVuZ3RoIG9mIGFuIGVuY29kaW5nIG9mIG4gc291cmNlIGJ5dGVzLiBTcGVjaWZpY2FsbHksXG4gKiBpdCByZXR1cm5zIG4gKiAyLlxuICogQHBhcmFtIG5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuY29kZWRMZW4objogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIG4gKiAyO1xufVxuXG4vKipcbiAqIEVuY29kZSBlbmNvZGVzIGBzcmNgIGludG8gYGVuY29kZWRMZW4oc3JjLmxlbmd0aClgIGJ5dGVzLlxuICogQHBhcmFtIHNyY1xuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlKHNyYzogVWludDhBcnJheSk6IFVpbnQ4QXJyYXkge1xuICBjb25zdCBkc3QgPSBuZXcgVWludDhBcnJheShlbmNvZGVkTGVuKHNyYy5sZW5ndGgpKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBkc3QubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCB2ID0gc3JjW2ldO1xuICAgIGRzdFtpICogMl0gPSBoZXhUYWJsZVt2ID4+IDRdO1xuICAgIGRzdFtpICogMiArIDFdID0gaGV4VGFibGVbdiAmIDB4MGZdO1xuICB9XG4gIHJldHVybiBkc3Q7XG59XG5cbi8qKlxuICogRW5jb2RlVG9TdHJpbmcgcmV0dXJucyB0aGUgaGV4YWRlY2ltYWwgZW5jb2Rpbmcgb2YgYHNyY2AuXG4gKiBAcGFyYW0gc3JjXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmNvZGVUb1N0cmluZyhzcmM6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICByZXR1cm4gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKGVuY29kZShzcmMpKTtcbn1cblxuLyoqXG4gKiBEZWNvZGUgZGVjb2RlcyBgc3JjYCBpbnRvIGBkZWNvZGVkTGVuKHNyYy5sZW5ndGgpYCBieXRlc1xuICogSWYgdGhlIGlucHV0IGlzIG1hbGZvcm1lZCBhbiBlcnJvciB3aWxsIGJlIHRocm93blxuICogdGhlIGVycm9yLlxuICogQHBhcmFtIHNyY1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVjb2RlKHNyYzogVWludDhBcnJheSk6IFVpbnQ4QXJyYXkge1xuICBjb25zdCBkc3QgPSBuZXcgVWludDhBcnJheShkZWNvZGVkTGVuKHNyYy5sZW5ndGgpKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBkc3QubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBhID0gZnJvbUhleENoYXIoc3JjW2kgKiAyXSk7XG4gICAgY29uc3QgYiA9IGZyb21IZXhDaGFyKHNyY1tpICogMiArIDFdKTtcbiAgICBkc3RbaV0gPSAoYSA8PCA0KSB8IGI7XG4gIH1cblxuICBpZiAoc3JjLmxlbmd0aCAlIDIgPT0gMSkge1xuICAgIC8vIENoZWNrIGZvciBpbnZhbGlkIGNoYXIgYmVmb3JlIHJlcG9ydGluZyBiYWQgbGVuZ3RoLFxuICAgIC8vIHNpbmNlIHRoZSBpbnZhbGlkIGNoYXIgKGlmIHByZXNlbnQpIGlzIGFuIGVhcmxpZXIgcHJvYmxlbS5cbiAgICBmcm9tSGV4Q2hhcihzcmNbZHN0Lmxlbmd0aCAqIDJdKTtcbiAgICB0aHJvdyBlcnJMZW5ndGgoKTtcbiAgfVxuXG4gIHJldHVybiBkc3Q7XG59XG5cbi8qKlxuICogRGVjb2RlZExlbiByZXR1cm5zIHRoZSBsZW5ndGggb2YgZGVjb2RpbmcgYHhgIHNvdXJjZSBieXRlcy5cbiAqIFNwZWNpZmljYWxseSwgaXQgcmV0dXJucyBgeCAvIDJgLlxuICogQHBhcmFtIHhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZWRMZW4oeDogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIHggPj4+IDE7XG59XG5cbi8qKlxuICogRGVjb2RlU3RyaW5nIHJldHVybnMgdGhlIGJ5dGVzIHJlcHJlc2VudGVkIGJ5IHRoZSBoZXhhZGVjaW1hbCBzdHJpbmcgYHNgLlxuICogRGVjb2RlU3RyaW5nIGV4cGVjdHMgdGhhdCBzcmMgY29udGFpbnMgb25seSBoZXhhZGVjaW1hbCBjaGFyYWN0ZXJzIGFuZCB0aGF0XG4gKiBzcmMgaGFzIGV2ZW4gbGVuZ3RoLlxuICogSWYgdGhlIGlucHV0IGlzIG1hbGZvcm1lZCwgRGVjb2RlU3RyaW5nIHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKiBAcGFyYW0gcyB0aGUgYHN0cmluZ2AgdG8gZGVjb2RlIHRvIGBVaW50OEFycmF5YFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVjb2RlU3RyaW5nKHM6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICByZXR1cm4gZGVjb2RlKG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShzKSk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsaUJBQWlCO0FBQ2pCLHFFQUFxRTtBQUNyRSxzREFBc0Q7QUFDdEQscURBQXFEO0FBQ3JELGlEQUFpRDtBQUNqRCwwRUFBMEU7QUFFMUUsTUFBTSxRQUFRLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQUFBQztBQUU5RDs7O0NBR0MsR0FDRCxPQUFPLFNBQVMsY0FBYyxDQUFDLElBQVksRUFBUztJ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