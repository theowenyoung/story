// Copyright the Browserify authors. MIT License.
// Ported from https://github.com/browserify/path-browserify/
// This module is browser compatible.
import { CHAR_DOT, CHAR_FORWARD_SLASH } from "./_constants.ts";
import { _format, assertPath, encodeWhitespace, isPosixPathSeparator, normalizeString } from "./_util.ts";
export const sep = "/";
export const delimiter = ":";
// path.resolve([from ...], to)
/**
 * Resolves `pathSegments` into an absolute path.
 * @param pathSegments an array of path segments
 */ export function resolve(...pathSegments) {
    let resolvedPath = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--){
        let path;
        if (i >= 0) path = pathSegments[i];
        else {
            // deno-lint-ignore no-explicit-any
            const { Deno  } = globalThis;
            if (typeof Deno?.cwd !== "function") {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno.cwd();
        }
        assertPath(path);
        // Skip empty entries
        if (path.length === 0) {
            continue;
        }
        resolvedPath = `${path}/${resolvedPath}`;
        resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)
    // Normalize the path
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
    if (resolvedAbsolute) {
        if (resolvedPath.length > 0) return `/${resolvedPath}`;
        else return "/";
    } else if (resolvedPath.length > 0) return resolvedPath;
    else return ".";
}
/**
 * Normalize the `path`, resolving `'..'` and `'.'` segments.
 * @param path to be normalized
 */ export function normalize(path) {
    assertPath(path);
    if (path.length === 0) return ".";
    const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;
    // Normalize the path
    path = normalizeString(path, !isAbsolute, "/", isPosixPathSeparator);
    if (path.length === 0 && !isAbsolute) path = ".";
    if (path.length > 0 && trailingSeparator) path += "/";
    if (isAbsolute) return `/${path}`;
    return path;
}
/**
 * Verifies whether provided path is absolute
 * @param path to be verified as absolute
 */ export function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
}
/**
 * Join all given a sequence of `paths`,then normalizes the resulting path.
 * @param paths to be joined and normalized
 */ export function join(...paths) {
    if (paths.length === 0) return ".";
    let joined;
    for(let i = 0, len = paths.length; i < len; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (!joined) joined = path;
            else joined += `/${path}`;
        }
    }
    if (!joined) return ".";
    return normalize(joined);
}
/**
 * Return the relative path from `from` to `to` based on current working directory.
 * @param from path in current working directory
 * @param to path in current working directory
 */ export function relative(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    from = resolve(from);
    to = resolve(to);
    if (from === to) return "";
    // Trim any leading backslashes
    let fromStart = 1;
    const fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (from.charCodeAt(fromStart) !== CHAR_FORWARD_SLASH) break;
    }
    const fromLen = fromEnd - fromStart;
    // Trim any leading backslashes
    let toStart = 1;
    const toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (to.charCodeAt(toStart) !== CHAR_FORWARD_SLASH) break;
    }
    const toLen = toEnd - toStart;
    // Compare paths to find the longest common path from root
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH) {
                    // We get here if `from` is the exact base path for `to`.
                    // For example: from='/foo/bar'; to='/foo/bar/baz'
                    return to.slice(toStart + i + 1);
                } else if (i === 0) {
                    // We get here if `from` is the root
                    // For example: from='/'; to='/foo'
                    return to.slice(toStart + i);
                }
            } else if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH) {
                    // We get here if `to` is the exact base path for `from`.
                    // For example: from='/foo/bar/baz'; to='/foo/bar'
                    lastCommonSep = i;
                } else if (i === 0) {
                    // We get here if `to` is the root.
                    // For example: from='/foo'; to='/'
                    lastCommonSep = 0;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (fromCode === CHAR_FORWARD_SLASH) lastCommonSep = i;
    }
    let out = "";
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH) {
            if (out.length === 0) out += "..";
            else out += "/..";
        }
    }
    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0) return out + to.slice(toStart + lastCommonSep);
    else {
        toStart += lastCommonSep;
        if (to.charCodeAt(toStart) === CHAR_FORWARD_SLASH) ++toStart;
        return to.slice(toStart);
    }
}
/**
 * Resolves path to a namespace path
 * @param path to resolve to namespace
 */ export function toNamespacedPath(path) {
    // Non-op on posix systems
    return path;
}
/**
 * Return the directory name of a `path`.
 * @param path to determine name for
 */ export function dirname(path) {
    assertPath(path);
    if (path.length === 0) return ".";
    const hasRoot = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let end = -1;
    let matchedSlash = true;
    for(let i = path.length - 1; i >= 1; --i){
        if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            // We saw the first non-path separator
            matchedSlash = false;
        }
    }
    if (end === -1) return hasRoot ? "/" : ".";
    if (hasRoot && end === 1) return "//";
    return path.slice(0, end);
}
/**
 * Return the last portion of a `path`. Trailing directory separators are ignored.
 * @param path to process
 * @param ext of path directory
 */ export function basename(path, ext = "") {
    if (ext !== undefined && typeof ext !== "string") {
        throw new TypeError('"ext" argument must be a string');
    }
    assertPath(path);
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) return "";
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for(i = path.length - 1; i >= 0; --i){
            const code = path.charCodeAt(i);
            if (code === CHAR_FORWARD_SLASH) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else {
                if (firstNonSlashEnd === -1) {
                    // We saw the first non-path separator, remember this index in case
                    // we need it if the extension ends up not matching
                    matchedSlash = false;
                    firstNonSlashEnd = i + 1;
                }
                if (extIdx >= 0) {
                    // Try to match the explicit extension
                    if (code === ext.charCodeAt(extIdx)) {
                        if (--extIdx === -1) {
                            // We matched the extension, so mark this as the end of our path
                            // component
                            end = i;
                        }
                    } else {
                        // Extension does not match, so our result is the entire path
                        // component
                        extIdx = -1;
                        end = firstNonSlashEnd;
                    }
                }
            }
        }
        if (start === end) end = firstNonSlashEnd;
        else if (end === -1) end = path.length;
        return path.slice(start, end);
    } else {
        for(i = path.length - 1; i >= 0; --i){
            if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // path component
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) return "";
        return path.slice(start, end);
    }
}
/**
 * Return the extension of the `path`.
 * @param path with extension
 */ export function extname(path) {
    assertPath(path);
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    let preDotState = 0;
    for(let i = path.length - 1; i >= 0; --i){
        const code = path.charCodeAt(i);
        if (code === CHAR_FORWARD_SLASH) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            // We saw the first non-path separator, mark this as the end of our
            // extension
            matchedSlash = false;
            end = i + 1;
        }
        if (code === CHAR_DOT) {
            // If this is our first dot, mark it as the start of our extension
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            // We saw a non-dot and non-path separator before our dot, so we should
            // have a good chance at having a non-empty extension
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return "";
    }
    return path.slice(startDot, end);
}
/**
 * Generate a path from `FormatInputPathObject` object.
 * @param pathObject with path
 */ export function format(pathObject) {
    if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("/", pathObject);
}
/**
 * Return a `ParsedPath` object of the `path`.
 * @param path to process
 */ export function parse(path) {
    assertPath(path);
    const ret = {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
    };
    if (path.length === 0) return ret;
    const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let start;
    if (isAbsolute) {
        ret.root = "/";
        start = 1;
    } else {
        start = 0;
    }
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    let preDotState = 0;
    // Get non-dir info
    for(; i >= start; --i){
        const code = path.charCodeAt(i);
        if (code === CHAR_FORWARD_SLASH) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            // We saw the first non-path separator, mark this as the end of our
            // extension
            matchedSlash = false;
            end = i + 1;
        }
        if (code === CHAR_DOT) {
            // If this is our first dot, mark it as the start of our extension
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            // We saw a non-dot and non-path separator before our dot, so we should
            // have a good chance at having a non-empty extension
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
            if (startPart === 0 && isAbsolute) {
                ret.base = ret.name = path.slice(1, end);
            } else {
                ret.base = ret.name = path.slice(startPart, end);
            }
        }
    } else {
        if (startPart === 0 && isAbsolute) {
            ret.name = path.slice(1, startDot);
            ret.base = path.slice(1, end);
        } else {
            ret.name = path.slice(startPart, startDot);
            ret.base = path.slice(startPart, end);
        }
        ret.ext = path.slice(startDot, end);
    }
    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);
    else if (isAbsolute) ret.dir = "/";
    return ret;
}
/**
 * Converts a file URL to a path string.
 *
 * ```ts
 *      import { fromFileUrl } from "./posix.ts";
 *      fromFileUrl("file:///home/foo"); // "/home/foo"
 * ```
 * @param url of a file URL
 */ export function fromFileUrl(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    return decodeURIComponent(url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
}
/**
 * Converts a path string to a file URL.
 *
 * ```ts
 *      import { toFileUrl } from "./posix.ts";
 *      toFileUrl("/home/foo"); // new URL("file:///home/foo")
 * ```
 * @param path to convert to file URL
 */ export function toFileUrl(path) {
    if (!isAbsolute(path)) {
        throw new TypeError("Must be an absolute path.");
    }
    const url = new URL("file:///");
    url.pathname = encodeWhitespace(path.replace(/%/g, "%25").replace(/\\/g, "%5C"));
    return url;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL3BhdGgvcG9zaXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IHRoZSBCcm93c2VyaWZ5IGF1dGhvcnMuIE1JVCBMaWNlbnNlLlxuLy8gUG9ydGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Jyb3dzZXJpZnkvcGF0aC1icm93c2VyaWZ5L1xuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgdHlwZSB7IEZvcm1hdElucHV0UGF0aE9iamVjdCwgUGFyc2VkUGF0aCB9IGZyb20gXCIuL19pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7IENIQVJfRE9ULCBDSEFSX0ZPUldBUkRfU0xBU0ggfSBmcm9tIFwiLi9fY29uc3RhbnRzLnRzXCI7XG5cbmltcG9ydCB7XG4gIF9mb3JtYXQsXG4gIGFzc2VydFBhdGgsXG4gIGVuY29kZVdoaXRlc3BhY2UsXG4gIGlzUG9zaXhQYXRoU2VwYXJhdG9yLFxuICBub3JtYWxpemVTdHJpbmcsXG59IGZyb20gXCIuL191dGlsLnRzXCI7XG5cbmV4cG9ydCBjb25zdCBzZXAgPSBcIi9cIjtcbmV4cG9ydCBjb25zdCBkZWxpbWl0ZXIgPSBcIjpcIjtcblxuLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuLyoqXG4gKiBSZXNvbHZlcyBgcGF0aFNlZ21lbnRzYCBpbnRvIGFuIGFic29sdXRlIHBhdGguXG4gKiBAcGFyYW0gcGF0aFNlZ21lbnRzIGFuIGFycmF5IG9mIHBhdGggc2VnbWVudHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmUoLi4ucGF0aFNlZ21lbnRzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIGxldCByZXNvbHZlZFBhdGggPSBcIlwiO1xuICBsZXQgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAobGV0IGkgPSBwYXRoU2VnbWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgbGV0IHBhdGg6IHN0cmluZztcblxuICAgIGlmIChpID49IDApIHBhdGggPSBwYXRoU2VnbWVudHNbaV07XG4gICAgZWxzZSB7XG4gICAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgICAgY29uc3QgeyBEZW5vIH0gPSBnbG9iYWxUaGlzIGFzIGFueTtcbiAgICAgIGlmICh0eXBlb2YgRGVubz8uY3dkICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlJlc29sdmVkIGEgcmVsYXRpdmUgcGF0aCB3aXRob3V0IGEgQ1dELlwiKTtcbiAgICAgIH1cbiAgICAgIHBhdGggPSBEZW5vLmN3ZCgpO1xuICAgIH1cblxuICAgIGFzc2VydFBhdGgocGF0aCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGVudHJpZXNcbiAgICBpZiAocGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IGAke3BhdGh9LyR7cmVzb2x2ZWRQYXRofWA7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckNvZGVBdCgwKSA9PT0gQ0hBUl9GT1JXQVJEX1NMQVNIO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplU3RyaW5nKFxuICAgIHJlc29sdmVkUGF0aCxcbiAgICAhcmVzb2x2ZWRBYnNvbHV0ZSxcbiAgICBcIi9cIixcbiAgICBpc1Bvc2l4UGF0aFNlcGFyYXRvcixcbiAgKTtcblxuICBpZiAocmVzb2x2ZWRBYnNvbHV0ZSkge1xuICAgIGlmIChyZXNvbHZlZFBhdGgubGVuZ3RoID4gMCkgcmV0dXJuIGAvJHtyZXNvbHZlZFBhdGh9YDtcbiAgICBlbHNlIHJldHVybiBcIi9cIjtcbiAgfSBlbHNlIGlmIChyZXNvbHZlZFBhdGgubGVuZ3RoID4gMCkgcmV0dXJuIHJlc29sdmVkUGF0aDtcbiAgZWxzZSByZXR1cm4gXCIuXCI7XG59XG5cbi8qKlxuICogTm9ybWFsaXplIHRoZSBgcGF0aGAsIHJlc29sdmluZyBgJy4uJ2AgYW5kIGAnLidgIHNlZ21lbnRzLlxuICogQHBhcmFtIHBhdGggdG8gYmUgbm9ybWFsaXplZFxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGFzc2VydFBhdGgocGF0aCk7XG5cbiAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSByZXR1cm4gXCIuXCI7XG5cbiAgY29uc3QgaXNBYnNvbHV0ZSA9IHBhdGguY2hhckNvZGVBdCgwKSA9PT0gQ0hBUl9GT1JXQVJEX1NMQVNIO1xuICBjb25zdCB0cmFpbGluZ1NlcGFyYXRvciA9XG4gICAgcGF0aC5jaGFyQ29kZUF0KHBhdGgubGVuZ3RoIC0gMSkgPT09IENIQVJfRk9SV0FSRF9TTEFTSDtcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZVN0cmluZyhwYXRoLCAhaXNBYnNvbHV0ZSwgXCIvXCIsIGlzUG9zaXhQYXRoU2VwYXJhdG9yKTtcblxuICBpZiAocGF0aC5sZW5ndGggPT09IDAgJiYgIWlzQWJzb2x1dGUpIHBhdGggPSBcIi5cIjtcbiAgaWYgKHBhdGgubGVuZ3RoID4gMCAmJiB0cmFpbGluZ1NlcGFyYXRvcikgcGF0aCArPSBcIi9cIjtcblxuICBpZiAoaXNBYnNvbHV0ZSkgcmV0dXJuIGAvJHtwYXRofWA7XG4gIHJldHVybiBwYXRoO1xufVxuXG4vKipcbiAqIFZlcmlmaWVzIHdoZXRoZXIgcHJvdmlkZWQgcGF0aCBpcyBhYnNvbHV0ZVxuICogQHBhcmFtIHBhdGggdG8gYmUgdmVyaWZpZWQgYXMgYWJzb2x1dGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQWJzb2x1dGUocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGFzc2VydFBhdGgocGF0aCk7XG4gIHJldHVybiBwYXRoLmxlbmd0aCA+IDAgJiYgcGF0aC5jaGFyQ29kZUF0KDApID09PSBDSEFSX0ZPUldBUkRfU0xBU0g7XG59XG5cbi8qKlxuICogSm9pbiBhbGwgZ2l2ZW4gYSBzZXF1ZW5jZSBvZiBgcGF0aHNgLHRoZW4gbm9ybWFsaXplcyB0aGUgcmVzdWx0aW5nIHBhdGguXG4gKiBAcGFyYW0gcGF0aHMgdG8gYmUgam9pbmVkIGFuZCBub3JtYWxpemVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqb2luKC4uLnBhdGhzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIGlmIChwYXRocy5sZW5ndGggPT09IDApIHJldHVybiBcIi5cIjtcbiAgbGV0IGpvaW5lZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBmb3IgKGxldCBpID0gMCwgbGVuID0gcGF0aHMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBjb25zdCBwYXRoID0gcGF0aHNbaV07XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgICBpZiAocGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICBpZiAoIWpvaW5lZCkgam9pbmVkID0gcGF0aDtcbiAgICAgIGVsc2Ugam9pbmVkICs9IGAvJHtwYXRofWA7XG4gICAgfVxuICB9XG4gIGlmICgham9pbmVkKSByZXR1cm4gXCIuXCI7XG4gIHJldHVybiBub3JtYWxpemUoam9pbmVkKTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIHJlbGF0aXZlIHBhdGggZnJvbSBgZnJvbWAgdG8gYHRvYCBiYXNlZCBvbiBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LlxuICogQHBhcmFtIGZyb20gcGF0aCBpbiBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gKiBAcGFyYW0gdG8gcGF0aCBpbiBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWxhdGl2ZShmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpOiBzdHJpbmcge1xuICBhc3NlcnRQYXRoKGZyb20pO1xuICBhc3NlcnRQYXRoKHRvKTtcblxuICBpZiAoZnJvbSA9PT0gdG8pIHJldHVybiBcIlwiO1xuXG4gIGZyb20gPSByZXNvbHZlKGZyb20pO1xuICB0byA9IHJlc29sdmUodG8pO1xuXG4gIGlmIChmcm9tID09PSB0bykgcmV0dXJuIFwiXCI7XG5cbiAgLy8gVHJpbSBhbnkgbGVhZGluZyBiYWNrc2xhc2hlc1xuICBsZXQgZnJvbVN0YXJ0ID0gMTtcbiAgY29uc3QgZnJvbUVuZCA9IGZyb20ubGVuZ3RoO1xuICBmb3IgKDsgZnJvbVN0YXJ0IDwgZnJvbUVuZDsgKytmcm9tU3RhcnQpIHtcbiAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCkgIT09IENIQVJfRk9SV0FSRF9TTEFTSCkgYnJlYWs7XG4gIH1cbiAgY29uc3QgZnJvbUxlbiA9IGZyb21FbmQgLSBmcm9tU3RhcnQ7XG5cbiAgLy8gVHJpbSBhbnkgbGVhZGluZyBiYWNrc2xhc2hlc1xuICBsZXQgdG9TdGFydCA9IDE7XG4gIGNvbnN0IHRvRW5kID0gdG8ubGVuZ3RoO1xuICBmb3IgKDsgdG9TdGFydCA8IHRvRW5kOyArK3RvU3RhcnQpIHtcbiAgICBpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0KSAhPT0gQ0hBUl9GT1JXQVJEX1NMQVNIKSBicmVhaztcbiAgfVxuICBjb25zdCB0b0xlbiA9IHRvRW5kIC0gdG9TdGFydDtcblxuICAvLyBDb21wYXJlIHBhdGhzIHRvIGZpbmQgdGhlIGxvbmdlc3QgY29tbW9uIHBhdGggZnJvbSByb290XG4gIGNvbnN0IGxlbmd0aCA9IGZyb21MZW4gPCB0b0xlbiA/IGZyb21MZW4gOiB0b0xlbjtcbiAgbGV0IGxhc3RDb21tb25TZXAgPSAtMTtcbiAgbGV0IGkgPSAwO1xuICBmb3IgKDsgaSA8PSBsZW5ndGg7ICsraSkge1xuICAgIGlmIChpID09PSBsZW5ndGgpIHtcbiAgICAgIGlmICh0b0xlbiA+IGxlbmd0aCkge1xuICAgICAgICBpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0ICsgaSkgPT09IENIQVJfRk9SV0FSRF9TTEFTSCkge1xuICAgICAgICAgIC8vIFdlIGdldCBoZXJlIGlmIGBmcm9tYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgdG9gLlxuICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPScvZm9vL2Jhcic7IHRvPScvZm9vL2Jhci9iYXonXG4gICAgICAgICAgcmV0dXJuIHRvLnNsaWNlKHRvU3RhcnQgKyBpICsgMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgIC8vIFdlIGdldCBoZXJlIGlmIGBmcm9tYCBpcyB0aGUgcm9vdFxuICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPScvJzsgdG89Jy9mb28nXG4gICAgICAgICAgcmV0dXJuIHRvLnNsaWNlKHRvU3RhcnQgKyBpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChmcm9tTGVuID4gbGVuZ3RoKSB7XG4gICAgICAgIGlmIChmcm9tLmNoYXJDb2RlQXQoZnJvbVN0YXJ0ICsgaSkgPT09IENIQVJfRk9SV0FSRF9TTEFTSCkge1xuICAgICAgICAgIC8vIFdlIGdldCBoZXJlIGlmIGB0b2AgaXMgdGhlIGV4YWN0IGJhc2UgcGF0aCBmb3IgYGZyb21gLlxuICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPScvZm9vL2Jhci9iYXonOyB0bz0nL2Zvby9iYXInXG4gICAgICAgICAgbGFzdENvbW1vblNlcCA9IGk7XG4gICAgICAgIH0gZWxzZSBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgIC8vIFdlIGdldCBoZXJlIGlmIGB0b2AgaXMgdGhlIHJvb3QuXG4gICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209Jy9mb28nOyB0bz0nLydcbiAgICAgICAgICBsYXN0Q29tbW9uU2VwID0gMDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IGZyb21Db2RlID0gZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpO1xuICAgIGNvbnN0IHRvQ29kZSA9IHRvLmNoYXJDb2RlQXQodG9TdGFydCArIGkpO1xuICAgIGlmIChmcm9tQ29kZSAhPT0gdG9Db2RlKSBicmVhaztcbiAgICBlbHNlIGlmIChmcm9tQ29kZSA9PT0gQ0hBUl9GT1JXQVJEX1NMQVNIKSBsYXN0Q29tbW9uU2VwID0gaTtcbiAgfVxuXG4gIGxldCBvdXQgPSBcIlwiO1xuICAvLyBHZW5lcmF0ZSB0aGUgcmVsYXRpdmUgcGF0aCBiYXNlZCBvbiB0aGUgcGF0aCBkaWZmZXJlbmNlIGJldHdlZW4gYHRvYFxuICAvLyBhbmQgYGZyb21gXG4gIGZvciAoaSA9IGZyb21TdGFydCArIGxhc3RDb21tb25TZXAgKyAxOyBpIDw9IGZyb21FbmQ7ICsraSkge1xuICAgIGlmIChpID09PSBmcm9tRW5kIHx8IGZyb20uY2hhckNvZGVBdChpKSA9PT0gQ0hBUl9GT1JXQVJEX1NMQVNIKSB7XG4gICAgICBpZiAob3V0Lmxlbmd0aCA9PT0gMCkgb3V0ICs9IFwiLi5cIjtcbiAgICAgIGVsc2Ugb3V0ICs9IFwiLy4uXCI7XG4gICAgfVxuICB9XG5cbiAgLy8gTGFzdGx5LCBhcHBlbmQgdGhlIHJlc3Qgb2YgdGhlIGRlc3RpbmF0aW9uIChgdG9gKSBwYXRoIHRoYXQgY29tZXMgYWZ0ZXJcbiAgLy8gdGhlIGNvbW1vbiBwYXRoIHBhcnRzXG4gIGlmIChvdXQubGVuZ3RoID4gMCkgcmV0dXJuIG91dCArIHRvLnNsaWNlKHRvU3RhcnQgKyBsYXN0Q29tbW9uU2VwKTtcbiAgZWxzZSB7XG4gICAgdG9TdGFydCArPSBsYXN0Q29tbW9uU2VwO1xuICAgIGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQpID09PSBDSEFSX0ZPUldBUkRfU0xBU0gpICsrdG9TdGFydDtcbiAgICByZXR1cm4gdG8uc2xpY2UodG9TdGFydCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlcyBwYXRoIHRvIGEgbmFtZXNwYWNlIHBhdGhcbiAqIEBwYXJhbSBwYXRoIHRvIHJlc29sdmUgdG8gbmFtZXNwYWNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b05hbWVzcGFjZWRQYXRoKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIE5vbi1vcCBvbiBwb3NpeCBzeXN0ZW1zXG4gIHJldHVybiBwYXRoO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgZGlyZWN0b3J5IG5hbWUgb2YgYSBgcGF0aGAuXG4gKiBAcGFyYW0gcGF0aCB0byBkZXRlcm1pbmUgbmFtZSBmb3JcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpcm5hbWUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSByZXR1cm4gXCIuXCI7XG4gIGNvbnN0IGhhc1Jvb3QgPSBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IENIQVJfRk9SV0FSRF9TTEFTSDtcbiAgbGV0IGVuZCA9IC0xO1xuICBsZXQgbWF0Y2hlZFNsYXNoID0gdHJ1ZTtcbiAgZm9yIChsZXQgaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSAxOyAtLWkpIHtcbiAgICBpZiAocGF0aC5jaGFyQ29kZUF0KGkpID09PSBDSEFSX0ZPUldBUkRfU0xBU0gpIHtcbiAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgIGVuZCA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvclxuICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKGVuZCA9PT0gLTEpIHJldHVybiBoYXNSb290ID8gXCIvXCIgOiBcIi5cIjtcbiAgaWYgKGhhc1Jvb3QgJiYgZW5kID09PSAxKSByZXR1cm4gXCIvL1wiO1xuICByZXR1cm4gcGF0aC5zbGljZSgwLCBlbmQpO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgbGFzdCBwb3J0aW9uIG9mIGEgYHBhdGhgLiBUcmFpbGluZyBkaXJlY3Rvcnkgc2VwYXJhdG9ycyBhcmUgaWdub3JlZC5cbiAqIEBwYXJhbSBwYXRoIHRvIHByb2Nlc3NcbiAqIEBwYXJhbSBleHQgb2YgcGF0aCBkaXJlY3RvcnlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2VuYW1lKHBhdGg6IHN0cmluZywgZXh0ID0gXCJcIik6IHN0cmluZyB7XG4gIGlmIChleHQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZXh0ICE9PSBcInN0cmluZ1wiKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJleHRcIiBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gIH1cbiAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICBsZXQgc3RhcnQgPSAwO1xuICBsZXQgZW5kID0gLTE7XG4gIGxldCBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICBsZXQgaTogbnVtYmVyO1xuXG4gIGlmIChleHQgIT09IHVuZGVmaW5lZCAmJiBleHQubGVuZ3RoID4gMCAmJiBleHQubGVuZ3RoIDw9IHBhdGgubGVuZ3RoKSB7XG4gICAgaWYgKGV4dC5sZW5ndGggPT09IHBhdGgubGVuZ3RoICYmIGV4dCA9PT0gcGF0aCkgcmV0dXJuIFwiXCI7XG4gICAgbGV0IGV4dElkeCA9IGV4dC5sZW5ndGggLSAxO1xuICAgIGxldCBmaXJzdE5vblNsYXNoRW5kID0gLTE7XG4gICAgZm9yIChpID0gcGF0aC5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgY29uc3QgY29kZSA9IHBhdGguY2hhckNvZGVBdChpKTtcbiAgICAgIGlmIChjb2RlID09PSBDSEFSX0ZPUldBUkRfU0xBU0gpIHtcbiAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIHBhdGggc2VwYXJhdG9yIHRoYXQgd2FzIG5vdCBwYXJ0IG9mIGEgc2V0IG9mIHBhdGhcbiAgICAgICAgLy8gc2VwYXJhdG9ycyBhdCB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHN0b3Agbm93XG4gICAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgICAgc3RhcnQgPSBpICsgMTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZpcnN0Tm9uU2xhc2hFbmQgPT09IC0xKSB7XG4gICAgICAgICAgLy8gV2Ugc2F3IHRoZSBmaXJzdCBub24tcGF0aCBzZXBhcmF0b3IsIHJlbWVtYmVyIHRoaXMgaW5kZXggaW4gY2FzZVxuICAgICAgICAgIC8vIHdlIG5lZWQgaXQgaWYgdGhlIGV4dGVuc2lvbiBlbmRzIHVwIG5vdCBtYXRjaGluZ1xuICAgICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICAgIGZpcnN0Tm9uU2xhc2hFbmQgPSBpICsgMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXh0SWR4ID49IDApIHtcbiAgICAgICAgICAvLyBUcnkgdG8gbWF0Y2ggdGhlIGV4cGxpY2l0IGV4dGVuc2lvblxuICAgICAgICAgIGlmIChjb2RlID09PSBleHQuY2hhckNvZGVBdChleHRJZHgpKSB7XG4gICAgICAgICAgICBpZiAoLS1leHRJZHggPT09IC0xKSB7XG4gICAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgdGhlIGV4dGVuc2lvbiwgc28gbWFyayB0aGlzIGFzIHRoZSBlbmQgb2Ygb3VyIHBhdGhcbiAgICAgICAgICAgICAgLy8gY29tcG9uZW50XG4gICAgICAgICAgICAgIGVuZCA9IGk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBkb2VzIG5vdCBtYXRjaCwgc28gb3VyIHJlc3VsdCBpcyB0aGUgZW50aXJlIHBhdGhcbiAgICAgICAgICAgIC8vIGNvbXBvbmVudFxuICAgICAgICAgICAgZXh0SWR4ID0gLTE7XG4gICAgICAgICAgICBlbmQgPSBmaXJzdE5vblNsYXNoRW5kO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdGFydCA9PT0gZW5kKSBlbmQgPSBmaXJzdE5vblNsYXNoRW5kO1xuICAgIGVsc2UgaWYgKGVuZCA9PT0gLTEpIGVuZCA9IHBhdGgubGVuZ3RoO1xuICAgIHJldHVybiBwYXRoLnNsaWNlKHN0YXJ0LCBlbmQpO1xuICB9IGVsc2Uge1xuICAgIGZvciAoaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIGlmIChwYXRoLmNoYXJDb2RlQXQoaSkgPT09IENIQVJfRk9SV0FSRF9TTEFTSCkge1xuICAgICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgcGF0aCBzZXBhcmF0b3IgdGhhdCB3YXMgbm90IHBhcnQgb2YgYSBzZXQgb2YgcGF0aFxuICAgICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgICAgaWYgKCFtYXRjaGVkU2xhc2gpIHtcbiAgICAgICAgICBzdGFydCA9IGkgKyAxO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgICAgLy8gV2Ugc2F3IHRoZSBmaXJzdCBub24tcGF0aCBzZXBhcmF0b3IsIG1hcmsgdGhpcyBhcyB0aGUgZW5kIG9mIG91clxuICAgICAgICAvLyBwYXRoIGNvbXBvbmVudFxuICAgICAgICBtYXRjaGVkU2xhc2ggPSBmYWxzZTtcbiAgICAgICAgZW5kID0gaSArIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVuZCA9PT0gLTEpIHJldHVybiBcIlwiO1xuICAgIHJldHVybiBwYXRoLnNsaWNlKHN0YXJ0LCBlbmQpO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBleHRlbnNpb24gb2YgdGhlIGBwYXRoYC5cbiAqIEBwYXJhbSBwYXRoIHdpdGggZXh0ZW5zaW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRuYW1lKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGFzc2VydFBhdGgocGF0aCk7XG4gIGxldCBzdGFydERvdCA9IC0xO1xuICBsZXQgc3RhcnRQYXJ0ID0gMDtcbiAgbGV0IGVuZCA9IC0xO1xuICBsZXQgbWF0Y2hlZFNsYXNoID0gdHJ1ZTtcbiAgLy8gVHJhY2sgdGhlIHN0YXRlIG9mIGNoYXJhY3RlcnMgKGlmIGFueSkgd2Ugc2VlIGJlZm9yZSBvdXIgZmlyc3QgZG90IGFuZFxuICAvLyBhZnRlciBhbnkgcGF0aCBzZXBhcmF0b3Igd2UgZmluZFxuICBsZXQgcHJlRG90U3RhdGUgPSAwO1xuICBmb3IgKGxldCBpID0gcGF0aC5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgIGNvbnN0IGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgaWYgKGNvZGUgPT09IENIQVJfRk9SV0FSRF9TTEFTSCkge1xuICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIHBhdGggc2VwYXJhdG9yIHRoYXQgd2FzIG5vdCBwYXJ0IG9mIGEgc2V0IG9mIHBhdGhcbiAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgaWYgKCFtYXRjaGVkU2xhc2gpIHtcbiAgICAgICAgc3RhcnRQYXJ0ID0gaSArIDE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChlbmQgPT09IC0xKSB7XG4gICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgbWFyayB0aGlzIGFzIHRoZSBlbmQgb2Ygb3VyXG4gICAgICAvLyBleHRlbnNpb25cbiAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgZW5kID0gaSArIDE7XG4gICAgfVxuICAgIGlmIChjb2RlID09PSBDSEFSX0RPVCkge1xuICAgICAgLy8gSWYgdGhpcyBpcyBvdXIgZmlyc3QgZG90LCBtYXJrIGl0IGFzIHRoZSBzdGFydCBvZiBvdXIgZXh0ZW5zaW9uXG4gICAgICBpZiAoc3RhcnREb3QgPT09IC0xKSBzdGFydERvdCA9IGk7XG4gICAgICBlbHNlIGlmIChwcmVEb3RTdGF0ZSAhPT0gMSkgcHJlRG90U3RhdGUgPSAxO1xuICAgIH0gZWxzZSBpZiAoc3RhcnREb3QgIT09IC0xKSB7XG4gICAgICAvLyBXZSBzYXcgYSBub24tZG90IGFuZCBub24tcGF0aCBzZXBhcmF0b3IgYmVmb3JlIG91ciBkb3QsIHNvIHdlIHNob3VsZFxuICAgICAgLy8gaGF2ZSBhIGdvb2QgY2hhbmNlIGF0IGhhdmluZyBhIG5vbi1lbXB0eSBleHRlbnNpb25cbiAgICAgIHByZURvdFN0YXRlID0gLTE7XG4gICAgfVxuICB9XG5cbiAgaWYgKFxuICAgIHN0YXJ0RG90ID09PSAtMSB8fFxuICAgIGVuZCA9PT0gLTEgfHxcbiAgICAvLyBXZSBzYXcgYSBub24tZG90IGNoYXJhY3RlciBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGRvdFxuICAgIHByZURvdFN0YXRlID09PSAwIHx8XG4gICAgLy8gVGhlIChyaWdodC1tb3N0KSB0cmltbWVkIHBhdGggY29tcG9uZW50IGlzIGV4YWN0bHkgJy4uJ1xuICAgIChwcmVEb3RTdGF0ZSA9PT0gMSAmJiBzdGFydERvdCA9PT0gZW5kIC0gMSAmJiBzdGFydERvdCA9PT0gc3RhcnRQYXJ0ICsgMSlcbiAgKSB7XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cbiAgcmV0dXJuIHBhdGguc2xpY2Uoc3RhcnREb3QsIGVuZCk7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYSBwYXRoIGZyb20gYEZvcm1hdElucHV0UGF0aE9iamVjdGAgb2JqZWN0LlxuICogQHBhcmFtIHBhdGhPYmplY3Qgd2l0aCBwYXRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXQocGF0aE9iamVjdDogRm9ybWF0SW5wdXRQYXRoT2JqZWN0KTogc3RyaW5nIHtcbiAgaWYgKHBhdGhPYmplY3QgPT09IG51bGwgfHwgdHlwZW9mIHBhdGhPYmplY3QgIT09IFwib2JqZWN0XCIpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgYFRoZSBcInBhdGhPYmplY3RcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICR7dHlwZW9mIHBhdGhPYmplY3R9YCxcbiAgICApO1xuICB9XG4gIHJldHVybiBfZm9ybWF0KFwiL1wiLCBwYXRoT2JqZWN0KTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gYSBgUGFyc2VkUGF0aGAgb2JqZWN0IG9mIHRoZSBgcGF0aGAuXG4gKiBAcGFyYW0gcGF0aCB0byBwcm9jZXNzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShwYXRoOiBzdHJpbmcpOiBQYXJzZWRQYXRoIHtcbiAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICBjb25zdCByZXQ6IFBhcnNlZFBhdGggPSB7IHJvb3Q6IFwiXCIsIGRpcjogXCJcIiwgYmFzZTogXCJcIiwgZXh0OiBcIlwiLCBuYW1lOiBcIlwiIH07XG4gIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJldDtcbiAgY29uc3QgaXNBYnNvbHV0ZSA9IHBhdGguY2hhckNvZGVBdCgwKSA9PT0gQ0hBUl9GT1JXQVJEX1NMQVNIO1xuICBsZXQgc3RhcnQ6IG51bWJlcjtcbiAgaWYgKGlzQWJzb2x1dGUpIHtcbiAgICByZXQucm9vdCA9IFwiL1wiO1xuICAgIHN0YXJ0ID0gMTtcbiAgfSBlbHNlIHtcbiAgICBzdGFydCA9IDA7XG4gIH1cbiAgbGV0IHN0YXJ0RG90ID0gLTE7XG4gIGxldCBzdGFydFBhcnQgPSAwO1xuICBsZXQgZW5kID0gLTE7XG4gIGxldCBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICBsZXQgaSA9IHBhdGgubGVuZ3RoIC0gMTtcblxuICAvLyBUcmFjayB0aGUgc3RhdGUgb2YgY2hhcmFjdGVycyAoaWYgYW55KSB3ZSBzZWUgYmVmb3JlIG91ciBmaXJzdCBkb3QgYW5kXG4gIC8vIGFmdGVyIGFueSBwYXRoIHNlcGFyYXRvciB3ZSBmaW5kXG4gIGxldCBwcmVEb3RTdGF0ZSA9IDA7XG5cbiAgLy8gR2V0IG5vbi1kaXIgaW5mb1xuICBmb3IgKDsgaSA+PSBzdGFydDsgLS1pKSB7XG4gICAgY29uc3QgY29kZSA9IHBhdGguY2hhckNvZGVBdChpKTtcbiAgICBpZiAoY29kZSA9PT0gQ0hBUl9GT1JXQVJEX1NMQVNIKSB7XG4gICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgcGF0aCBzZXBhcmF0b3IgdGhhdCB3YXMgbm90IHBhcnQgb2YgYSBzZXQgb2YgcGF0aFxuICAgICAgLy8gc2VwYXJhdG9ycyBhdCB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHN0b3Agbm93XG4gICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICBzdGFydFBhcnQgPSBpICsgMTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgIC8vIGV4dGVuc2lvblxuICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgICBlbmQgPSBpICsgMTtcbiAgICB9XG4gICAgaWYgKGNvZGUgPT09IENIQVJfRE9UKSB7XG4gICAgICAvLyBJZiB0aGlzIGlzIG91ciBmaXJzdCBkb3QsIG1hcmsgaXQgYXMgdGhlIHN0YXJ0IG9mIG91ciBleHRlbnNpb25cbiAgICAgIGlmIChzdGFydERvdCA9PT0gLTEpIHN0YXJ0RG90ID0gaTtcbiAgICAgIGVsc2UgaWYgKHByZURvdFN0YXRlICE9PSAxKSBwcmVEb3RTdGF0ZSA9IDE7XG4gICAgfSBlbHNlIGlmIChzdGFydERvdCAhPT0gLTEpIHtcbiAgICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgYW5kIG5vbi1wYXRoIHNlcGFyYXRvciBiZWZvcmUgb3VyIGRvdCwgc28gd2Ugc2hvdWxkXG4gICAgICAvLyBoYXZlIGEgZ29vZCBjaGFuY2UgYXQgaGF2aW5nIGEgbm9uLWVtcHR5IGV4dGVuc2lvblxuICAgICAgcHJlRG90U3RhdGUgPSAtMTtcbiAgICB9XG4gIH1cblxuICBpZiAoXG4gICAgc3RhcnREb3QgPT09IC0xIHx8XG4gICAgZW5kID09PSAtMSB8fFxuICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgY2hhcmFjdGVyIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZG90XG4gICAgcHJlRG90U3RhdGUgPT09IDAgfHxcbiAgICAvLyBUaGUgKHJpZ2h0LW1vc3QpIHRyaW1tZWQgcGF0aCBjb21wb25lbnQgaXMgZXhhY3RseSAnLi4nXG4gICAgKHByZURvdFN0YXRlID09PSAxICYmIHN0YXJ0RG90ID09PSBlbmQgLSAxICYmIHN0YXJ0RG90ID09PSBzdGFydFBhcnQgKyAxKVxuICApIHtcbiAgICBpZiAoZW5kICE9PSAtMSkge1xuICAgICAgaWYgKHN0YXJ0UGFydCA9PT0gMCAmJiBpc0Fic29sdXRlKSB7XG4gICAgICAgIHJldC5iYXNlID0gcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKDEsIGVuZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXQuYmFzZSA9IHJldC5uYW1lID0gcGF0aC5zbGljZShzdGFydFBhcnQsIGVuZCk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChzdGFydFBhcnQgPT09IDAgJiYgaXNBYnNvbHV0ZSkge1xuICAgICAgcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKDEsIHN0YXJ0RG90KTtcbiAgICAgIHJldC5iYXNlID0gcGF0aC5zbGljZSgxLCBlbmQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXQubmFtZSA9IHBhdGguc2xpY2Uoc3RhcnRQYXJ0LCBzdGFydERvdCk7XG4gICAgICByZXQuYmFzZSA9IHBhdGguc2xpY2Uoc3RhcnRQYXJ0LCBlbmQpO1xuICAgIH1cbiAgICByZXQuZXh0ID0gcGF0aC5zbGljZShzdGFydERvdCwgZW5kKTtcbiAgfVxuXG4gIGlmIChzdGFydFBhcnQgPiAwKSByZXQuZGlyID0gcGF0aC5zbGljZSgwLCBzdGFydFBhcnQgLSAxKTtcbiAgZWxzZSBpZiAoaXNBYnNvbHV0ZSkgcmV0LmRpciA9IFwiL1wiO1xuXG4gIHJldHVybiByZXQ7XG59XG5cbi8qKlxuICogQ29udmVydHMgYSBmaWxlIFVSTCB0byBhIHBhdGggc3RyaW5nLlxuICpcbiAqIGBgYHRzXG4gKiAgICAgIGltcG9ydCB7IGZyb21GaWxlVXJsIH0gZnJvbSBcIi4vcG9zaXgudHNcIjtcbiAqICAgICAgZnJvbUZpbGVVcmwoXCJmaWxlOi8vL2hvbWUvZm9vXCIpOyAvLyBcIi9ob21lL2Zvb1wiXG4gKiBgYGBcbiAqIEBwYXJhbSB1cmwgb2YgYSBmaWxlIFVSTFxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbUZpbGVVcmwodXJsOiBzdHJpbmcgfCBVUkwpOiBzdHJpbmcge1xuICB1cmwgPSB1cmwgaW5zdGFuY2VvZiBVUkwgPyB1cmwgOiBuZXcgVVJMKHVybCk7XG4gIGlmICh1cmwucHJvdG9jb2wgIT0gXCJmaWxlOlwiKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk11c3QgYmUgYSBmaWxlIFVSTC5cIik7XG4gIH1cbiAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChcbiAgICB1cmwucGF0aG5hbWUucmVwbGFjZSgvJSg/IVswLTlBLUZhLWZdezJ9KS9nLCBcIiUyNVwiKSxcbiAgKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHBhdGggc3RyaW5nIHRvIGEgZmlsZSBVUkwuXG4gKlxuICogYGBgdHNcbiAqICAgICAgaW1wb3J0IHsgdG9GaWxlVXJsIH0gZnJvbSBcIi4vcG9zaXgudHNcIjtcbiAqICAgICAgdG9GaWxlVXJsKFwiL2hvbWUvZm9vXCIpOyAvLyBuZXcgVVJMKFwiZmlsZTovLy9ob21lL2Zvb1wiKVxuICogYGBgXG4gKiBAcGFyYW0gcGF0aCB0byBjb252ZXJ0IHRvIGZpbGUgVVJMXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0ZpbGVVcmwocGF0aDogc3RyaW5nKTogVVJMIHtcbiAgaWYgKCFpc0Fic29sdXRlKHBhdGgpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk11c3QgYmUgYW4gYWJzb2x1dGUgcGF0aC5cIik7XG4gIH1cbiAgY29uc3QgdXJsID0gbmV3IFVSTChcImZpbGU6Ly8vXCIpO1xuICB1cmwucGF0aG5hbWUgPSBlbmNvZGVXaGl0ZXNwYWNlKFxuICAgIHBhdGgucmVwbGFjZSgvJS9nLCBcIiUyNVwiKS5yZXBsYWNlKC9cXFxcL2csIFwiJTVDXCIpLFxuICApO1xuICByZXR1cm4gdXJsO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGlEQUFpRDtBQUNqRCw2REFBNkQ7QUFDN0QscUNBQXFDO0FBR3JDLFNBQVMsUUFBUSxFQUFFLGtCQUFrQixRQUFRLGtCQUFrQjtBQUUvRCxTQUNFLE9BQU8sRUFDUCxVQUFVLEVBQ1YsZ0JBQWdCLEVBQ2hCLG9CQUFvQixFQUNwQixlQUFlLFFBQ1YsYUFBYTtBQUVwQixPQUFPLE1BQU0sTUFBTSxJQUFJO0FBQ3ZCLE9BQU8sTUFBTSxZQUFZLElBQUk7QUFFN0IsK0JBQStCO0FBQy9COzs7Q0FHQyxHQUNELE9BQU8sU0FBUyxRQUFRLEdBQUcsWUFBc0IsRUFBVTtJQUN6RCxJQUFJLGVBQWU7SUFDbkIsSUFBSSxtQkFBbUIsS0FBSztJQUU1QixJQUFLLElBQUksSUFBSSxhQUFhLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsa0JBQWtCLElBQUs7UUFDdkUsSUFBSTtRQUVKLElBQUksS0FBSyxHQUFHLE9BQU8sWUFBWSxDQUFDLEVBQUU7YUFDN0I7WUFDSCxtQ0FBbUM7WUFDbkMsTUFBTSxFQUFFLEtBQUksRUFBRSxHQUFHO1lBQ2pCLElBQUksT0FBTyxNQUFNLFFBQVEsWUFBWTtnQkFDbkMsTUFBTSxJQUFJLFVBQVUsMkNBQTJDO1lBQ2pFLENBQUM7WUFDRCxPQUFPLEtBQUssR0FBRztRQUNqQixDQUFDO1FBRUQsV0FBVztRQUVYLHFCQUFxQjtRQUNyQixJQUFJLEtBQUss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