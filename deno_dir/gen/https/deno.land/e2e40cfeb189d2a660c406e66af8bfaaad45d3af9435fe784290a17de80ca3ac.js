// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import * as hex from "../encoding/hex.ts";
import * as base64 from "../encoding/base64.ts";
import { normalizeEncoding, notImplemented } from "./_utils.ts";
const notImplementedEncodings = [
    "ascii",
    "binary",
    "latin1",
    "ucs2",
    "utf16le", 
];
function checkEncoding(encoding = "utf8", strict = true) {
    if (typeof encoding !== "string" || strict && encoding === "") {
        if (!strict) return "utf8";
        throw new TypeError(`Unkown encoding: ${encoding}`);
    }
    const normalized = normalizeEncoding(encoding);
    if (normalized === undefined) {
        throw new TypeError(`Unkown encoding: ${encoding}`);
    }
    if (notImplementedEncodings.includes(encoding)) {
        notImplemented(`"${encoding}" encoding`);
    }
    return normalized;
}
// https://github.com/nodejs/node/blob/56dbe466fdbc598baea3bfce289bf52b97b8b8f7/lib/buffer.js#L598
const encodingOps = {
    utf8: {
        byteLength: (string)=>new TextEncoder().encode(string).byteLength
    },
    ucs2: {
        byteLength: (string)=>string.length * 2
    },
    utf16le: {
        byteLength: (string)=>string.length * 2
    },
    latin1: {
        byteLength: (string)=>string.length
    },
    ascii: {
        byteLength: (string)=>string.length
    },
    base64: {
        byteLength: (string)=>base64ByteLength(string, string.length)
    },
    hex: {
        byteLength: (string)=>string.length >>> 1
    }
};
function base64ByteLength(str, bytes) {
    // Handle padding
    if (str.charCodeAt(bytes - 1) === 0x3d) bytes--;
    if (bytes > 1 && str.charCodeAt(bytes - 1) === 0x3d) bytes--;
    // Base64 ratio: 3/4
    return bytes * 3 >>> 2;
}
/**
 * See also https://nodejs.org/api/buffer.html
 */ export class Buffer extends Uint8Array {
    /**
   * Allocates a new Buffer of size bytes.
   */ static alloc(size, fill, encoding = "utf8") {
        if (typeof size !== "number") {
            throw new TypeError(`The "size" argument must be of type number. Received type ${typeof size}`);
        }
        const buf = new Buffer(size);
        if (size === 0) return buf;
        let bufFill;
        if (typeof fill === "string") {
            const clearEncoding = checkEncoding(encoding);
            if (typeof fill === "string" && fill.length === 1 && clearEncoding === "utf8") {
                buf.fill(fill.charCodeAt(0));
            } else bufFill = Buffer.from(fill, clearEncoding);
        } else if (typeof fill === "number") {
            buf.fill(fill);
        } else if (fill instanceof Uint8Array) {
            if (fill.length === 0) {
                throw new TypeError(`The argument "value" is invalid. Received ${fill.constructor.name} []`);
            }
            bufFill = fill;
        }
        if (bufFill) {
            if (bufFill.length > buf.length) {
                bufFill = bufFill.subarray(0, buf.length);
            }
            let offset = 0;
            while(offset < size){
                buf.set(bufFill, offset);
                offset += bufFill.length;
                if (offset + bufFill.length >= size) break;
            }
            if (offset !== size) {
                buf.set(bufFill.subarray(0, size - offset), offset);
            }
        }
        return buf;
    }
    static allocUnsafe(size) {
        return new Buffer(size);
    }
    /**
   * Returns the byte length of a string when encoded. This is not the same as
   * String.prototype.length, which does not account for the encoding that is
   * used to convert the string into bytes.
   */ static byteLength(string, encoding = "utf8") {
        if (typeof string != "string") return string.byteLength;
        encoding = normalizeEncoding(encoding) || "utf8";
        return encodingOps[encoding].byteLength(string);
    }
    /**
   * Returns a new Buffer which is the result of concatenating all the Buffer
   * instances in the list together.
   */ static concat(list, totalLength) {
        if (totalLength == undefined) {
            totalLength = 0;
            for (const buf of list){
                totalLength += buf.length;
            }
        }
        const buffer = Buffer.allocUnsafe(totalLength);
        let pos = 0;
        for (const item of list){
            let buf1;
            if (!(item instanceof Buffer)) {
                buf1 = Buffer.from(item);
            } else {
                buf1 = item;
            }
            buf1.copy(buffer, pos);
            pos += buf1.length;
        }
        return buffer;
    }
    static from(// deno-lint-ignore no-explicit-any
    value, offsetOrEncoding, length) {
        const offset = typeof offsetOrEncoding === "string" ? undefined : offsetOrEncoding;
        let encoding = typeof offsetOrEncoding === "string" ? offsetOrEncoding : undefined;
        if (typeof value == "string") {
            encoding = checkEncoding(encoding, false);
            if (encoding === "hex") return new Buffer(hex.decodeString(value).buffer);
            if (encoding === "base64") return new Buffer(base64.decode(value).buffer);
            return new Buffer(new TextEncoder().encode(value).buffer);
        }
        // workaround for https://github.com/microsoft/TypeScript/issues/38446
        return new Buffer(value, offset, length);
    }
    /**
   * Returns true if obj is a Buffer, false otherwise.
   */ static isBuffer(obj) {
        return obj instanceof Buffer;
    }
    // deno-lint-ignore no-explicit-any
    static isEncoding(encoding) {
        return typeof encoding === "string" && encoding.length !== 0 && normalizeEncoding(encoding) !== undefined;
    }
    /**
   * Copies data from a region of buf to a region in target, even if the target
   * memory region overlaps with buf.
   */ copy(targetBuffer, targetStart = 0, sourceStart = 0, sourceEnd = this.length) {
        const sourceBuffer = this.subarray(sourceStart, sourceEnd).subarray(0, Math.max(0, targetBuffer.length - targetStart));
        if (sourceBuffer.length === 0) return 0;
        targetBuffer.set(sourceBuffer, targetStart);
        return sourceBuffer.length;
    }
    /*
   * Returns true if both buf and otherBuffer have exactly the same bytes, false otherwise.
   */ equals(otherBuffer) {
        if (!(otherBuffer instanceof Uint8Array)) {
            throw new TypeError(`The "otherBuffer" argument must be an instance of Buffer or Uint8Array. Received type ${typeof otherBuffer}`);
        }
        if (this === otherBuffer) return true;
        if (this.byteLength !== otherBuffer.byteLength) return false;
        for(let i = 0; i < this.length; i++){
            if (this[i] !== otherBuffer[i]) return false;
        }
        return true;
    }
    readBigInt64BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getBigInt64(offset);
    }
    readBigInt64LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getBigInt64(offset, true);
    }
    readBigUInt64BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getBigUint64(offset);
    }
    readBigUInt64LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getBigUint64(offset, true);
    }
    readDoubleBE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getFloat64(offset);
    }
    readDoubleLE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getFloat64(offset, true);
    }
    readFloatBE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getFloat32(offset);
    }
    readFloatLE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getFloat32(offset, true);
    }
    readInt8(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getInt8(offset);
    }
    readInt16BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getInt16(offset);
    }
    readInt16LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getInt16(offset, true);
    }
    readInt32BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getInt32(offset);
    }
    readInt32LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getInt32(offset, true);
    }
    readUInt8(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getUint8(offset);
    }
    readUInt16BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getUint16(offset);
    }
    readUInt16LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getUint16(offset, true);
    }
    readUInt32BE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getUint32(offset);
    }
    readUInt32LE(offset = 0) {
        return new DataView(this.buffer, this.byteOffset, this.byteLength).getUint32(offset, true);
    }
    /**
   * Returns a new Buffer that references the same memory as the original, but
   * offset and cropped by the start and end indices.
   */ slice(begin = 0, end = this.length) {
        // workaround for https://github.com/microsoft/TypeScript/issues/38665
        return this.subarray(begin, end);
    }
    /**
   * Returns a JSON representation of buf. JSON.stringify() implicitly calls
   * this function when stringifying a Buffer instance.
   */ toJSON() {
        return {
            type: "Buffer",
            data: Array.from(this)
        };
    }
    /**
   * Decodes buf to a string according to the specified character encoding in
   * encoding. start and end may be passed to decode only a subset of buf.
   */ toString(encoding = "utf8", start = 0, end = this.length) {
        encoding = checkEncoding(encoding);
        const b = this.subarray(start, end);
        if (encoding === "hex") return hex.encodeToString(b);
        if (encoding === "base64") return base64.encode(b.buffer);
        return new TextDecoder(encoding).decode(b);
    }
    /**
   * Writes string to buf at offset according to the character encoding in
   * encoding. The length parameter is the number of bytes to write. If buf did
   * not contain enough space to fit the entire string, only part of string will
   * be written. However, partially encoded characters will not be written.
   */ write(string, offset = 0, length = this.length) {
        return new TextEncoder().encodeInto(string, this.subarray(offset, offset + length)).written;
    }
    writeBigInt64BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setBigInt64(offset, value);
        return offset + 4;
    }
    writeBigInt64LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setBigInt64(offset, value, true);
        return offset + 4;
    }
    writeBigUInt64BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setBigUint64(offset, value);
        return offset + 4;
    }
    writeBigUInt64LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setBigUint64(offset, value, true);
        return offset + 4;
    }
    writeDoubleBE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setFloat64(offset, value);
        return offset + 8;
    }
    writeDoubleLE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setFloat64(offset, value, true);
        return offset + 8;
    }
    writeFloatBE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setFloat32(offset, value);
        return offset + 4;
    }
    writeFloatLE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setFloat32(offset, value, true);
        return offset + 4;
    }
    writeInt8(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setInt8(offset, value);
        return offset + 1;
    }
    writeInt16BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setInt16(offset, value);
        return offset + 2;
    }
    writeInt16LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setInt16(offset, value, true);
        return offset + 2;
    }
    writeInt32BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint32(offset, value);
        return offset + 4;
    }
    writeInt32LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setInt32(offset, value, true);
        return offset + 4;
    }
    writeUInt8(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint8(offset, value);
        return offset + 1;
    }
    writeUInt16BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint16(offset, value);
        return offset + 2;
    }
    writeUInt16LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint16(offset, value, true);
        return offset + 2;
    }
    writeUInt32BE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint32(offset, value);
        return offset + 4;
    }
    writeUInt32LE(value, offset = 0) {
        new DataView(this.buffer, this.byteOffset, this.byteLength).setUint32(offset, value, true);
        return offset + 4;
    }
}
export default {
    Buffer
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjg2LjAvbm9kZS9idWZmZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbmltcG9ydCAqIGFzIGhleCBmcm9tIFwiLi4vZW5jb2RpbmcvaGV4LnRzXCI7XG5pbXBvcnQgKiBhcyBiYXNlNjQgZnJvbSBcIi4uL2VuY29kaW5nL2Jhc2U2NC50c1wiO1xuaW1wb3J0IHsgRW5jb2RpbmdzLCBub3JtYWxpemVFbmNvZGluZywgbm90SW1wbGVtZW50ZWQgfSBmcm9tIFwiLi9fdXRpbHMudHNcIjtcblxuY29uc3Qgbm90SW1wbGVtZW50ZWRFbmNvZGluZ3MgPSBbXG4gIFwiYXNjaWlcIixcbiAgXCJiaW5hcnlcIixcbiAgXCJsYXRpbjFcIixcbiAgXCJ1Y3MyXCIsXG4gIFwidXRmMTZsZVwiLFxuXTtcblxuZnVuY3Rpb24gY2hlY2tFbmNvZGluZyhlbmNvZGluZyA9IFwidXRmOFwiLCBzdHJpY3QgPSB0cnVlKTogRW5jb2RpbmdzIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gXCJzdHJpbmdcIiB8fCAoc3RyaWN0ICYmIGVuY29kaW5nID09PSBcIlwiKSkge1xuICAgIGlmICghc3RyaWN0KSByZXR1cm4gXCJ1dGY4XCI7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5rb3duIGVuY29kaW5nOiAke2VuY29kaW5nfWApO1xuICB9XG5cbiAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZUVuY29kaW5nKGVuY29kaW5nKTtcblxuICBpZiAobm9ybWFsaXplZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5rb3duIGVuY29kaW5nOiAke2VuY29kaW5nfWApO1xuICB9XG5cbiAgaWYgKG5vdEltcGxlbWVudGVkRW5jb2RpbmdzLmluY2x1ZGVzKGVuY29kaW5nKSkge1xuICAgIG5vdEltcGxlbWVudGVkKGBcIiR7ZW5jb2Rpbmd9XCIgZW5jb2RpbmdgKTtcbiAgfVxuXG4gIHJldHVybiBub3JtYWxpemVkO1xufVxuXG5pbnRlcmZhY2UgRW5jb2RpbmdPcCB7XG4gIGJ5dGVMZW5ndGgoc3RyaW5nOiBzdHJpbmcpOiBudW1iZXI7XG59XG5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9ibG9iLzU2ZGJlNDY2ZmRiYzU5OGJhZWEzYmZjZTI4OWJmNTJiOTdiOGI4ZjcvbGliL2J1ZmZlci5qcyNMNTk4XG5jb25zdCBlbmNvZGluZ09wczogeyBba2V5OiBzdHJpbmddOiBFbmNvZGluZ09wIH0gPSB7XG4gIHV0Zjg6IHtcbiAgICBieXRlTGVuZ3RoOiAoc3RyaW5nOiBzdHJpbmcpOiBudW1iZXIgPT5cbiAgICAgIG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShzdHJpbmcpLmJ5dGVMZW5ndGgsXG4gIH0sXG4gIHVjczI6IHtcbiAgICBieXRlTGVuZ3RoOiAoc3RyaW5nOiBzdHJpbmcpOiBudW1iZXIgPT4gc3RyaW5nLmxlbmd0aCAqIDIsXG4gIH0sXG4gIHV0ZjE2bGU6IHtcbiAgICBieXRlTGVuZ3RoOiAoc3RyaW5nOiBzdHJpbmcpOiBudW1iZXIgPT4gc3RyaW5nLmxlbmd0aCAqIDIsXG4gIH0sXG4gIGxhdGluMToge1xuICAgIGJ5dGVMZW5ndGg6IChzdHJpbmc6IHN0cmluZyk6IG51bWJlciA9PiBzdHJpbmcubGVuZ3RoLFxuICB9LFxuICBhc2NpaToge1xuICAgIGJ5dGVMZW5ndGg6IChzdHJpbmc6IHN0cmluZyk6IG51bWJlciA9PiBzdHJpbmcubGVuZ3RoLFxuICB9LFxuICBiYXNlNjQ6IHtcbiAgICBieXRlTGVuZ3RoOiAoc3RyaW5nOiBzdHJpbmcpOiBudW1iZXIgPT5cbiAgICAgIGJhc2U2NEJ5dGVMZW5ndGgoc3RyaW5nLCBzdHJpbmcubGVuZ3RoKSxcbiAgfSxcbiAgaGV4OiB7XG4gICAgYnl0ZUxlbmd0aDogKHN0cmluZzogc3RyaW5nKTogbnVtYmVyID0+IHN0cmluZy5sZW5ndGggPj4+IDEsXG4gIH0sXG59O1xuXG5mdW5jdGlvbiBiYXNlNjRCeXRlTGVuZ3RoKHN0cjogc3RyaW5nLCBieXRlczogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gSGFuZGxlIHBhZGRpbmdcbiAgaWYgKHN0ci5jaGFyQ29kZUF0KGJ5dGVzIC0gMSkgPT09IDB4M2QpIGJ5dGVzLS07XG4gIGlmIChieXRlcyA+IDEgJiYgc3RyLmNoYXJDb2RlQXQoYnl0ZXMgLSAxKSA9PT0gMHgzZCkgYnl0ZXMtLTtcblxuICAvLyBCYXNlNjQgcmF0aW86IDMvNFxuICByZXR1cm4gKGJ5dGVzICogMykgPj4+IDI7XG59XG5cbi8qKlxuICogU2VlIGFsc28gaHR0cHM6Ly9ub2RlanMub3JnL2FwaS9idWZmZXIuaHRtbFxuICovXG5leHBvcnQgY2xhc3MgQnVmZmVyIGV4dGVuZHMgVWludDhBcnJheSB7XG4gIC8qKlxuICAgKiBBbGxvY2F0ZXMgYSBuZXcgQnVmZmVyIG9mIHNpemUgYnl0ZXMuXG4gICAqL1xuICBzdGF0aWMgYWxsb2MoXG4gICAgc2l6ZTogbnVtYmVyLFxuICAgIGZpbGw/OiBudW1iZXIgfCBzdHJpbmcgfCBVaW50OEFycmF5IHwgQnVmZmVyLFxuICAgIGVuY29kaW5nID0gXCJ1dGY4XCIsXG4gICk6IEJ1ZmZlciB7XG4gICAgaWYgKHR5cGVvZiBzaXplICE9PSBcIm51bWJlclwiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICBgVGhlIFwic2l6ZVwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuIFJlY2VpdmVkIHR5cGUgJHt0eXBlb2Ygc2l6ZX1gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCBidWYgPSBuZXcgQnVmZmVyKHNpemUpO1xuICAgIGlmIChzaXplID09PSAwKSByZXR1cm4gYnVmO1xuXG4gICAgbGV0IGJ1ZkZpbGw7XG4gICAgaWYgKHR5cGVvZiBmaWxsID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBjb25zdCBjbGVhckVuY29kaW5nID0gY2hlY2tFbmNvZGluZyhlbmNvZGluZyk7XG4gICAgICBpZiAoXG4gICAgICAgIHR5cGVvZiBmaWxsID09PSBcInN0cmluZ1wiICYmXG4gICAgICAgIGZpbGwubGVuZ3RoID09PSAxICYmXG4gICAgICAgIGNsZWFyRW5jb2RpbmcgPT09IFwidXRmOFwiXG4gICAgICApIHtcbiAgICAgICAgYnVmLmZpbGwoZmlsbC5jaGFyQ29kZUF0KDApKTtcbiAgICAgIH0gZWxzZSBidWZGaWxsID0gQnVmZmVyLmZyb20oZmlsbCwgY2xlYXJFbmNvZGluZyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZmlsbCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgYnVmLmZpbGwoZmlsbCk7XG4gICAgfSBlbHNlIGlmIChmaWxsIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgaWYgKGZpbGwubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgYFRoZSBhcmd1bWVudCBcInZhbHVlXCIgaXMgaW52YWxpZC4gUmVjZWl2ZWQgJHtmaWxsLmNvbnN0cnVjdG9yLm5hbWV9IFtdYCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgYnVmRmlsbCA9IGZpbGw7XG4gICAgfVxuXG4gICAgaWYgKGJ1ZkZpbGwpIHtcbiAgICAgIGlmIChidWZGaWxsLmxlbmd0aCA+IGJ1Zi5sZW5ndGgpIHtcbiAgICAgICAgYnVmRmlsbCA9IGJ1ZkZpbGwuc3ViYXJyYXkoMCwgYnVmLmxlbmd0aCk7XG4gICAgICB9XG5cbiAgICAgIGxldCBvZmZzZXQgPSAwO1xuICAgICAgd2hpbGUgKG9mZnNldCA8IHNpemUpIHtcbiAgICAgICAgYnVmLnNldChidWZGaWxsLCBvZmZzZXQpO1xuICAgICAgICBvZmZzZXQgKz0gYnVmRmlsbC5sZW5ndGg7XG4gICAgICAgIGlmIChvZmZzZXQgKyBidWZGaWxsLmxlbmd0aCA+PSBzaXplKSBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChvZmZzZXQgIT09IHNpemUpIHtcbiAgICAgICAgYnVmLnNldChidWZGaWxsLnN1YmFycmF5KDAsIHNpemUgLSBvZmZzZXQpLCBvZmZzZXQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBidWY7XG4gIH1cblxuICBzdGF0aWMgYWxsb2NVbnNhZmUoc2l6ZTogbnVtYmVyKTogQnVmZmVyIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzaXplKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBieXRlIGxlbmd0aCBvZiBhIHN0cmluZyB3aGVuIGVuY29kZWQuIFRoaXMgaXMgbm90IHRoZSBzYW1lIGFzXG4gICAqIFN0cmluZy5wcm90b3R5cGUubGVuZ3RoLCB3aGljaCBkb2VzIG5vdCBhY2NvdW50IGZvciB0aGUgZW5jb2RpbmcgdGhhdCBpc1xuICAgKiB1c2VkIHRvIGNvbnZlcnQgdGhlIHN0cmluZyBpbnRvIGJ5dGVzLlxuICAgKi9cbiAgc3RhdGljIGJ5dGVMZW5ndGgoXG4gICAgc3RyaW5nOiBzdHJpbmcgfCBCdWZmZXIgfCBBcnJheUJ1ZmZlclZpZXcgfCBBcnJheUJ1ZmZlciB8IFNoYXJlZEFycmF5QnVmZmVyLFxuICAgIGVuY29kaW5nID0gXCJ1dGY4XCIsXG4gICk6IG51bWJlciB7XG4gICAgaWYgKHR5cGVvZiBzdHJpbmcgIT0gXCJzdHJpbmdcIikgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoO1xuXG4gICAgZW5jb2RpbmcgPSBub3JtYWxpemVFbmNvZGluZyhlbmNvZGluZykgfHwgXCJ1dGY4XCI7XG4gICAgcmV0dXJuIGVuY29kaW5nT3BzW2VuY29kaW5nXS5ieXRlTGVuZ3RoKHN0cmluZyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIG5ldyBCdWZmZXIgd2hpY2ggaXMgdGhlIHJlc3VsdCBvZiBjb25jYXRlbmF0aW5nIGFsbCB0aGUgQnVmZmVyXG4gICAqIGluc3RhbmNlcyBpbiB0aGUgbGlzdCB0b2dldGhlci5cbiAgICovXG4gIHN0YXRpYyBjb25jYXQobGlzdDogQnVmZmVyW10gfCBVaW50OEFycmF5W10sIHRvdGFsTGVuZ3RoPzogbnVtYmVyKTogQnVmZmVyIHtcbiAgICBpZiAodG90YWxMZW5ndGggPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0b3RhbExlbmd0aCA9IDA7XG4gICAgICBmb3IgKGNvbnN0IGJ1ZiBvZiBsaXN0KSB7XG4gICAgICAgIHRvdGFsTGVuZ3RoICs9IGJ1Zi5sZW5ndGg7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKHRvdGFsTGVuZ3RoKTtcbiAgICBsZXQgcG9zID0gMDtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgbGlzdCkge1xuICAgICAgbGV0IGJ1ZjogQnVmZmVyO1xuICAgICAgaWYgKCEoaXRlbSBpbnN0YW5jZW9mIEJ1ZmZlcikpIHtcbiAgICAgICAgYnVmID0gQnVmZmVyLmZyb20oaXRlbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBidWYgPSBpdGVtO1xuICAgICAgfVxuICAgICAgYnVmLmNvcHkoYnVmZmVyLCBwb3MpO1xuICAgICAgcG9zICs9IGJ1Zi5sZW5ndGg7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGxvY2F0ZXMgYSBuZXcgQnVmZmVyIHVzaW5nIGFuIGFycmF5IG9mIGJ5dGVzIGluIHRoZSByYW5nZSAwIOKAkyAyNTUuIEFycmF5XG4gICAqIGVudHJpZXMgb3V0c2lkZSB0aGF0IHJhbmdlIHdpbGwgYmUgdHJ1bmNhdGVkIHRvIGZpdCBpbnRvIGl0LlxuICAgKi9cbiAgc3RhdGljIGZyb20oYXJyYXk6IG51bWJlcltdKTogQnVmZmVyO1xuICAvKipcbiAgICogVGhpcyBjcmVhdGVzIGEgdmlldyBvZiB0aGUgQXJyYXlCdWZmZXIgd2l0aG91dCBjb3B5aW5nIHRoZSB1bmRlcmx5aW5nXG4gICAqIG1lbW9yeS4gRm9yIGV4YW1wbGUsIHdoZW4gcGFzc2VkIGEgcmVmZXJlbmNlIHRvIHRoZSAuYnVmZmVyIHByb3BlcnR5IG9mIGFcbiAgICogVHlwZWRBcnJheSBpbnN0YW5jZSwgdGhlIG5ld2x5IGNyZWF0ZWQgQnVmZmVyIHdpbGwgc2hhcmUgdGhlIHNhbWUgYWxsb2NhdGVkXG4gICAqIG1lbW9yeSBhcyB0aGUgVHlwZWRBcnJheS5cbiAgICovXG4gIHN0YXRpYyBmcm9tKFxuICAgIGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlciB8IFNoYXJlZEFycmF5QnVmZmVyLFxuICAgIGJ5dGVPZmZzZXQ/OiBudW1iZXIsXG4gICAgbGVuZ3RoPzogbnVtYmVyLFxuICApOiBCdWZmZXI7XG4gIC8qKlxuICAgKiBDb3BpZXMgdGhlIHBhc3NlZCBidWZmZXIgZGF0YSBvbnRvIGEgbmV3IEJ1ZmZlciBpbnN0YW5jZS5cbiAgICovXG4gIHN0YXRpYyBmcm9tKGJ1ZmZlcjogQnVmZmVyIHwgVWludDhBcnJheSk6IEJ1ZmZlcjtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgQnVmZmVyIGNvbnRhaW5pbmcgc3RyaW5nLlxuICAgKi9cbiAgc3RhdGljIGZyb20oc3RyaW5nOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKTogQnVmZmVyO1xuICBzdGF0aWMgZnJvbShcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIHZhbHVlOiBhbnksXG4gICAgb2Zmc2V0T3JFbmNvZGluZz86IG51bWJlciB8IHN0cmluZyxcbiAgICBsZW5ndGg/OiBudW1iZXIsXG4gICk6IEJ1ZmZlciB7XG4gICAgY29uc3Qgb2Zmc2V0ID0gdHlwZW9mIG9mZnNldE9yRW5jb2RpbmcgPT09IFwic3RyaW5nXCJcbiAgICAgID8gdW5kZWZpbmVkXG4gICAgICA6IG9mZnNldE9yRW5jb2Rpbmc7XG4gICAgbGV0IGVuY29kaW5nID0gdHlwZW9mIG9mZnNldE9yRW5jb2RpbmcgPT09IFwic3RyaW5nXCJcbiAgICAgID8gb2Zmc2V0T3JFbmNvZGluZ1xuICAgICAgOiB1bmRlZmluZWQ7XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09IFwic3RyaW5nXCIpIHtcbiAgICAgIGVuY29kaW5nID0gY2hlY2tFbmNvZGluZyhlbmNvZGluZywgZmFsc2UpO1xuICAgICAgaWYgKGVuY29kaW5nID09PSBcImhleFwiKSByZXR1cm4gbmV3IEJ1ZmZlcihoZXguZGVjb2RlU3RyaW5nKHZhbHVlKS5idWZmZXIpO1xuICAgICAgaWYgKGVuY29kaW5nID09PSBcImJhc2U2NFwiKSByZXR1cm4gbmV3IEJ1ZmZlcihiYXNlNjQuZGVjb2RlKHZhbHVlKS5idWZmZXIpO1xuICAgICAgcmV0dXJuIG5ldyBCdWZmZXIobmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHZhbHVlKS5idWZmZXIpO1xuICAgIH1cblxuICAgIC8vIHdvcmthcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzg0NDZcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcih2YWx1ZSwgb2Zmc2V0ISwgbGVuZ3RoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgb2JqIGlzIGEgQnVmZmVyLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBzdGF0aWMgaXNCdWZmZXIob2JqOiB1bmtub3duKTogb2JqIGlzIEJ1ZmZlciB7XG4gICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIEJ1ZmZlcjtcbiAgfVxuXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIHN0YXRpYyBpc0VuY29kaW5nKGVuY29kaW5nOiBhbnkpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKFxuICAgICAgdHlwZW9mIGVuY29kaW5nID09PSBcInN0cmluZ1wiICYmXG4gICAgICBlbmNvZGluZy5sZW5ndGggIT09IDAgJiZcbiAgICAgIG5vcm1hbGl6ZUVuY29kaW5nKGVuY29kaW5nKSAhPT0gdW5kZWZpbmVkXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb3BpZXMgZGF0YSBmcm9tIGEgcmVnaW9uIG9mIGJ1ZiB0byBhIHJlZ2lvbiBpbiB0YXJnZXQsIGV2ZW4gaWYgdGhlIHRhcmdldFxuICAgKiBtZW1vcnkgcmVnaW9uIG92ZXJsYXBzIHdpdGggYnVmLlxuICAgKi9cbiAgY29weShcbiAgICB0YXJnZXRCdWZmZXI6IEJ1ZmZlciB8IFVpbnQ4QXJyYXksXG4gICAgdGFyZ2V0U3RhcnQgPSAwLFxuICAgIHNvdXJjZVN0YXJ0ID0gMCxcbiAgICBzb3VyY2VFbmQgPSB0aGlzLmxlbmd0aCxcbiAgKTogbnVtYmVyIHtcbiAgICBjb25zdCBzb3VyY2VCdWZmZXIgPSB0aGlzXG4gICAgICAuc3ViYXJyYXkoc291cmNlU3RhcnQsIHNvdXJjZUVuZClcbiAgICAgIC5zdWJhcnJheSgwLCBNYXRoLm1heCgwLCB0YXJnZXRCdWZmZXIubGVuZ3RoIC0gdGFyZ2V0U3RhcnQpKTtcblxuICAgIGlmIChzb3VyY2VCdWZmZXIubGVuZ3RoID09PSAwKSByZXR1cm4gMDtcblxuICAgIHRhcmdldEJ1ZmZlci5zZXQoc291cmNlQnVmZmVyLCB0YXJnZXRTdGFydCk7XG4gICAgcmV0dXJuIHNvdXJjZUJ1ZmZlci5sZW5ndGg7XG4gIH1cblxuICAvKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgYm90aCBidWYgYW5kIG90aGVyQnVmZmVyIGhhdmUgZXhhY3RseSB0aGUgc2FtZSBieXRlcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgZXF1YWxzKG90aGVyQnVmZmVyOiBVaW50OEFycmF5IHwgQnVmZmVyKTogYm9vbGVhbiB7XG4gICAgaWYgKCEob3RoZXJCdWZmZXIgaW5zdGFuY2VvZiBVaW50OEFycmF5KSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgYFRoZSBcIm90aGVyQnVmZmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhbiBpbnN0YW5jZSBvZiBCdWZmZXIgb3IgVWludDhBcnJheS4gUmVjZWl2ZWQgdHlwZSAke3R5cGVvZiBvdGhlckJ1ZmZlcn1gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcyA9PT0gb3RoZXJCdWZmZXIpIHJldHVybiB0cnVlO1xuICAgIGlmICh0aGlzLmJ5dGVMZW5ndGggIT09IG90aGVyQnVmZmVyLmJ5dGVMZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXNbaV0gIT09IG90aGVyQnVmZmVyW2ldKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZWFkQmlnSW50NjRCRShvZmZzZXQgPSAwKTogYmlnaW50IHtcbiAgICByZXR1cm4gbmV3IERhdGFWaWV3KFxuICAgICAgdGhpcy5idWZmZXIsXG4gICAgICB0aGlzLmJ5dGVPZmZzZXQsXG4gICAgICB0aGlzLmJ5dGVMZW5ndGgsXG4gICAgKS5nZXRCaWdJbnQ2NChvZmZzZXQpO1xuICB9XG4gIHJlYWRCaWdJbnQ2NExFKG9mZnNldCA9IDApOiBiaWdpbnQge1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoXG4gICAgICB0aGlzLmJ1ZmZlcixcbiAgICAgIHRoaXMuYnl0ZU9mZnNldCxcbiAgICAgIHRoaXMuYnl0ZUxlbmd0aCxcbiAgICApLmdldEJpZ0ludDY0KG9mZnNldCwgdHJ1ZSk7XG4gIH1cblxuICByZWFkQmlnVUludDY0QkUob2Zmc2V0ID0gMCk6IGJpZ2ludCB7XG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhcbiAgICAgIHRoaXMuYnVmZmVyLFxuICAgICAgdGhpcy5ieXRlT2Zmc2V0LFxuICAgICAgdGhpcy5ieXRlTGVuZ3RoLFxuICAgICkuZ2V0QmlnVWludDY0KG9mZnNldCk7XG4gIH1cbiAgcmVhZEJpZ1VJbnQ2NExFKG9mZnNldCA9IDApOiBiaWdpbnQge1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoXG4gICAgICB0aGlzLmJ1ZmZlcixcbiAgICAgIHRoaXMuYnl0ZU9mZnNldCxcbiAgICAgIHRoaXMuYnl0ZUxlbmd0aCxcbiAgICApLmdldEJpZ1VpbnQ2NChvZmZzZXQsIHRydWUpO1xuICB9XG5cbiAgcmVhZERvdWJsZUJFKG9mZnNldCA9IDApOiBudW1iZXIge1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoXG4gICAgICB0aGlzLmJ1ZmZlcixcbiAgICAgIHRoaXMuYnl0ZU9mZnNldCxcbiAgICAgIHRoaXMuYnl0ZUxlbmd0aCxcbiAgICApLmdldEZsb2F0NjQob2Zmc2V0KTtcbiAgfVxuICByZWFkRG91YmxlTEUob2Zmc2V0ID0gMCk6IG51bWJlciB7XG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhcbiAgICAgIHRoaXMuYnVmZmVyLFxuICAgICAgdGhpcy5ieXRlT2Zmc2V0LFxuICAgICAgdGhpcy5ieXRlTGVuZ3RoLFxuICAgICkuZ2V0RmxvYXQ2NChvZmZzZXQsIHRydWUpO1xuICB9XG5cbiAgcmVhZEZsb2F0QkUob2Zmc2V0ID0gMCk6IG51bWJlciB7XG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhcbiAgICAgIHRoaXMuYnVmZmVyLFxuICAgICAgdGhpcy5ieXRlT2Zmc2V0LFxuICAgICAgdGhpcy5ieXRlTGVuZ3RoLFxuICAgICkuZ2V0RmxvYXQzMihvZmZzZXQpO1xuICB9XG4gIHJlYWRGbG9hdExFKG9mZnNldCA9IDApOiBudW1iZXIge1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoXG4gICAgICB0aGlzLmJ1ZmZlcixcbiAgICAgIHRoaXMuYnl0ZU9mZnNldCxcbiAgICAgIHRoaXMuYnl0ZUxlbmd0aCxcbiAgICApLmdldEZsb2F0MzIob2Zmc2V0LCB0cnVlKTtcbiAgfVxuXG4gIHJlYWRJbnQ4KG9mZnNldCA9IDApOiBudW1iZXIge1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIsIHRoaXMuYnl0ZU9mZnNldCwgdGhpcy5ieXRlTGVuZ3RoKS5nZXRJbnQ4KFxuICAgICAgb2Zmc2V0LFxuICAgICk7XG4gIH1cblxuICByZWFkSW50MTZCRShvZmZzZXQgPSAwKTogbnVtYmVyIHtcbiAgICByZXR1cm4gbmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLCB0aGlzLmJ5dGVPZmZzZXQsIHRoaXMuYnl0ZUxlbmd0aCkuZ2V0SW50MTYoXG4gICAgICBvZmZzZXQsXG4gICAgKTtcbiAgfVxuICByZWFkSW50MTZMRShvZmZzZXQgPSAwKTogbnVtYmVyIHtcbiAgICByZXR1cm4gbmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLCB0aGlzLmJ5dGVPZmZzZXQsIHRoaXMuYnl0ZUxlbmd0aCkuZ2V0SW50MTYoXG4gICAgICBvZmZzZXQsXG4gICAgICB0cnVlLFxuICAgICk7XG4gIH1cblxuICByZWFkSW50MzJCRShvZmZzZXQgPSAwKTogbnVtYmVyIHtcbiAgICByZXR1cm4gbmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLCB0aGlzLmJ5dGVPZmZzZXQsIHRoaXMuYnl0ZUxlbmd0aCkuZ2V0SW50MzIoXG4gICAgICBvZmZzZXQsXG4gICAgKTtcbiAgfVxuICByZWFkSW50MzJMRShvZmZzZXQgPSAwKTogbnVtYmVyIHtcbiAgICByZXR1cm4gbmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLCB0aGlzLmJ5dGVPZmZzZXQsIHRoaXMuYnl0ZUxlbmd0aCkuZ2V0SW50MzIoXG4gICAgICBvZmZzZXQsXG4gICAgICB0cnVlLFxuICAgICk7XG4gIH1cblxuICByZWFkVUludDgob2Zmc2V0ID0gMCk6IG51bWJlciB7XG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlciwgdGhpcy5ieXRlT2Zmc2V0LCB0aGlzLmJ5dGVMZW5ndGgpLmdldFVpbnQ4KFxuICAgICAgb2Zmc2V0LFxuICAgICk7XG4gIH1cblxuICByZWFkVUludDE2QkUob2Zmc2V0ID0gMCk6IG51bWJlciB7XG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhcbiAgICAgIHRoaXMuYnVmZmVyLFxuICAgICAgdGhpcy5ieXRlT2Zmc2V0LFxuICAgICAgdGhpcy5ieXRlTGVuZ3RoLFxuICAgICkuZ2V0VWludDE2KG9mZnNldCk7XG4gIH1cbiAgcmVhZFVJbnQxNkxFKG9mZnNldCA9IDApOiBudW1iZXIge1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoXG4gICAgICB0aGlzLmJ1ZmZlcixcbiAgICAgIHRoaXMuYnl0ZU9mZnNldCxcbiAgICAgIHRoaXMuYnl0ZUxlbmd0aCxcbiAgICApLmdldFVpbnQxNihvZmZzZXQsIHRydWUpO1xuICB9XG5cbiAgcmVhZFVJbnQzMkJFKG9mZnNldCA9IDApOiBudW1iZXIge1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoXG4gICAgICB0aGlzLmJ1ZmZlcixcbiAgICAgIHRoaXMuYnl0ZU9mZnNldCxcbiAgICAgIHRoaXMuYnl0ZUxlbmd0aCxcbiAgICApLmdldFVpbnQzMihvZmZzZXQpO1xuICB9XG4gIHJlYWRVSW50MzJMRShvZmZzZXQgPSAwKTogbnVtYmVyIHtcbiAgICByZXR1cm4gbmV3IERhdGFWaWV3KFxuICAgICAgdGhpcy5idWZmZXIsXG4gICAgICB0aGlzLmJ5dGVPZmZzZXQsXG4gICAgICB0aGlzLmJ5dGVMZW5ndGgsXG4gICAgKS5nZXRVaW50MzIob2Zmc2V0LCB0cnVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbmV3IEJ1ZmZlciB0aGF0IHJlZmVyZW5jZXMgdGhlIHNhbWUgbWVtb3J5IGFzIHRoZSBvcmlnaW5hbCwgYnV0XG4gICAqIG9mZnNldCBhbmQgY3JvcHBlZCBieSB0aGUgc3RhcnQgYW5kIGVuZCBpbmRpY2VzLlxuICAgKi9cbiAgc2xpY2UoYmVnaW4gPSAwLCBlbmQgPSB0aGlzLmxlbmd0aCk6IEJ1ZmZlciB7XG4gICAgLy8gd29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zODY2NVxuICAgIHJldHVybiB0aGlzLnN1YmFycmF5KGJlZ2luLCBlbmQpIGFzIEJ1ZmZlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgSlNPTiByZXByZXNlbnRhdGlvbiBvZiBidWYuIEpTT04uc3RyaW5naWZ5KCkgaW1wbGljaXRseSBjYWxsc1xuICAgKiB0aGlzIGZ1bmN0aW9uIHdoZW4gc3RyaW5naWZ5aW5nIGEgQnVmZmVyIGluc3RhbmNlLlxuICAgKi9cbiAgdG9KU09OKCk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgICByZXR1cm4geyB0eXBlOiBcIkJ1ZmZlclwiLCBkYXRhOiBBcnJheS5mcm9tKHRoaXMpIH07XG4gIH1cblxuICAvKipcbiAgICogRGVjb2RlcyBidWYgdG8gYSBzdHJpbmcgYWNjb3JkaW5nIHRvIHRoZSBzcGVjaWZpZWQgY2hhcmFjdGVyIGVuY29kaW5nIGluXG4gICAqIGVuY29kaW5nLiBzdGFydCBhbmQgZW5kIG1heSBiZSBwYXNzZWQgdG8gZGVjb2RlIG9ubHkgYSBzdWJzZXQgb2YgYnVmLlxuICAgKi9cbiAgdG9TdHJpbmcoZW5jb2RpbmcgPSBcInV0ZjhcIiwgc3RhcnQgPSAwLCBlbmQgPSB0aGlzLmxlbmd0aCk6IHN0cmluZyB7XG4gICAgZW5jb2RpbmcgPSBjaGVja0VuY29kaW5nKGVuY29kaW5nKTtcblxuICAgIGNvbnN0IGIgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpO1xuICAgIGlmIChlbmNvZGluZyA9PT0gXCJoZXhcIikgcmV0dXJuIGhleC5lbmNvZGVUb1N0cmluZyhiKTtcbiAgICBpZiAoZW5jb2RpbmcgPT09IFwiYmFzZTY0XCIpIHJldHVybiBiYXNlNjQuZW5jb2RlKGIuYnVmZmVyKTtcblxuICAgIHJldHVybiBuZXcgVGV4dERlY29kZXIoZW5jb2RpbmcpLmRlY29kZShiKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgc3RyaW5nIHRvIGJ1ZiBhdCBvZmZzZXQgYWNjb3JkaW5nIHRvIHRoZSBjaGFyYWN0ZXIgZW5jb2RpbmcgaW5cbiAgICogZW5jb2RpbmcuIFRoZSBsZW5ndGggcGFyYW1ldGVyIGlzIHRoZSBudW1iZXIgb2YgYnl0ZXMgdG8gd3JpdGUuIElmIGJ1ZiBkaWRcbiAgICogbm90IGNvbnRhaW4gZW5vdWdoIHNwYWNlIHRvIGZpdCB0aGUgZW50aXJlIHN0cmluZywgb25seSBwYXJ0IG9mIHN0cmluZyB3aWxsXG4gICAqIGJlIHdyaXR0ZW4uIEhvd2V2ZXIsIHBhcnRpYWxseSBlbmNvZGVkIGNoYXJhY3RlcnMgd2lsbCBub3QgYmUgd3JpdHRlbi5cbiAgICovXG4gIHdyaXRlKHN0cmluZzogc3RyaW5nLCBvZmZzZXQgPSAwLCBsZW5ndGggPSB0aGlzLmxlbmd0aCk6IG51bWJlciB7XG4gICAgcmV0dXJuIG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZUludG8oXG4gICAgICBzdHJpbmcsXG4gICAgICB0aGlzLnN1YmFycmF5KG9mZnNldCwgb2Zmc2V0ICsgbGVuZ3RoKSxcbiAgICApLndyaXR0ZW47XG4gIH1cblxuICB3cml0ZUJpZ0ludDY0QkUodmFsdWU6IGJpZ2ludCwgb2Zmc2V0ID0gMCk6IG51bWJlciB7XG4gICAgbmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLCB0aGlzLmJ5dGVPZmZzZXQsIHRoaXMuYnl0ZUxlbmd0aCkuc2V0QmlnSW50NjQoXG4gICAgICBvZmZzZXQsXG4gICAgICB2YWx1ZSxcbiAgICApO1xuICAgIHJldHVybiBvZmZzZXQgKyA0O1xuICB9XG4gIHdyaXRlQmlnSW50NjRMRSh2YWx1ZTogYmlnaW50LCBvZmZzZXQgPSAwKTogbnVtYmVyIHtcbiAgICBuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIsIHRoaXMuYnl0ZU9mZnNldCwgdGhpcy5ieXRlTGVuZ3RoKS5zZXRCaWdJbnQ2NChcbiAgICAgIG9mZnNldCxcbiAgICAgIHZhbHVlLFxuICAgICAgdHJ1ZSxcbiAgICApO1xuICAgIHJldHVybiBvZmZzZXQgKyA0O1xuICB9XG5cbiAgd3JpdGVCaWdVSW50NjRCRSh2YWx1ZTogYmlnaW50LCBvZmZzZXQgPSAwKTogbnVtYmVyIHtcbiAgICBuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIsIHRoaXMuYnl0ZU9mZnNldCwgdGhpcy5ieXRlTGVuZ3RoKS5zZXRCaWdVaW50NjQoXG4gICAgICBvZmZzZXQsXG4gICAgICB2YWx1ZSxcbiAgICApO1xuICAgIHJldHVybiBvZmZzZXQgKyA0O1xuICB9XG4gIHdyaXRlQmlnVUludDY0TEUodmFsdWU6IGJpZ2ludCwgb2Zmc2V0ID0gMCk6IG51bWJlciB7XG4gICAgbmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLCB0aGlzLmJ5dGVPZmZzZXQsIHRoaXMuYnl0ZUxlbmd0aCkuc2V0QmlnVWludDY0KFxuICAgICAgb2Zmc2V0LFxuICAgICAgdmFsdWUsXG4gICAgICB0cnVlLFxuICAgICk7XG4gICAgcmV0dXJuIG9mZnNldCArIDQ7XG4gIH1cblxuICB3cml0ZURvdWJsZUJFKHZhbHVlOiBudW1iZXIsIG9mZnNldCA9IDApOiBudW1iZXIge1xuICAgIG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlciwgdGhpcy5ieXRlT2Zmc2V0LCB0aGlzLmJ5dGVMZW5ndGgpLnNldEZsb2F0NjQoXG4gICAgICBvZmZzZXQsXG4gICAgICB2YWx1ZSxcbiAgICApO1xuICAgIHJldHVybiBvZmZzZXQgKyA4O1xuICB9XG4gIHdyaXRlRG91YmxlTEUodmFsdWU6IG51bWJlciwgb2Zmc2V0ID0gMCk6IG51bWJlciB7XG4gICAgbmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLCB0aGlzLmJ5dGVPZmZzZXQsIHRoaXMuYnl0ZUxlbmd0aCkuc2V0RmxvYXQ2NChcbiAgICAgIG9mZnNldCxcbiAgICAgIHZhbHVlLFxuICAgICAgdHJ1ZSxcbiAgICApO1xuICAgIHJldHVybiBvZmZzZXQgKyA4O1xuICB9XG5cbiAgd3JpdGVGbG9hdEJFKHZhbHVlOiBudW1iZXIsIG9mZnNldCA9IDApOiBudW1iZXIge1xuICAgIG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlciwgdGhpcy5ieXRlT2Zmc2V0LCB0aGlzLmJ5dGVMZW5ndGgpLnNldEZsb2F0MzIoXG4gICAgICBvZmZzZXQsXG4gICAgICB2YWx1ZSxcbiAgICApO1xuICAgIHJldHVybiBvZmZzZXQgKyA0O1xuICB9XG4gIHdyaXRlRmxvYXRMRSh2YWx1ZTogbnVtYmVyLCBvZmZzZXQgPSAwKTogbnVtYmVyIHtcbiAgICBuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIsIHRoaXMuYnl0ZU9mZnNldCwgdGhpcy5ieXRlTGVuZ3RoKS5zZXRGbG9hdDMyKFxuICAgICAgb2Zmc2V0LFxuICAgICAgdmFsdWUsXG4gICAgICB0cnVlLFxuICAgICk7XG4gICAgcmV0dXJuIG9mZnNldCArIDQ7XG4gIH1cblxuICB3cml0ZUludDgodmFsdWU6IG51bWJlciwgb2Zmc2V0ID0gMCk6IG51bWJlciB7XG4gICAgbmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLCB0aGlzLmJ5dGVPZmZzZXQsIHRoaXMuYnl0ZUxlbmd0aCkuc2V0SW50OChcbiAgICAgIG9mZnNldCxcbiAgICAgIHZhbHVlLFxuICAgICk7XG4gICAgcmV0dXJuIG9mZnNldCArIDE7XG4gIH1cblxuICB3cml0ZUludDE2QkUodmFsdWU6IG51bWJlciwgb2Zmc2V0ID0gMCk6IG51bWJlciB7XG4gICAgbmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLCB0aGlzLmJ5dGVPZmZzZXQsIHRoaXMuYnl0ZUxlbmd0aCkuc2V0SW50MTYoXG4gICAgICBvZmZzZXQsXG4gICAgICB2YWx1ZSxcbiAgICApO1xuICAgIHJldHVybiBvZmZzZXQgKyAyO1xuICB9XG4gIHdyaXRlSW50MTZMRSh2YWx1ZTogbnVtYmVyLCBvZmZzZXQgPSAwKTogbnVtYmVyIHtcbiAgICBuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIsIHRoaXMuYnl0ZU9mZnNldCwgdGhpcy5ieXRlTGVuZ3RoKS5zZXRJbnQxNihcbiAgICAgIG9mZnNldCxcbiAgICAgIHZhbHVlLFxuICAgICAgdHJ1ZSxcbiAgICApO1xuICAgIHJldHVybiBvZmZzZXQgKyAyO1xuICB9XG5cbiAgd3JpdGVJbnQzMkJFKHZhbHVlOiBudW1iZXIsIG9mZnNldCA9IDApOiBudW1iZXIge1xuICAgIG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlciwgdGhpcy5ieXRlT2Zmc2V0LCB0aGlzLmJ5dGVMZW5ndGgpLnNldFVpbnQzMihcbiAgICAgIG9mZnNldCxcbiAgICAgIHZhbHVlLFxuICAgICk7XG4gICAgcmV0dXJuIG9mZnNldCArIDQ7XG4gIH1cbiAgd3JpdGVJbnQzMkxFKHZhbHVlOiBudW1iZXIsIG9mZnNldCA9IDApOiBudW1iZXIge1xuICAgIG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlciwgdGhpcy5ieXRlT2Zmc2V0LCB0aGlzLmJ5dGVMZW5ndGgpLnNldEludDMyKFxuICAgICAgb2Zmc2V0LFxuICAgICAgdmFsdWUsXG4gICAgICB0cnVlLFxuICAgICk7XG4gICAgcmV0dXJuIG9mZnNldCArIDQ7XG4gIH1cblxuICB3cml0ZVVJbnQ4KHZhbHVlOiBudW1iZXIsIG9mZnNldCA9IDApOiBudW1iZXIge1xuICAgIG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlciwgdGhpcy5ieXRlT2Zmc2V0LCB0aGlzLmJ5dGVMZW5ndGgpLnNldFVpbnQ4KFxuICAgICAgb2Zmc2V0LFxuICAgICAgdmFsdWUsXG4gICAgKTtcbiAgICByZXR1cm4gb2Zmc2V0ICsgMTtcbiAgfVxuXG4gIHdyaXRlVUludDE2QkUodmFsdWU6IG51bWJlciwgb2Zmc2V0ID0gMCk6IG51bWJlciB7XG4gICAgbmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLCB0aGlzLmJ5dGVPZmZzZXQsIHRoaXMuYnl0ZUxlbmd0aCkuc2V0VWludDE2KFxuICAgICAgb2Zmc2V0LFxuICAgICAgdmFsdWUsXG4gICAgKTtcbiAgICByZXR1cm4gb2Zmc2V0ICsgMjtcbiAgfVxuICB3cml0ZVVJbnQxNkxFKHZhbHVlOiBudW1iZXIsIG9mZnNldCA9IDApOiBudW1iZXIge1xuICAgIG5ldyBEYXRhVmlldyh0aGlzLmJ1ZmZlciwgdGhpcy5ieXRlT2Zmc2V0LCB0aGlzLmJ5dGVMZW5ndGgpLnNldFVpbnQxNihcbiAgICAgIG9mZnNldCxcbiAgICAgIHZhbHVlLFxuICAgICAgdHJ1ZSxcbiAgICApO1xuICAgIHJldHVybiBvZmZzZXQgKyAyO1xuICB9XG5cbiAgd3JpdGVVSW50MzJCRSh2YWx1ZTogbnVtYmVyLCBvZmZzZXQgPSAwKTogbnVtYmVyIHtcbiAgICBuZXcgRGF0YVZpZXcodGhpcy5idWZmZXIsIHRoaXMuYnl0ZU9mZnNldCwgdGhpcy5ieXRlTGVuZ3RoKS5zZXRVaW50MzIoXG4gICAgICBvZmZzZXQsXG4gICAgICB2YWx1ZSxcbiAgICApO1xuICAgIHJldHVybiBvZmZzZXQgKyA0O1xuICB9XG4gIHdyaXRlVUludDMyTEUodmFsdWU6IG51bWJlciwgb2Zmc2V0ID0gMCk6IG51bWJlciB7XG4gICAgbmV3IERhdGFWaWV3KHRoaXMuYnVmZmVyLCB0aGlzLmJ5dGVPZmZzZXQsIHRoaXMuYnl0ZUxlbmd0aCkuc2V0VWludDMyKFxuICAgICAgb2Zmc2V0LFxuICAgICAgdmFsdWUsXG4gICAgICB0cnVlLFxuICAgICk7XG4gICAgcmV0dXJuIG9mZnNldCArIDQ7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgeyBCdWZmZXIgfTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUsWUFBWSxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsWUFBWSxNQUFNLE1BQU0sdUJBQXVCLENBQUM7QUFDaEQsU0FBb0IsaUJBQWlCLEVBQUUsY0FBYyxRQUFRLGFBQWEsQ0FBQztBQUUzRSxNQUFNLHVCQUF1QixHQUFHO0lBQzlCLE9BQU87SUFDUCxRQUFRO0lBQ1IsUUFBUTtJQUNSLE1BQU07SUFDTixTQUFTO0NBQ1YsQUFBQztBQUVGLFNBQVMsYUFBYSxDQUFDLFFBQVEsR0FBRyxNQUFNLEVBQUUsTUFBTSxHQUFHLElBQUksRUFBYTtJQUNsRSxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsSUFBSyxNQUFNLElBQUksUUFBUSxLQUFLLEVBQUUsQUFBQyxFQUFFO1FBQy9ELElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxNQUFNLENBQUM7UUFDM0IsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENB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