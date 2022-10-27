// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
/**
 * A module to print ANSI terminal colors. Inspired by chalk, kleur, and colors
 * on npm.
 *
 * ```
 * import { bgBlue, red, bold } from "https://deno.land/std/fmt/colors.ts";
 * console.log(bgBlue(red(bold("Hello world!"))));
 * ```
 *
 * This module supports `NO_COLOR` environmental variable disabling any coloring
 * if `NO_COLOR` is set.
 */ const { noColor  } = Deno;
let enabled = !noColor;
export function setColorEnabled(value) {
    if (noColor) {
        return;
    }
    enabled = value;
}
export function getColorEnabled() {
    return enabled;
}
function code(open, close) {
    return {
        open: `\x1b[${open.join(";")}m`,
        close: `\x1b[${close}m`,
        regexp: new RegExp(`\\x1b\\[${close}m`, "g")
    };
}
function run(str, code) {
    return enabled ? `${code.open}${str.replace(code.regexp, code.open)}${code.close}` : str;
}
export function reset(str) {
    return run(str, code([
        0
    ], 0));
}
export function bold(str) {
    return run(str, code([
        1
    ], 22));
}
export function dim(str) {
    return run(str, code([
        2
    ], 22));
}
export function italic(str) {
    return run(str, code([
        3
    ], 23));
}
export function underline(str) {
    return run(str, code([
        4
    ], 24));
}
export function inverse(str) {
    return run(str, code([
        7
    ], 27));
}
export function hidden(str) {
    return run(str, code([
        8
    ], 28));
}
export function strikethrough(str) {
    return run(str, code([
        9
    ], 29));
}
export function black(str) {
    return run(str, code([
        30
    ], 39));
}
export function red(str) {
    return run(str, code([
        31
    ], 39));
}
export function green(str) {
    return run(str, code([
        32
    ], 39));
}
export function yellow(str) {
    return run(str, code([
        33
    ], 39));
}
export function blue(str) {
    return run(str, code([
        34
    ], 39));
}
export function magenta(str) {
    return run(str, code([
        35
    ], 39));
}
export function cyan(str) {
    return run(str, code([
        36
    ], 39));
}
export function white(str) {
    return run(str, code([
        37
    ], 39));
}
export function gray(str) {
    return run(str, code([
        90
    ], 39));
}
export function bgBlack(str) {
    return run(str, code([
        40
    ], 49));
}
export function bgRed(str) {
    return run(str, code([
        41
    ], 49));
}
export function bgGreen(str) {
    return run(str, code([
        42
    ], 49));
}
export function bgYellow(str) {
    return run(str, code([
        43
    ], 49));
}
export function bgBlue(str) {
    return run(str, code([
        44
    ], 49));
}
export function bgMagenta(str) {
    return run(str, code([
        45
    ], 49));
}
export function bgCyan(str) {
    return run(str, code([
        46
    ], 49));
}
export function bgWhite(str) {
    return run(str, code([
        47
    ], 49));
}
/* Special Color Sequences */ function clampAndTruncate(n, max = 255, min = 0) {
    return Math.trunc(Math.max(Math.min(n, max), min));
}
/** Set text color using paletted 8bit colors.
 * https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit */ export function rgb8(str, color) {
    return run(str, code([
        38,
        5,
        clampAndTruncate(color)
    ], 39));
}
/** Set background color using paletted 8bit colors.
 * https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit */ export function bgRgb8(str, color) {
    return run(str, code([
        48,
        5,
        clampAndTruncate(color)
    ], 49));
}
/** Set text color using 24bit rgb. */ export function rgb24(str, color) {
    return run(str, code([
        38,
        2,
        clampAndTruncate(color.r),
        clampAndTruncate(color.g),
        clampAndTruncate(color.b)
    ], 39));
}
/** Set background color using 24bit rgb. */ export function bgRgb24(str, color) {
    return run(str, code([
        48,
        2,
        clampAndTruncate(color.r),
        clampAndTruncate(color.g),
        clampAndTruncate(color.b)
    ], 49));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjUxLjAvZm10L2NvbG9ycy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIwIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLyoqXG4gKiBBIG1vZHVsZSB0byBwcmludCBBTlNJIHRlcm1pbmFsIGNvbG9ycy4gSW5zcGlyZWQgYnkgY2hhbGssIGtsZXVyLCBhbmQgY29sb3JzXG4gKiBvbiBucG0uXG4gKlxuICogYGBgXG4gKiBpbXBvcnQgeyBiZ0JsdWUsIHJlZCwgYm9sZCB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGQvZm10L2NvbG9ycy50c1wiO1xuICogY29uc29sZS5sb2coYmdCbHVlKHJlZChib2xkKFwiSGVsbG8gd29ybGQhXCIpKSkpO1xuICogYGBgXG4gKlxuICogVGhpcyBtb2R1bGUgc3VwcG9ydHMgYE5PX0NPTE9SYCBlbnZpcm9ubWVudGFsIHZhcmlhYmxlIGRpc2FibGluZyBhbnkgY29sb3JpbmdcbiAqIGlmIGBOT19DT0xPUmAgaXMgc2V0LlxuICovXG5jb25zdCB7IG5vQ29sb3IgfSA9IERlbm87XG5cbmludGVyZmFjZSBDb2RlIHtcbiAgb3Blbjogc3RyaW5nO1xuICBjbG9zZTogc3RyaW5nO1xuICByZWdleHA6IFJlZ0V4cDtcbn1cblxuLyoqIFJHQiA4LWJpdHMgcGVyIGNoYW5uZWwuIEVhY2ggaW4gcmFuZ2UgYDAtPjI1NWAgb3IgYDB4MDAtPjB4ZmZgICovXG5pbnRlcmZhY2UgUmdiIHtcbiAgcjogbnVtYmVyO1xuICBnOiBudW1iZXI7XG4gIGI6IG51bWJlcjtcbn1cblxubGV0IGVuYWJsZWQgPSAhbm9Db2xvcjtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldENvbG9yRW5hYmxlZCh2YWx1ZTogYm9vbGVhbik6IHZvaWQge1xuICBpZiAobm9Db2xvcikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGVuYWJsZWQgPSB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbG9yRW5hYmxlZCgpOiBib29sZWFuIHtcbiAgcmV0dXJuIGVuYWJsZWQ7XG59XG5cbmZ1bmN0aW9uIGNvZGUob3BlbjogbnVtYmVyW10sIGNsb3NlOiBudW1iZXIpOiBDb2RlIHtcbiAgcmV0dXJuIHtcbiAgICBvcGVuOiBgXFx4MWJbJHtvcGVuLmpvaW4oXCI7XCIpfW1gLFxuICAgIGNsb3NlOiBgXFx4MWJbJHtjbG9zZX1tYCxcbiAgICByZWdleHA6IG5ldyBSZWdFeHAoYFxcXFx4MWJcXFxcWyR7Y2xvc2V9bWAsIFwiZ1wiKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcnVuKHN0cjogc3RyaW5nLCBjb2RlOiBDb2RlKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVuYWJsZWRcbiAgICA/IGAke2NvZGUub3Blbn0ke3N0ci5yZXBsYWNlKGNvZGUucmVnZXhwLCBjb2RlLm9wZW4pfSR7Y29kZS5jbG9zZX1gXG4gICAgOiBzdHI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNldChzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFswXSwgMCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYm9sZChzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFsxXSwgMjIpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRpbShzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFsyXSwgMjIpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGl0YWxpYyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFszXSwgMjMpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVuZGVybGluZShzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFs0XSwgMjQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGludmVyc2Uoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcnVuKHN0ciwgY29kZShbN10sIDI3KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoaWRkZW4oc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcnVuKHN0ciwgY29kZShbOF0sIDI4KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpa2V0aHJvdWdoKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJ1bihzdHIsIGNvZGUoWzldLCAyOSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmxhY2soc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcnVuKHN0ciwgY29kZShbMzBdLCAzOSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVkKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJ1bihzdHIsIGNvZGUoWzMxXSwgMzkpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdyZWVuKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJ1bihzdHIsIGNvZGUoWzMyXSwgMzkpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHllbGxvdyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFszM10sIDM5KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBibHVlKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJ1bihzdHIsIGNvZGUoWzM0XSwgMzkpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hZ2VudGEoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcnVuKHN0ciwgY29kZShbMzVdLCAzOSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3lhbihzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFszNl0sIDM5KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aGl0ZShzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFszN10sIDM5KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBncmF5KHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJ1bihzdHIsIGNvZGUoWzkwXSwgMzkpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJnQmxhY2soc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcnVuKHN0ciwgY29kZShbNDBdLCA0OSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmdSZWQoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcnVuKHN0ciwgY29kZShbNDFdLCA0OSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmdHcmVlbihzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFs0Ml0sIDQ5KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiZ1llbGxvdyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFs0M10sIDQ5KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiZ0JsdWUoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcnVuKHN0ciwgY29kZShbNDRdLCA0OSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmdNYWdlbnRhKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJ1bihzdHIsIGNvZGUoWzQ1XSwgNDkpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJnQ3lhbihzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFs0Nl0sIDQ5KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiZ1doaXRlKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJ1bihzdHIsIGNvZGUoWzQ3XSwgNDkpKTtcbn1cblxuLyogU3BlY2lhbCBDb2xvciBTZXF1ZW5jZXMgKi9cblxuZnVuY3Rpb24gY2xhbXBBbmRUcnVuY2F0ZShuOiBudW1iZXIsIG1heCA9IDI1NSwgbWluID0gMCk6IG51bWJlciB7XG4gIHJldHVybiBNYXRoLnRydW5jKE1hdGgubWF4KE1hdGgubWluKG4sIG1heCksIG1pbikpO1xufVxuXG4vKiogU2V0IHRleHQgY29sb3IgdXNpbmcgcGFsZXR0ZWQgOGJpdCBjb2xvcnMuXG4gKiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlIzgtYml0ICovXG5leHBvcnQgZnVuY3Rpb24gcmdiOChzdHI6IHN0cmluZywgY29sb3I6IG51bWJlcik6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFszOCwgNSwgY2xhbXBBbmRUcnVuY2F0ZShjb2xvcildLCAzOSkpO1xufVxuXG4vKiogU2V0IGJhY2tncm91bmQgY29sb3IgdXNpbmcgcGFsZXR0ZWQgOGJpdCBjb2xvcnMuXG4gKiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlIzgtYml0ICovXG5leHBvcnQgZnVuY3Rpb24gYmdSZ2I4KHN0cjogc3RyaW5nLCBjb2xvcjogbnVtYmVyKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJ1bihzdHIsIGNvZGUoWzQ4LCA1LCBjbGFtcEFuZFRydW5jYXRlKGNvbG9yKV0sIDQ5KSk7XG59XG5cbi8qKiBTZXQgdGV4dCBjb2xvciB1c2luZyAyNGJpdCByZ2IuICovXG5leHBvcnQgZnVuY3Rpb24gcmdiMjQoc3RyOiBzdHJpbmcsIGNvbG9yOiBSZ2IpOiBzdHJpbmcge1xuICByZXR1cm4gcnVuKFxuICAgIHN0cixcbiAgICBjb2RlKFxuICAgICAgW1xuICAgICAgICAzOCxcbiAgICAgICAgMixcbiAgICAgICAgY2xhbXBBbmRUcnVuY2F0ZShjb2xvci5yKSxcbiAgICAgICAgY2xhbXBBbmRUcnVuY2F0ZShjb2xvci5nKSxcbiAgICAgICAgY2xhbXBBbmRUcnVuY2F0ZShjb2xvci5iKSxcbiAgICAgIF0sXG4gICAgICAzOVxuICAgIClcbiAgKTtcbn1cblxuLyoqIFNldCBiYWNrZ3JvdW5kIGNvbG9yIHVzaW5nIDI0Yml0IHJnYi4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiZ1JnYjI0KHN0cjogc3RyaW5nLCBjb2xvcjogUmdiKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJ1bihcbiAgICBzdHIsXG4gICAgY29kZShcbiAgICAgIFtcbiAgICAgICAgNDgsXG4gICAgICAgIDIsXG4gICAgICAgIGNsYW1wQW5kVHJ1bmNhdGUoY29sb3IuciksXG4gICAgICAgIGNsYW1wQW5kVHJ1bmNhdGUoY29sb3IuZyksXG4gICAgICAgIGNsYW1wQW5kVHJ1bmNhdGUoY29sb3IuYiksXG4gICAgICBdLFxuICAgICAgNDlcbiAgICApXG4gICk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFOzs7Ozs7Ozs7OztDQVdDLEdBQ0QsTUFBTSxFQUFFLFFBQU8sRUFBRSxHQUFHO0FBZXBCLElBQUksVUFBVSxDQUFDO0FBRWYsT0FBTyxTQUFTLGdCQUFnQixLQUFjLEVBQVE7SUFDcEQsSUFBSSxTQUFTO1FBQ1g7SUFDRixDQUFDO0lBRUQsVUFBVTtBQUNaLENBQUM7QUFFRCxPQUFPLFNBQVMsa0JBQTJCO0lBQ3pDLE9BQU87QUFDVCxDQUFDO0FBRUQsU0FBUyxLQUFLLElBQWMsRUFBRSxLQUFhLEVBQVE7SUFDakQsT0FBTztRQUNMLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN2QixRQUFRLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFO0lBQzFDO0FBQ0Y7QUFFQSxTQUFTLElBQUksR0FBVyxFQUFFLElBQVUsRUFBVTtJQUM1QyxPQUFPLFVBQ0gsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLEVBQUUsSUFBSSxPQUFPLENBQUMsS0FBSyxNQUFNLEVBQUUsS0FBSyxJQUFJLEVBQUUsRUFBRSxL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