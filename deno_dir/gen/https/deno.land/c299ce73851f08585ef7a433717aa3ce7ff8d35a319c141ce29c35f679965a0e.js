// Copyright the Browserify authors. MIT License.
// Ported from https://github.com/browserify/path-browserify/
// This module is browser compatible.
import { CHAR_BACKWARD_SLASH, CHAR_COLON, CHAR_DOT, CHAR_QUESTION_MARK } from "./_constants.ts";
import { _format, assertPath, encodeWhitespace, isPathSeparator, isWindowsDeviceRoot, normalizeString } from "./_util.ts";
import { assert } from "../_util/assert.ts";
export const sep = "\\";
export const delimiter = ";";
/**
 * Resolves path segments into a `path`
 * @param pathSegments to process to path
 */ export function resolve(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1; i--){
        let path;
        // deno-lint-ignore no-explicit-any
        const { Deno  } = globalThis;
        if (i >= 0) {
            path = pathSegments[i];
        } else if (!resolvedDevice) {
            if (typeof Deno?.cwd !== "function") {
                throw new TypeError("Resolved a drive-letter-less path without a CWD.");
            }
            path = Deno.cwd();
        } else {
            if (typeof Deno?.env?.get !== "function" || typeof Deno?.cwd !== "function") {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno.cwd();
            // Verify that a cwd was found and that it actually points
            // to our drive. If not, default to the drive's root.
            if (path === undefined || path.slice(0, 3).toLowerCase() !== `${resolvedDevice.toLowerCase()}\\`) {
                path = `${resolvedDevice}\\`;
            }
        }
        assertPath(path);
        const len = path.length;
        // Skip empty entries
        if (len === 0) continue;
        let rootEnd = 0;
        let device = "";
        let isAbsolute = false;
        const code = path.charCodeAt(0);
        // Try to match a root
        if (len > 1) {
            if (isPathSeparator(code)) {
                // Possible UNC root
                // If we started with a separator, we know we at least have an
                // absolute path of some kind (UNC or otherwise)
                isAbsolute = true;
                if (isPathSeparator(path.charCodeAt(1))) {
                    // Matched double path separator at beginning
                    let j = 2;
                    let last = j;
                    // Match 1 or more non-path separators
                    for(; j < len; ++j){
                        if (isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        const firstPart = path.slice(last, j);
                        // Matched!
                        last = j;
                        // Match 1 or more path separators
                        for(; j < len; ++j){
                            if (!isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j < len && j !== last) {
                            // Matched!
                            last = j;
                            // Match 1 or more non-path separators
                            for(; j < len; ++j){
                                if (isPathSeparator(path.charCodeAt(j))) break;
                            }
                            if (j === len) {
                                // We matched a UNC root only
                                device = `\\\\${firstPart}\\${path.slice(last)}`;
                                rootEnd = j;
                            } else if (j !== last) {
                                // We matched a UNC root with leftovers
                                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                                rootEnd = j;
                            }
                        }
                    }
                } else {
                    rootEnd = 1;
                }
            } else if (isWindowsDeviceRoot(code)) {
                // Possible device root
                if (path.charCodeAt(1) === CHAR_COLON) {
                    device = path.slice(0, 2);
                    rootEnd = 2;
                    if (len > 2) {
                        if (isPathSeparator(path.charCodeAt(2))) {
                            // Treat separator following drive name as an absolute path
                            // indicator
                            isAbsolute = true;
                            rootEnd = 3;
                        }
                    }
                }
            }
        } else if (isPathSeparator(code)) {
            // `path` contains just a path separator
            rootEnd = 1;
            isAbsolute = true;
        }
        if (device.length > 0 && resolvedDevice.length > 0 && device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
        }
        if (resolvedDevice.length === 0 && device.length > 0) {
            resolvedDevice = device;
        }
        if (!resolvedAbsolute) {
            resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
            resolvedAbsolute = isAbsolute;
        }
        if (resolvedAbsolute && resolvedDevice.length > 0) break;
    }
    // At this point the path should be resolved to a full absolute path,
    // but handle relative paths to be safe (might happen when process.cwd()
    // fails)
    // Normalize the tail path
    resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
    return resolvedDevice + (resolvedAbsolute ? "\\" : "") + resolvedTail || ".";
}
/**
 * Normalizes a `path`
 * @param path to normalize
 */ export function normalize(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = 0;
    let device;
    let isAbsolute = false;
    const code = path.charCodeAt(0);
    // Try to match a root
    if (len > 1) {
        if (isPathSeparator(code)) {
            // Possible UNC root
            // If we started with a separator, we know we at least have an absolute
            // path of some kind (UNC or otherwise)
            isAbsolute = true;
            if (isPathSeparator(path.charCodeAt(1))) {
                // Matched double path separator at beginning
                let j = 2;
                let last = j;
                // Match 1 or more non-path separators
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    const firstPart = path.slice(last, j);
                    // Matched!
                    last = j;
                    // Match 1 or more path separators
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        // Matched!
                        last = j;
                        // Match 1 or more non-path separators
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            // We matched a UNC root only
                            // Return the normalized version of the UNC root since there
                            // is nothing left to process
                            return `\\\\${firstPart}\\${path.slice(last)}\\`;
                        } else if (j !== last) {
                            // We matched a UNC root with leftovers
                            device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                            rootEnd = j;
                        }
                    }
                }
            } else {
                rootEnd = 1;
            }
        } else if (isWindowsDeviceRoot(code)) {
            // Possible device root
            if (path.charCodeAt(1) === CHAR_COLON) {
                device = path.slice(0, 2);
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        // Treat separator following drive name as an absolute path
                        // indicator
                        isAbsolute = true;
                        rootEnd = 3;
                    }
                }
            }
        }
    } else if (isPathSeparator(code)) {
        // `path` contains just a path separator, exit early to avoid unnecessary
        // work
        return "\\";
    }
    let tail;
    if (rootEnd < len) {
        tail = normalizeString(path.slice(rootEnd), !isAbsolute, "\\", isPathSeparator);
    } else {
        tail = "";
    }
    if (tail.length === 0 && !isAbsolute) tail = ".";
    if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
        tail += "\\";
    }
    if (device === undefined) {
        if (isAbsolute) {
            if (tail.length > 0) return `\\${tail}`;
            else return "\\";
        } else if (tail.length > 0) {
            return tail;
        } else {
            return "";
        }
    } else if (isAbsolute) {
        if (tail.length > 0) return `${device}\\${tail}`;
        else return `${device}\\`;
    } else if (tail.length > 0) {
        return device + tail;
    } else {
        return device;
    }
}
/**
 * Verifies whether path is absolute
 * @param path to verify
 */ export function isAbsolute(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return false;
    const code = path.charCodeAt(0);
    if (isPathSeparator(code)) {
        return true;
    } else if (isWindowsDeviceRoot(code)) {
        // Possible device root
        if (len > 2 && path.charCodeAt(1) === CHAR_COLON) {
            if (isPathSeparator(path.charCodeAt(2))) return true;
        }
    }
    return false;
}
/**
 * Join all given a sequence of `paths`,then normalizes the resulting path.
 * @param paths to be joined and normalized
 */ export function join(...paths) {
    const pathsCount = paths.length;
    if (pathsCount === 0) return ".";
    let joined;
    let firstPart = null;
    for(let i = 0; i < pathsCount; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (joined === undefined) joined = firstPart = path;
            else joined += `\\${path}`;
        }
    }
    if (joined === undefined) return ".";
    // Make sure that the joined path doesn't start with two slashes, because
    // normalize() will mistake it for an UNC path then.
    //
    // This step is skipped when it is very clear that the user actually
    // intended to point at an UNC path. This is assumed when the first
    // non-empty string arguments starts with exactly two slashes followed by
    // at least one more non-slash character.
    //
    // Note that for normalize() to treat a path as an UNC path it needs to
    // have at least 2 components, so we don't filter for that here.
    // This means that the user can use join to construct UNC paths from
    // a server name and a share name; for example:
    //   path.join('//server', 'share') -> '\\\\server\\share\\')
    let needsReplace = true;
    let slashCount = 0;
    assert(firstPart != null);
    if (isPathSeparator(firstPart.charCodeAt(0))) {
        ++slashCount;
        const firstLen = firstPart.length;
        if (firstLen > 1) {
            if (isPathSeparator(firstPart.charCodeAt(1))) {
                ++slashCount;
                if (firstLen > 2) {
                    if (isPathSeparator(firstPart.charCodeAt(2))) ++slashCount;
                    else {
                        // We matched a UNC path in the first part
                        needsReplace = false;
                    }
                }
            }
        }
    }
    if (needsReplace) {
        // Find any more consecutive slashes we need to replace
        for(; slashCount < joined.length; ++slashCount){
            if (!isPathSeparator(joined.charCodeAt(slashCount))) break;
        }
        // Replace the slashes if needed
        if (slashCount >= 2) joined = `\\${joined.slice(slashCount)}`;
    }
    return normalize(joined);
}
/**
 * It will solve the relative path from `from` to `to`, for instance:
 *  from = 'C:\\orandea\\test\\aaa'
 *  to = 'C:\\orandea\\impl\\bbb'
 * The output of the function should be: '..\\..\\impl\\bbb'
 * @param from relative path
 * @param to relative path
 */ export function relative(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    const fromOrig = resolve(from);
    const toOrig = resolve(to);
    if (fromOrig === toOrig) return "";
    from = fromOrig.toLowerCase();
    to = toOrig.toLowerCase();
    if (from === to) return "";
    // Trim any leading backslashes
    let fromStart = 0;
    let fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (from.charCodeAt(fromStart) !== CHAR_BACKWARD_SLASH) break;
    }
    // Trim trailing backslashes (applicable to UNC paths only)
    for(; fromEnd - 1 > fromStart; --fromEnd){
        if (from.charCodeAt(fromEnd - 1) !== CHAR_BACKWARD_SLASH) break;
    }
    const fromLen = fromEnd - fromStart;
    // Trim any leading backslashes
    let toStart = 0;
    let toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (to.charCodeAt(toStart) !== CHAR_BACKWARD_SLASH) break;
    }
    // Trim trailing backslashes (applicable to UNC paths only)
    for(; toEnd - 1 > toStart; --toEnd){
        if (to.charCodeAt(toEnd - 1) !== CHAR_BACKWARD_SLASH) break;
    }
    const toLen = toEnd - toStart;
    // Compare paths to find the longest common path from root
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
                    // We get here if `from` is the exact base path for `to`.
                    // For example: from='C:\\foo\\bar'; to='C:\\foo\\bar\\baz'
                    return toOrig.slice(toStart + i + 1);
                } else if (i === 2) {
                    // We get here if `from` is the device root.
                    // For example: from='C:\\'; to='C:\\foo'
                    return toOrig.slice(toStart + i);
                }
            }
            if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH) {
                    // We get here if `to` is the exact base path for `from`.
                    // For example: from='C:\\foo\\bar'; to='C:\\foo'
                    lastCommonSep = i;
                } else if (i === 2) {
                    // We get here if `to` is the device root.
                    // For example: from='C:\\foo\\bar'; to='C:\\'
                    lastCommonSep = 3;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (fromCode === CHAR_BACKWARD_SLASH) lastCommonSep = i;
    }
    // We found a mismatch before the first common path separator was seen, so
    // return the original `to`.
    if (i !== length && lastCommonSep === -1) {
        return toOrig;
    }
    let out = "";
    if (lastCommonSep === -1) lastCommonSep = 0;
    // Generate the relative path based on the path difference between `to` and
    // `from`
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
            if (out.length === 0) out += "..";
            else out += "\\..";
        }
    }
    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0) {
        return out + toOrig.slice(toStart + lastCommonSep, toEnd);
    } else {
        toStart += lastCommonSep;
        if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) ++toStart;
        return toOrig.slice(toStart, toEnd);
    }
}
/**
 * Resolves path to a namespace path
 * @param path to resolve to namespace
 */ export function toNamespacedPath(path) {
    // Note: this will *probably* throw somewhere.
    if (typeof path !== "string") return path;
    if (path.length === 0) return "";
    const resolvedPath = resolve(path);
    if (resolvedPath.length >= 3) {
        if (resolvedPath.charCodeAt(0) === CHAR_BACKWARD_SLASH) {
            // Possible UNC root
            if (resolvedPath.charCodeAt(1) === CHAR_BACKWARD_SLASH) {
                const code = resolvedPath.charCodeAt(2);
                if (code !== CHAR_QUESTION_MARK && code !== CHAR_DOT) {
                    // Matched non-long UNC root, convert the path to a long UNC path
                    return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
                }
            }
        } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0))) {
            // Possible device root
            if (resolvedPath.charCodeAt(1) === CHAR_COLON && resolvedPath.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
                // Matched device root, convert the path to a long UNC path
                return `\\\\?\\${resolvedPath}`;
            }
        }
    }
    return path;
}
/**
 * Return the directory name of a `path`.
 * @param path to determine name for
 */ export function dirname(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = -1;
    let end = -1;
    let matchedSlash = true;
    let offset = 0;
    const code = path.charCodeAt(0);
    // Try to match a root
    if (len > 1) {
        if (isPathSeparator(code)) {
            // Possible UNC root
            rootEnd = offset = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                // Matched double path separator at beginning
                let j = 2;
                let last = j;
                // Match 1 or more non-path separators
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    // Matched!
                    last = j;
                    // Match 1 or more path separators
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        // Matched!
                        last = j;
                        // Match 1 or more non-path separators
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            // We matched a UNC root only
                            return path;
                        }
                        if (j !== last) {
                            // We matched a UNC root with leftovers
                            // Offset by 1 to include the separator after the UNC root to
                            // treat it as a "normal root" on top of a (UNC) root
                            rootEnd = offset = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code)) {
            // Possible device root
            if (path.charCodeAt(1) === CHAR_COLON) {
                rootEnd = offset = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) rootEnd = offset = 3;
                }
            }
        }
    } else if (isPathSeparator(code)) {
        // `path` contains just a path separator, exit early to avoid
        // unnecessary work
        return path;
    }
    for(let i = len - 1; i >= offset; --i){
        if (isPathSeparator(path.charCodeAt(i))) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            // We saw the first non-path separator
            matchedSlash = false;
        }
    }
    if (end === -1) {
        if (rootEnd === -1) return ".";
        else end = rootEnd;
    }
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
    // Check for a drive letter prefix so as not to mistake the following
    // path separator as an extra separator at the end of the path that can be
    // disregarded
    if (path.length >= 2) {
        const drive = path.charCodeAt(0);
        if (isWindowsDeviceRoot(drive)) {
            if (path.charCodeAt(1) === CHAR_COLON) start = 2;
        }
    }
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) return "";
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for(i = path.length - 1; i >= start; --i){
            const code = path.charCodeAt(i);
            if (isPathSeparator(code)) {
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
        for(i = path.length - 1; i >= start; --i){
            if (isPathSeparator(path.charCodeAt(i))) {
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
    let start = 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    let preDotState = 0;
    // Check for a drive letter prefix so as not to mistake the following
    // path separator as an extra separator at the end of the path that can be
    // disregarded
    if (path.length >= 2 && path.charCodeAt(1) === CHAR_COLON && isWindowsDeviceRoot(path.charCodeAt(0))) {
        start = startPart = 2;
    }
    for(let i = path.length - 1; i >= start; --i){
        const code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
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
    (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)) {
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
    return _format("\\", pathObject);
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
    const len = path.length;
    if (len === 0) return ret;
    let rootEnd = 0;
    let code = path.charCodeAt(0);
    // Try to match a root
    if (len > 1) {
        if (isPathSeparator(code)) {
            // Possible UNC root
            rootEnd = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                // Matched double path separator at beginning
                let j = 2;
                let last = j;
                // Match 1 or more non-path separators
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    // Matched!
                    last = j;
                    // Match 1 or more path separators
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        // Matched!
                        last = j;
                        // Match 1 or more non-path separators
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            // We matched a UNC root only
                            rootEnd = j;
                        } else if (j !== last) {
                            // We matched a UNC root with leftovers
                            rootEnd = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code)) {
            // Possible device root
            if (path.charCodeAt(1) === CHAR_COLON) {
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        if (len === 3) {
                            // `path` contains just a drive root, exit early to avoid
                            // unnecessary work
                            ret.root = ret.dir = path;
                            return ret;
                        }
                        rootEnd = 3;
                    }
                } else {
                    // `path` contains just a drive root, exit early to avoid
                    // unnecessary work
                    ret.root = ret.dir = path;
                    return ret;
                }
            }
        }
    } else if (isPathSeparator(code)) {
        // `path` contains just a path separator, exit early to avoid
        // unnecessary work
        ret.root = ret.dir = path;
        return ret;
    }
    if (rootEnd > 0) ret.root = path.slice(0, rootEnd);
    let startDot = -1;
    let startPart = rootEnd;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    let preDotState = 0;
    // Get non-dir info
    for(; i >= rootEnd; --i){
        code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
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
    (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)) {
        if (end !== -1) {
            ret.base = ret.name = path.slice(startPart, end);
        }
    } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
        ret.ext = path.slice(startDot, end);
    }
    // If the directory is the root, use the entire root as the `dir` including
    // the trailing slash if any (`C:\abc` -> `C:\`). Otherwise, strip out the
    // trailing slash (`C:\abc\def` -> `C:\abc`).
    if (startPart > 0 && startPart !== rootEnd) {
        ret.dir = path.slice(0, startPart - 1);
    } else ret.dir = ret.root;
    return ret;
}
/**
 * Converts a file URL to a path string.
 *
 * ```ts
 *      import { fromFileUrl } from "./win32.ts";
 *      fromFileUrl("file:///home/foo"); // "\\home\\foo"
 *      fromFileUrl("file:///C:/Users/foo"); // "C:\\Users\\foo"
 *      fromFileUrl("file://localhost/home/foo"); // "\\\\localhost\\home\\foo"
 * ```
 * @param url of a file URL
 */ export function fromFileUrl(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    let path = decodeURIComponent(url.pathname.replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25")).replace(/^\\*([A-Za-z]:)(\\|$)/, "$1\\");
    if (url.hostname != "") {
        // Note: The `URL` implementation guarantees that the drive letter and
        // hostname are mutually exclusive. Otherwise it would not have been valid
        // to append the hostname and path like this.
        path = `\\\\${url.hostname}${path}`;
    }
    return path;
}
/**
 * Converts a path string to a file URL.
 *
 * ```ts
 *      import { toFileUrl } from "./win32.ts";
 *      toFileUrl("\\home\\foo"); // new URL("file:///home/foo")
 *      toFileUrl("C:\\Users\\foo"); // new URL("file:///C:/Users/foo")
 *      toFileUrl("\\\\127.0.0.1\\home\\foo"); // new URL("file://127.0.0.1/home/foo")
 * ```
 * @param path to convert to file URL
 */ export function toFileUrl(path) {
    if (!isAbsolute(path)) {
        throw new TypeError("Must be an absolute path.");
    }
    const [, hostname, pathname] = path.match(/^(?:[/\\]{2}([^/\\]+)(?=[/\\](?:[^/\\]|$)))?(.*)/);
    const url = new URL("file:///");
    url.pathname = encodeWhitespace(pathname.replace(/%/g, "%25"));
    if (hostname != null && hostname != "localhost") {
        url.hostname = hostname;
        if (!url.hostname) {
            throw new TypeError("Invalid hostname.");
        }
    }
    return url;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL3BhdGgvd2luMzIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IHRoZSBCcm93c2VyaWZ5IGF1dGhvcnMuIE1JVCBMaWNlbnNlLlxuLy8gUG9ydGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Jyb3dzZXJpZnkvcGF0aC1icm93c2VyaWZ5L1xuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgdHlwZSB7IEZvcm1hdElucHV0UGF0aE9iamVjdCwgUGFyc2VkUGF0aCB9IGZyb20gXCIuL19pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7XG4gIENIQVJfQkFDS1dBUkRfU0xBU0gsXG4gIENIQVJfQ09MT04sXG4gIENIQVJfRE9ULFxuICBDSEFSX1FVRVNUSU9OX01BUkssXG59IGZyb20gXCIuL19jb25zdGFudHMudHNcIjtcblxuaW1wb3J0IHtcbiAgX2Zvcm1hdCxcbiAgYXNzZXJ0UGF0aCxcbiAgZW5jb2RlV2hpdGVzcGFjZSxcbiAgaXNQYXRoU2VwYXJhdG9yLFxuICBpc1dpbmRvd3NEZXZpY2VSb290LFxuICBub3JtYWxpemVTdHJpbmcsXG59IGZyb20gXCIuL191dGlsLnRzXCI7XG5pbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiLi4vX3V0aWwvYXNzZXJ0LnRzXCI7XG5cbmV4cG9ydCBjb25zdCBzZXAgPSBcIlxcXFxcIjtcbmV4cG9ydCBjb25zdCBkZWxpbWl0ZXIgPSBcIjtcIjtcblxuLyoqXG4gKiBSZXNvbHZlcyBwYXRoIHNlZ21lbnRzIGludG8gYSBgcGF0aGBcbiAqIEBwYXJhbSBwYXRoU2VnbWVudHMgdG8gcHJvY2VzcyB0byBwYXRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlKC4uLnBhdGhTZWdtZW50czogc3RyaW5nW10pOiBzdHJpbmcge1xuICBsZXQgcmVzb2x2ZWREZXZpY2UgPSBcIlwiO1xuICBsZXQgcmVzb2x2ZWRUYWlsID0gXCJcIjtcbiAgbGV0IHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKGxldCBpID0gcGF0aFNlZ21lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTE7IGktLSkge1xuICAgIGxldCBwYXRoOiBzdHJpbmc7XG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCB7IERlbm8gfSA9IGdsb2JhbFRoaXMgYXMgYW55O1xuICAgIGlmIChpID49IDApIHtcbiAgICAgIHBhdGggPSBwYXRoU2VnbWVudHNbaV07XG4gICAgfSBlbHNlIGlmICghcmVzb2x2ZWREZXZpY2UpIHtcbiAgICAgIGlmICh0eXBlb2YgRGVubz8uY3dkICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlJlc29sdmVkIGEgZHJpdmUtbGV0dGVyLWxlc3MgcGF0aCB3aXRob3V0IGEgQ1dELlwiKTtcbiAgICAgIH1cbiAgICAgIHBhdGggPSBEZW5vLmN3ZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoXG4gICAgICAgIHR5cGVvZiBEZW5vPy5lbnY/LmdldCAhPT0gXCJmdW5jdGlvblwiIHx8IHR5cGVvZiBEZW5vPy5jd2QgIT09IFwiZnVuY3Rpb25cIlxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJSZXNvbHZlZCBhIHJlbGF0aXZlIHBhdGggd2l0aG91dCBhIENXRC5cIik7XG4gICAgICB9XG4gICAgICBwYXRoID0gRGVuby5jd2QoKTtcblxuICAgICAgLy8gVmVyaWZ5IHRoYXQgYSBjd2Qgd2FzIGZvdW5kIGFuZCB0aGF0IGl0IGFjdHVhbGx5IHBvaW50c1xuICAgICAgLy8gdG8gb3VyIGRyaXZlLiBJZiBub3QsIGRlZmF1bHQgdG8gdGhlIGRyaXZlJ3Mgcm9vdC5cbiAgICAgIGlmIChcbiAgICAgICAgcGF0aCA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIHBhdGguc2xpY2UoMCwgMykudG9Mb3dlckNhc2UoKSAhPT0gYCR7cmVzb2x2ZWREZXZpY2UudG9Mb3dlckNhc2UoKX1cXFxcYFxuICAgICAgKSB7XG4gICAgICAgIHBhdGggPSBgJHtyZXNvbHZlZERldmljZX1cXFxcYDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gICAgY29uc3QgbGVuID0gcGF0aC5sZW5ndGg7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGVudHJpZXNcbiAgICBpZiAobGVuID09PSAwKSBjb250aW51ZTtcblxuICAgIGxldCByb290RW5kID0gMDtcbiAgICBsZXQgZGV2aWNlID0gXCJcIjtcbiAgICBsZXQgaXNBYnNvbHV0ZSA9IGZhbHNlO1xuICAgIGNvbnN0IGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoMCk7XG5cbiAgICAvLyBUcnkgdG8gbWF0Y2ggYSByb290XG4gICAgaWYgKGxlbiA+IDEpIHtcbiAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAgICAgLy8gUG9zc2libGUgVU5DIHJvb3RcblxuICAgICAgICAvLyBJZiB3ZSBzdGFydGVkIHdpdGggYSBzZXBhcmF0b3IsIHdlIGtub3cgd2UgYXQgbGVhc3QgaGF2ZSBhblxuICAgICAgICAvLyBhYnNvbHV0ZSBwYXRoIG9mIHNvbWUga2luZCAoVU5DIG9yIG90aGVyd2lzZSlcbiAgICAgICAgaXNBYnNvbHV0ZSA9IHRydWU7XG5cbiAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoMSkpKSB7XG4gICAgICAgICAgLy8gTWF0Y2hlZCBkb3VibGUgcGF0aCBzZXBhcmF0b3IgYXQgYmVnaW5uaW5nXG4gICAgICAgICAgbGV0IGogPSAyO1xuICAgICAgICAgIGxldCBsYXN0ID0gajtcbiAgICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgbm9uLXBhdGggc2VwYXJhdG9yc1xuICAgICAgICAgIGZvciAoOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChqIDwgbGVuICYmIGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0UGFydCA9IHBhdGguc2xpY2UobGFzdCwgaik7XG4gICAgICAgICAgICAvLyBNYXRjaGVkIVxuICAgICAgICAgICAgbGFzdCA9IGo7XG4gICAgICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICAgIGlmICghaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChqKSkpIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGogPCBsZW4gJiYgaiAhPT0gbGFzdCkge1xuICAgICAgICAgICAgICAvLyBNYXRjaGVkIVxuICAgICAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAgICAgLy8gTWF0Y2ggMSBvciBtb3JlIG5vbi1wYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGogPT09IGxlbikge1xuICAgICAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgYSBVTkMgcm9vdCBvbmx5XG4gICAgICAgICAgICAgICAgZGV2aWNlID0gYFxcXFxcXFxcJHtmaXJzdFBhcnR9XFxcXCR7cGF0aC5zbGljZShsYXN0KX1gO1xuICAgICAgICAgICAgICAgIHJvb3RFbmQgPSBqO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBtYXRjaGVkIGEgVU5DIHJvb3Qgd2l0aCBsZWZ0b3ZlcnNcblxuICAgICAgICAgICAgICAgIGRldmljZSA9IGBcXFxcXFxcXCR7Zmlyc3RQYXJ0fVxcXFwke3BhdGguc2xpY2UobGFzdCwgail9YDtcbiAgICAgICAgICAgICAgICByb290RW5kID0gajtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByb290RW5kID0gMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc1dpbmRvd3NEZXZpY2VSb290KGNvZGUpKSB7XG4gICAgICAgIC8vIFBvc3NpYmxlIGRldmljZSByb290XG5cbiAgICAgICAgaWYgKHBhdGguY2hhckNvZGVBdCgxKSA9PT0gQ0hBUl9DT0xPTikge1xuICAgICAgICAgIGRldmljZSA9IHBhdGguc2xpY2UoMCwgMik7XG4gICAgICAgICAgcm9vdEVuZCA9IDI7XG4gICAgICAgICAgaWYgKGxlbiA+IDIpIHtcbiAgICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KDIpKSkge1xuICAgICAgICAgICAgICAvLyBUcmVhdCBzZXBhcmF0b3IgZm9sbG93aW5nIGRyaXZlIG5hbWUgYXMgYW4gYWJzb2x1dGUgcGF0aFxuICAgICAgICAgICAgICAvLyBpbmRpY2F0b3JcbiAgICAgICAgICAgICAgaXNBYnNvbHV0ZSA9IHRydWU7XG4gICAgICAgICAgICAgIHJvb3RFbmQgPSAzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAvLyBgcGF0aGAgY29udGFpbnMganVzdCBhIHBhdGggc2VwYXJhdG9yXG4gICAgICByb290RW5kID0gMTtcbiAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIGRldmljZS5sZW5ndGggPiAwICYmXG4gICAgICByZXNvbHZlZERldmljZS5sZW5ndGggPiAwICYmXG4gICAgICBkZXZpY2UudG9Mb3dlckNhc2UoKSAhPT0gcmVzb2x2ZWREZXZpY2UudG9Mb3dlckNhc2UoKVxuICAgICkge1xuICAgICAgLy8gVGhpcyBwYXRoIHBvaW50cyB0byBhbm90aGVyIGRldmljZSBzbyBpdCBpcyBub3QgYXBwbGljYWJsZVxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHJlc29sdmVkRGV2aWNlLmxlbmd0aCA9PT0gMCAmJiBkZXZpY2UubGVuZ3RoID4gMCkge1xuICAgICAgcmVzb2x2ZWREZXZpY2UgPSBkZXZpY2U7XG4gICAgfVxuICAgIGlmICghcmVzb2x2ZWRBYnNvbHV0ZSkge1xuICAgICAgcmVzb2x2ZWRUYWlsID0gYCR7cGF0aC5zbGljZShyb290RW5kKX1cXFxcJHtyZXNvbHZlZFRhaWx9YDtcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBpc0Fic29sdXRlO1xuICAgIH1cblxuICAgIGlmIChyZXNvbHZlZEFic29sdXRlICYmIHJlc29sdmVkRGV2aWNlLmxlbmd0aCA+IDApIGJyZWFrO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsXG4gIC8vIGJ1dCBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKVxuICAvLyBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHRhaWwgcGF0aFxuICByZXNvbHZlZFRhaWwgPSBub3JtYWxpemVTdHJpbmcoXG4gICAgcmVzb2x2ZWRUYWlsLFxuICAgICFyZXNvbHZlZEFic29sdXRlLFxuICAgIFwiXFxcXFwiLFxuICAgIGlzUGF0aFNlcGFyYXRvcixcbiAgKTtcblxuICByZXR1cm4gcmVzb2x2ZWREZXZpY2UgKyAocmVzb2x2ZWRBYnNvbHV0ZSA/IFwiXFxcXFwiIDogXCJcIikgKyByZXNvbHZlZFRhaWwgfHwgXCIuXCI7XG59XG5cbi8qKlxuICogTm9ybWFsaXplcyBhIGBwYXRoYFxuICogQHBhcmFtIHBhdGggdG8gbm9ybWFsaXplXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgY29uc3QgbGVuID0gcGF0aC5sZW5ndGg7XG4gIGlmIChsZW4gPT09IDApIHJldHVybiBcIi5cIjtcbiAgbGV0IHJvb3RFbmQgPSAwO1xuICBsZXQgZGV2aWNlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGxldCBpc0Fic29sdXRlID0gZmFsc2U7XG4gIGNvbnN0IGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoMCk7XG5cbiAgLy8gVHJ5IHRvIG1hdGNoIGEgcm9vdFxuICBpZiAobGVuID4gMSkge1xuICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAgIC8vIFBvc3NpYmxlIFVOQyByb290XG5cbiAgICAgIC8vIElmIHdlIHN0YXJ0ZWQgd2l0aCBhIHNlcGFyYXRvciwgd2Uga25vdyB3ZSBhdCBsZWFzdCBoYXZlIGFuIGFic29sdXRlXG4gICAgICAvLyBwYXRoIG9mIHNvbWUga2luZCAoVU5DIG9yIG90aGVyd2lzZSlcbiAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuXG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgxKSkpIHtcbiAgICAgICAgLy8gTWF0Y2hlZCBkb3VibGUgcGF0aCBzZXBhcmF0b3IgYXQgYmVnaW5uaW5nXG4gICAgICAgIGxldCBqID0gMjtcbiAgICAgICAgbGV0IGxhc3QgPSBqO1xuICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgbm9uLXBhdGggc2VwYXJhdG9yc1xuICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaiA8IGxlbiAmJiBqICE9PSBsYXN0KSB7XG4gICAgICAgICAgY29uc3QgZmlyc3RQYXJ0ID0gcGF0aC5zbGljZShsYXN0LCBqKTtcbiAgICAgICAgICAvLyBNYXRjaGVkIVxuICAgICAgICAgIGxhc3QgPSBqO1xuICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBwYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICBpZiAoIWlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGogPCBsZW4gJiYgaiAhPT0gbGFzdCkge1xuICAgICAgICAgICAgLy8gTWF0Y2hlZCFcbiAgICAgICAgICAgIGxhc3QgPSBqO1xuICAgICAgICAgICAgLy8gTWF0Y2ggMSBvciBtb3JlIG5vbi1wYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICAgIGZvciAoOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChqID09PSBsZW4pIHtcbiAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IG9ubHlcbiAgICAgICAgICAgICAgLy8gUmV0dXJuIHRoZSBub3JtYWxpemVkIHZlcnNpb24gb2YgdGhlIFVOQyByb290IHNpbmNlIHRoZXJlXG4gICAgICAgICAgICAgIC8vIGlzIG5vdGhpbmcgbGVmdCB0byBwcm9jZXNzXG5cbiAgICAgICAgICAgICAgcmV0dXJuIGBcXFxcXFxcXCR7Zmlyc3RQYXJ0fVxcXFwke3BhdGguc2xpY2UobGFzdCl9XFxcXGA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IHdpdGggbGVmdG92ZXJzXG5cbiAgICAgICAgICAgICAgZGV2aWNlID0gYFxcXFxcXFxcJHtmaXJzdFBhcnR9XFxcXCR7cGF0aC5zbGljZShsYXN0LCBqKX1gO1xuICAgICAgICAgICAgICByb290RW5kID0gajtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3RFbmQgPSAxO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dzRGV2aWNlUm9vdChjb2RlKSkge1xuICAgICAgLy8gUG9zc2libGUgZGV2aWNlIHJvb3RcblxuICAgICAgaWYgKHBhdGguY2hhckNvZGVBdCgxKSA9PT0gQ0hBUl9DT0xPTikge1xuICAgICAgICBkZXZpY2UgPSBwYXRoLnNsaWNlKDAsIDIpO1xuICAgICAgICByb290RW5kID0gMjtcbiAgICAgICAgaWYgKGxlbiA+IDIpIHtcbiAgICAgICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgyKSkpIHtcbiAgICAgICAgICAgIC8vIFRyZWF0IHNlcGFyYXRvciBmb2xsb3dpbmcgZHJpdmUgbmFtZSBhcyBhbiBhYnNvbHV0ZSBwYXRoXG4gICAgICAgICAgICAvLyBpbmRpY2F0b3JcbiAgICAgICAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuICAgICAgICAgICAgcm9vdEVuZCA9IDM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzUGF0aFNlcGFyYXRvcihjb2RlKSkge1xuICAgIC8vIGBwYXRoYCBjb250YWlucyBqdXN0IGEgcGF0aCBzZXBhcmF0b3IsIGV4aXQgZWFybHkgdG8gYXZvaWQgdW5uZWNlc3NhcnlcbiAgICAvLyB3b3JrXG4gICAgcmV0dXJuIFwiXFxcXFwiO1xuICB9XG5cbiAgbGV0IHRhaWw6IHN0cmluZztcbiAgaWYgKHJvb3RFbmQgPCBsZW4pIHtcbiAgICB0YWlsID0gbm9ybWFsaXplU3RyaW5nKFxuICAgICAgcGF0aC5zbGljZShyb290RW5kKSxcbiAgICAgICFpc0Fic29sdXRlLFxuICAgICAgXCJcXFxcXCIsXG4gICAgICBpc1BhdGhTZXBhcmF0b3IsXG4gICAgKTtcbiAgfSBlbHNlIHtcbiAgICB0YWlsID0gXCJcIjtcbiAgfVxuICBpZiAodGFpbC5sZW5ndGggPT09IDAgJiYgIWlzQWJzb2x1dGUpIHRhaWwgPSBcIi5cIjtcbiAgaWYgKHRhaWwubGVuZ3RoID4gMCAmJiBpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGxlbiAtIDEpKSkge1xuICAgIHRhaWwgKz0gXCJcXFxcXCI7XG4gIH1cbiAgaWYgKGRldmljZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGlzQWJzb2x1dGUpIHtcbiAgICAgIGlmICh0YWlsLmxlbmd0aCA+IDApIHJldHVybiBgXFxcXCR7dGFpbH1gO1xuICAgICAgZWxzZSByZXR1cm4gXCJcXFxcXCI7XG4gICAgfSBlbHNlIGlmICh0YWlsLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB0YWlsO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNBYnNvbHV0ZSkge1xuICAgIGlmICh0YWlsLmxlbmd0aCA+IDApIHJldHVybiBgJHtkZXZpY2V9XFxcXCR7dGFpbH1gO1xuICAgIGVsc2UgcmV0dXJuIGAke2RldmljZX1cXFxcYDtcbiAgfSBlbHNlIGlmICh0YWlsLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gZGV2aWNlICsgdGFpbDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZGV2aWNlO1xuICB9XG59XG5cbi8qKlxuICogVmVyaWZpZXMgd2hldGhlciBwYXRoIGlzIGFic29sdXRlXG4gKiBAcGFyYW0gcGF0aCB0byB2ZXJpZnlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQWJzb2x1dGUocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGFzc2VydFBhdGgocGF0aCk7XG4gIGNvbnN0IGxlbiA9IHBhdGgubGVuZ3RoO1xuICBpZiAobGVuID09PSAwKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgY29kZSA9IHBhdGguY2hhckNvZGVBdCgwKTtcbiAgaWYgKGlzUGF0aFNlcGFyYXRvcihjb2RlKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzV2luZG93c0RldmljZVJvb3QoY29kZSkpIHtcbiAgICAvLyBQb3NzaWJsZSBkZXZpY2Ugcm9vdFxuXG4gICAgaWYgKGxlbiA+IDIgJiYgcGF0aC5jaGFyQ29kZUF0KDEpID09PSBDSEFSX0NPTE9OKSB7XG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgyKSkpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogSm9pbiBhbGwgZ2l2ZW4gYSBzZXF1ZW5jZSBvZiBgcGF0aHNgLHRoZW4gbm9ybWFsaXplcyB0aGUgcmVzdWx0aW5nIHBhdGguXG4gKiBAcGFyYW0gcGF0aHMgdG8gYmUgam9pbmVkIGFuZCBub3JtYWxpemVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqb2luKC4uLnBhdGhzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIGNvbnN0IHBhdGhzQ291bnQgPSBwYXRocy5sZW5ndGg7XG4gIGlmIChwYXRoc0NvdW50ID09PSAwKSByZXR1cm4gXCIuXCI7XG5cbiAgbGV0IGpvaW5lZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBsZXQgZmlyc3RQYXJ0OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXRoc0NvdW50OyArK2kpIHtcbiAgICBjb25zdCBwYXRoID0gcGF0aHNbaV07XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgICBpZiAocGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICBpZiAoam9pbmVkID09PSB1bmRlZmluZWQpIGpvaW5lZCA9IGZpcnN0UGFydCA9IHBhdGg7XG4gICAgICBlbHNlIGpvaW5lZCArPSBgXFxcXCR7cGF0aH1gO1xuICAgIH1cbiAgfVxuXG4gIGlmIChqb2luZWQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIFwiLlwiO1xuXG4gIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBqb2luZWQgcGF0aCBkb2Vzbid0IHN0YXJ0IHdpdGggdHdvIHNsYXNoZXMsIGJlY2F1c2VcbiAgLy8gbm9ybWFsaXplKCkgd2lsbCBtaXN0YWtlIGl0IGZvciBhbiBVTkMgcGF0aCB0aGVuLlxuICAvL1xuICAvLyBUaGlzIHN0ZXAgaXMgc2tpcHBlZCB3aGVuIGl0IGlzIHZlcnkgY2xlYXIgdGhhdCB0aGUgdXNlciBhY3R1YWxseVxuICAvLyBpbnRlbmRlZCB0byBwb2ludCBhdCBhbiBVTkMgcGF0aC4gVGhpcyBpcyBhc3N1bWVkIHdoZW4gdGhlIGZpcnN0XG4gIC8vIG5vbi1lbXB0eSBzdHJpbmcgYXJndW1lbnRzIHN0YXJ0cyB3aXRoIGV4YWN0bHkgdHdvIHNsYXNoZXMgZm9sbG93ZWQgYnlcbiAgLy8gYXQgbGVhc3Qgb25lIG1vcmUgbm9uLXNsYXNoIGNoYXJhY3Rlci5cbiAgLy9cbiAgLy8gTm90ZSB0aGF0IGZvciBub3JtYWxpemUoKSB0byB0cmVhdCBhIHBhdGggYXMgYW4gVU5DIHBhdGggaXQgbmVlZHMgdG9cbiAgLy8gaGF2ZSBhdCBsZWFzdCAyIGNvbXBvbmVudHMsIHNvIHdlIGRvbid0IGZpbHRlciBmb3IgdGhhdCBoZXJlLlxuICAvLyBUaGlzIG1lYW5zIHRoYXQgdGhlIHVzZXIgY2FuIHVzZSBqb2luIHRvIGNvbnN0cnVjdCBVTkMgcGF0aHMgZnJvbVxuICAvLyBhIHNlcnZlciBuYW1lIGFuZCBhIHNoYXJlIG5hbWU7IGZvciBleGFtcGxlOlxuICAvLyAgIHBhdGguam9pbignLy9zZXJ2ZXInLCAnc2hhcmUnKSAtPiAnXFxcXFxcXFxzZXJ2ZXJcXFxcc2hhcmVcXFxcJylcbiAgbGV0IG5lZWRzUmVwbGFjZSA9IHRydWU7XG4gIGxldCBzbGFzaENvdW50ID0gMDtcbiAgYXNzZXJ0KGZpcnN0UGFydCAhPSBudWxsKTtcbiAgaWYgKGlzUGF0aFNlcGFyYXRvcihmaXJzdFBhcnQuY2hhckNvZGVBdCgwKSkpIHtcbiAgICArK3NsYXNoQ291bnQ7XG4gICAgY29uc3QgZmlyc3RMZW4gPSBmaXJzdFBhcnQubGVuZ3RoO1xuICAgIGlmIChmaXJzdExlbiA+IDEpIHtcbiAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoZmlyc3RQYXJ0LmNoYXJDb2RlQXQoMSkpKSB7XG4gICAgICAgICsrc2xhc2hDb3VudDtcbiAgICAgICAgaWYgKGZpcnN0TGVuID4gMikge1xuICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoZmlyc3RQYXJ0LmNoYXJDb2RlQXQoMikpKSArK3NsYXNoQ291bnQ7XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBXZSBtYXRjaGVkIGEgVU5DIHBhdGggaW4gdGhlIGZpcnN0IHBhcnRcbiAgICAgICAgICAgIG5lZWRzUmVwbGFjZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAobmVlZHNSZXBsYWNlKSB7XG4gICAgLy8gRmluZCBhbnkgbW9yZSBjb25zZWN1dGl2ZSBzbGFzaGVzIHdlIG5lZWQgdG8gcmVwbGFjZVxuICAgIGZvciAoOyBzbGFzaENvdW50IDwgam9pbmVkLmxlbmd0aDsgKytzbGFzaENvdW50KSB7XG4gICAgICBpZiAoIWlzUGF0aFNlcGFyYXRvcihqb2luZWQuY2hhckNvZGVBdChzbGFzaENvdW50KSkpIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIFJlcGxhY2UgdGhlIHNsYXNoZXMgaWYgbmVlZGVkXG4gICAgaWYgKHNsYXNoQ291bnQgPj0gMikgam9pbmVkID0gYFxcXFwke2pvaW5lZC5zbGljZShzbGFzaENvdW50KX1gO1xuICB9XG5cbiAgcmV0dXJuIG5vcm1hbGl6ZShqb2luZWQpO1xufVxuXG4vKipcbiAqIEl0IHdpbGwgc29sdmUgdGhlIHJlbGF0aXZlIHBhdGggZnJvbSBgZnJvbWAgdG8gYHRvYCwgZm9yIGluc3RhbmNlOlxuICogIGZyb20gPSAnQzpcXFxcb3JhbmRlYVxcXFx0ZXN0XFxcXGFhYSdcbiAqICB0byA9ICdDOlxcXFxvcmFuZGVhXFxcXGltcGxcXFxcYmJiJ1xuICogVGhlIG91dHB1dCBvZiB0aGUgZnVuY3Rpb24gc2hvdWxkIGJlOiAnLi5cXFxcLi5cXFxcaW1wbFxcXFxiYmInXG4gKiBAcGFyYW0gZnJvbSByZWxhdGl2ZSBwYXRoXG4gKiBAcGFyYW0gdG8gcmVsYXRpdmUgcGF0aFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVsYXRpdmUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0UGF0aChmcm9tKTtcbiAgYXNzZXJ0UGF0aCh0byk7XG5cbiAgaWYgKGZyb20gPT09IHRvKSByZXR1cm4gXCJcIjtcblxuICBjb25zdCBmcm9tT3JpZyA9IHJlc29sdmUoZnJvbSk7XG4gIGNvbnN0IHRvT3JpZyA9IHJlc29sdmUodG8pO1xuXG4gIGlmIChmcm9tT3JpZyA9PT0gdG9PcmlnKSByZXR1cm4gXCJcIjtcblxuICBmcm9tID0gZnJvbU9yaWcudG9Mb3dlckNhc2UoKTtcbiAgdG8gPSB0b09yaWcudG9Mb3dlckNhc2UoKTtcblxuICBpZiAoZnJvbSA9PT0gdG8pIHJldHVybiBcIlwiO1xuXG4gIC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcbiAgbGV0IGZyb21TdGFydCA9IDA7XG4gIGxldCBmcm9tRW5kID0gZnJvbS5sZW5ndGg7XG4gIGZvciAoOyBmcm9tU3RhcnQgPCBmcm9tRW5kOyArK2Zyb21TdGFydCkge1xuICAgIGlmIChmcm9tLmNoYXJDb2RlQXQoZnJvbVN0YXJ0KSAhPT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgYnJlYWs7XG4gIH1cbiAgLy8gVHJpbSB0cmFpbGluZyBiYWNrc2xhc2hlcyAoYXBwbGljYWJsZSB0byBVTkMgcGF0aHMgb25seSlcbiAgZm9yICg7IGZyb21FbmQgLSAxID4gZnJvbVN0YXJ0OyAtLWZyb21FbmQpIHtcbiAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21FbmQgLSAxKSAhPT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgYnJlYWs7XG4gIH1cbiAgY29uc3QgZnJvbUxlbiA9IGZyb21FbmQgLSBmcm9tU3RhcnQ7XG5cbiAgLy8gVHJpbSBhbnkgbGVhZGluZyBiYWNrc2xhc2hlc1xuICBsZXQgdG9TdGFydCA9IDA7XG4gIGxldCB0b0VuZCA9IHRvLmxlbmd0aDtcbiAgZm9yICg7IHRvU3RhcnQgPCB0b0VuZDsgKyt0b1N0YXJ0KSB7XG4gICAgaWYgKHRvLmNoYXJDb2RlQXQodG9TdGFydCkgIT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIGJyZWFrO1xuICB9XG4gIC8vIFRyaW0gdHJhaWxpbmcgYmFja3NsYXNoZXMgKGFwcGxpY2FibGUgdG8gVU5DIHBhdGhzIG9ubHkpXG4gIGZvciAoOyB0b0VuZCAtIDEgPiB0b1N0YXJ0OyAtLXRvRW5kKSB7XG4gICAgaWYgKHRvLmNoYXJDb2RlQXQodG9FbmQgLSAxKSAhPT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgYnJlYWs7XG4gIH1cbiAgY29uc3QgdG9MZW4gPSB0b0VuZCAtIHRvU3RhcnQ7XG5cbiAgLy8gQ29tcGFyZSBwYXRocyB0byBmaW5kIHRoZSBsb25nZXN0IGNvbW1vbiBwYXRoIGZyb20gcm9vdFxuICBjb25zdCBsZW5ndGggPSBmcm9tTGVuIDwgdG9MZW4gPyBmcm9tTGVuIDogdG9MZW47XG4gIGxldCBsYXN0Q29tbW9uU2VwID0gLTE7XG4gIGxldCBpID0gMDtcbiAgZm9yICg7IGkgPD0gbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoaSA9PT0gbGVuZ3RoKSB7XG4gICAgICBpZiAodG9MZW4gPiBsZW5ndGgpIHtcbiAgICAgICAgaWYgKHRvLmNoYXJDb2RlQXQodG9TdGFydCArIGkpID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIKSB7XG4gICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYGZyb21gIGlzIHRoZSBleGFjdCBiYXNlIHBhdGggZm9yIGB0b2AuXG4gICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209J0M6XFxcXGZvb1xcXFxiYXInOyB0bz0nQzpcXFxcZm9vXFxcXGJhclxcXFxiYXonXG4gICAgICAgICAgcmV0dXJuIHRvT3JpZy5zbGljZSh0b1N0YXJ0ICsgaSArIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKGkgPT09IDIpIHtcbiAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgZnJvbWAgaXMgdGhlIGRldmljZSByb290LlxuICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPSdDOlxcXFwnOyB0bz0nQzpcXFxcZm9vJ1xuICAgICAgICAgIHJldHVybiB0b09yaWcuc2xpY2UodG9TdGFydCArIGkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZnJvbUxlbiA+IGxlbmd0aCkge1xuICAgICAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIKSB7XG4gICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYHRvYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgZnJvbWAuXG4gICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209J0M6XFxcXGZvb1xcXFxiYXInOyB0bz0nQzpcXFxcZm9vJ1xuICAgICAgICAgIGxhc3RDb21tb25TZXAgPSBpO1xuICAgICAgICB9IGVsc2UgaWYgKGkgPT09IDIpIHtcbiAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgdG9gIGlzIHRoZSBkZXZpY2Ugcm9vdC5cbiAgICAgICAgICAvLyBGb3IgZXhhbXBsZTogZnJvbT0nQzpcXFxcZm9vXFxcXGJhcic7IHRvPSdDOlxcXFwnXG4gICAgICAgICAgbGFzdENvbW1vblNlcCA9IDM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCBmcm9tQ29kZSA9IGZyb20uY2hhckNvZGVBdChmcm9tU3RhcnQgKyBpKTtcbiAgICBjb25zdCB0b0NvZGUgPSB0by5jaGFyQ29kZUF0KHRvU3RhcnQgKyBpKTtcbiAgICBpZiAoZnJvbUNvZGUgIT09IHRvQ29kZSkgYnJlYWs7XG4gICAgZWxzZSBpZiAoZnJvbUNvZGUgPT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIGxhc3RDb21tb25TZXAgPSBpO1xuICB9XG5cbiAgLy8gV2UgZm91bmQgYSBtaXNtYXRjaCBiZWZvcmUgdGhlIGZpcnN0IGNvbW1vbiBwYXRoIHNlcGFyYXRvciB3YXMgc2Vlbiwgc29cbiAgLy8gcmV0dXJuIHRoZSBvcmlnaW5hbCBgdG9gLlxuICBpZiAoaSAhPT0gbGVuZ3RoICYmIGxhc3RDb21tb25TZXAgPT09IC0xKSB7XG4gICAgcmV0dXJuIHRvT3JpZztcbiAgfVxuXG4gIGxldCBvdXQgPSBcIlwiO1xuICBpZiAobGFzdENvbW1vblNlcCA9PT0gLTEpIGxhc3RDb21tb25TZXAgPSAwO1xuICAvLyBHZW5lcmF0ZSB0aGUgcmVsYXRpdmUgcGF0aCBiYXNlZCBvbiB0aGUgcGF0aCBkaWZmZXJlbmNlIGJldHdlZW4gYHRvYCBhbmRcbiAgLy8gYGZyb21gXG4gIGZvciAoaSA9IGZyb21TdGFydCArIGxhc3RDb21tb25TZXAgKyAxOyBpIDw9IGZyb21FbmQ7ICsraSkge1xuICAgIGlmIChpID09PSBmcm9tRW5kIHx8IGZyb20uY2hhckNvZGVBdChpKSA9PT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkge1xuICAgICAgaWYgKG91dC5sZW5ndGggPT09IDApIG91dCArPSBcIi4uXCI7XG4gICAgICBlbHNlIG91dCArPSBcIlxcXFwuLlwiO1xuICAgIH1cbiAgfVxuXG4gIC8vIExhc3RseSwgYXBwZW5kIHRoZSByZXN0IG9mIHRoZSBkZXN0aW5hdGlvbiAoYHRvYCkgcGF0aCB0aGF0IGNvbWVzIGFmdGVyXG4gIC8vIHRoZSBjb21tb24gcGF0aCBwYXJ0c1xuICBpZiAob3V0Lmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gb3V0ICsgdG9PcmlnLnNsaWNlKHRvU3RhcnQgKyBsYXN0Q29tbW9uU2VwLCB0b0VuZCk7XG4gIH0gZWxzZSB7XG4gICAgdG9TdGFydCArPSBsYXN0Q29tbW9uU2VwO1xuICAgIGlmICh0b09yaWcuY2hhckNvZGVBdCh0b1N0YXJ0KSA9PT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgKyt0b1N0YXJ0O1xuICAgIHJldHVybiB0b09yaWcuc2xpY2UodG9TdGFydCwgdG9FbmQpO1xuICB9XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgcGF0aCB0byBhIG5hbWVzcGFjZSBwYXRoXG4gKiBAcGFyYW0gcGF0aCB0byByZXNvbHZlIHRvIG5hbWVzcGFjZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9OYW1lc3BhY2VkUGF0aChwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBOb3RlOiB0aGlzIHdpbGwgKnByb2JhYmx5KiB0aHJvdyBzb21ld2hlcmUuXG4gIGlmICh0eXBlb2YgcGF0aCAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIHBhdGg7XG4gIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwiXCI7XG5cbiAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcmVzb2x2ZShwYXRoKTtcblxuICBpZiAocmVzb2x2ZWRQYXRoLmxlbmd0aCA+PSAzKSB7XG4gICAgaWYgKHJlc29sdmVkUGF0aC5jaGFyQ29kZUF0KDApID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIKSB7XG4gICAgICAvLyBQb3NzaWJsZSBVTkMgcm9vdFxuXG4gICAgICBpZiAocmVzb2x2ZWRQYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIHtcbiAgICAgICAgY29uc3QgY29kZSA9IHJlc29sdmVkUGF0aC5jaGFyQ29kZUF0KDIpO1xuICAgICAgICBpZiAoY29kZSAhPT0gQ0hBUl9RVUVTVElPTl9NQVJLICYmIGNvZGUgIT09IENIQVJfRE9UKSB7XG4gICAgICAgICAgLy8gTWF0Y2hlZCBub24tbG9uZyBVTkMgcm9vdCwgY29udmVydCB0aGUgcGF0aCB0byBhIGxvbmcgVU5DIHBhdGhcbiAgICAgICAgICByZXR1cm4gYFxcXFxcXFxcP1xcXFxVTkNcXFxcJHtyZXNvbHZlZFBhdGguc2xpY2UoMil9YDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dzRGV2aWNlUm9vdChyZXNvbHZlZFBhdGguY2hhckNvZGVBdCgwKSkpIHtcbiAgICAgIC8vIFBvc3NpYmxlIGRldmljZSByb290XG5cbiAgICAgIGlmIChcbiAgICAgICAgcmVzb2x2ZWRQYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04gJiZcbiAgICAgICAgcmVzb2x2ZWRQYXRoLmNoYXJDb2RlQXQoMikgPT09IENIQVJfQkFDS1dBUkRfU0xBU0hcbiAgICAgICkge1xuICAgICAgICAvLyBNYXRjaGVkIGRldmljZSByb290LCBjb252ZXJ0IHRoZSBwYXRoIHRvIGEgbG9uZyBVTkMgcGF0aFxuICAgICAgICByZXR1cm4gYFxcXFxcXFxcP1xcXFwke3Jlc29sdmVkUGF0aH1gO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXRoO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgZGlyZWN0b3J5IG5hbWUgb2YgYSBgcGF0aGAuXG4gKiBAcGFyYW0gcGF0aCB0byBkZXRlcm1pbmUgbmFtZSBmb3JcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpcm5hbWUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgY29uc3QgbGVuID0gcGF0aC5sZW5ndGg7XG4gIGlmIChsZW4gPT09IDApIHJldHVybiBcIi5cIjtcbiAgbGV0IHJvb3RFbmQgPSAtMTtcbiAgbGV0IGVuZCA9IC0xO1xuICBsZXQgbWF0Y2hlZFNsYXNoID0gdHJ1ZTtcbiAgbGV0IG9mZnNldCA9IDA7XG4gIGNvbnN0IGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoMCk7XG5cbiAgLy8gVHJ5IHRvIG1hdGNoIGEgcm9vdFxuICBpZiAobGVuID4gMSkge1xuICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAgIC8vIFBvc3NpYmxlIFVOQyByb290XG5cbiAgICAgIHJvb3RFbmQgPSBvZmZzZXQgPSAxO1xuXG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgxKSkpIHtcbiAgICAgICAgLy8gTWF0Y2hlZCBkb3VibGUgcGF0aCBzZXBhcmF0b3IgYXQgYmVnaW5uaW5nXG4gICAgICAgIGxldCBqID0gMjtcbiAgICAgICAgbGV0IGxhc3QgPSBqO1xuICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgbm9uLXBhdGggc2VwYXJhdG9yc1xuICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaiA8IGxlbiAmJiBqICE9PSBsYXN0KSB7XG4gICAgICAgICAgLy8gTWF0Y2hlZCFcbiAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgICAgaWYgKCFpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChqIDwgbGVuICYmIGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgIC8vIE1hdGNoZWQhXG4gICAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBub24tcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaiA9PT0gbGVuKSB7XG4gICAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgYSBVTkMgcm9vdCBvbmx5XG4gICAgICAgICAgICAgIHJldHVybiBwYXRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IHdpdGggbGVmdG92ZXJzXG5cbiAgICAgICAgICAgICAgLy8gT2Zmc2V0IGJ5IDEgdG8gaW5jbHVkZSB0aGUgc2VwYXJhdG9yIGFmdGVyIHRoZSBVTkMgcm9vdCB0b1xuICAgICAgICAgICAgICAvLyB0cmVhdCBpdCBhcyBhIFwibm9ybWFsIHJvb3RcIiBvbiB0b3Agb2YgYSAoVU5DKSByb290XG4gICAgICAgICAgICAgIHJvb3RFbmQgPSBvZmZzZXQgPSBqICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzV2luZG93c0RldmljZVJvb3QoY29kZSkpIHtcbiAgICAgIC8vIFBvc3NpYmxlIGRldmljZSByb290XG5cbiAgICAgIGlmIChwYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04pIHtcbiAgICAgICAgcm9vdEVuZCA9IG9mZnNldCA9IDI7XG4gICAgICAgIGlmIChsZW4gPiAyKSB7XG4gICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoMikpKSByb290RW5kID0gb2Zmc2V0ID0gMztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAvLyBgcGF0aGAgY29udGFpbnMganVzdCBhIHBhdGggc2VwYXJhdG9yLCBleGl0IGVhcmx5IHRvIGF2b2lkXG4gICAgLy8gdW5uZWNlc3Nhcnkgd29ya1xuICAgIHJldHVybiBwYXRoO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IGxlbiAtIDE7IGkgPj0gb2Zmc2V0OyAtLWkpIHtcbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChpKSkpIHtcbiAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgIGVuZCA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvclxuICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICBpZiAocm9vdEVuZCA9PT0gLTEpIHJldHVybiBcIi5cIjtcbiAgICBlbHNlIGVuZCA9IHJvb3RFbmQ7XG4gIH1cbiAgcmV0dXJuIHBhdGguc2xpY2UoMCwgZW5kKTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIGxhc3QgcG9ydGlvbiBvZiBhIGBwYXRoYC4gVHJhaWxpbmcgZGlyZWN0b3J5IHNlcGFyYXRvcnMgYXJlIGlnbm9yZWQuXG4gKiBAcGFyYW0gcGF0aCB0byBwcm9jZXNzXG4gKiBAcGFyYW0gZXh0IG9mIHBhdGggZGlyZWN0b3J5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlbmFtZShwYXRoOiBzdHJpbmcsIGV4dCA9IFwiXCIpOiBzdHJpbmcge1xuICBpZiAoZXh0ICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGV4dCAhPT0gXCJzdHJpbmdcIikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiZXh0XCIgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZycpO1xuICB9XG5cbiAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICBsZXQgc3RhcnQgPSAwO1xuICBsZXQgZW5kID0gLTE7XG4gIGxldCBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICBsZXQgaTogbnVtYmVyO1xuXG4gIC8vIENoZWNrIGZvciBhIGRyaXZlIGxldHRlciBwcmVmaXggc28gYXMgbm90IHRvIG1pc3Rha2UgdGhlIGZvbGxvd2luZ1xuICAvLyBwYXRoIHNlcGFyYXRvciBhcyBhbiBleHRyYSBzZXBhcmF0b3IgYXQgdGhlIGVuZCBvZiB0aGUgcGF0aCB0aGF0IGNhbiBiZVxuICAvLyBkaXNyZWdhcmRlZFxuICBpZiAocGF0aC5sZW5ndGggPj0gMikge1xuICAgIGNvbnN0IGRyaXZlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuICAgIGlmIChpc1dpbmRvd3NEZXZpY2VSb290KGRyaXZlKSkge1xuICAgICAgaWYgKHBhdGguY2hhckNvZGVBdCgxKSA9PT0gQ0hBUl9DT0xPTikgc3RhcnQgPSAyO1xuICAgIH1cbiAgfVxuXG4gIGlmIChleHQgIT09IHVuZGVmaW5lZCAmJiBleHQubGVuZ3RoID4gMCAmJiBleHQubGVuZ3RoIDw9IHBhdGgubGVuZ3RoKSB7XG4gICAgaWYgKGV4dC5sZW5ndGggPT09IHBhdGgubGVuZ3RoICYmIGV4dCA9PT0gcGF0aCkgcmV0dXJuIFwiXCI7XG4gICAgbGV0IGV4dElkeCA9IGV4dC5sZW5ndGggLSAxO1xuICAgIGxldCBmaXJzdE5vblNsYXNoRW5kID0gLTE7XG4gICAgZm9yIChpID0gcGF0aC5sZW5ndGggLSAxOyBpID49IHN0YXJ0OyAtLWkpIHtcbiAgICAgIGNvbnN0IGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBwYXRoIHNlcGFyYXRvciB0aGF0IHdhcyBub3QgcGFydCBvZiBhIHNldCBvZiBwYXRoXG4gICAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmaXJzdE5vblNsYXNoRW5kID09PSAtMSkge1xuICAgICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCByZW1lbWJlciB0aGlzIGluZGV4IGluIGNhc2VcbiAgICAgICAgICAvLyB3ZSBuZWVkIGl0IGlmIHRoZSBleHRlbnNpb24gZW5kcyB1cCBub3QgbWF0Y2hpbmdcbiAgICAgICAgICBtYXRjaGVkU2xhc2ggPSBmYWxzZTtcbiAgICAgICAgICBmaXJzdE5vblNsYXNoRW5kID0gaSArIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV4dElkeCA+PSAwKSB7XG4gICAgICAgICAgLy8gVHJ5IHRvIG1hdGNoIHRoZSBleHBsaWNpdCBleHRlbnNpb25cbiAgICAgICAgICBpZiAoY29kZSA9PT0gZXh0LmNoYXJDb2RlQXQoZXh0SWR4KSkge1xuICAgICAgICAgICAgaWYgKC0tZXh0SWR4ID09PSAtMSkge1xuICAgICAgICAgICAgICAvLyBXZSBtYXRjaGVkIHRoZSBleHRlbnNpb24sIHNvIG1hcmsgdGhpcyBhcyB0aGUgZW5kIG9mIG91ciBwYXRoXG4gICAgICAgICAgICAgIC8vIGNvbXBvbmVudFxuICAgICAgICAgICAgICBlbmQgPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFeHRlbnNpb24gZG9lcyBub3QgbWF0Y2gsIHNvIG91ciByZXN1bHQgaXMgdGhlIGVudGlyZSBwYXRoXG4gICAgICAgICAgICAvLyBjb21wb25lbnRcbiAgICAgICAgICAgIGV4dElkeCA9IC0xO1xuICAgICAgICAgICAgZW5kID0gZmlyc3ROb25TbGFzaEVuZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPT09IGVuZCkgZW5kID0gZmlyc3ROb25TbGFzaEVuZDtcbiAgICBlbHNlIGlmIChlbmQgPT09IC0xKSBlbmQgPSBwYXRoLmxlbmd0aDtcbiAgICByZXR1cm4gcGF0aC5zbGljZShzdGFydCwgZW5kKTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gc3RhcnQ7IC0taSkge1xuICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaSkpKSB7XG4gICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBwYXRoIHNlcGFyYXRvciB0aGF0IHdhcyBub3QgcGFydCBvZiBhIHNldCBvZiBwYXRoXG4gICAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZW5kID09PSAtMSkge1xuICAgICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgbWFyayB0aGlzIGFzIHRoZSBlbmQgb2Ygb3VyXG4gICAgICAgIC8vIHBhdGggY29tcG9uZW50XG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5kID09PSAtMSkgcmV0dXJuIFwiXCI7XG4gICAgcmV0dXJuIHBhdGguc2xpY2Uoc3RhcnQsIGVuZCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIGV4dGVuc2lvbiBvZiB0aGUgYHBhdGhgLlxuICogQHBhcmFtIHBhdGggd2l0aCBleHRlbnNpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dG5hbWUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgbGV0IHN0YXJ0ID0gMDtcbiAgbGV0IHN0YXJ0RG90ID0gLTE7XG4gIGxldCBzdGFydFBhcnQgPSAwO1xuICBsZXQgZW5kID0gLTE7XG4gIGxldCBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAvLyBUcmFjayB0aGUgc3RhdGUgb2YgY2hhcmFjdGVycyAoaWYgYW55KSB3ZSBzZWUgYmVmb3JlIG91ciBmaXJzdCBkb3QgYW5kXG4gIC8vIGFmdGVyIGFueSBwYXRoIHNlcGFyYXRvciB3ZSBmaW5kXG4gIGxldCBwcmVEb3RTdGF0ZSA9IDA7XG5cbiAgLy8gQ2hlY2sgZm9yIGEgZHJpdmUgbGV0dGVyIHByZWZpeCBzbyBhcyBub3QgdG8gbWlzdGFrZSB0aGUgZm9sbG93aW5nXG4gIC8vIHBhdGggc2VwYXJhdG9yIGFzIGFuIGV4dHJhIHNlcGFyYXRvciBhdCB0aGUgZW5kIG9mIHRoZSBwYXRoIHRoYXQgY2FuIGJlXG4gIC8vIGRpc3JlZ2FyZGVkXG5cbiAgaWYgKFxuICAgIHBhdGgubGVuZ3RoID49IDIgJiZcbiAgICBwYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04gJiZcbiAgICBpc1dpbmRvd3NEZXZpY2VSb290KHBhdGguY2hhckNvZGVBdCgwKSlcbiAgKSB7XG4gICAgc3RhcnQgPSBzdGFydFBhcnQgPSAyO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSBzdGFydDsgLS1pKSB7XG4gICAgY29uc3QgY29kZSA9IHBhdGguY2hhckNvZGVBdChpKTtcbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgcGF0aCBzZXBhcmF0b3IgdGhhdCB3YXMgbm90IHBhcnQgb2YgYSBzZXQgb2YgcGF0aFxuICAgICAgLy8gc2VwYXJhdG9ycyBhdCB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHN0b3Agbm93XG4gICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICBzdGFydFBhcnQgPSBpICsgMTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgIC8vIGV4dGVuc2lvblxuICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgICBlbmQgPSBpICsgMTtcbiAgICB9XG4gICAgaWYgKGNvZGUgPT09IENIQVJfRE9UKSB7XG4gICAgICAvLyBJZiB0aGlzIGlzIG91ciBmaXJzdCBkb3QsIG1hcmsgaXQgYXMgdGhlIHN0YXJ0IG9mIG91ciBleHRlbnNpb25cbiAgICAgIGlmIChzdGFydERvdCA9PT0gLTEpIHN0YXJ0RG90ID0gaTtcbiAgICAgIGVsc2UgaWYgKHByZURvdFN0YXRlICE9PSAxKSBwcmVEb3RTdGF0ZSA9IDE7XG4gICAgfSBlbHNlIGlmIChzdGFydERvdCAhPT0gLTEpIHtcbiAgICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgYW5kIG5vbi1wYXRoIHNlcGFyYXRvciBiZWZvcmUgb3VyIGRvdCwgc28gd2Ugc2hvdWxkXG4gICAgICAvLyBoYXZlIGEgZ29vZCBjaGFuY2UgYXQgaGF2aW5nIGEgbm9uLWVtcHR5IGV4dGVuc2lvblxuICAgICAgcHJlRG90U3RhdGUgPSAtMTtcbiAgICB9XG4gIH1cblxuICBpZiAoXG4gICAgc3RhcnREb3QgPT09IC0xIHx8XG4gICAgZW5kID09PSAtMSB8fFxuICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgY2hhcmFjdGVyIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZG90XG4gICAgcHJlRG90U3RhdGUgPT09IDAgfHxcbiAgICAvLyBUaGUgKHJpZ2h0LW1vc3QpIHRyaW1tZWQgcGF0aCBjb21wb25lbnQgaXMgZXhhY3RseSAnLi4nXG4gICAgKHByZURvdFN0YXRlID09PSAxICYmIHN0YXJ0RG90ID09PSBlbmQgLSAxICYmIHN0YXJ0RG90ID09PSBzdGFydFBhcnQgKyAxKVxuICApIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuICByZXR1cm4gcGF0aC5zbGljZShzdGFydERvdCwgZW5kKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBhIHBhdGggZnJvbSBgRm9ybWF0SW5wdXRQYXRoT2JqZWN0YCBvYmplY3QuXG4gKiBAcGFyYW0gcGF0aE9iamVjdCB3aXRoIHBhdGhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdChwYXRoT2JqZWN0OiBGb3JtYXRJbnB1dFBhdGhPYmplY3QpOiBzdHJpbmcge1xuICBpZiAocGF0aE9iamVjdCA9PT0gbnVsbCB8fCB0eXBlb2YgcGF0aE9iamVjdCAhPT0gXCJvYmplY3RcIikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICBgVGhlIFwicGF0aE9iamVjdFwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJHt0eXBlb2YgcGF0aE9iamVjdH1gLFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIF9mb3JtYXQoXCJcXFxcXCIsIHBhdGhPYmplY3QpO1xufVxuXG4vKipcbiAqIFJldHVybiBhIGBQYXJzZWRQYXRoYCBvYmplY3Qgb2YgdGhlIGBwYXRoYC5cbiAqIEBwYXJhbSBwYXRoIHRvIHByb2Nlc3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHBhdGg6IHN0cmluZyk6IFBhcnNlZFBhdGgge1xuICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gIGNvbnN0IHJldDogUGFyc2VkUGF0aCA9IHsgcm9vdDogXCJcIiwgZGlyOiBcIlwiLCBiYXNlOiBcIlwiLCBleHQ6IFwiXCIsIG5hbWU6IFwiXCIgfTtcblxuICBjb25zdCBsZW4gPSBwYXRoLmxlbmd0aDtcbiAgaWYgKGxlbiA9PT0gMCkgcmV0dXJuIHJldDtcblxuICBsZXQgcm9vdEVuZCA9IDA7XG4gIGxldCBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuXG4gIC8vIFRyeSB0byBtYXRjaCBhIHJvb3RcbiAgaWYgKGxlbiA+IDEpIHtcbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAvLyBQb3NzaWJsZSBVTkMgcm9vdFxuXG4gICAgICByb290RW5kID0gMTtcbiAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KDEpKSkge1xuICAgICAgICAvLyBNYXRjaGVkIGRvdWJsZSBwYXRoIHNlcGFyYXRvciBhdCBiZWdpbm5pbmdcbiAgICAgICAgbGV0IGogPSAyO1xuICAgICAgICBsZXQgbGFzdCA9IGo7XG4gICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBub24tcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgIGZvciAoOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChqKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChqIDwgbGVuICYmIGogIT09IGxhc3QpIHtcbiAgICAgICAgICAvLyBNYXRjaGVkIVxuICAgICAgICAgIGxhc3QgPSBqO1xuICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBwYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICBpZiAoIWlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGogPCBsZW4gJiYgaiAhPT0gbGFzdCkge1xuICAgICAgICAgICAgLy8gTWF0Y2hlZCFcbiAgICAgICAgICAgIGxhc3QgPSBqO1xuICAgICAgICAgICAgLy8gTWF0Y2ggMSBvciBtb3JlIG5vbi1wYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICAgIGZvciAoOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChqID09PSBsZW4pIHtcbiAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IG9ubHlcblxuICAgICAgICAgICAgICByb290RW5kID0gajtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaiAhPT0gbGFzdCkge1xuICAgICAgICAgICAgICAvLyBXZSBtYXRjaGVkIGEgVU5DIHJvb3Qgd2l0aCBsZWZ0b3ZlcnNcblxuICAgICAgICAgICAgICByb290RW5kID0gaiArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1dpbmRvd3NEZXZpY2VSb290KGNvZGUpKSB7XG4gICAgICAvLyBQb3NzaWJsZSBkZXZpY2Ugcm9vdFxuXG4gICAgICBpZiAocGF0aC5jaGFyQ29kZUF0KDEpID09PSBDSEFSX0NPTE9OKSB7XG4gICAgICAgIHJvb3RFbmQgPSAyO1xuICAgICAgICBpZiAobGVuID4gMikge1xuICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KDIpKSkge1xuICAgICAgICAgICAgaWYgKGxlbiA9PT0gMykge1xuICAgICAgICAgICAgICAvLyBgcGF0aGAgY29udGFpbnMganVzdCBhIGRyaXZlIHJvb3QsIGV4aXQgZWFybHkgdG8gYXZvaWRcbiAgICAgICAgICAgICAgLy8gdW5uZWNlc3Nhcnkgd29ya1xuICAgICAgICAgICAgICByZXQucm9vdCA9IHJldC5kaXIgPSBwYXRoO1xuICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcm9vdEVuZCA9IDM7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGBwYXRoYCBjb250YWlucyBqdXN0IGEgZHJpdmUgcm9vdCwgZXhpdCBlYXJseSB0byBhdm9pZFxuICAgICAgICAgIC8vIHVubmVjZXNzYXJ5IHdvcmtcbiAgICAgICAgICByZXQucm9vdCA9IHJldC5kaXIgPSBwYXRoO1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgLy8gYHBhdGhgIGNvbnRhaW5zIGp1c3QgYSBwYXRoIHNlcGFyYXRvciwgZXhpdCBlYXJseSB0byBhdm9pZFxuICAgIC8vIHVubmVjZXNzYXJ5IHdvcmtcbiAgICByZXQucm9vdCA9IHJldC5kaXIgPSBwYXRoO1xuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBpZiAocm9vdEVuZCA+IDApIHJldC5yb290ID0gcGF0aC5zbGljZSgwLCByb290RW5kKTtcblxuICBsZXQgc3RhcnREb3QgPSAtMTtcbiAgbGV0IHN0YXJ0UGFydCA9IHJvb3RFbmQ7XG4gIGxldCBlbmQgPSAtMTtcbiAgbGV0IG1hdGNoZWRTbGFzaCA9IHRydWU7XG4gIGxldCBpID0gcGF0aC5sZW5ndGggLSAxO1xuXG4gIC8vIFRyYWNrIHRoZSBzdGF0ZSBvZiBjaGFyYWN0ZXJzIChpZiBhbnkpIHdlIHNlZSBiZWZvcmUgb3VyIGZpcnN0IGRvdCBhbmRcbiAgLy8gYWZ0ZXIgYW55IHBhdGggc2VwYXJhdG9yIHdlIGZpbmRcbiAgbGV0IHByZURvdFN0YXRlID0gMDtcblxuICAvLyBHZXQgbm9uLWRpciBpbmZvXG4gIGZvciAoOyBpID49IHJvb3RFbmQ7IC0taSkge1xuICAgIGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgaWYgKGlzUGF0aFNlcGFyYXRvcihjb2RlKSkge1xuICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIHBhdGggc2VwYXJhdG9yIHRoYXQgd2FzIG5vdCBwYXJ0IG9mIGEgc2V0IG9mIHBhdGhcbiAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgaWYgKCFtYXRjaGVkU2xhc2gpIHtcbiAgICAgICAgc3RhcnRQYXJ0ID0gaSArIDE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChlbmQgPT09IC0xKSB7XG4gICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgbWFyayB0aGlzIGFzIHRoZSBlbmQgb2Ygb3VyXG4gICAgICAvLyBleHRlbnNpb25cbiAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgZW5kID0gaSArIDE7XG4gICAgfVxuICAgIGlmIChjb2RlID09PSBDSEFSX0RPVCkge1xuICAgICAgLy8gSWYgdGhpcyBpcyBvdXIgZmlyc3QgZG90LCBtYXJrIGl0IGFzIHRoZSBzdGFydCBvZiBvdXIgZXh0ZW5zaW9uXG4gICAgICBpZiAoc3RhcnREb3QgPT09IC0xKSBzdGFydERvdCA9IGk7XG4gICAgICBlbHNlIGlmIChwcmVEb3RTdGF0ZSAhPT0gMSkgcHJlRG90U3RhdGUgPSAxO1xuICAgIH0gZWxzZSBpZiAoc3RhcnREb3QgIT09IC0xKSB7XG4gICAgICAvLyBXZSBzYXcgYSBub24tZG90IGFuZCBub24tcGF0aCBzZXBhcmF0b3IgYmVmb3JlIG91ciBkb3QsIHNvIHdlIHNob3VsZFxuICAgICAgLy8gaGF2ZSBhIGdvb2QgY2hhbmNlIGF0IGhhdmluZyBhIG5vbi1lbXB0eSBleHRlbnNpb25cbiAgICAgIHByZURvdFN0YXRlID0gLTE7XG4gICAgfVxuICB9XG5cbiAgaWYgKFxuICAgIHN0YXJ0RG90ID09PSAtMSB8fFxuICAgIGVuZCA9PT0gLTEgfHxcbiAgICAvLyBXZSBzYXcgYSBub24tZG90IGNoYXJhY3RlciBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGRvdFxuICAgIHByZURvdFN0YXRlID09PSAwIHx8XG4gICAgLy8gVGhlIChyaWdodC1tb3N0KSB0cmltbWVkIHBhdGggY29tcG9uZW50IGlzIGV4YWN0bHkgJy4uJ1xuICAgIChwcmVEb3RTdGF0ZSA9PT0gMSAmJiBzdGFydERvdCA9PT0gZW5kIC0gMSAmJiBzdGFydERvdCA9PT0gc3RhcnRQYXJ0ICsgMSlcbiAgKSB7XG4gICAgaWYgKGVuZCAhPT0gLTEpIHtcbiAgICAgIHJldC5iYXNlID0gcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKHN0YXJ0UGFydCwgZW5kKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKHN0YXJ0UGFydCwgc3RhcnREb3QpO1xuICAgIHJldC5iYXNlID0gcGF0aC5zbGljZShzdGFydFBhcnQsIGVuZCk7XG4gICAgcmV0LmV4dCA9IHBhdGguc2xpY2Uoc3RhcnREb3QsIGVuZCk7XG4gIH1cblxuICAvLyBJZiB0aGUgZGlyZWN0b3J5IGlzIHRoZSByb290LCB1c2UgdGhlIGVudGlyZSByb290IGFzIHRoZSBgZGlyYCBpbmNsdWRpbmdcbiAgLy8gdGhlIHRyYWlsaW5nIHNsYXNoIGlmIGFueSAoYEM6XFxhYmNgIC0+IGBDOlxcYCkuIE90aGVyd2lzZSwgc3RyaXAgb3V0IHRoZVxuICAvLyB0cmFpbGluZyBzbGFzaCAoYEM6XFxhYmNcXGRlZmAgLT4gYEM6XFxhYmNgKS5cbiAgaWYgKHN0YXJ0UGFydCA+IDAgJiYgc3RhcnRQYXJ0ICE9PSByb290RW5kKSB7XG4gICAgcmV0LmRpciA9IHBhdGguc2xpY2UoMCwgc3RhcnRQYXJ0IC0gMSk7XG4gIH0gZWxzZSByZXQuZGlyID0gcmV0LnJvb3Q7XG5cbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIGZpbGUgVVJMIHRvIGEgcGF0aCBzdHJpbmcuXG4gKlxuICogYGBgdHNcbiAqICAgICAgaW1wb3J0IHsgZnJvbUZpbGVVcmwgfSBmcm9tIFwiLi93aW4zMi50c1wiO1xuICogICAgICBmcm9tRmlsZVVybChcImZpbGU6Ly8vaG9tZS9mb29cIik7IC8vIFwiXFxcXGhvbWVcXFxcZm9vXCJcbiAqICAgICAgZnJvbUZpbGVVcmwoXCJmaWxlOi8vL0M6L1VzZXJzL2Zvb1wiKTsgLy8gXCJDOlxcXFxVc2Vyc1xcXFxmb29cIlxuICogICAgICBmcm9tRmlsZVVybChcImZpbGU6Ly9sb2NhbGhvc3QvaG9tZS9mb29cIik7IC8vIFwiXFxcXFxcXFxsb2NhbGhvc3RcXFxcaG9tZVxcXFxmb29cIlxuICogYGBgXG4gKiBAcGFyYW0gdXJsIG9mIGEgZmlsZSBVUkxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21GaWxlVXJsKHVybDogc3RyaW5nIHwgVVJMKTogc3RyaW5nIHtcbiAgdXJsID0gdXJsIGluc3RhbmNlb2YgVVJMID8gdXJsIDogbmV3IFVSTCh1cmwpO1xuICBpZiAodXJsLnByb3RvY29sICE9IFwiZmlsZTpcIikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJNdXN0IGJlIGEgZmlsZSBVUkwuXCIpO1xuICB9XG4gIGxldCBwYXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KFxuICAgIHVybC5wYXRobmFtZS5yZXBsYWNlKC9cXC8vZywgXCJcXFxcXCIpLnJlcGxhY2UoLyUoPyFbMC05QS1GYS1mXXsyfSkvZywgXCIlMjVcIiksXG4gICkucmVwbGFjZSgvXlxcXFwqKFtBLVphLXpdOikoXFxcXHwkKS8sIFwiJDFcXFxcXCIpO1xuICBpZiAodXJsLmhvc3RuYW1lICE9IFwiXCIpIHtcbiAgICAvLyBOb3RlOiBUaGUgYFVSTGAgaW1wbGVtZW50YXRpb24gZ3VhcmFudGVlcyB0aGF0IHRoZSBkcml2ZSBsZXR0ZXIgYW5kXG4gICAgLy8gaG9zdG5hbWUgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZS4gT3RoZXJ3aXNlIGl0IHdvdWxkIG5vdCBoYXZlIGJlZW4gdmFsaWRcbiAgICAvLyB0byBhcHBlbmQgdGhlIGhvc3RuYW1lIGFuZCBwYXRoIGxpa2UgdGhpcy5cbiAgICBwYXRoID0gYFxcXFxcXFxcJHt1cmwuaG9zdG5hbWV9JHtwYXRofWA7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG5cbi8qKlxuICogQ29udmVydHMgYSBwYXRoIHN0cmluZyB0byBhIGZpbGUgVVJMLlxuICpcbiAqIGBgYHRzXG4gKiAgICAgIGltcG9ydCB7IHRvRmlsZVVybCB9IGZyb20gXCIuL3dpbjMyLnRzXCI7XG4gKiAgICAgIHRvRmlsZVVybChcIlxcXFxob21lXFxcXGZvb1wiKTsgLy8gbmV3IFVSTChcImZpbGU6Ly8vaG9tZS9mb29cIilcbiAqICAgICAgdG9GaWxlVXJsKFwiQzpcXFxcVXNlcnNcXFxcZm9vXCIpOyAvLyBuZXcgVVJMKFwiZmlsZTovLy9DOi9Vc2Vycy9mb29cIilcbiAqICAgICAgdG9GaWxlVXJsKFwiXFxcXFxcXFwxMjcuMC4wLjFcXFxcaG9tZVxcXFxmb29cIik7IC8vIG5ldyBVUkwoXCJmaWxlOi8vMTI3LjAuMC4xL2hvbWUvZm9vXCIpXG4gKiBgYGBcbiAqIEBwYXJhbSBwYXRoIHRvIGNvbnZlcnQgdG8gZmlsZSBVUkxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvRmlsZVVybChwYXRoOiBzdHJpbmcpOiBVUkwge1xuICBpZiAoIWlzQWJzb2x1dGUocGF0aCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTXVzdCBiZSBhbiBhYnNvbHV0ZSBwYXRoLlwiKTtcbiAgfVxuICBjb25zdCBbLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gcGF0aC5tYXRjaChcbiAgICAvXig/OlsvXFxcXF17Mn0oW14vXFxcXF0rKSg/PVsvXFxcXF0oPzpbXi9cXFxcXXwkKSkpPyguKikvLFxuICApITtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChcImZpbGU6Ly8vXCIpO1xuICB1cmwucGF0aG5hbWUgPSBlbmNvZGVXaGl0ZXNwYWNlKHBhdGhuYW1lLnJlcGxhY2UoLyUvZywgXCIlMjVcIikpO1xuICBpZiAoaG9zdG5hbWUgIT0gbnVsbCAmJiBob3N0bmFtZSAhPSBcImxvY2FsaG9zdFwiKSB7XG4gICAgdXJsLmhvc3RuYW1lID0gaG9zdG5hbWU7XG4gICAgaWYgKCF1cmwuaG9zdG5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIGhvc3RuYW1lLlwiKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVybDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxpREFBaUQ7QUFDakQsNkRBQTZEO0FBQzdELHFDQUFxQztBQUdyQyxTQUNFLG1CQUFtQixFQUNuQixVQUFVLEVBQ1YsUUFBUSxFQUNSLGtCQUFrQixRQUNiLGlCQUFpQixDQUFDO0FBRXpCLFNBQ0UsT0FBTyxFQUNQLFVBQVUsRUFDVixnQkFBZ0IsRUFDaEIsZUFBZSxFQUNmLG1CQUFtQixFQUNuQixlQUFlLFFBQ1YsWUFBWSxDQUFDO0FBQ3BCLFNBQVMsTUFBTSxRQUFRLG9CQUFvQixDQUFDO0FBRTVDLE9BQU8sTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDO0FBQ3hCLE9BQU8sTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDO0FBRTdCOzs7Q0FHQyxH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