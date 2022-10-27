import { encode, decode } from "./deps.ts";
/** Byte length of a SHA512 hash. */ export const BYTES = 64;
/** A class representation of the SHA2-512 algorithm. */ export class SHA512 {
    hashSize = BYTES;
    _buffer = new Uint8Array(128);
    _bufferIndex;
    _count;
    _K;
    _H;
    _finalized;
    /** Creates a SHA512 instance. */ constructor(){
        // prettier-ignore
        this._K = new Uint32Array([
            0x428a2f98,
            0xd728ae22,
            0x71374491,
            0x23ef65cd,
            0xb5c0fbcf,
            0xec4d3b2f,
            0xe9b5dba5,
            0x8189dbbc,
            0x3956c25b,
            0xf348b538,
            0x59f111f1,
            0xb605d019,
            0x923f82a4,
            0xaf194f9b,
            0xab1c5ed5,
            0xda6d8118,
            0xd807aa98,
            0xa3030242,
            0x12835b01,
            0x45706fbe,
            0x243185be,
            0x4ee4b28c,
            0x550c7dc3,
            0xd5ffb4e2,
            0x72be5d74,
            0xf27b896f,
            0x80deb1fe,
            0x3b1696b1,
            0x9bdc06a7,
            0x25c71235,
            0xc19bf174,
            0xcf692694,
            0xe49b69c1,
            0x9ef14ad2,
            0xefbe4786,
            0x384f25e3,
            0x0fc19dc6,
            0x8b8cd5b5,
            0x240ca1cc,
            0x77ac9c65,
            0x2de92c6f,
            0x592b0275,
            0x4a7484aa,
            0x6ea6e483,
            0x5cb0a9dc,
            0xbd41fbd4,
            0x76f988da,
            0x831153b5,
            0x983e5152,
            0xee66dfab,
            0xa831c66d,
            0x2db43210,
            0xb00327c8,
            0x98fb213f,
            0xbf597fc7,
            0xbeef0ee4,
            0xc6e00bf3,
            0x3da88fc2,
            0xd5a79147,
            0x930aa725,
            0x06ca6351,
            0xe003826f,
            0x14292967,
            0x0a0e6e70,
            0x27b70a85,
            0x46d22ffc,
            0x2e1b2138,
            0x5c26c926,
            0x4d2c6dfc,
            0x5ac42aed,
            0x53380d13,
            0x9d95b3df,
            0x650a7354,
            0x8baf63de,
            0x766a0abb,
            0x3c77b2a8,
            0x81c2c92e,
            0x47edaee6,
            0x92722c85,
            0x1482353b,
            0xa2bfe8a1,
            0x4cf10364,
            0xa81a664b,
            0xbc423001,
            0xc24b8b70,
            0xd0f89791,
            0xc76c51a3,
            0x0654be30,
            0xd192e819,
            0xd6ef5218,
            0xd6990624,
            0x5565a910,
            0xf40e3585,
            0x5771202a,
            0x106aa070,
            0x32bbd1b8,
            0x19a4c116,
            0xb8d2d0c8,
            0x1e376c08,
            0x5141ab53,
            0x2748774c,
            0xdf8eeb99,
            0x34b0bcb5,
            0xe19b48a8,
            0x391c0cb3,
            0xc5c95a63,
            0x4ed8aa4a,
            0xe3418acb,
            0x5b9cca4f,
            0x7763e373,
            0x682e6ff3,
            0xd6b2b8a3,
            0x748f82ee,
            0x5defb2fc,
            0x78a5636f,
            0x43172f60,
            0x84c87814,
            0xa1f0ab72,
            0x8cc70208,
            0x1a6439ec,
            0x90befffa,
            0x23631e28,
            0xa4506ceb,
            0xde82bde9,
            0xbef9a3f7,
            0xb2c67915,
            0xc67178f2,
            0xe372532b,
            0xca273ece,
            0xea26619c,
            0xd186b8c7,
            0x21c0c207,
            0xeada7dd6,
            0xcde0eb1e,
            0xf57d4f7f,
            0xee6ed178,
            0x06f067aa,
            0x72176fba,
            0x0a637dc5,
            0xa2c898a6,
            0x113f9804,
            0xbef90dae,
            0x1b710b35,
            0x131c471b,
            0x28db77f5,
            0x23047d84,
            0x32caab7b,
            0x40c72493,
            0x3c9ebe0a,
            0x15c9bebc,
            0x431d67c4,
            0x9c100d4c,
            0x4cc5d4be,
            0xcb3e42b6,
            0x597f299c,
            0xfc657e2a,
            0x5fcb6fab,
            0x3ad6faec,
            0x6c44198c,
            0x4a475817
        ]);
        this.init();
    }
    /** Initializes a SHA512 instance. */ init() {
        // prettier-ignore
        this._H = new Uint32Array([
            0x6a09e667,
            0xf3bcc908,
            0xbb67ae85,
            0x84caa73b,
            0x3c6ef372,
            0xfe94f82b,
            0xa54ff53a,
            0x5f1d36f1,
            0x510e527f,
            0xade682d1,
            0x9b05688c,
            0x2b3e6c1f,
            0x1f83d9ab,
            0xfb41bd6b,
            0x5be0cd19,
            0x137e2179
        ]);
        this._bufferIndex = 0;
        this._count = new Uint32Array(2);
        this._buffer.fill(0);
        this._finalized = false;
        return this;
    }
    /** Updates the hash with additional message data. */ update(msg, inputEncoding) {
        if (msg === null) {
            throw new TypeError("msg must be a string or Uint8Array.");
        } else if (typeof msg === "string") {
            msg = encode(msg, inputEncoding);
        }
        // process the msg as many times as possible, the rest is stored in the
        // buffer; message is processed in 1024 bit (128 byte chunks)
        for(let i = 0; i < msg.length; i++){
            this._buffer[this._bufferIndex++] = msg[i];
            if (this._bufferIndex === 128) {
                this.transform();
                this._bufferIndex = 0;
            }
        }
        // counter update (number of message bits)
        let c = this._count;
        if ((c[0] += msg.length << 3) < msg.length << 3) {
            c[1]++;
        }
        c[1] += msg.length >>> 29;
        return this;
    }
    /** Finalizes the hash with additional message data. */ digest(outputEncoding) {
        if (this._finalized) {
            throw new Error("digest has already been called.");
        }
        this._finalized = true;
        // append '1'
        var b = this._buffer, idx = this._bufferIndex;
        b[idx++] = 0x80;
        // zeropad up to byte pos 112
        while(idx !== 112){
            if (idx === 128) {
                this.transform();
                idx = 0;
            }
            b[idx++] = 0;
        }
        // append length in bits
        let c = this._count;
        b[112] = b[113] = b[114] = b[115] = b[116] = b[117] = b[118] = b[119] = 0;
        b[120] = c[1] >>> 24 & 0xff;
        b[121] = c[1] >>> 16 & 0xff;
        b[122] = c[1] >>> 8 & 0xff;
        b[123] = c[1] >>> 0 & 0xff;
        b[124] = c[0] >>> 24 & 0xff;
        b[125] = c[0] >>> 16 & 0xff;
        b[126] = c[0] >>> 8 & 0xff;
        b[127] = c[0] >>> 0 & 0xff;
        this.transform();
        // return the hash as byte array
        let i, hash = new Uint8Array(64);
        for(i = 0; i < 16; i++){
            hash[(i << 2) + 0] = this._H[i] >>> 24 & 0xff;
            hash[(i << 2) + 1] = this._H[i] >>> 16 & 0xff;
            hash[(i << 2) + 2] = this._H[i] >>> 8 & 0xff;
            hash[(i << 2) + 3] = this._H[i] & 0xff;
        }
        // clear internal states and prepare for new hash
        this.init();
        return outputEncoding ? decode(hash, outputEncoding) : hash;
    }
    /** Performs one transformation cycle. */ transform() {
        let h = this._H, h0h = h[0], h0l = h[1], h1h = h[2], h1l = h[3], h2h = h[4], h2l = h[5], h3h = h[6], h3l = h[7], h4h = h[8], h4l = h[9], h5h = h[10], h5l = h[11], h6h = h[12], h6l = h[13], h7h = h[14], h7l = h[15];
        let ah = h0h, al = h0l, bh = h1h, bl = h1l, ch = h2h, cl = h2l, dh = h3h, dl = h3l, eh = h4h, el = h4l, fh = h5h, fl = h5l, gh = h6h, gl = h6l, hh = h7h, hl = h7l;
        // convert byte buffer into w[0..31]
        let i, w = new Uint32Array(160);
        for(i = 0; i < 32; i++){
            w[i] = this._buffer[(i << 2) + 3] | this._buffer[(i << 2) + 2] << 8 | this._buffer[(i << 2) + 1] << 16 | this._buffer[i << 2] << 24;
        }
        // fill w[32..159]
        let gamma0xl, gamma0xh, gamma0l, gamma0h, gamma1xl, gamma1xh, gamma1l, gamma1h, wrl, wrh, wr7l, wr7h, wr16l, wr16h;
        for(i = 16; i < 80; i++){
            // Gamma0
            gamma0xh = w[(i - 15) * 2];
            gamma0xl = w[(i - 15) * 2 + 1];
            gamma0h = (gamma0xl << 31 | gamma0xh >>> 1) ^ (gamma0xl << 24 | gamma0xh >>> 8) ^ gamma0xh >>> 7;
            gamma0l = (gamma0xh << 31 | gamma0xl >>> 1) ^ (gamma0xh << 24 | gamma0xl >>> 8) ^ (gamma0xh << 25 | gamma0xl >>> 7);
            // Gamma1
            gamma1xh = w[(i - 2) * 2];
            gamma1xl = w[(i - 2) * 2 + 1];
            gamma1h = (gamma1xl << 13 | gamma1xh >>> 19) ^ (gamma1xh << 3 | gamma1xl >>> 29) ^ gamma1xh >>> 6;
            gamma1l = (gamma1xh << 13 | gamma1xl >>> 19) ^ (gamma1xl << 3 | gamma1xh >>> 29) ^ (gamma1xh << 26 | gamma1xl >>> 6);
            // shortcuts
            wr7h = w[(i - 7) * 2], wr7l = w[(i - 7) * 2 + 1], wr16h = w[(i - 16) * 2], wr16l = w[(i - 16) * 2 + 1];
            // W(round) = gamma0 + W(round - 7) + gamma1 + W(round - 16)
            wrl = gamma0l + wr7l;
            wrh = gamma0h + wr7h + (wrl >>> 0 >> 0 ? 1 : 0);
            wrl += gamma1l;
            wrh += gamma1h + (wrl >>> 0 >> 0 ? 1 : 0);
            wrl += wr16l;
            wrh += wr16h + (wrl >>> 0 >> 0 ? 1 : 0);
            // store
            w[i * 2] = wrh;
            w[i * 2 + 1] = wrl;
        }
        // compress
        let chl, chh, majl, majh, sig0l, sig0h, sig1l, sig1h, krl, krh, t1l, t1h, t2l, t2h;
        for(i = 0; i < 80; i++){
            // Ch
            chh = eh & fh ^ ~eh & gh;
            chl = el & fl ^ ~el & gl;
            // Maj
            majh = ah & bh ^ ah & ch ^ bh & ch;
            majl = al & bl ^ al & cl ^ bl & cl;
            // Sigma0
            sig0h = (al << 4 | ah >>> 28) ^ (ah << 30 | al >>> 2) ^ (ah << 25 | al >>> 7);
            sig0l = (ah << 4 | al >>> 28) ^ (al << 30 | ah >>> 2) ^ (al << 25 | ah >>> 7);
            // Sigma1
            sig1h = (el << 18 | eh >>> 14) ^ (el << 14 | eh >>> 18) ^ (eh << 23 | el >>> 9);
            sig1l = (eh << 18 | el >>> 14) ^ (eh << 14 | el >>> 18) ^ (el << 23 | eh >>> 9);
            // K(round)
            krh = this._K[i * 2];
            krl = this._K[i * 2 + 1];
            // t1 = h + sigma1 + ch + K(round) + W(round)
            t1l = hl + sig1l;
            t1h = hh + sig1h + (t1l >>> 0 >> 0 ? 1 : 0);
            t1l += chl;
            t1h += chh + (t1l >>> 0 >> 0 ? 1 : 0);
            t1l += krl;
            t1h += krh + (t1l >>> 0 >> 0 ? 1 : 0);
            t1l = t1l + w[i * 2 + 1];
            t1h += w[i * 2] + (t1l >>> 0 < w[i * 2 + 1] >>> 0 ? 1 : 0);
            // t2 = sigma0 + maj
            t2l = sig0l + majl;
            t2h = sig0h + majh + (t2l >>> 0 >> 0 ? 1 : 0);
            // update working variables
            hh = gh;
            hl = gl;
            gh = fh;
            gl = fl;
            fh = eh;
            fl = el;
            el = dl + t1l | 0;
            eh = dh + t1h + (el >>> 0 >> 0 ? 1 : 0) | 0;
            dh = ch;
            dl = cl;
            ch = bh;
            cl = bl;
            bh = ah;
            bl = al;
            al = t1l + t2l | 0;
            ah = t1h + t2h + (al >>> 0 >> 0 ? 1 : 0) | 0;
        }
        // intermediate hash
        h0l = h[1] = h0l + al | 0;
        h[0] = h0h + ah + (h0l >>> 0 >> 0 ? 1 : 0) | 0;
        h1l = h[3] = h1l + bl | 0;
        h[2] = h1h + bh + (h1l >>> 0 >> 0 ? 1 : 0) | 0;
        h2l = h[5] = h2l + cl | 0;
        h[4] = h2h + ch + (h2l >>> 0 >> 0 ? 1 : 0) | 0;
        h3l = h[7] = h3l + dl | 0;
        h[6] = h3h + dh + (h3l >>> 0 >> 0 ? 1 : 0) | 0;
        h4l = h[9] = h4l + el | 0;
        h[8] = h4h + eh + (h4l >>> 0 >> 0 ? 1 : 0) | 0;
        h5l = h[11] = h5l + fl | 0;
        h[10] = h5h + fh + (h5l >>> 0 >> 0 ? 1 : 0) | 0;
        h6l = h[13] = h6l + gl | 0;
        h[12] = h6h + gh + (h6l >>> 0 >> 0 ? 1 : 0) | 0;
        h7l = h[15] = h7l + hl | 0;
        h[14] = h7h + hh + (h7l >>> 0 >> 0 ? 1 : 0) | 0;
    }
}
/** Obtain a SHA512 hash of an utf8 encoded string or an Uint8Array. */ export function sha512(msg, inputEncoding, outputEncoding) {
    return new SHA512().init().update(msg, inputEncoding).digest(outputEncoding);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVub3BrZy5jb20vY2hpZWZiaWlrby9zaGE1MTJAdjIuMC4wL21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlbmNvZGUsIGRlY29kZSB9IGZyb20gXCIuL2RlcHMudHNcIjtcblxuLyoqIEJ5dGUgbGVuZ3RoIG9mIGEgU0hBNTEyIGhhc2guICovXG5leHBvcnQgY29uc3QgQllURVM6IG51bWJlciA9IDY0O1xuXG4vKiogQSBjbGFzcyByZXByZXNlbnRhdGlvbiBvZiB0aGUgU0hBMi01MTIgYWxnb3JpdGhtLiAqL1xuZXhwb3J0IGNsYXNzIFNIQTUxMiB7XG4gIHJlYWRvbmx5IGhhc2hTaXplOiBudW1iZXIgPSBCWVRFUztcblxuICBwcml2YXRlIF9idWZmZXI6IFVpbnQ4QXJyYXkgPSBuZXcgVWludDhBcnJheSgxMjgpO1xuICBwcml2YXRlIF9idWZmZXJJbmRleCE6IG51bWJlcjtcbiAgcHJpdmF0ZSBfY291bnQhOiBVaW50MzJBcnJheTtcbiAgcHJpdmF0ZSBfSzogVWludDMyQXJyYXk7XG4gIHByaXZhdGUgX0ghOiBVaW50MzJBcnJheTtcbiAgcHJpdmF0ZSBfZmluYWxpemVkITogYm9vbGVhbjtcblxuICAvKiogQ3JlYXRlcyBhIFNIQTUxMiBpbnN0YW5jZS4gKi9cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gcHJldHRpZXItaWdub3JlXG4gICAgdGhpcy5fSyA9IG5ldyBVaW50MzJBcnJheShbXG4gICAgICAweDQyOGEyZjk4LCAweGQ3MjhhZTIyLCAweDcxMzc0NDkxLCAweDIzZWY2NWNkLCAweGI1YzBmYmNmLCAweGVjNGQzYjJmLFxuICAgICAgMHhlOWI1ZGJhNSwgMHg4MTg5ZGJiYywgMHgzOTU2YzI1YiwgMHhmMzQ4YjUzOCwgMHg1OWYxMTFmMSwgMHhiNjA1ZDAxOSxcbiAgICAgIDB4OTIzZjgyYTQsIDB4YWYxOTRmOWIsIDB4YWIxYzVlZDUsIDB4ZGE2ZDgxMTgsIDB4ZDgwN2FhOTgsIDB4YTMwMzAyNDIsXG4gICAgICAweDEyODM1YjAxLCAweDQ1NzA2ZmJlLCAweDI0MzE4NWJlLCAweDRlZTRiMjhjLCAweDU1MGM3ZGMzLCAweGQ1ZmZiNGUyLFxuICAgICAgMHg3MmJlNWQ3NCwgMHhmMjdiODk2ZiwgMHg4MGRlYjFmZSwgMHgzYjE2OTZiMSwgMHg5YmRjMDZhNywgMHgyNWM3MTIzNSxcbiAgICAgIDB4YzE5YmYxNzQsIDB4Y2Y2OTI2OTQsIDB4ZTQ5YjY5YzEsIDB4OWVmMTRhZDIsIDB4ZWZiZTQ3ODYsIDB4Mzg0ZjI1ZTMsXG4gICAgICAweDBmYzE5ZGM2LCAweDhiOGNkNWI1LCAweDI0MGNhMWNjLCAweDc3YWM5YzY1LCAweDJkZTkyYzZmLCAweDU5MmIwMjc1LFxuICAgICAgMHg0YTc0ODRhYSwgMHg2ZWE2ZTQ4MywgMHg1Y2IwYTlkYywgMHhiZDQxZmJkNCwgMHg3NmY5ODhkYSwgMHg4MzExNTNiNSxcbiAgICAgIDB4OTgzZTUxNTIsIDB4ZWU2NmRmYWIsIDB4YTgzMWM2NmQsIDB4MmRiNDMyMTAsIDB4YjAwMzI3YzgsIDB4OThmYjIxM2YsXG4gICAgICAweGJmNTk3ZmM3LCAweGJlZWYwZWU0LCAweGM2ZTAwYmYzLCAweDNkYTg4ZmMyLCAweGQ1YTc5MTQ3LCAweDkzMGFhNzI1LFxuICAgICAgMHgwNmNhNjM1MSwgMHhlMDAzODI2ZiwgMHgxNDI5Mjk2NywgMHgwYTBlNmU3MCwgMHgyN2I3MGE4NSwgMHg0NmQyMmZmYyxcbiAgICAgIDB4MmUxYjIxMzgsIDB4NWMyNmM5MjYsIDB4NGQyYzZkZmMsIDB4NWFjNDJhZWQsIDB4NTMzODBkMTMsIDB4OWQ5NWIzZGYsXG4gICAgICAweDY1MGE3MzU0LCAweDhiYWY2M2RlLCAweDc2NmEwYWJiLCAweDNjNzdiMmE4LCAweDgxYzJjOTJlLCAweDQ3ZWRhZWU2LFxuICAgICAgMHg5MjcyMmM4NSwgMHgxNDgyMzUzYiwgMHhhMmJmZThhMSwgMHg0Y2YxMDM2NCwgMHhhODFhNjY0YiwgMHhiYzQyMzAwMSxcbiAgICAgIDB4YzI0YjhiNzAsIDB4ZDBmODk3OTEsIDB4Yzc2YzUxYTMsIDB4MDY1NGJlMzAsIDB4ZDE5MmU4MTksIDB4ZDZlZjUyMTgsXG4gICAgICAweGQ2OTkwNjI0LCAweDU1NjVhOTEwLCAweGY0MGUzNTg1LCAweDU3NzEyMDJhLCAweDEwNmFhMDcwLCAweDMyYmJkMWI4LFxuICAgICAgMHgxOWE0YzExNiwgMHhiOGQyZDBjOCwgMHgxZTM3NmMwOCwgMHg1MTQxYWI1MywgMHgyNzQ4Nzc0YywgMHhkZjhlZWI5OSxcbiAgICAgIDB4MzRiMGJjYjUsIDB4ZTE5YjQ4YTgsIDB4MzkxYzBjYjMsIDB4YzVjOTVhNjMsIDB4NGVkOGFhNGEsIDB4ZTM0MThhY2IsXG4gICAgICAweDViOWNjYTRmLCAweDc3NjNlMzczLCAweDY4MmU2ZmYzLCAweGQ2YjJiOGEzLCAweDc0OGY4MmVlLCAweDVkZWZiMmZjLFxuICAgICAgMHg3OGE1NjM2ZiwgMHg0MzE3MmY2MCwgMHg4NGM4NzgxNCwgMHhhMWYwYWI3MiwgMHg4Y2M3MDIwOCwgMHgxYTY0MzllYyxcbiAgICAgIDB4OTBiZWZmZmEsIDB4MjM2MzFlMjgsIDB4YTQ1MDZjZWIsIDB4ZGU4MmJkZTksIDB4YmVmOWEzZjcsIDB4YjJjNjc5MTUsXG4gICAgICAweGM2NzE3OGYyLCAweGUzNzI1MzJiLCAweGNhMjczZWNlLCAweGVhMjY2MTljLCAweGQxODZiOGM3LCAweDIxYzBjMjA3LFxuICAgICAgMHhlYWRhN2RkNiwgMHhjZGUwZWIxZSwgMHhmNTdkNGY3ZiwgMHhlZTZlZDE3OCwgMHgwNmYwNjdhYSwgMHg3MjE3NmZiYSxcbiAgICAgIDB4MGE2MzdkYzUsIDB4YTJjODk4YTYsIDB4MTEzZjk4MDQsIDB4YmVmOTBkYWUsIDB4MWI3MTBiMzUsIDB4MTMxYzQ3MWIsXG4gICAgICAweDI4ZGI3N2Y1LCAweDIzMDQ3ZDg0LCAweDMyY2FhYjdiLCAweDQwYzcyNDkzLCAweDNjOWViZTBhLCAweDE1YzliZWJjLFxuICAgICAgMHg0MzFkNjdjNCwgMHg5YzEwMGQ0YywgMHg0Y2M1ZDRiZSwgMHhjYjNlNDJiNiwgMHg1OTdmMjk5YywgMHhmYzY1N2UyYSxcbiAgICAgIDB4NWZjYjZmYWIsIDB4M2FkNmZhZWMsIDB4NmM0NDE5OGMsIDB4NGE0NzU4MTdcbiAgICBdKTtcblxuICAgIHRoaXMuaW5pdCgpO1xuICB9XG5cbiAgLyoqIEluaXRpYWxpemVzIGEgU0hBNTEyIGluc3RhbmNlLiAqL1xuICBpbml0KCk6IFNIQTUxMiB7XG4gICAgLy8gcHJldHRpZXItaWdub3JlXG4gICAgdGhpcy5fSCA9IG5ldyBVaW50MzJBcnJheShbXG4gICAgICAweDZhMDllNjY3LCAweGYzYmNjOTA4LCAweGJiNjdhZTg1LCAweDg0Y2FhNzNiLCAweDNjNmVmMzcyLCAweGZlOTRmODJiLFxuICAgICAgMHhhNTRmZjUzYSwgMHg1ZjFkMzZmMSwgMHg1MTBlNTI3ZiwgMHhhZGU2ODJkMSwgMHg5YjA1Njg4YywgMHgyYjNlNmMxZixcbiAgICAgIDB4MWY4M2Q5YWIsIDB4ZmI0MWJkNmIsIDB4NWJlMGNkMTksIDB4MTM3ZTIxNzlcbiAgICBdKTtcblxuICAgIHRoaXMuX2J1ZmZlckluZGV4ID0gMDtcbiAgICB0aGlzLl9jb3VudCA9IG5ldyBVaW50MzJBcnJheSgyKTtcbiAgICB0aGlzLl9idWZmZXIuZmlsbCgwKTtcbiAgICB0aGlzLl9maW5hbGl6ZWQgPSBmYWxzZTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqIFVwZGF0ZXMgdGhlIGhhc2ggd2l0aCBhZGRpdGlvbmFsIG1lc3NhZ2UgZGF0YS4gKi9cbiAgdXBkYXRlKG1zZzogc3RyaW5nIHwgVWludDhBcnJheSwgaW5wdXRFbmNvZGluZz86IHN0cmluZyk6IFNIQTUxMiB7XG4gICAgaWYgKG1zZyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm1zZyBtdXN0IGJlIGEgc3RyaW5nIG9yIFVpbnQ4QXJyYXkuXCIpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1zZyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgbXNnID0gZW5jb2RlKG1zZywgaW5wdXRFbmNvZGluZykgYXMgVWludDhBcnJheTtcbiAgICB9XG5cbiAgICAvLyBwcm9jZXNzIHRoZSBtc2cgYXMgbWFueSB0aW1lcyBhcyBwb3NzaWJsZSwgdGhlIHJlc3QgaXMgc3RvcmVkIGluIHRoZVxuICAgIC8vIGJ1ZmZlcjsgbWVzc2FnZSBpcyBwcm9jZXNzZWQgaW4gMTAyNCBiaXQgKDEyOCBieXRlIGNodW5rcylcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1zZy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5fYnVmZmVyW3RoaXMuX2J1ZmZlckluZGV4KytdID0gbXNnW2ldO1xuICAgICAgaWYgKHRoaXMuX2J1ZmZlckluZGV4ID09PSAxMjgpIHtcbiAgICAgICAgdGhpcy50cmFuc2Zvcm0oKTtcbiAgICAgICAgdGhpcy5fYnVmZmVySW5kZXggPSAwO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNvdW50ZXIgdXBkYXRlIChudW1iZXIgb2YgbWVzc2FnZSBiaXRzKVxuICAgIGxldCBjID0gdGhpcy5fY291bnQ7XG5cbiAgICBpZiAoKGNbMF0gKz0gbXNnLmxlbmd0aCA8PCAzKSA8IG1zZy5sZW5ndGggPDwgMykge1xuICAgICAgY1sxXSsrO1xuICAgIH1cblxuICAgIGNbMV0gKz0gbXNnLmxlbmd0aCA+Pj4gMjk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBGaW5hbGl6ZXMgdGhlIGhhc2ggd2l0aCBhZGRpdGlvbmFsIG1lc3NhZ2UgZGF0YS4gKi9cbiAgZGlnZXN0KG91dHB1dEVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHwgVWludDhBcnJheSB7XG4gICAgaWYgKHRoaXMuX2ZpbmFsaXplZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZGlnZXN0IGhhcyBhbHJlYWR5IGJlZW4gY2FsbGVkLlwiKVxuICAgIH1cblxuICAgIHRoaXMuX2ZpbmFsaXplZCA9IHRydWU7XG5cbiAgICAvLyBhcHBlbmQgJzEnXG4gICAgdmFyIGIgPSB0aGlzLl9idWZmZXIsXG4gICAgICBpZHggPSB0aGlzLl9idWZmZXJJbmRleDtcbiAgICBiW2lkeCsrXSA9IDB4ODA7XG5cbiAgICAvLyB6ZXJvcGFkIHVwIHRvIGJ5dGUgcG9zIDExMlxuICAgIHdoaWxlIChpZHggIT09IDExMikge1xuICAgICAgaWYgKGlkeCA9PT0gMTI4KSB7XG4gICAgICAgIHRoaXMudHJhbnNmb3JtKCk7XG4gICAgICAgIGlkeCA9IDA7XG4gICAgICB9XG4gICAgICBiW2lkeCsrXSA9IDA7XG4gICAgfVxuXG4gICAgLy8gYXBwZW5kIGxlbmd0aCBpbiBiaXRzXG4gICAgbGV0IGMgPSB0aGlzLl9jb3VudDtcblxuICAgIGJbMTEyXSA9IGJbMTEzXSA9IGJbMTE0XSA9IGJbMTE1XSA9IGJbMTE2XSA9IGJbMTE3XSA9IGJbMTE4XSA9IGJbMTE5XSA9IDA7XG4gICAgYlsxMjBdID0gKGNbMV0gPj4+IDI0KSAmIDB4ZmY7XG4gICAgYlsxMjFdID0gKGNbMV0gPj4+IDE2KSAmIDB4ZmY7XG4gICAgYlsxMjJdID0gKGNbMV0gPj4+IDgpICYgMHhmZjtcbiAgICBiWzEyM10gPSAoY1sxXSA+Pj4gMCkgJiAweGZmO1xuICAgIGJbMTI0XSA9IChjWzBdID4+PiAyNCkgJiAweGZmO1xuICAgIGJbMTI1XSA9IChjWzBdID4+PiAxNikgJiAweGZmO1xuICAgIGJbMTI2XSA9IChjWzBdID4+PiA4KSAmIDB4ZmY7XG4gICAgYlsxMjddID0gKGNbMF0gPj4+IDApICYgMHhmZjtcblxuICAgIHRoaXMudHJhbnNmb3JtKCk7XG5cbiAgICAvLyByZXR1cm4gdGhlIGhhc2ggYXMgYnl0ZSBhcnJheVxuICAgIGxldCBpLFxuICAgICAgaGFzaCA9IG5ldyBVaW50OEFycmF5KDY0KTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCAxNjsgaSsrKSB7XG4gICAgICBoYXNoWyhpIDw8IDIpICsgMF0gPSAodGhpcy5fSFtpXSA+Pj4gMjQpICYgMHhmZjtcbiAgICAgIGhhc2hbKGkgPDwgMikgKyAxXSA9ICh0aGlzLl9IW2ldID4+PiAxNikgJiAweGZmO1xuICAgICAgaGFzaFsoaSA8PCAyKSArIDJdID0gKHRoaXMuX0hbaV0gPj4+IDgpICYgMHhmZjtcbiAgICAgIGhhc2hbKGkgPDwgMikgKyAzXSA9IHRoaXMuX0hbaV0gJiAweGZmO1xuICAgIH1cblxuICAgIC8vIGNsZWFyIGludGVybmFsIHN0YXRlcyBhbmQgcHJlcGFyZSBmb3IgbmV3IGhhc2hcbiAgICB0aGlzLmluaXQoKTtcblxuICAgIHJldHVybiBvdXRwdXRFbmNvZGluZyA/IGRlY29kZShoYXNoLCBvdXRwdXRFbmNvZGluZykgOiBoYXNoO1xuICB9XG5cbiAgLyoqIFBlcmZvcm1zIG9uZSB0cmFuc2Zvcm1hdGlvbiBjeWNsZS4gKi9cbiAgcHJpdmF0ZSB0cmFuc2Zvcm0oKTogdm9pZCB7XG4gICAgbGV0IGggPSB0aGlzLl9ILFxuICAgICAgaDBoID0gaFswXSxcbiAgICAgIGgwbCA9IGhbMV0sXG4gICAgICBoMWggPSBoWzJdLFxuICAgICAgaDFsID0gaFszXSxcbiAgICAgIGgyaCA9IGhbNF0sXG4gICAgICBoMmwgPSBoWzVdLFxuICAgICAgaDNoID0gaFs2XSxcbiAgICAgIGgzbCA9IGhbN10sXG4gICAgICBoNGggPSBoWzhdLFxuICAgICAgaDRsID0gaFs5XSxcbiAgICAgIGg1aCA9IGhbMTBdLFxuICAgICAgaDVsID0gaFsxMV0sXG4gICAgICBoNmggPSBoWzEyXSxcbiAgICAgIGg2bCA9IGhbMTNdLFxuICAgICAgaDdoID0gaFsxNF0sXG4gICAgICBoN2wgPSBoWzE1XTtcblxuICAgIGxldCBhaCA9IGgwaCxcbiAgICAgIGFsID0gaDBsLFxuICAgICAgYmggPSBoMWgsXG4gICAgICBibCA9IGgxbCxcbiAgICAgIGNoID0gaDJoLFxuICAgICAgY2wgPSBoMmwsXG4gICAgICBkaCA9IGgzaCxcbiAgICAgIGRsID0gaDNsLFxuICAgICAgZWggPSBoNGgsXG4gICAgICBlbCA9IGg0bCxcbiAgICAgIGZoID0gaDVoLFxuICAgICAgZmwgPSBoNWwsXG4gICAgICBnaCA9IGg2aCxcbiAgICAgIGdsID0gaDZsLFxuICAgICAgaGggPSBoN2gsXG4gICAgICBobCA9IGg3bDtcblxuICAgIC8vIGNvbnZlcnQgYnl0ZSBidWZmZXIgaW50byB3WzAuLjMxXVxuICAgIGxldCBpLFxuICAgICAgdyA9IG5ldyBVaW50MzJBcnJheSgxNjApO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IDMyOyBpKyspIHtcbiAgICAgIHdbaV0gPVxuICAgICAgICB0aGlzLl9idWZmZXJbKGkgPDwgMikgKyAzXSB8XG4gICAgICAgICh0aGlzLl9idWZmZXJbKGkgPDwgMikgKyAyXSA8PCA4KSB8XG4gICAgICAgICh0aGlzLl9idWZmZXJbKGkgPDwgMikgKyAxXSA8PCAxNikgfFxuICAgICAgICAodGhpcy5fYnVmZmVyW2kgPDwgMl0gPDwgMjQpO1xuICAgIH1cblxuICAgIC8vIGZpbGwgd1szMi4uMTU5XVxuICAgIGxldCBnYW1tYTB4bCxcbiAgICAgIGdhbW1hMHhoLFxuICAgICAgZ2FtbWEwbCxcbiAgICAgIGdhbW1hMGgsXG4gICAgICBnYW1tYTF4bCxcbiAgICAgIGdhbW1hMXhoLFxuICAgICAgZ2FtbWExbCxcbiAgICAgIGdhbW1hMWgsXG4gICAgICB3cmwsXG4gICAgICB3cmgsXG4gICAgICB3cjdsLFxuICAgICAgd3I3aCxcbiAgICAgIHdyMTZsLFxuICAgICAgd3IxNmg7XG5cbiAgICBmb3IgKGkgPSAxNjsgaSA8IDgwOyBpKyspIHtcbiAgICAgIC8vIEdhbW1hMFxuICAgICAgZ2FtbWEweGggPSB3WyhpIC0gMTUpICogMl07XG4gICAgICBnYW1tYTB4bCA9IHdbKGkgLSAxNSkgKiAyICsgMV07XG4gICAgICBnYW1tYTBoID1cbiAgICAgICAgKChnYW1tYTB4bCA8PCAzMSkgfCAoZ2FtbWEweGggPj4+IDEpKSBeXG4gICAgICAgICgoZ2FtbWEweGwgPDwgMjQpIHwgKGdhbW1hMHhoID4+PiA4KSkgXlxuICAgICAgICAoZ2FtbWEweGggPj4+IDcpO1xuICAgICAgZ2FtbWEwbCA9XG4gICAgICAgICgoZ2FtbWEweGggPDwgMzEpIHwgKGdhbW1hMHhsID4+PiAxKSkgXlxuICAgICAgICAoKGdhbW1hMHhoIDw8IDI0KSB8IChnYW1tYTB4bCA+Pj4gOCkpIF5cbiAgICAgICAgKChnYW1tYTB4aCA8PCAyNSkgfCAoZ2FtbWEweGwgPj4+IDcpKTtcblxuICAgICAgLy8gR2FtbWExXG4gICAgICBnYW1tYTF4aCA9IHdbKGkgLSAyKSAqIDJdO1xuICAgICAgZ2FtbWExeGwgPSB3WyhpIC0gMikgKiAyICsgMV07XG4gICAgICBnYW1tYTFoID1cbiAgICAgICAgKChnYW1tYTF4bCA8PCAxMykgfCAoZ2FtbWExeGggPj4+IDE5KSkgXlxuICAgICAgICAoKGdhbW1hMXhoIDw8IDMpIHwgKGdhbW1hMXhsID4+PiAyOSkpIF5cbiAgICAgICAgKGdhbW1hMXhoID4+PiA2KTtcbiAgICAgIGdhbW1hMWwgPVxuICAgICAgICAoKGdhbW1hMXhoIDw8IDEzKSB8IChnYW1tYTF4bCA+Pj4gMTkpKSBeXG4gICAgICAgICgoZ2FtbWExeGwgPDwgMykgfCAoZ2FtbWExeGggPj4+IDI5KSkgXlxuICAgICAgICAoKGdhbW1hMXhoIDw8IDI2KSB8IChnYW1tYTF4bCA+Pj4gNikpO1xuXG4gICAgICAvLyBzaG9ydGN1dHNcbiAgICAgICh3cjdoID0gd1soaSAtIDcpICogMl0pLFxuICAgICAgICAod3I3bCA9IHdbKGkgLSA3KSAqIDIgKyAxXSksXG4gICAgICAgICh3cjE2aCA9IHdbKGkgLSAxNikgKiAyXSksXG4gICAgICAgICh3cjE2bCA9IHdbKGkgLSAxNikgKiAyICsgMV0pO1xuXG4gICAgICAvLyBXKHJvdW5kKSA9IGdhbW1hMCArIFcocm91bmQgLSA3KSArIGdhbW1hMSArIFcocm91bmQgLSAxNilcbiAgICAgIHdybCA9IGdhbW1hMGwgKyB3cjdsO1xuICAgICAgd3JoID0gZ2FtbWEwaCArIHdyN2ggKyAod3JsID4+PiAwIDwgZ2FtbWEwbCA+Pj4gMCA/IDEgOiAwKTtcbiAgICAgIHdybCArPSBnYW1tYTFsO1xuICAgICAgd3JoICs9IGdhbW1hMWggKyAod3JsID4+PiAwIDwgZ2FtbWExbCA+Pj4gMCA/IDEgOiAwKTtcbiAgICAgIHdybCArPSB3cjE2bDtcbiAgICAgIHdyaCArPSB3cjE2aCArICh3cmwgPj4+IDAgPCB3cjE2bCA+Pj4gMCA/IDEgOiAwKTtcblxuICAgICAgLy8gc3RvcmVcbiAgICAgIHdbaSAqIDJdID0gd3JoO1xuICAgICAgd1tpICogMiArIDFdID0gd3JsO1xuICAgIH1cblxuICAgIC8vIGNvbXByZXNzXG4gICAgbGV0IGNobCxcbiAgICAgIGNoaCxcbiAgICAgIG1hamwsXG4gICAgICBtYWpoLFxuICAgICAgc2lnMGwsXG4gICAgICBzaWcwaCxcbiAgICAgIHNpZzFsLFxuICAgICAgc2lnMWgsXG4gICAgICBrcmwsXG4gICAgICBrcmgsXG4gICAgICB0MWwsXG4gICAgICB0MWgsXG4gICAgICB0MmwsXG4gICAgICB0Mmg7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgODA7IGkrKykge1xuICAgICAgLy8gQ2hcbiAgICAgIGNoaCA9IChlaCAmIGZoKSBeICh+ZWggJiBnaCk7XG4gICAgICBjaGwgPSAoZWwgJiBmbCkgXiAofmVsICYgZ2wpO1xuXG4gICAgICAvLyBNYWpcbiAgICAgIG1hamggPSAoYWggJiBiaCkgXiAoYWggJiBjaCkgXiAoYmggJiBjaCk7XG4gICAgICBtYWpsID0gKGFsICYgYmwpIF4gKGFsICYgY2wpIF4gKGJsICYgY2wpO1xuXG4gICAgICAvLyBTaWdtYTBcbiAgICAgIHNpZzBoID1cbiAgICAgICAgKChhbCA8PCA0KSB8IChhaCA+Pj4gMjgpKSBeXG4gICAgICAgICgoYWggPDwgMzApIHwgKGFsID4+PiAyKSkgXlxuICAgICAgICAoKGFoIDw8IDI1KSB8IChhbCA+Pj4gNykpO1xuICAgICAgc2lnMGwgPVxuICAgICAgICAoKGFoIDw8IDQpIHwgKGFsID4+PiAyOCkpIF5cbiAgICAgICAgKChhbCA8PCAzMCkgfCAoYWggPj4+IDIpKSBeXG4gICAgICAgICgoYWwgPDwgMjUpIHwgKGFoID4+PiA3KSk7XG5cbiAgICAgIC8vIFNpZ21hMVxuICAgICAgc2lnMWggPVxuICAgICAgICAoKGVsIDw8IDE4KSB8IChlaCA+Pj4gMTQpKSBeXG4gICAgICAgICgoZWwgPDwgMTQpIHwgKGVoID4+PiAxOCkpIF5cbiAgICAgICAgKChlaCA8PCAyMykgfCAoZWwgPj4+IDkpKTtcbiAgICAgIHNpZzFsID1cbiAgICAgICAgKChlaCA8PCAxOCkgfCAoZWwgPj4+IDE0KSkgXlxuICAgICAgICAoKGVoIDw8IDE0KSB8IChlbCA+Pj4gMTgpKSBeXG4gICAgICAgICgoZWwgPDwgMjMpIHwgKGVoID4+PiA5KSk7XG5cbiAgICAgIC8vIEsocm91bmQpXG4gICAgICBrcmggPSB0aGlzLl9LW2kgKiAyXTtcbiAgICAgIGtybCA9IHRoaXMuX0tbaSAqIDIgKyAxXTtcblxuICAgICAgLy8gdDEgPSBoICsgc2lnbWExICsgY2ggKyBLKHJvdW5kKSArIFcocm91bmQpXG4gICAgICB0MWwgPSBobCArIHNpZzFsO1xuICAgICAgdDFoID0gaGggKyBzaWcxaCArICh0MWwgPj4+IDAgPCBobCA+Pj4gMCA/IDEgOiAwKTtcbiAgICAgIHQxbCArPSBjaGw7XG4gICAgICB0MWggKz0gY2hoICsgKHQxbCA+Pj4gMCA8IGNobCA+Pj4gMCA/IDEgOiAwKTtcbiAgICAgIHQxbCArPSBrcmw7XG4gICAgICB0MWggKz0ga3JoICsgKHQxbCA+Pj4gMCA8IGtybCA+Pj4gMCA/IDEgOiAwKTtcbiAgICAgIHQxbCA9IHQxbCArIHdbaSAqIDIgKyAxXTtcbiAgICAgIHQxaCArPSB3W2kgKiAyXSArICh0MWwgPj4+IDAgPCB3W2kgKiAyICsgMV0gPj4+IDAgPyAxIDogMCk7XG5cbiAgICAgIC8vIHQyID0gc2lnbWEwICsgbWFqXG4gICAgICB0MmwgPSBzaWcwbCArIG1hamw7XG4gICAgICB0MmggPSBzaWcwaCArIG1hamggKyAodDJsID4+PiAwIDwgc2lnMGwgPj4+IDAgPyAxIDogMCk7XG5cbiAgICAgIC8vIHVwZGF0ZSB3b3JraW5nIHZhcmlhYmxlc1xuICAgICAgaGggPSBnaDtcbiAgICAgIGhsID0gZ2w7XG4gICAgICBnaCA9IGZoO1xuICAgICAgZ2wgPSBmbDtcbiAgICAgIGZoID0gZWg7XG4gICAgICBmbCA9IGVsO1xuICAgICAgZWwgPSAoZGwgKyB0MWwpIHwgMDtcbiAgICAgIGVoID0gKGRoICsgdDFoICsgKGVsID4+PiAwIDwgZGwgPj4+IDAgPyAxIDogMCkpIHwgMDtcbiAgICAgIGRoID0gY2g7XG4gICAgICBkbCA9IGNsO1xuICAgICAgY2ggPSBiaDtcbiAgICAgIGNsID0gYmw7XG4gICAgICBiaCA9IGFoO1xuICAgICAgYmwgPSBhbDtcbiAgICAgIGFsID0gKHQxbCArIHQybCkgfCAwO1xuICAgICAgYWggPSAodDFoICsgdDJoICsgKGFsID4+PiAwIDwgdDFsID4+PiAwID8gMSA6IDApKSB8IDA7XG4gICAgfVxuXG4gICAgLy8gaW50ZXJtZWRpYXRlIGhhc2hcbiAgICBoMGwgPSBoWzFdID0gKGgwbCArIGFsKSB8IDA7XG4gICAgaFswXSA9IChoMGggKyBhaCArIChoMGwgPj4+IDAgPCBhbCA+Pj4gMCA/IDEgOiAwKSkgfCAwO1xuICAgIGgxbCA9IGhbM10gPSAoaDFsICsgYmwpIHwgMDtcbiAgICBoWzJdID0gKGgxaCArIGJoICsgKGgxbCA+Pj4gMCA8IGJsID4+PiAwID8gMSA6IDApKSB8IDA7XG4gICAgaDJsID0gaFs1XSA9IChoMmwgKyBjbCkgfCAwO1xuICAgIGhbNF0gPSAoaDJoICsgY2ggKyAoaDJsID4+PiAwIDwgY2wgPj4+IDAgPyAxIDogMCkpIHwgMDtcbiAgICBoM2wgPSBoWzddID0gKGgzbCArIGRsKSB8IDA7XG4gICAgaFs2XSA9IChoM2ggKyBkaCArIChoM2wgPj4+IDAgPCBkbCA+Pj4gMCA/IDEgOiAwKSkgfCAwO1xuICAgIGg0bCA9IGhbOV0gPSAoaDRsICsgZWwpIHwgMDtcbiAgICBoWzhdID0gKGg0aCArIGVoICsgKGg0bCA+Pj4gMCA8IGVsID4+PiAwID8gMSA6IDApKSB8IDA7XG4gICAgaDVsID0gaFsxMV0gPSAoaDVsICsgZmwpIHwgMDtcbiAgICBoWzEwXSA9IChoNWggKyBmaCArIChoNWwgPj4+IDAgPCBmbCA+Pj4gMCA/IDEgOiAwKSkgfCAwO1xuICAgIGg2bCA9IGhbMTNdID0gKGg2bCArIGdsKSB8IDA7XG4gICAgaFsxMl0gPSAoaDZoICsgZ2ggKyAoaDZsID4+PiAwIDwgZ2wgPj4+IDAgPyAxIDogMCkpIHwgMDtcbiAgICBoN2wgPSBoWzE1XSA9IChoN2wgKyBobCkgfCAwO1xuICAgIGhbMTRdID0gKGg3aCArIGhoICsgKGg3bCA+Pj4gMCA8IGhsID4+PiAwID8gMSA6IDApKSB8IDA7XG4gIH1cbn1cblxuLyoqIE9idGFpbiBhIFNIQTUxMiBoYXNoIG9mIGFuIHV0ZjggZW5jb2RlZCBzdHJpbmcgb3IgYW4gVWludDhBcnJheS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaGE1MTIoXG4gIG1zZzogc3RyaW5nIHwgVWludDhBcnJheSxcbiAgaW5wdXRFbmNvZGluZz86IHN0cmluZyxcbiAgb3V0cHV0RW5jb2Rpbmc/OiBzdHJpbmdcbik6IHN0cmluZyB8IFVpbnQ4QXJyYXkge1xuICByZXR1cm4gbmV3IFNIQTUxMigpXG4gICAgLmluaXQoKVxuICAgIC51cGRhdGUobXNnLCBpbnB1dEVuY29kaW5nKVxuICAgIC5kaWdlc3Qob3V0cHV0RW5jb2RpbmcpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsTUFBTSxFQUFFLE1BQU0sUUFBUSxZQUFZO0FBRTNDLGtDQUFrQyxHQUNsQyxPQUFPLE1BQU0sUUFBZ0IsR0FBRztBQUVoQyxzREFBc0QsR0FDdEQsT0FBTyxNQUFNO0lBQ0YsV0FBbUIsTUFBTTtJQUUxQixVQUFzQixJQUFJLFdBQVcsS0FBSztJQUMxQyxhQUFzQjtJQUN0QixPQUFxQjtJQUNyQixHQUFnQjtJQUNoQixHQUFpQjtJQUNqQixXQUFxQjtJQUU3QiwrQkFBK0IsR0FDL0IsYUFBYztRQUNaLGtCQUFrQjtRQUNsQixJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksWUFBWTtZQUN4QjtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFDNUQ7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQzVEO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUM1RDtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFDNUQ7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQzVEO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUM1RDtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFDNUQ7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQzVEO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUM1RDtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFDNUQ7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQzVEO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUM1RDtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFDNUQ7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQzVEO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUM1RDtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFDNUQ7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQzVEO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUM1RDtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFDNUQ7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQzVEO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUM1RDtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFDNUQ7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQzVEO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUM1RDtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFDNUQ7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQzVEO1lBQVk7WUFBWTtZQUFZO1NBQ3JDO1FBRUQsSUFBSSxDQUFDLElBQUk7SUFDWDtJQUVBLG1DQUFtQyxHQUNuQyxPQUFlO1FBQ2Isa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxZQUFZO1lBQ3hCO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFBWTtZQUM1RDtZQUFZO1lBQVk7WUFBWTtZQUFZO1lBQVk7WUFDNUQ7WUFBWTtZQUFZO1lBQVk7U0FDckM7UUFFRCxJQUFJLENBQUMsWUFBWSxHQUFHO1FBQ3BCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxZQUFZO1FBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSztRQUV2QixPQUFPLElBQUk7SUFDYjtJQUVBLG1EQUFtRCxHQUNuRCxPQUFPLEdBQXdCLEVBQUUsYUFBc0IsRUFBVTtRQUMvRCxJQUFJLFFBQVEsSUFBSSxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxVQUFVLHVDQUF1QztRQUM3RCxPQUFPLElBQUksT0FBTyxRQUFRLFVBQVU7WUFDbEMsTUFBTSxPQUFPLEtBQUs7UUFDcEIsQ0FBQztRQUVELHVFQUF1RTtRQUN2RSw2REFBNkQ7UUFDN0QsSUFBSyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksTUFBTSxFQUFFLElBQUs7WUFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUU7WUFDMUMsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLEtBQUs7Z0JBQzdCLElBQUksQ0FBQyxTQUFTO2dCQUNkLElBQUksQ0FBQyxZQUFZLEdBQUc7WUFDdEIsQ0FBQztRQUNIO1FBRUEsMENBQTBDO1FBQzFDLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTTtRQUVuQixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLE1BQU0sSUFBSSxDQUFDLElBQUksSUFBSSxNQUFNLElBQUksR0FBRztZQUMvQyxDQUFDLENBQUMsRUFBRTtRQUNOLENBQUM7UUFFRCxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksTUFBTSxLQUFLO1FBRXZCLE9BQU8sSUFBSTtJQUNiO0lBRUEscURBQXFELEdBQ3JELE9BQU8sY0FBdUIsRUFBdUI7UUFDbkQsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ25CLE1BQU0sSUFBSSxNQUFNLG1DQUFrQztRQUNwRCxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJO1FBRXRCLGFBQWE7UUFDYixJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sRUFDbEIsTUFBTSxJQUFJLENBQUMsWUFBWTtRQUN6QixDQUFDLENBQUMsTUFBTSxHQUFHO1FBRVgsNkJBQTZCO1FBQzdCLE1BQU8sUUFBUSxJQUFLO1lBQ2xCLElBQUksUUFBUSxLQUFLO2dCQUNmLElBQUksQ0FBQyxTQUFTO2dCQUNkLE1BQU07WUFDUixDQUFDO1lBQ0QsQ0FBQyxDQUFDLE1BQU0sR0FBRztRQUNiO1FBRUEsd0JBQXdCO1FBQ3hCLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTTtRQUVuQixDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUc7UUFDeEUsQ0FBQyxDQUFDLElBQUksR0FBRyxBQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssS0FBTTtRQUN6QixDQUFDLENBQUMsSUFBSSxHQUFHLEFBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxLQUFNO1FBQ3pCLENBQUMsQ0FBQyxJQUFJLEdBQUcsQUFBQyxDQUFDLENBQUMsRUFBRSxLQUFLLElBQUs7UUFDeEIsQ0FBQyxDQUFDLElBQUksR0FBRyxBQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssSUFBSztRQUN4QixDQUFDLENBQUMsSUFBSSxHQUFHLEFBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxLQUFNO1FBQ3pCLENBQUMsQ0FBQyxJQUFJLEdBQUcsQUFBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEtBQU07UUFDekIsQ0FBQyxDQUFDLElBQUksR0FBRyxBQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssSUFBSztRQUN4QixDQUFDLENBQUMsSUFBSSxHQUFHLEFBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFLO1FBRXhCLElBQUksQ0FBQyxTQUFTO1FBRWQsZ0NBQWdDO1FBQ2hDLElBQUksR0FDRixPQUFPLElBQUksV0FBVztRQUV4QixJQUFLLElBQUksR0FBRyxJQUFJLElBQUksSUFBSztZQUN2QixJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsQUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxLQUFNO1lBQzNDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsR0FBRyxBQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEtBQU07WUFDM0MsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLEFBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssSUFBSztZQUMxQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUc7UUFDcEM7UUFFQSxpREFBaUQ7UUFDakQsSUFBSSxDQUFDLElBQUk7UUFFVCxPQUFPLGlCQUFpQixPQUFPLE1BQU0sa0JBQWtCLElBQUk7SUFDN0Q7SUFFQSx1Q0FBdUMsR0FDdkMsQUFBUSxZQUFrQjtRQUN4QixJQUFJLElBQUksSUFBSSxDQUFDLEVBQUUsRUFDYixNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQ1YsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUNWLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFDVixNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQ1YsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUNWLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFDVixNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQ1YsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUNWLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFDVixNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQ1YsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUNYLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFDWCxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQ1gsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUNYLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFDWCxNQUFNLENBQUMsQ0FBQyxHQUFHO1FBRWIsSUFBSSxLQUFLLEtBQ1AsS0FBSyxLQUNMLEtBQUssS0FDTCxLQUFLLEtBQ0wsS0FBSyxLQUNMLEtBQUssS0FDTCxLQUFLLEtBQ0wsS0FBSyxLQUNMLEtBQUssS0FDTCxLQUFLLEtBQ0wsS0FBSyxLQUNMLEtBQUssS0FDTCxLQUFLLEtBQ0wsS0FBSyxLQUNMLEtBQUssS0FDTCxLQUFLO1FBRVAsb0NBQW9DO1FBQ3BDLElBQUksR0FDRixJQUFJLElBQUksWUFBWTtRQUV0QixJQUFLLElBQUksR0FBRyxJQUFJLElBQUksSUFBSztZQUN2QixDQUFDLENBQUMsRUFBRSxHQUNGLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksSUFDOUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxLQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJO1FBQzdCO1FBRUEsa0JBQWtCO1FBQ2xCLElBQUksVUFDRixVQUNBLFNBQ0EsU0FDQSxVQUNBLFVBQ0EsU0FDQSxTQUNBLEtBQ0EsS0FDQSxNQUNBLE1BQ0EsT0FDQTtRQUVGLElBQUssSUFBSSxJQUFJLElBQUksSUFBSSxJQUFLO1lBQ3hCLFNBQVM7WUFDVCxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUU7WUFDMUIsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDOUIsVUFDRSxDQUFDLEFBQUMsWUFBWSxLQUFPLGFBQWEsQ0FBRSxJQUNwQyxDQUFDLEFBQUMsWUFBWSxLQUFPLGFBQWEsQ0FBRSxJQUNuQyxhQUFhO1lBQ2hCLFVBQ0UsQ0FBQyxBQUFDLFlBQVksS0FBTyxhQUFhLENBQUUsSUFDcEMsQ0FBQyxBQUFDLFlBQVksS0FBTyxhQUFhLENBQUUsSUFDcEMsQ0FBQyxBQUFDLFlBQVksS0FBTyxhQUFhLENBQUU7WUFFdEMsU0FBUztZQUNULFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtZQUN6QixXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRTtZQUM3QixVQUNFLENBQUMsQUFBQyxZQUFZLEtBQU8sYUFBYSxFQUFHLElBQ3JDLENBQUMsQUFBQyxZQUFZLElBQU0sYUFBYSxFQUFHLElBQ25DLGFBQWE7WUFDaEIsVUFDRSxDQUFDLEFBQUMsWUFBWSxLQUFPLGFBQWEsRUFBRyxJQUNyQyxDQUFDLEFBQUMsWUFBWSxJQUFNLGFBQWEsRUFBRyxJQUNwQyxDQUFDLEFBQUMsWUFBWSxLQUFPLGFBQWEsQ0FBRTtZQUV0QyxZQUFZO1lBQ1gsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQ25CLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQ3pCLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUN2QixRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLElBQUksRUFBRSxBQUFDO1lBRS9CLDREQUE0RDtZQUM1RCxNQUFNLFVBQVU7WUFDaEIsTUFBTSxVQUFVLE9BQU8sQ0FBQyxRQUFRLEtBQWdCLElBQUksSUFBSSxDQUFDO1lBQ3pELE9BQU87WUFDUCxPQUFPLFVBQVUsQ0FBQyxRQUFRLEtBQWdCLElBQUksSUFBSSxDQUFDO1lBQ25ELE9BQU87WUFDUCxPQUFPLFFBQVEsQ0FBQyxRQUFRLEtBQWMsSUFBSSxJQUFJLENBQUM7WUFFL0MsUUFBUTtZQUNSLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRztZQUNYLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxHQUFHO1FBQ2pCO1FBRUEsV0FBVztRQUNYLElBQUksS0FDRixLQUNBLE1BQ0EsTUFDQSxPQUNBLE9BQ0EsT0FDQSxPQUNBLEtBQ0EsS0FDQSxLQUNBLEtBQ0EsS0FDQTtRQUVGLElBQUssSUFBSSxHQUFHLElBQUksSUFBSSxJQUFLO1lBQ3ZCLEtBQUs7WUFDTCxNQUFNLEFBQUMsS0FBSyxLQUFPLENBQUMsS0FBSztZQUN6QixNQUFNLEFBQUMsS0FBSyxLQUFPLENBQUMsS0FBSztZQUV6QixNQUFNO1lBQ04sT0FBTyxBQUFDLEtBQUssS0FBTyxLQUFLLEtBQU8sS0FBSztZQUNyQyxPQUFPLEFBQUMsS0FBSyxLQUFPLEtBQUssS0FBTyxLQUFLO1lBRXJDLFNBQVM7WUFDVCxRQUNFLENBQUMsQUFBQyxNQUFNLElBQU0sT0FBTyxFQUFHLElBQ3hCLENBQUMsQUFBQyxNQUFNLEtBQU8sT0FBTyxDQUFFLElBQ3hCLENBQUMsQUFBQyxNQUFNLEtBQU8sT0FBTyxDQUFFO1lBQzFCLFFBQ0UsQ0FBQyxBQUFDLE1BQU0sSUFBTSxPQUFPLEVBQUcsSUFDeEIsQ0FBQyxBQUFDLE1BQU0sS0FBTyxPQUFPLENBQUUsSUFDeEIsQ0FBQyxBQUFDLE1BQU0sS0FBTyxPQUFPLENBQUU7WUFFMUIsU0FBUztZQUNULFFBQ0UsQ0FBQyxBQUFDLE1BQU0sS0FBTyxPQUFPLEVBQUcsSUFDekIsQ0FBQyxBQUFDLE1BQU0sS0FBTyxPQUFPLEVBQUcsSUFDekIsQ0FBQyxBQUFDLE1BQU0sS0FBTyxPQUFPLENBQUU7WUFDMUIsUUFDRSxDQUFDLEFBQUMsTUFBTSxLQUFPLE9BQU8sRUFBRyxJQUN6QixDQUFDLEFBQUMsTUFBTSxLQUFPLE9BQU8sRUFBRyxJQUN6QixDQUFDLEFBQUMsTUFBTSxLQUFPLE9BQU8sQ0FBRTtZQUUxQixXQUFXO1lBQ1gsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRTtZQUNwQixNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFFeEIsNkNBQTZDO1lBQzdDLE1BQU0sS0FBSztZQUNYLE1BQU0sS0FBSyxRQUFRLENBQUMsUUFBUSxLQUFXLElBQUksSUFBSSxDQUFDO1lBQ2hELE9BQU87WUFDUCxPQUFPLE1BQU0sQ0FBQyxRQUFRLEtBQVksSUFBSSxJQUFJLENBQUM7WUFDM0MsT0FBTztZQUNQLE9BQU8sTUFBTSxDQUFDLFFBQVEsS0FBWSxJQUFJLElBQUksQ0FBQztZQUMzQyxNQUFNLE1BQU0sQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFO1lBQ3hCLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxLQUFLLElBQUksSUFBSSxDQUFDO1lBRXpELG9CQUFvQjtZQUNwQixNQUFNLFFBQVE7WUFDZCxNQUFNLFFBQVEsT0FBTyxDQUFDLFFBQVEsS0FBYyxJQUFJLElBQUksQ0FBQztZQUVyRCwyQkFBMkI7WUFDM0IsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSyxBQUFDLEtBQUssTUFBTztZQUNsQixLQUFLLEFBQUMsS0FBSyxNQUFNLENBQUMsT0FBTyxLQUFXLElBQUksSUFBSSxDQUFDLElBQUs7WUFDbEQsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSyxBQUFDLE1BQU0sTUFBTztZQUNuQixLQUFLLEFBQUMsTUFBTSxNQUFNLENBQUMsT0FBTyxLQUFZLElBQUksSUFBSSxDQUFDLElBQUs7UUFDdEQ7UUFFQSxvQkFBb0I7UUFDcEIsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLEFBQUMsTUFBTSxLQUFNO1FBQzFCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQUFBQyxNQUFNLEtBQUssQ0FBQyxRQUFRLEtBQVcsSUFBSSxJQUFJLENBQUMsSUFBSztRQUNyRCxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQUFBQyxNQUFNLEtBQU07UUFDMUIsQ0FBQyxDQUFDLEVBQUUsR0FBRyxBQUFDLE1BQU0sS0FBSyxDQUFDLFFBQVEsS0FBVyxJQUFJLElBQUksQ0FBQyxJQUFLO1FBQ3JELE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxBQUFDLE1BQU0sS0FBTTtRQUMxQixDQUFDLENBQUMsRUFBRSxHQUFHLEFBQUMsTUFBTSxLQUFLLENBQUMsUUFBUSxLQUFXLElBQUksSUFBSSxDQUFDLElBQUs7UUFDckQsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLEFBQUMsTUFBTSxLQUFNO1FBQzFCLENBQUMsQ0FBQyxFQUFFLEdBQUcsQUFBQyxNQUFNLEtBQUssQ0FBQyxRQUFRLEtBQVcsSUFBSSxJQUFJLENBQUMsSUFBSztRQUNyRCxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQUFBQyxNQUFNLEtBQU07UUFDMUIsQ0FBQyxDQUFDLEVBQUUsR0FBRyxBQUFDLE1BQU0sS0FBSyxDQUFDLFFBQVEsS0FBVyxJQUFJLElBQUksQ0FBQyxJQUFLO1FBQ3JELE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxBQUFDLE1BQU0sS0FBTTtRQUMzQixDQUFDLENBQUMsR0FBRyxHQUFHLEFBQUMsTUFBTSxLQUFLLENBQUMsUUFBUSxLQUFXLElBQUksSUFBSSxDQUFDLElBQUs7UUFDdEQsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLEFBQUMsTUFBTSxLQUFNO1FBQzNCLENBQUMsQ0FBQyxHQUFHLEdBQUcsQUFBQyxNQUFNLEtBQUssQ0FBQyxRQUFRLEtBQVcsSUFBSSxJQUFJLENBQUMsSUFBSztRQUN0RCxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQUFBQyxNQUFNLEtBQU07UUFDM0IsQ0FBQyxDQUFDLEdBQUcsR0FBRyxBQUFDLE1BQU0sS0FBSyxDQUFDLFFBQVEsS0FBVyxJQUFJLElBQUksQ0FBQyxJQUFLO0lBQ3hEO0FBQ0YsQ0FBQztBQUVELHFFQUFxRSxHQUNyRSxPQUFPLFNBQVMsT0FDZCxHQUF3QixFQUN4QixhQUFzQixFQUN0QixjQUF1QixFQUNGO0lBQ3JCLE9BQU8sSUFBSSxTQUNSLElBQUksR0FDSixNQUFNLENBQUMsS0FBSyxlQUNaLE1BQU0sQ0FBQztBQUNaLENBQUMifQ==