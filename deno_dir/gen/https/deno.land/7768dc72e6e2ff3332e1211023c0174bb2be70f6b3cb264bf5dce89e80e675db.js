// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
import { bytesToUuid } from "./_common.ts";
const UUID_RE = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "i");
export function validate(id) {
    return UUID_RE.test(id);
}
let _nodeId;
let _clockseq;
let _lastMSecs = 0;
let _lastNSecs = 0;
export function generate(options, buf, offset) {
    let i = buf && offset || 0;
    const b = buf || [];
    options = options || {};
    let node = options.node || _nodeId;
    let clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;
    if (node == null || clockseq == null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const seedBytes = options.random || options.rng || crypto.getRandomValues(new Uint8Array(16));
        if (node == null) {
            node = _nodeId = [
                seedBytes[0] | 0x01,
                seedBytes[1],
                seedBytes[2],
                seedBytes[3],
                seedBytes[4],
                seedBytes[5], 
            ];
        }
        if (clockseq == null) {
            clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
        }
    }
    let msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();
    let nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;
    const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000;
    if (dt < 0 && options.clockseq === undefined) {
        clockseq = clockseq + 1 & 0x3fff;
    }
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
        nsecs = 0;
    }
    if (nsecs >= 10000) {
        throw new Error("Can't create more than 10M uuids/sec");
    }
    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;
    msecs += 12219292800000;
    const tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;
    const tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;
    b[i++] = tmh >>> 24 & 0xf | 0x10;
    b[i++] = tmh >>> 16 & 0xff;
    b[i++] = clockseq >>> 8 | 0x80;
    b[i++] = clockseq & 0xff;
    for(let n = 0; n < 6; ++n){
        b[i + n] = node[n];
    }
    return buf ? buf : bytesToUuid(b);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjUxLjAvdXVpZC92MS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIwIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG5pbXBvcnQgeyBieXRlc1RvVXVpZCB9IGZyb20gXCIuL19jb21tb24udHNcIjtcblxuY29uc3QgVVVJRF9SRSA9IG5ldyBSZWdFeHAoXG4gIFwiXlswLTlhLWZdezh9LVswLTlhLWZdezR9LTFbMC05YS1mXXszfS1bODlhYl1bMC05YS1mXXszfS1bMC05YS1mXXsxMn0kXCIsXG4gIFwiaVwiXG4pO1xuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGUoaWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gVVVJRF9SRS50ZXN0KGlkKTtcbn1cblxubGV0IF9ub2RlSWQ6IG51bWJlcltdO1xubGV0IF9jbG9ja3NlcTogbnVtYmVyO1xuXG5sZXQgX2xhc3RNU2VjcyA9IDA7XG5sZXQgX2xhc3ROU2VjcyA9IDA7XG5cbnR5cGUgVjFPcHRpb25zID0ge1xuICBub2RlPzogbnVtYmVyW107XG4gIGNsb2Nrc2VxPzogbnVtYmVyO1xuICBtc2Vjcz86IG51bWJlcjtcbiAgbnNlY3M/OiBudW1iZXI7XG4gIHJhbmRvbT86IG51bWJlcltdO1xuICBybmc/OiAoKSA9PiBudW1iZXJbXTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZShcbiAgb3B0aW9ucz86IFYxT3B0aW9ucyB8IG51bGwsXG4gIGJ1Zj86IG51bWJlcltdLFxuICBvZmZzZXQ/OiBudW1iZXJcbik6IHN0cmluZyB8IG51bWJlcltdIHtcbiAgbGV0IGkgPSAoYnVmICYmIG9mZnNldCkgfHwgMDtcbiAgY29uc3QgYiA9IGJ1ZiB8fCBbXTtcblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgbGV0IG5vZGUgPSBvcHRpb25zLm5vZGUgfHwgX25vZGVJZDtcbiAgbGV0IGNsb2Nrc2VxID0gb3B0aW9ucy5jbG9ja3NlcSAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5jbG9ja3NlcSA6IF9jbG9ja3NlcTtcblxuICBpZiAobm9kZSA9PSBudWxsIHx8IGNsb2Nrc2VxID09IG51bGwpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IHNlZWRCeXRlczogYW55ID1cbiAgICAgIG9wdGlvbnMucmFuZG9tIHx8XG4gICAgICBvcHRpb25zLnJuZyB8fFxuICAgICAgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDhBcnJheSgxNikpO1xuICAgIGlmIChub2RlID09IG51bGwpIHtcbiAgICAgIG5vZGUgPSBfbm9kZUlkID0gW1xuICAgICAgICBzZWVkQnl0ZXNbMF0gfCAweDAxLFxuICAgICAgICBzZWVkQnl0ZXNbMV0sXG4gICAgICAgIHNlZWRCeXRlc1syXSxcbiAgICAgICAgc2VlZEJ5dGVzWzNdLFxuICAgICAgICBzZWVkQnl0ZXNbNF0sXG4gICAgICAgIHNlZWRCeXRlc1s1XSxcbiAgICAgIF07XG4gICAgfVxuICAgIGlmIChjbG9ja3NlcSA9PSBudWxsKSB7XG4gICAgICBjbG9ja3NlcSA9IF9jbG9ja3NlcSA9ICgoc2VlZEJ5dGVzWzZdIDw8IDgpIHwgc2VlZEJ5dGVzWzddKSAmIDB4M2ZmZjtcbiAgICB9XG4gIH1cbiAgbGV0IG1zZWNzID1cbiAgICBvcHRpb25zLm1zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm1zZWNzIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgbGV0IG5zZWNzID0gb3B0aW9ucy5uc2VjcyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5uc2VjcyA6IF9sYXN0TlNlY3MgKyAxO1xuXG4gIGNvbnN0IGR0ID0gbXNlY3MgLSBfbGFzdE1TZWNzICsgKG5zZWNzIC0gX2xhc3ROU2VjcykgLyAxMDAwMDtcblxuICBpZiAoZHQgPCAwICYmIG9wdGlvbnMuY2xvY2tzZXEgPT09IHVuZGVmaW5lZCkge1xuICAgIGNsb2Nrc2VxID0gKGNsb2Nrc2VxICsgMSkgJiAweDNmZmY7XG4gIH1cblxuICBpZiAoKGR0IDwgMCB8fCBtc2VjcyA+IF9sYXN0TVNlY3MpICYmIG9wdGlvbnMubnNlY3MgPT09IHVuZGVmaW5lZCkge1xuICAgIG5zZWNzID0gMDtcbiAgfVxuXG4gIGlmIChuc2VjcyA+PSAxMDAwMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGNyZWF0ZSBtb3JlIHRoYW4gMTBNIHV1aWRzL3NlY1wiKTtcbiAgfVxuXG4gIF9sYXN0TVNlY3MgPSBtc2VjcztcbiAgX2xhc3ROU2VjcyA9IG5zZWNzO1xuICBfY2xvY2tzZXEgPSBjbG9ja3NlcTtcblxuICBtc2VjcyArPSAxMjIxOTI5MjgwMDAwMDtcblxuICBjb25zdCB0bCA9ICgobXNlY3MgJiAweGZmZmZmZmYpICogMTAwMDAgKyBuc2VjcykgJSAweDEwMDAwMDAwMDtcbiAgYltpKytdID0gKHRsID4+PiAyNCkgJiAweGZmO1xuICBiW2krK10gPSAodGwgPj4+IDE2KSAmIDB4ZmY7XG4gIGJbaSsrXSA9ICh0bCA+Pj4gOCkgJiAweGZmO1xuICBiW2krK10gPSB0bCAmIDB4ZmY7XG5cbiAgY29uc3QgdG1oID0gKChtc2VjcyAvIDB4MTAwMDAwMDAwKSAqIDEwMDAwKSAmIDB4ZmZmZmZmZjtcbiAgYltpKytdID0gKHRtaCA+Pj4gOCkgJiAweGZmO1xuICBiW2krK10gPSB0bWggJiAweGZmO1xuXG4gIGJbaSsrXSA9ICgodG1oID4+PiAyNCkgJiAweGYpIHwgMHgxMDtcbiAgYltpKytdID0gKHRtaCA+Pj4gMTYpICYgMHhmZjtcblxuICBiW2krK10gPSAoY2xvY2tzZXEgPj4+IDgpIHwgMHg4MDtcblxuICBiW2krK10gPSBjbG9ja3NlcSAmIDB4ZmY7XG5cbiAgZm9yIChsZXQgbiA9IDA7IG4gPCA2OyArK24pIHtcbiAgICBiW2kgKyBuXSA9IG5vZGVbbl07XG4gIH1cblxuICByZXR1cm4gYnVmID8gYnVmIDogYnl0ZXNUb1V1aWQoYik7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBRTFFLFNBQVMsV0FBVyxRQUFRLGNBQWMsQ0FBQztBQUUzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FDeEIsdUVBQXVFLEVBQ3ZFLEdBQUcsQ0FDSixBQUFDO0FBRUYsT0FBTyxTQUFTLFFBQVEsQ0FBQyxFQUFVLEVBQVc7SUFDNUMsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3pCO0FBRUQsSUFBSSxPQUFPLEFBQVUsQUFBQztBQUN0QixJQUFJLFNBQVMsQUFBUSxBQUFDO0FBRXRCLElBQUksVUFBVSxHQUFHLENBQUMsQUFBQztBQUNuQixJQUFJLFVBQVUsR0FBRyxDQUFDLEFBQUM7QUFXbkIsT0FBTyxTQUFTLFFBQVEsQ0FDdEIsT0FBMEIsRUFDMUIsR0FBYyxFQUNkLE1BQWUsRUFDSTtJQUNuQixJQUFJLENBQUMsR0FBRyxBQUFDLEdBQUcsSUFBSSxNQUFNLElBQUssQ0FBQyxBQUFDO0lBQzdCLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxFQUFFLEFBQUM7SUFFcEIsT0FBTyxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7SUFDeEIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLEFBQUM7SUFDbkMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsS0FBSyxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsR0FBRyxTQUFTLEFBQUM7SUFFN0UsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7UUFDcEMsOERBQThEO1FBQzlELE1BQU0sU0FBUyxHQUNiLE9BQU8sQ0FBQyxNQUFNLElBQ2QsT0FBTyxDQUFDLEdBQUcsSUFDWCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEFBQUM7UUFDN0MsSUFBSSxJQUFJ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