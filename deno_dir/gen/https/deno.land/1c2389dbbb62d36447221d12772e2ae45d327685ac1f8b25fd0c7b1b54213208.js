// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { assert } from "../_util/assert.ts";
import { BytesList } from "../bytes/bytes_list.ts";
import { concat, copy } from "../bytes/mod.ts";
// MIN_READ is the minimum ArrayBuffer size passed to a read call by
// buffer.ReadFrom. As long as the Buffer has at least MIN_READ bytes beyond
// what is required to hold the contents of r, readFrom() will not grow the
// underlying buffer.
const MIN_READ = 32 * 1024;
const MAX_SIZE = 2 ** 32 - 2;
/** A variable-sized buffer of bytes with `read()` and `write()` methods.
 *
 * Buffer is almost always used with some I/O like files and sockets. It allows
 * one to buffer up a download from a socket. Buffer grows and shrinks as
 * necessary.
 *
 * Buffer is NOT the same thing as Node's Buffer. Node's Buffer was created in
 * 2009 before JavaScript had the concept of ArrayBuffers. It's simply a
 * non-standard ArrayBuffer.
 *
 * ArrayBuffer is a fixed memory allocation. Buffer is implemented on top of
 * ArrayBuffer.
 *
 * Based on [Go Buffer](https://golang.org/pkg/bytes/#Buffer). */ export class Buffer {
    #buf;
    #off = 0;
    constructor(ab){
        this.#buf = ab === undefined ? new Uint8Array(0) : new Uint8Array(ab);
    }
    /** Returns a slice holding the unread portion of the buffer.
   *
   * The slice is valid for use only until the next buffer modification (that
   * is, only until the next call to a method like `read()`, `write()`,
   * `reset()`, or `truncate()`). If `options.copy` is false the slice aliases the buffer content at
   * least until the next buffer modification, so immediate changes to the
   * slice will affect the result of future reads.
   * @param options Defaults to `{ copy: true }`
   */ bytes(options = {
        copy: true
    }) {
        if (options.copy === false) return this.#buf.subarray(this.#off);
        return this.#buf.slice(this.#off);
    }
    /** Returns whether the unread portion of the buffer is empty. */ empty() {
        return this.#buf.byteLength <= this.#off;
    }
    /** A read only number of bytes of the unread portion of the buffer. */ get length() {
        return this.#buf.byteLength - this.#off;
    }
    /** The read only capacity of the buffer's underlying byte slice, that is,
   * the total space allocated for the buffer's data. */ get capacity() {
        return this.#buf.buffer.byteLength;
    }
    /** Discards all but the first `n` unread bytes from the buffer but
   * continues to use the same allocated storage. It throws if `n` is
   * negative or greater than the length of the buffer. */ truncate(n) {
        if (n === 0) {
            this.reset();
            return;
        }
        if (n < 0 || n > this.length) {
            throw Error("bytes.Buffer: truncation out of range");
        }
        this.#reslice(this.#off + n);
    }
    reset() {
        this.#reslice(0);
        this.#off = 0;
    }
    #tryGrowByReslice(n) {
        const l = this.#buf.byteLength;
        if (n <= this.capacity - l) {
            this.#reslice(l + n);
            return l;
        }
        return -1;
    }
    #reslice(len) {
        assert(len <= this.#buf.buffer.byteLength);
        this.#buf = new Uint8Array(this.#buf.buffer, 0, len);
    }
    /** Reads the next `p.length` bytes from the buffer or until the buffer is
   * drained. Returns the number of bytes read. If the buffer has no data to
   * return, the return is EOF (`null`). */ readSync(p) {
        if (this.empty()) {
            // Buffer is empty, reset to recover space.
            this.reset();
            if (p.byteLength === 0) {
                // this edge case is tested in 'bufferReadEmptyAtEOF' test
                return 0;
            }
            return null;
        }
        const nread = copy(this.#buf.subarray(this.#off), p);
        this.#off += nread;
        return nread;
    }
    /** Reads the next `p.length` bytes from the buffer or until the buffer is
   * drained. Resolves to the number of bytes read. If the buffer has no
   * data to return, resolves to EOF (`null`).
   *
   * NOTE: This methods reads bytes synchronously; it's provided for
   * compatibility with `Reader` interfaces.
   */ read(p) {
        const rr = this.readSync(p);
        return Promise.resolve(rr);
    }
    writeSync(p) {
        const m = this.#grow(p.byteLength);
        return copy(p, this.#buf, m);
    }
    /** NOTE: This methods writes bytes synchronously; it's provided for
   * compatibility with `Writer` interface. */ write(p) {
        const n = this.writeSync(p);
        return Promise.resolve(n);
    }
    #grow(n1) {
        const m = this.length;
        // If buffer is empty, reset to recover space.
        if (m === 0 && this.#off !== 0) {
            this.reset();
        }
        // Fast: Try to grow by means of a reslice.
        const i = this.#tryGrowByReslice(n1);
        if (i >= 0) {
            return i;
        }
        const c = this.capacity;
        if (n1 <= Math.floor(c / 2) - m) {
            // We can slide things down instead of allocating a new
            // ArrayBuffer. We only need m+n <= c to slide, but
            // we instead let capacity get twice as large so we
            // don't spend all our time copying.
            copy(this.#buf.subarray(this.#off), this.#buf);
        } else if (c + n1 > MAX_SIZE) {
            throw new Error("The buffer cannot be grown beyond the maximum size.");
        } else {
            // Not enough space anywhere, we need to allocate.
            const buf = new Uint8Array(Math.min(2 * c + n1, MAX_SIZE));
            copy(this.#buf.subarray(this.#off), buf);
            this.#buf = buf;
        }
        // Restore this.#off and len(this.#buf).
        this.#off = 0;
        this.#reslice(Math.min(m + n1, MAX_SIZE));
        return m;
    }
    /** Grows the buffer's capacity, if necessary, to guarantee space for
   * another `n` bytes. After `.grow(n)`, at least `n` bytes can be written to
   * the buffer without another allocation. If `n` is negative, `.grow()` will
   * throw. If the buffer can't grow it will throw an error.
   *
   * Based on Go Lang's
   * [Buffer.Grow](https://golang.org/pkg/bytes/#Buffer.Grow). */ grow(n) {
        if (n < 0) {
            throw Error("Buffer.grow: negative count");
        }
        const m = this.#grow(n);
        this.#reslice(m);
    }
    /** Reads data from `r` until EOF (`null`) and appends it to the buffer,
   * growing the buffer as needed. It resolves to the number of bytes read.
   * If the buffer becomes too large, `.readFrom()` will reject with an error.
   *
   * Based on Go Lang's
   * [Buffer.ReadFrom](https://golang.org/pkg/bytes/#Buffer.ReadFrom). */ async readFrom(r) {
        let n = 0;
        const tmp = new Uint8Array(MIN_READ);
        while(true){
            const shouldGrow = this.capacity - this.length < MIN_READ;
            // read into tmp buffer if there's not enough room
            // otherwise read directly into the internal buffer
            const buf = shouldGrow ? tmp : new Uint8Array(this.#buf.buffer, this.length);
            const nread = await r.read(buf);
            if (nread === null) {
                return n;
            }
            // write will grow if needed
            if (shouldGrow) this.writeSync(buf.subarray(0, nread));
            else this.#reslice(this.length + nread);
            n += nread;
        }
    }
    /** Reads data from `r` until EOF (`null`) and appends it to the buffer,
   * growing the buffer as needed. It returns the number of bytes read. If the
   * buffer becomes too large, `.readFromSync()` will throw an error.
   *
   * Based on Go Lang's
   * [Buffer.ReadFrom](https://golang.org/pkg/bytes/#Buffer.ReadFrom). */ readFromSync(r) {
        let n = 0;
        const tmp = new Uint8Array(MIN_READ);
        while(true){
            const shouldGrow = this.capacity - this.length < MIN_READ;
            // read into tmp buffer if there's not enough room
            // otherwise read directly into the internal buffer
            const buf = shouldGrow ? tmp : new Uint8Array(this.#buf.buffer, this.length);
            const nread = r.readSync(buf);
            if (nread === null) {
                return n;
            }
            // write will grow if needed
            if (shouldGrow) this.writeSync(buf.subarray(0, nread));
            else this.#reslice(this.length + nread);
            n += nread;
        }
    }
}
const DEFAULT_BUF_SIZE = 4096;
const MIN_BUF_SIZE = 16;
const MAX_CONSECUTIVE_EMPTY_READS = 100;
const CR = "\r".charCodeAt(0);
const LF = "\n".charCodeAt(0);
export class BufferFullError extends Error {
    name;
    constructor(partial){
        super("Buffer full");
        this.partial = partial;
        this.name = "BufferFullError";
    }
    partial;
}
export class PartialReadError extends Error {
    name = "PartialReadError";
    partial;
    constructor(){
        super("Encountered UnexpectedEof, data only partially read");
    }
}
/** BufReader implements buffering for a Reader object. */ export class BufReader {
    #buf;
    #rd;
    #r = 0;
    #w = 0;
    #eof = false;
    // private lastByte: number;
    // private lastCharSize: number;
    /** return new BufReader unless r is BufReader */ static create(r, size = DEFAULT_BUF_SIZE) {
        return r instanceof BufReader ? r : new BufReader(r, size);
    }
    constructor(rd, size = DEFAULT_BUF_SIZE){
        if (size < MIN_BUF_SIZE) {
            size = MIN_BUF_SIZE;
        }
        this.#reset(new Uint8Array(size), rd);
    }
    /** Returns the size of the underlying buffer in bytes. */ size() {
        return this.#buf.byteLength;
    }
    buffered() {
        return this.#w - this.#r;
    }
    // Reads a new chunk into the buffer.
    #fill = async ()=>{
        // Slide existing data to beginning.
        if (this.#r > 0) {
            this.#buf.copyWithin(0, this.#r, this.#w);
            this.#w -= this.#r;
            this.#r = 0;
        }
        if (this.#w >= this.#buf.byteLength) {
            throw Error("bufio: tried to fill full buffer");
        }
        // Read new data: try a limited number of times.
        for(let i = MAX_CONSECUTIVE_EMPTY_READS; i > 0; i--){
            const rr = await this.#rd.read(this.#buf.subarray(this.#w));
            if (rr === null) {
                this.#eof = true;
                return;
            }
            assert(rr >= 0, "negative read");
            this.#w += rr;
            if (rr > 0) {
                return;
            }
        }
        throw new Error(`No progress after ${MAX_CONSECUTIVE_EMPTY_READS} read() calls`);
    };
    /** Discards any buffered data, resets all state, and switches
   * the buffered reader to read from r.
   */ reset(r) {
        this.#reset(this.#buf, r);
    }
    #reset = (buf, rd)=>{
        this.#buf = buf;
        this.#rd = rd;
        this.#eof = false;
    // this.lastByte = -1;
    // this.lastCharSize = -1;
    };
    /** reads data into p.
   * It returns the number of bytes read into p.
   * The bytes are taken from at most one Read on the underlying Reader,
   * hence n may be less than len(p).
   * To read exactly len(p) bytes, use io.ReadFull(b, p).
   */ async read(p) {
        let rr = p.byteLength;
        if (p.byteLength === 0) return rr;
        if (this.#r === this.#w) {
            if (p.byteLength >= this.#buf.byteLength) {
                // Large read, empty buffer.
                // Read directly into p to avoid copy.
                const rr1 = await this.#rd.read(p);
                const nread = rr1 ?? 0;
                assert(nread >= 0, "negative read");
                // if (rr.nread > 0) {
                //   this.lastByte = p[rr.nread - 1];
                //   this.lastCharSize = -1;
                // }
                return rr1;
            }
            // One read.
            // Do not use this.fill, which will loop.
            this.#r = 0;
            this.#w = 0;
            rr = await this.#rd.read(this.#buf);
            if (rr === 0 || rr === null) return rr;
            assert(rr >= 0, "negative read");
            this.#w += rr;
        }
        // copy as much as we can
        const copied = copy(this.#buf.subarray(this.#r, this.#w), p, 0);
        this.#r += copied;
        // this.lastByte = this.buf[this.r - 1];
        // this.lastCharSize = -1;
        return copied;
    }
    /** reads exactly `p.length` bytes into `p`.
   *
   * If successful, `p` is returned.
   *
   * If the end of the underlying stream has been reached, and there are no more
   * bytes available in the buffer, `readFull()` returns `null` instead.
   *
   * An error is thrown if some bytes could be read, but not enough to fill `p`
   * entirely before the underlying stream reported an error or EOF. Any error
   * thrown will have a `partial` property that indicates the slice of the
   * buffer that has been successfully filled with data.
   *
   * Ported from https://golang.org/pkg/io/#ReadFull
   */ async readFull(p) {
        let bytesRead = 0;
        while(bytesRead < p.length){
            try {
                const rr = await this.read(p.subarray(bytesRead));
                if (rr === null) {
                    if (bytesRead === 0) {
                        return null;
                    } else {
                        throw new PartialReadError();
                    }
                }
                bytesRead += rr;
            } catch (err) {
                if (err instanceof PartialReadError) {
                    err.partial = p.subarray(0, bytesRead);
                } else if (err instanceof Error) {
                    const e = new PartialReadError();
                    e.partial = p.subarray(0, bytesRead);
                    e.stack = err.stack;
                    e.message = err.message;
                    e.cause = err.cause;
                    throw err;
                }
                throw err;
            }
        }
        return p;
    }
    /** Returns the next byte [0, 255] or `null`. */ async readByte() {
        while(this.#r === this.#w){
            if (this.#eof) return null;
            await this.#fill(); // buffer is empty.
        }
        const c = this.#buf[this.#r];
        this.#r++;
        // this.lastByte = c;
        return c;
    }
    /** readString() reads until the first occurrence of delim in the input,
   * returning a string containing the data up to and including the delimiter.
   * If ReadString encounters an error before finding a delimiter,
   * it returns the data read before the error and the error itself
   * (often `null`).
   * ReadString returns err != nil if and only if the returned data does not end
   * in delim.
   * For simple uses, a Scanner may be more convenient.
   */ async readString(delim) {
        if (delim.length !== 1) {
            throw new Error("Delimiter should be a single character");
        }
        const buffer = await this.readSlice(delim.charCodeAt(0));
        if (buffer === null) return null;
        return new TextDecoder().decode(buffer);
    }
    /** `readLine()` is a low-level line-reading primitive. Most callers should
   * use `readString('\n')` instead or use a Scanner.
   *
   * `readLine()` tries to return a single line, not including the end-of-line
   * bytes. If the line was too long for the buffer then `more` is set and the
   * beginning of the line is returned. The rest of the line will be returned
   * from future calls. `more` will be false when returning the last fragment
   * of the line. The returned buffer is only valid until the next call to
   * `readLine()`.
   *
   * The text returned from ReadLine does not include the line end ("\r\n" or
   * "\n").
   *
   * When the end of the underlying stream is reached, the final bytes in the
   * stream are returned. No indication or error is given if the input ends
   * without a final line end. When there are no more trailing bytes to read,
   * `readLine()` returns `null`.
   *
   * Calling `unreadByte()` after `readLine()` will always unread the last byte
   * read (possibly a character belonging to the line end) even if that byte is
   * not part of the line returned by `readLine()`.
   */ async readLine() {
        let line = null;
        try {
            line = await this.readSlice(LF);
        } catch (err) {
            if (err instanceof Deno.errors.BadResource) {
                throw err;
            }
            let partial;
            if (err instanceof PartialReadError) {
                partial = err.partial;
                assert(partial instanceof Uint8Array, "bufio: caught error from `readSlice()` without `partial` property");
            }
            // Don't throw if `readSlice()` failed with `BufferFullError`, instead we
            // just return whatever is available and set the `more` flag.
            if (!(err instanceof BufferFullError)) {
                throw err;
            }
            partial = err.partial;
            // Handle the case where "\r\n" straddles the buffer.
            if (!this.#eof && partial && partial.byteLength > 0 && partial[partial.byteLength - 1] === CR) {
                // Put the '\r' back on buf and drop it from line.
                // Let the next call to ReadLine check for "\r\n".
                assert(this.#r > 0, "bufio: tried to rewind past start of buffer");
                this.#r--;
                partial = partial.subarray(0, partial.byteLength - 1);
            }
            if (partial) {
                return {
                    line: partial,
                    more: !this.#eof
                };
            }
        }
        if (line === null) {
            return null;
        }
        if (line.byteLength === 0) {
            return {
                line,
                more: false
            };
        }
        if (line[line.byteLength - 1] == LF) {
            let drop = 1;
            if (line.byteLength > 1 && line[line.byteLength - 2] === CR) {
                drop = 2;
            }
            line = line.subarray(0, line.byteLength - drop);
        }
        return {
            line,
            more: false
        };
    }
    /** `readSlice()` reads until the first occurrence of `delim` in the input,
   * returning a slice pointing at the bytes in the buffer. The bytes stop
   * being valid at the next read.
   *
   * If `readSlice()` encounters an error before finding a delimiter, or the
   * buffer fills without finding a delimiter, it throws an error with a
   * `partial` property that contains the entire buffer.
   *
   * If `readSlice()` encounters the end of the underlying stream and there are
   * any bytes left in the buffer, the rest of the buffer is returned. In other
   * words, EOF is always treated as a delimiter. Once the buffer is empty,
   * it returns `null`.
   *
   * Because the data returned from `readSlice()` will be overwritten by the
   * next I/O operation, most clients should use `readString()` instead.
   */ async readSlice(delim) {
        let s = 0; // search start index
        let slice;
        while(true){
            // Search buffer.
            let i = this.#buf.subarray(this.#r + s, this.#w).indexOf(delim);
            if (i >= 0) {
                i += s;
                slice = this.#buf.subarray(this.#r, this.#r + i + 1);
                this.#r += i + 1;
                break;
            }
            // EOF?
            if (this.#eof) {
                if (this.#r === this.#w) {
                    return null;
                }
                slice = this.#buf.subarray(this.#r, this.#w);
                this.#r = this.#w;
                break;
            }
            // Buffer full?
            if (this.buffered() >= this.#buf.byteLength) {
                this.#r = this.#w;
                // #4521 The internal buffer should not be reused across reads because it causes corruption of data.
                const oldbuf = this.#buf;
                const newbuf = this.#buf.slice(0);
                this.#buf = newbuf;
                throw new BufferFullError(oldbuf);
            }
            s = this.#w - this.#r; // do not rescan area we scanned before
            // Buffer is not full.
            try {
                await this.#fill();
            } catch (err) {
                if (err instanceof PartialReadError) {
                    err.partial = slice;
                } else if (err instanceof Error) {
                    const e = new PartialReadError();
                    e.partial = slice;
                    e.stack = err.stack;
                    e.message = err.message;
                    e.cause = err.cause;
                    throw err;
                }
                throw err;
            }
        }
        // Handle last byte, if any.
        // const i = slice.byteLength - 1;
        // if (i >= 0) {
        //   this.lastByte = slice[i];
        //   this.lastCharSize = -1
        // }
        return slice;
    }
    /** `peek()` returns the next `n` bytes without advancing the reader. The
   * bytes stop being valid at the next read call.
   *
   * When the end of the underlying stream is reached, but there are unread
   * bytes left in the buffer, those bytes are returned. If there are no bytes
   * left in the buffer, it returns `null`.
   *
   * If an error is encountered before `n` bytes are available, `peek()` throws
   * an error with the `partial` property set to a slice of the buffer that
   * contains the bytes that were available before the error occurred.
   */ async peek(n) {
        if (n < 0) {
            throw Error("negative count");
        }
        let avail = this.#w - this.#r;
        while(avail < n && avail < this.#buf.byteLength && !this.#eof){
            try {
                await this.#fill();
            } catch (err) {
                if (err instanceof PartialReadError) {
                    err.partial = this.#buf.subarray(this.#r, this.#w);
                } else if (err instanceof Error) {
                    const e = new PartialReadError();
                    e.partial = this.#buf.subarray(this.#r, this.#w);
                    e.stack = err.stack;
                    e.message = err.message;
                    e.cause = err.cause;
                    throw err;
                }
                throw err;
            }
            avail = this.#w - this.#r;
        }
        if (avail === 0 && this.#eof) {
            return null;
        } else if (avail < n && this.#eof) {
            return this.#buf.subarray(this.#r, this.#r + avail);
        } else if (avail < n) {
            throw new BufferFullError(this.#buf.subarray(this.#r, this.#w));
        }
        return this.#buf.subarray(this.#r, this.#r + n);
    }
}
class AbstractBufBase {
    buf;
    usedBufferBytes = 0;
    err = null;
    constructor(buf){
        this.buf = buf;
    }
    /** Size returns the size of the underlying buffer in bytes. */ size() {
        return this.buf.byteLength;
    }
    /** Returns how many bytes are unused in the buffer. */ available() {
        return this.buf.byteLength - this.usedBufferBytes;
    }
    /** buffered returns the number of bytes that have been written into the
   * current buffer.
   */ buffered() {
        return this.usedBufferBytes;
    }
}
/** BufWriter implements buffering for an deno.Writer object.
 * If an error occurs writing to a Writer, no more data will be
 * accepted and all subsequent writes, and flush(), will return the error.
 * After all data has been written, the client should call the
 * flush() method to guarantee all data has been forwarded to
 * the underlying deno.Writer.
 */ export class BufWriter extends AbstractBufBase {
    #writer;
    /** return new BufWriter unless writer is BufWriter */ static create(writer, size = DEFAULT_BUF_SIZE) {
        return writer instanceof BufWriter ? writer : new BufWriter(writer, size);
    }
    constructor(writer, size = DEFAULT_BUF_SIZE){
        if (size <= 0) {
            size = DEFAULT_BUF_SIZE;
        }
        const buf = new Uint8Array(size);
        super(buf);
        this.#writer = writer;
    }
    /** Discards any unflushed buffered data, clears any error, and
   * resets buffer to write its output to w.
   */ reset(w) {
        this.err = null;
        this.usedBufferBytes = 0;
        this.#writer = w;
    }
    /** Flush writes any buffered data to the underlying io.Writer. */ async flush() {
        if (this.err !== null) throw this.err;
        if (this.usedBufferBytes === 0) return;
        try {
            const p = this.buf.subarray(0, this.usedBufferBytes);
            let nwritten = 0;
            while(nwritten < p.length){
                nwritten += await this.#writer.write(p.subarray(nwritten));
            }
        } catch (e) {
            if (e instanceof Error) {
                this.err = e;
            }
            throw e;
        }
        this.buf = new Uint8Array(this.buf.length);
        this.usedBufferBytes = 0;
    }
    /** Writes the contents of `data` into the buffer.  If the contents won't fully
   * fit into the buffer, those bytes that can are copied into the buffer, the
   * buffer is the flushed to the writer and the remaining bytes are copied into
   * the now empty buffer.
   *
   * @return the number of bytes written to the buffer.
   */ async write(data) {
        if (this.err !== null) throw this.err;
        if (data.length === 0) return 0;
        let totalBytesWritten = 0;
        let numBytesWritten = 0;
        while(data.byteLength > this.available()){
            if (this.buffered() === 0) {
                // Large write, empty buffer.
                // Write directly from data to avoid copy.
                try {
                    numBytesWritten = await this.#writer.write(data);
                } catch (e) {
                    if (e instanceof Error) {
                        this.err = e;
                    }
                    throw e;
                }
            } else {
                numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
                this.usedBufferBytes += numBytesWritten;
                await this.flush();
            }
            totalBytesWritten += numBytesWritten;
            data = data.subarray(numBytesWritten);
        }
        numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
        this.usedBufferBytes += numBytesWritten;
        totalBytesWritten += numBytesWritten;
        return totalBytesWritten;
    }
}
/** BufWriterSync implements buffering for a deno.WriterSync object.
 * If an error occurs writing to a WriterSync, no more data will be
 * accepted and all subsequent writes, and flush(), will return the error.
 * After all data has been written, the client should call the
 * flush() method to guarantee all data has been forwarded to
 * the underlying deno.WriterSync.
 */ export class BufWriterSync extends AbstractBufBase {
    #writer;
    /** return new BufWriterSync unless writer is BufWriterSync */ static create(writer, size = DEFAULT_BUF_SIZE) {
        return writer instanceof BufWriterSync ? writer : new BufWriterSync(writer, size);
    }
    constructor(writer, size = DEFAULT_BUF_SIZE){
        if (size <= 0) {
            size = DEFAULT_BUF_SIZE;
        }
        const buf = new Uint8Array(size);
        super(buf);
        this.#writer = writer;
    }
    /** Discards any unflushed buffered data, clears any error, and
   * resets buffer to write its output to w.
   */ reset(w) {
        this.err = null;
        this.usedBufferBytes = 0;
        this.#writer = w;
    }
    /** Flush writes any buffered data to the underlying io.WriterSync. */ flush() {
        if (this.err !== null) throw this.err;
        if (this.usedBufferBytes === 0) return;
        try {
            const p = this.buf.subarray(0, this.usedBufferBytes);
            let nwritten = 0;
            while(nwritten < p.length){
                nwritten += this.#writer.writeSync(p.subarray(nwritten));
            }
        } catch (e) {
            if (e instanceof Error) {
                this.err = e;
            }
            throw e;
        }
        this.buf = new Uint8Array(this.buf.length);
        this.usedBufferBytes = 0;
    }
    /** Writes the contents of `data` into the buffer.  If the contents won't fully
   * fit into the buffer, those bytes that can are copied into the buffer, the
   * buffer is the flushed to the writer and the remaining bytes are copied into
   * the now empty buffer.
   *
   * @return the number of bytes written to the buffer.
   */ writeSync(data) {
        if (this.err !== null) throw this.err;
        if (data.length === 0) return 0;
        let totalBytesWritten = 0;
        let numBytesWritten = 0;
        while(data.byteLength > this.available()){
            if (this.buffered() === 0) {
                // Large write, empty buffer.
                // Write directly from data to avoid copy.
                try {
                    numBytesWritten = this.#writer.writeSync(data);
                } catch (e) {
                    if (e instanceof Error) {
                        this.err = e;
                    }
                    throw e;
                }
            } else {
                numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
                this.usedBufferBytes += numBytesWritten;
                this.flush();
            }
            totalBytesWritten += numBytesWritten;
            data = data.subarray(numBytesWritten);
        }
        numBytesWritten = copy(data, this.buf, this.usedBufferBytes);
        this.usedBufferBytes += numBytesWritten;
        totalBytesWritten += numBytesWritten;
        return totalBytesWritten;
    }
}
/** Generate longest proper prefix which is also suffix array. */ function createLPS(pat) {
    const lps = new Uint8Array(pat.length);
    lps[0] = 0;
    let prefixEnd = 0;
    let i = 1;
    while(i < lps.length){
        if (pat[i] == pat[prefixEnd]) {
            prefixEnd++;
            lps[i] = prefixEnd;
            i++;
        } else if (prefixEnd === 0) {
            lps[i] = 0;
            i++;
        } else {
            prefixEnd = lps[prefixEnd - 1];
        }
    }
    return lps;
}
/** Read delimited bytes from a Reader. */ export async function* readDelim(reader, delim) {
    // Avoid unicode problems
    const delimLen = delim.length;
    const delimLPS = createLPS(delim);
    const chunks = new BytesList();
    const bufSize = Math.max(1024, delimLen + 1);
    // Modified KMP
    let inspectIndex = 0;
    let matchIndex = 0;
    while(true){
        const inspectArr = new Uint8Array(bufSize);
        const result = await reader.read(inspectArr);
        if (result === null) {
            // Yield last chunk.
            yield chunks.concat();
            return;
        } else if (result < 0) {
            // Discard all remaining and silently fail.
            return;
        }
        chunks.add(inspectArr, 0, result);
        let localIndex = 0;
        while(inspectIndex < chunks.size()){
            if (inspectArr[localIndex] === delim[matchIndex]) {
                inspectIndex++;
                localIndex++;
                matchIndex++;
                if (matchIndex === delimLen) {
                    // Full match
                    const matchEnd = inspectIndex - delimLen;
                    const readyBytes = chunks.slice(0, matchEnd);
                    yield readyBytes;
                    // Reset match, different from KMP.
                    chunks.shift(inspectIndex);
                    inspectIndex = 0;
                    matchIndex = 0;
                }
            } else {
                if (matchIndex === 0) {
                    inspectIndex++;
                    localIndex++;
                } else {
                    matchIndex = delimLPS[matchIndex - 1];
                }
            }
        }
    }
}
/** Read delimited strings from a Reader. */ export async function* readStringDelim(reader, delim, decoderOpts) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder(decoderOpts?.encoding, decoderOpts);
    for await (const chunk of readDelim(reader, encoder.encode(delim))){
        yield decoder.decode(chunk);
    }
}
/** Read strings line-by-line from a Reader. */ export async function* readLines(reader, decoderOpts) {
    const bufReader = new BufReader(reader);
    let chunks = [];
    const decoder = new TextDecoder(decoderOpts?.encoding, decoderOpts);
    while(true){
        const res = await bufReader.readLine();
        if (!res) {
            if (chunks.length > 0) {
                yield decoder.decode(concat(...chunks));
            }
            break;
        }
        chunks.push(res.line);
        if (!res.more) {
            yield decoder.decode(concat(...chunks));
            chunks = [];
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2lvL2J1ZmZlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIxIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuaW1wb3J0IHsgYXNzZXJ0IH0gZnJvbSBcIi4uL191dGlsL2Fzc2VydC50c1wiO1xuaW1wb3J0IHsgQnl0ZXNMaXN0IH0gZnJvbSBcIi4uL2J5dGVzL2J5dGVzX2xpc3QudHNcIjtcbmltcG9ydCB7IGNvbmNhdCwgY29weSB9IGZyb20gXCIuLi9ieXRlcy9tb2QudHNcIjtcbmltcG9ydCB0eXBlIHsgUmVhZGVyLCBSZWFkZXJTeW5jLCBXcml0ZXIsIFdyaXRlclN5bmMgfSBmcm9tIFwiLi90eXBlcy5kLnRzXCI7XG5cbi8vIE1JTl9SRUFEIGlzIHRoZSBtaW5pbXVtIEFycmF5QnVmZmVyIHNpemUgcGFzc2VkIHRvIGEgcmVhZCBjYWxsIGJ5XG4vLyBidWZmZXIuUmVhZEZyb20uIEFzIGxvbmcgYXMgdGhlIEJ1ZmZlciBoYXMgYXQgbGVhc3QgTUlOX1JFQUQgYnl0ZXMgYmV5b25kXG4vLyB3aGF0IGlzIHJlcXVpcmVkIHRvIGhvbGQgdGhlIGNvbnRlbnRzIG9mIHIsIHJlYWRGcm9tKCkgd2lsbCBub3QgZ3JvdyB0aGVcbi8vIHVuZGVybHlpbmcgYnVmZmVyLlxuY29uc3QgTUlOX1JFQUQgPSAzMiAqIDEwMjQ7XG5jb25zdCBNQVhfU0laRSA9IDIgKiogMzIgLSAyO1xuXG4vKiogQSB2YXJpYWJsZS1zaXplZCBidWZmZXIgb2YgYnl0ZXMgd2l0aCBgcmVhZCgpYCBhbmQgYHdyaXRlKClgIG1ldGhvZHMuXG4gKlxuICogQnVmZmVyIGlzIGFsbW9zdCBhbHdheXMgdXNlZCB3aXRoIHNvbWUgSS9PIGxpa2UgZmlsZXMgYW5kIHNvY2tldHMuIEl0IGFsbG93c1xuICogb25lIHRvIGJ1ZmZlciB1cCBhIGRvd25sb2FkIGZyb20gYSBzb2NrZXQuIEJ1ZmZlciBncm93cyBhbmQgc2hyaW5rcyBhc1xuICogbmVjZXNzYXJ5LlxuICpcbiAqIEJ1ZmZlciBpcyBOT1QgdGhlIHNhbWUgdGhpbmcgYXMgTm9kZSdzIEJ1ZmZlci4gTm9kZSdzIEJ1ZmZlciB3YXMgY3JlYXRlZCBpblxuICogMjAwOSBiZWZvcmUgSmF2YVNjcmlwdCBoYWQgdGhlIGNvbmNlcHQgb2YgQXJyYXlCdWZmZXJzLiBJdCdzIHNpbXBseSBhXG4gKiBub24tc3RhbmRhcmQgQXJyYXlCdWZmZXIuXG4gKlxuICogQXJyYXlCdWZmZXIgaXMgYSBmaXhlZCBtZW1vcnkgYWxsb2NhdGlvbi4gQnVmZmVyIGlzIGltcGxlbWVudGVkIG9uIHRvcCBvZlxuICogQXJyYXlCdWZmZXIuXG4gKlxuICogQmFzZWQgb24gW0dvIEJ1ZmZlcl0oaHR0cHM6Ly9nb2xhbmcub3JnL3BrZy9ieXRlcy8jQnVmZmVyKS4gKi9cblxuZXhwb3J0IGNsYXNzIEJ1ZmZlciB7XG4gICNidWY6IFVpbnQ4QXJyYXk7IC8vIGNvbnRlbnRzIGFyZSB0aGUgYnl0ZXMgYnVmW29mZiA6IGxlbihidWYpXVxuICAjb2ZmID0gMDsgLy8gcmVhZCBhdCBidWZbb2ZmXSwgd3JpdGUgYXQgYnVmW2J1Zi5ieXRlTGVuZ3RoXVxuXG4gIGNvbnN0cnVjdG9yKGFiPzogQXJyYXlCdWZmZXJMaWtlIHwgQXJyYXlMaWtlPG51bWJlcj4pIHtcbiAgICB0aGlzLiNidWYgPSBhYiA9PT0gdW5kZWZpbmVkID8gbmV3IFVpbnQ4QXJyYXkoMCkgOiBuZXcgVWludDhBcnJheShhYik7XG4gIH1cblxuICAvKiogUmV0dXJucyBhIHNsaWNlIGhvbGRpbmcgdGhlIHVucmVhZCBwb3J0aW9uIG9mIHRoZSBidWZmZXIuXG4gICAqXG4gICAqIFRoZSBzbGljZSBpcyB2YWxpZCBmb3IgdXNlIG9ubHkgdW50aWwgdGhlIG5leHQgYnVmZmVyIG1vZGlmaWNhdGlvbiAodGhhdFxuICAgKiBpcywgb25seSB1bnRpbCB0aGUgbmV4dCBjYWxsIHRvIGEgbWV0aG9kIGxpa2UgYHJlYWQoKWAsIGB3cml0ZSgpYCxcbiAgICogYHJlc2V0KClgLCBvciBgdHJ1bmNhdGUoKWApLiBJZiBgb3B0aW9ucy5jb3B5YCBpcyBmYWxzZSB0aGUgc2xpY2UgYWxpYXNlcyB0aGUgYnVmZmVyIGNvbnRlbnQgYXRcbiAgICogbGVhc3QgdW50aWwgdGhlIG5leHQgYnVmZmVyIG1vZGlmaWNhdGlvbiwgc28gaW1tZWRpYXRlIGNoYW5nZXMgdG8gdGhlXG4gICAqIHNsaWNlIHdpbGwgYWZmZWN0IHRoZSByZXN1bHQgb2YgZnV0dXJlIHJlYWRzLlxuICAgKiBAcGFyYW0gb3B0aW9ucyBEZWZhdWx0cyB0byBgeyBjb3B5OiB0cnVlIH1gXG4gICAqL1xuICBieXRlcyhvcHRpb25zID0geyBjb3B5OiB0cnVlIH0pOiBVaW50OEFycmF5IHtcbiAgICBpZiAob3B0aW9ucy5jb3B5ID09PSBmYWxzZSkgcmV0dXJuIHRoaXMuI2J1Zi5zdWJhcnJheSh0aGlzLiNvZmYpO1xuICAgIHJldHVybiB0aGlzLiNidWYuc2xpY2UodGhpcy4jb2ZmKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVucmVhZCBwb3J0aW9uIG9mIHRoZSBidWZmZXIgaXMgZW1wdHkuICovXG4gIGVtcHR5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNidWYuYnl0ZUxlbmd0aCA8PSB0aGlzLiNvZmY7XG4gIH1cblxuICAvKiogQSByZWFkIG9ubHkgbnVtYmVyIG9mIGJ5dGVzIG9mIHRoZSB1bnJlYWQgcG9ydGlvbiBvZiB0aGUgYnVmZmVyLiAqL1xuICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuI2J1Zi5ieXRlTGVuZ3RoIC0gdGhpcy4jb2ZmO1xuICB9XG5cbiAgLyoqIFRoZSByZWFkIG9ubHkgY2FwYWNpdHkgb2YgdGhlIGJ1ZmZlcidzIHVuZGVybHlpbmcgYnl0ZSBzbGljZSwgdGhhdCBpcyxcbiAgICogdGhlIHRvdGFsIHNwYWNlIGFsbG9jYXRlZCBmb3IgdGhlIGJ1ZmZlcidzIGRhdGEuICovXG4gIGdldCBjYXBhY2l0eSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLiNidWYuYnVmZmVyLmJ5dGVMZW5ndGg7XG4gIH1cblxuICAvKiogRGlzY2FyZHMgYWxsIGJ1dCB0aGUgZmlyc3QgYG5gIHVucmVhZCBieXRlcyBmcm9tIHRoZSBidWZmZXIgYnV0XG4gICAqIGNvbnRpbnVlcyB0byB1c2UgdGhlIHNhbWUgYWxsb2NhdGVkIHN0b3JhZ2UuIEl0IHRocm93cyBpZiBgbmAgaXNcbiAgICogbmVnYXRpdmUgb3IgZ3JlYXRlciB0aGFuIHRoZSBsZW5ndGggb2YgdGhlIGJ1ZmZlci4gKi9cbiAgdHJ1bmNhdGUobjogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKG4gPT09IDApIHtcbiAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKG4gPCAwIHx8IG4gPiB0aGlzLmxlbmd0aCkge1xuICAgICAgdGhyb3cgRXJyb3IoXCJieXRlcy5CdWZmZXI6IHRydW5jYXRpb24gb3V0IG9mIHJhbmdlXCIpO1xuICAgIH1cbiAgICB0aGlzLiNyZXNsaWNlKHRoaXMuI29mZiArIG4pO1xuICB9XG5cbiAgcmVzZXQoKTogdm9pZCB7XG4gICAgdGhpcy4jcmVzbGljZSgwKTtcbiAgICB0aGlzLiNvZmYgPSAwO1xuICB9XG5cbiAgI3RyeUdyb3dCeVJlc2xpY2UobjogbnVtYmVyKSB7XG4gICAgY29uc3QgbCA9IHRoaXMuI2J1Zi5ieXRlTGVuZ3RoO1xuICAgIGlmIChuIDw9IHRoaXMuY2FwYWNpdHkgLSBsKSB7XG4gICAgICB0aGlzLiNyZXNsaWNlKGwgKyBuKTtcbiAgICAgIHJldHVybiBsO1xuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH1cblxuICAjcmVzbGljZShsZW46IG51bWJlcikge1xuICAgIGFzc2VydChsZW4gPD0gdGhpcy4jYnVmLmJ1ZmZlci5ieXRlTGVuZ3RoKTtcbiAgICB0aGlzLiNidWYgPSBuZXcgVWludDhBcnJheSh0aGlzLiNidWYuYnVmZmVyLCAwLCBsZW4pO1xuICB9XG5cbiAgLyoqIFJlYWRzIHRoZSBuZXh0IGBwLmxlbmd0aGAgYnl0ZXMgZnJvbSB0aGUgYnVmZmVyIG9yIHVudGlsIHRoZSBidWZmZXIgaXNcbiAgICogZHJhaW5lZC4gUmV0dXJucyB0aGUgbnVtYmVyIG9mIGJ5dGVzIHJlYWQuIElmIHRoZSBidWZmZXIgaGFzIG5vIGRhdGEgdG9cbiAgICogcmV0dXJuLCB0aGUgcmV0dXJuIGlzIEVPRiAoYG51bGxgKS4gKi9cbiAgcmVhZFN5bmMocDogVWludDhBcnJheSk6IG51bWJlciB8IG51bGwge1xuICAgIGlmICh0aGlzLmVtcHR5KCkpIHtcbiAgICAgIC8vIEJ1ZmZlciBpcyBlbXB0eSwgcmVzZXQgdG8gcmVjb3ZlciBzcGFjZS5cbiAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgIGlmIChwLmJ5dGVMZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gdGhpcyBlZGdlIGNhc2UgaXMgdGVzdGVkIGluICdidWZmZXJSZWFkRW1wdHlBdEVPRicgdGVzdFxuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBucmVhZCA9IGNvcHkodGhpcy4jYnVmLnN1YmFycmF5KHRoaXMuI29mZiksIHApO1xuICAgIHRoaXMuI29mZiArPSBucmVhZDtcbiAgICByZXR1cm4gbnJlYWQ7XG4gIH1cblxuICAvKiogUmVhZHMgdGhlIG5leHQgYHAubGVuZ3RoYCBieXRlcyBmcm9tIHRoZSBidWZmZXIgb3IgdW50aWwgdGhlIGJ1ZmZlciBpc1xuICAgKiBkcmFpbmVkLiBSZXNvbHZlcyB0byB0aGUgbnVtYmVyIG9mIGJ5dGVzIHJlYWQuIElmIHRoZSBidWZmZXIgaGFzIG5vXG4gICAqIGRhdGEgdG8gcmV0dXJuLCByZXNvbHZlcyB0byBFT0YgKGBudWxsYCkuXG4gICAqXG4gICAqIE5PVEU6IFRoaXMgbWV0aG9kcyByZWFkcyBieXRlcyBzeW5jaHJvbm91c2x5OyBpdCdzIHByb3ZpZGVkIGZvclxuICAgKiBjb21wYXRpYmlsaXR5IHdpdGggYFJlYWRlcmAgaW50ZXJmYWNlcy5cbiAgICovXG4gIHJlYWQocDogVWludDhBcnJheSk6IFByb21pc2U8bnVtYmVyIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJyID0gdGhpcy5yZWFkU3luYyhwKTtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJyKTtcbiAgfVxuXG4gIHdyaXRlU3luYyhwOiBVaW50OEFycmF5KTogbnVtYmVyIHtcbiAgICBjb25zdCBtID0gdGhpcy4jZ3JvdyhwLmJ5dGVMZW5ndGgpO1xuICAgIHJldHVybiBjb3B5KHAsIHRoaXMuI2J1ZiwgbSk7XG4gIH1cblxuICAvKiogTk9URTogVGhpcyBtZXRob2RzIHdyaXRlcyBieXRlcyBzeW5jaHJvbm91c2x5OyBpdCdzIHByb3ZpZGVkIGZvclxuICAgKiBjb21wYXRpYmlsaXR5IHdpdGggYFdyaXRlcmAgaW50ZXJmYWNlLiAqL1xuICB3cml0ZShwOiBVaW50OEFycmF5KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBuID0gdGhpcy53cml0ZVN5bmMocCk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuKTtcbiAgfVxuXG4gICNncm93KG46IG51bWJlcikge1xuICAgIGNvbnN0IG0gPSB0aGlzLmxlbmd0aDtcbiAgICAvLyBJZiBidWZmZXIgaXMgZW1wdHksIHJlc2V0IHRvIHJlY292ZXIgc3BhY2UuXG4gICAgaWYgKG0gPT09IDAgJiYgdGhpcy4jb2ZmICE9PSAwKSB7XG4gICAgICB0aGlzLnJlc2V0KCk7XG4gICAgfVxuICAgIC8vIEZhc3Q6IFRyeSB0byBncm93IGJ5IG1lYW5zIG9mIGEgcmVzbGljZS5cbiAgICBjb25zdCBpID0gdGhpcy4jdHJ5R3Jvd0J5UmVzbGljZShuKTtcbiAgICBpZiAoaSA+PSAwKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gICAgY29uc3QgYyA9IHRoaXMuY2FwYWNpdHk7XG4gICAgaWYgKG4gPD0gTWF0aC5mbG9vcihjIC8gMikgLSBtKSB7XG4gICAgICAvLyBXZSBjYW4gc2xpZGUgdGhpbmdzIGRvd24gaW5zdGVhZCBvZiBhbGxvY2F0aW5nIGEgbmV3XG4gICAgICAvLyBBcnJheUJ1ZmZlci4gV2Ugb25seSBuZWVkIG0rbiA8PSBjIHRvIHNsaWRlLCBidXRcbiAgICAgIC8vIHdlIGluc3RlYWQgbGV0IGNhcGFjaXR5IGdldCB0d2ljZSBhcyBsYXJnZSBzbyB3ZVxuICAgICAgLy8gZG9uJ3Qgc3BlbmQgYWxsIG91ciB0aW1lIGNvcHlpbmcuXG4gICAgICBjb3B5KHRoaXMuI2J1Zi5zdWJhcnJheSh0aGlzLiNvZmYpLCB0aGlzLiNidWYpO1xuICAgIH0gZWxzZSBpZiAoYyArIG4gPiBNQVhfU0laRSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGJ1ZmZlciBjYW5ub3QgYmUgZ3Jvd24gYmV5b25kIHRoZSBtYXhpbXVtIHNpemUuXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3QgZW5vdWdoIHNwYWNlIGFueXdoZXJlLCB3ZSBuZWVkIHRvIGFsbG9jYXRlLlxuICAgICAgY29uc3QgYnVmID0gbmV3IFVpbnQ4QXJyYXkoTWF0aC5taW4oMiAqIGMgKyBuLCBNQVhfU0laRSkpO1xuICAgICAgY29weSh0aGlzLiNidWYuc3ViYXJyYXkodGhpcy4jb2ZmKSwgYnVmKTtcbiAgICAgIHRoaXMuI2J1ZiA9IGJ1ZjtcbiAgICB9XG4gICAgLy8gUmVzdG9yZSB0aGlzLiNvZmYgYW5kIGxlbih0aGlzLiNidWYpLlxuICAgIHRoaXMuI29mZiA9IDA7XG4gICAgdGhpcy4jcmVzbGljZShNYXRoLm1pbihtICsgbiwgTUFYX1NJWkUpKTtcbiAgICByZXR1cm4gbTtcbiAgfVxuXG4gIC8qKiBHcm93cyB0aGUgYnVmZmVyJ3MgY2FwYWNpdHksIGlmIG5lY2Vzc2FyeSwgdG8gZ3VhcmFudGVlIHNwYWNlIGZvclxuICAgKiBhbm90aGVyIGBuYCBieXRlcy4gQWZ0ZXIgYC5ncm93KG4pYCwgYXQgbGVhc3QgYG5gIGJ5dGVzIGNhbiBiZSB3cml0dGVuIHRvXG4gICAqIHRoZSBidWZmZXIgd2l0aG91dCBhbm90aGVyIGFsbG9jYXRpb24uIElmIGBuYCBpcyBuZWdhdGl2ZSwgYC5ncm93KClgIHdpbGxcbiAgICogdGhyb3cuIElmIHRoZSBidWZmZXIgY2FuJ3QgZ3JvdyBpdCB3aWxsIHRocm93IGFuIGVycm9yLlxuICAgKlxuICAgKiBCYXNlZCBvbiBHbyBMYW5nJ3NcbiAgICogW0J1ZmZlci5Hcm93XShodHRwczovL2dvbGFuZy5vcmcvcGtnL2J5dGVzLyNCdWZmZXIuR3JvdykuICovXG4gIGdyb3cobjogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKG4gPCAwKSB7XG4gICAgICB0aHJvdyBFcnJvcihcIkJ1ZmZlci5ncm93OiBuZWdhdGl2ZSBjb3VudFwiKTtcbiAgICB9XG4gICAgY29uc3QgbSA9IHRoaXMuI2dyb3cobik7XG4gICAgdGhpcy4jcmVzbGljZShtKTtcbiAgfVxuXG4gIC8qKiBSZWFkcyBkYXRhIGZyb20gYHJgIHVudGlsIEVPRiAoYG51bGxgKSBhbmQgYXBwZW5kcyBpdCB0byB0aGUgYnVmZmVyLFxuICAgKiBncm93aW5nIHRoZSBidWZmZXIgYXMgbmVlZGVkLiBJdCByZXNvbHZlcyB0byB0aGUgbnVtYmVyIG9mIGJ5dGVzIHJlYWQuXG4gICAqIElmIHRoZSBidWZmZXIgYmVjb21lcyB0b28gbGFyZ2UsIGAucmVhZEZyb20oKWAgd2lsbCByZWplY3Qgd2l0aCBhbiBlcnJvci5cbiAgICpcbiAgICogQmFzZWQgb24gR28gTGFuZydzXG4gICAqIFtCdWZmZXIuUmVhZEZyb21dKGh0dHBzOi8vZ29sYW5nLm9yZy9wa2cvYnl0ZXMvI0J1ZmZlci5SZWFkRnJvbSkuICovXG4gIGFzeW5jIHJlYWRGcm9tKHI6IFJlYWRlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgbGV0IG4gPSAwO1xuICAgIGNvbnN0IHRtcCA9IG5ldyBVaW50OEFycmF5KE1JTl9SRUFEKTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3Qgc2hvdWxkR3JvdyA9IHRoaXMuY2FwYWNpdHkgLSB0aGlzLmxlbmd0aCA8IE1JTl9SRUFEO1xuICAgICAgLy8gcmVhZCBpbnRvIHRtcCBidWZmZXIgaWYgdGhlcmUncyBub3QgZW5vdWdoIHJvb21cbiAgICAgIC8vIG90aGVyd2lzZSByZWFkIGRpcmVjdGx5IGludG8gdGhlIGludGVybmFsIGJ1ZmZlclxuICAgICAgY29uc3QgYnVmID0gc2hvdWxkR3Jvd1xuICAgICAgICA/IHRtcFxuICAgICAgICA6IG5ldyBVaW50OEFycmF5KHRoaXMuI2J1Zi5idWZmZXIsIHRoaXMubGVuZ3RoKTtcblxuICAgICAgY29uc3QgbnJlYWQgPSBhd2FpdCByLnJlYWQoYnVmKTtcbiAgICAgIGlmIChucmVhZCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbjtcbiAgICAgIH1cblxuICAgICAgLy8gd3JpdGUgd2lsbCBncm93IGlmIG5lZWRlZFxuICAgICAgaWYgKHNob3VsZEdyb3cpIHRoaXMud3JpdGVTeW5jKGJ1Zi5zdWJhcnJheSgwLCBucmVhZCkpO1xuICAgICAgZWxzZSB0aGlzLiNyZXNsaWNlKHRoaXMubGVuZ3RoICsgbnJlYWQpO1xuXG4gICAgICBuICs9IG5yZWFkO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBSZWFkcyBkYXRhIGZyb20gYHJgIHVudGlsIEVPRiAoYG51bGxgKSBhbmQgYXBwZW5kcyBpdCB0byB0aGUgYnVmZmVyLFxuICAgKiBncm93aW5nIHRoZSBidWZmZXIgYXMgbmVlZGVkLiBJdCByZXR1cm5zIHRoZSBudW1iZXIgb2YgYnl0ZXMgcmVhZC4gSWYgdGhlXG4gICAqIGJ1ZmZlciBiZWNvbWVzIHRvbyBsYXJnZSwgYC5yZWFkRnJvbVN5bmMoKWAgd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAgICpcbiAgICogQmFzZWQgb24gR28gTGFuZydzXG4gICAqIFtCdWZmZXIuUmVhZEZyb21dKGh0dHBzOi8vZ29sYW5nLm9yZy9wa2cvYnl0ZXMvI0J1ZmZlci5SZWFkRnJvbSkuICovXG4gIHJlYWRGcm9tU3luYyhyOiBSZWFkZXJTeW5jKTogbnVtYmVyIHtcbiAgICBsZXQgbiA9IDA7XG4gICAgY29uc3QgdG1wID0gbmV3IFVpbnQ4QXJyYXkoTUlOX1JFQUQpO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCBzaG91bGRHcm93ID0gdGhpcy5jYXBhY2l0eSAtIHRoaXMubGVuZ3RoIDwgTUlOX1JFQUQ7XG4gICAgICAvLyByZWFkIGludG8gdG1wIGJ1ZmZlciBpZiB0aGVyZSdzIG5vdCBlbm91Z2ggcm9vbVxuICAgICAgLy8gb3RoZXJ3aXNlIHJlYWQgZGlyZWN0bHkgaW50byB0aGUgaW50ZXJuYWwgYnVmZmVyXG4gICAgICBjb25zdCBidWYgPSBzaG91bGRHcm93XG4gICAgICAgID8gdG1wXG4gICAgICAgIDogbmV3IFVpbnQ4QXJyYXkodGhpcy4jYnVmLmJ1ZmZlciwgdGhpcy5sZW5ndGgpO1xuXG4gICAgICBjb25zdCBucmVhZCA9IHIucmVhZFN5bmMoYnVmKTtcbiAgICAgIGlmIChucmVhZCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbjtcbiAgICAgIH1cblxuICAgICAgLy8gd3JpdGUgd2lsbCBncm93IGlmIG5lZWRlZFxuICAgICAgaWYgKHNob3VsZEdyb3cpIHRoaXMud3JpdGVTeW5jKGJ1Zi5zdWJhcnJheSgwLCBucmVhZCkpO1xuICAgICAgZWxzZSB0aGlzLiNyZXNsaWNlKHRoaXMubGVuZ3RoICsgbnJlYWQpO1xuXG4gICAgICBuICs9IG5yZWFkO1xuICAgIH1cbiAgfVxufVxuXG5jb25zdCBERUZBVUxUX0JVRl9TSVpFID0gNDA5NjtcbmNvbnN0IE1JTl9CVUZfU0laRSA9IDE2O1xuY29uc3QgTUFYX0NPTlNFQ1VUSVZFX0VNUFRZX1JFQURTID0gMTAwO1xuY29uc3QgQ1IgPSBcIlxcclwiLmNoYXJDb2RlQXQoMCk7XG5jb25zdCBMRiA9IFwiXFxuXCIuY2hhckNvZGVBdCgwKTtcblxuZXhwb3J0IGNsYXNzIEJ1ZmZlckZ1bGxFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgbmFtZSA9IFwiQnVmZmVyRnVsbEVycm9yXCI7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBwYXJ0aWFsOiBVaW50OEFycmF5KSB7XG4gICAgc3VwZXIoXCJCdWZmZXIgZnVsbFwiKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUGFydGlhbFJlYWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgbmFtZSA9IFwiUGFydGlhbFJlYWRFcnJvclwiO1xuICBwYXJ0aWFsPzogVWludDhBcnJheTtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXCJFbmNvdW50ZXJlZCBVbmV4cGVjdGVkRW9mLCBkYXRhIG9ubHkgcGFydGlhbGx5IHJlYWRcIik7XG4gIH1cbn1cblxuLyoqIFJlc3VsdCB0eXBlIHJldHVybmVkIGJ5IG9mIEJ1ZlJlYWRlci5yZWFkTGluZSgpLiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWFkTGluZVJlc3VsdCB7XG4gIGxpbmU6IFVpbnQ4QXJyYXk7XG4gIG1vcmU6IGJvb2xlYW47XG59XG5cbi8qKiBCdWZSZWFkZXIgaW1wbGVtZW50cyBidWZmZXJpbmcgZm9yIGEgUmVhZGVyIG9iamVjdC4gKi9cbmV4cG9ydCBjbGFzcyBCdWZSZWFkZXIgaW1wbGVtZW50cyBSZWFkZXIge1xuICAjYnVmITogVWludDhBcnJheTtcbiAgI3JkITogUmVhZGVyOyAvLyBSZWFkZXIgcHJvdmlkZWQgYnkgY2FsbGVyLlxuICAjciA9IDA7IC8vIGJ1ZiByZWFkIHBvc2l0aW9uLlxuICAjdyA9IDA7IC8vIGJ1ZiB3cml0ZSBwb3NpdGlvbi5cbiAgI2VvZiA9IGZhbHNlO1xuICAvLyBwcml2YXRlIGxhc3RCeXRlOiBudW1iZXI7XG4gIC8vIHByaXZhdGUgbGFzdENoYXJTaXplOiBudW1iZXI7XG5cbiAgLyoqIHJldHVybiBuZXcgQnVmUmVhZGVyIHVubGVzcyByIGlzIEJ1ZlJlYWRlciAqL1xuICBzdGF0aWMgY3JlYXRlKHI6IFJlYWRlciwgc2l6ZTogbnVtYmVyID0gREVGQVVMVF9CVUZfU0laRSk6IEJ1ZlJlYWRlciB7XG4gICAgcmV0dXJuIHIgaW5zdGFuY2VvZiBCdWZSZWFkZXIgPyByIDogbmV3IEJ1ZlJlYWRlcihyLCBzaXplKTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHJkOiBSZWFkZXIsIHNpemU6IG51bWJlciA9IERFRkFVTFRfQlVGX1NJWkUpIHtcbiAgICBpZiAoc2l6ZSA8IE1JTl9CVUZfU0laRSkge1xuICAgICAgc2l6ZSA9IE1JTl9CVUZfU0laRTtcbiAgICB9XG4gICAgdGhpcy4jcmVzZXQobmV3IFVpbnQ4QXJyYXkoc2l6ZSksIHJkKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHRoZSBzaXplIG9mIHRoZSB1bmRlcmx5aW5nIGJ1ZmZlciBpbiBieXRlcy4gKi9cbiAgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLiNidWYuYnl0ZUxlbmd0aDtcbiAgfVxuXG4gIGJ1ZmZlcmVkKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuI3cgLSB0aGlzLiNyO1xuICB9XG5cbiAgLy8gUmVhZHMgYSBuZXcgY2h1bmsgaW50byB0aGUgYnVmZmVyLlxuICAjZmlsbCA9IGFzeW5jICgpID0+IHtcbiAgICAvLyBTbGlkZSBleGlzdGluZyBkYXRhIHRvIGJlZ2lubmluZy5cbiAgICBpZiAodGhpcy4jciA+IDApIHtcbiAgICAgIHRoaXMuI2J1Zi5jb3B5V2l0aGluKDAsIHRoaXMuI3IsIHRoaXMuI3cpO1xuICAgICAgdGhpcy4jdyAtPSB0aGlzLiNyO1xuICAgICAgdGhpcy4jciA9IDA7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuI3cgPj0gdGhpcy4jYnVmLmJ5dGVMZW5ndGgpIHtcbiAgICAgIHRocm93IEVycm9yKFwiYnVmaW86IHRyaWVkIHRvIGZpbGwgZnVsbCBidWZmZXJcIik7XG4gICAgfVxuXG4gICAgLy8gUmVhZCBuZXcgZGF0YTogdHJ5IGEgbGltaXRlZCBudW1iZXIgb2YgdGltZXMuXG4gICAgZm9yIChsZXQgaSA9IE1BWF9DT05TRUNVVElWRV9FTVBUWV9SRUFEUzsgaSA+IDA7IGktLSkge1xuICAgICAgY29uc3QgcnIgPSBhd2FpdCB0aGlzLiNyZC5yZWFkKHRoaXMuI2J1Zi5zdWJhcnJheSh0aGlzLiN3KSk7XG4gICAgICBpZiAocnIgPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy4jZW9mID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXNzZXJ0KHJyID49IDAsIFwibmVnYXRpdmUgcmVhZFwiKTtcbiAgICAgIHRoaXMuI3cgKz0gcnI7XG4gICAgICBpZiAocnIgPiAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgTm8gcHJvZ3Jlc3MgYWZ0ZXIgJHtNQVhfQ09OU0VDVVRJVkVfRU1QVFlfUkVBRFN9IHJlYWQoKSBjYWxsc2AsXG4gICAgKTtcbiAgfTtcblxuICAvKiogRGlzY2FyZHMgYW55IGJ1ZmZlcmVkIGRhdGEsIHJlc2V0cyBhbGwgc3RhdGUsIGFuZCBzd2l0Y2hlc1xuICAgKiB0aGUgYnVmZmVyZWQgcmVhZGVyIHRvIHJlYWQgZnJvbSByLlxuICAgKi9cbiAgcmVzZXQocjogUmVhZGVyKTogdm9pZCB7XG4gICAgdGhpcy4jcmVzZXQodGhpcy4jYnVmLCByKTtcbiAgfVxuXG4gICNyZXNldCA9IChidWY6IFVpbnQ4QXJyYXksIHJkOiBSZWFkZXIpOiB2b2lkID0+IHtcbiAgICB0aGlzLiNidWYgPSBidWY7XG4gICAgdGhpcy4jcmQgPSByZDtcbiAgICB0aGlzLiNlb2YgPSBmYWxzZTtcbiAgICAvLyB0aGlzLmxhc3RCeXRlID0gLTE7XG4gICAgLy8gdGhpcy5sYXN0Q2hhclNpemUgPSAtMTtcbiAgfTtcblxuICAvKiogcmVhZHMgZGF0YSBpbnRvIHAuXG4gICAqIEl0IHJldHVybnMgdGhlIG51bWJlciBvZiBieXRlcyByZWFkIGludG8gcC5cbiAgICogVGhlIGJ5dGVzIGFyZSB0YWtlbiBmcm9tIGF0IG1vc3Qgb25lIFJlYWQgb24gdGhlIHVuZGVybHlpbmcgUmVhZGVyLFxuICAgKiBoZW5jZSBuIG1heSBiZSBsZXNzIHRoYW4gbGVuKHApLlxuICAgKiBUbyByZWFkIGV4YWN0bHkgbGVuKHApIGJ5dGVzLCB1c2UgaW8uUmVhZEZ1bGwoYiwgcCkuXG4gICAqL1xuICBhc3luYyByZWFkKHA6IFVpbnQ4QXJyYXkpOiBQcm9taXNlPG51bWJlciB8IG51bGw+IHtcbiAgICBsZXQgcnI6IG51bWJlciB8IG51bGwgPSBwLmJ5dGVMZW5ndGg7XG4gICAgaWYgKHAuYnl0ZUxlbmd0aCA9PT0gMCkgcmV0dXJuIHJyO1xuXG4gICAgaWYgKHRoaXMuI3IgPT09IHRoaXMuI3cpIHtcbiAgICAgIGlmIChwLmJ5dGVMZW5ndGggPj0gdGhpcy4jYnVmLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgLy8gTGFyZ2UgcmVhZCwgZW1wdHkgYnVmZmVyLlxuICAgICAgICAvLyBSZWFkIGRpcmVjdGx5IGludG8gcCB0byBhdm9pZCBjb3B5LlxuICAgICAgICBjb25zdCByciA9IGF3YWl0IHRoaXMuI3JkLnJlYWQocCk7XG4gICAgICAgIGNvbnN0IG5yZWFkID0gcnIgPz8gMDtcbiAgICAgICAgYXNzZXJ0KG5yZWFkID49IDAsIFwibmVnYXRpdmUgcmVhZFwiKTtcbiAgICAgICAgLy8gaWYgKHJyLm5yZWFkID4gMCkge1xuICAgICAgICAvLyAgIHRoaXMubGFzdEJ5dGUgPSBwW3JyLm5yZWFkIC0gMV07XG4gICAgICAgIC8vICAgdGhpcy5sYXN0Q2hhclNpemUgPSAtMTtcbiAgICAgICAgLy8gfVxuICAgICAgICByZXR1cm4gcnI7XG4gICAgICB9XG5cbiAgICAgIC8vIE9uZSByZWFkLlxuICAgICAgLy8gRG8gbm90IHVzZSB0aGlzLmZpbGwsIHdoaWNoIHdpbGwgbG9vcC5cbiAgICAgIHRoaXMuI3IgPSAwO1xuICAgICAgdGhpcy4jdyA9IDA7XG4gICAgICByciA9IGF3YWl0IHRoaXMuI3JkLnJlYWQodGhpcy4jYnVmKTtcbiAgICAgIGlmIChyciA9PT0gMCB8fCByciA9PT0gbnVsbCkgcmV0dXJuIHJyO1xuICAgICAgYXNzZXJ0KHJyID49IDAsIFwibmVnYXRpdmUgcmVhZFwiKTtcbiAgICAgIHRoaXMuI3cgKz0gcnI7XG4gICAgfVxuXG4gICAgLy8gY29weSBhcyBtdWNoIGFzIHdlIGNhblxuICAgIGNvbnN0IGNvcGllZCA9IGNvcHkodGhpcy4jYnVmLnN1YmFycmF5KHRoaXMuI3IsIHRoaXMuI3cpLCBwLCAwKTtcbiAgICB0aGlzLiNyICs9IGNvcGllZDtcbiAgICAvLyB0aGlzLmxhc3RCeXRlID0gdGhpcy5idWZbdGhpcy5yIC0gMV07XG4gICAgLy8gdGhpcy5sYXN0Q2hhclNpemUgPSAtMTtcbiAgICByZXR1cm4gY29waWVkO1xuICB9XG5cbiAgLyoqIHJlYWRzIGV4YWN0bHkgYHAubGVuZ3RoYCBieXRlcyBpbnRvIGBwYC5cbiAgICpcbiAgICogSWYgc3VjY2Vzc2Z1bCwgYHBgIGlzIHJldHVybmVkLlxuICAgKlxuICAgKiBJZiB0aGUgZW5kIG9mIHRoZSB1bmRlcmx5aW5nIHN0cmVhbSBoYXMgYmVlbiByZWFjaGVkLCBhbmQgdGhlcmUgYXJlIG5vIG1vcmVcbiAgICogYnl0ZXMgYXZhaWxhYmxlIGluIHRoZSBidWZmZXIsIGByZWFkRnVsbCgpYCByZXR1cm5zIGBudWxsYCBpbnN0ZWFkLlxuICAgKlxuICAgKiBBbiBlcnJvciBpcyB0aHJvd24gaWYgc29tZSBieXRlcyBjb3VsZCBiZSByZWFkLCBidXQgbm90IGVub3VnaCB0byBmaWxsIGBwYFxuICAgKiBlbnRpcmVseSBiZWZvcmUgdGhlIHVuZGVybHlpbmcgc3RyZWFtIHJlcG9ydGVkIGFuIGVycm9yIG9yIEVPRi4gQW55IGVycm9yXG4gICAqIHRocm93biB3aWxsIGhhdmUgYSBgcGFydGlhbGAgcHJvcGVydHkgdGhhdCBpbmRpY2F0ZXMgdGhlIHNsaWNlIG9mIHRoZVxuICAgKiBidWZmZXIgdGhhdCBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgZmlsbGVkIHdpdGggZGF0YS5cbiAgICpcbiAgICogUG9ydGVkIGZyb20gaHR0cHM6Ly9nb2xhbmcub3JnL3BrZy9pby8jUmVhZEZ1bGxcbiAgICovXG4gIGFzeW5jIHJlYWRGdWxsKHA6IFVpbnQ4QXJyYXkpOiBQcm9taXNlPFVpbnQ4QXJyYXkgfCBudWxsPiB7XG4gICAgbGV0IGJ5dGVzUmVhZCA9IDA7XG4gICAgd2hpbGUgKGJ5dGVzUmVhZCA8IHAubGVuZ3RoKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByciA9IGF3YWl0IHRoaXMucmVhZChwLnN1YmFycmF5KGJ5dGVzUmVhZCkpO1xuICAgICAgICBpZiAocnIgPT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoYnl0ZXNSZWFkID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFBhcnRpYWxSZWFkRXJyb3IoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnl0ZXNSZWFkICs9IHJyO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBQYXJ0aWFsUmVhZEVycm9yKSB7XG4gICAgICAgICAgZXJyLnBhcnRpYWwgPSBwLnN1YmFycmF5KDAsIGJ5dGVzUmVhZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZXJyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICBjb25zdCBlID0gbmV3IFBhcnRpYWxSZWFkRXJyb3IoKTtcbiAgICAgICAgICBlLnBhcnRpYWwgPSBwLnN1YmFycmF5KDAsIGJ5dGVzUmVhZCk7XG4gICAgICAgICAgZS5zdGFjayA9IGVyci5zdGFjaztcbiAgICAgICAgICBlLm1lc3NhZ2UgPSBlcnIubWVzc2FnZTtcbiAgICAgICAgICBlLmNhdXNlID0gZXJyLmNhdXNlO1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9XG5cbiAgLyoqIFJldHVybnMgdGhlIG5leHQgYnl0ZSBbMCwgMjU1XSBvciBgbnVsbGAuICovXG4gIGFzeW5jIHJlYWRCeXRlKCk6IFByb21pc2U8bnVtYmVyIHwgbnVsbD4ge1xuICAgIHdoaWxlICh0aGlzLiNyID09PSB0aGlzLiN3KSB7XG4gICAgICBpZiAodGhpcy4jZW9mKSByZXR1cm4gbnVsbDtcbiAgICAgIGF3YWl0IHRoaXMuI2ZpbGwoKTsgLy8gYnVmZmVyIGlzIGVtcHR5LlxuICAgIH1cbiAgICBjb25zdCBjID0gdGhpcy4jYnVmW3RoaXMuI3JdO1xuICAgIHRoaXMuI3IrKztcbiAgICAvLyB0aGlzLmxhc3RCeXRlID0gYztcbiAgICByZXR1cm4gYztcbiAgfVxuXG4gIC8qKiByZWFkU3RyaW5nKCkgcmVhZHMgdW50aWwgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgZGVsaW0gaW4gdGhlIGlucHV0LFxuICAgKiByZXR1cm5pbmcgYSBzdHJpbmcgY29udGFpbmluZyB0aGUgZGF0YSB1cCB0byBhbmQgaW5jbHVkaW5nIHRoZSBkZWxpbWl0ZXIuXG4gICAqIElmIFJlYWRTdHJpbmcgZW5jb3VudGVycyBhbiBlcnJvciBiZWZvcmUgZmluZGluZyBhIGRlbGltaXRlcixcbiAgICogaXQgcmV0dXJucyB0aGUgZGF0YSByZWFkIGJlZm9yZSB0aGUgZXJyb3IgYW5kIHRoZSBlcnJvciBpdHNlbGZcbiAgICogKG9mdGVuIGBudWxsYCkuXG4gICAqIFJlYWRTdHJpbmcgcmV0dXJucyBlcnIgIT0gbmlsIGlmIGFuZCBvbmx5IGlmIHRoZSByZXR1cm5lZCBkYXRhIGRvZXMgbm90IGVuZFxuICAgKiBpbiBkZWxpbS5cbiAgICogRm9yIHNpbXBsZSB1c2VzLCBhIFNjYW5uZXIgbWF5IGJlIG1vcmUgY29udmVuaWVudC5cbiAgICovXG4gIGFzeW5jIHJlYWRTdHJpbmcoZGVsaW06IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGlmIChkZWxpbS5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkRlbGltaXRlciBzaG91bGQgYmUgYSBzaW5nbGUgY2hhcmFjdGVyXCIpO1xuICAgIH1cbiAgICBjb25zdCBidWZmZXIgPSBhd2FpdCB0aGlzLnJlYWRTbGljZShkZWxpbS5jaGFyQ29kZUF0KDApKTtcbiAgICBpZiAoYnVmZmVyID09PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKGJ1ZmZlcik7XG4gIH1cblxuICAvKiogYHJlYWRMaW5lKClgIGlzIGEgbG93LWxldmVsIGxpbmUtcmVhZGluZyBwcmltaXRpdmUuIE1vc3QgY2FsbGVycyBzaG91bGRcbiAgICogdXNlIGByZWFkU3RyaW5nKCdcXG4nKWAgaW5zdGVhZCBvciB1c2UgYSBTY2FubmVyLlxuICAgKlxuICAgKiBgcmVhZExpbmUoKWAgdHJpZXMgdG8gcmV0dXJuIGEgc2luZ2xlIGxpbmUsIG5vdCBpbmNsdWRpbmcgdGhlIGVuZC1vZi1saW5lXG4gICAqIGJ5dGVzLiBJZiB0aGUgbGluZSB3YXMgdG9vIGxvbmcgZm9yIHRoZSBidWZmZXIgdGhlbiBgbW9yZWAgaXMgc2V0IGFuZCB0aGVcbiAgICogYmVnaW5uaW5nIG9mIHRoZSBsaW5lIGlzIHJldHVybmVkLiBUaGUgcmVzdCBvZiB0aGUgbGluZSB3aWxsIGJlIHJldHVybmVkXG4gICAqIGZyb20gZnV0dXJlIGNhbGxzLiBgbW9yZWAgd2lsbCBiZSBmYWxzZSB3aGVuIHJldHVybmluZyB0aGUgbGFzdCBmcmFnbWVudFxuICAgKiBvZiB0aGUgbGluZS4gVGhlIHJldHVybmVkIGJ1ZmZlciBpcyBvbmx5IHZhbGlkIHVudGlsIHRoZSBuZXh0IGNhbGwgdG9cbiAgICogYHJlYWRMaW5lKClgLlxuICAgKlxuICAgKiBUaGUgdGV4dCByZXR1cm5lZCBmcm9tIFJlYWRMaW5lIGRvZXMgbm90IGluY2x1ZGUgdGhlIGxpbmUgZW5kIChcIlxcclxcblwiIG9yXG4gICAqIFwiXFxuXCIpLlxuICAgKlxuICAgKiBXaGVuIHRoZSBlbmQgb2YgdGhlIHVuZGVybHlpbmcgc3RyZWFtIGlzIHJlYWNoZWQsIHRoZSBmaW5hbCBieXRlcyBpbiB0aGVcbiAgICogc3RyZWFtIGFyZSByZXR1cm5lZC4gTm8gaW5kaWNhdGlvbiBvciBlcnJvciBpcyBnaXZlbiBpZiB0aGUgaW5wdXQgZW5kc1xuICAgKiB3aXRob3V0IGEgZmluYWwgbGluZSBlbmQuIFdoZW4gdGhlcmUgYXJlIG5vIG1vcmUgdHJhaWxpbmcgYnl0ZXMgdG8gcmVhZCxcbiAgICogYHJlYWRMaW5lKClgIHJldHVybnMgYG51bGxgLlxuICAgKlxuICAgKiBDYWxsaW5nIGB1bnJlYWRCeXRlKClgIGFmdGVyIGByZWFkTGluZSgpYCB3aWxsIGFsd2F5cyB1bnJlYWQgdGhlIGxhc3QgYnl0ZVxuICAgKiByZWFkIChwb3NzaWJseSBhIGNoYXJhY3RlciBiZWxvbmdpbmcgdG8gdGhlIGxpbmUgZW5kKSBldmVuIGlmIHRoYXQgYnl0ZSBpc1xuICAgKiBub3QgcGFydCBvZiB0aGUgbGluZSByZXR1cm5lZCBieSBgcmVhZExpbmUoKWAuXG4gICAqL1xuICBhc3luYyByZWFkTGluZSgpOiBQcm9taXNlPFJlYWRMaW5lUmVzdWx0IHwgbnVsbD4ge1xuICAgIGxldCBsaW5lOiBVaW50OEFycmF5IHwgbnVsbCA9IG51bGw7XG5cbiAgICB0cnkge1xuICAgICAgbGluZSA9IGF3YWl0IHRoaXMucmVhZFNsaWNlKExGKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5CYWRSZXNvdXJjZSkge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgICBsZXQgcGFydGlhbDtcbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBQYXJ0aWFsUmVhZEVycm9yKSB7XG4gICAgICAgIHBhcnRpYWwgPSBlcnIucGFydGlhbDtcbiAgICAgICAgYXNzZXJ0KFxuICAgICAgICAgIHBhcnRpYWwgaW5zdGFuY2VvZiBVaW50OEFycmF5LFxuICAgICAgICAgIFwiYnVmaW86IGNhdWdodCBlcnJvciBmcm9tIGByZWFkU2xpY2UoKWAgd2l0aG91dCBgcGFydGlhbGAgcHJvcGVydHlcIixcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gRG9uJ3QgdGhyb3cgaWYgYHJlYWRTbGljZSgpYCBmYWlsZWQgd2l0aCBgQnVmZmVyRnVsbEVycm9yYCwgaW5zdGVhZCB3ZVxuICAgICAgLy8ganVzdCByZXR1cm4gd2hhdGV2ZXIgaXMgYXZhaWxhYmxlIGFuZCBzZXQgdGhlIGBtb3JlYCBmbGFnLlxuICAgICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgQnVmZmVyRnVsbEVycm9yKSkge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG5cbiAgICAgIHBhcnRpYWwgPSBlcnIucGFydGlhbDtcblxuICAgICAgLy8gSGFuZGxlIHRoZSBjYXNlIHdoZXJlIFwiXFxyXFxuXCIgc3RyYWRkbGVzIHRoZSBidWZmZXIuXG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLiNlb2YgJiYgcGFydGlhbCAmJlxuICAgICAgICBwYXJ0aWFsLmJ5dGVMZW5ndGggPiAwICYmXG4gICAgICAgIHBhcnRpYWxbcGFydGlhbC5ieXRlTGVuZ3RoIC0gMV0gPT09IENSXG4gICAgICApIHtcbiAgICAgICAgLy8gUHV0IHRoZSAnXFxyJyBiYWNrIG9uIGJ1ZiBhbmQgZHJvcCBpdCBmcm9tIGxpbmUuXG4gICAgICAgIC8vIExldCB0aGUgbmV4dCBjYWxsIHRvIFJlYWRMaW5lIGNoZWNrIGZvciBcIlxcclxcblwiLlxuICAgICAgICBhc3NlcnQodGhpcy4jciA+IDAsIFwiYnVmaW86IHRyaWVkIHRvIHJld2luZCBwYXN0IHN0YXJ0IG9mIGJ1ZmZlclwiKTtcbiAgICAgICAgdGhpcy4jci0tO1xuICAgICAgICBwYXJ0aWFsID0gcGFydGlhbC5zdWJhcnJheSgwLCBwYXJ0aWFsLmJ5dGVMZW5ndGggLSAxKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcnRpYWwpIHtcbiAgICAgICAgcmV0dXJuIHsgbGluZTogcGFydGlhbCwgbW9yZTogIXRoaXMuI2VvZiB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsaW5lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAobGluZS5ieXRlTGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4geyBsaW5lLCBtb3JlOiBmYWxzZSB9O1xuICAgIH1cblxuICAgIGlmIChsaW5lW2xpbmUuYnl0ZUxlbmd0aCAtIDFdID09IExGKSB7XG4gICAgICBsZXQgZHJvcCA9IDE7XG4gICAgICBpZiAobGluZS5ieXRlTGVuZ3RoID4gMSAmJiBsaW5lW2xpbmUuYnl0ZUxlbmd0aCAtIDJdID09PSBDUikge1xuICAgICAgICBkcm9wID0gMjtcbiAgICAgIH1cbiAgICAgIGxpbmUgPSBsaW5lLnN1YmFycmF5KDAsIGxpbmUuYnl0ZUxlbmd0aCAtIGRyb3ApO1xuICAgIH1cbiAgICByZXR1cm4geyBsaW5lLCBtb3JlOiBmYWxzZSB9O1xuICB9XG5cbiAgLyoqIGByZWFkU2xpY2UoKWAgcmVhZHMgdW50aWwgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYGRlbGltYCBpbiB0aGUgaW5wdXQsXG4gICAqIHJldHVybmluZyBhIHNsaWNlIHBvaW50aW5nIGF0IHRoZSBieXRlcyBpbiB0aGUgYnVmZmVyLiBUaGUgYnl0ZXMgc3RvcFxuICAgKiBiZWluZyB2YWxpZCBhdCB0aGUgbmV4dCByZWFkLlxuICAgKlxuICAgKiBJZiBgcmVhZFNsaWNlKClgIGVuY291bnRlcnMgYW4gZXJyb3IgYmVmb3JlIGZpbmRpbmcgYSBkZWxpbWl0ZXIsIG9yIHRoZVxuICAgKiBidWZmZXIgZmlsbHMgd2l0aG91dCBmaW5kaW5nIGEgZGVsaW1pdGVyLCBpdCB0aHJvd3MgYW4gZXJyb3Igd2l0aCBhXG4gICAqIGBwYXJ0aWFsYCBwcm9wZXJ0eSB0aGF0IGNvbnRhaW5zIHRoZSBlbnRpcmUgYnVmZmVyLlxuICAgKlxuICAgKiBJZiBgcmVhZFNsaWNlKClgIGVuY291bnRlcnMgdGhlIGVuZCBvZiB0aGUgdW5kZXJseWluZyBzdHJlYW0gYW5kIHRoZXJlIGFyZVxuICAgKiBhbnkgYnl0ZXMgbGVmdCBpbiB0aGUgYnVmZmVyLCB0aGUgcmVzdCBvZiB0aGUgYnVmZmVyIGlzIHJldHVybmVkLiBJbiBvdGhlclxuICAgKiB3b3JkcywgRU9GIGlzIGFsd2F5cyB0cmVhdGVkIGFzIGEgZGVsaW1pdGVyLiBPbmNlIHRoZSBidWZmZXIgaXMgZW1wdHksXG4gICAqIGl0IHJldHVybnMgYG51bGxgLlxuICAgKlxuICAgKiBCZWNhdXNlIHRoZSBkYXRhIHJldHVybmVkIGZyb20gYHJlYWRTbGljZSgpYCB3aWxsIGJlIG92ZXJ3cml0dGVuIGJ5IHRoZVxuICAgKiBuZXh0IEkvTyBvcGVyYXRpb24sIG1vc3QgY2xpZW50cyBzaG91bGQgdXNlIGByZWFkU3RyaW5nKClgIGluc3RlYWQuXG4gICAqL1xuICBhc3luYyByZWFkU2xpY2UoZGVsaW06IG51bWJlcik6IFByb21pc2U8VWludDhBcnJheSB8IG51bGw+IHtcbiAgICBsZXQgcyA9IDA7IC8vIHNlYXJjaCBzdGFydCBpbmRleFxuICAgIGxldCBzbGljZTogVWludDhBcnJheSB8IHVuZGVmaW5lZDtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAvLyBTZWFyY2ggYnVmZmVyLlxuICAgICAgbGV0IGkgPSB0aGlzLiNidWYuc3ViYXJyYXkodGhpcy4jciArIHMsIHRoaXMuI3cpLmluZGV4T2YoZGVsaW0pO1xuICAgICAgaWYgKGkgPj0gMCkge1xuICAgICAgICBpICs9IHM7XG4gICAgICAgIHNsaWNlID0gdGhpcy4jYnVmLnN1YmFycmF5KHRoaXMuI3IsIHRoaXMuI3IgKyBpICsgMSk7XG4gICAgICAgIHRoaXMuI3IgKz0gaSArIDE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBFT0Y/XG4gICAgICBpZiAodGhpcy4jZW9mKSB7XG4gICAgICAgIGlmICh0aGlzLiNyID09PSB0aGlzLiN3KSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgc2xpY2UgPSB0aGlzLiNidWYuc3ViYXJyYXkodGhpcy4jciwgdGhpcy4jdyk7XG4gICAgICAgIHRoaXMuI3IgPSB0aGlzLiN3O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgLy8gQnVmZmVyIGZ1bGw/XG4gICAgICBpZiAodGhpcy5idWZmZXJlZCgpID49IHRoaXMuI2J1Zi5ieXRlTGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuI3IgPSB0aGlzLiN3O1xuICAgICAgICAvLyAjNDUyMSBUaGUgaW50ZXJuYWwgYnVmZmVyIHNob3VsZCBub3QgYmUgcmV1c2VkIGFjcm9zcyByZWFkcyBiZWNhdXNlIGl0IGNhdXNlcyBjb3JydXB0aW9uIG9mIGRhdGEuXG4gICAgICAgIGNvbnN0IG9sZGJ1ZiA9IHRoaXMuI2J1ZjtcbiAgICAgICAgY29uc3QgbmV3YnVmID0gdGhpcy4jYnVmLnNsaWNlKDApO1xuICAgICAgICB0aGlzLiNidWYgPSBuZXdidWY7XG4gICAgICAgIHRocm93IG5ldyBCdWZmZXJGdWxsRXJyb3Iob2xkYnVmKTtcbiAgICAgIH1cblxuICAgICAgcyA9IHRoaXMuI3cgLSB0aGlzLiNyOyAvLyBkbyBub3QgcmVzY2FuIGFyZWEgd2Ugc2Nhbm5lZCBiZWZvcmVcblxuICAgICAgLy8gQnVmZmVyIGlzIG5vdCBmdWxsLlxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy4jZmlsbCgpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBQYXJ0aWFsUmVhZEVycm9yKSB7XG4gICAgICAgICAgZXJyLnBhcnRpYWwgPSBzbGljZTtcbiAgICAgICAgfSBlbHNlIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgIGNvbnN0IGUgPSBuZXcgUGFydGlhbFJlYWRFcnJvcigpO1xuICAgICAgICAgIGUucGFydGlhbCA9IHNsaWNlO1xuICAgICAgICAgIGUuc3RhY2sgPSBlcnIuc3RhY2s7XG4gICAgICAgICAgZS5tZXNzYWdlID0gZXJyLm1lc3NhZ2U7XG4gICAgICAgICAgZS5jYXVzZSA9IGVyci5jYXVzZTtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhbmRsZSBsYXN0IGJ5dGUsIGlmIGFueS5cbiAgICAvLyBjb25zdCBpID0gc2xpY2UuYnl0ZUxlbmd0aCAtIDE7XG4gICAgLy8gaWYgKGkgPj0gMCkge1xuICAgIC8vICAgdGhpcy5sYXN0Qnl0ZSA9IHNsaWNlW2ldO1xuICAgIC8vICAgdGhpcy5sYXN0Q2hhclNpemUgPSAtMVxuICAgIC8vIH1cblxuICAgIHJldHVybiBzbGljZTtcbiAgfVxuXG4gIC8qKiBgcGVlaygpYCByZXR1cm5zIHRoZSBuZXh0IGBuYCBieXRlcyB3aXRob3V0IGFkdmFuY2luZyB0aGUgcmVhZGVyLiBUaGVcbiAgICogYnl0ZXMgc3RvcCBiZWluZyB2YWxpZCBhdCB0aGUgbmV4dCByZWFkIGNhbGwuXG4gICAqXG4gICAqIFdoZW4gdGhlIGVuZCBvZiB0aGUgdW5kZXJseWluZyBzdHJlYW0gaXMgcmVhY2hlZCwgYnV0IHRoZXJlIGFyZSB1bnJlYWRcbiAgICogYnl0ZXMgbGVmdCBpbiB0aGUgYnVmZmVyLCB0aG9zZSBieXRlcyBhcmUgcmV0dXJuZWQuIElmIHRoZXJlIGFyZSBubyBieXRlc1xuICAgKiBsZWZ0IGluIHRoZSBidWZmZXIsIGl0IHJldHVybnMgYG51bGxgLlxuICAgKlxuICAgKiBJZiBhbiBlcnJvciBpcyBlbmNvdW50ZXJlZCBiZWZvcmUgYG5gIGJ5dGVzIGFyZSBhdmFpbGFibGUsIGBwZWVrKClgIHRocm93c1xuICAgKiBhbiBlcnJvciB3aXRoIHRoZSBgcGFydGlhbGAgcHJvcGVydHkgc2V0IHRvIGEgc2xpY2Ugb2YgdGhlIGJ1ZmZlciB0aGF0XG4gICAqIGNvbnRhaW5zIHRoZSBieXRlcyB0aGF0IHdlcmUgYXZhaWxhYmxlIGJlZm9yZSB0aGUgZXJyb3Igb2NjdXJyZWQuXG4gICAqL1xuICBhc3luYyBwZWVrKG46IG51bWJlcik6IFByb21pc2U8VWludDhBcnJheSB8IG51bGw+IHtcbiAgICBpZiAobiA8IDApIHtcbiAgICAgIHRocm93IEVycm9yKFwibmVnYXRpdmUgY291bnRcIik7XG4gICAgfVxuXG4gICAgbGV0IGF2YWlsID0gdGhpcy4jdyAtIHRoaXMuI3I7XG4gICAgd2hpbGUgKGF2YWlsIDwgbiAmJiBhdmFpbCA8IHRoaXMuI2J1Zi5ieXRlTGVuZ3RoICYmICF0aGlzLiNlb2YpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuI2ZpbGwoKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgUGFydGlhbFJlYWRFcnJvcikge1xuICAgICAgICAgIGVyci5wYXJ0aWFsID0gdGhpcy4jYnVmLnN1YmFycmF5KHRoaXMuI3IsIHRoaXMuI3cpO1xuICAgICAgICB9IGVsc2UgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgY29uc3QgZSA9IG5ldyBQYXJ0aWFsUmVhZEVycm9yKCk7XG4gICAgICAgICAgZS5wYXJ0aWFsID0gdGhpcy4jYnVmLnN1YmFycmF5KHRoaXMuI3IsIHRoaXMuI3cpO1xuICAgICAgICAgIGUuc3RhY2sgPSBlcnIuc3RhY2s7XG4gICAgICAgICAgZS5tZXNzYWdlID0gZXJyLm1lc3NhZ2U7XG4gICAgICAgICAgZS5jYXVzZSA9IGVyci5jYXVzZTtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgICAgYXZhaWwgPSB0aGlzLiN3IC0gdGhpcy4jcjtcbiAgICB9XG5cbiAgICBpZiAoYXZhaWwgPT09IDAgJiYgdGhpcy4jZW9mKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGF2YWlsIDwgbiAmJiB0aGlzLiNlb2YpIHtcbiAgICAgIHJldHVybiB0aGlzLiNidWYuc3ViYXJyYXkodGhpcy4jciwgdGhpcy4jciArIGF2YWlsKTtcbiAgICB9IGVsc2UgaWYgKGF2YWlsIDwgbikge1xuICAgICAgdGhyb3cgbmV3IEJ1ZmZlckZ1bGxFcnJvcih0aGlzLiNidWYuc3ViYXJyYXkodGhpcy4jciwgdGhpcy4jdykpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLiNidWYuc3ViYXJyYXkodGhpcy4jciwgdGhpcy4jciArIG4pO1xuICB9XG59XG5cbmFic3RyYWN0IGNsYXNzIEFic3RyYWN0QnVmQmFzZSB7XG4gIGJ1ZjogVWludDhBcnJheTtcbiAgdXNlZEJ1ZmZlckJ5dGVzID0gMDtcbiAgZXJyOiBFcnJvciB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKGJ1ZjogVWludDhBcnJheSkge1xuICAgIHRoaXMuYnVmID0gYnVmO1xuICB9XG5cbiAgLyoqIFNpemUgcmV0dXJucyB0aGUgc2l6ZSBvZiB0aGUgdW5kZXJseWluZyBidWZmZXIgaW4gYnl0ZXMuICovXG4gIHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5idWYuYnl0ZUxlbmd0aDtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGhvdyBtYW55IGJ5dGVzIGFyZSB1bnVzZWQgaW4gdGhlIGJ1ZmZlci4gKi9cbiAgYXZhaWxhYmxlKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuYnVmLmJ5dGVMZW5ndGggLSB0aGlzLnVzZWRCdWZmZXJCeXRlcztcbiAgfVxuXG4gIC8qKiBidWZmZXJlZCByZXR1cm5zIHRoZSBudW1iZXIgb2YgYnl0ZXMgdGhhdCBoYXZlIGJlZW4gd3JpdHRlbiBpbnRvIHRoZVxuICAgKiBjdXJyZW50IGJ1ZmZlci5cbiAgICovXG4gIGJ1ZmZlcmVkKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMudXNlZEJ1ZmZlckJ5dGVzO1xuICB9XG59XG5cbi8qKiBCdWZXcml0ZXIgaW1wbGVtZW50cyBidWZmZXJpbmcgZm9yIGFuIGRlbm8uV3JpdGVyIG9iamVjdC5cbiAqIElmIGFuIGVycm9yIG9jY3VycyB3cml0aW5nIHRvIGEgV3JpdGVyLCBubyBtb3JlIGRhdGEgd2lsbCBiZVxuICogYWNjZXB0ZWQgYW5kIGFsbCBzdWJzZXF1ZW50IHdyaXRlcywgYW5kIGZsdXNoKCksIHdpbGwgcmV0dXJuIHRoZSBlcnJvci5cbiAqIEFmdGVyIGFsbCBkYXRhIGhhcyBiZWVuIHdyaXR0ZW4sIHRoZSBjbGllbnQgc2hvdWxkIGNhbGwgdGhlXG4gKiBmbHVzaCgpIG1ldGhvZCB0byBndWFyYW50ZWUgYWxsIGRhdGEgaGFzIGJlZW4gZm9yd2FyZGVkIHRvXG4gKiB0aGUgdW5kZXJseWluZyBkZW5vLldyaXRlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEJ1ZldyaXRlciBleHRlbmRzIEFic3RyYWN0QnVmQmFzZSBpbXBsZW1lbnRzIFdyaXRlciB7XG4gICN3cml0ZXI6IFdyaXRlcjtcblxuICAvKiogcmV0dXJuIG5ldyBCdWZXcml0ZXIgdW5sZXNzIHdyaXRlciBpcyBCdWZXcml0ZXIgKi9cbiAgc3RhdGljIGNyZWF0ZSh3cml0ZXI6IFdyaXRlciwgc2l6ZTogbnVtYmVyID0gREVGQVVMVF9CVUZfU0laRSk6IEJ1ZldyaXRlciB7XG4gICAgcmV0dXJuIHdyaXRlciBpbnN0YW5jZW9mIEJ1ZldyaXRlciA/IHdyaXRlciA6IG5ldyBCdWZXcml0ZXIod3JpdGVyLCBzaXplKTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHdyaXRlcjogV3JpdGVyLCBzaXplOiBudW1iZXIgPSBERUZBVUxUX0JVRl9TSVpFKSB7XG4gICAgaWYgKHNpemUgPD0gMCkge1xuICAgICAgc2l6ZSA9IERFRkFVTFRfQlVGX1NJWkU7XG4gICAgfVxuICAgIGNvbnN0IGJ1ZiA9IG5ldyBVaW50OEFycmF5KHNpemUpO1xuICAgIHN1cGVyKGJ1Zik7XG4gICAgdGhpcy4jd3JpdGVyID0gd3JpdGVyO1xuICB9XG5cbiAgLyoqIERpc2NhcmRzIGFueSB1bmZsdXNoZWQgYnVmZmVyZWQgZGF0YSwgY2xlYXJzIGFueSBlcnJvciwgYW5kXG4gICAqIHJlc2V0cyBidWZmZXIgdG8gd3JpdGUgaXRzIG91dHB1dCB0byB3LlxuICAgKi9cbiAgcmVzZXQodzogV3JpdGVyKTogdm9pZCB7XG4gICAgdGhpcy5lcnIgPSBudWxsO1xuICAgIHRoaXMudXNlZEJ1ZmZlckJ5dGVzID0gMDtcbiAgICB0aGlzLiN3cml0ZXIgPSB3O1xuICB9XG5cbiAgLyoqIEZsdXNoIHdyaXRlcyBhbnkgYnVmZmVyZWQgZGF0YSB0byB0aGUgdW5kZXJseWluZyBpby5Xcml0ZXIuICovXG4gIGFzeW5jIGZsdXNoKCkge1xuICAgIGlmICh0aGlzLmVyciAhPT0gbnVsbCkgdGhyb3cgdGhpcy5lcnI7XG4gICAgaWYgKHRoaXMudXNlZEJ1ZmZlckJ5dGVzID09PSAwKSByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcCA9IHRoaXMuYnVmLnN1YmFycmF5KDAsIHRoaXMudXNlZEJ1ZmZlckJ5dGVzKTtcbiAgICAgIGxldCBud3JpdHRlbiA9IDA7XG4gICAgICB3aGlsZSAobndyaXR0ZW4gPCBwLmxlbmd0aCkge1xuICAgICAgICBud3JpdHRlbiArPSBhd2FpdCB0aGlzLiN3cml0ZXIud3JpdGUocC5zdWJhcnJheShud3JpdHRlbikpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhpcy5lcnIgPSBlO1xuICAgICAgfVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMuYnVmLmxlbmd0aCk7XG4gICAgdGhpcy51c2VkQnVmZmVyQnl0ZXMgPSAwO1xuICB9XG5cbiAgLyoqIFdyaXRlcyB0aGUgY29udGVudHMgb2YgYGRhdGFgIGludG8gdGhlIGJ1ZmZlci4gIElmIHRoZSBjb250ZW50cyB3b24ndCBmdWxseVxuICAgKiBmaXQgaW50byB0aGUgYnVmZmVyLCB0aG9zZSBieXRlcyB0aGF0IGNhbiBhcmUgY29waWVkIGludG8gdGhlIGJ1ZmZlciwgdGhlXG4gICAqIGJ1ZmZlciBpcyB0aGUgZmx1c2hlZCB0byB0aGUgd3JpdGVyIGFuZCB0aGUgcmVtYWluaW5nIGJ5dGVzIGFyZSBjb3BpZWQgaW50b1xuICAgKiB0aGUgbm93IGVtcHR5IGJ1ZmZlci5cbiAgICpcbiAgICogQHJldHVybiB0aGUgbnVtYmVyIG9mIGJ5dGVzIHdyaXR0ZW4gdG8gdGhlIGJ1ZmZlci5cbiAgICovXG4gIGFzeW5jIHdyaXRlKGRhdGE6IFVpbnQ4QXJyYXkpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGlmICh0aGlzLmVyciAhPT0gbnVsbCkgdGhyb3cgdGhpcy5lcnI7XG4gICAgaWYgKGRhdGEubGVuZ3RoID09PSAwKSByZXR1cm4gMDtcblxuICAgIGxldCB0b3RhbEJ5dGVzV3JpdHRlbiA9IDA7XG4gICAgbGV0IG51bUJ5dGVzV3JpdHRlbiA9IDA7XG4gICAgd2hpbGUgKGRhdGEuYnl0ZUxlbmd0aCA+IHRoaXMuYXZhaWxhYmxlKCkpIHtcbiAgICAgIGlmICh0aGlzLmJ1ZmZlcmVkKCkgPT09IDApIHtcbiAgICAgICAgLy8gTGFyZ2Ugd3JpdGUsIGVtcHR5IGJ1ZmZlci5cbiAgICAgICAgLy8gV3JpdGUgZGlyZWN0bHkgZnJvbSBkYXRhIHRvIGF2b2lkIGNvcHkuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbnVtQnl0ZXNXcml0dGVuID0gYXdhaXQgdGhpcy4jd3JpdGVyLndyaXRlKGRhdGEpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgdGhpcy5lcnIgPSBlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBudW1CeXRlc1dyaXR0ZW4gPSBjb3B5KGRhdGEsIHRoaXMuYnVmLCB0aGlzLnVzZWRCdWZmZXJCeXRlcyk7XG4gICAgICAgIHRoaXMudXNlZEJ1ZmZlckJ5dGVzICs9IG51bUJ5dGVzV3JpdHRlbjtcbiAgICAgICAgYXdhaXQgdGhpcy5mbHVzaCgpO1xuICAgICAgfVxuICAgICAgdG90YWxCeXRlc1dyaXR0ZW4gKz0gbnVtQnl0ZXNXcml0dGVuO1xuICAgICAgZGF0YSA9IGRhdGEuc3ViYXJyYXkobnVtQnl0ZXNXcml0dGVuKTtcbiAgICB9XG5cbiAgICBudW1CeXRlc1dyaXR0ZW4gPSBjb3B5KGRhdGEsIHRoaXMuYnVmLCB0aGlzLnVzZWRCdWZmZXJCeXRlcyk7XG4gICAgdGhpcy51c2VkQnVmZmVyQnl0ZXMgKz0gbnVtQnl0ZXNXcml0dGVuO1xuICAgIHRvdGFsQnl0ZXNXcml0dGVuICs9IG51bUJ5dGVzV3JpdHRlbjtcbiAgICByZXR1cm4gdG90YWxCeXRlc1dyaXR0ZW47XG4gIH1cbn1cblxuLyoqIEJ1ZldyaXRlclN5bmMgaW1wbGVtZW50cyBidWZmZXJpbmcgZm9yIGEgZGVuby5Xcml0ZXJTeW5jIG9iamVjdC5cbiAqIElmIGFuIGVycm9yIG9jY3VycyB3cml0aW5nIHRvIGEgV3JpdGVyU3luYywgbm8gbW9yZSBkYXRhIHdpbGwgYmVcbiAqIGFjY2VwdGVkIGFuZCBhbGwgc3Vic2VxdWVudCB3cml0ZXMsIGFuZCBmbHVzaCgpLCB3aWxsIHJldHVybiB0aGUgZXJyb3IuXG4gKiBBZnRlciBhbGwgZGF0YSBoYXMgYmVlbiB3cml0dGVuLCB0aGUgY2xpZW50IHNob3VsZCBjYWxsIHRoZVxuICogZmx1c2goKSBtZXRob2QgdG8gZ3VhcmFudGVlIGFsbCBkYXRhIGhhcyBiZWVuIGZvcndhcmRlZCB0b1xuICogdGhlIHVuZGVybHlpbmcgZGVuby5Xcml0ZXJTeW5jLlxuICovXG5leHBvcnQgY2xhc3MgQnVmV3JpdGVyU3luYyBleHRlbmRzIEFic3RyYWN0QnVmQmFzZSBpbXBsZW1lbnRzIFdyaXRlclN5bmMge1xuICAjd3JpdGVyOiBXcml0ZXJTeW5jO1xuXG4gIC8qKiByZXR1cm4gbmV3IEJ1ZldyaXRlclN5bmMgdW5sZXNzIHdyaXRlciBpcyBCdWZXcml0ZXJTeW5jICovXG4gIHN0YXRpYyBjcmVhdGUoXG4gICAgd3JpdGVyOiBXcml0ZXJTeW5jLFxuICAgIHNpemU6IG51bWJlciA9IERFRkFVTFRfQlVGX1NJWkUsXG4gICk6IEJ1ZldyaXRlclN5bmMge1xuICAgIHJldHVybiB3cml0ZXIgaW5zdGFuY2VvZiBCdWZXcml0ZXJTeW5jXG4gICAgICA/IHdyaXRlclxuICAgICAgOiBuZXcgQnVmV3JpdGVyU3luYyh3cml0ZXIsIHNpemUpO1xuICB9XG5cbiAgY29uc3RydWN0b3Iod3JpdGVyOiBXcml0ZXJTeW5jLCBzaXplOiBudW1iZXIgPSBERUZBVUxUX0JVRl9TSVpFKSB7XG4gICAgaWYgKHNpemUgPD0gMCkge1xuICAgICAgc2l6ZSA9IERFRkFVTFRfQlVGX1NJWkU7XG4gICAgfVxuICAgIGNvbnN0IGJ1ZiA9IG5ldyBVaW50OEFycmF5KHNpemUpO1xuICAgIHN1cGVyKGJ1Zik7XG4gICAgdGhpcy4jd3JpdGVyID0gd3JpdGVyO1xuICB9XG5cbiAgLyoqIERpc2NhcmRzIGFueSB1bmZsdXNoZWQgYnVmZmVyZWQgZGF0YSwgY2xlYXJzIGFueSBlcnJvciwgYW5kXG4gICAqIHJlc2V0cyBidWZmZXIgdG8gd3JpdGUgaXRzIG91dHB1dCB0byB3LlxuICAgKi9cbiAgcmVzZXQodzogV3JpdGVyU3luYyk6IHZvaWQge1xuICAgIHRoaXMuZXJyID0gbnVsbDtcbiAgICB0aGlzLnVzZWRCdWZmZXJCeXRlcyA9IDA7XG4gICAgdGhpcy4jd3JpdGVyID0gdztcbiAgfVxuXG4gIC8qKiBGbHVzaCB3cml0ZXMgYW55IGJ1ZmZlcmVkIGRhdGEgdG8gdGhlIHVuZGVybHlpbmcgaW8uV3JpdGVyU3luYy4gKi9cbiAgZmx1c2goKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZXJyICE9PSBudWxsKSB0aHJvdyB0aGlzLmVycjtcbiAgICBpZiAodGhpcy51c2VkQnVmZmVyQnl0ZXMgPT09IDApIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBwID0gdGhpcy5idWYuc3ViYXJyYXkoMCwgdGhpcy51c2VkQnVmZmVyQnl0ZXMpO1xuICAgICAgbGV0IG53cml0dGVuID0gMDtcbiAgICAgIHdoaWxlIChud3JpdHRlbiA8IHAubGVuZ3RoKSB7XG4gICAgICAgIG53cml0dGVuICs9IHRoaXMuI3dyaXRlci53cml0ZVN5bmMocC5zdWJhcnJheShud3JpdHRlbikpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhpcy5lcnIgPSBlO1xuICAgICAgfVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMuYnVmLmxlbmd0aCk7XG4gICAgdGhpcy51c2VkQnVmZmVyQnl0ZXMgPSAwO1xuICB9XG5cbiAgLyoqIFdyaXRlcyB0aGUgY29udGVudHMgb2YgYGRhdGFgIGludG8gdGhlIGJ1ZmZlci4gIElmIHRoZSBjb250ZW50cyB3b24ndCBmdWxseVxuICAgKiBmaXQgaW50byB0aGUgYnVmZmVyLCB0aG9zZSBieXRlcyB0aGF0IGNhbiBhcmUgY29waWVkIGludG8gdGhlIGJ1ZmZlciwgdGhlXG4gICAqIGJ1ZmZlciBpcyB0aGUgZmx1c2hlZCB0byB0aGUgd3JpdGVyIGFuZCB0aGUgcmVtYWluaW5nIGJ5dGVzIGFyZSBjb3BpZWQgaW50b1xuICAgKiB0aGUgbm93IGVtcHR5IGJ1ZmZlci5cbiAgICpcbiAgICogQHJldHVybiB0aGUgbnVtYmVyIG9mIGJ5dGVzIHdyaXR0ZW4gdG8gdGhlIGJ1ZmZlci5cbiAgICovXG4gIHdyaXRlU3luYyhkYXRhOiBVaW50OEFycmF5KTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5lcnIgIT09IG51bGwpIHRocm93IHRoaXMuZXJyO1xuICAgIGlmIChkYXRhLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDA7XG5cbiAgICBsZXQgdG90YWxCeXRlc1dyaXR0ZW4gPSAwO1xuICAgIGxldCBudW1CeXRlc1dyaXR0ZW4gPSAwO1xuICAgIHdoaWxlIChkYXRhLmJ5dGVMZW5ndGggPiB0aGlzLmF2YWlsYWJsZSgpKSB7XG4gICAgICBpZiAodGhpcy5idWZmZXJlZCgpID09PSAwKSB7XG4gICAgICAgIC8vIExhcmdlIHdyaXRlLCBlbXB0eSBidWZmZXIuXG4gICAgICAgIC8vIFdyaXRlIGRpcmVjdGx5IGZyb20gZGF0YSB0byBhdm9pZCBjb3B5LlxuICAgICAgICB0cnkge1xuICAgICAgICAgIG51bUJ5dGVzV3JpdHRlbiA9IHRoaXMuI3dyaXRlci53cml0ZVN5bmMoZGF0YSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmVyciA9IGU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG51bUJ5dGVzV3JpdHRlbiA9IGNvcHkoZGF0YSwgdGhpcy5idWYsIHRoaXMudXNlZEJ1ZmZlckJ5dGVzKTtcbiAgICAgICAgdGhpcy51c2VkQnVmZmVyQnl0ZXMgKz0gbnVtQnl0ZXNXcml0dGVuO1xuICAgICAgICB0aGlzLmZsdXNoKCk7XG4gICAgICB9XG4gICAgICB0b3RhbEJ5dGVzV3JpdHRlbiArPSBudW1CeXRlc1dyaXR0ZW47XG4gICAgICBkYXRhID0gZGF0YS5zdWJhcnJheShudW1CeXRlc1dyaXR0ZW4pO1xuICAgIH1cblxuICAgIG51bUJ5dGVzV3JpdHRlbiA9IGNvcHkoZGF0YSwgdGhpcy5idWYsIHRoaXMudXNlZEJ1ZmZlckJ5dGVzKTtcbiAgICB0aGlzLnVzZWRCdWZmZXJCeXRlcyArPSBudW1CeXRlc1dyaXR0ZW47XG4gICAgdG90YWxCeXRlc1dyaXR0ZW4gKz0gbnVtQnl0ZXNXcml0dGVuO1xuICAgIHJldHVybiB0b3RhbEJ5dGVzV3JpdHRlbjtcbiAgfVxufVxuXG4vKiogR2VuZXJhdGUgbG9uZ2VzdCBwcm9wZXIgcHJlZml4IHdoaWNoIGlzIGFsc28gc3VmZml4IGFycmF5LiAqL1xuZnVuY3Rpb24gY3JlYXRlTFBTKHBhdDogVWludDhBcnJheSk6IFVpbnQ4QXJyYXkge1xuICBjb25zdCBscHMgPSBuZXcgVWludDhBcnJheShwYXQubGVuZ3RoKTtcbiAgbHBzWzBdID0gMDtcbiAgbGV0IHByZWZpeEVuZCA9IDA7XG4gIGxldCBpID0gMTtcbiAgd2hpbGUgKGkgPCBscHMubGVuZ3RoKSB7XG4gICAgaWYgKHBhdFtpXSA9PSBwYXRbcHJlZml4RW5kXSkge1xuICAgICAgcHJlZml4RW5kKys7XG4gICAgICBscHNbaV0gPSBwcmVmaXhFbmQ7XG4gICAgICBpKys7XG4gICAgfSBlbHNlIGlmIChwcmVmaXhFbmQgPT09IDApIHtcbiAgICAgIGxwc1tpXSA9IDA7XG4gICAgICBpKys7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByZWZpeEVuZCA9IGxwc1twcmVmaXhFbmQgLSAxXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGxwcztcbn1cblxuLyoqIFJlYWQgZGVsaW1pdGVkIGJ5dGVzIGZyb20gYSBSZWFkZXIuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHJlYWREZWxpbShcbiAgcmVhZGVyOiBSZWFkZXIsXG4gIGRlbGltOiBVaW50OEFycmF5LFxuKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgLy8gQXZvaWQgdW5pY29kZSBwcm9ibGVtc1xuICBjb25zdCBkZWxpbUxlbiA9IGRlbGltLmxlbmd0aDtcbiAgY29uc3QgZGVsaW1MUFMgPSBjcmVhdGVMUFMoZGVsaW0pO1xuICBjb25zdCBjaHVua3MgPSBuZXcgQnl0ZXNMaXN0KCk7XG4gIGNvbnN0IGJ1ZlNpemUgPSBNYXRoLm1heCgxMDI0LCBkZWxpbUxlbiArIDEpO1xuXG4gIC8vIE1vZGlmaWVkIEtNUFxuICBsZXQgaW5zcGVjdEluZGV4ID0gMDtcbiAgbGV0IG1hdGNoSW5kZXggPSAwO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IGluc3BlY3RBcnIgPSBuZXcgVWludDhBcnJheShidWZTaXplKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZWFkZXIucmVhZChpbnNwZWN0QXJyKTtcbiAgICBpZiAocmVzdWx0ID09PSBudWxsKSB7XG4gICAgICAvLyBZaWVsZCBsYXN0IGNodW5rLlxuICAgICAgeWllbGQgY2h1bmtzLmNvbmNhdCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAocmVzdWx0IDwgMCkge1xuICAgICAgLy8gRGlzY2FyZCBhbGwgcmVtYWluaW5nIGFuZCBzaWxlbnRseSBmYWlsLlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjaHVua3MuYWRkKGluc3BlY3RBcnIsIDAsIHJlc3VsdCk7XG4gICAgbGV0IGxvY2FsSW5kZXggPSAwO1xuICAgIHdoaWxlIChpbnNwZWN0SW5kZXggPCBjaHVua3Muc2l6ZSgpKSB7XG4gICAgICBpZiAoaW5zcGVjdEFycltsb2NhbEluZGV4XSA9PT0gZGVsaW1bbWF0Y2hJbmRleF0pIHtcbiAgICAgICAgaW5zcGVjdEluZGV4Kys7XG4gICAgICAgIGxvY2FsSW5kZXgrKztcbiAgICAgICAgbWF0Y2hJbmRleCsrO1xuICAgICAgICBpZiAobWF0Y2hJbmRleCA9PT0gZGVsaW1MZW4pIHtcbiAgICAgICAgICAvLyBGdWxsIG1hdGNoXG4gICAgICAgICAgY29uc3QgbWF0Y2hFbmQgPSBpbnNwZWN0SW5kZXggLSBkZWxpbUxlbjtcbiAgICAgICAgICBjb25zdCByZWFkeUJ5dGVzID0gY2h1bmtzLnNsaWNlKDAsIG1hdGNoRW5kKTtcbiAgICAgICAgICB5aWVsZCByZWFkeUJ5dGVzO1xuICAgICAgICAgIC8vIFJlc2V0IG1hdGNoLCBkaWZmZXJlbnQgZnJvbSBLTVAuXG4gICAgICAgICAgY2h1bmtzLnNoaWZ0KGluc3BlY3RJbmRleCk7XG4gICAgICAgICAgaW5zcGVjdEluZGV4ID0gMDtcbiAgICAgICAgICBtYXRjaEluZGV4ID0gMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG1hdGNoSW5kZXggPT09IDApIHtcbiAgICAgICAgICBpbnNwZWN0SW5kZXgrKztcbiAgICAgICAgICBsb2NhbEluZGV4Kys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWF0Y2hJbmRleCA9IGRlbGltTFBTW21hdGNoSW5kZXggLSAxXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKiogUmVhZCBkZWxpbWl0ZWQgc3RyaW5ncyBmcm9tIGEgUmVhZGVyLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiByZWFkU3RyaW5nRGVsaW0oXG4gIHJlYWRlcjogUmVhZGVyLFxuICBkZWxpbTogc3RyaW5nLFxuICBkZWNvZGVyT3B0cz86IHtcbiAgICBlbmNvZGluZz86IHN0cmluZztcbiAgICBmYXRhbD86IGJvb2xlYW47XG4gICAgaWdub3JlQk9NPzogYm9vbGVhbjtcbiAgfSxcbik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+IHtcbiAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICBjb25zdCBkZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKGRlY29kZXJPcHRzPy5lbmNvZGluZywgZGVjb2Rlck9wdHMpO1xuICBmb3IgYXdhaXQgKGNvbnN0IGNodW5rIG9mIHJlYWREZWxpbShyZWFkZXIsIGVuY29kZXIuZW5jb2RlKGRlbGltKSkpIHtcbiAgICB5aWVsZCBkZWNvZGVyLmRlY29kZShjaHVuayk7XG4gIH1cbn1cblxuLyoqIFJlYWQgc3RyaW5ncyBsaW5lLWJ5LWxpbmUgZnJvbSBhIFJlYWRlci4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVhZExpbmVzKFxuICByZWFkZXI6IFJlYWRlcixcbiAgZGVjb2Rlck9wdHM/OiB7XG4gICAgZW5jb2Rpbmc/OiBzdHJpbmc7XG4gICAgZmF0YWw/OiBib29sZWFuO1xuICAgIGlnbm9yZUJPTT86IGJvb2xlYW47XG4gIH0sXG4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8c3RyaW5nPiB7XG4gIGNvbnN0IGJ1ZlJlYWRlciA9IG5ldyBCdWZSZWFkZXIocmVhZGVyKTtcbiAgbGV0IGNodW5rczogVWludDhBcnJheVtdID0gW107XG4gIGNvbnN0IGRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoZGVjb2Rlck9wdHM/LmVuY29kaW5nLCBkZWNvZGVyT3B0cyk7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgYnVmUmVhZGVyLnJlYWRMaW5lKCk7XG4gICAgaWYgKCFyZXMpIHtcbiAgICAgIGlmIChjaHVua3MubGVuZ3RoID4gMCkge1xuICAgICAgICB5aWVsZCBkZWNvZGVyLmRlY29kZShjb25jYXQoLi4uY2h1bmtzKSk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2h1bmtzLnB1c2gocmVzLmxpbmUpO1xuICAgIGlmICghcmVzLm1vcmUpIHtcbiAgICAgIHlpZWxkIGRlY29kZXIuZGVjb2RlKGNvbmNhdCguLi5jaHVua3MpKTtcbiAgICAgIGNodW5rcyA9IFtdO1xuICAgIH1cbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxTQUFTLE1BQU0sUUFBUSxvQkFBb0IsQ0FBQztBQUM1QyxTQUFTLFNBQVMsUUFBUSx3QkFBd0IsQ0FBQztBQUNuRCxTQUFTLE1BQU0sRUFBRSxJQUFJLFFBQVEsaUJBQWlCLENBQUM7QUFHL0Msb0VBQW9FO0FBQ3BFLDRFQUE0RTtBQUM1RSwyRUFBMkU7QUFDM0UscUJBQXFCO0FBQ3JCLE1BQU0sUUFBUSxHQUFHLEVBQUUsR0FBRyxJQUFJLEFBQUM7QUFDM0IsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEFBQUM7QUFFN0I7Ozs7Ozs7Ozs7Ozs7K0RBYStELEdBRS9ELE9BQU8sTUFBTSxNQUFNO0lBQ2pCLENBQUMsR0FBRyxDQUFhO0lBQ2pCLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUVULFlBQVksRUFBd0MsQ0FBRTtRQUNwRCxJQUFJLENBQUMsQ0FBQyxHQUFH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