import { encode, decode } from "./deps.ts";
function rotl(x, n) {
    return x << n | x >>> 32 - n;
}
/** Byte length of a SHA1 digest. */ export const BYTES = 20;
/**  A class representation of the SHA1 algorithm. */ export class SHA1 {
    hashSize = BYTES;
    _buf = new Uint8Array(64);
    _bufIdx;
    _count;
    _K = new Uint32Array([
        0x5a827999,
        0x6ed9eba1,
        0x8f1bbcdc,
        0xca62c1d6
    ]);
    _H;
    _finalized;
    /** Creates a SHA1 instance. */ constructor(){
        this.init();
    }
    /** Reduces the four input numbers to a single one. */ static F(t, b, c, d) {
        if (t <= 19) {
            return b & c | ~b & d;
        } else if (t <= 39) {
            return b ^ c ^ d;
        } else if (t <= 59) {
            return b & c | b & d | c & d;
        } else {
            return b ^ c ^ d;
        }
    }
    /** Initializes a hash instance. */ init() {
        // prettier-ignore
        this._H = new Uint32Array([
            0x67452301,
            0xEFCDAB89,
            0x98BADCFE,
            0x10325476,
            0xC3D2E1F0
        ]);
        this._bufIdx = 0;
        this._count = new Uint32Array(2);
        this._buf.fill(0);
        this._finalized = false;
        return this;
    }
    /** Updates a hash with additional message data. */ update(msg, inputEncoding) {
        if (msg === null) {
            throw new TypeError("msg must be a string or Uint8Array.");
        } else if (typeof msg === "string") {
            msg = encode(msg, inputEncoding);
        }
        // process the msg as many times as possible, the rest is stored in the buffer
        // message is processed in 512 bit (64 byte chunks)
        for(let i = 0; i < msg.length; i++){
            this._buf[this._bufIdx++] = msg[i];
            if (this._bufIdx === 64) {
                this.transform();
                this._bufIdx = 0;
            }
        }
        // counter update (number of message bits)
        const c = this._count;
        if ((c[0] += msg.length << 3) < msg.length << 3) {
            c[1]++;
        }
        c[1] += msg.length >>> 29;
        return this;
    }
    /** Finalizes a hash with additional message data. */ digest(outputEncoding) {
        if (this._finalized) {
            throw new Error("digest has already been called.");
        }
        this._finalized = true;
        // append '1'
        const b = this._buf;
        let idx = this._bufIdx;
        b[idx++] = 0x80;
        // zeropad up to byte pos 56
        while(idx !== 56){
            if (idx === 64) {
                this.transform();
                idx = 0;
            }
            b[idx++] = 0;
        }
        // append length in bits
        const c = this._count;
        b[56] = c[1] >>> 24 & 0xff;
        b[57] = c[1] >>> 16 & 0xff;
        b[58] = c[1] >>> 8 & 0xff;
        b[59] = c[1] >>> 0 & 0xff;
        b[60] = c[0] >>> 24 & 0xff;
        b[61] = c[0] >>> 16 & 0xff;
        b[62] = c[0] >>> 8 & 0xff;
        b[63] = c[0] >>> 0 & 0xff;
        this.transform();
        // return the hash as byte array (20 bytes)
        const hash = new Uint8Array(BYTES);
        for(let i = 0; i < 5; i++){
            hash[(i << 2) + 0] = this._H[i] >>> 24 & 0xff;
            hash[(i << 2) + 1] = this._H[i] >>> 16 & 0xff;
            hash[(i << 2) + 2] = this._H[i] >>> 8 & 0xff;
            hash[(i << 2) + 3] = this._H[i] >>> 0 & 0xff;
        }
        // clear internal states and prepare for new hash
        this.init();
        return outputEncoding ? decode(hash, outputEncoding) : hash;
    }
    /** Performs one transformation cycle. */ transform() {
        const h = this._H;
        let a = h[0];
        let b = h[1];
        let c = h[2];
        let d = h[3];
        let e = h[4];
        // convert byte buffer to words
        const w = new Uint32Array(80);
        for(let i = 0; i < 16; i++){
            w[i] = this._buf[(i << 2) + 3] | this._buf[(i << 2) + 2] << 8 | this._buf[(i << 2) + 1] << 16 | this._buf[i << 2] << 24;
        }
        for(let t = 0; t < 80; t++){
            if (t >= 16) {
                w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
            }
            const tmp = rotl(a, 5) + SHA1.F(t, b, c, d) + e + w[t] + this._K[Math.floor(t / 20)] | 0;
            e = d;
            d = c;
            c = rotl(b, 30);
            b = a;
            a = tmp;
        }
        h[0] = h[0] + a | 0;
        h[1] = h[1] + b | 0;
        h[2] = h[2] + c | 0;
        h[3] = h[3] + d | 0;
        h[4] = h[4] + e | 0;
    }
}
/** Generates a SHA1 hash of the input data. */ export function sha1(msg, inputEncoding, outputEncoding) {
    return new SHA1().update(msg, inputEncoding).digest(outputEncoding);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVub3BrZy5jb20vY2hpZWZiaWlrby9zaGExQHYyLjAuMC9tb2QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZW5jb2RlLCBkZWNvZGUgfSBmcm9tIFwiLi9kZXBzLnRzXCI7XG5cbmZ1bmN0aW9uIHJvdGwoeDogbnVtYmVyLCBuOiBudW1iZXIpOiBudW1iZXIge1xuICByZXR1cm4gKHggPDwgbikgfCAoeCA+Pj4gKDMyIC0gbikpO1xufVxuXG4vKiogQnl0ZSBsZW5ndGggb2YgYSBTSEExIGRpZ2VzdC4gKi9cbmV4cG9ydCBjb25zdCBCWVRFUzogbnVtYmVyID0gMjA7XG5cbi8qKiAgQSBjbGFzcyByZXByZXNlbnRhdGlvbiBvZiB0aGUgU0hBMSBhbGdvcml0aG0uICovXG5leHBvcnQgY2xhc3MgU0hBMSB7XG4gIHJlYWRvbmx5IGhhc2hTaXplOiBudW1iZXIgPSBCWVRFUztcblxuICBwcml2YXRlIF9idWY6IFVpbnQ4QXJyYXkgPSBuZXcgVWludDhBcnJheSg2NCk7XG4gIHByaXZhdGUgX2J1ZklkeCE6IG51bWJlcjtcbiAgcHJpdmF0ZSBfY291bnQhOiBVaW50MzJBcnJheTtcbiAgcHJpdmF0ZSBfSzogVWludDMyQXJyYXkgPSBuZXcgVWludDMyQXJyYXkoWzB4NWE4Mjc5OTksIDB4NmVkOWViYTEsIDB4OGYxYmJjZGMsIDB4Y2E2MmMxZDZdKTtcbiAgcHJpdmF0ZSBfSCE6IFVpbnQzMkFycmF5O1xuICBwcml2YXRlIF9maW5hbGl6ZWQhOiBib29sZWFuO1xuXG4gIC8qKiBDcmVhdGVzIGEgU0hBMSBpbnN0YW5jZS4gKi9cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5pbml0KCk7XG4gIH1cblxuICAvKiogUmVkdWNlcyB0aGUgZm91ciBpbnB1dCBudW1iZXJzIHRvIGEgc2luZ2xlIG9uZS4gKi9cbiAgcHJvdGVjdGVkIHN0YXRpYyBGKHQ6IG51bWJlciwgYjogbnVtYmVyLCBjOiBudW1iZXIsIGQ6IG51bWJlcik6IG51bWJlciB7XG4gICAgaWYgKHQgPD0gMTkpIHtcbiAgICAgIHJldHVybiAoYiAmIGMpIHwgKH5iICYgZCk7XG4gICAgfSBlbHNlIGlmICh0IDw9IDM5KSB7XG4gICAgICByZXR1cm4gYiBeIGMgXiBkO1xuICAgIH0gZWxzZSBpZiAodCA8PSA1OSkge1xuICAgICAgcmV0dXJuIChiICYgYykgfCAoYiAmIGQpIHwgKGMgJiBkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGIgXiBjIF4gZDtcbiAgICB9XG4gIH1cblxuICAvKiogSW5pdGlhbGl6ZXMgYSBoYXNoIGluc3RhbmNlLiAqL1xuICBpbml0KCk6IFNIQTEge1xuICAgIC8vIHByZXR0aWVyLWlnbm9yZVxuICAgIHRoaXMuX0ggPSBuZXcgVWludDMyQXJyYXkoW1xuICAgICAgMHg2NzQ1MjMwMSwgMHhFRkNEQUI4OSwgMHg5OEJBRENGRSwgMHgxMDMyNTQ3NiwgMHhDM0QyRTFGMFxuICAgIF0pO1xuXG4gICAgdGhpcy5fYnVmSWR4ID0gMDtcbiAgICB0aGlzLl9jb3VudCA9IG5ldyBVaW50MzJBcnJheSgyKTtcbiAgICB0aGlzLl9idWYuZmlsbCgwKTtcbiAgICB0aGlzLl9maW5hbGl6ZWQgPSBmYWxzZTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqIFVwZGF0ZXMgYSBoYXNoIHdpdGggYWRkaXRpb25hbCBtZXNzYWdlIGRhdGEuICovXG4gIHVwZGF0ZShtc2c6IHN0cmluZyB8IFVpbnQ4QXJyYXksIGlucHV0RW5jb2Rpbmc/OiBzdHJpbmcpOiBTSEExIHtcbiAgICBpZiAobXNnID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwibXNnIG11c3QgYmUgYSBzdHJpbmcgb3IgVWludDhBcnJheS5cIik7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbXNnID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBtc2cgPSBlbmNvZGUobXNnLCBpbnB1dEVuY29kaW5nKSBhcyBVaW50OEFycmF5O1xuICAgIH1cblxuICAgIC8vIHByb2Nlc3MgdGhlIG1zZyBhcyBtYW55IHRpbWVzIGFzIHBvc3NpYmxlLCB0aGUgcmVzdCBpcyBzdG9yZWQgaW4gdGhlIGJ1ZmZlclxuICAgIC8vIG1lc3NhZ2UgaXMgcHJvY2Vzc2VkIGluIDUxMiBiaXQgKDY0IGJ5dGUgY2h1bmtzKVxuICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBtc2cubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuX2J1Zlt0aGlzLl9idWZJZHgrK10gPSBtc2dbaV07XG4gICAgICBpZiAodGhpcy5fYnVmSWR4ID09PSA2NCkge1xuICAgICAgICB0aGlzLnRyYW5zZm9ybSgpO1xuICAgICAgICB0aGlzLl9idWZJZHggPSAwO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNvdW50ZXIgdXBkYXRlIChudW1iZXIgb2YgbWVzc2FnZSBiaXRzKVxuICAgIGNvbnN0IGM6IFVpbnQzMkFycmF5ID0gdGhpcy5fY291bnQ7XG5cbiAgICBpZiAoKGNbMF0gKz0gbXNnLmxlbmd0aCA8PCAzKSA8IG1zZy5sZW5ndGggPDwgMykge1xuICAgICAgY1sxXSsrO1xuICAgIH1cblxuICAgIGNbMV0gKz0gbXNnLmxlbmd0aCA+Pj4gMjk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBGaW5hbGl6ZXMgYSBoYXNoIHdpdGggYWRkaXRpb25hbCBtZXNzYWdlIGRhdGEuICovXG4gIGRpZ2VzdChvdXRwdXRFbmNvZGluZz86IHN0cmluZyk6IHN0cmluZyB8IFVpbnQ4QXJyYXkge1xuICAgIGlmICh0aGlzLl9maW5hbGl6ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImRpZ2VzdCBoYXMgYWxyZWFkeSBiZWVuIGNhbGxlZC5cIilcbiAgICB9XG5cbiAgICB0aGlzLl9maW5hbGl6ZWQgPSB0cnVlO1xuXG4gICAgLy8gYXBwZW5kICcxJ1xuICAgIGNvbnN0IGI6IFVpbnQ4QXJyYXkgPSB0aGlzLl9idWY7XG4gICAgbGV0IGlkeDogbnVtYmVyID0gdGhpcy5fYnVmSWR4O1xuICAgIGJbaWR4KytdID0gMHg4MDtcblxuICAgIC8vIHplcm9wYWQgdXAgdG8gYnl0ZSBwb3MgNTZcbiAgICB3aGlsZSAoaWR4ICE9PSA1Nikge1xuICAgICAgaWYgKGlkeCA9PT0gNjQpIHtcbiAgICAgICAgdGhpcy50cmFuc2Zvcm0oKTtcbiAgICAgICAgaWR4ID0gMDtcbiAgICAgIH1cbiAgICAgIGJbaWR4KytdID0gMDtcbiAgICB9XG5cbiAgICAvLyBhcHBlbmQgbGVuZ3RoIGluIGJpdHNcbiAgICBjb25zdCBjOiBVaW50MzJBcnJheSA9IHRoaXMuX2NvdW50O1xuXG4gICAgYls1Nl0gPSAoY1sxXSA+Pj4gMjQpICYgMHhmZjtcbiAgICBiWzU3XSA9IChjWzFdID4+PiAxNikgJiAweGZmO1xuICAgIGJbNThdID0gKGNbMV0gPj4+IDgpICYgMHhmZjtcbiAgICBiWzU5XSA9IChjWzFdID4+PiAwKSAmIDB4ZmY7XG4gICAgYls2MF0gPSAoY1swXSA+Pj4gMjQpICYgMHhmZjtcbiAgICBiWzYxXSA9IChjWzBdID4+PiAxNikgJiAweGZmO1xuICAgIGJbNjJdID0gKGNbMF0gPj4+IDgpICYgMHhmZjtcbiAgICBiWzYzXSA9IChjWzBdID4+PiAwKSAmIDB4ZmY7XG5cbiAgICB0aGlzLnRyYW5zZm9ybSgpO1xuXG4gICAgLy8gcmV0dXJuIHRoZSBoYXNoIGFzIGJ5dGUgYXJyYXkgKDIwIGJ5dGVzKVxuICAgIGNvbnN0IGhhc2g6IFVpbnQ4QXJyYXkgPSBuZXcgVWludDhBcnJheShCWVRFUyk7XG5cbiAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgNTsgaSsrKSB7XG4gICAgICBoYXNoWyhpIDw8IDIpICsgMF0gPSAodGhpcy5fSFtpXSA+Pj4gMjQpICYgMHhmZjtcbiAgICAgIGhhc2hbKGkgPDwgMikgKyAxXSA9ICh0aGlzLl9IW2ldID4+PiAxNikgJiAweGZmO1xuICAgICAgaGFzaFsoaSA8PCAyKSArIDJdID0gKHRoaXMuX0hbaV0gPj4+IDgpICYgMHhmZjtcbiAgICAgIGhhc2hbKGkgPDwgMikgKyAzXSA9ICh0aGlzLl9IW2ldID4+PiAwKSAmIDB4ZmY7XG4gICAgfVxuXG4gICAgLy8gY2xlYXIgaW50ZXJuYWwgc3RhdGVzIGFuZCBwcmVwYXJlIGZvciBuZXcgaGFzaFxuICAgIHRoaXMuaW5pdCgpO1xuXG4gICAgcmV0dXJuIG91dHB1dEVuY29kaW5nID8gZGVjb2RlKGhhc2gsIG91dHB1dEVuY29kaW5nKSA6IGhhc2g7XG4gIH1cblxuICAvKiogUGVyZm9ybXMgb25lIHRyYW5zZm9ybWF0aW9uIGN5Y2xlLiAqL1xuICBwcml2YXRlIHRyYW5zZm9ybSgpOiB2b2lkIHtcbiAgICBjb25zdCBoOiBVaW50MzJBcnJheSA9IHRoaXMuX0g7XG4gICAgbGV0IGE6IG51bWJlciA9IGhbMF07XG4gICAgbGV0IGI6IG51bWJlciA9IGhbMV07XG4gICAgbGV0IGM6IG51bWJlciA9IGhbMl07XG4gICAgbGV0IGQ6IG51bWJlciA9IGhbM107XG4gICAgbGV0IGU6IG51bWJlciA9IGhbNF07XG5cbiAgICAvLyBjb252ZXJ0IGJ5dGUgYnVmZmVyIHRvIHdvcmRzXG4gICAgY29uc3QgdzogVWludDMyQXJyYXkgPSBuZXcgVWludDMyQXJyYXkoODApO1xuXG4gICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IDE2OyBpKyspIHtcbiAgICAgIHdbaV0gPVxuICAgICAgICB0aGlzLl9idWZbKGkgPDwgMikgKyAzXSB8XG4gICAgICAgICh0aGlzLl9idWZbKGkgPDwgMikgKyAyXSA8PCA4KSB8XG4gICAgICAgICh0aGlzLl9idWZbKGkgPDwgMikgKyAxXSA8PCAxNikgfFxuICAgICAgICAodGhpcy5fYnVmW2kgPDwgMl0gPDwgMjQpO1xuICAgIH1cblxuICAgIGZvciAobGV0IHQ6IG51bWJlciA9IDA7IHQgPCA4MDsgdCsrKSB7XG4gICAgICBpZiAodCA+PSAxNikge1xuICAgICAgICB3W3RdID0gcm90bCh3W3QgLSAzXSBeIHdbdCAtIDhdIF4gd1t0IC0gMTRdIF4gd1t0IC0gMTZdLCAxKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdG1wOiBudW1iZXIgPVxuICAgICAgICAocm90bChhLCA1KSArXG4gICAgICAgICAgU0hBMS5GKHQsIGIsIGMsIGQpICtcbiAgICAgICAgICBlICtcbiAgICAgICAgICB3W3RdICtcbiAgICAgICAgICB0aGlzLl9LW01hdGguZmxvb3IodCAvIDIwKV0pIHxcbiAgICAgICAgMDtcblxuICAgICAgZSA9IGQ7XG4gICAgICBkID0gYztcbiAgICAgIGMgPSByb3RsKGIsIDMwKTtcbiAgICAgIGIgPSBhO1xuICAgICAgYSA9IHRtcDtcbiAgICB9XG5cbiAgICBoWzBdID0gKGhbMF0gKyBhKSB8IDA7XG4gICAgaFsxXSA9IChoWzFdICsgYikgfCAwO1xuICAgIGhbMl0gPSAoaFsyXSArIGMpIHwgMDtcbiAgICBoWzNdID0gKGhbM10gKyBkKSB8IDA7XG4gICAgaFs0XSA9IChoWzRdICsgZSkgfCAwO1xuICB9XG59XG5cbi8qKiBHZW5lcmF0ZXMgYSBTSEExIGhhc2ggb2YgdGhlIGlucHV0IGRhdGEuICovXG5leHBvcnQgZnVuY3Rpb24gc2hhMShcbiAgbXNnOiBzdHJpbmcgfCBVaW50OEFycmF5LFxuICBpbnB1dEVuY29kaW5nPzogc3RyaW5nLFxuICBvdXRwdXRFbmNvZGluZz86IHN0cmluZ1xuKTogc3RyaW5nIHwgVWludDhBcnJheSB7XG4gIHJldHVybiBuZXcgU0hBMSgpLnVwZGF0ZShtc2csIGlucHV0RW5jb2RpbmcpLmRpZ2VzdChvdXRwdXRFbmNvZGluZyk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxNQUFNLEVBQUUsTUFBTSxRQUFRLFlBQVk7QUFFM0MsU0FBUyxLQUFLLENBQVMsRUFBRSxDQUFTLEVBQVU7SUFDMUMsT0FBTyxBQUFDLEtBQUssSUFBTSxNQUFPLEtBQUs7QUFDakM7QUFFQSxrQ0FBa0MsR0FDbEMsT0FBTyxNQUFNLFFBQWdCLEdBQUc7QUFFaEMsbURBQW1ELEdBQ25ELE9BQU8sTUFBTTtJQUNGLFdBQW1CLE1B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