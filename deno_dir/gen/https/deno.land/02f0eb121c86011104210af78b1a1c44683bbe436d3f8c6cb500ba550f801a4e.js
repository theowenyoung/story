// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { Buffer } from "../io/buffer.ts";
const DEFAULT_CHUNK_SIZE = 16_640;
const DEFAULT_BUFFER_SIZE = 32 * 1024;
function isCloser(value) {
    return typeof value === "object" && value != null && "close" in value && // deno-lint-ignore no-explicit-any
    typeof value["close"] === "function";
}
/** Create a `Deno.Reader` from an iterable of `Uint8Array`s.
 *
 * ```ts
 *      import { readerFromIterable } from "./conversion.ts";
 *      import { serve } from "../http/server_legacy.ts";
 *
 *      for await (const request of serve({ port: 8000 })) {
 *        // Server-sent events: Send runtime metrics to the client every second.
 *        request.respond({
 *          headers: new Headers({ "Content-Type": "text/event-stream" }),
 *          body: readerFromIterable((async function* () {
 *            while (true) {
 *              await new Promise((r) => setTimeout(r, 1000));
 *              const message = `data: ${JSON.stringify(Deno.metrics())}\n\n`;
 *              yield new TextEncoder().encode(message);
 *            }
 *          })()),
 *        });
 *      }
 * ```
 */ export function readerFromIterable(iterable) {
    const iterator = iterable[Symbol.asyncIterator]?.() ?? iterable[Symbol.iterator]?.();
    const buffer = new Buffer();
    return {
        async read (p) {
            if (buffer.length == 0) {
                const result = await iterator.next();
                if (result.done) {
                    return null;
                } else {
                    if (result.value.byteLength <= p.byteLength) {
                        p.set(result.value);
                        return result.value.byteLength;
                    }
                    p.set(result.value.subarray(0, p.byteLength));
                    await writeAll(buffer, result.value.subarray(p.byteLength));
                    return p.byteLength;
                }
            } else {
                const n = await buffer.read(p);
                if (n == null) {
                    return this.read(p);
                }
                return n;
            }
        }
    };
}
/** Create a `Writer` from a `WritableStreamDefaultWriter`. */ export function writerFromStreamWriter(streamWriter) {
    return {
        async write (p) {
            await streamWriter.ready;
            await streamWriter.write(p);
            return p.length;
        }
    };
}
/** Create a `Reader` from a `ReadableStreamDefaultReader`. */ export function readerFromStreamReader(streamReader) {
    const buffer = new Buffer();
    return {
        async read (p) {
            if (buffer.empty()) {
                const res = await streamReader.read();
                if (res.done) {
                    return null; // EOF
                }
                await writeAll(buffer, res.value);
            }
            return buffer.read(p);
        }
    };
}
/** Create a `WritableStream` from a `Writer`. */ export function writableStreamFromWriter(writer, options = {}) {
    const { autoClose =true  } = options;
    return new WritableStream({
        async write (chunk, controller) {
            try {
                await writeAll(writer, chunk);
            } catch (e) {
                controller.error(e);
                if (isCloser(writer) && autoClose) {
                    writer.close();
                }
            }
        },
        close () {
            if (isCloser(writer) && autoClose) {
                writer.close();
            }
        },
        abort () {
            if (isCloser(writer) && autoClose) {
                writer.close();
            }
        }
    });
}
/** Create a `ReadableStream` from any kind of iterable.
 *
 * ```ts
 *      import { readableStreamFromIterable } from "./conversion.ts";
 *
 *      const r1 = readableStreamFromIterable(["foo, bar, baz"]);
 *      const r2 = readableStreamFromIterable(async function* () {
 *        await new Promise(((r) => setTimeout(r, 1000)));
 *        yield "foo";
 *        await new Promise(((r) => setTimeout(r, 1000)));
 *        yield "bar";
 *        await new Promise(((r) => setTimeout(r, 1000)));
 *        yield "baz";
 *      }());
 * ```
 *
 * If the produced iterator (`iterable[Symbol.asyncIterator]()` or
 * `iterable[Symbol.iterator]()`) is a generator, or more specifically is found
 * to have a `.throw()` method on it, that will be called upon
 * `readableStream.cancel()`. This is the case for the second input type above:
 *
 * ```ts
 * import { readableStreamFromIterable } from "./conversion.ts";
 *
 * const r3 = readableStreamFromIterable(async function* () {
 *   try {
 *     yield "foo";
 *   } catch (error) {
 *     console.log(error); // Error: Cancelled by consumer.
 *   }
 * }());
 * const reader = r3.getReader();
 * console.log(await reader.read()); // { value: "foo", done: false }
 * await reader.cancel(new Error("Cancelled by consumer."));
 * ```
 */ export function readableStreamFromIterable(iterable) {
    const iterator = iterable[Symbol.asyncIterator]?.() ?? iterable[Symbol.iterator]?.();
    return new ReadableStream({
        async pull (controller) {
            const { value , done  } = await iterator.next();
            if (done) {
                controller.close();
            } else {
                controller.enqueue(value);
            }
        },
        async cancel (reason) {
            if (typeof iterator.throw == "function") {
                try {
                    await iterator.throw(reason);
                } catch  {}
            }
        }
    });
}
/**
 * Create a `ReadableStream<Uint8Array>` from from a `Deno.Reader`.
 *
 * When the pull algorithm is called on the stream, a chunk from the reader
 * will be read.  When `null` is returned from the reader, the stream will be
 * closed along with the reader (if it is also a `Deno.Closer`).
 *
 * An example converting a `Deno.File` into a readable stream:
 *
 * ```ts
 * import { readableStreamFromReader } from "./mod.ts";
 *
 * const file = await Deno.open("./file.txt", { read: true });
 * const fileStream = readableStreamFromReader(file);
 * ```
 */ export function readableStreamFromReader(reader, options = {}) {
    const { autoClose =true , chunkSize =DEFAULT_CHUNK_SIZE , strategy  } = options;
    return new ReadableStream({
        async pull (controller) {
            const chunk = new Uint8Array(chunkSize);
            try {
                const read = await reader.read(chunk);
                if (read === null) {
                    if (isCloser(reader) && autoClose) {
                        reader.close();
                    }
                    controller.close();
                    return;
                }
                controller.enqueue(chunk.subarray(0, read));
            } catch (e) {
                controller.error(e);
                if (isCloser(reader)) {
                    reader.close();
                }
            }
        },
        cancel () {
            if (isCloser(reader) && autoClose) {
                reader.close();
            }
        }
    }, strategy);
}
/** Read Reader `r` until EOF (`null`) and resolve to the content as
 * Uint8Array`.
 *
 * ```ts
 * import { Buffer } from "../io/buffer.ts";
 * import { readAll } from "./conversion.ts";
 *
 * // Example from stdin
 * const stdinContent = await readAll(Deno.stdin);
 *
 * // Example from file
 * const file = await Deno.open("my_file.txt", {read: true});
 * const myFileContent = await readAll(file);
 * Deno.close(file.rid);
 *
 * // Example from buffer
 * const myData = new Uint8Array(100);
 * // ... fill myData array with data
 * const reader = new Buffer(myData.buffer);
 * const bufferContent = await readAll(reader);
 * ```
 */ export async function readAll(r) {
    const buf = new Buffer();
    await buf.readFrom(r);
    return buf.bytes();
}
/** Synchronously reads Reader `r` until EOF (`null`) and returns the content
 * as `Uint8Array`.
 *
 * ```ts
 * import { Buffer } from "../io/buffer.ts";
 * import { readAllSync } from "./conversion.ts";
 *
 * // Example from stdin
 * const stdinContent = readAllSync(Deno.stdin);
 *
 * // Example from file
 * const file = Deno.openSync("my_file.txt", {read: true});
 * const myFileContent = readAllSync(file);
 * Deno.close(file.rid);
 *
 * // Example from buffer
 * const myData = new Uint8Array(100);
 * // ... fill myData array with data
 * const reader = new Buffer(myData.buffer);
 * const bufferContent = readAllSync(reader);
 * ```
 */ export function readAllSync(r) {
    const buf = new Buffer();
    buf.readFromSync(r);
    return buf.bytes();
}
/** Write all the content of the array buffer (`arr`) to the writer (`w`).
 *
 * ```ts
 * import { Buffer } from "../io/buffer.ts";
 * import { writeAll } from "./conversion.ts";

 * // Example writing to stdout
 * let contentBytes = new TextEncoder().encode("Hello World");
 * await writeAll(Deno.stdout, contentBytes);
 *
 * // Example writing to file
 * contentBytes = new TextEncoder().encode("Hello World");
 * const file = await Deno.open('test.file', {write: true});
 * await writeAll(file, contentBytes);
 * Deno.close(file.rid);
 *
 * // Example writing to buffer
 * contentBytes = new TextEncoder().encode("Hello World");
 * const writer = new Buffer();
 * await writeAll(writer, contentBytes);
 * console.log(writer.bytes().length);  // 11
 * ```
 */ export async function writeAll(w, arr) {
    let nwritten = 0;
    while(nwritten < arr.length){
        nwritten += await w.write(arr.subarray(nwritten));
    }
}
/** Synchronously write all the content of the array buffer (`arr`) to the
 * writer (`w`).
 *
 * ```ts
 * import { Buffer } from "../io/buffer.ts";
 * import { writeAllSync } from "./conversion.ts";
 *
 * // Example writing to stdout
 * let contentBytes = new TextEncoder().encode("Hello World");
 * writeAllSync(Deno.stdout, contentBytes);
 *
 * // Example writing to file
 * contentBytes = new TextEncoder().encode("Hello World");
 * const file = Deno.openSync('test.file', {write: true});
 * writeAllSync(file, contentBytes);
 * Deno.close(file.rid);
 *
 * // Example writing to buffer
 * contentBytes = new TextEncoder().encode("Hello World");
 * const writer = new Buffer();
 * writeAllSync(writer, contentBytes);
 * console.log(writer.bytes().length);  // 11
 * ```
 */ export function writeAllSync(w, arr) {
    let nwritten = 0;
    while(nwritten < arr.length){
        nwritten += w.writeSync(arr.subarray(nwritten));
    }
}
/** Turns a Reader, `r`, into an async iterator.
 *
 * ```ts
 * import { iterateReader } from "./conversion.ts";
 *
 * let f = await Deno.open("/etc/passwd");
 * for await (const chunk of iterateReader(f)) {
 *   console.log(chunk);
 * }
 * f.close();
 * ```
 *
 * Second argument can be used to tune size of a buffer.
 * Default size of the buffer is 32kB.
 *
 * ```ts
 * import { iterateReader } from "./conversion.ts";
 *
 * let f = await Deno.open("/etc/passwd");
 * const it = iterateReader(f, {
 *   bufSize: 1024 * 1024
 * });
 * for await (const chunk of it) {
 *   console.log(chunk);
 * }
 * f.close();
 * ```
 *
 * Iterator uses an internal buffer of fixed size for efficiency; it returns
 * a view on that buffer on each iteration. It is therefore caller's
 * responsibility to copy contents of the buffer if needed; otherwise the
 * next iteration will overwrite contents of previously returned chunk.
 */ export async function* iterateReader(r, options) {
    const bufSize = options?.bufSize ?? DEFAULT_BUFFER_SIZE;
    const b = new Uint8Array(bufSize);
    while(true){
        const result = await r.read(b);
        if (result === null) {
            break;
        }
        yield b.subarray(0, result);
    }
}
/** Turns a ReaderSync, `r`, into an iterator.
 *
 * ```ts
 * import { iterateReaderSync } from "./conversion.ts";
 *
 * let f = Deno.openSync("/etc/passwd");
 * for (const chunk of iterateReaderSync(f)) {
 *   console.log(chunk);
 * }
 * f.close();
 * ```
 *
 * Second argument can be used to tune size of a buffer.
 * Default size of the buffer is 32kB.
 *
 * ```ts
 * import { iterateReaderSync } from "./conversion.ts";

 * let f = await Deno.open("/etc/passwd");
 * const iter = iterateReaderSync(f, {
 *   bufSize: 1024 * 1024
 * });
 * for (const chunk of iter) {
 *   console.log(chunk);
 * }
 * f.close();
 * ```
 *
 * Iterator uses an internal buffer of fixed size for efficiency; it returns
 * a view on that buffer on each iteration. It is therefore caller's
 * responsibility to copy contents of the buffer if needed; otherwise the
 * next iteration will overwrite contents of previously returned chunk.
 */ export function* iterateReaderSync(r, options) {
    const bufSize = options?.bufSize ?? DEFAULT_BUFFER_SIZE;
    const b = new Uint8Array(bufSize);
    while(true){
        const result = r.readSync(b);
        if (result === null) {
            break;
        }
        yield b.subarray(0, result);
    }
}
/** Copies from `src` to `dst` until either EOF (`null`) is read from `src` or
 * an error occurs. It resolves to the number of bytes copied or rejects with
 * the first error encountered while copying.
 *
 * ```ts
 * import { copy } from "./conversion.ts";
 *
 * const source = await Deno.open("my_file.txt");
 * const bytesCopied1 = await copy(source, Deno.stdout);
 * const destination = await Deno.create("my_file_2.txt");
 * const bytesCopied2 = await copy(source, destination);
 * ```
 *
 * @param src The source to copy from
 * @param dst The destination to copy to
 * @param options Can be used to tune size of the buffer. Default size is 32kB
 */ export async function copy(src, dst, options) {
    let n = 0;
    const bufSize = options?.bufSize ?? DEFAULT_BUFFER_SIZE;
    const b = new Uint8Array(bufSize);
    let gotEOF = false;
    while(gotEOF === false){
        const result = await src.read(b);
        if (result === null) {
            gotEOF = true;
        } else {
            let nwritten = 0;
            while(nwritten < result){
                nwritten += await dst.write(b.subarray(nwritten, result));
            }
            n += nwritten;
        }
    }
    return n;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL3N0cmVhbXMvY29udmVyc2lvbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIxIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG5pbXBvcnQgeyBCdWZmZXIgfSBmcm9tIFwiLi4vaW8vYnVmZmVyLnRzXCI7XG5cbmNvbnN0IERFRkFVTFRfQ0hVTktfU0laRSA9IDE2XzY0MDtcbmNvbnN0IERFRkFVTFRfQlVGRkVSX1NJWkUgPSAzMiAqIDEwMjQ7XG5cbmZ1bmN0aW9uIGlzQ2xvc2VyKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgRGVuby5DbG9zZXIge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9IG51bGwgJiYgXCJjbG9zZVwiIGluIHZhbHVlICYmXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICB0eXBlb2YgKHZhbHVlIGFzIFJlY29yZDxzdHJpbmcsIGFueT4pW1wiY2xvc2VcIl0gPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuLyoqIENyZWF0ZSBhIGBEZW5vLlJlYWRlcmAgZnJvbSBhbiBpdGVyYWJsZSBvZiBgVWludDhBcnJheWBzLlxuICpcbiAqIGBgYHRzXG4gKiAgICAgIGltcG9ydCB7IHJlYWRlckZyb21JdGVyYWJsZSB9IGZyb20gXCIuL2NvbnZlcnNpb24udHNcIjtcbiAqICAgICAgaW1wb3J0IHsgc2VydmUgfSBmcm9tIFwiLi4vaHR0cC9zZXJ2ZXJfbGVnYWN5LnRzXCI7XG4gKlxuICogICAgICBmb3IgYXdhaXQgKGNvbnN0IHJlcXVlc3Qgb2Ygc2VydmUoeyBwb3J0OiA4MDAwIH0pKSB7XG4gKiAgICAgICAgLy8gU2VydmVyLXNlbnQgZXZlbnRzOiBTZW5kIHJ1bnRpbWUgbWV0cmljcyB0byB0aGUgY2xpZW50IGV2ZXJ5IHNlY29uZC5cbiAqICAgICAgICByZXF1ZXN0LnJlc3BvbmQoe1xuICogICAgICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnMoeyBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvZXZlbnQtc3RyZWFtXCIgfSksXG4gKiAgICAgICAgICBib2R5OiByZWFkZXJGcm9tSXRlcmFibGUoKGFzeW5jIGZ1bmN0aW9uKiAoKSB7XG4gKiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XG4gKiAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IHNldFRpbWVvdXQociwgMTAwMCkpO1xuICogICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgZGF0YTogJHtKU09OLnN0cmluZ2lmeShEZW5vLm1ldHJpY3MoKSl9XFxuXFxuYDtcbiAqICAgICAgICAgICAgICB5aWVsZCBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUobWVzc2FnZSk7XG4gKiAgICAgICAgICAgIH1cbiAqICAgICAgICAgIH0pKCkpLFxuICogICAgICAgIH0pO1xuICogICAgICB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRlckZyb21JdGVyYWJsZShcbiAgaXRlcmFibGU6IEl0ZXJhYmxlPFVpbnQ4QXJyYXk+IHwgQXN5bmNJdGVyYWJsZTxVaW50OEFycmF5Pixcbik6IERlbm8uUmVhZGVyIHtcbiAgY29uc3QgaXRlcmF0b3I6IEl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHwgQXN5bmNJdGVyYXRvcjxVaW50OEFycmF5PiA9XG4gICAgKGl0ZXJhYmxlIGFzIEFzeW5jSXRlcmFibGU8VWludDhBcnJheT4pW1N5bWJvbC5hc3luY0l0ZXJhdG9yXT8uKCkgPz9cbiAgICAgIChpdGVyYWJsZSBhcyBJdGVyYWJsZTxVaW50OEFycmF5PilbU3ltYm9sLml0ZXJhdG9yXT8uKCk7XG4gIGNvbnN0IGJ1ZmZlciA9IG5ldyBCdWZmZXIoKTtcbiAgcmV0dXJuIHtcbiAgICBhc3luYyByZWFkKHA6IFVpbnQ4QXJyYXkpOiBQcm9taXNlPG51bWJlciB8IG51bGw+IHtcbiAgICAgIGlmIChidWZmZXIubGVuZ3RoID09IDApIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICBpZiAocmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAocmVzdWx0LnZhbHVlLmJ5dGVMZW5ndGggPD0gcC5ieXRlTGVuZ3RoKSB7XG4gICAgICAgICAgICBwLnNldChyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC52YWx1ZS5ieXRlTGVuZ3RoO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwLnNldChyZXN1bHQudmFsdWUuc3ViYXJyYXkoMCwgcC5ieXRlTGVuZ3RoKSk7XG4gICAgICAgICAgYXdhaXQgd3JpdGVBbGwoYnVmZmVyLCByZXN1bHQudmFsdWUuc3ViYXJyYXkocC5ieXRlTGVuZ3RoKSk7XG4gICAgICAgICAgcmV0dXJuIHAuYnl0ZUxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgbiA9IGF3YWl0IGJ1ZmZlci5yZWFkKHApO1xuICAgICAgICBpZiAobiA9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucmVhZChwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbjtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG4vKiogQ3JlYXRlIGEgYFdyaXRlcmAgZnJvbSBhIGBXcml0YWJsZVN0cmVhbURlZmF1bHRXcml0ZXJgLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlckZyb21TdHJlYW1Xcml0ZXIoXG4gIHN0cmVhbVdyaXRlcjogV3JpdGFibGVTdHJlYW1EZWZhdWx0V3JpdGVyPFVpbnQ4QXJyYXk+LFxuKTogRGVuby5Xcml0ZXIge1xuICByZXR1cm4ge1xuICAgIGFzeW5jIHdyaXRlKHA6IFVpbnQ4QXJyYXkpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgYXdhaXQgc3RyZWFtV3JpdGVyLnJlYWR5O1xuICAgICAgYXdhaXQgc3RyZWFtV3JpdGVyLndyaXRlKHApO1xuICAgICAgcmV0dXJuIHAubGVuZ3RoO1xuICAgIH0sXG4gIH07XG59XG5cbi8qKiBDcmVhdGUgYSBgUmVhZGVyYCBmcm9tIGEgYFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcmAuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZGVyRnJvbVN0cmVhbVJlYWRlcihcbiAgc3RyZWFtUmVhZGVyOiBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VWludDhBcnJheT4sXG4pOiBEZW5vLlJlYWRlciB7XG4gIGNvbnN0IGJ1ZmZlciA9IG5ldyBCdWZmZXIoKTtcblxuICByZXR1cm4ge1xuICAgIGFzeW5jIHJlYWQocDogVWludDhBcnJheSk6IFByb21pc2U8bnVtYmVyIHwgbnVsbD4ge1xuICAgICAgaWYgKGJ1ZmZlci5lbXB0eSgpKSB7XG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHN0cmVhbVJlYWRlci5yZWFkKCk7XG4gICAgICAgIGlmIChyZXMuZG9uZSkge1xuICAgICAgICAgIHJldHVybiBudWxsOyAvLyBFT0ZcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHdyaXRlQWxsKGJ1ZmZlciwgcmVzLnZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGJ1ZmZlci5yZWFkKHApO1xuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV3JpdGFibGVTdHJlYW1Gcm9tV3JpdGVyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBJZiB0aGUgYHdyaXRlcmAgaXMgYWxzbyBhIGBEZW5vLkNsb3NlcmAsIGF1dG9tYXRpY2FsbHkgY2xvc2UgdGhlIGB3cml0ZXJgXG4gICAqIHdoZW4gdGhlIHN0cmVhbSBpcyBjbG9zZWQsIGFib3J0ZWQsIG9yIGEgd3JpdGUgZXJyb3Igb2NjdXJzLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgdHJ1ZWAuICovXG4gIGF1dG9DbG9zZT86IGJvb2xlYW47XG59XG5cbi8qKiBDcmVhdGUgYSBgV3JpdGFibGVTdHJlYW1gIGZyb20gYSBgV3JpdGVyYC4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0YWJsZVN0cmVhbUZyb21Xcml0ZXIoXG4gIHdyaXRlcjogRGVuby5Xcml0ZXIsXG4gIG9wdGlvbnM6IFdyaXRhYmxlU3RyZWFtRnJvbVdyaXRlck9wdGlvbnMgPSB7fSxcbik6IFdyaXRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+IHtcbiAgY29uc3QgeyBhdXRvQ2xvc2UgPSB0cnVlIH0gPSBvcHRpb25zO1xuXG4gIHJldHVybiBuZXcgV3JpdGFibGVTdHJlYW0oe1xuICAgIGFzeW5jIHdyaXRlKGNodW5rLCBjb250cm9sbGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB3cml0ZUFsbCh3cml0ZXIsIGNodW5rKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29udHJvbGxlci5lcnJvcihlKTtcbiAgICAgICAgaWYgKGlzQ2xvc2VyKHdyaXRlcikgJiYgYXV0b0Nsb3NlKSB7XG4gICAgICAgICAgd3JpdGVyLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGNsb3NlKCkge1xuICAgICAgaWYgKGlzQ2xvc2VyKHdyaXRlcikgJiYgYXV0b0Nsb3NlKSB7XG4gICAgICAgIHdyaXRlci5jbG9zZSgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgYWJvcnQoKSB7XG4gICAgICBpZiAoaXNDbG9zZXIod3JpdGVyKSAmJiBhdXRvQ2xvc2UpIHtcbiAgICAgICAgd3JpdGVyLmNsb3NlKCk7XG4gICAgICB9XG4gICAgfSxcbiAgfSk7XG59XG5cbi8qKiBDcmVhdGUgYSBgUmVhZGFibGVTdHJlYW1gIGZyb20gYW55IGtpbmQgb2YgaXRlcmFibGUuXG4gKlxuICogYGBgdHNcbiAqICAgICAgaW1wb3J0IHsgcmVhZGFibGVTdHJlYW1Gcm9tSXRlcmFibGUgfSBmcm9tIFwiLi9jb252ZXJzaW9uLnRzXCI7XG4gKlxuICogICAgICBjb25zdCByMSA9IHJlYWRhYmxlU3RyZWFtRnJvbUl0ZXJhYmxlKFtcImZvbywgYmFyLCBiYXpcIl0pO1xuICogICAgICBjb25zdCByMiA9IHJlYWRhYmxlU3RyZWFtRnJvbUl0ZXJhYmxlKGFzeW5jIGZ1bmN0aW9uKiAoKSB7XG4gKiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKChyKSA9PiBzZXRUaW1lb3V0KHIsIDEwMDApKSk7XG4gKiAgICAgICAgeWllbGQgXCJmb29cIjtcbiAqICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgoKHIpID0+IHNldFRpbWVvdXQociwgMTAwMCkpKTtcbiAqICAgICAgICB5aWVsZCBcImJhclwiO1xuICogICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKCgocikgPT4gc2V0VGltZW91dChyLCAxMDAwKSkpO1xuICogICAgICAgIHlpZWxkIFwiYmF6XCI7XG4gKiAgICAgIH0oKSk7XG4gKiBgYGBcbiAqXG4gKiBJZiB0aGUgcHJvZHVjZWQgaXRlcmF0b3IgKGBpdGVyYWJsZVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKWAgb3JcbiAqIGBpdGVyYWJsZVtTeW1ib2wuaXRlcmF0b3JdKClgKSBpcyBhIGdlbmVyYXRvciwgb3IgbW9yZSBzcGVjaWZpY2FsbHkgaXMgZm91bmRcbiAqIHRvIGhhdmUgYSBgLnRocm93KClgIG1ldGhvZCBvbiBpdCwgdGhhdCB3aWxsIGJlIGNhbGxlZCB1cG9uXG4gKiBgcmVhZGFibGVTdHJlYW0uY2FuY2VsKClgLiBUaGlzIGlzIHRoZSBjYXNlIGZvciB0aGUgc2Vjb25kIGlucHV0IHR5cGUgYWJvdmU6XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IHJlYWRhYmxlU3RyZWFtRnJvbUl0ZXJhYmxlIH0gZnJvbSBcIi4vY29udmVyc2lvbi50c1wiO1xuICpcbiAqIGNvbnN0IHIzID0gcmVhZGFibGVTdHJlYW1Gcm9tSXRlcmFibGUoYXN5bmMgZnVuY3Rpb24qICgpIHtcbiAqICAgdHJ5IHtcbiAqICAgICB5aWVsZCBcImZvb1wiO1xuICogICB9IGNhdGNoIChlcnJvcikge1xuICogICAgIGNvbnNvbGUubG9nKGVycm9yKTsgLy8gRXJyb3I6IENhbmNlbGxlZCBieSBjb25zdW1lci5cbiAqICAgfVxuICogfSgpKTtcbiAqIGNvbnN0IHJlYWRlciA9IHIzLmdldFJlYWRlcigpO1xuICogY29uc29sZS5sb2coYXdhaXQgcmVhZGVyLnJlYWQoKSk7IC8vIHsgdmFsdWU6IFwiZm9vXCIsIGRvbmU6IGZhbHNlIH1cbiAqIGF3YWl0IHJlYWRlci5jYW5jZWwobmV3IEVycm9yKFwiQ2FuY2VsbGVkIGJ5IGNvbnN1bWVyLlwiKSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRhYmxlU3RyZWFtRnJvbUl0ZXJhYmxlPFQ+KFxuICBpdGVyYWJsZTogSXRlcmFibGU8VD4gfCBBc3luY0l0ZXJhYmxlPFQ+LFxuKTogUmVhZGFibGVTdHJlYW08VD4ge1xuICBjb25zdCBpdGVyYXRvcjogSXRlcmF0b3I8VD4gfCBBc3luY0l0ZXJhdG9yPFQ+ID1cbiAgICAoaXRlcmFibGUgYXMgQXN5bmNJdGVyYWJsZTxUPilbU3ltYm9sLmFzeW5jSXRlcmF0b3JdPy4oKSA/P1xuICAgICAgKGl0ZXJhYmxlIGFzIEl0ZXJhYmxlPFQ+KVtTeW1ib2wuaXRlcmF0b3JdPy4oKTtcbiAgcmV0dXJuIG5ldyBSZWFkYWJsZVN0cmVhbSh7XG4gICAgYXN5bmMgcHVsbChjb250cm9sbGVyKSB7XG4gICAgICBjb25zdCB7IHZhbHVlLCBkb25lIH0gPSBhd2FpdCBpdGVyYXRvci5uZXh0KCk7XG4gICAgICBpZiAoZG9uZSkge1xuICAgICAgICBjb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb250cm9sbGVyLmVucXVldWUodmFsdWUpO1xuICAgICAgfVxuICAgIH0sXG4gICAgYXN5bmMgY2FuY2VsKHJlYXNvbikge1xuICAgICAgaWYgKHR5cGVvZiBpdGVyYXRvci50aHJvdyA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBpdGVyYXRvci50aHJvdyhyZWFzb24pO1xuICAgICAgICB9IGNhdGNoIHsgLyogYGl0ZXJhdG9yLnRocm93KClgIGFsd2F5cyB0aHJvd3Mgb24gc2l0ZS4gV2UgY2F0Y2ggaXQuICovIH1cbiAgICAgIH1cbiAgICB9LFxuICB9KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWFkYWJsZVN0cmVhbUZyb21SZWFkZXJPcHRpb25zIHtcbiAgLyoqIElmIHRoZSBgcmVhZGVyYCBpcyBhbHNvIGEgYERlbm8uQ2xvc2VyYCwgYXV0b21hdGljYWxseSBjbG9zZSB0aGUgYHJlYWRlcmBcbiAgICogd2hlbiBgRU9GYCBpcyBlbmNvdW50ZXJlZCwgb3IgYSByZWFkIGVycm9yIG9jY3Vycy5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYHRydWVgLiAqL1xuICBhdXRvQ2xvc2U/OiBib29sZWFuO1xuXG4gIC8qKiBUaGUgc2l6ZSBvZiBjaHVua3MgdG8gYWxsb2NhdGUgdG8gcmVhZCwgdGhlIGRlZmF1bHQgaXMgfjE2S2lCLCB3aGljaCBpc1xuICAgKiB0aGUgbWF4aW11bSBzaXplIHRoYXQgRGVubyBvcGVyYXRpb25zIGNhbiBjdXJyZW50bHkgc3VwcG9ydC4gKi9cbiAgY2h1bmtTaXplPzogbnVtYmVyO1xuXG4gIC8qKiBUaGUgcXVldWluZyBzdHJhdGVneSB0byBjcmVhdGUgdGhlIGBSZWFkYWJsZVN0cmVhbWAgd2l0aC4gKi9cbiAgc3RyYXRlZ3k/OiB7IGhpZ2hXYXRlck1hcms/OiBudW1iZXIgfCB1bmRlZmluZWQ7IHNpemU/OiB1bmRlZmluZWQgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT5gIGZyb20gZnJvbSBhIGBEZW5vLlJlYWRlcmAuXG4gKlxuICogV2hlbiB0aGUgcHVsbCBhbGdvcml0aG0gaXMgY2FsbGVkIG9uIHRoZSBzdHJlYW0sIGEgY2h1bmsgZnJvbSB0aGUgcmVhZGVyXG4gKiB3aWxsIGJlIHJlYWQuICBXaGVuIGBudWxsYCBpcyByZXR1cm5lZCBmcm9tIHRoZSByZWFkZXIsIHRoZSBzdHJlYW0gd2lsbCBiZVxuICogY2xvc2VkIGFsb25nIHdpdGggdGhlIHJlYWRlciAoaWYgaXQgaXMgYWxzbyBhIGBEZW5vLkNsb3NlcmApLlxuICpcbiAqIEFuIGV4YW1wbGUgY29udmVydGluZyBhIGBEZW5vLkZpbGVgIGludG8gYSByZWFkYWJsZSBzdHJlYW06XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IHJlYWRhYmxlU3RyZWFtRnJvbVJlYWRlciB9IGZyb20gXCIuL21vZC50c1wiO1xuICpcbiAqIGNvbnN0IGZpbGUgPSBhd2FpdCBEZW5vLm9wZW4oXCIuL2ZpbGUudHh0XCIsIHsgcmVhZDogdHJ1ZSB9KTtcbiAqIGNvbnN0IGZpbGVTdHJlYW0gPSByZWFkYWJsZVN0cmVhbUZyb21SZWFkZXIoZmlsZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRhYmxlU3RyZWFtRnJvbVJlYWRlcihcbiAgcmVhZGVyOiBEZW5vLlJlYWRlciB8IChEZW5vLlJlYWRlciAmIERlbm8uQ2xvc2VyKSxcbiAgb3B0aW9uczogUmVhZGFibGVTdHJlYW1Gcm9tUmVhZGVyT3B0aW9ucyA9IHt9LFxuKTogUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4ge1xuICBjb25zdCB7XG4gICAgYXV0b0Nsb3NlID0gdHJ1ZSxcbiAgICBjaHVua1NpemUgPSBERUZBVUxUX0NIVU5LX1NJWkUsXG4gICAgc3RyYXRlZ3ksXG4gIH0gPSBvcHRpb25zO1xuXG4gIHJldHVybiBuZXcgUmVhZGFibGVTdHJlYW0oe1xuICAgIGFzeW5jIHB1bGwoY29udHJvbGxlcikge1xuICAgICAgY29uc3QgY2h1bmsgPSBuZXcgVWludDhBcnJheShjaHVua1NpemUpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVhZCA9IGF3YWl0IHJlYWRlci5yZWFkKGNodW5rKTtcbiAgICAgICAgaWYgKHJlYWQgPT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoaXNDbG9zZXIocmVhZGVyKSAmJiBhdXRvQ2xvc2UpIHtcbiAgICAgICAgICAgIHJlYWRlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShjaHVuay5zdWJhcnJheSgwLCByZWFkKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnRyb2xsZXIuZXJyb3IoZSk7XG4gICAgICAgIGlmIChpc0Nsb3NlcihyZWFkZXIpKSB7XG4gICAgICAgICAgcmVhZGVyLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGNhbmNlbCgpIHtcbiAgICAgIGlmIChpc0Nsb3NlcihyZWFkZXIpICYmIGF1dG9DbG9zZSkge1xuICAgICAgICByZWFkZXIuY2xvc2UoKTtcbiAgICAgIH1cbiAgICB9LFxuICB9LCBzdHJhdGVneSk7XG59XG5cbi8qKiBSZWFkIFJlYWRlciBgcmAgdW50aWwgRU9GIChgbnVsbGApIGFuZCByZXNvbHZlIHRvIHRoZSBjb250ZW50IGFzXG4gKiBVaW50OEFycmF5YC5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQnVmZmVyIH0gZnJvbSBcIi4uL2lvL2J1ZmZlci50c1wiO1xuICogaW1wb3J0IHsgcmVhZEFsbCB9IGZyb20gXCIuL2NvbnZlcnNpb24udHNcIjtcbiAqXG4gKiAvLyBFeGFtcGxlIGZyb20gc3RkaW5cbiAqIGNvbnN0IHN0ZGluQ29udGVudCA9IGF3YWl0IHJlYWRBbGwoRGVuby5zdGRpbik7XG4gKlxuICogLy8gRXhhbXBsZSBmcm9tIGZpbGVcbiAqIGNvbnN0IGZpbGUgPSBhd2FpdCBEZW5vLm9wZW4oXCJteV9maWxlLnR4dFwiLCB7cmVhZDogdHJ1ZX0pO1xuICogY29uc3QgbXlGaWxlQ29udGVudCA9IGF3YWl0IHJlYWRBbGwoZmlsZSk7XG4gKiBEZW5vLmNsb3NlKGZpbGUucmlkKTtcbiAqXG4gKiAvLyBFeGFtcGxlIGZyb20gYnVmZmVyXG4gKiBjb25zdCBteURhdGEgPSBuZXcgVWludDhBcnJheSgxMDApO1xuICogLy8gLi4uIGZpbGwgbXlEYXRhIGFycmF5IHdpdGggZGF0YVxuICogY29uc3QgcmVhZGVyID0gbmV3IEJ1ZmZlcihteURhdGEuYnVmZmVyKTtcbiAqIGNvbnN0IGJ1ZmZlckNvbnRlbnQgPSBhd2FpdCByZWFkQWxsKHJlYWRlcik7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRBbGwocjogRGVuby5SZWFkZXIpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgY29uc3QgYnVmID0gbmV3IEJ1ZmZlcigpO1xuICBhd2FpdCBidWYucmVhZEZyb20ocik7XG4gIHJldHVybiBidWYuYnl0ZXMoKTtcbn1cblxuLyoqIFN5bmNocm9ub3VzbHkgcmVhZHMgUmVhZGVyIGByYCB1bnRpbCBFT0YgKGBudWxsYCkgYW5kIHJldHVybnMgdGhlIGNvbnRlbnRcbiAqIGFzIGBVaW50OEFycmF5YC5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQnVmZmVyIH0gZnJvbSBcIi4uL2lvL2J1ZmZlci50c1wiO1xuICogaW1wb3J0IHsgcmVhZEFsbFN5bmMgfSBmcm9tIFwiLi9jb252ZXJzaW9uLnRzXCI7XG4gKlxuICogLy8gRXhhbXBsZSBmcm9tIHN0ZGluXG4gKiBjb25zdCBzdGRpbkNvbnRlbnQgPSByZWFkQWxsU3luYyhEZW5vLnN0ZGluKTtcbiAqXG4gKiAvLyBFeGFtcGxlIGZyb20gZmlsZVxuICogY29uc3QgZmlsZSA9IERlbm8ub3BlblN5bmMoXCJteV9maWxlLnR4dFwiLCB7cmVhZDogdHJ1ZX0pO1xuICogY29uc3QgbXlGaWxlQ29udGVudCA9IHJlYWRBbGxTeW5jKGZpbGUpO1xuICogRGVuby5jbG9zZShmaWxlLnJpZCk7XG4gKlxuICogLy8gRXhhbXBsZSBmcm9tIGJ1ZmZlclxuICogY29uc3QgbXlEYXRhID0gbmV3IFVpbnQ4QXJyYXkoMTAwKTtcbiAqIC8vIC4uLiBmaWxsIG15RGF0YSBhcnJheSB3aXRoIGRhdGFcbiAqIGNvbnN0IHJlYWRlciA9IG5ldyBCdWZmZXIobXlEYXRhLmJ1ZmZlcik7XG4gKiBjb25zdCBidWZmZXJDb250ZW50ID0gcmVhZEFsbFN5bmMocmVhZGVyKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFsbFN5bmMocjogRGVuby5SZWFkZXJTeW5jKTogVWludDhBcnJheSB7XG4gIGNvbnN0IGJ1ZiA9IG5ldyBCdWZmZXIoKTtcbiAgYnVmLnJlYWRGcm9tU3luYyhyKTtcbiAgcmV0dXJuIGJ1Zi5ieXRlcygpO1xufVxuXG4vKiogV3JpdGUgYWxsIHRoZSBjb250ZW50IG9mIHRoZSBhcnJheSBidWZmZXIgKGBhcnJgKSB0byB0aGUgd3JpdGVyIChgd2ApLlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBCdWZmZXIgfSBmcm9tIFwiLi4vaW8vYnVmZmVyLnRzXCI7XG4gKiBpbXBvcnQgeyB3cml0ZUFsbCB9IGZyb20gXCIuL2NvbnZlcnNpb24udHNcIjtcblxuICogLy8gRXhhbXBsZSB3cml0aW5nIHRvIHN0ZG91dFxuICogbGV0IGNvbnRlbnRCeXRlcyA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShcIkhlbGxvIFdvcmxkXCIpO1xuICogYXdhaXQgd3JpdGVBbGwoRGVuby5zdGRvdXQsIGNvbnRlbnRCeXRlcyk7XG4gKlxuICogLy8gRXhhbXBsZSB3cml0aW5nIHRvIGZpbGVcbiAqIGNvbnRlbnRCeXRlcyA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShcIkhlbGxvIFdvcmxkXCIpO1xuICogY29uc3QgZmlsZSA9IGF3YWl0IERlbm8ub3BlbigndGVzdC5maWxlJywge3dyaXRlOiB0cnVlfSk7XG4gKiBhd2FpdCB3cml0ZUFsbChmaWxlLCBjb250ZW50Qnl0ZXMpO1xuICogRGVuby5jbG9zZShmaWxlLnJpZCk7XG4gKlxuICogLy8gRXhhbXBsZSB3cml0aW5nIHRvIGJ1ZmZlclxuICogY29udGVudEJ5dGVzID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKFwiSGVsbG8gV29ybGRcIik7XG4gKiBjb25zdCB3cml0ZXIgPSBuZXcgQnVmZmVyKCk7XG4gKiBhd2FpdCB3cml0ZUFsbCh3cml0ZXIsIGNvbnRlbnRCeXRlcyk7XG4gKiBjb25zb2xlLmxvZyh3cml0ZXIuYnl0ZXMoKS5sZW5ndGgpOyAgLy8gMTFcbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGVBbGwodzogRGVuby5Xcml0ZXIsIGFycjogVWludDhBcnJheSkge1xuICBsZXQgbndyaXR0ZW4gPSAwO1xuICB3aGlsZSAobndyaXR0ZW4gPCBhcnIubGVuZ3RoKSB7XG4gICAgbndyaXR0ZW4gKz0gYXdhaXQgdy53cml0ZShhcnIuc3ViYXJyYXkobndyaXR0ZW4pKTtcbiAgfVxufVxuXG4vKiogU3luY2hyb25vdXNseSB3cml0ZSBhbGwgdGhlIGNvbnRlbnQgb2YgdGhlIGFycmF5IGJ1ZmZlciAoYGFycmApIHRvIHRoZVxuICogd3JpdGVyIChgd2ApLlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBCdWZmZXIgfSBmcm9tIFwiLi4vaW8vYnVmZmVyLnRzXCI7XG4gKiBpbXBvcnQgeyB3cml0ZUFsbFN5bmMgfSBmcm9tIFwiLi9jb252ZXJzaW9uLnRzXCI7XG4gKlxuICogLy8gRXhhbXBsZSB3cml0aW5nIHRvIHN0ZG91dFxuICogbGV0IGNvbnRlbnRCeXRlcyA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShcIkhlbGxvIFdvcmxkXCIpO1xuICogd3JpdGVBbGxTeW5jKERlbm8uc3Rkb3V0LCBjb250ZW50Qnl0ZXMpO1xuICpcbiAqIC8vIEV4YW1wbGUgd3JpdGluZyB0byBmaWxlXG4gKiBjb250ZW50Qnl0ZXMgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoXCJIZWxsbyBXb3JsZFwiKTtcbiAqIGNvbnN0IGZpbGUgPSBEZW5vLm9wZW5TeW5jKCd0ZXN0LmZpbGUnLCB7d3JpdGU6IHRydWV9KTtcbiAqIHdyaXRlQWxsU3luYyhmaWxlLCBjb250ZW50Qnl0ZXMpO1xuICogRGVuby5jbG9zZShmaWxlLnJpZCk7XG4gKlxuICogLy8gRXhhbXBsZSB3cml0aW5nIHRvIGJ1ZmZlclxuICogY29udGVudEJ5dGVzID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKFwiSGVsbG8gV29ybGRcIik7XG4gKiBjb25zdCB3cml0ZXIgPSBuZXcgQnVmZmVyKCk7XG4gKiB3cml0ZUFsbFN5bmMod3JpdGVyLCBjb250ZW50Qnl0ZXMpO1xuICogY29uc29sZS5sb2cod3JpdGVyLmJ5dGVzKCkubGVuZ3RoKTsgIC8vIDExXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQWxsU3luYyh3OiBEZW5vLldyaXRlclN5bmMsIGFycjogVWludDhBcnJheSk6IHZvaWQge1xuICBsZXQgbndyaXR0ZW4gPSAwO1xuICB3aGlsZSAobndyaXR0ZW4gPCBhcnIubGVuZ3RoKSB7XG4gICAgbndyaXR0ZW4gKz0gdy53cml0ZVN5bmMoYXJyLnN1YmFycmF5KG53cml0dGVuKSk7XG4gIH1cbn1cblxuLyoqIFR1cm5zIGEgUmVhZGVyLCBgcmAsIGludG8gYW4gYXN5bmMgaXRlcmF0b3IuXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGl0ZXJhdGVSZWFkZXIgfSBmcm9tIFwiLi9jb252ZXJzaW9uLnRzXCI7XG4gKlxuICogbGV0IGYgPSBhd2FpdCBEZW5vLm9wZW4oXCIvZXRjL3Bhc3N3ZFwiKTtcbiAqIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2YgaXRlcmF0ZVJlYWRlcihmKSkge1xuICogICBjb25zb2xlLmxvZyhjaHVuayk7XG4gKiB9XG4gKiBmLmNsb3NlKCk7XG4gKiBgYGBcbiAqXG4gKiBTZWNvbmQgYXJndW1lbnQgY2FuIGJlIHVzZWQgdG8gdHVuZSBzaXplIG9mIGEgYnVmZmVyLlxuICogRGVmYXVsdCBzaXplIG9mIHRoZSBidWZmZXIgaXMgMzJrQi5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgaXRlcmF0ZVJlYWRlciB9IGZyb20gXCIuL2NvbnZlcnNpb24udHNcIjtcbiAqXG4gKiBsZXQgZiA9IGF3YWl0IERlbm8ub3BlbihcIi9ldGMvcGFzc3dkXCIpO1xuICogY29uc3QgaXQgPSBpdGVyYXRlUmVhZGVyKGYsIHtcbiAqICAgYnVmU2l6ZTogMTAyNCAqIDEwMjRcbiAqIH0pO1xuICogZm9yIGF3YWl0IChjb25zdCBjaHVuayBvZiBpdCkge1xuICogICBjb25zb2xlLmxvZyhjaHVuayk7XG4gKiB9XG4gKiBmLmNsb3NlKCk7XG4gKiBgYGBcbiAqXG4gKiBJdGVyYXRvciB1c2VzIGFuIGludGVybmFsIGJ1ZmZlciBvZiBmaXhlZCBzaXplIGZvciBlZmZpY2llbmN5OyBpdCByZXR1cm5zXG4gKiBhIHZpZXcgb24gdGhhdCBidWZmZXIgb24gZWFjaCBpdGVyYXRpb24uIEl0IGlzIHRoZXJlZm9yZSBjYWxsZXInc1xuICogcmVzcG9uc2liaWxpdHkgdG8gY29weSBjb250ZW50cyBvZiB0aGUgYnVmZmVyIGlmIG5lZWRlZDsgb3RoZXJ3aXNlIHRoZVxuICogbmV4dCBpdGVyYXRpb24gd2lsbCBvdmVyd3JpdGUgY29udGVudHMgb2YgcHJldmlvdXNseSByZXR1cm5lZCBjaHVuay5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiBpdGVyYXRlUmVhZGVyKFxuICByOiBEZW5vLlJlYWRlcixcbiAgb3B0aW9ucz86IHtcbiAgICBidWZTaXplPzogbnVtYmVyO1xuICB9LFxuKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgY29uc3QgYnVmU2l6ZSA9IG9wdGlvbnM/LmJ1ZlNpemUgPz8gREVGQVVMVF9CVUZGRVJfU0laRTtcbiAgY29uc3QgYiA9IG5ldyBVaW50OEFycmF5KGJ1ZlNpemUpO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHIucmVhZChiKTtcbiAgICBpZiAocmVzdWx0ID09PSBudWxsKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICB5aWVsZCBiLnN1YmFycmF5KDAsIHJlc3VsdCk7XG4gIH1cbn1cblxuLyoqIFR1cm5zIGEgUmVhZGVyU3luYywgYHJgLCBpbnRvIGFuIGl0ZXJhdG9yLlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBpdGVyYXRlUmVhZGVyU3luYyB9IGZyb20gXCIuL2NvbnZlcnNpb24udHNcIjtcbiAqXG4gKiBsZXQgZiA9IERlbm8ub3BlblN5bmMoXCIvZXRjL3Bhc3N3ZFwiKTtcbiAqIGZvciAoY29uc3QgY2h1bmsgb2YgaXRlcmF0ZVJlYWRlclN5bmMoZikpIHtcbiAqICAgY29uc29sZS5sb2coY2h1bmspO1xuICogfVxuICogZi5jbG9zZSgpO1xuICogYGBgXG4gKlxuICogU2Vjb25kIGFyZ3VtZW50IGNhbiBiZSB1c2VkIHRvIHR1bmUgc2l6ZSBvZiBhIGJ1ZmZlci5cbiAqIERlZmF1bHQgc2l6ZSBvZiB0aGUgYnVmZmVyIGlzIDMya0IuXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGl0ZXJhdGVSZWFkZXJTeW5jIH0gZnJvbSBcIi4vY29udmVyc2lvbi50c1wiO1xuXG4gKiBsZXQgZiA9IGF3YWl0IERlbm8ub3BlbihcIi9ldGMvcGFzc3dkXCIpO1xuICogY29uc3QgaXRlciA9IGl0ZXJhdGVSZWFkZXJTeW5jKGYsIHtcbiAqICAgYnVmU2l6ZTogMTAyNCAqIDEwMjRcbiAqIH0pO1xuICogZm9yIChjb25zdCBjaHVuayBvZiBpdGVyKSB7XG4gKiAgIGNvbnNvbGUubG9nKGNodW5rKTtcbiAqIH1cbiAqIGYuY2xvc2UoKTtcbiAqIGBgYFxuICpcbiAqIEl0ZXJhdG9yIHVzZXMgYW4gaW50ZXJuYWwgYnVmZmVyIG9mIGZpeGVkIHNpemUgZm9yIGVmZmljaWVuY3k7IGl0IHJldHVybnNcbiAqIGEgdmlldyBvbiB0aGF0IGJ1ZmZlciBvbiBlYWNoIGl0ZXJhdGlvbi4gSXQgaXMgdGhlcmVmb3JlIGNhbGxlcidzXG4gKiByZXNwb25zaWJpbGl0eSB0byBjb3B5IGNvbnRlbnRzIG9mIHRoZSBidWZmZXIgaWYgbmVlZGVkOyBvdGhlcndpc2UgdGhlXG4gKiBuZXh0IGl0ZXJhdGlvbiB3aWxsIG92ZXJ3cml0ZSBjb250ZW50cyBvZiBwcmV2aW91c2x5IHJldHVybmVkIGNodW5rLlxuICovXG5leHBvcnQgZnVuY3Rpb24qIGl0ZXJhdGVSZWFkZXJTeW5jKFxuICByOiBEZW5vLlJlYWRlclN5bmMsXG4gIG9wdGlvbnM/OiB7XG4gICAgYnVmU2l6ZT86IG51bWJlcjtcbiAgfSxcbik6IEl0ZXJhYmxlSXRlcmF0b3I8VWludDhBcnJheT4ge1xuICBjb25zdCBidWZTaXplID0gb3B0aW9ucz8uYnVmU2l6ZSA/PyBERUZBVUxUX0JVRkZFUl9TSVpFO1xuICBjb25zdCBiID0gbmV3IFVpbnQ4QXJyYXkoYnVmU2l6ZSk7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gci5yZWFkU3luYyhiKTtcbiAgICBpZiAocmVzdWx0ID09PSBudWxsKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICB5aWVsZCBiLnN1YmFycmF5KDAsIHJlc3VsdCk7XG4gIH1cbn1cblxuLyoqIENvcGllcyBmcm9tIGBzcmNgIHRvIGBkc3RgIHVudGlsIGVpdGhlciBFT0YgKGBudWxsYCkgaXMgcmVhZCBmcm9tIGBzcmNgIG9yXG4gKiBhbiBlcnJvciBvY2N1cnMuIEl0IHJlc29sdmVzIHRvIHRoZSBudW1iZXIgb2YgYnl0ZXMgY29waWVkIG9yIHJlamVjdHMgd2l0aFxuICogdGhlIGZpcnN0IGVycm9yIGVuY291bnRlcmVkIHdoaWxlIGNvcHlpbmcuXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGNvcHkgfSBmcm9tIFwiLi9jb252ZXJzaW9uLnRzXCI7XG4gKlxuICogY29uc3Qgc291cmNlID0gYXdhaXQgRGVuby5vcGVuKFwibXlfZmlsZS50eHRcIik7XG4gKiBjb25zdCBieXRlc0NvcGllZDEgPSBhd2FpdCBjb3B5KHNvdXJjZSwgRGVuby5zdGRvdXQpO1xuICogY29uc3QgZGVzdGluYXRpb24gPSBhd2FpdCBEZW5vLmNyZWF0ZShcIm15X2ZpbGVfMi50eHRcIik7XG4gKiBjb25zdCBieXRlc0NvcGllZDIgPSBhd2FpdCBjb3B5KHNvdXJjZSwgZGVzdGluYXRpb24pO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHNyYyBUaGUgc291cmNlIHRvIGNvcHkgZnJvbVxuICogQHBhcmFtIGRzdCBUaGUgZGVzdGluYXRpb24gdG8gY29weSB0b1xuICogQHBhcmFtIG9wdGlvbnMgQ2FuIGJlIHVzZWQgdG8gdHVuZSBzaXplIG9mIHRoZSBidWZmZXIuIERlZmF1bHQgc2l6ZSBpcyAzMmtCXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb3B5KFxuICBzcmM6IERlbm8uUmVhZGVyLFxuICBkc3Q6IERlbm8uV3JpdGVyLFxuICBvcHRpb25zPzoge1xuICAgIGJ1ZlNpemU/OiBudW1iZXI7XG4gIH0sXG4pOiBQcm9taXNlPG51bWJlcj4ge1xuICBsZXQgbiA9IDA7XG4gIGNvbnN0IGJ1ZlNpemUgPSBvcHRpb25zPy5idWZTaXplID8/IERFRkFVTFRfQlVGRkVSX1NJWkU7XG4gIGNvbnN0IGIgPSBuZXcgVWludDhBcnJheShidWZTaXplKTtcbiAgbGV0IGdvdEVPRiA9IGZhbHNlO1xuICB3aGlsZSAoZ290RU9GID09PSBmYWxzZSkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNyYy5yZWFkKGIpO1xuICAgIGlmIChyZXN1bHQgPT09IG51bGwpIHtcbiAgICAgIGdvdEVPRiA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBud3JpdHRlbiA9IDA7XG4gICAgICB3aGlsZSAobndyaXR0ZW4gPCByZXN1bHQpIHtcbiAgICAgICAgbndyaXR0ZW4gKz0gYXdhaXQgZHN0LndyaXRlKGIuc3ViYXJyYXkobndyaXR0ZW4sIHJlc3VsdCkpO1xuICAgICAgfVxuICAgICAgbiArPSBud3JpdHRlbjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG47XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBRTFFLFNB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