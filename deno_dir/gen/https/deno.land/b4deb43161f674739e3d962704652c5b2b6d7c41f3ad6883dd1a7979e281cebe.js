// Copyright the Browserify authors. MIT License.
// Ported from https://github.com/browserify/path-browserify/
// This module is browser compatible.
import { CHAR_BACKWARD_SLASH, CHAR_DOT, CHAR_FORWARD_SLASH, CHAR_LOWERCASE_A, CHAR_LOWERCASE_Z, CHAR_UPPERCASE_A, CHAR_UPPERCASE_Z } from "./_constants.ts";
export function assertPath(path) {
    if (typeof path !== "string") {
        throw new TypeError(`Path must be a string. Received ${JSON.stringify(path)}`);
    }
}
export function isPosixPathSeparator(code) {
    return code === CHAR_FORWARD_SLASH;
}
export function isPathSeparator(code) {
    return isPosixPathSeparator(code) || code === CHAR_BACKWARD_SLASH;
}
export function isWindowsDeviceRoot(code) {
    return code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z || code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z;
}
// Resolves . and .. elements in a path with directory names
export function normalizeString(path, allowAboveRoot, separator, isPathSeparator) {
    let res = "";
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let code;
    for(let i = 0, len = path.length; i <= len; ++i){
        if (i < len) code = path.charCodeAt(i);
        else if (isPathSeparator(code)) break;
        else code = CHAR_FORWARD_SLASH;
        if (isPathSeparator(code)) {
            if (lastSlash === i - 1 || dots === 1) {
            // NOOP
            } else if (lastSlash !== i - 1 && dots === 2) {
                if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf(separator);
                        if (lastSlashIndex === -1) {
                            res = "";
                            lastSegmentLength = 0;
                        } else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    } else if (res.length === 2 || res.length === 1) {
                        res = "";
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    if (res.length > 0) res += `${separator}..`;
                    else res = "..";
                    lastSegmentLength = 2;
                }
            } else {
                if (res.length > 0) res += separator + path.slice(lastSlash + 1, i);
                else res = path.slice(lastSlash + 1, i);
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        } else if (code === CHAR_DOT && dots !== -1) {
            ++dots;
        } else {
            dots = -1;
        }
    }
    return res;
}
export function _format(sep, pathObject) {
    const dir = pathObject.dir || pathObject.root;
    const base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
    if (!dir) return base;
    if (dir === pathObject.root) return dir + base;
    return dir + sep + base;
}
const WHITESPACE_ENCODINGS = {
    "\u0009": "%09",
    "\u000A": "%0A",
    "\u000B": "%0B",
    "\u000C": "%0C",
    "\u000D": "%0D",
    "\u0020": "%20"
};
export function encodeWhitespace(string) {
    return string.replaceAll(/[\s]/g, (c)=>{
        return WHITESPACE_ENCODINGS[c] ?? c;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL3BhdGgvX3V0aWwudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IHRoZSBCcm93c2VyaWZ5IGF1dGhvcnMuIE1JVCBMaWNlbnNlLlxuLy8gUG9ydGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Jyb3dzZXJpZnkvcGF0aC1icm93c2VyaWZ5L1xuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgdHlwZSB7IEZvcm1hdElucHV0UGF0aE9iamVjdCB9IGZyb20gXCIuL19pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7XG4gIENIQVJfQkFDS1dBUkRfU0xBU0gsXG4gIENIQVJfRE9ULFxuICBDSEFSX0ZPUldBUkRfU0xBU0gsXG4gIENIQVJfTE9XRVJDQVNFX0EsXG4gIENIQVJfTE9XRVJDQVNFX1osXG4gIENIQVJfVVBQRVJDQVNFX0EsXG4gIENIQVJfVVBQRVJDQVNFX1osXG59IGZyb20gXCIuL19jb25zdGFudHMudHNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFBhdGgocGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICh0eXBlb2YgcGF0aCAhPT0gXCJzdHJpbmdcIikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICBgUGF0aCBtdXN0IGJlIGEgc3RyaW5nLiBSZWNlaXZlZCAke0pTT04uc3RyaW5naWZ5KHBhdGgpfWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNQb3NpeFBhdGhTZXBhcmF0b3IoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb2RlID09PSBDSEFSX0ZPUldBUkRfU0xBU0g7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1BhdGhTZXBhcmF0b3IoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBpc1Bvc2l4UGF0aFNlcGFyYXRvcihjb2RlKSB8fCBjb2RlID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXaW5kb3dzRGV2aWNlUm9vdChjb2RlOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICAoY29kZSA+PSBDSEFSX0xPV0VSQ0FTRV9BICYmIGNvZGUgPD0gQ0hBUl9MT1dFUkNBU0VfWikgfHxcbiAgICAoY29kZSA+PSBDSEFSX1VQUEVSQ0FTRV9BICYmIGNvZGUgPD0gQ0hBUl9VUFBFUkNBU0VfWilcbiAgKTtcbn1cblxuLy8gUmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIHdpdGggZGlyZWN0b3J5IG5hbWVzXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU3RyaW5nKFxuICBwYXRoOiBzdHJpbmcsXG4gIGFsbG93QWJvdmVSb290OiBib29sZWFuLFxuICBzZXBhcmF0b3I6IHN0cmluZyxcbiAgaXNQYXRoU2VwYXJhdG9yOiAoY29kZTogbnVtYmVyKSA9PiBib29sZWFuLFxuKTogc3RyaW5nIHtcbiAgbGV0IHJlcyA9IFwiXCI7XG4gIGxldCBsYXN0U2VnbWVudExlbmd0aCA9IDA7XG4gIGxldCBsYXN0U2xhc2ggPSAtMTtcbiAgbGV0IGRvdHMgPSAwO1xuICBsZXQgY29kZTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBmb3IgKGxldCBpID0gMCwgbGVuID0gcGF0aC5sZW5ndGg7IGkgPD0gbGVuOyArK2kpIHtcbiAgICBpZiAoaSA8IGxlbikgY29kZSA9IHBhdGguY2hhckNvZGVBdChpKTtcbiAgICBlbHNlIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSEpKSBicmVhaztcbiAgICBlbHNlIGNvZGUgPSBDSEFSX0ZPUldBUkRfU0xBU0g7XG5cbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUhKSkge1xuICAgICAgaWYgKGxhc3RTbGFzaCA9PT0gaSAtIDEgfHwgZG90cyA9PT0gMSkge1xuICAgICAgICAvLyBOT09QXG4gICAgICB9IGVsc2UgaWYgKGxhc3RTbGFzaCAhPT0gaSAtIDEgJiYgZG90cyA9PT0gMikge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgcmVzLmxlbmd0aCA8IDIgfHxcbiAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCAhPT0gMiB8fFxuICAgICAgICAgIHJlcy5jaGFyQ29kZUF0KHJlcy5sZW5ndGggLSAxKSAhPT0gQ0hBUl9ET1QgfHxcbiAgICAgICAgICByZXMuY2hhckNvZGVBdChyZXMubGVuZ3RoIC0gMikgIT09IENIQVJfRE9UXG4gICAgICAgICkge1xuICAgICAgICAgIGlmIChyZXMubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgY29uc3QgbGFzdFNsYXNoSW5kZXggPSByZXMubGFzdEluZGV4T2Yoc2VwYXJhdG9yKTtcbiAgICAgICAgICAgIGlmIChsYXN0U2xhc2hJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgcmVzID0gXCJcIjtcbiAgICAgICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzID0gcmVzLnNsaWNlKDAsIGxhc3RTbGFzaEluZGV4KTtcbiAgICAgICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSByZXMubGVuZ3RoIC0gMSAtIHJlcy5sYXN0SW5kZXhPZihzZXBhcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGFzdFNsYXNoID0gaTtcbiAgICAgICAgICAgIGRvdHMgPSAwO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChyZXMubGVuZ3RoID09PSAyIHx8IHJlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHJlcyA9IFwiXCI7XG4gICAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IDA7XG4gICAgICAgICAgICBsYXN0U2xhc2ggPSBpO1xuICAgICAgICAgICAgZG90cyA9IDA7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgICAgICAgaWYgKHJlcy5sZW5ndGggPiAwKSByZXMgKz0gYCR7c2VwYXJhdG9yfS4uYDtcbiAgICAgICAgICBlbHNlIHJlcyA9IFwiLi5cIjtcbiAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IDI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChyZXMubGVuZ3RoID4gMCkgcmVzICs9IHNlcGFyYXRvciArIHBhdGguc2xpY2UobGFzdFNsYXNoICsgMSwgaSk7XG4gICAgICAgIGVsc2UgcmVzID0gcGF0aC5zbGljZShsYXN0U2xhc2ggKyAxLCBpKTtcbiAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSBpIC0gbGFzdFNsYXNoIC0gMTtcbiAgICAgIH1cbiAgICAgIGxhc3RTbGFzaCA9IGk7XG4gICAgICBkb3RzID0gMDtcbiAgICB9IGVsc2UgaWYgKGNvZGUgPT09IENIQVJfRE9UICYmIGRvdHMgIT09IC0xKSB7XG4gICAgICArK2RvdHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRvdHMgPSAtMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9mb3JtYXQoXG4gIHNlcDogc3RyaW5nLFxuICBwYXRoT2JqZWN0OiBGb3JtYXRJbnB1dFBhdGhPYmplY3QsXG4pOiBzdHJpbmcge1xuICBjb25zdCBkaXI6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHBhdGhPYmplY3QuZGlyIHx8IHBhdGhPYmplY3Qucm9vdDtcbiAgY29uc3QgYmFzZTogc3RyaW5nID0gcGF0aE9iamVjdC5iYXNlIHx8XG4gICAgKHBhdGhPYmplY3QubmFtZSB8fCBcIlwiKSArIChwYXRoT2JqZWN0LmV4dCB8fCBcIlwiKTtcbiAgaWYgKCFkaXIpIHJldHVybiBiYXNlO1xuICBpZiAoZGlyID09PSBwYXRoT2JqZWN0LnJvb3QpIHJldHVybiBkaXIgKyBiYXNlO1xuICByZXR1cm4gZGlyICsgc2VwICsgYmFzZTtcbn1cblxuY29uc3QgV0hJVEVTUEFDRV9FTkNPRElOR1M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFwiXFx1MDAwOVwiOiBcIiUwOVwiLFxuICBcIlxcdTAwMEFcIjogXCIlMEFcIixcbiAgXCJcXHUwMDBCXCI6IFwiJTBCXCIsXG4gIFwiXFx1MDAwQ1wiOiBcIiUwQ1wiLFxuICBcIlxcdTAwMERcIjogXCIlMERcIixcbiAgXCJcXHUwMDIwXCI6IFwiJTIwXCIsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlV2hpdGVzcGFjZShzdHJpbmc6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZUFsbCgvW1xcc10vZywgKGMpID0+IHtcbiAgICByZXR1cm4gV0hJVEVTUEFDRV9FTkNPRElOR1NbY10gPz8gYztcbiAgfSk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsaURBQWlEO0FBQ2pELDZEQUE2RDtBQUM3RCxxQ0FBcUM7QUFHckMsU0FDRSxtQkFBbUIsRUFDbkIsUUFBUSxFQUNSLGtCQUFrQixFQUNsQixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQixnQkFBZ0IsUUFDWCxrQkFBa0I7QUFFekIsT0FBTyxTQUFTLFdBQVcsSUFBWSxFQUFRO0lBQzdDLElBQUksT0FBTyxTQUFTLFVBQVU7UUFDNUIsTUFBTSxJQUFJLFVBQ1IsQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFDekQ7SUFDSixDQUFDO0FBQ0gsQ0FBQztBQUVELE9BQU8sU0FBUyxxQkFBcUIsSUFBWSxFQUFXO0lBQzFELE9BQU8sU0FBUztBQUNsQixDQUFDO0FBRUQsT0FBTyxTQUFTLGdCQUFnQixJQUFZLEVBQVc7SUFDckQsT0FBTyxxQkFBcUIsU0FBUyxTQUFTO0FBQ2hELENBQUM7QUFFRCxPQUFPLFNBQVMsb0JBQW9CLElBQVksRUFBVztJQUN6RCxPQUNFLEFBQUMsUUFBUSxvQkFBb0IsUUFBUSxvQkFDcEMsUUFBUSxv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