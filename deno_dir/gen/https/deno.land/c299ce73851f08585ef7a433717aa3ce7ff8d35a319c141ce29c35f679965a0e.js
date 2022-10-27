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
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL3BhdGgvd2luMzIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IHRoZSBCcm93c2VyaWZ5IGF1dGhvcnMuIE1JVCBMaWNlbnNlLlxuLy8gUG9ydGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Jyb3dzZXJpZnkvcGF0aC1icm93c2VyaWZ5L1xuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgdHlwZSB7IEZvcm1hdElucHV0UGF0aE9iamVjdCwgUGFyc2VkUGF0aCB9IGZyb20gXCIuL19pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7XG4gIENIQVJfQkFDS1dBUkRfU0xBU0gsXG4gIENIQVJfQ09MT04sXG4gIENIQVJfRE9ULFxuICBDSEFSX1FVRVNUSU9OX01BUkssXG59IGZyb20gXCIuL19jb25zdGFudHMudHNcIjtcblxuaW1wb3J0IHtcbiAgX2Zvcm1hdCxcbiAgYXNzZXJ0UGF0aCxcbiAgZW5jb2RlV2hpdGVzcGFjZSxcbiAgaXNQYXRoU2VwYXJhdG9yLFxuICBpc1dpbmRvd3NEZXZpY2VSb290LFxuICBub3JtYWxpemVTdHJpbmcsXG59IGZyb20gXCIuL191dGlsLnRzXCI7XG5pbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiLi4vX3V0aWwvYXNzZXJ0LnRzXCI7XG5cbmV4cG9ydCBjb25zdCBzZXAgPSBcIlxcXFxcIjtcbmV4cG9ydCBjb25zdCBkZWxpbWl0ZXIgPSBcIjtcIjtcblxuLyoqXG4gKiBSZXNvbHZlcyBwYXRoIHNlZ21lbnRzIGludG8gYSBgcGF0aGBcbiAqIEBwYXJhbSBwYXRoU2VnbWVudHMgdG8gcHJvY2VzcyB0byBwYXRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlKC4uLnBhdGhTZWdtZW50czogc3RyaW5nW10pOiBzdHJpbmcge1xuICBsZXQgcmVzb2x2ZWREZXZpY2UgPSBcIlwiO1xuICBsZXQgcmVzb2x2ZWRUYWlsID0gXCJcIjtcbiAgbGV0IHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKGxldCBpID0gcGF0aFNlZ21lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTE7IGktLSkge1xuICAgIGxldCBwYXRoOiBzdHJpbmc7XG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCB7IERlbm8gfSA9IGdsb2JhbFRoaXMgYXMgYW55O1xuICAgIGlmIChpID49IDApIHtcbiAgICAgIHBhdGggPSBwYXRoU2VnbWVudHNbaV07XG4gICAgfSBlbHNlIGlmICghcmVzb2x2ZWREZXZpY2UpIHtcbiAgICAgIGlmICh0eXBlb2YgRGVubz8uY3dkICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlJlc29sdmVkIGEgZHJpdmUtbGV0dGVyLWxlc3MgcGF0aCB3aXRob3V0IGEgQ1dELlwiKTtcbiAgICAgIH1cbiAgICAgIHBhdGggPSBEZW5vLmN3ZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoXG4gICAgICAgIHR5cGVvZiBEZW5vPy5lbnY/LmdldCAhPT0gXCJmdW5jdGlvblwiIHx8IHR5cGVvZiBEZW5vPy5jd2QgIT09IFwiZnVuY3Rpb25cIlxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJSZXNvbHZlZCBhIHJlbGF0aXZlIHBhdGggd2l0aG91dCBhIENXRC5cIik7XG4gICAgICB9XG4gICAgICBwYXRoID0gRGVuby5jd2QoKTtcblxuICAgICAgLy8gVmVyaWZ5IHRoYXQgYSBjd2Qgd2FzIGZvdW5kIGFuZCB0aGF0IGl0IGFjdHVhbGx5IHBvaW50c1xuICAgICAgLy8gdG8gb3VyIGRyaXZlLiBJZiBub3QsIGRlZmF1bHQgdG8gdGhlIGRyaXZlJ3Mgcm9vdC5cbiAgICAgIGlmIChcbiAgICAgICAgcGF0aCA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIHBhdGguc2xpY2UoMCwgMykudG9Mb3dlckNhc2UoKSAhPT0gYCR7cmVzb2x2ZWREZXZpY2UudG9Mb3dlckNhc2UoKX1cXFxcYFxuICAgICAgKSB7XG4gICAgICAgIHBhdGggPSBgJHtyZXNvbHZlZERldmljZX1cXFxcYDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gICAgY29uc3QgbGVuID0gcGF0aC5sZW5ndGg7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGVudHJpZXNcbiAgICBpZiAobGVuID09PSAwKSBjb250aW51ZTtcblxuICAgIGxldCByb290RW5kID0gMDtcbiAgICBsZXQgZGV2aWNlID0gXCJcIjtcbiAgICBsZXQgaXNBYnNvbHV0ZSA9IGZhbHNlO1xuICAgIGNvbnN0IGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoMCk7XG5cbiAgICAvLyBUcnkgdG8gbWF0Y2ggYSByb290XG4gICAgaWYgKGxlbiA+IDEpIHtcbiAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAgICAgLy8gUG9zc2libGUgVU5DIHJvb3RcblxuICAgICAgICAvLyBJZiB3ZSBzdGFydGVkIHdpdGggYSBzZXBhcmF0b3IsIHdlIGtub3cgd2UgYXQgbGVhc3QgaGF2ZSBhblxuICAgICAgICAvLyBhYnNvbHV0ZSBwYXRoIG9mIHNvbWUga2luZCAoVU5DIG9yIG90aGVyd2lzZSlcbiAgICAgICAgaXNBYnNvbHV0ZSA9IHRydWU7XG5cbiAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoMSkpKSB7XG4gICAgICAgICAgLy8gTWF0Y2hlZCBkb3VibGUgcGF0aCBzZXBhcmF0b3IgYXQgYmVnaW5uaW5nXG4gICAgICAgICAgbGV0IGogPSAyO1xuICAgICAgICAgIGxldCBsYXN0ID0gajtcbiAgICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgbm9uLXBhdGggc2VwYXJhdG9yc1xuICAgICAgICAgIGZvciAoOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChqIDwgbGVuICYmIGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0UGFydCA9IHBhdGguc2xpY2UobGFzdCwgaik7XG4gICAgICAgICAgICAvLyBNYXRjaGVkIVxuICAgICAgICAgICAgbGFzdCA9IGo7XG4gICAgICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICAgIGlmICghaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChqKSkpIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGogPCBsZW4gJiYgaiAhPT0gbGFzdCkge1xuICAgICAgICAgICAgICAvLyBNYXRjaGVkIVxuICAgICAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAgICAgLy8gTWF0Y2ggMSBvciBtb3JlIG5vbi1wYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGogPT09IGxlbikge1xuICAgICAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgYSBVTkMgcm9vdCBvbmx5XG4gICAgICAgICAgICAgICAgZGV2aWNlID0gYFxcXFxcXFxcJHtmaXJzdFBhcnR9XFxcXCR7cGF0aC5zbGljZShsYXN0KX1gO1xuICAgICAgICAgICAgICAgIHJvb3RFbmQgPSBqO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBtYXRjaGVkIGEgVU5DIHJvb3Qgd2l0aCBsZWZ0b3ZlcnNcblxuICAgICAgICAgICAgICAgIGRldmljZSA9IGBcXFxcXFxcXCR7Zmlyc3RQYXJ0fVxcXFwke3BhdGguc2xpY2UobGFzdCwgail9YDtcbiAgICAgICAgICAgICAgICByb290RW5kID0gajtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByb290RW5kID0gMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc1dpbmRvd3NEZXZpY2VSb290KGNvZGUpKSB7XG4gICAgICAgIC8vIFBvc3NpYmxlIGRldmljZSByb290XG5cbiAgICAgICAgaWYgKHBhdGguY2hhckNvZGVBdCgxKSA9PT0gQ0hBUl9DT0xPTikge1xuICAgICAgICAgIGRldmljZSA9IHBhdGguc2xpY2UoMCwgMik7XG4gICAgICAgICAgcm9vdEVuZCA9IDI7XG4gICAgICAgICAgaWYgKGxlbiA+IDIpIHtcbiAgICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KDIpKSkge1xuICAgICAgICAgICAgICAvLyBUcmVhdCBzZXBhcmF0b3IgZm9sbG93aW5nIGRyaXZlIG5hbWUgYXMgYW4gYWJzb2x1dGUgcGF0aFxuICAgICAgICAgICAgICAvLyBpbmRpY2F0b3JcbiAgICAgICAgICAgICAgaXNBYnNvbHV0ZSA9IHRydWU7XG4gICAgICAgICAgICAgIHJvb3RFbmQgPSAzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAvLyBgcGF0aGAgY29udGFpbnMganVzdCBhIHBhdGggc2VwYXJhdG9yXG4gICAgICByb290RW5kID0gMTtcbiAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIGRldmljZS5sZW5ndGggPiAwICYmXG4gICAgICByZXNvbHZlZERldmljZS5sZW5ndGggPiAwICYmXG4gICAgICBkZXZpY2UudG9Mb3dlckNhc2UoKSAhPT0gcmVzb2x2ZWREZXZpY2UudG9Mb3dlckNhc2UoKVxuICAgICkge1xuICAgICAgLy8gVGhpcyBwYXRoIHBvaW50cyB0byBhbm90aGVyIGRldmljZSBzbyBpdCBpcyBub3QgYXBwbGljYWJsZVxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHJlc29sdmVkRGV2aWNlLmxlbmd0aCA9PT0gMCAmJiBkZXZpY2UubGVuZ3RoID4gMCkge1xuICAgICAgcmVzb2x2ZWREZXZpY2UgPSBkZXZpY2U7XG4gICAgfVxuICAgIGlmICghcmVzb2x2ZWRBYnNvbHV0ZSkge1xuICAgICAgcmVzb2x2ZWRUYWlsID0gYCR7cGF0aC5zbGljZShyb290RW5kKX1cXFxcJHtyZXNvbHZlZFRhaWx9YDtcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBpc0Fic29sdXRlO1xuICAgIH1cblxuICAgIGlmIChyZXNvbHZlZEFic29sdXRlICYmIHJlc29sdmVkRGV2aWNlLmxlbmd0aCA+IDApIGJyZWFrO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsXG4gIC8vIGJ1dCBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKVxuICAvLyBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHRhaWwgcGF0aFxuICByZXNvbHZlZFRhaWwgPSBub3JtYWxpemVTdHJpbmcoXG4gICAgcmVzb2x2ZWRUYWlsLFxuICAgICFyZXNvbHZlZEFic29sdXRlLFxuICAgIFwiXFxcXFwiLFxuICAgIGlzUGF0aFNlcGFyYXRvcixcbiAgKTtcblxuICByZXR1cm4gcmVzb2x2ZWREZXZpY2UgKyAocmVzb2x2ZWRBYnNvbHV0ZSA/IFwiXFxcXFwiIDogXCJcIikgKyByZXNvbHZlZFRhaWwgfHwgXCIuXCI7XG59XG5cbi8qKlxuICogTm9ybWFsaXplcyBhIGBwYXRoYFxuICogQHBhcmFtIHBhdGggdG8gbm9ybWFsaXplXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgY29uc3QgbGVuID0gcGF0aC5sZW5ndGg7XG4gIGlmIChsZW4gPT09IDApIHJldHVybiBcIi5cIjtcbiAgbGV0IHJvb3RFbmQgPSAwO1xuICBsZXQgZGV2aWNlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGxldCBpc0Fic29sdXRlID0gZmFsc2U7XG4gIGNvbnN0IGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoMCk7XG5cbiAgLy8gVHJ5IHRvIG1hdGNoIGEgcm9vdFxuICBpZiAobGVuID4gMSkge1xuICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAgIC8vIFBvc3NpYmxlIFVOQyByb290XG5cbiAgICAgIC8vIElmIHdlIHN0YXJ0ZWQgd2l0aCBhIHNlcGFyYXRvciwgd2Uga25vdyB3ZSBhdCBsZWFzdCBoYXZlIGFuIGFic29sdXRlXG4gICAgICAvLyBwYXRoIG9mIHNvbWUga2luZCAoVU5DIG9yIG90aGVyd2lzZSlcbiAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuXG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgxKSkpIHtcbiAgICAgICAgLy8gTWF0Y2hlZCBkb3VibGUgcGF0aCBzZXBhcmF0b3IgYXQgYmVnaW5uaW5nXG4gICAgICAgIGxldCBqID0gMjtcbiAgICAgICAgbGV0IGxhc3QgPSBqO1xuICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgbm9uLXBhdGggc2VwYXJhdG9yc1xuICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaiA8IGxlbiAmJiBqICE9PSBsYXN0KSB7XG4gICAgICAgICAgY29uc3QgZmlyc3RQYXJ0ID0gcGF0aC5zbGljZShsYXN0LCBqKTtcbiAgICAgICAgICAvLyBNYXRjaGVkIVxuICAgICAgICAgIGxhc3QgPSBqO1xuICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBwYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICBpZiAoIWlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGogPCBsZW4gJiYgaiAhPT0gbGFzdCkge1xuICAgICAgICAgICAgLy8gTWF0Y2hlZCFcbiAgICAgICAgICAgIGxhc3QgPSBqO1xuICAgICAgICAgICAgLy8gTWF0Y2ggMSBvciBtb3JlIG5vbi1wYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICAgIGZvciAoOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChqID09PSBsZW4pIHtcbiAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IG9ubHlcbiAgICAgICAgICAgICAgLy8gUmV0dXJuIHRoZSBub3JtYWxpemVkIHZlcnNpb24gb2YgdGhlIFVOQyByb290IHNpbmNlIHRoZXJlXG4gICAgICAgICAgICAgIC8vIGlzIG5vdGhpbmcgbGVmdCB0byBwcm9jZXNzXG5cbiAgICAgICAgICAgICAgcmV0dXJuIGBcXFxcXFxcXCR7Zmlyc3RQYXJ0fVxcXFwke3BhdGguc2xpY2UobGFzdCl9XFxcXGA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IHdpdGggbGVmdG92ZXJzXG5cbiAgICAgICAgICAgICAgZGV2aWNlID0gYFxcXFxcXFxcJHtmaXJzdFBhcnR9XFxcXCR7cGF0aC5zbGljZShsYXN0LCBqKX1gO1xuICAgICAgICAgICAgICByb290RW5kID0gajtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3RFbmQgPSAxO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dzRGV2aWNlUm9vdChjb2RlKSkge1xuICAgICAgLy8gUG9zc2libGUgZGV2aWNlIHJvb3RcblxuICAgICAgaWYgKHBhdGguY2hhckNvZGVBdCgxKSA9PT0gQ0hBUl9DT0xPTikge1xuICAgICAgICBkZXZpY2UgPSBwYXRoLnNsaWNlKDAsIDIpO1xuICAgICAgICByb290RW5kID0gMjtcbiAgICAgICAgaWYgKGxlbiA+IDIpIHtcbiAgICAgICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgyKSkpIHtcbiAgICAgICAgICAgIC8vIFRyZWF0IHNlcGFyYXRvciBmb2xsb3dpbmcgZHJpdmUgbmFtZSBhcyBhbiBhYnNvbHV0ZSBwYXRoXG4gICAgICAgICAgICAvLyBpbmRpY2F0b3JcbiAgICAgICAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuICAgICAgICAgICAgcm9vdEVuZCA9IDM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzUGF0aFNlcGFyYXRvcihjb2RlKSkge1xuICAgIC8vIGBwYXRoYCBjb250YWlucyBqdXN0IGEgcGF0aCBzZXBhcmF0b3IsIGV4aXQgZWFybHkgdG8gYXZvaWQgdW5uZWNlc3NhcnlcbiAgICAvLyB3b3JrXG4gICAgcmV0dXJuIFwiXFxcXFwiO1xuICB9XG5cbiAgbGV0IHRhaWw6IHN0cmluZztcbiAgaWYgKHJvb3RFbmQgPCBsZW4pIHtcbiAgICB0YWlsID0gbm9ybWFsaXplU3RyaW5nKFxuICAgICAgcGF0aC5zbGljZShyb290RW5kKSxcbiAgICAgICFpc0Fic29sdXRlLFxuICAgICAgXCJcXFxcXCIsXG4gICAgICBpc1BhdGhTZXBhcmF0b3IsXG4gICAgKTtcbiAgfSBlbHNlIHtcbiAgICB0YWlsID0gXCJcIjtcbiAgfVxuICBpZiAodGFpbC5sZW5ndGggPT09IDAgJiYgIWlzQWJzb2x1dGUpIHRhaWwgPSBcIi5cIjtcbiAgaWYgKHRhaWwubGVuZ3RoID4gMCAmJiBpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGxlbiAtIDEpKSkge1xuICAgIHRhaWwgKz0gXCJcXFxcXCI7XG4gIH1cbiAgaWYgKGRldmljZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGlzQWJzb2x1dGUpIHtcbiAgICAgIGlmICh0YWlsLmxlbmd0aCA+IDApIHJldHVybiBgXFxcXCR7dGFpbH1gO1xuICAgICAgZWxzZSByZXR1cm4gXCJcXFxcXCI7XG4gICAgfSBlbHNlIGlmICh0YWlsLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB0YWlsO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNBYnNvbHV0ZSkge1xuICAgIGlmICh0YWlsLmxlbmd0aCA+IDApIHJldHVybiBgJHtkZXZpY2V9XFxcXCR7dGFpbH1gO1xuICAgIGVsc2UgcmV0dXJuIGAke2RldmljZX1cXFxcYDtcbiAgfSBlbHNlIGlmICh0YWlsLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gZGV2aWNlICsgdGFpbDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZGV2aWNlO1xuICB9XG59XG5cbi8qKlxuICogVmVyaWZpZXMgd2hldGhlciBwYXRoIGlzIGFic29sdXRlXG4gKiBAcGFyYW0gcGF0aCB0byB2ZXJpZnlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQWJzb2x1dGUocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGFzc2VydFBhdGgocGF0aCk7XG4gIGNvbnN0IGxlbiA9IHBhdGgubGVuZ3RoO1xuICBpZiAobGVuID09PSAwKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgY29kZSA9IHBhdGguY2hhckNvZGVBdCgwKTtcbiAgaWYgKGlzUGF0aFNlcGFyYXRvcihjb2RlKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzV2luZG93c0RldmljZVJvb3QoY29kZSkpIHtcbiAgICAvLyBQb3NzaWJsZSBkZXZpY2Ugcm9vdFxuXG4gICAgaWYgKGxlbiA+IDIgJiYgcGF0aC5jaGFyQ29kZUF0KDEpID09PSBDSEFSX0NPTE9OKSB7XG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgyKSkpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogSm9pbiBhbGwgZ2l2ZW4gYSBzZXF1ZW5jZSBvZiBgcGF0aHNgLHRoZW4gbm9ybWFsaXplcyB0aGUgcmVzdWx0aW5nIHBhdGguXG4gKiBAcGFyYW0gcGF0aHMgdG8gYmUgam9pbmVkIGFuZCBub3JtYWxpemVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqb2luKC4uLnBhdGhzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIGNvbnN0IHBhdGhzQ291bnQgPSBwYXRocy5sZW5ndGg7XG4gIGlmIChwYXRoc0NvdW50ID09PSAwKSByZXR1cm4gXCIuXCI7XG5cbiAgbGV0IGpvaW5lZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBsZXQgZmlyc3RQYXJ0OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXRoc0NvdW50OyArK2kpIHtcbiAgICBjb25zdCBwYXRoID0gcGF0aHNbaV07XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgICBpZiAocGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICBpZiAoam9pbmVkID09PSB1bmRlZmluZWQpIGpvaW5lZCA9IGZpcnN0UGFydCA9IHBhdGg7XG4gICAgICBlbHNlIGpvaW5lZCArPSBgXFxcXCR7cGF0aH1gO1xuICAgIH1cbiAgfVxuXG4gIGlmIChqb2luZWQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIFwiLlwiO1xuXG4gIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBqb2luZWQgcGF0aCBkb2Vzbid0IHN0YXJ0IHdpdGggdHdvIHNsYXNoZXMsIGJlY2F1c2VcbiAgLy8gbm9ybWFsaXplKCkgd2lsbCBtaXN0YWtlIGl0IGZvciBhbiBVTkMgcGF0aCB0aGVuLlxuICAvL1xuICAvLyBUaGlzIHN0ZXAgaXMgc2tpcHBlZCB3aGVuIGl0IGlzIHZlcnkgY2xlYXIgdGhhdCB0aGUgdXNlciBhY3R1YWxseVxuICAvLyBpbnRlbmRlZCB0byBwb2ludCBhdCBhbiBVTkMgcGF0aC4gVGhpcyBpcyBhc3N1bWVkIHdoZW4gdGhlIGZpcnN0XG4gIC8vIG5vbi1lbXB0eSBzdHJpbmcgYXJndW1lbnRzIHN0YXJ0cyB3aXRoIGV4YWN0bHkgdHdvIHNsYXNoZXMgZm9sbG93ZWQgYnlcbiAgLy8gYXQgbGVhc3Qgb25lIG1vcmUgbm9uLXNsYXNoIGNoYXJhY3Rlci5cbiAgLy9cbiAgLy8gTm90ZSB0aGF0IGZvciBub3JtYWxpemUoKSB0byB0cmVhdCBhIHBhdGggYXMgYW4gVU5DIHBhdGggaXQgbmVlZHMgdG9cbiAgLy8gaGF2ZSBhdCBsZWFzdCAyIGNvbXBvbmVudHMsIHNvIHdlIGRvbid0IGZpbHRlciBmb3IgdGhhdCBoZXJlLlxuICAvLyBUaGlzIG1lYW5zIHRoYXQgdGhlIHVzZXIgY2FuIHVzZSBqb2luIHRvIGNvbnN0cnVjdCBVTkMgcGF0aHMgZnJvbVxuICAvLyBhIHNlcnZlciBuYW1lIGFuZCBhIHNoYXJlIG5hbWU7IGZvciBleGFtcGxlOlxuICAvLyAgIHBhdGguam9pbignLy9zZXJ2ZXInLCAnc2hhcmUnKSAtPiAnXFxcXFxcXFxzZXJ2ZXJcXFxcc2hhcmVcXFxcJylcbiAgbGV0IG5lZWRzUmVwbGFjZSA9IHRydWU7XG4gIGxldCBzbGFzaENvdW50ID0gMDtcbiAgYXNzZXJ0KGZpcnN0UGFydCAhPSBudWxsKTtcbiAgaWYgKGlzUGF0aFNlcGFyYXRvcihmaXJzdFBhcnQuY2hhckNvZGVBdCgwKSkpIHtcbiAgICArK3NsYXNoQ291bnQ7XG4gICAgY29uc3QgZmlyc3RMZW4gPSBmaXJzdFBhcnQubGVuZ3RoO1xuICAgIGlmIChmaXJzdExlbiA+IDEpIHtcbiAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoZmlyc3RQYXJ0LmNoYXJDb2RlQXQoMSkpKSB7XG4gICAgICAgICsrc2xhc2hDb3VudDtcbiAgICAgICAgaWYgKGZpcnN0TGVuID4gMikge1xuICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoZmlyc3RQYXJ0LmNoYXJDb2RlQXQoMikpKSArK3NsYXNoQ291bnQ7XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBXZSBtYXRjaGVkIGEgVU5DIHBhdGggaW4gdGhlIGZpcnN0IHBhcnRcbiAgICAgICAgICAgIG5lZWRzUmVwbGFjZSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAobmVlZHNSZXBsYWNlKSB7XG4gICAgLy8gRmluZCBhbnkgbW9yZSBjb25zZWN1dGl2ZSBzbGFzaGVzIHdlIG5lZWQgdG8gcmVwbGFjZVxuICAgIGZvciAoOyBzbGFzaENvdW50IDwgam9pbmVkLmxlbmd0aDsgKytzbGFzaENvdW50KSB7XG4gICAgICBpZiAoIWlzUGF0aFNlcGFyYXRvcihqb2luZWQuY2hhckNvZGVBdChzbGFzaENvdW50KSkpIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIFJlcGxhY2UgdGhlIHNsYXNoZXMgaWYgbmVlZGVkXG4gICAgaWYgKHNsYXNoQ291bnQgPj0gMikgam9pbmVkID0gYFxcXFwke2pvaW5lZC5zbGljZShzbGFzaENvdW50KX1gO1xuICB9XG5cbiAgcmV0dXJuIG5vcm1hbGl6ZShqb2luZWQpO1xufVxuXG4vKipcbiAqIEl0IHdpbGwgc29sdmUgdGhlIHJlbGF0aXZlIHBhdGggZnJvbSBgZnJvbWAgdG8gYHRvYCwgZm9yIGluc3RhbmNlOlxuICogIGZyb20gPSAnQzpcXFxcb3JhbmRlYVxcXFx0ZXN0XFxcXGFhYSdcbiAqICB0byA9ICdDOlxcXFxvcmFuZGVhXFxcXGltcGxcXFxcYmJiJ1xuICogVGhlIG91dHB1dCBvZiB0aGUgZnVuY3Rpb24gc2hvdWxkIGJlOiAnLi5cXFxcLi5cXFxcaW1wbFxcXFxiYmInXG4gKiBAcGFyYW0gZnJvbSByZWxhdGl2ZSBwYXRoXG4gKiBAcGFyYW0gdG8gcmVsYXRpdmUgcGF0aFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVsYXRpdmUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0UGF0aChmcm9tKTtcbiAgYXNzZXJ0UGF0aCh0byk7XG5cbiAgaWYgKGZyb20gPT09IHRvKSByZXR1cm4gXCJcIjtcblxuICBjb25zdCBmcm9tT3JpZyA9IHJlc29sdmUoZnJvbSk7XG4gIGNvbnN0IHRvT3JpZyA9IHJlc29sdmUodG8pO1xuXG4gIGlmIChmcm9tT3JpZyA9PT0gdG9PcmlnKSByZXR1cm4gXCJcIjtcblxuICBmcm9tID0gZnJvbU9yaWcudG9Mb3dlckNhc2UoKTtcbiAgdG8gPSB0b09yaWcudG9Mb3dlckNhc2UoKTtcblxuICBpZiAoZnJvbSA9PT0gdG8pIHJldHVybiBcIlwiO1xuXG4gIC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcbiAgbGV0IGZyb21TdGFydCA9IDA7XG4gIGxldCBmcm9tRW5kID0gZnJvbS5sZW5ndGg7XG4gIGZvciAoOyBmcm9tU3RhcnQgPCBmcm9tRW5kOyArK2Zyb21TdGFydCkge1xuICAgIGlmIChmcm9tLmNoYXJDb2RlQXQoZnJvbVN0YXJ0KSAhPT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgYnJlYWs7XG4gIH1cbiAgLy8gVHJpbSB0cmFpbGluZyBiYWNrc2xhc2hlcyAoYXBwbGljYWJsZSB0byBVTkMgcGF0aHMgb25seSlcbiAgZm9yICg7IGZyb21FbmQgLSAxID4gZnJvbVN0YXJ0OyAtLWZyb21FbmQpIHtcbiAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21FbmQgLSAxKSAhPT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgYnJlYWs7XG4gIH1cbiAgY29uc3QgZnJvbUxlbiA9IGZyb21FbmQgLSBmcm9tU3RhcnQ7XG5cbiAgLy8gVHJpbSBhbnkgbGVhZGluZyBiYWNrc2xhc2hlc1xuICBsZXQgdG9TdGFydCA9IDA7XG4gIGxldCB0b0VuZCA9IHRvLmxlbmd0aDtcbiAgZm9yICg7IHRvU3RhcnQgPCB0b0VuZDsgKyt0b1N0YXJ0KSB7XG4gICAgaWYgKHRvLmNoYXJDb2RlQXQodG9TdGFydCkgIT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIGJyZWFrO1xuICB9XG4gIC8vIFRyaW0gdHJhaWxpbmcgYmFja3NsYXNoZXMgKGFwcGxpY2FibGUgdG8gVU5DIHBhdGhzIG9ubHkpXG4gIGZvciAoOyB0b0VuZCAtIDEgPiB0b1N0YXJ0OyAtLXRvRW5kKSB7XG4gICAgaWYgKHRvLmNoYXJDb2RlQXQodG9FbmQgLSAxKSAhPT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgYnJlYWs7XG4gIH1cbiAgY29uc3QgdG9MZW4gPSB0b0VuZCAtIHRvU3RhcnQ7XG5cbiAgLy8gQ29tcGFyZSBwYXRocyB0byBmaW5kIHRoZSBsb25nZXN0IGNvbW1vbiBwYXRoIGZyb20gcm9vdFxuICBjb25zdCBsZW5ndGggPSBmcm9tTGVuIDwgdG9MZW4gPyBmcm9tTGVuIDogdG9MZW47XG4gIGxldCBsYXN0Q29tbW9uU2VwID0gLTE7XG4gIGxldCBpID0gMDtcbiAgZm9yICg7IGkgPD0gbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoaSA9PT0gbGVuZ3RoKSB7XG4gICAgICBpZiAodG9MZW4gPiBsZW5ndGgpIHtcbiAgICAgICAgaWYgKHRvLmNoYXJDb2RlQXQodG9TdGFydCArIGkpID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIKSB7XG4gICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYGZyb21gIGlzIHRoZSBleGFjdCBiYXNlIHBhdGggZm9yIGB0b2AuXG4gICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209J0M6XFxcXGZvb1xcXFxiYXInOyB0bz0nQzpcXFxcZm9vXFxcXGJhclxcXFxiYXonXG4gICAgICAgICAgcmV0dXJuIHRvT3JpZy5zbGljZSh0b1N0YXJ0ICsgaSArIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKGkgPT09IDIpIHtcbiAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgZnJvbWAgaXMgdGhlIGRldmljZSByb290LlxuICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPSdDOlxcXFwnOyB0bz0nQzpcXFxcZm9vJ1xuICAgICAgICAgIHJldHVybiB0b09yaWcuc2xpY2UodG9TdGFydCArIGkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZnJvbUxlbiA+IGxlbmd0aCkge1xuICAgICAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIKSB7XG4gICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYHRvYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgZnJvbWAuXG4gICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209J0M6XFxcXGZvb1xcXFxiYXInOyB0bz0nQzpcXFxcZm9vJ1xuICAgICAgICAgIGxhc3RDb21tb25TZXAgPSBpO1xuICAgICAgICB9IGVsc2UgaWYgKGkgPT09IDIpIHtcbiAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgdG9gIGlzIHRoZSBkZXZpY2Ugcm9vdC5cbiAgICAgICAgICAvLyBGb3IgZXhhbXBsZTogZnJvbT0nQzpcXFxcZm9vXFxcXGJhcic7IHRvPSdDOlxcXFwnXG4gICAgICAgICAgbGFzdENvbW1vblNlcCA9IDM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCBmcm9tQ29kZSA9IGZyb20uY2hhckNvZGVBdChmcm9tU3RhcnQgKyBpKTtcbiAgICBjb25zdCB0b0NvZGUgPSB0by5jaGFyQ29kZUF0KHRvU3RhcnQgKyBpKTtcbiAgICBpZiAoZnJvbUNvZGUgIT09IHRvQ29kZSkgYnJlYWs7XG4gICAgZWxzZSBpZiAoZnJvbUNvZGUgPT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIGxhc3RDb21tb25TZXAgPSBpO1xuICB9XG5cbiAgLy8gV2UgZm91bmQgYSBtaXNtYXRjaCBiZWZvcmUgdGhlIGZpcnN0IGNvbW1vbiBwYXRoIHNlcGFyYXRvciB3YXMgc2Vlbiwgc29cbiAgLy8gcmV0dXJuIHRoZSBvcmlnaW5hbCBgdG9gLlxuICBpZiAoaSAhPT0gbGVuZ3RoICYmIGxhc3RDb21tb25TZXAgPT09IC0xKSB7XG4gICAgcmV0dXJuIHRvT3JpZztcbiAgfVxuXG4gIGxldCBvdXQgPSBcIlwiO1xuICBpZiAobGFzdENvbW1vblNlcCA9PT0gLTEpIGxhc3RDb21tb25TZXAgPSAwO1xuICAvLyBHZW5lcmF0ZSB0aGUgcmVsYXRpdmUgcGF0aCBiYXNlZCBvbiB0aGUgcGF0aCBkaWZmZXJlbmNlIGJldHdlZW4gYHRvYCBhbmRcbiAgLy8gYGZyb21gXG4gIGZvciAoaSA9IGZyb21TdGFydCArIGxhc3RDb21tb25TZXAgKyAxOyBpIDw9IGZyb21FbmQ7ICsraSkge1xuICAgIGlmIChpID09PSBmcm9tRW5kIHx8IGZyb20uY2hhckNvZGVBdChpKSA9PT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkge1xuICAgICAgaWYgKG91dC5sZW5ndGggPT09IDApIG91dCArPSBcIi4uXCI7XG4gICAgICBlbHNlIG91dCArPSBcIlxcXFwuLlwiO1xuICAgIH1cbiAgfVxuXG4gIC8vIExhc3RseSwgYXBwZW5kIHRoZSByZXN0IG9mIHRoZSBkZXN0aW5hdGlvbiAoYHRvYCkgcGF0aCB0aGF0IGNvbWVzIGFmdGVyXG4gIC8vIHRoZSBjb21tb24gcGF0aCBwYXJ0c1xuICBpZiAob3V0Lmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gb3V0ICsgdG9PcmlnLnNsaWNlKHRvU3RhcnQgKyBsYXN0Q29tbW9uU2VwLCB0b0VuZCk7XG4gIH0gZWxzZSB7XG4gICAgdG9TdGFydCArPSBsYXN0Q29tbW9uU2VwO1xuICAgIGlmICh0b09yaWcuY2hhckNvZGVBdCh0b1N0YXJ0KSA9PT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgKyt0b1N0YXJ0O1xuICAgIHJldHVybiB0b09yaWcuc2xpY2UodG9TdGFydCwgdG9FbmQpO1xuICB9XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgcGF0aCB0byBhIG5hbWVzcGFjZSBwYXRoXG4gKiBAcGFyYW0gcGF0aCB0byByZXNvbHZlIHRvIG5hbWVzcGFjZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9OYW1lc3BhY2VkUGF0aChwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBOb3RlOiB0aGlzIHdpbGwgKnByb2JhYmx5KiB0aHJvdyBzb21ld2hlcmUuXG4gIGlmICh0eXBlb2YgcGF0aCAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIHBhdGg7XG4gIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwiXCI7XG5cbiAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcmVzb2x2ZShwYXRoKTtcblxuICBpZiAocmVzb2x2ZWRQYXRoLmxlbmd0aCA+PSAzKSB7XG4gICAgaWYgKHJlc29sdmVkUGF0aC5jaGFyQ29kZUF0KDApID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIKSB7XG4gICAgICAvLyBQb3NzaWJsZSBVTkMgcm9vdFxuXG4gICAgICBpZiAocmVzb2x2ZWRQYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIHtcbiAgICAgICAgY29uc3QgY29kZSA9IHJlc29sdmVkUGF0aC5jaGFyQ29kZUF0KDIpO1xuICAgICAgICBpZiAoY29kZSAhPT0gQ0hBUl9RVUVTVElPTl9NQVJLICYmIGNvZGUgIT09IENIQVJfRE9UKSB7XG4gICAgICAgICAgLy8gTWF0Y2hlZCBub24tbG9uZyBVTkMgcm9vdCwgY29udmVydCB0aGUgcGF0aCB0byBhIGxvbmcgVU5DIHBhdGhcbiAgICAgICAgICByZXR1cm4gYFxcXFxcXFxcP1xcXFxVTkNcXFxcJHtyZXNvbHZlZFBhdGguc2xpY2UoMil9YDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dzRGV2aWNlUm9vdChyZXNvbHZlZFBhdGguY2hhckNvZGVBdCgwKSkpIHtcbiAgICAgIC8vIFBvc3NpYmxlIGRldmljZSByb290XG5cbiAgICAgIGlmIChcbiAgICAgICAgcmVzb2x2ZWRQYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04gJiZcbiAgICAgICAgcmVzb2x2ZWRQYXRoLmNoYXJDb2RlQXQoMikgPT09IENIQVJfQkFDS1dBUkRfU0xBU0hcbiAgICAgICkge1xuICAgICAgICAvLyBNYXRjaGVkIGRldmljZSByb290LCBjb252ZXJ0IHRoZSBwYXRoIHRvIGEgbG9uZyBVTkMgcGF0aFxuICAgICAgICByZXR1cm4gYFxcXFxcXFxcP1xcXFwke3Jlc29sdmVkUGF0aH1gO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXRoO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgZGlyZWN0b3J5IG5hbWUgb2YgYSBgcGF0aGAuXG4gKiBAcGFyYW0gcGF0aCB0byBkZXRlcm1pbmUgbmFtZSBmb3JcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpcm5hbWUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgY29uc3QgbGVuID0gcGF0aC5sZW5ndGg7XG4gIGlmIChsZW4gPT09IDApIHJldHVybiBcIi5cIjtcbiAgbGV0IHJvb3RFbmQgPSAtMTtcbiAgbGV0IGVuZCA9IC0xO1xuICBsZXQgbWF0Y2hlZFNsYXNoID0gdHJ1ZTtcbiAgbGV0IG9mZnNldCA9IDA7XG4gIGNvbnN0IGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoMCk7XG5cbiAgLy8gVHJ5IHRvIG1hdGNoIGEgcm9vdFxuICBpZiAobGVuID4gMSkge1xuICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAgIC8vIFBvc3NpYmxlIFVOQyByb290XG5cbiAgICAgIHJvb3RFbmQgPSBvZmZzZXQgPSAxO1xuXG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgxKSkpIHtcbiAgICAgICAgLy8gTWF0Y2hlZCBkb3VibGUgcGF0aCBzZXBhcmF0b3IgYXQgYmVnaW5uaW5nXG4gICAgICAgIGxldCBqID0gMjtcbiAgICAgICAgbGV0IGxhc3QgPSBqO1xuICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgbm9uLXBhdGggc2VwYXJhdG9yc1xuICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaiA8IGxlbiAmJiBqICE9PSBsYXN0KSB7XG4gICAgICAgICAgLy8gTWF0Y2hlZCFcbiAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgICAgaWYgKCFpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChqIDwgbGVuICYmIGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgIC8vIE1hdGNoZWQhXG4gICAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBub24tcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaiA9PT0gbGVuKSB7XG4gICAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgYSBVTkMgcm9vdCBvbmx5XG4gICAgICAgICAgICAgIHJldHVybiBwYXRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IHdpdGggbGVmdG92ZXJzXG5cbiAgICAgICAgICAgICAgLy8gT2Zmc2V0IGJ5IDEgdG8gaW5jbHVkZSB0aGUgc2VwYXJhdG9yIGFmdGVyIHRoZSBVTkMgcm9vdCB0b1xuICAgICAgICAgICAgICAvLyB0cmVhdCBpdCBhcyBhIFwibm9ybWFsIHJvb3RcIiBvbiB0b3Agb2YgYSAoVU5DKSByb290XG4gICAgICAgICAgICAgIHJvb3RFbmQgPSBvZmZzZXQgPSBqICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzV2luZG93c0RldmljZVJvb3QoY29kZSkpIHtcbiAgICAgIC8vIFBvc3NpYmxlIGRldmljZSByb290XG5cbiAgICAgIGlmIChwYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04pIHtcbiAgICAgICAgcm9vdEVuZCA9IG9mZnNldCA9IDI7XG4gICAgICAgIGlmIChsZW4gPiAyKSB7XG4gICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoMikpKSByb290RW5kID0gb2Zmc2V0ID0gMztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAvLyBgcGF0aGAgY29udGFpbnMganVzdCBhIHBhdGggc2VwYXJhdG9yLCBleGl0IGVhcmx5IHRvIGF2b2lkXG4gICAgLy8gdW5uZWNlc3Nhcnkgd29ya1xuICAgIHJldHVybiBwYXRoO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IGxlbiAtIDE7IGkgPj0gb2Zmc2V0OyAtLWkpIHtcbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChpKSkpIHtcbiAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgIGVuZCA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvclxuICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICBpZiAocm9vdEVuZCA9PT0gLTEpIHJldHVybiBcIi5cIjtcbiAgICBlbHNlIGVuZCA9IHJvb3RFbmQ7XG4gIH1cbiAgcmV0dXJuIHBhdGguc2xpY2UoMCwgZW5kKTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIGxhc3QgcG9ydGlvbiBvZiBhIGBwYXRoYC4gVHJhaWxpbmcgZGlyZWN0b3J5IHNlcGFyYXRvcnMgYXJlIGlnbm9yZWQuXG4gKiBAcGFyYW0gcGF0aCB0byBwcm9jZXNzXG4gKiBAcGFyYW0gZXh0IG9mIHBhdGggZGlyZWN0b3J5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlbmFtZShwYXRoOiBzdHJpbmcsIGV4dCA9IFwiXCIpOiBzdHJpbmcge1xuICBpZiAoZXh0ICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGV4dCAhPT0gXCJzdHJpbmdcIikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiZXh0XCIgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZycpO1xuICB9XG5cbiAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICBsZXQgc3RhcnQgPSAwO1xuICBsZXQgZW5kID0gLTE7XG4gIGxldCBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICBsZXQgaTogbnVtYmVyO1xuXG4gIC8vIENoZWNrIGZvciBhIGRyaXZlIGxldHRlciBwcmVmaXggc28gYXMgbm90IHRvIG1pc3Rha2UgdGhlIGZvbGxvd2luZ1xuICAvLyBwYXRoIHNlcGFyYXRvciBhcyBhbiBleHRyYSBzZXBhcmF0b3IgYXQgdGhlIGVuZCBvZiB0aGUgcGF0aCB0aGF0IGNhbiBiZVxuICAvLyBkaXNyZWdhcmRlZFxuICBpZiAocGF0aC5sZW5ndGggPj0gMikge1xuICAgIGNvbnN0IGRyaXZlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuICAgIGlmIChpc1dpbmRvd3NEZXZpY2VSb290KGRyaXZlKSkge1xuICAgICAgaWYgKHBhdGguY2hhckNvZGVBdCgxKSA9PT0gQ0hBUl9DT0xPTikgc3RhcnQgPSAyO1xuICAgIH1cbiAgfVxuXG4gIGlmIChleHQgIT09IHVuZGVmaW5lZCAmJiBleHQubGVuZ3RoID4gMCAmJiBleHQubGVuZ3RoIDw9IHBhdGgubGVuZ3RoKSB7XG4gICAgaWYgKGV4dC5sZW5ndGggPT09IHBhdGgubGVuZ3RoICYmIGV4dCA9PT0gcGF0aCkgcmV0dXJuIFwiXCI7XG4gICAgbGV0IGV4dElkeCA9IGV4dC5sZW5ndGggLSAxO1xuICAgIGxldCBmaXJzdE5vblNsYXNoRW5kID0gLTE7XG4gICAgZm9yIChpID0gcGF0aC5sZW5ndGggLSAxOyBpID49IHN0YXJ0OyAtLWkpIHtcbiAgICAgIGNvbnN0IGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBwYXRoIHNlcGFyYXRvciB0aGF0IHdhcyBub3QgcGFydCBvZiBhIHNldCBvZiBwYXRoXG4gICAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmaXJzdE5vblNsYXNoRW5kID09PSAtMSkge1xuICAgICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCByZW1lbWJlciB0aGlzIGluZGV4IGluIGNhc2VcbiAgICAgICAgICAvLyB3ZSBuZWVkIGl0IGlmIHRoZSBleHRlbnNpb24gZW5kcyB1cCBub3QgbWF0Y2hpbmdcbiAgICAgICAgICBtYXRjaGVkU2xhc2ggPSBmYWxzZTtcbiAgICAgICAgICBmaXJzdE5vblNsYXNoRW5kID0gaSArIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV4dElkeCA+PSAwKSB7XG4gICAgICAgICAgLy8gVHJ5IHRvIG1hdGNoIHRoZSBleHBsaWNpdCBleHRlbnNpb25cbiAgICAgICAgICBpZiAoY29kZSA9PT0gZXh0LmNoYXJDb2RlQXQoZXh0SWR4KSkge1xuICAgICAgICAgICAgaWYgKC0tZXh0SWR4ID09PSAtMSkge1xuICAgICAgICAgICAgICAvLyBXZSBtYXRjaGVkIHRoZSBleHRlbnNpb24sIHNvIG1hcmsgdGhpcyBhcyB0aGUgZW5kIG9mIG91ciBwYXRoXG4gICAgICAgICAgICAgIC8vIGNvbXBvbmVudFxuICAgICAgICAgICAgICBlbmQgPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFeHRlbnNpb24gZG9lcyBub3QgbWF0Y2gsIHNvIG91ciByZXN1bHQgaXMgdGhlIGVudGlyZSBwYXRoXG4gICAgICAgICAgICAvLyBjb21wb25lbnRcbiAgICAgICAgICAgIGV4dElkeCA9IC0xO1xuICAgICAgICAgICAgZW5kID0gZmlyc3ROb25TbGFzaEVuZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPT09IGVuZCkgZW5kID0gZmlyc3ROb25TbGFzaEVuZDtcbiAgICBlbHNlIGlmIChlbmQgPT09IC0xKSBlbmQgPSBwYXRoLmxlbmd0aDtcbiAgICByZXR1cm4gcGF0aC5zbGljZShzdGFydCwgZW5kKTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gc3RhcnQ7IC0taSkge1xuICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaSkpKSB7XG4gICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBwYXRoIHNlcGFyYXRvciB0aGF0IHdhcyBub3QgcGFydCBvZiBhIHNldCBvZiBwYXRoXG4gICAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZW5kID09PSAtMSkge1xuICAgICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgbWFyayB0aGlzIGFzIHRoZSBlbmQgb2Ygb3VyXG4gICAgICAgIC8vIHBhdGggY29tcG9uZW50XG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5kID09PSAtMSkgcmV0dXJuIFwiXCI7XG4gICAgcmV0dXJuIHBhdGguc2xpY2Uoc3RhcnQsIGVuZCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIGV4dGVuc2lvbiBvZiB0aGUgYHBhdGhgLlxuICogQHBhcmFtIHBhdGggd2l0aCBleHRlbnNpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dG5hbWUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgbGV0IHN0YXJ0ID0gMDtcbiAgbGV0IHN0YXJ0RG90ID0gLTE7XG4gIGxldCBzdGFydFBhcnQgPSAwO1xuICBsZXQgZW5kID0gLTE7XG4gIGxldCBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAvLyBUcmFjayB0aGUgc3RhdGUgb2YgY2hhcmFjdGVycyAoaWYgYW55KSB3ZSBzZWUgYmVmb3JlIG91ciBmaXJzdCBkb3QgYW5kXG4gIC8vIGFmdGVyIGFueSBwYXRoIHNlcGFyYXRvciB3ZSBmaW5kXG4gIGxldCBwcmVEb3RTdGF0ZSA9IDA7XG5cbiAgLy8gQ2hlY2sgZm9yIGEgZHJpdmUgbGV0dGVyIHByZWZpeCBzbyBhcyBub3QgdG8gbWlzdGFrZSB0aGUgZm9sbG93aW5nXG4gIC8vIHBhdGggc2VwYXJhdG9yIGFzIGFuIGV4dHJhIHNlcGFyYXRvciBhdCB0aGUgZW5kIG9mIHRoZSBwYXRoIHRoYXQgY2FuIGJlXG4gIC8vIGRpc3JlZ2FyZGVkXG5cbiAgaWYgKFxuICAgIHBhdGgubGVuZ3RoID49IDIgJiZcbiAgICBwYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04gJiZcbiAgICBpc1dpbmRvd3NEZXZpY2VSb290KHBhdGguY2hhckNvZGVBdCgwKSlcbiAgKSB7XG4gICAgc3RhcnQgPSBzdGFydFBhcnQgPSAyO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSBzdGFydDsgLS1pKSB7XG4gICAgY29uc3QgY29kZSA9IHBhdGguY2hhckNvZGVBdChpKTtcbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgcGF0aCBzZXBhcmF0b3IgdGhhdCB3YXMgbm90IHBhcnQgb2YgYSBzZXQgb2YgcGF0aFxuICAgICAgLy8gc2VwYXJhdG9ycyBhdCB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHN0b3Agbm93XG4gICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICBzdGFydFBhcnQgPSBpICsgMTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgIC8vIGV4dGVuc2lvblxuICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgICBlbmQgPSBpICsgMTtcbiAgICB9XG4gICAgaWYgKGNvZGUgPT09IENIQVJfRE9UKSB7XG4gICAgICAvLyBJZiB0aGlzIGlzIG91ciBmaXJzdCBkb3QsIG1hcmsgaXQgYXMgdGhlIHN0YXJ0IG9mIG91ciBleHRlbnNpb25cbiAgICAgIGlmIChzdGFydERvdCA9PT0gLTEpIHN0YXJ0RG90ID0gaTtcbiAgICAgIGVsc2UgaWYgKHByZURvdFN0YXRlICE9PSAxKSBwcmVEb3RTdGF0ZSA9IDE7XG4gICAgfSBlbHNlIGlmIChzdGFydERvdCAhPT0gLTEpIHtcbiAgICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgYW5kIG5vbi1wYXRoIHNlcGFyYXRvciBiZWZvcmUgb3VyIGRvdCwgc28gd2Ugc2hvdWxkXG4gICAgICAvLyBoYXZlIGEgZ29vZCBjaGFuY2UgYXQgaGF2aW5nIGEgbm9uLWVtcHR5IGV4dGVuc2lvblxuICAgICAgcHJlRG90U3RhdGUgPSAtMTtcbiAgICB9XG4gIH1cblxuICBpZiAoXG4gICAgc3RhcnREb3QgPT09IC0xIHx8XG4gICAgZW5kID09PSAtMSB8fFxuICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgY2hhcmFjdGVyIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZG90XG4gICAgcHJlRG90U3RhdGUgPT09IDAgfHxcbiAgICAvLyBUaGUgKHJpZ2h0LW1vc3QpIHRyaW1tZWQgcGF0aCBjb21wb25lbnQgaXMgZXhhY3RseSAnLi4nXG4gICAgKHByZURvdFN0YXRlID09PSAxICYmIHN0YXJ0RG90ID09PSBlbmQgLSAxICYmIHN0YXJ0RG90ID09PSBzdGFydFBhcnQgKyAxKVxuICApIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuICByZXR1cm4gcGF0aC5zbGljZShzdGFydERvdCwgZW5kKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBhIHBhdGggZnJvbSBgRm9ybWF0SW5wdXRQYXRoT2JqZWN0YCBvYmplY3QuXG4gKiBAcGFyYW0gcGF0aE9iamVjdCB3aXRoIHBhdGhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdChwYXRoT2JqZWN0OiBGb3JtYXRJbnB1dFBhdGhPYmplY3QpOiBzdHJpbmcge1xuICBpZiAocGF0aE9iamVjdCA9PT0gbnVsbCB8fCB0eXBlb2YgcGF0aE9iamVjdCAhPT0gXCJvYmplY3RcIikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICBgVGhlIFwicGF0aE9iamVjdFwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJHt0eXBlb2YgcGF0aE9iamVjdH1gLFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIF9mb3JtYXQoXCJcXFxcXCIsIHBhdGhPYmplY3QpO1xufVxuXG4vKipcbiAqIFJldHVybiBhIGBQYXJzZWRQYXRoYCBvYmplY3Qgb2YgdGhlIGBwYXRoYC5cbiAqIEBwYXJhbSBwYXRoIHRvIHByb2Nlc3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHBhdGg6IHN0cmluZyk6IFBhcnNlZFBhdGgge1xuICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gIGNvbnN0IHJldDogUGFyc2VkUGF0aCA9IHsgcm9vdDogXCJcIiwgZGlyOiBcIlwiLCBiYXNlOiBcIlwiLCBleHQ6IFwiXCIsIG5hbWU6IFwiXCIgfTtcblxuICBjb25zdCBsZW4gPSBwYXRoLmxlbmd0aDtcbiAgaWYgKGxlbiA9PT0gMCkgcmV0dXJuIHJldDtcblxuICBsZXQgcm9vdEVuZCA9IDA7XG4gIGxldCBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuXG4gIC8vIFRyeSB0byBtYXRjaCBhIHJvb3RcbiAgaWYgKGxlbiA+IDEpIHtcbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAvLyBQb3NzaWJsZSBVTkMgcm9vdFxuXG4gICAgICByb290RW5kID0gMTtcbiAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KDEpKSkge1xuICAgICAgICAvLyBNYXRjaGVkIGRvdWJsZSBwYXRoIHNlcGFyYXRvciBhdCBiZWdpbm5pbmdcbiAgICAgICAgbGV0IGogPSAyO1xuICAgICAgICBsZXQgbGFzdCA9IGo7XG4gICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBub24tcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgIGZvciAoOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChqKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChqIDwgbGVuICYmIGogIT09IGxhc3QpIHtcbiAgICAgICAgICAvLyBNYXRjaGVkIVxuICAgICAgICAgIGxhc3QgPSBqO1xuICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBwYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICBpZiAoIWlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGogPCBsZW4gJiYgaiAhPT0gbGFzdCkge1xuICAgICAgICAgICAgLy8gTWF0Y2hlZCFcbiAgICAgICAgICAgIGxhc3QgPSBqO1xuICAgICAgICAgICAgLy8gTWF0Y2ggMSBvciBtb3JlIG5vbi1wYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICAgIGZvciAoOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChqID09PSBsZW4pIHtcbiAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IG9ubHlcblxuICAgICAgICAgICAgICByb290RW5kID0gajtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaiAhPT0gbGFzdCkge1xuICAgICAgICAgICAgICAvLyBXZSBtYXRjaGVkIGEgVU5DIHJvb3Qgd2l0aCBsZWZ0b3ZlcnNcblxuICAgICAgICAgICAgICByb290RW5kID0gaiArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1dpbmRvd3NEZXZpY2VSb290KGNvZGUpKSB7XG4gICAgICAvLyBQb3NzaWJsZSBkZXZpY2Ugcm9vdFxuXG4gICAgICBpZiAocGF0aC5jaGFyQ29kZUF0KDEpID09PSBDSEFSX0NPTE9OKSB7XG4gICAgICAgIHJvb3RFbmQgPSAyO1xuICAgICAgICBpZiAobGVuID4gMikge1xuICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KDIpKSkge1xuICAgICAgICAgICAgaWYgKGxlbiA9PT0gMykge1xuICAgICAgICAgICAgICAvLyBgcGF0aGAgY29udGFpbnMganVzdCBhIGRyaXZlIHJvb3QsIGV4aXQgZWFybHkgdG8gYXZvaWRcbiAgICAgICAgICAgICAgLy8gdW5uZWNlc3Nhcnkgd29ya1xuICAgICAgICAgICAgICByZXQucm9vdCA9IHJldC5kaXIgPSBwYXRoO1xuICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcm9vdEVuZCA9IDM7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGBwYXRoYCBjb250YWlucyBqdXN0IGEgZHJpdmUgcm9vdCwgZXhpdCBlYXJseSB0byBhdm9pZFxuICAgICAgICAgIC8vIHVubmVjZXNzYXJ5IHdvcmtcbiAgICAgICAgICByZXQucm9vdCA9IHJldC5kaXIgPSBwYXRoO1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgLy8gYHBhdGhgIGNvbnRhaW5zIGp1c3QgYSBwYXRoIHNlcGFyYXRvciwgZXhpdCBlYXJseSB0byBhdm9pZFxuICAgIC8vIHVubmVjZXNzYXJ5IHdvcmtcbiAgICByZXQucm9vdCA9IHJldC5kaXIgPSBwYXRoO1xuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBpZiAocm9vdEVuZCA+IDApIHJldC5yb290ID0gcGF0aC5zbGljZSgwLCByb290RW5kKTtcblxuICBsZXQgc3RhcnREb3QgPSAtMTtcbiAgbGV0IHN0YXJ0UGFydCA9IHJvb3RFbmQ7XG4gIGxldCBlbmQgPSAtMTtcbiAgbGV0IG1hdGNoZWRTbGFzaCA9IHRydWU7XG4gIGxldCBpID0gcGF0aC5sZW5ndGggLSAxO1xuXG4gIC8vIFRyYWNrIHRoZSBzdGF0ZSBvZiBjaGFyYWN0ZXJzIChpZiBhbnkpIHdlIHNlZSBiZWZvcmUgb3VyIGZpcnN0IGRvdCBhbmRcbiAgLy8gYWZ0ZXIgYW55IHBhdGggc2VwYXJhdG9yIHdlIGZpbmRcbiAgbGV0IHByZURvdFN0YXRlID0gMDtcblxuICAvLyBHZXQgbm9uLWRpciBpbmZvXG4gIGZvciAoOyBpID49IHJvb3RFbmQ7IC0taSkge1xuICAgIGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgaWYgKGlzUGF0aFNlcGFyYXRvcihjb2RlKSkge1xuICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIHBhdGggc2VwYXJhdG9yIHRoYXQgd2FzIG5vdCBwYXJ0IG9mIGEgc2V0IG9mIHBhdGhcbiAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgaWYgKCFtYXRjaGVkU2xhc2gpIHtcbiAgICAgICAgc3RhcnRQYXJ0ID0gaSArIDE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChlbmQgPT09IC0xKSB7XG4gICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgbWFyayB0aGlzIGFzIHRoZSBlbmQgb2Ygb3VyXG4gICAgICAvLyBleHRlbnNpb25cbiAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgZW5kID0gaSArIDE7XG4gICAgfVxuICAgIGlmIChjb2RlID09PSBDSEFSX0RPVCkge1xuICAgICAgLy8gSWYgdGhpcyBpcyBvdXIgZmlyc3QgZG90LCBtYXJrIGl0IGFzIHRoZSBzdGFydCBvZiBvdXIgZXh0ZW5zaW9uXG4gICAgICBpZiAoc3RhcnREb3QgPT09IC0xKSBzdGFydERvdCA9IGk7XG4gICAgICBlbHNlIGlmIChwcmVEb3RTdGF0ZSAhPT0gMSkgcHJlRG90U3RhdGUgPSAxO1xuICAgIH0gZWxzZSBpZiAoc3RhcnREb3QgIT09IC0xKSB7XG4gICAgICAvLyBXZSBzYXcgYSBub24tZG90IGFuZCBub24tcGF0aCBzZXBhcmF0b3IgYmVmb3JlIG91ciBkb3QsIHNvIHdlIHNob3VsZFxuICAgICAgLy8gaGF2ZSBhIGdvb2QgY2hhbmNlIGF0IGhhdmluZyBhIG5vbi1lbXB0eSBleHRlbnNpb25cbiAgICAgIHByZURvdFN0YXRlID0gLTE7XG4gICAgfVxuICB9XG5cbiAgaWYgKFxuICAgIHN0YXJ0RG90ID09PSAtMSB8fFxuICAgIGVuZCA9PT0gLTEgfHxcbiAgICAvLyBXZSBzYXcgYSBub24tZG90IGNoYXJhY3RlciBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGRvdFxuICAgIHByZURvdFN0YXRlID09PSAwIHx8XG4gICAgLy8gVGhlIChyaWdodC1tb3N0KSB0cmltbWVkIHBhdGggY29tcG9uZW50IGlzIGV4YWN0bHkgJy4uJ1xuICAgIChwcmVEb3RTdGF0ZSA9PT0gMSAmJiBzdGFydERvdCA9PT0gZW5kIC0gMSAmJiBzdGFydERvdCA9PT0gc3RhcnRQYXJ0ICsgMSlcbiAgKSB7XG4gICAgaWYgKGVuZCAhPT0gLTEpIHtcbiAgICAgIHJldC5iYXNlID0gcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKHN0YXJ0UGFydCwgZW5kKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKHN0YXJ0UGFydCwgc3RhcnREb3QpO1xuICAgIHJldC5iYXNlID0gcGF0aC5zbGljZShzdGFydFBhcnQsIGVuZCk7XG4gICAgcmV0LmV4dCA9IHBhdGguc2xpY2Uoc3RhcnREb3QsIGVuZCk7XG4gIH1cblxuICAvLyBJZiB0aGUgZGlyZWN0b3J5IGlzIHRoZSByb290LCB1c2UgdGhlIGVudGlyZSByb290IGFzIHRoZSBgZGlyYCBpbmNsdWRpbmdcbiAgLy8gdGhlIHRyYWlsaW5nIHNsYXNoIGlmIGFueSAoYEM6XFxhYmNgIC0+IGBDOlxcYCkuIE90aGVyd2lzZSwgc3RyaXAgb3V0IHRoZVxuICAvLyB0cmFpbGluZyBzbGFzaCAoYEM6XFxhYmNcXGRlZmAgLT4gYEM6XFxhYmNgKS5cbiAgaWYgKHN0YXJ0UGFydCA+IDAgJiYgc3RhcnRQYXJ0ICE9PSByb290RW5kKSB7XG4gICAgcmV0LmRpciA9IHBhdGguc2xpY2UoMCwgc3RhcnRQYXJ0IC0gMSk7XG4gIH0gZWxzZSByZXQuZGlyID0gcmV0LnJvb3Q7XG5cbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIGZpbGUgVVJMIHRvIGEgcGF0aCBzdHJpbmcuXG4gKlxuICogYGBgdHNcbiAqICAgICAgaW1wb3J0IHsgZnJvbUZpbGVVcmwgfSBmcm9tIFwiLi93aW4zMi50c1wiO1xuICogICAgICBmcm9tRmlsZVVybChcImZpbGU6Ly8vaG9tZS9mb29cIik7IC8vIFwiXFxcXGhvbWVcXFxcZm9vXCJcbiAqICAgICAgZnJvbUZpbGVVcmwoXCJmaWxlOi8vL0M6L1VzZXJzL2Zvb1wiKTsgLy8gXCJDOlxcXFxVc2Vyc1xcXFxmb29cIlxuICogICAgICBmcm9tRmlsZVVybChcImZpbGU6Ly9sb2NhbGhvc3QvaG9tZS9mb29cIik7IC8vIFwiXFxcXFxcXFxsb2NhbGhvc3RcXFxcaG9tZVxcXFxmb29cIlxuICogYGBgXG4gKiBAcGFyYW0gdXJsIG9mIGEgZmlsZSBVUkxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21GaWxlVXJsKHVybDogc3RyaW5nIHwgVVJMKTogc3RyaW5nIHtcbiAgdXJsID0gdXJsIGluc3RhbmNlb2YgVVJMID8gdXJsIDogbmV3IFVSTCh1cmwpO1xuICBpZiAodXJsLnByb3RvY29sICE9IFwiZmlsZTpcIikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJNdXN0IGJlIGEgZmlsZSBVUkwuXCIpO1xuICB9XG4gIGxldCBwYXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KFxuICAgIHVybC5wYXRobmFtZS5yZXBsYWNlKC9cXC8vZywgXCJcXFxcXCIpLnJlcGxhY2UoLyUoPyFbMC05QS1GYS1mXXsyfSkvZywgXCIlMjVcIiksXG4gICkucmVwbGFjZSgvXlxcXFwqKFtBLVphLXpdOikoXFxcXHwkKS8sIFwiJDFcXFxcXCIpO1xuICBpZiAodXJsLmhvc3RuYW1lICE9IFwiXCIpIHtcbiAgICAvLyBOb3RlOiBUaGUgYFVSTGAgaW1wbGVtZW50YXRpb24gZ3VhcmFudGVlcyB0aGF0IHRoZSBkcml2ZSBsZXR0ZXIgYW5kXG4gICAgLy8gaG9zdG5hbWUgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZS4gT3RoZXJ3aXNlIGl0IHdvdWxkIG5vdCBoYXZlIGJlZW4gdmFsaWRcbiAgICAvLyB0byBhcHBlbmQgdGhlIGhvc3RuYW1lIGFuZCBwYXRoIGxpa2UgdGhpcy5cbiAgICBwYXRoID0gYFxcXFxcXFxcJHt1cmwuaG9zdG5hbWV9JHtwYXRofWA7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG5cbi8qKlxuICogQ29udmVydHMgYSBwYXRoIHN0cmluZyB0byBhIGZpbGUgVVJMLlxuICpcbiAqIGBgYHRzXG4gKiAgICAgIGltcG9ydCB7IHRvRmlsZVVybCB9IGZyb20gXCIuL3dpbjMyLnRzXCI7XG4gKiAgICAgIHRvRmlsZVVybChcIlxcXFxob21lXFxcXGZvb1wiKTsgLy8gbmV3IFVSTChcImZpbGU6Ly8vaG9tZS9mb29cIilcbiAqICAgICAgdG9GaWxlVXJsKFwiQzpcXFxcVXNlcnNcXFxcZm9vXCIpOyAvLyBuZXcgVVJMKFwiZmlsZTovLy9DOi9Vc2Vycy9mb29cIilcbiAqICAgICAgdG9GaWxlVXJsKFwiXFxcXFxcXFwxMjcuMC4wLjFcXFxcaG9tZVxcXFxmb29cIik7IC8vIG5ldyBVUkwoXCJmaWxlOi8vMTI3LjAuMC4xL2hvbWUvZm9vXCIpXG4gKiBgYGBcbiAqIEBwYXJhbSBwYXRoIHRvIGNvbnZlcnQgdG8gZmlsZSBVUkxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvRmlsZVVybChwYXRoOiBzdHJpbmcpOiBVUkwge1xuICBpZiAoIWlzQWJzb2x1dGUocGF0aCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTXVzdCBiZSBhbiBhYnNvbHV0ZSBwYXRoLlwiKTtcbiAgfVxuICBjb25zdCBbLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gcGF0aC5tYXRjaChcbiAgICAvXig/OlsvXFxcXF17Mn0oW14vXFxcXF0rKSg/PVsvXFxcXF0oPzpbXi9cXFxcXXwkKSkpPyguKikvLFxuICApITtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChcImZpbGU6Ly8vXCIpO1xuICB1cmwucGF0aG5hbWUgPSBlbmNvZGVXaGl0ZXNwYWNlKHBhdGhuYW1lLnJlcGxhY2UoLyUvZywgXCIlMjVcIikpO1xuICBpZiAoaG9zdG5hbWUgIT0gbnVsbCAmJiBob3N0bmFtZSAhPSBcImxvY2FsaG9zdFwiKSB7XG4gICAgdXJsLmhvc3RuYW1lID0gaG9zdG5hbWU7XG4gICAgaWYgKCF1cmwuaG9zdG5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIGhvc3RuYW1lLlwiKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVybDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxpREFBaUQ7QUFDakQsNkRBQTZEO0FBQzdELHFDQUFxQztBQUdyQyxTQUNFLG1CQUFtQixFQUNuQixVQUFVLEVBQ1YsUUFBUSxFQUNSLGtCQUFrQixRQUNiLGtCQUFrQjtBQUV6QixTQUNFLE9BQU8sRUFDUCxVQUFVLEVBQ1YsZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZixtQkFBbUIsRUFDbkIsZUFBZSxRQUNWLGFBQWE7QUFDcEIsU0FBUyxNQUFNLFFBQVEscUJBQXFCO0FBRTVDLE9BQU8sTUFBTSxNQUFNLEtBQUs7QUFDeEIsT0FBTyxNQUFNLFlBQVksSUFBSTtBQUU3Qjs7O0NBR0MsR0FDRCxPQUFPLFNBQVMsUUFBUSxHQUFHLFlBQXNCLEVBQVU7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