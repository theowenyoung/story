import { CHAR_UPPERCASE_A, CHAR_LOWERCASE_A, CHAR_UPPERCASE_Z, CHAR_LOWERCASE_Z, CHAR_DOT, CHAR_FORWARD_SLASH, CHAR_BACKWARD_SLASH, } from "./_constants.ts";
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
    return ((code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z) ||
        (code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z));
}
export function normalizeString(path, allowAboveRoot, separator, isPathSeparator) {
    let res = "";
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let code;
    for (let i = 0, len = path.length; i <= len; ++i) {
        if (i < len)
            code = path.charCodeAt(i);
        else if (isPathSeparator(code))
            break;
        else
            code = CHAR_FORWARD_SLASH;
        if (isPathSeparator(code)) {
            if (lastSlash === i - 1 || dots === 1) {
            }
            else if (lastSlash !== i - 1 && dots === 2) {
                if (res.length < 2 ||
                    lastSegmentLength !== 2 ||
                    res.charCodeAt(res.length - 1) !== CHAR_DOT ||
                    res.charCodeAt(res.length - 2) !== CHAR_DOT) {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf(separator);
                        if (lastSlashIndex === -1) {
                            res = "";
                            lastSegmentLength = 0;
                        }
                        else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                    else if (res.length === 2 || res.length === 1) {
                        res = "";
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    if (res.length > 0)
                        res += `${separator}..`;
                    else
                        res = "..";
                    lastSegmentLength = 2;
                }
            }
            else {
                if (res.length > 0)
                    res += separator + path.slice(lastSlash + 1, i);
                else
                    res = path.slice(lastSlash + 1, i);
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        }
        else if (code === CHAR_DOT && dots !== -1) {
            ++dots;
        }
        else {
            dots = -1;
        }
    }
    return res;
}
export function _format(sep, pathObject) {
    const dir = pathObject.dir || pathObject.root;
    const base = pathObject.base ||
        (pathObject.name || "") + (pathObject.ext || "");
    if (!dir)
        return base;
    if (dir === pathObject.root)
        return dir + base;
    return dir + sep + base;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX3V0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJfdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFLQSxPQUFPLEVBQ0wsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLFFBQVEsRUFDUixrQkFBa0IsRUFDbEIsbUJBQW1CLEdBQ3BCLE1BQU0saUJBQWlCLENBQUM7QUFFekIsTUFBTSxVQUFVLFVBQVUsQ0FBQyxJQUFZO0lBQ3JDLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO1FBQzVCLE1BQU0sSUFBSSxTQUFTLENBQ2pCLG1DQUFtQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQzFELENBQUM7S0FDSDtBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsSUFBWTtJQUMvQyxPQUFPLElBQUksS0FBSyxrQkFBa0IsQ0FBQztBQUNyQyxDQUFDO0FBRUQsTUFBTSxVQUFVLGVBQWUsQ0FBQyxJQUFZO0lBQzFDLE9BQU8sb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxLQUFLLG1CQUFtQixDQUFDO0FBQ3BFLENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsSUFBWTtJQUM5QyxPQUFPLENBQ0wsQ0FBQyxJQUFJLElBQUksZ0JBQWdCLElBQUksSUFBSSxJQUFJLGdCQUFnQixDQUFDO1FBQ3RELENBQUMsSUFBSSxJQUFJLGdCQUFnQixJQUFJLElBQUksSUFBSSxnQkFBZ0IsQ0FBQyxDQUN2RCxDQUFDO0FBQ0osQ0FBQztBQUdELE1BQU0sVUFBVSxlQUFlLENBQzdCLElBQVksRUFDWixjQUF1QixFQUN2QixTQUFpQixFQUNqQixlQUEwQztJQUUxQyxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDYixJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQztJQUMxQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNuQixJQUFJ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QUU7WUFDM0MsRUFBRSxJQUFJLENBQUM7U0FDUjthQUFNO1lBQ0wsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ1g7S0FDRjtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSxPQUFPLENBQ3JCLEdBQVcsRUFDWCxVQUFpQztJQUVqQyxNQUFNLEdBQUcsR0FBdUIsVUFBVSxDQUFDLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDO0lBQ2xFLE1BQU0sSUFBSSxHQUFXLFVBQVUsQ0FBQyxJQUFJO1FBQ2xDLENBQUMsVUFBVSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUM7SUFDbkQsSUFBSSxDQUFDLEdBQUc7UUFBRSxPQUFPLElBQUksQ0FBQztJQUN0QixJQUFJLEdBQUcsS0FBSyxVQUFVLENBQUMsSUFBSTtRQUFFLE9BQU8sR0FBRyxHQUFHLElBQUksQ0FBQztJQUMvQyxPQUFPLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO0FBQzFCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgdGhlIEJyb3dzZXJpZnkgYXV0aG9ycy4gTUlUIExpY2Vuc2UuXG4vLyBQb3J0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vYnJvd3NlcmlmeS9wYXRoLWJyb3dzZXJpZnkvXG4vKiogVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLiAqL1xuXG5pbXBvcnQgdHlwZSB7IEZvcm1hdElucHV0UGF0aE9iamVjdCB9IGZyb20gXCIuL19pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7XG4gIENIQVJfVVBQRVJDQVNFX0EsXG4gIENIQVJfTE9XRVJDQVNFX0EsXG4gIENIQVJfVVBQRVJDQVNFX1osXG4gIENIQVJfTE9XRVJDQVNFX1osXG4gIENIQVJfRE9ULFxuICBDSEFSX0ZPUldBUkRfU0xBU0gsXG4gIENIQVJfQkFDS1dBUkRfU0xBU0gsXG59IGZyb20gXCIuL19jb25zdGFudHMudHNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFBhdGgocGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICh0eXBlb2YgcGF0aCAhPT0gXCJzdHJpbmdcIikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICBgUGF0aCBtdXN0IGJlIGEgc3RyaW5nLiBSZWNlaXZlZCAke0pTT04uc3RyaW5naWZ5KHBhdGgpfWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNQb3NpeFBhdGhTZXBhcmF0b3IoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb2RlID09PSBDSEFSX0ZPUldBUkRfU0xBU0g7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1BhdGhTZXBhcmF0b3IoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBpc1Bvc2l4UGF0aFNlcGFyYXRvcihjb2RlKSB8fCBjb2RlID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXaW5kb3dzRGV2aWNlUm9vdChjb2RlOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICAoY29kZSA+PSBDSEFSX0xPV0VSQ0FTRV9BICYmIGNvZGUgPD0gQ0hBUl9MT1dFUkNBU0VfWikgfHxcbiAgICAoY29kZSA+PSBDSEFSX1VQUEVSQ0FTRV9BICYmIGNvZGUgPD0gQ0hBUl9VUFBFUkNBU0VfWilcbiAgKTtcbn1cblxuLy8gUmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIHdpdGggZGlyZWN0b3J5IG5hbWVzXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU3RyaW5nKFxuICBwYXRoOiBzdHJpbmcsXG4gIGFsbG93QWJvdmVSb290OiBib29sZWFuLFxuICBzZXBhcmF0b3I6IHN0cmluZyxcbiAgaXNQYXRoU2VwYXJhdG9yOiAoY29kZTogbnVtYmVyKSA9PiBib29sZWFuLFxuKTogc3RyaW5nIHtcbiAgbGV0IHJlcyA9IFwiXCI7XG4gIGxldCBsYXN0U2VnbWVudExlbmd0aCA9IDA7XG4gIGxldCBsYXN0U2xhc2ggPSAtMTtcbiAgbGV0IGRvdHMgPSAwO1xuICBsZXQgY29kZTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBmb3IgKGxldCBpID0gMCwgbGVuID0gcGF0aC5sZW5ndGg7IGkgPD0gbGVuOyArK2kpIHtcbiAgICBpZiAoaSA8IGxlbikgY29kZSA9IHBhdGguY2hhckNvZGVBdChpKTtcbiAgICBlbHNlIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSEpKSBicmVhaztcbiAgICBlbHNlIGNvZGUgPSBDSEFSX0ZPUldBUkRfU0xBU0g7XG5cbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUhKSkge1xuICAgICAgaWYgKGxhc3RTbGFzaCA9PT0gaSAtIDEgfHwgZG90cyA9PT0gMSkge1xuICAgICAgICAvLyBOT09QXG4gICAgICB9IGVsc2UgaWYgKGxhc3RTbGFzaCAhPT0gaSAtIDEgJiYgZG90cyA9PT0gMikge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgcmVzLmxlbmd0aCA8IDIgfHxcbiAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCAhPT0gMiB8fFxuICAgICAgICAgIHJlcy5jaGFyQ29kZUF0KHJlcy5sZW5ndGggLSAxKSAhPT0gQ0hBUl9ET1QgfHxcbiAgICAgICAgICByZXMuY2hhckNvZGVBdChyZXMubGVuZ3RoIC0gMikgIT09IENIQVJfRE9UXG4gICAgICAgICkge1xuICAgICAgICAgIGlmIChyZXMubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgY29uc3QgbGFzdFNsYXNoSW5kZXggPSByZXMubGFzdEluZGV4T2Yoc2VwYXJhdG9yKTtcbiAgICAgICAgICAgIGlmIChsYXN0U2xhc2hJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgcmVzID0gXCJcIjtcbiAgICAgICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzID0gcmVzLnNsaWNlKDAsIGxhc3RTbGFzaEluZGV4KTtcbiAgICAgICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSByZXMubGVuZ3RoIC0gMSAtIHJlcy5sYXN0SW5kZXhPZihzZXBhcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGFzdFNsYXNoID0gaTtcbiAgICAgICAgICAgIGRvdHMgPSAwO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChyZXMubGVuZ3RoID09PSAyIHx8IHJlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHJlcyA9IFwiXCI7XG4gICAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IDA7XG4gICAgICAgICAgICBsYXN0U2xhc2ggPSBpO1xuICAgICAgICAgICAgZG90cyA9IDA7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgICAgICAgaWYgKHJlcy5sZW5ndGggPiAwKSByZXMgKz0gYCR7c2VwYXJhdG9yfS4uYDtcbiAgICAgICAgICBlbHNlIHJlcyA9IFwiLi5cIjtcbiAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IDI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChyZXMubGVuZ3RoID4gMCkgcmVzICs9IHNlcGFyYXRvciArIHBhdGguc2xpY2UobGFzdFNsYXNoICsgMSwgaSk7XG4gICAgICAgIGVsc2UgcmVzID0gcGF0aC5zbGljZShsYXN0U2xhc2ggKyAxLCBpKTtcbiAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSBpIC0gbGFzdFNsYXNoIC0gMTtcbiAgICAgIH1cbiAgICAgIGxhc3RTbGFzaCA9IGk7XG4gICAgICBkb3RzID0gMDtcbiAgICB9IGVsc2UgaWYgKGNvZGUgPT09IENIQVJfRE9UICYmIGRvdHMgIT09IC0xKSB7XG4gICAgICArK2RvdHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRvdHMgPSAtMTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9mb3JtYXQoXG4gIHNlcDogc3RyaW5nLFxuICBwYXRoT2JqZWN0OiBGb3JtYXRJbnB1dFBhdGhPYmplY3QsXG4pOiBzdHJpbmcge1xuICBjb25zdCBkaXI6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHBhdGhPYmplY3QuZGlyIHx8IHBhdGhPYmplY3Qucm9vdDtcbiAgY29uc3QgYmFzZTogc3RyaW5nID0gcGF0aE9iamVjdC5iYXNlIHx8XG4gICAgKHBhdGhPYmplY3QubmFtZSB8fCBcIlwiKSArIChwYXRoT2JqZWN0LmV4dCB8fCBcIlwiKTtcbiAgaWYgKCFkaXIpIHJldHVybiBiYXNlO1xuICBpZiAoZGlyID09PSBwYXRoT2JqZWN0LnJvb3QpIHJldHVybiBkaXIgKyBiYXNlO1xuICByZXR1cm4gZGlyICsgc2VwICsgYmFzZTtcbn1cbiJdfQ==