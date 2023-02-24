// Copyright the Browserify authors. MIT License.
// Ported from https://github.com/browserify/path-browserify/
/** This module is browser compatible. */ import { CHAR_DOT, CHAR_BACKWARD_SLASH, CHAR_COLON, CHAR_QUESTION_MARK } from "./_constants.ts";
import { assertPath, isPathSeparator, isWindowsDeviceRoot, normalizeString, _format } from "./_util.ts";
import { assert } from "../_util/assert.ts";
export const sep = "\\";
export const delimiter = ";";
export function resolve(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1; i--){
        let path;
        if (i >= 0) {
            path = pathSegments[i];
        } else if (!resolvedDevice) {
            if (globalThis.Deno == null) {
                throw new TypeError("Resolved a drive-letter-less path without a CWD.");
            }
            path = Deno.cwd();
        } else {
            if (globalThis.Deno == null) {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            // Windows has the concept of drive-specific current working
            // directories. If we've resolved a drive letter but not yet an
            // absolute path, get cwd for that drive, or the process cwd if
            // the drive cwd is not available. We're sure the device is not
            // a UNC path at this points, because UNC paths are always absolute.
            path = Deno.env.get(`=${resolvedDevice}`) || Deno.cwd();
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
export function normalize(path) {
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
export function isAbsolute(path) {
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
export function join(...paths) {
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
// It will solve the relative path from `from` to `to`, for instance:
//  from = 'C:\\orandea\\test\\aaa'
//  to = 'C:\\orandea\\impl\\bbb'
// The output of the function should be: '..\\..\\impl\\bbb'
export function relative(from, to) {
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
export function toNamespacedPath(path) {
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
export function dirname(path) {
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
export function basename(path, ext = "") {
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
export function extname(path) {
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
export function format(pathObject) {
    /* eslint-disable max-len */ if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("\\", pathObject);
}
export function parse(path) {
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
/** Converts a file URL to a path string.
 *
 *      fromFileUrl("file:///home/foo"); // "\\home\\foo"
 *      fromFileUrl("file:///C:/Users/foo"); // "C:\\Users\\foo"
 *      fromFileUrl("file://localhost/home/foo"); // "\\\\localhost\\home\\foo"
 */ export function fromFileUrl(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    let path = decodeURIComponent(url.pathname.replace(/^\/*([A-Za-z]:)(\/|$)/, "$1/").replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
    if (url.hostname != "") {
        // Note: The `URL` implementation guarantees that the drive letter and
        // hostname are mutually exclusive. Otherwise it would not have been valid
        // to append the hostname and path like this.
        path = `\\\\${url.hostname}${path}`;
    }
    return path;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjcxLjAvcGF0aC93aW4zMi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgdGhlIEJyb3dzZXJpZnkgYXV0aG9ycy4gTUlUIExpY2Vuc2UuXG4vLyBQb3J0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vYnJvd3NlcmlmeS9wYXRoLWJyb3dzZXJpZnkvXG4vKiogVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLiAqL1xuXG5pbXBvcnQgdHlwZSB7IEZvcm1hdElucHV0UGF0aE9iamVjdCwgUGFyc2VkUGF0aCB9IGZyb20gXCIuL19pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7XG4gIENIQVJfRE9ULFxuICBDSEFSX0JBQ0tXQVJEX1NMQVNILFxuICBDSEFSX0NPTE9OLFxuICBDSEFSX1FVRVNUSU9OX01BUkssXG59IGZyb20gXCIuL19jb25zdGFudHMudHNcIjtcblxuaW1wb3J0IHtcbiAgYXNzZXJ0UGF0aCxcbiAgaXNQYXRoU2VwYXJhdG9yLFxuICBpc1dpbmRvd3NEZXZpY2VSb290LFxuICBub3JtYWxpemVTdHJpbmcsXG4gIF9mb3JtYXQsXG59IGZyb20gXCIuL191dGlsLnRzXCI7XG5pbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiLi4vX3V0aWwvYXNzZXJ0LnRzXCI7XG5cbmV4cG9ydCBjb25zdCBzZXAgPSBcIlxcXFxcIjtcbmV4cG9ydCBjb25zdCBkZWxpbWl0ZXIgPSBcIjtcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmUoLi4ucGF0aFNlZ21lbnRzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIGxldCByZXNvbHZlZERldmljZSA9IFwiXCI7XG4gIGxldCByZXNvbHZlZFRhaWwgPSBcIlwiO1xuICBsZXQgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAobGV0IGkgPSBwYXRoU2VnbWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMTsgaS0tKSB7XG4gICAgbGV0IHBhdGg6IHN0cmluZztcbiAgICBpZiAoaSA+PSAwKSB7XG4gICAgICBwYXRoID0gcGF0aFNlZ21lbnRzW2ldO1xuICAgIH0gZWxzZSBpZiAoIXJlc29sdmVkRGV2aWNlKSB7XG4gICAgICBpZiAoZ2xvYmFsVGhpcy5EZW5vID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlJlc29sdmVkIGEgZHJpdmUtbGV0dGVyLWxlc3MgcGF0aCB3aXRob3V0IGEgQ1dELlwiKTtcbiAgICAgIH1cbiAgICAgIHBhdGggPSBEZW5vLmN3ZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZ2xvYmFsVGhpcy5EZW5vID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlJlc29sdmVkIGEgcmVsYXRpdmUgcGF0aCB3aXRob3V0IGEgQ1dELlwiKTtcbiAgICAgIH1cbiAgICAgIC8vIFdpbmRvd3MgaGFzIHRoZSBjb25jZXB0IG9mIGRyaXZlLXNwZWNpZmljIGN1cnJlbnQgd29ya2luZ1xuICAgICAgLy8gZGlyZWN0b3JpZXMuIElmIHdlJ3ZlIHJlc29sdmVkIGEgZHJpdmUgbGV0dGVyIGJ1dCBub3QgeWV0IGFuXG4gICAgICAvLyBhYnNvbHV0ZSBwYXRoLCBnZXQgY3dkIGZvciB0aGF0IGRyaXZlLCBvciB0aGUgcHJvY2VzcyBjd2QgaWZcbiAgICAgIC8vIHRoZSBkcml2ZSBjd2QgaXMgbm90IGF2YWlsYWJsZS4gV2UncmUgc3VyZSB0aGUgZGV2aWNlIGlzIG5vdFxuICAgICAgLy8gYSBVTkMgcGF0aCBhdCB0aGlzIHBvaW50cywgYmVjYXVzZSBVTkMgcGF0aHMgYXJlIGFsd2F5cyBhYnNvbHV0ZS5cbiAgICAgIHBhdGggPSBEZW5vLmVudi5nZXQoYD0ke3Jlc29sdmVkRGV2aWNlfWApIHx8IERlbm8uY3dkKCk7XG5cbiAgICAgIC8vIFZlcmlmeSB0aGF0IGEgY3dkIHdhcyBmb3VuZCBhbmQgdGhhdCBpdCBhY3R1YWxseSBwb2ludHNcbiAgICAgIC8vIHRvIG91ciBkcml2ZS4gSWYgbm90LCBkZWZhdWx0IHRvIHRoZSBkcml2ZSdzIHJvb3QuXG4gICAgICBpZiAoXG4gICAgICAgIHBhdGggPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBwYXRoLnNsaWNlKDAsIDMpLnRvTG93ZXJDYXNlKCkgIT09IGAke3Jlc29sdmVkRGV2aWNlLnRvTG93ZXJDYXNlKCl9XFxcXGBcbiAgICAgICkge1xuICAgICAgICBwYXRoID0gYCR7cmVzb2x2ZWREZXZpY2V9XFxcXGA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICAgIGNvbnN0IGxlbiA9IHBhdGgubGVuZ3RoO1xuXG4gICAgLy8gU2tpcCBlbXB0eSBlbnRyaWVzXG4gICAgaWYgKGxlbiA9PT0gMCkgY29udGludWU7XG5cbiAgICBsZXQgcm9vdEVuZCA9IDA7XG4gICAgbGV0IGRldmljZSA9IFwiXCI7XG4gICAgbGV0IGlzQWJzb2x1dGUgPSBmYWxzZTtcbiAgICBjb25zdCBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuXG4gICAgLy8gVHJ5IHRvIG1hdGNoIGEgcm9vdFxuICAgIGlmIChsZW4gPiAxKSB7XG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAgIC8vIFBvc3NpYmxlIFVOQyByb290XG5cbiAgICAgICAgLy8gSWYgd2Ugc3RhcnRlZCB3aXRoIGEgc2VwYXJhdG9yLCB3ZSBrbm93IHdlIGF0IGxlYXN0IGhhdmUgYW5cbiAgICAgICAgLy8gYWJzb2x1dGUgcGF0aCBvZiBzb21lIGtpbmQgKFVOQyBvciBvdGhlcndpc2UpXG4gICAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuXG4gICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KDEpKSkge1xuICAgICAgICAgIC8vIE1hdGNoZWQgZG91YmxlIHBhdGggc2VwYXJhdG9yIGF0IGJlZ2lubmluZ1xuICAgICAgICAgIGxldCBqID0gMjtcbiAgICAgICAgICBsZXQgbGFzdCA9IGo7XG4gICAgICAgICAgLy8gTWF0Y2ggMSBvciBtb3JlIG5vbi1wYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChqKSkpIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaiA8IGxlbiAmJiBqICE9PSBsYXN0KSB7XG4gICAgICAgICAgICBjb25zdCBmaXJzdFBhcnQgPSBwYXRoLnNsaWNlKGxhc3QsIGopO1xuICAgICAgICAgICAgLy8gTWF0Y2hlZCFcbiAgICAgICAgICAgIGxhc3QgPSBqO1xuICAgICAgICAgICAgLy8gTWF0Y2ggMSBvciBtb3JlIHBhdGggc2VwYXJhdG9yc1xuICAgICAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgICAgICBpZiAoIWlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChqIDwgbGVuICYmIGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgICAgLy8gTWF0Y2hlZCFcbiAgICAgICAgICAgICAgbGFzdCA9IGo7XG4gICAgICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBub24tcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgICAgIGZvciAoOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChqKSkpIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChqID09PSBsZW4pIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBtYXRjaGVkIGEgVU5DIHJvb3Qgb25seVxuICAgICAgICAgICAgICAgIGRldmljZSA9IGBcXFxcXFxcXCR7Zmlyc3RQYXJ0fVxcXFwke3BhdGguc2xpY2UobGFzdCl9YDtcbiAgICAgICAgICAgICAgICByb290RW5kID0gajtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChqICE9PSBsYXN0KSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IHdpdGggbGVmdG92ZXJzXG5cbiAgICAgICAgICAgICAgICBkZXZpY2UgPSBgXFxcXFxcXFwke2ZpcnN0UGFydH1cXFxcJHtwYXRoLnNsaWNlKGxhc3QsIGopfWA7XG4gICAgICAgICAgICAgICAgcm9vdEVuZCA9IGo7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcm9vdEVuZCA9IDE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dzRGV2aWNlUm9vdChjb2RlKSkge1xuICAgICAgICAvLyBQb3NzaWJsZSBkZXZpY2Ugcm9vdFxuXG4gICAgICAgIGlmIChwYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04pIHtcbiAgICAgICAgICBkZXZpY2UgPSBwYXRoLnNsaWNlKDAsIDIpO1xuICAgICAgICAgIHJvb3RFbmQgPSAyO1xuICAgICAgICAgIGlmIChsZW4gPiAyKSB7XG4gICAgICAgICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgyKSkpIHtcbiAgICAgICAgICAgICAgLy8gVHJlYXQgc2VwYXJhdG9yIGZvbGxvd2luZyBkcml2ZSBuYW1lIGFzIGFuIGFic29sdXRlIHBhdGhcbiAgICAgICAgICAgICAgLy8gaW5kaWNhdG9yXG4gICAgICAgICAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuICAgICAgICAgICAgICByb290RW5kID0gMztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzUGF0aFNlcGFyYXRvcihjb2RlKSkge1xuICAgICAgLy8gYHBhdGhgIGNvbnRhaW5zIGp1c3QgYSBwYXRoIHNlcGFyYXRvclxuICAgICAgcm9vdEVuZCA9IDE7XG4gICAgICBpc0Fic29sdXRlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICBkZXZpY2UubGVuZ3RoID4gMCAmJlxuICAgICAgcmVzb2x2ZWREZXZpY2UubGVuZ3RoID4gMCAmJlxuICAgICAgZGV2aWNlLnRvTG93ZXJDYXNlKCkgIT09IHJlc29sdmVkRGV2aWNlLnRvTG93ZXJDYXNlKClcbiAgICApIHtcbiAgICAgIC8vIFRoaXMgcGF0aCBwb2ludHMgdG8gYW5vdGhlciBkZXZpY2Ugc28gaXQgaXMgbm90IGFwcGxpY2FibGVcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChyZXNvbHZlZERldmljZS5sZW5ndGggPT09IDAgJiYgZGV2aWNlLmxlbmd0aCA+IDApIHtcbiAgICAgIHJlc29sdmVkRGV2aWNlID0gZGV2aWNlO1xuICAgIH1cbiAgICBpZiAoIXJlc29sdmVkQWJzb2x1dGUpIHtcbiAgICAgIHJlc29sdmVkVGFpbCA9IGAke3BhdGguc2xpY2Uocm9vdEVuZCl9XFxcXCR7cmVzb2x2ZWRUYWlsfWA7XG4gICAgICByZXNvbHZlZEFic29sdXRlID0gaXNBYnNvbHV0ZTtcbiAgICB9XG5cbiAgICBpZiAocmVzb2x2ZWRBYnNvbHV0ZSAmJiByZXNvbHZlZERldmljZS5sZW5ndGggPiAwKSBicmVhaztcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLFxuICAvLyBidXQgaGFuZGxlIHJlbGF0aXZlIHBhdGhzIHRvIGJlIHNhZmUgKG1pZ2h0IGhhcHBlbiB3aGVuIHByb2Nlc3MuY3dkKClcbiAgLy8gZmFpbHMpXG5cbiAgLy8gTm9ybWFsaXplIHRoZSB0YWlsIHBhdGhcbiAgcmVzb2x2ZWRUYWlsID0gbm9ybWFsaXplU3RyaW5nKFxuICAgIHJlc29sdmVkVGFpbCxcbiAgICAhcmVzb2x2ZWRBYnNvbHV0ZSxcbiAgICBcIlxcXFxcIixcbiAgICBpc1BhdGhTZXBhcmF0b3IsXG4gICk7XG5cbiAgcmV0dXJuIHJlc29sdmVkRGV2aWNlICsgKHJlc29sdmVkQWJzb2x1dGUgPyBcIlxcXFxcIiA6IFwiXCIpICsgcmVzb2x2ZWRUYWlsIHx8IFwiLlwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGFzc2VydFBhdGgocGF0aCk7XG4gIGNvbnN0IGxlbiA9IHBhdGgubGVuZ3RoO1xuICBpZiAobGVuID09PSAwKSByZXR1cm4gXCIuXCI7XG4gIGxldCByb290RW5kID0gMDtcbiAgbGV0IGRldmljZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBsZXQgaXNBYnNvbHV0ZSA9IGZhbHNlO1xuICBjb25zdCBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuXG4gIC8vIFRyeSB0byBtYXRjaCBhIHJvb3RcbiAgaWYgKGxlbiA+IDEpIHtcbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAvLyBQb3NzaWJsZSBVTkMgcm9vdFxuXG4gICAgICAvLyBJZiB3ZSBzdGFydGVkIHdpdGggYSBzZXBhcmF0b3IsIHdlIGtub3cgd2UgYXQgbGVhc3QgaGF2ZSBhbiBhYnNvbHV0ZVxuICAgICAgLy8gcGF0aCBvZiBzb21lIGtpbmQgKFVOQyBvciBvdGhlcndpc2UpXG4gICAgICBpc0Fic29sdXRlID0gdHJ1ZTtcblxuICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoMSkpKSB7XG4gICAgICAgIC8vIE1hdGNoZWQgZG91YmxlIHBhdGggc2VwYXJhdG9yIGF0IGJlZ2lubmluZ1xuICAgICAgICBsZXQgaiA9IDI7XG4gICAgICAgIGxldCBsYXN0ID0gajtcbiAgICAgICAgLy8gTWF0Y2ggMSBvciBtb3JlIG5vbi1wYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGogPCBsZW4gJiYgaiAhPT0gbGFzdCkge1xuICAgICAgICAgIGNvbnN0IGZpcnN0UGFydCA9IHBhdGguc2xpY2UobGFzdCwgaik7XG4gICAgICAgICAgLy8gTWF0Y2hlZCFcbiAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgICAgaWYgKCFpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChqIDwgbGVuICYmIGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgIC8vIE1hdGNoZWQhXG4gICAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBub24tcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaiA9PT0gbGVuKSB7XG4gICAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgYSBVTkMgcm9vdCBvbmx5XG4gICAgICAgICAgICAgIC8vIFJldHVybiB0aGUgbm9ybWFsaXplZCB2ZXJzaW9uIG9mIHRoZSBVTkMgcm9vdCBzaW5jZSB0aGVyZVxuICAgICAgICAgICAgICAvLyBpcyBub3RoaW5nIGxlZnQgdG8gcHJvY2Vzc1xuXG4gICAgICAgICAgICAgIHJldHVybiBgXFxcXFxcXFwke2ZpcnN0UGFydH1cXFxcJHtwYXRoLnNsaWNlKGxhc3QpfVxcXFxgO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChqICE9PSBsYXN0KSB7XG4gICAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgYSBVTkMgcm9vdCB3aXRoIGxlZnRvdmVyc1xuXG4gICAgICAgICAgICAgIGRldmljZSA9IGBcXFxcXFxcXCR7Zmlyc3RQYXJ0fVxcXFwke3BhdGguc2xpY2UobGFzdCwgail9YDtcbiAgICAgICAgICAgICAgcm9vdEVuZCA9IGo7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByb290RW5kID0gMTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzV2luZG93c0RldmljZVJvb3QoY29kZSkpIHtcbiAgICAgIC8vIFBvc3NpYmxlIGRldmljZSByb290XG5cbiAgICAgIGlmIChwYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04pIHtcbiAgICAgICAgZGV2aWNlID0gcGF0aC5zbGljZSgwLCAyKTtcbiAgICAgICAgcm9vdEVuZCA9IDI7XG4gICAgICAgIGlmIChsZW4gPiAyKSB7XG4gICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoMikpKSB7XG4gICAgICAgICAgICAvLyBUcmVhdCBzZXBhcmF0b3IgZm9sbG93aW5nIGRyaXZlIG5hbWUgYXMgYW4gYWJzb2x1dGUgcGF0aFxuICAgICAgICAgICAgLy8gaW5kaWNhdG9yXG4gICAgICAgICAgICBpc0Fic29sdXRlID0gdHJ1ZTtcbiAgICAgICAgICAgIHJvb3RFbmQgPSAzO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAvLyBgcGF0aGAgY29udGFpbnMganVzdCBhIHBhdGggc2VwYXJhdG9yLCBleGl0IGVhcmx5IHRvIGF2b2lkIHVubmVjZXNzYXJ5XG4gICAgLy8gd29ya1xuICAgIHJldHVybiBcIlxcXFxcIjtcbiAgfVxuXG4gIGxldCB0YWlsOiBzdHJpbmc7XG4gIGlmIChyb290RW5kIDwgbGVuKSB7XG4gICAgdGFpbCA9IG5vcm1hbGl6ZVN0cmluZyhcbiAgICAgIHBhdGguc2xpY2Uocm9vdEVuZCksXG4gICAgICAhaXNBYnNvbHV0ZSxcbiAgICAgIFwiXFxcXFwiLFxuICAgICAgaXNQYXRoU2VwYXJhdG9yLFxuICAgICk7XG4gIH0gZWxzZSB7XG4gICAgdGFpbCA9IFwiXCI7XG4gIH1cbiAgaWYgKHRhaWwubGVuZ3RoID09PSAwICYmICFpc0Fic29sdXRlKSB0YWlsID0gXCIuXCI7XG4gIGlmICh0YWlsLmxlbmd0aCA+IDAgJiYgaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChsZW4gLSAxKSkpIHtcbiAgICB0YWlsICs9IFwiXFxcXFwiO1xuICB9XG4gIGlmIChkZXZpY2UgPT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChpc0Fic29sdXRlKSB7XG4gICAgICBpZiAodGFpbC5sZW5ndGggPiAwKSByZXR1cm4gYFxcXFwke3RhaWx9YDtcbiAgICAgIGVsc2UgcmV0dXJuIFwiXFxcXFwiO1xuICAgIH0gZWxzZSBpZiAodGFpbC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gdGFpbDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzQWJzb2x1dGUpIHtcbiAgICBpZiAodGFpbC5sZW5ndGggPiAwKSByZXR1cm4gYCR7ZGV2aWNlfVxcXFwke3RhaWx9YDtcbiAgICBlbHNlIHJldHVybiBgJHtkZXZpY2V9XFxcXGA7XG4gIH0gZWxzZSBpZiAodGFpbC5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIGRldmljZSArIHRhaWw7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGRldmljZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBYnNvbHV0ZShwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgY29uc3QgbGVuID0gcGF0aC5sZW5ndGg7XG4gIGlmIChsZW4gPT09IDApIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoaXNXaW5kb3dzRGV2aWNlUm9vdChjb2RlKSkge1xuICAgIC8vIFBvc3NpYmxlIGRldmljZSByb290XG5cbiAgICBpZiAobGVuID4gMiAmJiBwYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04pIHtcbiAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KDIpKSkgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGpvaW4oLi4ucGF0aHM6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgY29uc3QgcGF0aHNDb3VudCA9IHBhdGhzLmxlbmd0aDtcbiAgaWYgKHBhdGhzQ291bnQgPT09IDApIHJldHVybiBcIi5cIjtcblxuICBsZXQgam9pbmVkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGxldCBmaXJzdFBhcnQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhdGhzQ291bnQ7ICsraSkge1xuICAgIGNvbnN0IHBhdGggPSBwYXRoc1tpXTtcbiAgICBhc3NlcnRQYXRoKHBhdGgpO1xuICAgIGlmIChwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmIChqb2luZWQgPT09IHVuZGVmaW5lZCkgam9pbmVkID0gZmlyc3RQYXJ0ID0gcGF0aDtcbiAgICAgIGVsc2Ugam9pbmVkICs9IGBcXFxcJHtwYXRofWA7XG4gICAgfVxuICB9XG5cbiAgaWYgKGpvaW5lZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gXCIuXCI7XG5cbiAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIGpvaW5lZCBwYXRoIGRvZXNuJ3Qgc3RhcnQgd2l0aCB0d28gc2xhc2hlcywgYmVjYXVzZVxuICAvLyBub3JtYWxpemUoKSB3aWxsIG1pc3Rha2UgaXQgZm9yIGFuIFVOQyBwYXRoIHRoZW4uXG4gIC8vXG4gIC8vIFRoaXMgc3RlcCBpcyBza2lwcGVkIHdoZW4gaXQgaXMgdmVyeSBjbGVhciB0aGF0IHRoZSB1c2VyIGFjdHVhbGx5XG4gIC8vIGludGVuZGVkIHRvIHBvaW50IGF0IGFuIFVOQyBwYXRoLiBUaGlzIGlzIGFzc3VtZWQgd2hlbiB0aGUgZmlyc3RcbiAgLy8gbm9uLWVtcHR5IHN0cmluZyBhcmd1bWVudHMgc3RhcnRzIHdpdGggZXhhY3RseSB0d28gc2xhc2hlcyBmb2xsb3dlZCBieVxuICAvLyBhdCBsZWFzdCBvbmUgbW9yZSBub24tc2xhc2ggY2hhcmFjdGVyLlxuICAvL1xuICAvLyBOb3RlIHRoYXQgZm9yIG5vcm1hbGl6ZSgpIHRvIHRyZWF0IGEgcGF0aCBhcyBhbiBVTkMgcGF0aCBpdCBuZWVkcyB0b1xuICAvLyBoYXZlIGF0IGxlYXN0IDIgY29tcG9uZW50cywgc28gd2UgZG9uJ3QgZmlsdGVyIGZvciB0aGF0IGhlcmUuXG4gIC8vIFRoaXMgbWVhbnMgdGhhdCB0aGUgdXNlciBjYW4gdXNlIGpvaW4gdG8gY29uc3RydWN0IFVOQyBwYXRocyBmcm9tXG4gIC8vIGEgc2VydmVyIG5hbWUgYW5kIGEgc2hhcmUgbmFtZTsgZm9yIGV4YW1wbGU6XG4gIC8vICAgcGF0aC5qb2luKCcvL3NlcnZlcicsICdzaGFyZScpIC0+ICdcXFxcXFxcXHNlcnZlclxcXFxzaGFyZVxcXFwnKVxuICBsZXQgbmVlZHNSZXBsYWNlID0gdHJ1ZTtcbiAgbGV0IHNsYXNoQ291bnQgPSAwO1xuICBhc3NlcnQoZmlyc3RQYXJ0ICE9IG51bGwpO1xuICBpZiAoaXNQYXRoU2VwYXJhdG9yKGZpcnN0UGFydC5jaGFyQ29kZUF0KDApKSkge1xuICAgICsrc2xhc2hDb3VudDtcbiAgICBjb25zdCBmaXJzdExlbiA9IGZpcnN0UGFydC5sZW5ndGg7XG4gICAgaWYgKGZpcnN0TGVuID4gMSkge1xuICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihmaXJzdFBhcnQuY2hhckNvZGVBdCgxKSkpIHtcbiAgICAgICAgKytzbGFzaENvdW50O1xuICAgICAgICBpZiAoZmlyc3RMZW4gPiAyKSB7XG4gICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihmaXJzdFBhcnQuY2hhckNvZGVBdCgyKSkpICsrc2xhc2hDb3VudDtcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgYSBVTkMgcGF0aCBpbiB0aGUgZmlyc3QgcGFydFxuICAgICAgICAgICAgbmVlZHNSZXBsYWNlID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChuZWVkc1JlcGxhY2UpIHtcbiAgICAvLyBGaW5kIGFueSBtb3JlIGNvbnNlY3V0aXZlIHNsYXNoZXMgd2UgbmVlZCB0byByZXBsYWNlXG4gICAgZm9yICg7IHNsYXNoQ291bnQgPCBqb2luZWQubGVuZ3RoOyArK3NsYXNoQ291bnQpIHtcbiAgICAgIGlmICghaXNQYXRoU2VwYXJhdG9yKGpvaW5lZC5jaGFyQ29kZUF0KHNsYXNoQ291bnQpKSkgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gUmVwbGFjZSB0aGUgc2xhc2hlcyBpZiBuZWVkZWRcbiAgICBpZiAoc2xhc2hDb3VudCA+PSAyKSBqb2luZWQgPSBgXFxcXCR7am9pbmVkLnNsaWNlKHNsYXNoQ291bnQpfWA7XG4gIH1cblxuICByZXR1cm4gbm9ybWFsaXplKGpvaW5lZCk7XG59XG5cbi8vIEl0IHdpbGwgc29sdmUgdGhlIHJlbGF0aXZlIHBhdGggZnJvbSBgZnJvbWAgdG8gYHRvYCwgZm9yIGluc3RhbmNlOlxuLy8gIGZyb20gPSAnQzpcXFxcb3JhbmRlYVxcXFx0ZXN0XFxcXGFhYSdcbi8vICB0byA9ICdDOlxcXFxvcmFuZGVhXFxcXGltcGxcXFxcYmJiJ1xuLy8gVGhlIG91dHB1dCBvZiB0aGUgZnVuY3Rpb24gc2hvdWxkIGJlOiAnLi5cXFxcLi5cXFxcaW1wbFxcXFxiYmInXG5leHBvcnQgZnVuY3Rpb24gcmVsYXRpdmUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0UGF0aChmcm9tKTtcbiAgYXNzZXJ0UGF0aCh0byk7XG5cbiAgaWYgKGZyb20gPT09IHRvKSByZXR1cm4gXCJcIjtcblxuICBjb25zdCBmcm9tT3JpZyA9IHJlc29sdmUoZnJvbSk7XG4gIGNvbnN0IHRvT3JpZyA9IHJlc29sdmUodG8pO1xuXG4gIGlmIChmcm9tT3JpZyA9PT0gdG9PcmlnKSByZXR1cm4gXCJcIjtcblxuICBmcm9tID0gZnJvbU9yaWcudG9Mb3dlckNhc2UoKTtcbiAgdG8gPSB0b09yaWcudG9Mb3dlckNhc2UoKTtcblxuICBpZiAoZnJvbSA9PT0gdG8pIHJldHVybiBcIlwiO1xuXG4gIC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcbiAgbGV0IGZyb21TdGFydCA9IDA7XG4gIGxldCBmcm9tRW5kID0gZnJvbS5sZW5ndGg7XG4gIGZvciAoOyBmcm9tU3RhcnQgPCBmcm9tRW5kOyArK2Zyb21TdGFydCkge1xuICAgIGlmIChmcm9tLmNoYXJDb2RlQXQoZnJvbVN0YXJ0KSAhPT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgYnJlYWs7XG4gIH1cbiAgLy8gVHJpbSB0cmFpbGluZyBiYWNrc2xhc2hlcyAoYXBwbGljYWJsZSB0byBVTkMgcGF0aHMgb25seSlcbiAgZm9yICg7IGZyb21FbmQgLSAxID4gZnJvbVN0YXJ0OyAtLWZyb21FbmQpIHtcbiAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21FbmQgLSAxKSAhPT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgYnJlYWs7XG4gIH1cbiAgY29uc3QgZnJvbUxlbiA9IGZyb21FbmQgLSBmcm9tU3RhcnQ7XG5cbiAgLy8gVHJpbSBhbnkgbGVhZGluZyBiYWNrc2xhc2hlc1xuICBsZXQgdG9TdGFydCA9IDA7XG4gIGxldCB0b0VuZCA9IHRvLmxlbmd0aDtcbiAgZm9yICg7IHRvU3RhcnQgPCB0b0VuZDsgKyt0b1N0YXJ0KSB7XG4gICAgaWYgKHRvLmNoYXJDb2RlQXQodG9TdGFydCkgIT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIGJyZWFrO1xuICB9XG4gIC8vIFRyaW0gdHJhaWxpbmcgYmFja3NsYXNoZXMgKGFwcGxpY2FibGUgdG8gVU5DIHBhdGhzIG9ubHkpXG4gIGZvciAoOyB0b0VuZCAtIDEgPiB0b1N0YXJ0OyAtLXRvRW5kKSB7XG4gICAgaWYgKHRvLmNoYXJDb2RlQXQodG9FbmQgLSAxKSAhPT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgYnJlYWs7XG4gIH1cbiAgY29uc3QgdG9MZW4gPSB0b0VuZCAtIHRvU3RhcnQ7XG5cbiAgLy8gQ29tcGFyZSBwYXRocyB0byBmaW5kIHRoZSBsb25nZXN0IGNvbW1vbiBwYXRoIGZyb20gcm9vdFxuICBjb25zdCBsZW5ndGggPSBmcm9tTGVuIDwgdG9MZW4gPyBmcm9tTGVuIDogdG9MZW47XG4gIGxldCBsYXN0Q29tbW9uU2VwID0gLTE7XG4gIGxldCBpID0gMDtcbiAgZm9yICg7IGkgPD0gbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoaSA9PT0gbGVuZ3RoKSB7XG4gICAgICBpZiAodG9MZW4gPiBsZW5ndGgpIHtcbiAgICAgICAgaWYgKHRvLmNoYXJDb2RlQXQodG9TdGFydCArIGkpID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIKSB7XG4gICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYGZyb21gIGlzIHRoZSBleGFjdCBiYXNlIHBhdGggZm9yIGB0b2AuXG4gICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209J0M6XFxcXGZvb1xcXFxiYXInOyB0bz0nQzpcXFxcZm9vXFxcXGJhclxcXFxiYXonXG4gICAgICAgICAgcmV0dXJuIHRvT3JpZy5zbGljZSh0b1N0YXJ0ICsgaSArIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKGkgPT09IDIpIHtcbiAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgZnJvbWAgaXMgdGhlIGRldmljZSByb290LlxuICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPSdDOlxcXFwnOyB0bz0nQzpcXFxcZm9vJ1xuICAgICAgICAgIHJldHVybiB0b09yaWcuc2xpY2UodG9TdGFydCArIGkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZnJvbUxlbiA+IGxlbmd0aCkge1xuICAgICAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIKSB7XG4gICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYHRvYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgZnJvbWAuXG4gICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209J0M6XFxcXGZvb1xcXFxiYXInOyB0bz0nQzpcXFxcZm9vJ1xuICAgICAgICAgIGxhc3RDb21tb25TZXAgPSBpO1xuICAgICAgICB9IGVsc2UgaWYgKGkgPT09IDIpIHtcbiAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgdG9gIGlzIHRoZSBkZXZpY2Ugcm9vdC5cbiAgICAgICAgICAvLyBGb3IgZXhhbXBsZTogZnJvbT0nQzpcXFxcZm9vXFxcXGJhcic7IHRvPSdDOlxcXFwnXG4gICAgICAgICAgbGFzdENvbW1vblNlcCA9IDM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCBmcm9tQ29kZSA9IGZyb20uY2hhckNvZGVBdChmcm9tU3RhcnQgKyBpKTtcbiAgICBjb25zdCB0b0NvZGUgPSB0by5jaGFyQ29kZUF0KHRvU3RhcnQgKyBpKTtcbiAgICBpZiAoZnJvbUNvZGUgIT09IHRvQ29kZSkgYnJlYWs7XG4gICAgZWxzZSBpZiAoZnJvbUNvZGUgPT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIGxhc3RDb21tb25TZXAgPSBpO1xuICB9XG5cbiAgLy8gV2UgZm91bmQgYSBtaXNtYXRjaCBiZWZvcmUgdGhlIGZpcnN0IGNvbW1vbiBwYXRoIHNlcGFyYXRvciB3YXMgc2Vlbiwgc29cbiAgLy8gcmV0dXJuIHRoZSBvcmlnaW5hbCBgdG9gLlxuICBpZiAoaSAhPT0gbGVuZ3RoICYmIGxhc3RDb21tb25TZXAgPT09IC0xKSB7XG4gICAgcmV0dXJuIHRvT3JpZztcbiAgfVxuXG4gIGxldCBvdXQgPSBcIlwiO1xuICBpZiAobGFzdENvbW1vblNlcCA9PT0gLTEpIGxhc3RDb21tb25TZXAgPSAwO1xuICAvLyBHZW5lcmF0ZSB0aGUgcmVsYXRpdmUgcGF0aCBiYXNlZCBvbiB0aGUgcGF0aCBkaWZmZXJlbmNlIGJldHdlZW4gYHRvYCBhbmRcbiAgLy8gYGZyb21gXG4gIGZvciAoaSA9IGZyb21TdGFydCArIGxhc3RDb21tb25TZXAgKyAxOyBpIDw9IGZyb21FbmQ7ICsraSkge1xuICAgIGlmIChpID09PSBmcm9tRW5kIHx8IGZyb20uY2hhckNvZGVBdChpKSA9PT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkge1xuICAgICAgaWYgKG91dC5sZW5ndGggPT09IDApIG91dCArPSBcIi4uXCI7XG4gICAgICBlbHNlIG91dCArPSBcIlxcXFwuLlwiO1xuICAgIH1cbiAgfVxuXG4gIC8vIExhc3RseSwgYXBwZW5kIHRoZSByZXN0IG9mIHRoZSBkZXN0aW5hdGlvbiAoYHRvYCkgcGF0aCB0aGF0IGNvbWVzIGFmdGVyXG4gIC8vIHRoZSBjb21tb24gcGF0aCBwYXJ0c1xuICBpZiAob3V0Lmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gb3V0ICsgdG9PcmlnLnNsaWNlKHRvU3RhcnQgKyBsYXN0Q29tbW9uU2VwLCB0b0VuZCk7XG4gIH0gZWxzZSB7XG4gICAgdG9TdGFydCArPSBsYXN0Q29tbW9uU2VwO1xuICAgIGlmICh0b09yaWcuY2hhckNvZGVBdCh0b1N0YXJ0KSA9PT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkgKyt0b1N0YXJ0O1xuICAgIHJldHVybiB0b09yaWcuc2xpY2UodG9TdGFydCwgdG9FbmQpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b05hbWVzcGFjZWRQYXRoKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIE5vdGU6IHRoaXMgd2lsbCAqcHJvYmFibHkqIHRocm93IHNvbWV3aGVyZS5cbiAgaWYgKHR5cGVvZiBwYXRoICE9PSBcInN0cmluZ1wiKSByZXR1cm4gcGF0aDtcbiAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSByZXR1cm4gXCJcIjtcblxuICBjb25zdCByZXNvbHZlZFBhdGggPSByZXNvbHZlKHBhdGgpO1xuXG4gIGlmIChyZXNvbHZlZFBhdGgubGVuZ3RoID49IDMpIHtcbiAgICBpZiAocmVzb2x2ZWRQYXRoLmNoYXJDb2RlQXQoMCkgPT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIHtcbiAgICAgIC8vIFBvc3NpYmxlIFVOQyByb290XG5cbiAgICAgIGlmIChyZXNvbHZlZFBhdGguY2hhckNvZGVBdCgxKSA9PT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkge1xuICAgICAgICBjb25zdCBjb2RlID0gcmVzb2x2ZWRQYXRoLmNoYXJDb2RlQXQoMik7XG4gICAgICAgIGlmIChjb2RlICE9PSBDSEFSX1FVRVNUSU9OX01BUksgJiYgY29kZSAhPT0gQ0hBUl9ET1QpIHtcbiAgICAgICAgICAvLyBNYXRjaGVkIG5vbi1sb25nIFVOQyByb290LCBjb252ZXJ0IHRoZSBwYXRoIHRvIGEgbG9uZyBVTkMgcGF0aFxuICAgICAgICAgIHJldHVybiBgXFxcXFxcXFw/XFxcXFVOQ1xcXFwke3Jlc29sdmVkUGF0aC5zbGljZSgyKX1gO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1dpbmRvd3NEZXZpY2VSb290KHJlc29sdmVkUGF0aC5jaGFyQ29kZUF0KDApKSkge1xuICAgICAgLy8gUG9zc2libGUgZGV2aWNlIHJvb3RcblxuICAgICAgaWYgKFxuICAgICAgICByZXNvbHZlZFBhdGguY2hhckNvZGVBdCgxKSA9PT0gQ0hBUl9DT0xPTiAmJlxuICAgICAgICByZXNvbHZlZFBhdGguY2hhckNvZGVBdCgyKSA9PT0gQ0hBUl9CQUNLV0FSRF9TTEFTSFxuICAgICAgKSB7XG4gICAgICAgIC8vIE1hdGNoZWQgZGV2aWNlIHJvb3QsIGNvbnZlcnQgdGhlIHBhdGggdG8gYSBsb25nIFVOQyBwYXRoXG4gICAgICAgIHJldHVybiBgXFxcXFxcXFw/XFxcXCR7cmVzb2x2ZWRQYXRofWA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXJuYW1lKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGFzc2VydFBhdGgocGF0aCk7XG4gIGNvbnN0IGxlbiA9IHBhdGgubGVuZ3RoO1xuICBpZiAobGVuID09PSAwKSByZXR1cm4gXCIuXCI7XG4gIGxldCByb290RW5kID0gLTE7XG4gIGxldCBlbmQgPSAtMTtcbiAgbGV0IG1hdGNoZWRTbGFzaCA9IHRydWU7XG4gIGxldCBvZmZzZXQgPSAwO1xuICBjb25zdCBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuXG4gIC8vIFRyeSB0byBtYXRjaCBhIHJvb3RcbiAgaWYgKGxlbiA+IDEpIHtcbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAvLyBQb3NzaWJsZSBVTkMgcm9vdFxuXG4gICAgICByb290RW5kID0gb2Zmc2V0ID0gMTtcblxuICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoMSkpKSB7XG4gICAgICAgIC8vIE1hdGNoZWQgZG91YmxlIHBhdGggc2VwYXJhdG9yIGF0IGJlZ2lubmluZ1xuICAgICAgICBsZXQgaiA9IDI7XG4gICAgICAgIGxldCBsYXN0ID0gajtcbiAgICAgICAgLy8gTWF0Y2ggMSBvciBtb3JlIG5vbi1wYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGogPCBsZW4gJiYgaiAhPT0gbGFzdCkge1xuICAgICAgICAgIC8vIE1hdGNoZWQhXG4gICAgICAgICAgbGFzdCA9IGo7XG4gICAgICAgICAgLy8gTWF0Y2ggMSBvciBtb3JlIHBhdGggc2VwYXJhdG9yc1xuICAgICAgICAgIGZvciAoOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgICAgIGlmICghaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChqKSkpIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaiA8IGxlbiAmJiBqICE9PSBsYXN0KSB7XG4gICAgICAgICAgICAvLyBNYXRjaGVkIVxuICAgICAgICAgICAgbGFzdCA9IGo7XG4gICAgICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgbm9uLXBhdGggc2VwYXJhdG9yc1xuICAgICAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChqKSkpIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGogPT09IGxlbikge1xuICAgICAgICAgICAgICAvLyBXZSBtYXRjaGVkIGEgVU5DIHJvb3Qgb25seVxuICAgICAgICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChqICE9PSBsYXN0KSB7XG4gICAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgYSBVTkMgcm9vdCB3aXRoIGxlZnRvdmVyc1xuXG4gICAgICAgICAgICAgIC8vIE9mZnNldCBieSAxIHRvIGluY2x1ZGUgdGhlIHNlcGFyYXRvciBhZnRlciB0aGUgVU5DIHJvb3QgdG9cbiAgICAgICAgICAgICAgLy8gdHJlYXQgaXQgYXMgYSBcIm5vcm1hbCByb290XCIgb24gdG9wIG9mIGEgKFVOQykgcm9vdFxuICAgICAgICAgICAgICByb290RW5kID0gb2Zmc2V0ID0gaiArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1dpbmRvd3NEZXZpY2VSb290KGNvZGUpKSB7XG4gICAgICAvLyBQb3NzaWJsZSBkZXZpY2Ugcm9vdFxuXG4gICAgICBpZiAocGF0aC5jaGFyQ29kZUF0KDEpID09PSBDSEFSX0NPTE9OKSB7XG4gICAgICAgIHJvb3RFbmQgPSBvZmZzZXQgPSAyO1xuICAgICAgICBpZiAobGVuID4gMikge1xuICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KDIpKSkgcm9vdEVuZCA9IG9mZnNldCA9IDM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgLy8gYHBhdGhgIGNvbnRhaW5zIGp1c3QgYSBwYXRoIHNlcGFyYXRvciwgZXhpdCBlYXJseSB0byBhdm9pZFxuICAgIC8vIHVubmVjZXNzYXJ5IHdvcmtcbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuXG4gIGZvciAobGV0IGkgPSBsZW4gLSAxOyBpID49IG9mZnNldDsgLS1pKSB7XG4gICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaSkpKSB7XG4gICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICBlbmQgPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gV2Ugc2F3IHRoZSBmaXJzdCBub24tcGF0aCBzZXBhcmF0b3JcbiAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmIChlbmQgPT09IC0xKSB7XG4gICAgaWYgKHJvb3RFbmQgPT09IC0xKSByZXR1cm4gXCIuXCI7XG4gICAgZWxzZSBlbmQgPSByb290RW5kO1xuICB9XG4gIHJldHVybiBwYXRoLnNsaWNlKDAsIGVuZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiYXNlbmFtZShwYXRoOiBzdHJpbmcsIGV4dCA9IFwiXCIpOiBzdHJpbmcge1xuICBpZiAoZXh0ICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGV4dCAhPT0gXCJzdHJpbmdcIikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiZXh0XCIgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZycpO1xuICB9XG5cbiAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICBsZXQgc3RhcnQgPSAwO1xuICBsZXQgZW5kID0gLTE7XG4gIGxldCBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICBsZXQgaTogbnVtYmVyO1xuXG4gIC8vIENoZWNrIGZvciBhIGRyaXZlIGxldHRlciBwcmVmaXggc28gYXMgbm90IHRvIG1pc3Rha2UgdGhlIGZvbGxvd2luZ1xuICAvLyBwYXRoIHNlcGFyYXRvciBhcyBhbiBleHRyYSBzZXBhcmF0b3IgYXQgdGhlIGVuZCBvZiB0aGUgcGF0aCB0aGF0IGNhbiBiZVxuICAvLyBkaXNyZWdhcmRlZFxuICBpZiAocGF0aC5sZW5ndGggPj0gMikge1xuICAgIGNvbnN0IGRyaXZlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuICAgIGlmIChpc1dpbmRvd3NEZXZpY2VSb290KGRyaXZlKSkge1xuICAgICAgaWYgKHBhdGguY2hhckNvZGVBdCgxKSA9PT0gQ0hBUl9DT0xPTikgc3RhcnQgPSAyO1xuICAgIH1cbiAgfVxuXG4gIGlmIChleHQgIT09IHVuZGVmaW5lZCAmJiBleHQubGVuZ3RoID4gMCAmJiBleHQubGVuZ3RoIDw9IHBhdGgubGVuZ3RoKSB7XG4gICAgaWYgKGV4dC5sZW5ndGggPT09IHBhdGgubGVuZ3RoICYmIGV4dCA9PT0gcGF0aCkgcmV0dXJuIFwiXCI7XG4gICAgbGV0IGV4dElkeCA9IGV4dC5sZW5ndGggLSAxO1xuICAgIGxldCBmaXJzdE5vblNsYXNoRW5kID0gLTE7XG4gICAgZm9yIChpID0gcGF0aC5sZW5ndGggLSAxOyBpID49IHN0YXJ0OyAtLWkpIHtcbiAgICAgIGNvbnN0IGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBwYXRoIHNlcGFyYXRvciB0aGF0IHdhcyBub3QgcGFydCBvZiBhIHNldCBvZiBwYXRoXG4gICAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmaXJzdE5vblNsYXNoRW5kID09PSAtMSkge1xuICAgICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCByZW1lbWJlciB0aGlzIGluZGV4IGluIGNhc2VcbiAgICAgICAgICAvLyB3ZSBuZWVkIGl0IGlmIHRoZSBleHRlbnNpb24gZW5kcyB1cCBub3QgbWF0Y2hpbmdcbiAgICAgICAgICBtYXRjaGVkU2xhc2ggPSBmYWxzZTtcbiAgICAgICAgICBmaXJzdE5vblNsYXNoRW5kID0gaSArIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV4dElkeCA+PSAwKSB7XG4gICAgICAgICAgLy8gVHJ5IHRvIG1hdGNoIHRoZSBleHBsaWNpdCBleHRlbnNpb25cbiAgICAgICAgICBpZiAoY29kZSA9PT0gZXh0LmNoYXJDb2RlQXQoZXh0SWR4KSkge1xuICAgICAgICAgICAgaWYgKC0tZXh0SWR4ID09PSAtMSkge1xuICAgICAgICAgICAgICAvLyBXZSBtYXRjaGVkIHRoZSBleHRlbnNpb24sIHNvIG1hcmsgdGhpcyBhcyB0aGUgZW5kIG9mIG91ciBwYXRoXG4gICAgICAgICAgICAgIC8vIGNvbXBvbmVudFxuICAgICAgICAgICAgICBlbmQgPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFeHRlbnNpb24gZG9lcyBub3QgbWF0Y2gsIHNvIG91ciByZXN1bHQgaXMgdGhlIGVudGlyZSBwYXRoXG4gICAgICAgICAgICAvLyBjb21wb25lbnRcbiAgICAgICAgICAgIGV4dElkeCA9IC0xO1xuICAgICAgICAgICAgZW5kID0gZmlyc3ROb25TbGFzaEVuZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPT09IGVuZCkgZW5kID0gZmlyc3ROb25TbGFzaEVuZDtcbiAgICBlbHNlIGlmIChlbmQgPT09IC0xKSBlbmQgPSBwYXRoLmxlbmd0aDtcbiAgICByZXR1cm4gcGF0aC5zbGljZShzdGFydCwgZW5kKTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gc3RhcnQ7IC0taSkge1xuICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaSkpKSB7XG4gICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBwYXRoIHNlcGFyYXRvciB0aGF0IHdhcyBub3QgcGFydCBvZiBhIHNldCBvZiBwYXRoXG4gICAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZW5kID09PSAtMSkge1xuICAgICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgbWFyayB0aGlzIGFzIHRoZSBlbmQgb2Ygb3VyXG4gICAgICAgIC8vIHBhdGggY29tcG9uZW50XG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5kID09PSAtMSkgcmV0dXJuIFwiXCI7XG4gICAgcmV0dXJuIHBhdGguc2xpY2Uoc3RhcnQsIGVuZCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dG5hbWUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgbGV0IHN0YXJ0ID0gMDtcbiAgbGV0IHN0YXJ0RG90ID0gLTE7XG4gIGxldCBzdGFydFBhcnQgPSAwO1xuICBsZXQgZW5kID0gLTE7XG4gIGxldCBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAvLyBUcmFjayB0aGUgc3RhdGUgb2YgY2hhcmFjdGVycyAoaWYgYW55KSB3ZSBzZWUgYmVmb3JlIG91ciBmaXJzdCBkb3QgYW5kXG4gIC8vIGFmdGVyIGFueSBwYXRoIHNlcGFyYXRvciB3ZSBmaW5kXG4gIGxldCBwcmVEb3RTdGF0ZSA9IDA7XG5cbiAgLy8gQ2hlY2sgZm9yIGEgZHJpdmUgbGV0dGVyIHByZWZpeCBzbyBhcyBub3QgdG8gbWlzdGFrZSB0aGUgZm9sbG93aW5nXG4gIC8vIHBhdGggc2VwYXJhdG9yIGFzIGFuIGV4dHJhIHNlcGFyYXRvciBhdCB0aGUgZW5kIG9mIHRoZSBwYXRoIHRoYXQgY2FuIGJlXG4gIC8vIGRpc3JlZ2FyZGVkXG5cbiAgaWYgKFxuICAgIHBhdGgubGVuZ3RoID49IDIgJiZcbiAgICBwYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04gJiZcbiAgICBpc1dpbmRvd3NEZXZpY2VSb290KHBhdGguY2hhckNvZGVBdCgwKSlcbiAgKSB7XG4gICAgc3RhcnQgPSBzdGFydFBhcnQgPSAyO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSBzdGFydDsgLS1pKSB7XG4gICAgY29uc3QgY29kZSA9IHBhdGguY2hhckNvZGVBdChpKTtcbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgcGF0aCBzZXBhcmF0b3IgdGhhdCB3YXMgbm90IHBhcnQgb2YgYSBzZXQgb2YgcGF0aFxuICAgICAgLy8gc2VwYXJhdG9ycyBhdCB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHN0b3Agbm93XG4gICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICBzdGFydFBhcnQgPSBpICsgMTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgIC8vIGV4dGVuc2lvblxuICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgICBlbmQgPSBpICsgMTtcbiAgICB9XG4gICAgaWYgKGNvZGUgPT09IENIQVJfRE9UKSB7XG4gICAgICAvLyBJZiB0aGlzIGlzIG91ciBmaXJzdCBkb3QsIG1hcmsgaXQgYXMgdGhlIHN0YXJ0IG9mIG91ciBleHRlbnNpb25cbiAgICAgIGlmIChzdGFydERvdCA9PT0gLTEpIHN0YXJ0RG90ID0gaTtcbiAgICAgIGVsc2UgaWYgKHByZURvdFN0YXRlICE9PSAxKSBwcmVEb3RTdGF0ZSA9IDE7XG4gICAgfSBlbHNlIGlmIChzdGFydERvdCAhPT0gLTEpIHtcbiAgICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgYW5kIG5vbi1wYXRoIHNlcGFyYXRvciBiZWZvcmUgb3VyIGRvdCwgc28gd2Ugc2hvdWxkXG4gICAgICAvLyBoYXZlIGEgZ29vZCBjaGFuY2UgYXQgaGF2aW5nIGEgbm9uLWVtcHR5IGV4dGVuc2lvblxuICAgICAgcHJlRG90U3RhdGUgPSAtMTtcbiAgICB9XG4gIH1cblxuICBpZiAoXG4gICAgc3RhcnREb3QgPT09IC0xIHx8XG4gICAgZW5kID09PSAtMSB8fFxuICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgY2hhcmFjdGVyIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZG90XG4gICAgcHJlRG90U3RhdGUgPT09IDAgfHxcbiAgICAvLyBUaGUgKHJpZ2h0LW1vc3QpIHRyaW1tZWQgcGF0aCBjb21wb25lbnQgaXMgZXhhY3RseSAnLi4nXG4gICAgKHByZURvdFN0YXRlID09PSAxICYmIHN0YXJ0RG90ID09PSBlbmQgLSAxICYmIHN0YXJ0RG90ID09PSBzdGFydFBhcnQgKyAxKVxuICApIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuICByZXR1cm4gcGF0aC5zbGljZShzdGFydERvdCwgZW5kKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdChwYXRoT2JqZWN0OiBGb3JtYXRJbnB1dFBhdGhPYmplY3QpOiBzdHJpbmcge1xuICAvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG4gIGlmIChwYXRoT2JqZWN0ID09PSBudWxsIHx8IHR5cGVvZiBwYXRoT2JqZWN0ICE9PSBcIm9iamVjdFwiKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgIGBUaGUgXCJwYXRoT2JqZWN0XCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAke3R5cGVvZiBwYXRoT2JqZWN0fWAsXG4gICAgKTtcbiAgfVxuICByZXR1cm4gX2Zvcm1hdChcIlxcXFxcIiwgcGF0aE9iamVjdCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShwYXRoOiBzdHJpbmcpOiBQYXJzZWRQYXRoIHtcbiAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICBjb25zdCByZXQ6IFBhcnNlZFBhdGggPSB7IHJvb3Q6IFwiXCIsIGRpcjogXCJcIiwgYmFzZTogXCJcIiwgZXh0OiBcIlwiLCBuYW1lOiBcIlwiIH07XG5cbiAgY29uc3QgbGVuID0gcGF0aC5sZW5ndGg7XG4gIGlmIChsZW4gPT09IDApIHJldHVybiByZXQ7XG5cbiAgbGV0IHJvb3RFbmQgPSAwO1xuICBsZXQgY29kZSA9IHBhdGguY2hhckNvZGVBdCgwKTtcblxuICAvLyBUcnkgdG8gbWF0Y2ggYSByb290XG4gIGlmIChsZW4gPiAxKSB7XG4gICAgaWYgKGlzUGF0aFNlcGFyYXRvcihjb2RlKSkge1xuICAgICAgLy8gUG9zc2libGUgVU5DIHJvb3RcblxuICAgICAgcm9vdEVuZCA9IDE7XG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgxKSkpIHtcbiAgICAgICAgLy8gTWF0Y2hlZCBkb3VibGUgcGF0aCBzZXBhcmF0b3IgYXQgYmVnaW5uaW5nXG4gICAgICAgIGxldCBqID0gMjtcbiAgICAgICAgbGV0IGxhc3QgPSBqO1xuICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgbm9uLXBhdGggc2VwYXJhdG9yc1xuICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaiA8IGxlbiAmJiBqICE9PSBsYXN0KSB7XG4gICAgICAgICAgLy8gTWF0Y2hlZCFcbiAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgICAgaWYgKCFpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChqIDwgbGVuICYmIGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgIC8vIE1hdGNoZWQhXG4gICAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBub24tcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaiA9PT0gbGVuKSB7XG4gICAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgYSBVTkMgcm9vdCBvbmx5XG5cbiAgICAgICAgICAgICAgcm9vdEVuZCA9IGo7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IHdpdGggbGVmdG92ZXJzXG5cbiAgICAgICAgICAgICAgcm9vdEVuZCA9IGogKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dzRGV2aWNlUm9vdChjb2RlKSkge1xuICAgICAgLy8gUG9zc2libGUgZGV2aWNlIHJvb3RcblxuICAgICAgaWYgKHBhdGguY2hhckNvZGVBdCgxKSA9PT0gQ0hBUl9DT0xPTikge1xuICAgICAgICByb290RW5kID0gMjtcbiAgICAgICAgaWYgKGxlbiA+IDIpIHtcbiAgICAgICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgyKSkpIHtcbiAgICAgICAgICAgIGlmIChsZW4gPT09IDMpIHtcbiAgICAgICAgICAgICAgLy8gYHBhdGhgIGNvbnRhaW5zIGp1c3QgYSBkcml2ZSByb290LCBleGl0IGVhcmx5IHRvIGF2b2lkXG4gICAgICAgICAgICAgIC8vIHVubmVjZXNzYXJ5IHdvcmtcbiAgICAgICAgICAgICAgcmV0LnJvb3QgPSByZXQuZGlyID0gcGF0aDtcbiAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvb3RFbmQgPSAzO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBgcGF0aGAgY29udGFpbnMganVzdCBhIGRyaXZlIHJvb3QsIGV4aXQgZWFybHkgdG8gYXZvaWRcbiAgICAgICAgICAvLyB1bm5lY2Vzc2FyeSB3b3JrXG4gICAgICAgICAgcmV0LnJvb3QgPSByZXQuZGlyID0gcGF0aDtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzUGF0aFNlcGFyYXRvcihjb2RlKSkge1xuICAgIC8vIGBwYXRoYCBjb250YWlucyBqdXN0IGEgcGF0aCBzZXBhcmF0b3IsIGV4aXQgZWFybHkgdG8gYXZvaWRcbiAgICAvLyB1bm5lY2Vzc2FyeSB3b3JrXG4gICAgcmV0LnJvb3QgPSByZXQuZGlyID0gcGF0aDtcbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgaWYgKHJvb3RFbmQgPiAwKSByZXQucm9vdCA9IHBhdGguc2xpY2UoMCwgcm9vdEVuZCk7XG5cbiAgbGV0IHN0YXJ0RG90ID0gLTE7XG4gIGxldCBzdGFydFBhcnQgPSByb290RW5kO1xuICBsZXQgZW5kID0gLTE7XG4gIGxldCBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICBsZXQgaSA9IHBhdGgubGVuZ3RoIC0gMTtcblxuICAvLyBUcmFjayB0aGUgc3RhdGUgb2YgY2hhcmFjdGVycyAoaWYgYW55KSB3ZSBzZWUgYmVmb3JlIG91ciBmaXJzdCBkb3QgYW5kXG4gIC8vIGFmdGVyIGFueSBwYXRoIHNlcGFyYXRvciB3ZSBmaW5kXG4gIGxldCBwcmVEb3RTdGF0ZSA9IDA7XG5cbiAgLy8gR2V0IG5vbi1kaXIgaW5mb1xuICBmb3IgKDsgaSA+PSByb290RW5kOyAtLWkpIHtcbiAgICBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBwYXRoIHNlcGFyYXRvciB0aGF0IHdhcyBub3QgcGFydCBvZiBhIHNldCBvZiBwYXRoXG4gICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgIHN0YXJ0UGFydCA9IGkgKyAxO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoZW5kID09PSAtMSkge1xuICAgICAgLy8gV2Ugc2F3IHRoZSBmaXJzdCBub24tcGF0aCBzZXBhcmF0b3IsIG1hcmsgdGhpcyBhcyB0aGUgZW5kIG9mIG91clxuICAgICAgLy8gZXh0ZW5zaW9uXG4gICAgICBtYXRjaGVkU2xhc2ggPSBmYWxzZTtcbiAgICAgIGVuZCA9IGkgKyAxO1xuICAgIH1cbiAgICBpZiAoY29kZSA9PT0gQ0hBUl9ET1QpIHtcbiAgICAgIC8vIElmIHRoaXMgaXMgb3VyIGZpcnN0IGRvdCwgbWFyayBpdCBhcyB0aGUgc3RhcnQgb2Ygb3VyIGV4dGVuc2lvblxuICAgICAgaWYgKHN0YXJ0RG90ID09PSAtMSkgc3RhcnREb3QgPSBpO1xuICAgICAgZWxzZSBpZiAocHJlRG90U3RhdGUgIT09IDEpIHByZURvdFN0YXRlID0gMTtcbiAgICB9IGVsc2UgaWYgKHN0YXJ0RG90ICE9PSAtMSkge1xuICAgICAgLy8gV2Ugc2F3IGEgbm9uLWRvdCBhbmQgbm9uLXBhdGggc2VwYXJhdG9yIGJlZm9yZSBvdXIgZG90LCBzbyB3ZSBzaG91bGRcbiAgICAgIC8vIGhhdmUgYSBnb29kIGNoYW5jZSBhdCBoYXZpbmcgYSBub24tZW1wdHkgZXh0ZW5zaW9uXG4gICAgICBwcmVEb3RTdGF0ZSA9IC0xO1xuICAgIH1cbiAgfVxuXG4gIGlmIChcbiAgICBzdGFydERvdCA9PT0gLTEgfHxcbiAgICBlbmQgPT09IC0xIHx8XG4gICAgLy8gV2Ugc2F3IGEgbm9uLWRvdCBjaGFyYWN0ZXIgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBkb3RcbiAgICBwcmVEb3RTdGF0ZSA9PT0gMCB8fFxuICAgIC8vIFRoZSAocmlnaHQtbW9zdCkgdHJpbW1lZCBwYXRoIGNvbXBvbmVudCBpcyBleGFjdGx5ICcuLidcbiAgICAocHJlRG90U3RhdGUgPT09IDEgJiYgc3RhcnREb3QgPT09IGVuZCAtIDEgJiYgc3RhcnREb3QgPT09IHN0YXJ0UGFydCArIDEpXG4gICkge1xuICAgIGlmIChlbmQgIT09IC0xKSB7XG4gICAgICByZXQuYmFzZSA9IHJldC5uYW1lID0gcGF0aC5zbGljZShzdGFydFBhcnQsIGVuZCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldC5uYW1lID0gcGF0aC5zbGljZShzdGFydFBhcnQsIHN0YXJ0RG90KTtcbiAgICByZXQuYmFzZSA9IHBhdGguc2xpY2Uoc3RhcnRQYXJ0LCBlbmQpO1xuICAgIHJldC5leHQgPSBwYXRoLnNsaWNlKHN0YXJ0RG90LCBlbmQpO1xuICB9XG5cbiAgLy8gSWYgdGhlIGRpcmVjdG9yeSBpcyB0aGUgcm9vdCwgdXNlIHRoZSBlbnRpcmUgcm9vdCBhcyB0aGUgYGRpcmAgaW5jbHVkaW5nXG4gIC8vIHRoZSB0cmFpbGluZyBzbGFzaCBpZiBhbnkgKGBDOlxcYWJjYCAtPiBgQzpcXGApLiBPdGhlcndpc2UsIHN0cmlwIG91dCB0aGVcbiAgLy8gdHJhaWxpbmcgc2xhc2ggKGBDOlxcYWJjXFxkZWZgIC0+IGBDOlxcYWJjYCkuXG4gIGlmIChzdGFydFBhcnQgPiAwICYmIHN0YXJ0UGFydCAhPT0gcm9vdEVuZCkge1xuICAgIHJldC5kaXIgPSBwYXRoLnNsaWNlKDAsIHN0YXJ0UGFydCAtIDEpO1xuICB9IGVsc2UgcmV0LmRpciA9IHJldC5yb290O1xuXG4gIHJldHVybiByZXQ7XG59XG5cbi8qKiBDb252ZXJ0cyBhIGZpbGUgVVJMIHRvIGEgcGF0aCBzdHJpbmcuXG4gKlxuICogICAgICBmcm9tRmlsZVVybChcImZpbGU6Ly8vaG9tZS9mb29cIik7IC8vIFwiXFxcXGhvbWVcXFxcZm9vXCJcbiAqICAgICAgZnJvbUZpbGVVcmwoXCJmaWxlOi8vL0M6L1VzZXJzL2Zvb1wiKTsgLy8gXCJDOlxcXFxVc2Vyc1xcXFxmb29cIlxuICogICAgICBmcm9tRmlsZVVybChcImZpbGU6Ly9sb2NhbGhvc3QvaG9tZS9mb29cIik7IC8vIFwiXFxcXFxcXFxsb2NhbGhvc3RcXFxcaG9tZVxcXFxmb29cIlxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbUZpbGVVcmwodXJsOiBzdHJpbmcgfCBVUkwpOiBzdHJpbmcge1xuICB1cmwgPSB1cmwgaW5zdGFuY2VvZiBVUkwgPyB1cmwgOiBuZXcgVVJMKHVybCk7XG4gIGlmICh1cmwucHJvdG9jb2wgIT0gXCJmaWxlOlwiKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk11c3QgYmUgYSBmaWxlIFVSTC5cIik7XG4gIH1cbiAgbGV0IHBhdGggPSBkZWNvZGVVUklDb21wb25lbnQoXG4gICAgdXJsLnBhdGhuYW1lXG4gICAgICAucmVwbGFjZSgvXlxcLyooW0EtWmEtel06KShcXC98JCkvLCBcIiQxL1wiKVxuICAgICAgLnJlcGxhY2UoL1xcLy9nLCBcIlxcXFxcIilcbiAgICAgIC5yZXBsYWNlKC8lKD8hWzAtOUEtRmEtZl17Mn0pL2csIFwiJTI1XCIpLFxuICApO1xuICBpZiAodXJsLmhvc3RuYW1lICE9IFwiXCIpIHtcbiAgICAvLyBOb3RlOiBUaGUgYFVSTGAgaW1wbGVtZW50YXRpb24gZ3VhcmFudGVlcyB0aGF0IHRoZSBkcml2ZSBsZXR0ZXIgYW5kXG4gICAgLy8gaG9zdG5hbWUgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZS4gT3RoZXJ3aXNlIGl0IHdvdWxkIG5vdCBoYXZlIGJlZW4gdmFsaWRcbiAgICAvLyB0byBhcHBlbmQgdGhlIGhvc3RuYW1lIGFuZCBwYXRoIGxpa2UgdGhpcy5cbiAgICBwYXRoID0gYFxcXFxcXFxcJHt1cmwuaG9zdG5hbWV9JHtwYXRofWA7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsaURBQWlEO0FBQ2pELDZEQUE2RDtBQUM3RCx1Q0FBdUMsR0FHdkMsU0FDRSxRQUFRLEVBQ1IsbUJBQW1CLEVBQ25CLFVBQVUsRUFDVixrQkFBa0IsUUFDYixrQkFBa0I7QUFFekIsU0FDRSxVQUFVLEVBQ1YsZUFBZSxFQUNmLG1CQUFtQixFQUNuQixlQUFlLEVBQ2YsT0FBTyxRQUNGLGFBQWE7QUFDcEIsU0FBUyxNQUFNLFFBQVEscUJBQXFCO0FBRTVDLE9BQU8sTUFBTSxNQUFNLEtBQUs7QUFDeEIsT0FBTyxNQUFNLFlBQVksSUFBSTtBQUU3QixPQUFPLFNBQVMsUUFBUSxHQUFHLFlBQXNCLEVBQVU7SUFDekQsSUFBSSxpQkFBaUI7SUFDckIsSUFBSSxlQUFlO0lBQ25CLElBQUksbUJBQW1CLEtBQUs7SUFFNUIsSUFBSyxJ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