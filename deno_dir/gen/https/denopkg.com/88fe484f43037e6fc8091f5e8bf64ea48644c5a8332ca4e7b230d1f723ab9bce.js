import { encode, decode } from "./deps.ts";
export const BYTES = 32;
export class SHA256 {
    hashSize = BYTES;
    _buf;
    _bufIdx;
    _count;
    _K;
    _H;
    _finalized;
    constructor() {
        this._buf = new Uint8Array(64);
        this._K = new Uint32Array([
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
            0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
            0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
            0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
            0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
            0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
            0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
            0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
            0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ]);
        this.init();
    }
    init() {
        this._H = new Uint32Array([
            0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
            0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
        ]);
        this._bufIdx = 0;
        this._count = new Uint32Array(2);
        this._buf.fill(0);
        this._finalized = false;
        return this;
    }
    update(msg, inputEncoding) {
        if (msg === null) {
            throw new TypeError("msg must be a string or Uint8Array.");
        }
        else if (typeof msg === "string") {
            msg = encode(msg, inputEncoding);
        }
        for (let i = 0, len = msg.length; i < len; i++) {
            this._buf[this._bufIdx++] = msg[i];
            if (this._bufIdx === 64) {
                this._transform();
                this._bufIdx = 0;
            }
        }
        const c = this._count;
        if ((c[0] += msg.length << 3) < msg.length << 3) {
            c[1]++;
        }
        c[1] += msg.length >>> 29;
        return this;
    }
    digest(outputEncoding) {
        if (this._finalized) {
            throw new Error("digest has already been called.");
        }
        this._finalized = true;
        const b = this._buf;
        let idx = this._bufIdx;
        b[idx++] = 0x80;
        while (idx !== 56) {
            if (idx === 64) {
                this._transform();
                idx = 0;
            }
            b[idx++] = 0;
        }
        const c = this._count;
        b[56] = (c[1] >>> 24) & 0xff;
        b[57] = (c[1] >>> 16) & 0xff;
        b[58] = (c[1] >>> 8) & 0xff;
        b[59] = (c[1] >>> 0) & 0xff;
        b[60] = (c[0] >>> 24) & 0xff;
        b[61] = (c[0] >>> 16) & 0xff;
        b[62] = (c[0] >>> 8) & 0xff;
        b[63] = (c[0] >>> 0) & 0xff;
        this._transform();
        const hash = new Uint8Array(BYTES);
        for (let i = 0; i < 8; i++) {
            hash[(i << 2) + 0] = (this._H[i] >>> 24) & 0xff;
            hash[(i << 2) + 1] = (this._H[i] >>> 16) & 0xff;
            hash[(i << 2) + 2] = (this._H[i] >>> 8) & 0xff;
            hash[(i << 2) + 3] = (this._H[i] >>> 0) & 0xff;
        }
        this.init();
        return outputEncoding ? decode(hash, outputEncoding) : hash;
    }
    _transform() {
        const h = this._H;
        let h0 = h[0];
        let h1 = h[1];
        let h2 = h[2];
        let h3 = h[3];
        let h4 = h[4];
        let h5 = h[5];
        let h6 = h[6];
        let h7 = h[7];
        const w = new Uint32Array(16);
        let i;
        for (i = 0; i < 16; i++) {
            w[i] =
                this._buf[(i << 2) + 3] |
                    (this._buf[(i << 2) + 2] << 8) |
                    (this._buf[(i << 2) + 1] << 16) |
                    (this._buf[i << 2] << 24);
        }
        for (i = 0; i < 64; i++) {
            let tmp;
            if (i < 16) {
                tmp = w[i];
            }
            else {
                let a = w[(i + 1) & 15];
                let b = w[(i + 14) & 15];
                tmp = w[i & 15] =
                    (((a >>> 7) ^ (a >>> 18) ^ (a >>> 3) ^ (a << 25) ^ (a << 14)) +
                        ((b >>> 17) ^ (b >>> 19) ^ (b >>> 10) ^ (b << 15) ^ (b << 13)) +
                        w[i & 15] +
                        w[(i + 9) & 15]) |
                        0;
            }
            tmp =
                (tmp +
                    h7 +
                    ((h4 >>> 6) ^
                        (h4 >>> 11) ^
                        (h4 >>> 25) ^
                        (h4 << 26) ^
                        (h4 << 21) ^
                        (h4 << 7)) +
                    (h6 ^ (h4 & (h5 ^ h6))) +
                    this._K[i]) |
                    0;
            h7 = h6;
            h6 = h5;
            h5 = h4;
            h4 = h3 + tmp;
            h3 = h2;
            h2 = h1;
            h1 = h0;
            h0 =
                (tmp +
                    ((h1 & h2) ^ (h3 & (h1 ^ h2))) +
                    ((h1 >>> 2) ^
                        (h1 >>> 13) ^
                        (h1 >>> 22) ^
                        (h1 << 30) ^
                        (h1 << 19) ^
                        (h1 << 10))) |
                    0;
        }
        h[0] = (h[0] + h0) | 0;
        h[1] = (h[1] + h1) | 0;
        h[2] = (h[2] + h2) | 0;
        h[3] = (h[3] + h3) | 0;
        h[4] = (h[4] + h4) | 0;
        h[5] = (h[5] + h5) | 0;
        h[6] = (h[6] + h6) | 0;
        h[7] = (h[7] + h7) | 0;
    }
}
export function sha256(msg, inputEncoding, outputEncoding) {
    return new SHA256().update(msg, inputEncoding).digest(outputEncoding);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTCxNQUFNLEVBQ04sTUFBTSxFQUNQLE1BQU0sV0FBVyxDQUFDO0FBR25CLE1BQU0sQ0FBQyxNQUFNLEtBQUssR0FBVyxFQUFFLENBQUM7QUFHaEMsTUFBTSxPQUFPLE1BQU07SUFDUixRQUFRLEdBQVcsS0FBSyxDQUFDO0lBRTFCLElBQUksQ0FBYTtJQUNqQixPQUFPLENBQVU7SUFDakIsTUFBTSxDQUFlO0lBQ3JCLEVBQUUsQ0FBYztJQUNoQixFQUFFLENBQWU7SUFDakIsVUFBVSxDQUFXO0lBRzdCO1FBQ0UsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUcvQixJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksV0FBVyxDQUFDO1lBQ3hCLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVU7WUFDOUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVTtZQUM5QyxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVO1lBQzlDLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVU7WUFDOUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVTtZQUM5QyxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVO1lBQzlDLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVU7WUFDOUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVTtZQUM5QyxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVO1lBQzlDLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVU7WUFDOUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVTtZQUM5QyxVQUFVLEVBQUUsVUFBVSxFQUFF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RyxDQUFDLENBQUM7U0FDZDtRQUdELE1BQU0sQ0FBQyxHQUFnQixJQUFJLENBQUMsTUFBTSxDQUFDO1FBRW5DLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDN0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUM3QixDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQzVCLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDNUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUM3QixDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQzdCLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDNUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUU1QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFHbEIsTUFBTSxJQUFJLEdBQWUsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFHL0MsS0FBSyxJQUFJLENBQUMsR0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZ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LENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QixDQUFDO0NBQ0Y7QUFHRCxNQUFNLFVBQVUsTUFBTSxDQUNwQixHQUF3QixFQUN4QixhQUFzQixFQUN0QixjQUF1QjtJQUV2QixPQUFPLElBQUksTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDeEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGVuY29kZSxcbiAgZGVjb2RlXG59IGZyb20gXCIuL2RlcHMudHNcIjtcblxuLyoqIEJ5dGUgbGVuZ3RoIG9mIGEgU0hBMjU2IGhhc2guICovXG5leHBvcnQgY29uc3QgQllURVM6IG51bWJlciA9IDMyO1xuXG4vKiogQSBjbGFzcyByZXByZXNlbnRhdGlvbiBvZiB0aGUgU0hBMjU2IGFsZ29yaXRobS4gKi9cbmV4cG9ydCBjbGFzcyBTSEEyNTYge1xuICByZWFkb25seSBoYXNoU2l6ZTogbnVtYmVyID0gQllURVM7XG5cbiAgcHJpdmF0ZSBfYnVmOiBVaW50OEFycmF5O1xuICBwcml2YXRlIF9idWZJZHghOiBudW1iZXI7XG4gIHByaXZhdGUgX2NvdW50ITogVWludDMyQXJyYXk7XG4gIHByaXZhdGUgX0s6IFVpbnQzMkFycmF5O1xuICBwcml2YXRlIF9IITogVWludDMyQXJyYXk7XG4gIHByaXZhdGUgX2ZpbmFsaXplZCE6IGJvb2xlYW47XG5cbiAgLyoqIENyZWF0ZXMgYSBTSEEyNTYgaW5zdGFuY2UuICovXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX2J1ZiA9IG5ldyBVaW50OEFycmF5KDY0KTtcblxuICAgIC8vIHByZXR0aWVyLWlnbm9yZVxuICAgIHRoaXMuX0sgPSBuZXcgVWludDMyQXJyYXkoW1xuICAgICAgMHg0MjhhMmY5OCwgMHg3MTM3NDQ5MSwgMHhiNWMwZmJjZiwgMHhlOWI1ZGJhNSxcbiAgICAgIDB4Mzk1NmMyNWIsIDB4NTlmMTExZjEsIDB4OTIzZjgyYTQsIDB4YWIxYzVlZDUsXG4gICAgICAweGQ4MDdhYTk4LCAweDEyODM1YjAxLCAweDI0MzE4NWJlLCAweDU1MGM3ZGMzLFxuICAgICAgMHg3MmJlNWQ3NCwgMHg4MGRlYjFmZSwgMHg5YmRjMDZhNywgMHhjMTliZjE3NCxcbiAgICAgIDB4ZTQ5YjY5YzEsIDB4ZWZiZTQ3ODYsIDB4MGZjMTlkYzYsIDB4MjQwY2ExY2MsXG4gICAgICAweDJkZTkyYzZmLCAweDRhNzQ4NGFhLCAweDVjYjBhOWRjLCAweDc2Zjk4OGRhLFxuICAgICAgMHg5ODNlNTE1MiwgMHhhODMxYzY2ZCwgMHhiMDAzMjdjOCwgMHhiZjU5N2ZjNyxcbiAgICAgIDB4YzZlMDBiZjMsIDB4ZDVhNzkxNDcsIDB4MDZjYTYzNTEsIDB4MTQyOTI5NjcsXG4gICAgICAweDI3YjcwYTg1LCAweDJlMWIyMTM4LCAweDRkMmM2ZGZjLCAweDUzMzgwZDEzLFxuICAgICAgMHg2NTBhNzM1NCwgMHg3NjZhMGFiYiwgMHg4MWMyYzkyZSwgMHg5MjcyMmM4NSxcbiAgICAgIDB4YTJiZmU4YTEsIDB4YTgxYTY2NGIsIDB4YzI0YjhiNzAsIDB4Yzc2YzUxYTMsXG4gICAgICAweGQxOTJlODE5LCAweGQ2OTkwNjI0LCAweGY0MGUzNTg1LCAweDEwNmFhMDcwLFxuICAgICAgMHgxOWE0YzExNiwgMHgxZTM3NmMwOCwgMHgyNzQ4Nzc0YywgMHgzNGIwYmNiNSxcbiAgICAgIDB4MzkxYzBjYjMsIDB4NGVkOGFhNGEsIDB4NWI5Y2NhNGYsIDB4NjgyZTZmZjMsXG4gICAgICAweDc0OGY4MmVlLCAweDc4YTU2MzZmLCAweDg0Yzg3ODE0LCAweDhjYzcwMjA4LFxuICAgICAgMHg5MGJlZmZmYSwgMHhhNDUwNmNlYiwgMHhiZWY5YTNmNywgMHhjNjcxNzhmMlxuICAgIF0pO1xuXG4gICAgdGhpcy5pbml0KCk7XG4gIH1cblxuICAvKiogSW5pdGlhbGl6ZXMgYSBoYXNoLiAqL1xuICBpbml0KCk6IFNIQTI1NiB7XG4gICAgLy8gcHJldHRpZXItaWdub3JlXG4gICAgdGhpcy5fSCA9IG5ldyBVaW50MzJBcnJheShbXG4gICAgICAweDZhMDllNjY3LCAweGJiNjdhZTg1LCAweDNjNmVmMzcyLCAweGE1NGZmNTNhLFxuICAgICAgMHg1MTBlNTI3ZiwgMHg5YjA1Njg4YywgMHgxZjgzZDlhYiwgMHg1YmUwY2QxOVxuICAgIF0pO1xuXG4gICAgdGhpcy5fYnVmSWR4ID0gMDtcbiAgICB0aGlzLl9jb3VudCA9IG5ldyBVaW50MzJBcnJheSgyKTtcbiAgICB0aGlzLl9idWYuZmlsbCgwKTtcbiAgICB0aGlzLl9maW5hbGl6ZWQgPSBmYWxzZTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqIFVwZGF0ZXMgdGhlIGhhc2ggd2l0aCBhZGRpdGlvbmFsIG1lc3NhZ2UgZGF0YS4gKi9cbiAgdXBkYXRlKG1zZzogc3RyaW5nIHwgVWludDhBcnJheSwgaW5wdXRFbmNvZGluZz86IHN0cmluZyk6IFNIQTI1NiB7XG4gICAgaWYgKG1zZyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm1zZyBtdXN0IGJlIGEgc3RyaW5nIG9yIFVpbnQ4QXJyYXkuXCIpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1zZyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgbXNnID0gZW5jb2RlKG1zZywgaW5wdXRFbmNvZGluZykgYXMgVWludDhBcnJheTtcbiAgICB9XG5cbiAgICAvLyBwcm9jZXNzIHRoZSBtc2cgYXMgbWFueSB0aW1lcyBhcyBwb3NzaWJsZSwgdGhlIHJlc3QgaXMgc3RvcmVkIGluIHRoZSBidWZmZXJcbiAgICAvLyBtZXNzYWdlIGlzIHByb2Nlc3NlZCBpbiA1MTIgYml0ICg2NCBieXRlIGNodW5rcylcbiAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwLCBsZW4gPSBtc2cubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHRoaXMuX2J1Zlt0aGlzLl9idWZJZHgrK10gPSBtc2dbaV07XG5cbiAgICAgIGlmICh0aGlzLl9idWZJZHggPT09IDY0KSB7XG4gICAgICAgIHRoaXMuX3RyYW5zZm9ybSgpO1xuICAgICAgICB0aGlzLl9idWZJZHggPSAwO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNvdW50ZXIgdXBkYXRlIChudW1iZXIgb2YgbWVzc2FnZSBiaXRzKVxuICAgIGNvbnN0IGM6IFVpbnQzMkFycmF5ID0gdGhpcy5fY291bnQ7XG5cbiAgICBpZiAoKGNbMF0gKz0gbXNnLmxlbmd0aCA8PCAzKSA8IG1zZy5sZW5ndGggPDwgMykge1xuICAgICAgY1sxXSsrO1xuICAgIH1cblxuICAgIGNbMV0gKz0gbXNnLmxlbmd0aCA+Pj4gMjk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBGaW5hbGl6ZXMgdGhlIGhhc2ggd2l0aCBhZGRpdGlvbmFsIG1lc3NhZ2UgZGF0YS4gKi9cbiAgZGlnZXN0KG91dHB1dEVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHwgVWludDhBcnJheSB7XG4gICAgaWYgKHRoaXMuX2ZpbmFsaXplZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZGlnZXN0IGhhcyBhbHJlYWR5IGJlZW4gY2FsbGVkLlwiKVxuICAgIH1cblxuICAgIHRoaXMuX2ZpbmFsaXplZCA9IHRydWU7XG5cbiAgICAvLyBhcHBlbmQgJzEnXG4gICAgY29uc3QgYjogVWludDhBcnJheSA9IHRoaXMuX2J1ZjtcbiAgICBsZXQgaWR4OiBudW1iZXIgPSB0aGlzLl9idWZJZHg7XG4gICAgYltpZHgrK10gPSAweDgwO1xuXG4gICAgLy8gemVyb3BhZCB1cCB0byBieXRlIHBvcyA1NlxuICAgIHdoaWxlIChpZHggIT09IDU2KSB7XG4gICAgICBpZiAoaWR4ID09PSA2NCkge1xuICAgICAgICB0aGlzLl90cmFuc2Zvcm0oKTtcbiAgICAgICAgaWR4ID0gMDtcbiAgICAgIH1cbiAgICAgIGJbaWR4KytdID0gMDtcbiAgICB9XG5cbiAgICAvLyBhcHBlbmQgbGVuZ3RoIGluIGJpdHNcbiAgICBjb25zdCBjOiBVaW50MzJBcnJheSA9IHRoaXMuX2NvdW50O1xuXG4gICAgYls1Nl0gPSAoY1sxXSA+Pj4gMjQpICYgMHhmZjtcbiAgICBiWzU3XSA9IChjWzFdID4+PiAxNikgJiAweGZmO1xuICAgIGJbNThdID0gKGNbMV0gPj4+IDgpICYgMHhmZjtcbiAgICBiWzU5XSA9IChjWzFdID4+PiAwKSAmIDB4ZmY7XG4gICAgYls2MF0gPSAoY1swXSA+Pj4gMjQpICYgMHhmZjtcbiAgICBiWzYxXSA9IChjWzBdID4+PiAxNikgJiAweGZmO1xuICAgIGJbNjJdID0gKGNbMF0gPj4+IDgpICYgMHhmZjtcbiAgICBiWzYzXSA9IChjWzBdID4+PiAwKSAmIDB4ZmY7XG5cbiAgICB0aGlzLl90cmFuc2Zvcm0oKTtcblxuICAgIC8vIHJldHVybiB0aGUgaGFzaCBhcyBieXRlIGFycmF5XG4gICAgY29uc3QgaGFzaDogVWludDhBcnJheSA9IG5ldyBVaW50OEFycmF5KEJZVEVTKTtcblxuICAgIC8vIGxldCBpOiBudW1iZXI7XG4gICAgZm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IDg7IGkrKykge1xuICAgICAgaGFzaFsoaSA8PCAyKSArIDBdID0gKHRoaXMuX0hbaV0gPj4+IDI0KSAmIDB4ZmY7XG4gICAgICBoYXNoWyhpIDw8IDIpICsgMV0gPSAodGhpcy5fSFtpXSA+Pj4gMTYpICYgMHhmZjtcbiAgICAgIGhhc2hbKGkgPDwgMikgKyAyXSA9ICh0aGlzLl9IW2ldID4+PiA4KSAmIDB4ZmY7XG4gICAgICBoYXNoWyhpIDw8IDIpICsgM10gPSAodGhpcy5fSFtpXSA+Pj4gMCkgJiAweGZmO1xuICAgIH1cblxuICAgIC8vIGNsZWFyIGludGVybmFsIHN0YXRlcyBhbmQgcHJlcGFyZSBmb3IgbmV3IGhhc2hcbiAgICB0aGlzLmluaXQoKTtcblxuICAgIHJldHVybiBvdXRwdXRFbmNvZGluZyA/IGRlY29kZShoYXNoLCBvdXRwdXRFbmNvZGluZykgOiBoYXNoO1xuICB9XG5cbiAgLyoqIFBlcmZvcm1zIG9uZSB0cmFuc2Zvcm1hdGlvbiBjeWNsZS4gKi9cbiAgcHJpdmF0ZSBfdHJhbnNmb3JtKCk6IHZvaWQge1xuICAgIGNvbnN0IGg6IFVpbnQzMkFycmF5ID0gdGhpcy5fSDtcblxuICAgIGxldCBoMDogbnVtYmVyID0gaFswXTtcbiAgICBsZXQgaDE6IG51bWJlciA9IGhbMV07XG4gICAgbGV0IGgyOiBudW1iZXIgPSBoWzJdO1xuICAgIGxldCBoMzogbnVtYmVyID0gaFszXTtcbiAgICBsZXQgaDQ6IG51bWJlciA9IGhbNF07XG4gICAgbGV0IGg1OiBudW1iZXIgPSBoWzVdO1xuICAgIGxldCBoNjogbnVtYmVyID0gaFs2XTtcbiAgICBsZXQgaDc6IG51bWJlciA9IGhbN107XG5cbiAgICAvLyBjb252ZXJ0IGJ5dGUgYnVmZmVyIGludG8gd1swLi4xNV1cbiAgICBjb25zdCB3OiBVaW50MzJBcnJheSA9IG5ldyBVaW50MzJBcnJheSgxNik7XG4gICAgbGV0IGk6IG51bWJlcjtcblxuICAgIGZvciAoaSA9IDA7IGkgPCAxNjsgaSsrKSB7XG4gICAgICB3W2ldID1cbiAgICAgICAgdGhpcy5fYnVmWyhpIDw8IDIpICsgM10gfFxuICAgICAgICAodGhpcy5fYnVmWyhpIDw8IDIpICsgMl0gPDwgOCkgfFxuICAgICAgICAodGhpcy5fYnVmWyhpIDw8IDIpICsgMV0gPDwgMTYpIHxcbiAgICAgICAgKHRoaXMuX2J1ZltpIDw8IDJdIDw8IDI0KTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgNjQ7IGkrKykge1xuICAgICAgbGV0IHRtcDogbnVtYmVyO1xuICAgICAgaWYgKGkgPCAxNikge1xuICAgICAgICB0bXAgPSB3W2ldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IGEgPSB3WyhpICsgMSkgJiAxNV07XG4gICAgICAgIGxldCBiID0gd1soaSArIDE0KSAmIDE1XTtcbiAgICAgICAgdG1wID0gd1tpICYgMTVdID1cbiAgICAgICAgICAoKChhID4+PiA3KSBeIChhID4+PiAxOCkgXiAoYSA+Pj4gMykgXiAoYSA8PCAyNSkgXiAoYSA8PCAxNCkpICtcbiAgICAgICAgICAgICgoYiA+Pj4gMTcpIF4gKGIgPj4+IDE5KSBeIChiID4+PiAxMCkgXiAoYiA8PCAxNSkgXiAoYiA8PCAxMykpICtcbiAgICAgICAgICAgIHdbaSAmIDE1XSArXG4gICAgICAgICAgICB3WyhpICsgOSkgJiAxNV0pIHxcbiAgICAgICAgICAwO1xuICAgICAgfVxuXG4gICAgICB0bXAgPVxuICAgICAgICAodG1wICtcbiAgICAgICAgICBoNyArXG4gICAgICAgICAgKChoNCA+Pj4gNikgXlxuICAgICAgICAgICAgKGg0ID4+PiAxMSkgXlxuICAgICAgICAgICAgKGg0ID4+PiAyNSkgXlxuICAgICAgICAgICAgKGg0IDw8IDI2KSBeXG4gICAgICAgICAgICAoaDQgPDwgMjEpIF5cbiAgICAgICAgICAgIChoNCA8PCA3KSkgK1xuICAgICAgICAgIChoNiBeIChoNCAmIChoNSBeIGg2KSkpICtcbiAgICAgICAgICB0aGlzLl9LW2ldKSB8XG4gICAgICAgIDA7XG5cbiAgICAgIGg3ID0gaDY7XG4gICAgICBoNiA9IGg1O1xuICAgICAgaDUgPSBoNDtcbiAgICAgIGg0ID0gaDMgKyB0bXA7XG4gICAgICBoMyA9IGgyO1xuICAgICAgaDIgPSBoMTtcbiAgICAgIGgxID0gaDA7XG4gICAgICBoMCA9XG4gICAgICAgICh0bXAgK1xuICAgICAgICAgICgoaDEgJiBoMikgXiAoaDMgJiAoaDEgXiBoMikpKSArXG4gICAgICAgICAgKChoMSA+Pj4gMikgXlxuICAgICAgICAgICAgKGgxID4+PiAxMykgXlxuICAgICAgICAgICAgKGgxID4+PiAyMikgXlxuICAgICAgICAgICAgKGgxIDw8IDMwKSBeXG4gICAgICAgICAgICAoaDEgPDwgMTkpIF5cbiAgICAgICAgICAgIChoMSA8PCAxMCkpKSB8XG4gICAgICAgIDA7XG4gICAgfVxuXG4gICAgaFswXSA9IChoWzBdICsgaDApIHwgMDtcbiAgICBoWzFdID0gKGhbMV0gKyBoMSkgfCAwO1xuICAgIGhbMl0gPSAoaFsyXSArIGgyKSB8IDA7XG4gICAgaFszXSA9IChoWzNdICsgaDMpIHwgMDtcbiAgICBoWzRdID0gKGhbNF0gKyBoNCkgfCAwO1xuICAgIGhbNV0gPSAoaFs1XSArIGg1KSB8IDA7XG4gICAgaFs2XSA9IChoWzZdICsgaDYpIHwgMDtcbiAgICBoWzddID0gKGhbN10gKyBoNykgfCAwO1xuICB9XG59XG5cbi8qKiBHZW5lcmF0ZXMgYSBTSEEyNTYgaGFzaCBvZiB0aGUgaW5wdXQgZGF0YS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaGEyNTYoXG4gIG1zZzogc3RyaW5nIHwgVWludDhBcnJheSxcbiAgaW5wdXRFbmNvZGluZz86IHN0cmluZyxcbiAgb3V0cHV0RW5jb2Rpbmc/OiBzdHJpbmdcbik6IHN0cmluZyB8IFVpbnQ4QXJyYXkge1xuICByZXR1cm4gbmV3IFNIQTI1NigpLnVwZGF0ZShtc2csIGlucHV0RW5jb2RpbmcpLmRpZ2VzdChvdXRwdXRFbmNvZGluZyk7XG59XG4iXX0=