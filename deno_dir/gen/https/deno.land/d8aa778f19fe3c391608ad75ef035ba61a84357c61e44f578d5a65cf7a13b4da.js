// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
import { ERR_INVALID_ARG_TYPE, ERR_INVALID_ARG_VALUE, ERR_INVALID_FILE_URL_HOST, ERR_INVALID_FILE_URL_PATH, ERR_INVALID_URL_SCHEME } from "./_errors.ts";
import { CHAR_BACKWARD_SLASH, CHAR_FORWARD_SLASH, CHAR_LOWERCASE_A, CHAR_LOWERCASE_Z } from "../path/_constants.ts";
import * as path from "./path.ts";
import { isWindows, osType } from "../_util/os.ts";
const forwardSlashRegEx = /\//g;
const percentRegEx = /%/g;
const backslashRegEx = /\\/g;
const newlineRegEx = /\n/g;
const carriageReturnRegEx = /\r/g;
const tabRegEx = /\t/g;
const _url = URL;
export { _url as URL };
/**
 * The URL object has both a `toString()` method and `href` property that return string serializations of the URL.
 * These are not, however, customizable in any way.
 * This method allows for basic customization of the output.
 * @see Tested in `parallel/test-url-format-whatwg.js`.
 * @param urlObject
 * @param options
 * @param options.auth `true` if the serialized URL string should include the username and password, `false` otherwise. **Default**: `true`.
 * @param options.fragment `true` if the serialized URL string should include the fragment, `false` otherwise. **Default**: `true`.
 * @param options.search `true` if the serialized URL string should include the search query, **Default**: `true`.
 * @param options.unicode `true` if Unicode characters appearing in the host component of the URL string should be encoded directly as opposed to being Punycode encoded. **Default**: `false`.
 * @returns a customizable serialization of a URL `String` representation of a `WHATWG URL` object.
 */ export function format(urlObject, options) {
    if (options) {
        if (typeof options !== "object") {
            throw new ERR_INVALID_ARG_TYPE("options", "object", options);
        }
    }
    options = {
        auth: true,
        fragment: true,
        search: true,
        unicode: false,
        ...options
    };
    let ret = urlObject.protocol;
    if (urlObject.host !== null) {
        ret += "//";
        const hasUsername = urlObject.username !== "";
        const hasPassword = urlObject.password !== "";
        if (options.auth && (hasUsername || hasPassword)) {
            if (hasUsername) {
                ret += urlObject.username;
            }
            if (hasPassword) {
                ret += `:${urlObject.password}`;
            }
            ret += "@";
        }
        // TODO(wafuwfu13): Support unicode option
        // ret += options.unicode ?
        //   domainToUnicode(urlObject.host) : urlObject.host;
        ret += urlObject.host;
        if (urlObject.port) {
            ret += `:${urlObject.port}`;
        }
    }
    ret += urlObject.pathname;
    if (options.search) {
        ret += urlObject.search;
    }
    if (options.fragment) {
        ret += urlObject.hash;
    }
    return ret;
}
/**
 * This function ensures the correct decodings of percent-encoded characters as well as ensuring a cross-platform valid absolute path string.
 * @see Tested in `parallel/test-fileurltopath.js`.
 * @param path The file URL string or URL object to convert to a path.
 * @returns The fully-resolved platform-specific Node.js file path.
 */ export function fileURLToPath(path) {
    if (typeof path === "string") path = new URL(path);
    else if (!(path instanceof URL)) {
        throw new ERR_INVALID_ARG_TYPE("path", [
            "string",
            "URL"
        ], path);
    }
    if (path.protocol !== "file:") {
        throw new ERR_INVALID_URL_SCHEME("file");
    }
    return isWindows ? getPathFromURLWin(path) : getPathFromURLPosix(path);
}
function getPathFromURLWin(url) {
    const hostname = url.hostname;
    let pathname = url.pathname;
    for(let n = 0; n < pathname.length; n++){
        if (pathname[n] === "%") {
            const third = pathname.codePointAt(n + 2) | 0x20;
            if (pathname[n + 1] === "2" && third === 102 || // 2f 2F /
            pathname[n + 1] === "5" && third === 99 // 5c 5C \
            ) {
                throw new ERR_INVALID_FILE_URL_PATH("must not include encoded \\ or / characters");
            }
        }
    }
    pathname = pathname.replace(forwardSlashRegEx, "\\");
    pathname = decodeURIComponent(pathname);
    if (hostname !== "") {
        // TODO(bartlomieju): add support for punycode encodings
        return `\\\\${hostname}${pathname}`;
    } else {
        // Otherwise, it's a local path that requires a drive letter
        const letter = pathname.codePointAt(1) | 0x20;
        const sep = pathname[2];
        if (letter < CHAR_LOWERCASE_A || letter > CHAR_LOWERCASE_Z || // a..z A..Z
        sep !== ":") {
            throw new ERR_INVALID_FILE_URL_PATH("must be absolute");
        }
        return pathname.slice(1);
    }
}
function getPathFromURLPosix(url) {
    if (url.hostname !== "") {
        throw new ERR_INVALID_FILE_URL_HOST(osType);
    }
    const pathname = url.pathname;
    for(let n = 0; n < pathname.length; n++){
        if (pathname[n] === "%") {
            const third = pathname.codePointAt(n + 2) | 0x20;
            if (pathname[n + 1] === "2" && third === 102) {
                throw new ERR_INVALID_FILE_URL_PATH("must not include encoded / characters");
            }
        }
    }
    return decodeURIComponent(pathname);
}
/**
 *  The following characters are percent-encoded when converting from file path
 *  to URL:
 *  - %: The percent character is the only character not encoded by the
 *       `pathname` setter.
 *  - \: Backslash is encoded on non-windows platforms since it's a valid
 *       character but the `pathname` setters replaces it by a forward slash.
 *  - LF: The newline character is stripped out by the `pathname` setter.
 *        (See whatwg/url#419)
 *  - CR: The carriage return character is also stripped out by the `pathname`
 *        setter.
 *  - TAB: The tab character is also stripped out by the `pathname` setter.
 */ function encodePathChars(filepath) {
    if (filepath.includes("%")) {
        filepath = filepath.replace(percentRegEx, "%25");
    }
    // In posix, backslash is a valid character in paths:
    if (!isWindows && filepath.includes("\\")) {
        filepath = filepath.replace(backslashRegEx, "%5C");
    }
    if (filepath.includes("\n")) {
        filepath = filepath.replace(newlineRegEx, "%0A");
    }
    if (filepath.includes("\r")) {
        filepath = filepath.replace(carriageReturnRegEx, "%0D");
    }
    if (filepath.includes("\t")) {
        filepath = filepath.replace(tabRegEx, "%09");
    }
    return filepath;
}
/**
 * This function ensures that `filepath` is resolved absolutely, and that the URL control characters are correctly encoded when converting into a File URL.
 * @see Tested in `parallel/test-url-pathtofileurl.js`.
 * @param filepath The file path string to convert to a file URL.
 * @returns The file URL object.
 */ export function pathToFileURL(filepath) {
    const outURL = new URL("file://");
    if (isWindows && filepath.startsWith("\\\\")) {
        // UNC path format: \\server\share\resource
        const paths = filepath.split("\\");
        if (paths.length <= 3) {
            throw new ERR_INVALID_ARG_VALUE("filepath", filepath, "Missing UNC resource path");
        }
        const hostname = paths[2];
        if (hostname.length === 0) {
            throw new ERR_INVALID_ARG_VALUE("filepath", filepath, "Empty UNC servername");
        }
        // TODO(wafuwafu13): To be `outURL.hostname = domainToASCII(hostname)` once `domainToASCII` are implemented
        outURL.hostname = hostname;
        outURL.pathname = encodePathChars(paths.slice(3).join("/"));
    } else {
        let resolved = path.resolve(filepath);
        // path.resolve strips trailing slashes so we must add them back
        const filePathLast = filepath.charCodeAt(filepath.length - 1);
        if ((filePathLast === CHAR_FORWARD_SLASH || isWindows && filePathLast === CHAR_BACKWARD_SLASH) && resolved[resolved.length - 1] !== path.sep) {
            resolved += "/";
        }
        outURL.pathname = encodePathChars(resolved);
    }
    return outURL;
}
/**
 * This utility function converts a URL object into an ordinary options object as expected by the `http.request()` and `https.request()` APIs.
 * @see Tested in `parallel/test-url-urltooptions.js`.
 * @param url The `WHATWG URL` object to convert to an options object.
 * @returns HttpOptions
 * @returns HttpOptions.protocol Protocol to use.
 * @returns HttpOptions.hostname A domain name or IP address of the server to issue the request to.
 * @returns HttpOptions.hash The fragment portion of the URL.
 * @returns HttpOptions.search The serialized query portion of the URL.
 * @returns HttpOptions.pathname The path portion of the URL.
 * @returns HttpOptions.path Request path. Should include query string if any. E.G. `'/index.html?page=12'`. An exception is thrown when the request path contains illegal characters. Currently, only spaces are rejected but that may change in the future.
 * @returns HttpOptions.href The serialized URL.
 * @returns HttpOptions.port Port of remote server.
 * @returns HttpOptions.auth Basic authentication i.e. `'user:password'` to compute an Authorization header.
 */ function urlToHttpOptions(url) {
    const options = {
        protocol: url.protocol,
        hostname: typeof url.hostname === "string" && url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname,
        hash: url.hash,
        search: url.search,
        pathname: url.pathname,
        path: `${url.pathname || ""}${url.search || ""}`,
        href: url.href
    };
    if (url.port !== "") {
        options.port = Number(url.port);
    }
    if (url.username || url.password) {
        options.auth = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
    }
    return options;
}
export default {
    format,
    fileURLToPath,
    pathToFileURL,
    urlToHttpOptions,
    URL
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL25vZGUvdXJsLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5pbXBvcnQge1xuICBFUlJfSU5WQUxJRF9BUkdfVFlQRSxcbiAgRVJSX0lOVkFMSURfQVJHX1ZBTFVFLFxuICBFUlJfSU5WQUxJRF9GSUxFX1VSTF9IT1NULFxuICBFUlJfSU5WQUxJRF9GSUxFX1VSTF9QQVRILFxuICBFUlJfSU5WQUxJRF9VUkxfU0NIRU1FLFxufSBmcm9tIFwiLi9fZXJyb3JzLnRzXCI7XG5pbXBvcnQge1xuICBDSEFSX0JBQ0tXQVJEX1NMQVNILFxuICBDSEFSX0ZPUldBUkRfU0xBU0gsXG4gIENIQVJfTE9XRVJDQVNFX0EsXG4gIENIQVJfTE9XRVJDQVNFX1osXG59IGZyb20gXCIuLi9wYXRoL19jb25zdGFudHMudHNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcIi4vcGF0aC50c1wiO1xuaW1wb3J0IHsgaXNXaW5kb3dzLCBvc1R5cGUgfSBmcm9tIFwiLi4vX3V0aWwvb3MudHNcIjtcblxuY29uc3QgZm9yd2FyZFNsYXNoUmVnRXggPSAvXFwvL2c7XG5jb25zdCBwZXJjZW50UmVnRXggPSAvJS9nO1xuY29uc3QgYmFja3NsYXNoUmVnRXggPSAvXFxcXC9nO1xuY29uc3QgbmV3bGluZVJlZ0V4ID0gL1xcbi9nO1xuY29uc3QgY2FycmlhZ2VSZXR1cm5SZWdFeCA9IC9cXHIvZztcbmNvbnN0IHRhYlJlZ0V4ID0gL1xcdC9nO1xuXG5jb25zdCBfdXJsID0gVVJMO1xuZXhwb3J0IHsgX3VybCBhcyBVUkwgfTtcblxuLyoqXG4gKiBUaGUgVVJMIG9iamVjdCBoYXMgYm90aCBhIGB0b1N0cmluZygpYCBtZXRob2QgYW5kIGBocmVmYCBwcm9wZXJ0eSB0aGF0IHJldHVybiBzdHJpbmcgc2VyaWFsaXphdGlvbnMgb2YgdGhlIFVSTC5cbiAqIFRoZXNlIGFyZSBub3QsIGhvd2V2ZXIsIGN1c3RvbWl6YWJsZSBpbiBhbnkgd2F5LlxuICogVGhpcyBtZXRob2QgYWxsb3dzIGZvciBiYXNpYyBjdXN0b21pemF0aW9uIG9mIHRoZSBvdXRwdXQuXG4gKiBAc2VlIFRlc3RlZCBpbiBgcGFyYWxsZWwvdGVzdC11cmwtZm9ybWF0LXdoYXR3Zy5qc2AuXG4gKiBAcGFyYW0gdXJsT2JqZWN0XG4gKiBAcGFyYW0gb3B0aW9uc1xuICogQHBhcmFtIG9wdGlvbnMuYXV0aCBgdHJ1ZWAgaWYgdGhlIHNlcmlhbGl6ZWQgVVJMIHN0cmluZyBzaG91bGQgaW5jbHVkZSB0aGUgdXNlcm5hbWUgYW5kIHBhc3N3b3JkLCBgZmFsc2VgIG90aGVyd2lzZS4gKipEZWZhdWx0Kio6IGB0cnVlYC5cbiAqIEBwYXJhbSBvcHRpb25zLmZyYWdtZW50IGB0cnVlYCBpZiB0aGUgc2VyaWFsaXplZCBVUkwgc3RyaW5nIHNob3VsZCBpbmNsdWRlIHRoZSBmcmFnbWVudCwgYGZhbHNlYCBvdGhlcndpc2UuICoqRGVmYXVsdCoqOiBgdHJ1ZWAuXG4gKiBAcGFyYW0gb3B0aW9ucy5zZWFyY2ggYHRydWVgIGlmIHRoZSBzZXJpYWxpemVkIFVSTCBzdHJpbmcgc2hvdWxkIGluY2x1ZGUgdGhlIHNlYXJjaCBxdWVyeSwgKipEZWZhdWx0Kio6IGB0cnVlYC5cbiAqIEBwYXJhbSBvcHRpb25zLnVuaWNvZGUgYHRydWVgIGlmIFVuaWNvZGUgY2hhcmFjdGVycyBhcHBlYXJpbmcgaW4gdGhlIGhvc3QgY29tcG9uZW50IG9mIHRoZSBVUkwgc3RyaW5nIHNob3VsZCBiZSBlbmNvZGVkIGRpcmVjdGx5IGFzIG9wcG9zZWQgdG8gYmVpbmcgUHVueWNvZGUgZW5jb2RlZC4gKipEZWZhdWx0Kio6IGBmYWxzZWAuXG4gKiBAcmV0dXJucyBhIGN1c3RvbWl6YWJsZSBzZXJpYWxpemF0aW9uIG9mIGEgVVJMIGBTdHJpbmdgIHJlcHJlc2VudGF0aW9uIG9mIGEgYFdIQVRXRyBVUkxgIG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdChcbiAgdXJsT2JqZWN0OiBVUkwsXG4gIG9wdGlvbnM/OiB7XG4gICAgYXV0aDogYm9vbGVhbjtcbiAgICBmcmFnbWVudDogYm9vbGVhbjtcbiAgICBzZWFyY2g6IGJvb2xlYW47XG4gICAgdW5pY29kZTogYm9vbGVhbjtcbiAgfSxcbik6IHN0cmluZyB7XG4gIGlmIChvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICB0aHJvdyBuZXcgRVJSX0lOVkFMSURfQVJHX1RZUEUoXCJvcHRpb25zXCIsIFwib2JqZWN0XCIsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIG9wdGlvbnMgPSB7XG4gICAgYXV0aDogdHJ1ZSxcbiAgICBmcmFnbWVudDogdHJ1ZSxcbiAgICBzZWFyY2g6IHRydWUsXG4gICAgdW5pY29kZTogZmFsc2UsXG4gICAgLi4ub3B0aW9ucyxcbiAgfTtcblxuICBsZXQgcmV0ID0gdXJsT2JqZWN0LnByb3RvY29sO1xuICBpZiAodXJsT2JqZWN0Lmhvc3QgIT09IG51bGwpIHtcbiAgICByZXQgKz0gXCIvL1wiO1xuICAgIGNvbnN0IGhhc1VzZXJuYW1lID0gdXJsT2JqZWN0LnVzZXJuYW1lICE9PSBcIlwiO1xuICAgIGNvbnN0IGhhc1Bhc3N3b3JkID0gdXJsT2JqZWN0LnBhc3N3b3JkICE9PSBcIlwiO1xuICAgIGlmIChvcHRpb25zLmF1dGggJiYgKGhhc1VzZXJuYW1lIHx8IGhhc1Bhc3N3b3JkKSkge1xuICAgICAgaWYgKGhhc1VzZXJuYW1lKSB7XG4gICAgICAgIHJldCArPSB1cmxPYmplY3QudXNlcm5hbWU7XG4gICAgICB9XG4gICAgICBpZiAoaGFzUGFzc3dvcmQpIHtcbiAgICAgICAgcmV0ICs9IGA6JHt1cmxPYmplY3QucGFzc3dvcmR9YDtcbiAgICAgIH1cbiAgICAgIHJldCArPSBcIkBcIjtcbiAgICB9XG4gICAgLy8gVE9ETyh3YWZ1d2Z1MTMpOiBTdXBwb3J0IHVuaWNvZGUgb3B0aW9uXG4gICAgLy8gcmV0ICs9IG9wdGlvbnMudW5pY29kZSA/XG4gICAgLy8gICBkb21haW5Ub1VuaWNvZGUodXJsT2JqZWN0Lmhvc3QpIDogdXJsT2JqZWN0Lmhvc3Q7XG4gICAgcmV0ICs9IHVybE9iamVjdC5ob3N0O1xuICAgIGlmICh1cmxPYmplY3QucG9ydCkge1xuICAgICAgcmV0ICs9IGA6JHt1cmxPYmplY3QucG9ydH1gO1xuICAgIH1cbiAgfVxuXG4gIHJldCArPSB1cmxPYmplY3QucGF0aG5hbWU7XG5cbiAgaWYgKG9wdGlvbnMuc2VhcmNoKSB7XG4gICAgcmV0ICs9IHVybE9iamVjdC5zZWFyY2g7XG4gIH1cbiAgaWYgKG9wdGlvbnMuZnJhZ21lbnQpIHtcbiAgICByZXQgKz0gdXJsT2JqZWN0Lmhhc2g7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gZW5zdXJlcyB0aGUgY29ycmVjdCBkZWNvZGluZ3Mgb2YgcGVyY2VudC1lbmNvZGVkIGNoYXJhY3RlcnMgYXMgd2VsbCBhcyBlbnN1cmluZyBhIGNyb3NzLXBsYXRmb3JtIHZhbGlkIGFic29sdXRlIHBhdGggc3RyaW5nLlxuICogQHNlZSBUZXN0ZWQgaW4gYHBhcmFsbGVsL3Rlc3QtZmlsZXVybHRvcGF0aC5qc2AuXG4gKiBAcGFyYW0gcGF0aCBUaGUgZmlsZSBVUkwgc3RyaW5nIG9yIFVSTCBvYmplY3QgdG8gY29udmVydCB0byBhIHBhdGguXG4gKiBAcmV0dXJucyBUaGUgZnVsbHktcmVzb2x2ZWQgcGxhdGZvcm0tc3BlY2lmaWMgTm9kZS5qcyBmaWxlIHBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaWxlVVJMVG9QYXRoKHBhdGg6IHN0cmluZyB8IFVSTCk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgcGF0aCA9PT0gXCJzdHJpbmdcIikgcGF0aCA9IG5ldyBVUkwocGF0aCk7XG4gIGVsc2UgaWYgKCEocGF0aCBpbnN0YW5jZW9mIFVSTCkpIHtcbiAgICB0aHJvdyBuZXcgRVJSX0lOVkFMSURfQVJHX1RZUEUoXCJwYXRoXCIsIFtcInN0cmluZ1wiLCBcIlVSTFwiXSwgcGF0aCk7XG4gIH1cbiAgaWYgKHBhdGgucHJvdG9jb2wgIT09IFwiZmlsZTpcIikge1xuICAgIHRocm93IG5ldyBFUlJfSU5WQUxJRF9VUkxfU0NIRU1FKFwiZmlsZVwiKTtcbiAgfVxuICByZXR1cm4gaXNXaW5kb3dzID8gZ2V0UGF0aEZyb21VUkxXaW4ocGF0aCkgOiBnZXRQYXRoRnJvbVVSTFBvc2l4KHBhdGgpO1xufVxuXG5mdW5jdGlvbiBnZXRQYXRoRnJvbVVSTFdpbih1cmw6IFVSTCk6IHN0cmluZyB7XG4gIGNvbnN0IGhvc3RuYW1lID0gdXJsLmhvc3RuYW1lO1xuICBsZXQgcGF0aG5hbWUgPSB1cmwucGF0aG5hbWU7XG4gIGZvciAobGV0IG4gPSAwOyBuIDwgcGF0aG5hbWUubGVuZ3RoOyBuKyspIHtcbiAgICBpZiAocGF0aG5hbWVbbl0gPT09IFwiJVwiKSB7XG4gICAgICBjb25zdCB0aGlyZCA9IHBhdGhuYW1lLmNvZGVQb2ludEF0KG4gKyAyKSEgfCAweDIwO1xuICAgICAgaWYgKFxuICAgICAgICAocGF0aG5hbWVbbiArIDFdID09PSBcIjJcIiAmJiB0aGlyZCA9PT0gMTAyKSB8fCAvLyAyZiAyRiAvXG4gICAgICAgIChwYXRobmFtZVtuICsgMV0gPT09IFwiNVwiICYmIHRoaXJkID09PSA5OSkgLy8gNWMgNUMgXFxcbiAgICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRVJSX0lOVkFMSURfRklMRV9VUkxfUEFUSChcbiAgICAgICAgICBcIm11c3Qgbm90IGluY2x1ZGUgZW5jb2RlZCBcXFxcIG9yIC8gY2hhcmFjdGVyc1wiLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHBhdGhuYW1lID0gcGF0aG5hbWUucmVwbGFjZShmb3J3YXJkU2xhc2hSZWdFeCwgXCJcXFxcXCIpO1xuICBwYXRobmFtZSA9IGRlY29kZVVSSUNvbXBvbmVudChwYXRobmFtZSk7XG4gIGlmIChob3N0bmFtZSAhPT0gXCJcIikge1xuICAgIC8vIFRPRE8oYmFydGxvbWllanUpOiBhZGQgc3VwcG9ydCBmb3IgcHVueWNvZGUgZW5jb2RpbmdzXG4gICAgcmV0dXJuIGBcXFxcXFxcXCR7aG9zdG5hbWV9JHtwYXRobmFtZX1gO1xuICB9IGVsc2Uge1xuICAgIC8vIE90aGVyd2lzZSwgaXQncyBhIGxvY2FsIHBhdGggdGhhdCByZXF1aXJlcyBhIGRyaXZlIGxldHRlclxuICAgIGNvbnN0IGxldHRlciA9IHBhdGhuYW1lLmNvZGVQb2ludEF0KDEpISB8IDB4MjA7XG4gICAgY29uc3Qgc2VwID0gcGF0aG5hbWVbMl07XG4gICAgaWYgKFxuICAgICAgbGV0dGVyIDwgQ0hBUl9MT1dFUkNBU0VfQSB8fFxuICAgICAgbGV0dGVyID4gQ0hBUl9MT1dFUkNBU0VfWiB8fCAvLyBhLi56IEEuLlpcbiAgICAgIHNlcCAhPT0gXCI6XCJcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFUlJfSU5WQUxJRF9GSUxFX1VSTF9QQVRIKFwibXVzdCBiZSBhYnNvbHV0ZVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGhuYW1lLnNsaWNlKDEpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFBhdGhGcm9tVVJMUG9zaXgodXJsOiBVUkwpOiBzdHJpbmcge1xuICBpZiAodXJsLmhvc3RuYW1lICE9PSBcIlwiKSB7XG4gICAgdGhyb3cgbmV3IEVSUl9JTlZBTElEX0ZJTEVfVVJMX0hPU1Qob3NUeXBlKTtcbiAgfVxuICBjb25zdCBwYXRobmFtZSA9IHVybC5wYXRobmFtZTtcbiAgZm9yIChsZXQgbiA9IDA7IG4gPCBwYXRobmFtZS5sZW5ndGg7IG4rKykge1xuICAgIGlmIChwYXRobmFtZVtuXSA9PT0gXCIlXCIpIHtcbiAgICAgIGNvbnN0IHRoaXJkID0gcGF0aG5hbWUuY29kZVBvaW50QXQobiArIDIpISB8IDB4MjA7XG4gICAgICBpZiAocGF0aG5hbWVbbiArIDFdID09PSBcIjJcIiAmJiB0aGlyZCA9PT0gMTAyKSB7XG4gICAgICAgIHRocm93IG5ldyBFUlJfSU5WQUxJRF9GSUxFX1VSTF9QQVRIKFxuICAgICAgICAgIFwibXVzdCBub3QgaW5jbHVkZSBlbmNvZGVkIC8gY2hhcmFjdGVyc1wiLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHBhdGhuYW1lKTtcbn1cblxuLyoqXG4gKiAgVGhlIGZvbGxvd2luZyBjaGFyYWN0ZXJzIGFyZSBwZXJjZW50LWVuY29kZWQgd2hlbiBjb252ZXJ0aW5nIGZyb20gZmlsZSBwYXRoXG4gKiAgdG8gVVJMOlxuICogIC0gJTogVGhlIHBlcmNlbnQgY2hhcmFjdGVyIGlzIHRoZSBvbmx5IGNoYXJhY3RlciBub3QgZW5jb2RlZCBieSB0aGVcbiAqICAgICAgIGBwYXRobmFtZWAgc2V0dGVyLlxuICogIC0gXFw6IEJhY2tzbGFzaCBpcyBlbmNvZGVkIG9uIG5vbi13aW5kb3dzIHBsYXRmb3JtcyBzaW5jZSBpdCdzIGEgdmFsaWRcbiAqICAgICAgIGNoYXJhY3RlciBidXQgdGhlIGBwYXRobmFtZWAgc2V0dGVycyByZXBsYWNlcyBpdCBieSBhIGZvcndhcmQgc2xhc2guXG4gKiAgLSBMRjogVGhlIG5ld2xpbmUgY2hhcmFjdGVyIGlzIHN0cmlwcGVkIG91dCBieSB0aGUgYHBhdGhuYW1lYCBzZXR0ZXIuXG4gKiAgICAgICAgKFNlZSB3aGF0d2cvdXJsIzQxOSlcbiAqICAtIENSOiBUaGUgY2FycmlhZ2UgcmV0dXJuIGNoYXJhY3RlciBpcyBhbHNvIHN0cmlwcGVkIG91dCBieSB0aGUgYHBhdGhuYW1lYFxuICogICAgICAgIHNldHRlci5cbiAqICAtIFRBQjogVGhlIHRhYiBjaGFyYWN0ZXIgaXMgYWxzbyBzdHJpcHBlZCBvdXQgYnkgdGhlIGBwYXRobmFtZWAgc2V0dGVyLlxuICovXG5mdW5jdGlvbiBlbmNvZGVQYXRoQ2hhcnMoZmlsZXBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChmaWxlcGF0aC5pbmNsdWRlcyhcIiVcIikpIHtcbiAgICBmaWxlcGF0aCA9IGZpbGVwYXRoLnJlcGxhY2UocGVyY2VudFJlZ0V4LCBcIiUyNVwiKTtcbiAgfVxuICAvLyBJbiBwb3NpeCwgYmFja3NsYXNoIGlzIGEgdmFsaWQgY2hhcmFjdGVyIGluIHBhdGhzOlxuICBpZiAoIWlzV2luZG93cyAmJiBmaWxlcGF0aC5pbmNsdWRlcyhcIlxcXFxcIikpIHtcbiAgICBmaWxlcGF0aCA9IGZpbGVwYXRoLnJlcGxhY2UoYmFja3NsYXNoUmVnRXgsIFwiJTVDXCIpO1xuICB9XG4gIGlmIChmaWxlcGF0aC5pbmNsdWRlcyhcIlxcblwiKSkge1xuICAgIGZpbGVwYXRoID0gZmlsZXBhdGgucmVwbGFjZShuZXdsaW5lUmVnRXgsIFwiJTBBXCIpO1xuICB9XG4gIGlmIChmaWxlcGF0aC5pbmNsdWRlcyhcIlxcclwiKSkge1xuICAgIGZpbGVwYXRoID0gZmlsZXBhdGgucmVwbGFjZShjYXJyaWFnZVJldHVyblJlZ0V4LCBcIiUwRFwiKTtcbiAgfVxuICBpZiAoZmlsZXBhdGguaW5jbHVkZXMoXCJcXHRcIikpIHtcbiAgICBmaWxlcGF0aCA9IGZpbGVwYXRoLnJlcGxhY2UodGFiUmVnRXgsIFwiJTA5XCIpO1xuICB9XG4gIHJldHVybiBmaWxlcGF0aDtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIGVuc3VyZXMgdGhhdCBgZmlsZXBhdGhgIGlzIHJlc29sdmVkIGFic29sdXRlbHksIGFuZCB0aGF0IHRoZSBVUkwgY29udHJvbCBjaGFyYWN0ZXJzIGFyZSBjb3JyZWN0bHkgZW5jb2RlZCB3aGVuIGNvbnZlcnRpbmcgaW50byBhIEZpbGUgVVJMLlxuICogQHNlZSBUZXN0ZWQgaW4gYHBhcmFsbGVsL3Rlc3QtdXJsLXBhdGh0b2ZpbGV1cmwuanNgLlxuICogQHBhcmFtIGZpbGVwYXRoIFRoZSBmaWxlIHBhdGggc3RyaW5nIHRvIGNvbnZlcnQgdG8gYSBmaWxlIFVSTC5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIFVSTCBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9GaWxlVVJMKGZpbGVwYXRoOiBzdHJpbmcpOiBVUkwge1xuICBjb25zdCBvdXRVUkwgPSBuZXcgVVJMKFwiZmlsZTovL1wiKTtcbiAgaWYgKGlzV2luZG93cyAmJiBmaWxlcGF0aC5zdGFydHNXaXRoKFwiXFxcXFxcXFxcIikpIHtcbiAgICAvLyBVTkMgcGF0aCBmb3JtYXQ6IFxcXFxzZXJ2ZXJcXHNoYXJlXFxyZXNvdXJjZVxuICAgIGNvbnN0IHBhdGhzID0gZmlsZXBhdGguc3BsaXQoXCJcXFxcXCIpO1xuICAgIGlmIChwYXRocy5sZW5ndGggPD0gMykge1xuICAgICAgdGhyb3cgbmV3IEVSUl9JTlZBTElEX0FSR19WQUxVRShcbiAgICAgICAgXCJmaWxlcGF0aFwiLFxuICAgICAgICBmaWxlcGF0aCxcbiAgICAgICAgXCJNaXNzaW5nIFVOQyByZXNvdXJjZSBwYXRoXCIsXG4gICAgICApO1xuICAgIH1cbiAgICBjb25zdCBob3N0bmFtZSA9IHBhdGhzWzJdO1xuICAgIGlmIChob3N0bmFtZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFUlJfSU5WQUxJRF9BUkdfVkFMVUUoXG4gICAgICAgIFwiZmlsZXBhdGhcIixcbiAgICAgICAgZmlsZXBhdGgsXG4gICAgICAgIFwiRW1wdHkgVU5DIHNlcnZlcm5hbWVcIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyh3YWZ1d2FmdTEzKTogVG8gYmUgYG91dFVSTC5ob3N0bmFtZSA9IGRvbWFpblRvQVNDSUkoaG9zdG5hbWUpYCBvbmNlIGBkb21haW5Ub0FTQ0lJYCBhcmUgaW1wbGVtZW50ZWRcbiAgICBvdXRVUkwuaG9zdG5hbWUgPSBob3N0bmFtZTtcbiAgICBvdXRVUkwucGF0aG5hbWUgPSBlbmNvZGVQYXRoQ2hhcnMoXG4gICAgICBwYXRocy5zbGljZSgzKS5qb2luKFwiL1wiKSxcbiAgICApO1xuICB9IGVsc2Uge1xuICAgIGxldCByZXNvbHZlZCA9IHBhdGgucmVzb2x2ZShmaWxlcGF0aCk7XG4gICAgLy8gcGF0aC5yZXNvbHZlIHN0cmlwcyB0cmFpbGluZyBzbGFzaGVzIHNvIHdlIG11c3QgYWRkIHRoZW0gYmFja1xuICAgIGNvbnN0IGZpbGVQYXRoTGFzdCA9IGZpbGVwYXRoLmNoYXJDb2RlQXQoZmlsZXBhdGgubGVuZ3RoIC0gMSk7XG4gICAgaWYgKFxuICAgICAgKGZpbGVQYXRoTGFzdCA9PT0gQ0hBUl9GT1JXQVJEX1NMQVNIIHx8XG4gICAgICAgIChpc1dpbmRvd3MgJiYgZmlsZVBhdGhMYXN0ID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIKSkgJiZcbiAgICAgIHJlc29sdmVkW3Jlc29sdmVkLmxlbmd0aCAtIDFdICE9PSBwYXRoLnNlcFxuICAgICkge1xuICAgICAgcmVzb2x2ZWQgKz0gXCIvXCI7XG4gICAgfVxuXG4gICAgb3V0VVJMLnBhdGhuYW1lID0gZW5jb2RlUGF0aENoYXJzKHJlc29sdmVkKTtcbiAgfVxuICByZXR1cm4gb3V0VVJMO1xufVxuXG5pbnRlcmZhY2UgSHR0cE9wdGlvbnMge1xuICBwcm90b2NvbDogc3RyaW5nO1xuICBob3N0bmFtZTogc3RyaW5nO1xuICBoYXNoOiBzdHJpbmc7XG4gIHNlYXJjaDogc3RyaW5nO1xuICBwYXRobmFtZTogc3RyaW5nO1xuICBwYXRoOiBzdHJpbmc7XG4gIGhyZWY6IHN0cmluZztcbiAgcG9ydD86IG51bWJlcjtcbiAgYXV0aD86IHN0cmluZztcbn1cblxuLyoqXG4gKiBUaGlzIHV0aWxpdHkgZnVuY3Rpb24gY29udmVydHMgYSBVUkwgb2JqZWN0IGludG8gYW4gb3JkaW5hcnkgb3B0aW9ucyBvYmplY3QgYXMgZXhwZWN0ZWQgYnkgdGhlIGBodHRwLnJlcXVlc3QoKWAgYW5kIGBodHRwcy5yZXF1ZXN0KClgIEFQSXMuXG4gKiBAc2VlIFRlc3RlZCBpbiBgcGFyYWxsZWwvdGVzdC11cmwtdXJsdG9vcHRpb25zLmpzYC5cbiAqIEBwYXJhbSB1cmwgVGhlIGBXSEFUV0cgVVJMYCBvYmplY3QgdG8gY29udmVydCB0byBhbiBvcHRpb25zIG9iamVjdC5cbiAqIEByZXR1cm5zIEh0dHBPcHRpb25zXG4gKiBAcmV0dXJucyBIdHRwT3B0aW9ucy5wcm90b2NvbCBQcm90b2NvbCB0byB1c2UuXG4gKiBAcmV0dXJucyBIdHRwT3B0aW9ucy5ob3N0bmFtZSBBIGRvbWFpbiBuYW1lIG9yIElQIGFkZHJlc3Mgb2YgdGhlIHNlcnZlciB0byBpc3N1ZSB0aGUgcmVxdWVzdCB0by5cbiAqIEByZXR1cm5zIEh0dHBPcHRpb25zLmhhc2ggVGhlIGZyYWdtZW50IHBvcnRpb24gb2YgdGhlIFVSTC5cbiAqIEByZXR1cm5zIEh0dHBPcHRpb25zLnNlYXJjaCBUaGUgc2VyaWFsaXplZCBxdWVyeSBwb3J0aW9uIG9mIHRoZSBVUkwuXG4gKiBAcmV0dXJucyBIdHRwT3B0aW9ucy5wYXRobmFtZSBUaGUgcGF0aCBwb3J0aW9uIG9mIHRoZSBVUkwuXG4gKiBAcmV0dXJucyBIdHRwT3B0aW9ucy5wYXRoIFJlcXVlc3QgcGF0aC4gU2hvdWxkIGluY2x1ZGUgcXVlcnkgc3RyaW5nIGlmIGFueS4gRS5HLiBgJy9pbmRleC5odG1sP3BhZ2U9MTInYC4gQW4gZXhjZXB0aW9uIGlzIHRocm93biB3aGVuIHRoZSByZXF1ZXN0IHBhdGggY29udGFpbnMgaWxsZWdhbCBjaGFyYWN0ZXJzLiBDdXJyZW50bHksIG9ubHkgc3BhY2VzIGFyZSByZWplY3RlZCBidXQgdGhhdCBtYXkgY2hhbmdlIGluIHRoZSBmdXR1cmUuXG4gKiBAcmV0dXJucyBIdHRwT3B0aW9ucy5ocmVmIFRoZSBzZXJpYWxpemVkIFVSTC5cbiAqIEByZXR1cm5zIEh0dHBPcHRpb25zLnBvcnQgUG9ydCBvZiByZW1vdGUgc2VydmVyLlxuICogQHJldHVybnMgSHR0cE9wdGlvbnMuYXV0aCBCYXNpYyBhdXRoZW50aWNhdGlvbiBpLmUuIGAndXNlcjpwYXNzd29yZCdgIHRvIGNvbXB1dGUgYW4gQXV0aG9yaXphdGlvbiBoZWFkZXIuXG4gKi9cbmZ1bmN0aW9uIHVybFRvSHR0cE9wdGlvbnModXJsOiBVUkwpOiBIdHRwT3B0aW9ucyB7XG4gIGNvbnN0IG9wdGlvbnM6IEh0dHBPcHRpb25zID0ge1xuICAgIHByb3RvY29sOiB1cmwucHJvdG9jb2wsXG4gICAgaG9zdG5hbWU6IHR5cGVvZiB1cmwuaG9zdG5hbWUgPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgdXJsLmhvc3RuYW1lLnN0YXJ0c1dpdGgoXCJbXCIpXG4gICAgICA/IHVybC5ob3N0bmFtZS5zbGljZSgxLCAtMSlcbiAgICAgIDogdXJsLmhvc3RuYW1lLFxuICAgIGhhc2g6IHVybC5oYXNoLFxuICAgIHNlYXJjaDogdXJsLnNlYXJjaCxcbiAgICBwYXRobmFtZTogdXJsLnBhdGhuYW1lLFxuICAgIHBhdGg6IGAke3VybC5wYXRobmFtZSB8fCBcIlwifSR7dXJsLnNlYXJjaCB8fCBcIlwifWAsXG4gICAgaHJlZjogdXJsLmhyZWYsXG4gIH07XG4gIGlmICh1cmwucG9ydCAhPT0gXCJcIikge1xuICAgIG9wdGlvbnMucG9ydCA9IE51bWJlcih1cmwucG9ydCk7XG4gIH1cbiAgaWYgKHVybC51c2VybmFtZSB8fCB1cmwucGFzc3dvcmQpIHtcbiAgICBvcHRpb25zLmF1dGggPSBgJHtkZWNvZGVVUklDb21wb25lbnQodXJsLnVzZXJuYW1lKX06JHtcbiAgICAgIGRlY29kZVVSSUNvbXBvbmVudCh1cmwucGFzc3dvcmQpXG4gICAgfWA7XG4gIH1cbiAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgZm9ybWF0LFxuICBmaWxlVVJMVG9QYXRoLFxuICBwYXRoVG9GaWxl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