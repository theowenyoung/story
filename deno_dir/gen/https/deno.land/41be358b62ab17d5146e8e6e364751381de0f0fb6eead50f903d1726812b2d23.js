// Copyright Node.js contributors. All rights reserved. MIT License.
/** ********** NOT IMPLEMENTED
 * ERR_MANIFEST_ASSERT_INTEGRITY
 * ERR_QUICSESSION_VERSION_NEGOTIATION
 * ERR_REQUIRE_ESM
 * ERR_TLS_CERT_ALTNAME_INVALID
 * ERR_WORKER_INVALID_EXEC_ARGV
 * ERR_WORKER_PATH
 * ERR_QUIC_ERROR
 * ERR_SOCKET_BUFFER_SIZE //System error, shouldn't ever happen inside Deno
 * ERR_SYSTEM_ERROR //System error, shouldn't ever happen inside Deno
 * ERR_TTY_INIT_FAILED //System error, shouldn't ever happen inside Deno
 * ERR_INVALID_PACKAGE_CONFIG // package.json stuff, probably useless
 * *********** */ import { getSystemErrorName, inspect } from "./util.ts";
import { codeMap, errorMap } from "./internal_binding/uv.ts";
import { assert } from "../_util/assert.ts";
import { fileURLToPath } from "./url.ts";
export { errorMap };
/**
 * @see https://github.com/nodejs/node/blob/f3eb224/lib/internal/errors.js
 */ const classRegExp = /^([A-Z][a-z0-9]*)+$/;
/**
 * @see https://github.com/nodejs/node/blob/f3eb224/lib/internal/errors.js
 * @description Sorted by a rough estimate on most frequently used entries.
 */ const kTypes = [
    "string",
    "function",
    "number",
    "object",
    // Accept 'Function' and 'Object' as alternative to the lower cased version.
    "Function",
    "Object",
    "boolean",
    "bigint",
    "symbol", 
];
const nodeInternalPrefix = "__node_internal_";
/** This function removes unnecessary frames from Node.js core errors. */ export function hideStackFrames(fn) {
    // We rename the functions that will be hidden to cut off the stacktrace
    // at the outermost one.
    const hidden = nodeInternalPrefix + fn.name;
    Object.defineProperty(fn, "name", {
        value: hidden
    });
    return fn;
}
const captureLargerStackTrace = hideStackFrames(function captureLargerStackTrace(err) {
    // @ts-ignore this function is not available in lib.dom.d.ts
    Error.captureStackTrace(err);
    return err;
});
/**
 * This creates an error compatible with errors produced in the C++
 * This function should replace the deprecated
 * `exceptionWithHostPort()` function.
 *
 * @param err A libuv error number
 * @param syscall
 * @param address
 * @param port
 * @return The error.
 */ export const uvExceptionWithHostPort = hideStackFrames(function uvExceptionWithHostPort(err, syscall, address, port) {
    const { 0: code , 1: uvmsg  } = uvErrmapGet(err) || uvUnmappedError;
    const message = `${syscall} ${code}: ${uvmsg}`;
    let details = "";
    if (port && port > 0) {
        details = ` ${address}:${port}`;
    } else if (address) {
        details = ` ${address}`;
    }
    // deno-lint-ignore no-explicit-any
    const ex = new Error(`${message}${details}`);
    ex.code = code;
    ex.errno = err;
    ex.syscall = syscall;
    ex.address = address;
    if (port) {
        ex.port = port;
    }
    return captureLargerStackTrace(ex);
});
/**
 * This used to be `util._errnoException()`.
 *
 * @param err A libuv error number
 * @param syscall
 * @param original
 * @return A `ErrnoException`
 */ export const errnoException = hideStackFrames(function errnoException(err, syscall, original) {
    const code = getSystemErrorName(err);
    const message = original ? `${syscall} ${code} ${original}` : `${syscall} ${code}`;
    // deno-lint-ignore no-explicit-any
    const ex = new Error(message);
    ex.errno = err;
    ex.code = code;
    ex.syscall = syscall;
    return captureLargerStackTrace(ex);
});
function uvErrmapGet(name) {
    return errorMap.get(name);
}
const uvUnmappedError = [
    "UNKNOWN",
    "unknown error"
];
/**
 * This creates an error compatible with errors produced in the C++
 * function UVException using a context object with data assembled in C++.
 * The goal is to migrate them to ERR_* errors later when compatibility is
 * not a concern.
 *
 * @param ctx
 * @return The error.
 */ export const uvException = hideStackFrames(function uvException(ctx) {
    const { 0: code , 1: uvmsg  } = uvErrmapGet(ctx.errno) || uvUnmappedError;
    let message = `${code}: ${ctx.message || uvmsg}, ${ctx.syscall}`;
    let path;
    let dest;
    if (ctx.path) {
        path = ctx.path.toString();
        message += ` '${path}'`;
    }
    if (ctx.dest) {
        dest = ctx.dest.toString();
        message += ` -> '${dest}'`;
    }
    // deno-lint-ignore no-explicit-any
    const err = new Error(message);
    for (const prop of Object.keys(ctx)){
        if (prop === "message" || prop === "path" || prop === "dest") {
            continue;
        }
        err[prop] = ctx[prop];
    }
    err.code = code;
    if (path) {
        err.path = path;
    }
    if (dest) {
        err.dest = dest;
    }
    return captureLargerStackTrace(err);
});
/**
 * Deprecated, new function is `uvExceptionWithHostPort()`
 * New function added the error description directly
 * from C++. this method for backwards compatibility
 * @param err A libuv error number
 * @param syscall
 * @param address
 * @param port
 * @param additional
 */ export const exceptionWithHostPort = hideStackFrames(function exceptionWithHostPort(err, syscall, address, port, additional) {
    const code = getSystemErrorName(err);
    let details = "";
    if (port && port > 0) {
        details = ` ${address}:${port}`;
    } else if (address) {
        details = ` ${address}`;
    }
    if (additional) {
        details += ` - Local (${additional})`;
    }
    // deno-lint-ignore no-explicit-any
    const ex = new Error(`${syscall} ${code}${details}`);
    ex.errno = err;
    ex.code = code;
    ex.syscall = syscall;
    ex.address = address;
    if (port) {
        ex.port = port;
    }
    return captureLargerStackTrace(ex);
});
/**
 * @param code A libuv error number or a c-ares error code
 * @param syscall
 * @param hostname
 */ export const dnsException = hideStackFrames(function(code, syscall, hostname) {
    let errno;
    // If `code` is of type number, it is a libuv error number, else it is a
    // c-ares error code.
    if (typeof code === "number") {
        errno = code;
        // ENOTFOUND is not a proper POSIX error, but this error has been in place
        // long enough that it's not practical to remove it.
        if (code === codeMap.get("EAI_NODATA") || code === codeMap.get("EAI_NONAME")) {
            code = "ENOTFOUND"; // Fabricated error name.
        } else {
            code = getSystemErrorName(code);
        }
    }
    const message = `${syscall} ${code}${hostname ? ` ${hostname}` : ""}`;
    // deno-lint-ignore no-explicit-any
    const ex = new Error(message);
    ex.errno = errno;
    ex.code = code;
    ex.syscall = syscall;
    if (hostname) {
        ex.hostname = hostname;
    }
    return captureLargerStackTrace(ex);
});
/**
 * All error instances in Node have additional methods and properties
 * This export class is meant to be extended by these instances abstracting native JS error instances
 */ export class NodeErrorAbstraction extends Error {
    code;
    constructor(name, code, message){
        super(message);
        this.code = code;
        this.name = name;
        //This number changes depending on the name of this class
        //20 characters as of now
        this.stack = this.stack && `${name} [${this.code}]${this.stack.slice(20)}`;
    }
    toString() {
        return `${this.name} [${this.code}]: ${this.message}`;
    }
}
export class NodeError extends NodeErrorAbstraction {
    constructor(code, message){
        super(Error.prototype.name, code, message);
    }
}
export class NodeSyntaxError extends NodeErrorAbstraction {
    constructor(code, message){
        super(SyntaxError.prototype.name, code, message);
        Object.setPrototypeOf(this, SyntaxError.prototype);
        this.toString = function() {
            return `${this.name} [${this.code}]: ${this.message}`;
        };
    }
}
export class NodeRangeError extends NodeErrorAbstraction {
    constructor(code, message){
        super(RangeError.prototype.name, code, message);
        Object.setPrototypeOf(this, RangeError.prototype);
        this.toString = function() {
            return `${this.name} [${this.code}]: ${this.message}`;
        };
    }
}
export class NodeTypeError extends NodeErrorAbstraction {
    constructor(code, message){
        super(TypeError.prototype.name, code, message);
        Object.setPrototypeOf(this, TypeError.prototype);
        this.toString = function() {
            return `${this.name} [${this.code}]: ${this.message}`;
        };
    }
}
export class NodeURIError extends NodeErrorAbstraction {
    constructor(code, message){
        super(URIError.prototype.name, code, message);
        Object.setPrototypeOf(this, URIError.prototype);
        this.toString = function() {
            return `${this.name} [${this.code}]: ${this.message}`;
        };
    }
}
export class ERR_INVALID_ARG_TYPE extends NodeTypeError {
    constructor(name, expected, actual){
        // https://github.com/nodejs/node/blob/f3eb224/lib/internal/errors.js#L1037-L1087
        expected = Array.isArray(expected) ? expected : [
            expected
        ];
        let msg = "The ";
        if (name.endsWith(" argument")) {
            // For cases like 'first argument'
            msg += `${name} `;
        } else {
            const type = name.includes(".") ? "property" : "argument";
            msg += `"${name}" ${type} `;
        }
        msg += "must be ";
        const types = [];
        const instances = [];
        const other = [];
        for (const value of expected){
            if (kTypes.includes(value)) {
                types.push(value.toLocaleLowerCase());
            } else if (classRegExp.test(value)) {
                instances.push(value);
            } else {
                other.push(value);
            }
        }
        // Special handle `object` in case other instances are allowed to outline
        // the differences between each other.
        if (instances.length > 0) {
            const pos = types.indexOf("object");
            if (pos !== -1) {
                types.splice(pos, 1);
                instances.push("Object");
            }
        }
        if (types.length > 0) {
            if (types.length > 2) {
                const last = types.pop();
                msg += `one of type ${types.join(", ")}, or ${last}`;
            } else if (types.length === 2) {
                msg += `one of type ${types[0]} or ${types[1]}`;
            } else {
                msg += `of type ${types[0]}`;
            }
            if (instances.length > 0 || other.length > 0) {
                msg += " or ";
            }
        }
        if (instances.length > 0) {
            if (instances.length > 2) {
                const last1 = instances.pop();
                msg += `an instance of ${instances.join(", ")}, or ${last1}`;
            } else {
                msg += `an instance of ${instances[0]}`;
                if (instances.length === 2) {
                    msg += ` or ${instances[1]}`;
                }
            }
            if (other.length > 0) {
                msg += " or ";
            }
        }
        if (other.length > 0) {
            if (other.length > 2) {
                const last2 = other.pop();
                msg += `one of ${other.join(", ")}, or ${last2}`;
            } else if (other.length === 2) {
                msg += `one of ${other[0]} or ${other[1]}`;
            } else {
                if (other[0].toLowerCase() !== other[0]) {
                    msg += "an ";
                }
                msg += `${other[0]}`;
            }
        }
        super("ERR_INVALID_ARG_TYPE", `${msg}.${invalidArgTypeHelper(actual)}`);
    }
}
export class ERR_INVALID_ARG_VALUE extends NodeTypeError {
    constructor(name, value, reason = "is invalid"){
        const type = name.includes(".") ? "property" : "argument";
        const inspected = inspect(value);
        super("ERR_INVALID_ARG_VALUE", `The ${type} '${name}' ${reason}. Received ${inspected}`);
    }
}
// A helper function to simplify checking for ERR_INVALID_ARG_TYPE output.
// deno-lint-ignore no-explicit-any
function invalidArgTypeHelper(input) {
    if (input == null) {
        return ` Received ${input}`;
    }
    if (typeof input === "function" && input.name) {
        return ` Received function ${input.name}`;
    }
    if (typeof input === "object") {
        if (input.constructor && input.constructor.name) {
            return ` Received an instance of ${input.constructor.name}`;
        }
        return ` Received ${inspect(input, {
            depth: -1
        })}`;
    }
    let inspected = inspect(input, {
        colors: false
    });
    if (inspected.length > 25) {
        inspected = `${inspected.slice(0, 25)}...`;
    }
    return ` Received type ${typeof input} (${inspected})`;
}
export class ERR_OUT_OF_RANGE extends RangeError {
    code = "ERR_OUT_OF_RANGE";
    constructor(str, range, received){
        super(`The value of "${str}" is out of range. It must be ${range}. Received ${received}`);
        const { name  } = this;
        // Add the error code to the name to include it in the stack trace.
        this.name = `${name} [${this.code}]`;
        // Access the stack to generate the error message including the error code from the name.
        this.stack;
        // Reset the name to the actual name.
        this.name = name;
    }
}
export class ERR_AMBIGUOUS_ARGUMENT extends NodeTypeError {
    constructor(x, y){
        super("ERR_AMBIGUOUS_ARGUMENT", `The "${x}" argument is ambiguous. ${y}`);
    }
}
export class ERR_ARG_NOT_ITERABLE extends NodeTypeError {
    constructor(x){
        super("ERR_ARG_NOT_ITERABLE", `${x} must be iterable`);
    }
}
export class ERR_ASSERTION extends NodeError {
    constructor(x){
        super("ERR_ASSERTION", `${x}`);
    }
}
export class ERR_ASYNC_CALLBACK extends NodeTypeError {
    constructor(x){
        super("ERR_ASYNC_CALLBACK", `${x} must be a function`);
    }
}
export class ERR_ASYNC_TYPE extends NodeTypeError {
    constructor(x){
        super("ERR_ASYNC_TYPE", `Invalid name for async "type": ${x}`);
    }
}
export class ERR_BROTLI_INVALID_PARAM extends NodeRangeError {
    constructor(x){
        super("ERR_BROTLI_INVALID_PARAM", `${x} is not a valid Brotli parameter`);
    }
}
export class ERR_BUFFER_OUT_OF_BOUNDS extends NodeRangeError {
    constructor(name){
        super("ERR_BUFFER_OUT_OF_BOUNDS", name ? `"${name}" is outside of buffer bounds` : "Attempt to access memory outside buffer bounds");
    }
}
export class ERR_BUFFER_TOO_LARGE extends NodeRangeError {
    constructor(x){
        super("ERR_BUFFER_TOO_LARGE", `Cannot create a Buffer larger than ${x} bytes`);
    }
}
export class ERR_CANNOT_WATCH_SIGINT extends NodeError {
    constructor(){
        super("ERR_CANNOT_WATCH_SIGINT", "Cannot watch for SIGINT signals");
    }
}
export class ERR_CHILD_CLOSED_BEFORE_REPLY extends NodeError {
    constructor(){
        super("ERR_CHILD_CLOSED_BEFORE_REPLY", "Child closed before reply received");
    }
}
export class ERR_CHILD_PROCESS_IPC_REQUIRED extends NodeError {
    constructor(x){
        super("ERR_CHILD_PROCESS_IPC_REQUIRED", `Forked processes must have an IPC channel, missing value 'ipc' in ${x}`);
    }
}
export class ERR_CHILD_PROCESS_STDIO_MAXBUFFER extends NodeRangeError {
    constructor(x){
        super("ERR_CHILD_PROCESS_STDIO_MAXBUFFER", `${x} maxBuffer length exceeded`);
    }
}
export class ERR_CONSOLE_WRITABLE_STREAM extends NodeTypeError {
    constructor(x){
        super("ERR_CONSOLE_WRITABLE_STREAM", `Console expects a writable stream instance for ${x}`);
    }
}
export class ERR_CONTEXT_NOT_INITIALIZED extends NodeError {
    constructor(){
        super("ERR_CONTEXT_NOT_INITIALIZED", "context used is not initialized");
    }
}
export class ERR_CPU_USAGE extends NodeError {
    constructor(x){
        super("ERR_CPU_USAGE", `Unable to obtain cpu usage ${x}`);
    }
}
export class ERR_CRYPTO_CUSTOM_ENGINE_NOT_SUPPORTED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_CUSTOM_ENGINE_NOT_SUPPORTED", "Custom engines not supported by this OpenSSL");
    }
}
export class ERR_CRYPTO_ECDH_INVALID_FORMAT extends NodeTypeError {
    constructor(x){
        super("ERR_CRYPTO_ECDH_INVALID_FORMAT", `Invalid ECDH format: ${x}`);
    }
}
export class ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY extends NodeError {
    constructor(){
        super("ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY", "Public key is not valid for specified curve");
    }
}
export class ERR_CRYPTO_ENGINE_UNKNOWN extends NodeError {
    constructor(x){
        super("ERR_CRYPTO_ENGINE_UNKNOWN", `Engine "${x}" was not found`);
    }
}
export class ERR_CRYPTO_FIPS_FORCED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_FIPS_FORCED", "Cannot set FIPS mode, it was forced with --force-fips at startup.");
    }
}
export class ERR_CRYPTO_FIPS_UNAVAILABLE extends NodeError {
    constructor(){
        super("ERR_CRYPTO_FIPS_UNAVAILABLE", "Cannot set FIPS mode in a non-FIPS build.");
    }
}
export class ERR_CRYPTO_HASH_FINALIZED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_HASH_FINALIZED", "Digest already called");
    }
}
export class ERR_CRYPTO_HASH_UPDATE_FAILED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_HASH_UPDATE_FAILED", "Hash update failed");
    }
}
export class ERR_CRYPTO_INCOMPATIBLE_KEY extends NodeError {
    constructor(x, y){
        super("ERR_CRYPTO_INCOMPATIBLE_KEY", `Incompatible ${x}: ${y}`);
    }
}
export class ERR_CRYPTO_INCOMPATIBLE_KEY_OPTIONS extends NodeError {
    constructor(x, y){
        super("ERR_CRYPTO_INCOMPATIBLE_KEY_OPTIONS", `The selected key encoding ${x} ${y}.`);
    }
}
export class ERR_CRYPTO_INVALID_DIGEST extends NodeTypeError {
    constructor(x){
        super("ERR_CRYPTO_INVALID_DIGEST", `Invalid digest: ${x}`);
    }
}
export class ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE extends NodeTypeError {
    constructor(x, y){
        super("ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE", `Invalid key object type ${x}, expected ${y}.`);
    }
}
export class ERR_CRYPTO_INVALID_STATE extends NodeError {
    constructor(x){
        super("ERR_CRYPTO_INVALID_STATE", `Invalid state for operation ${x}`);
    }
}
export class ERR_CRYPTO_PBKDF2_ERROR extends NodeError {
    constructor(){
        super("ERR_CRYPTO_PBKDF2_ERROR", "PBKDF2 error");
    }
}
export class ERR_CRYPTO_SCRYPT_INVALID_PARAMETER extends NodeError {
    constructor(){
        super("ERR_CRYPTO_SCRYPT_INVALID_PARAMETER", "Invalid scrypt parameter");
    }
}
export class ERR_CRYPTO_SCRYPT_NOT_SUPPORTED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_SCRYPT_NOT_SUPPORTED", "Scrypt algorithm not supported");
    }
}
export class ERR_CRYPTO_SIGN_KEY_REQUIRED extends NodeError {
    constructor(){
        super("ERR_CRYPTO_SIGN_KEY_REQUIRED", "No key provided to sign");
    }
}
export class ERR_DIR_CLOSED extends NodeError {
    constructor(){
        super("ERR_DIR_CLOSED", "Directory handle was closed");
    }
}
export class ERR_DIR_CONCURRENT_OPERATION extends NodeError {
    constructor(){
        super("ERR_DIR_CONCURRENT_OPERATION", "Cannot do synchronous work on directory handle with concurrent asynchronous operations");
    }
}
export class ERR_DNS_SET_SERVERS_FAILED extends NodeError {
    constructor(x, y){
        super("ERR_DNS_SET_SERVERS_FAILED", `c-ares failed to set servers: "${x}" [${y}]`);
    }
}
export class ERR_DOMAIN_CALLBACK_NOT_AVAILABLE extends NodeError {
    constructor(){
        super("ERR_DOMAIN_CALLBACK_NOT_AVAILABLE", "A callback was registered through " + "process.setUncaughtExceptionCaptureCallback(), which is mutually " + "exclusive with using the `domain` module");
    }
}
export class ERR_DOMAIN_CANNOT_SET_UNCAUGHT_EXCEPTION_CAPTURE extends NodeError {
    constructor(){
        super("ERR_DOMAIN_CANNOT_SET_UNCAUGHT_EXCEPTION_CAPTURE", "The `domain` module is in use, which is mutually exclusive with calling " + "process.setUncaughtExceptionCaptureCallback()");
    }
}
export class ERR_ENCODING_INVALID_ENCODED_DATA extends NodeErrorAbstraction {
    errno;
    constructor(encoding, ret){
        super(TypeError.prototype.name, "ERR_ENCODING_INVALID_ENCODED_DATA", `The encoded data was not valid for encoding ${encoding}`);
        Object.setPrototypeOf(this, TypeError.prototype);
        this.errno = ret;
    }
}
export class ERR_ENCODING_NOT_SUPPORTED extends NodeRangeError {
    constructor(x){
        super("ERR_ENCODING_NOT_SUPPORTED", `The "${x}" encoding is not supported`);
    }
}
export class ERR_EVAL_ESM_CANNOT_PRINT extends NodeError {
    constructor(){
        super("ERR_EVAL_ESM_CANNOT_PRINT", `--print cannot be used with ESM input`);
    }
}
export class ERR_EVENT_RECURSION extends NodeError {
    constructor(x){
        super("ERR_EVENT_RECURSION", `The event "${x}" is already being dispatched`);
    }
}
export class ERR_FEATURE_UNAVAILABLE_ON_PLATFORM extends NodeTypeError {
    constructor(x){
        super("ERR_FEATURE_UNAVAILABLE_ON_PLATFORM", `The feature ${x} is unavailable on the current platform, which is being used to run Node.js`);
    }
}
export class ERR_FS_FILE_TOO_LARGE extends NodeRangeError {
    constructor(x){
        super("ERR_FS_FILE_TOO_LARGE", `File size (${x}) is greater than 2 GB`);
    }
}
export class ERR_FS_INVALID_SYMLINK_TYPE extends NodeError {
    constructor(x){
        super("ERR_FS_INVALID_SYMLINK_TYPE", `Symlink type must be one of "dir", "file", or "junction". Received "${x}"`);
    }
}
export class ERR_HTTP2_ALTSVC_INVALID_ORIGIN extends NodeTypeError {
    constructor(){
        super("ERR_HTTP2_ALTSVC_INVALID_ORIGIN", `HTTP/2 ALTSVC frames require a valid origin`);
    }
}
export class ERR_HTTP2_ALTSVC_LENGTH extends NodeTypeError {
    constructor(){
        super("ERR_HTTP2_ALTSVC_LENGTH", `HTTP/2 ALTSVC frames are limited to 16382 bytes`);
    }
}
export class ERR_HTTP2_CONNECT_AUTHORITY extends NodeError {
    constructor(){
        super("ERR_HTTP2_CONNECT_AUTHORITY", `:authority header is required for CONNECT requests`);
    }
}
export class ERR_HTTP2_CONNECT_PATH extends NodeError {
    constructor(){
        super("ERR_HTTP2_CONNECT_PATH", `The :path header is forbidden for CONNECT requests`);
    }
}
export class ERR_HTTP2_CONNECT_SCHEME extends NodeError {
    constructor(){
        super("ERR_HTTP2_CONNECT_SCHEME", `The :scheme header is forbidden for CONNECT requests`);
    }
}
export class ERR_HTTP2_GOAWAY_SESSION extends NodeError {
    constructor(){
        super("ERR_HTTP2_GOAWAY_SESSION", `New streams cannot be created after receiving a GOAWAY`);
    }
}
export class ERR_HTTP2_HEADERS_AFTER_RESPOND extends NodeError {
    constructor(){
        super("ERR_HTTP2_HEADERS_AFTER_RESPOND", `Cannot specify additional headers after response initiated`);
    }
}
export class ERR_HTTP2_HEADERS_SENT extends NodeError {
    constructor(){
        super("ERR_HTTP2_HEADERS_SENT", `Response has already been initiated.`);
    }
}
export class ERR_HTTP2_HEADER_SINGLE_VALUE extends NodeTypeError {
    constructor(x){
        super("ERR_HTTP2_HEADER_SINGLE_VALUE", `Header field "${x}" must only have a single value`);
    }
}
export class ERR_HTTP2_INFO_STATUS_NOT_ALLOWED extends NodeRangeError {
    constructor(){
        super("ERR_HTTP2_INFO_STATUS_NOT_ALLOWED", `Informational status codes cannot be used`);
    }
}
export class ERR_HTTP2_INVALID_CONNECTION_HEADERS extends NodeTypeError {
    constructor(x){
        super("ERR_HTTP2_INVALID_CONNECTION_HEADERS", `HTTP/1 Connection specific headers are forbidden: "${x}"`);
    }
}
export class ERR_HTTP2_INVALID_HEADER_VALUE extends NodeTypeError {
    constructor(x, y){
        super("ERR_HTTP2_INVALID_HEADER_VALUE", `Invalid value "${x}" for header "${y}"`);
    }
}
export class ERR_HTTP2_INVALID_INFO_STATUS extends NodeRangeError {
    constructor(x){
        super("ERR_HTTP2_INVALID_INFO_STATUS", `Invalid informational status code: ${x}`);
    }
}
export class ERR_HTTP2_INVALID_ORIGIN extends NodeTypeError {
    constructor(){
        super("ERR_HTTP2_INVALID_ORIGIN", `HTTP/2 ORIGIN frames require a valid origin`);
    }
}
export class ERR_HTTP2_INVALID_PACKED_SETTINGS_LENGTH extends NodeRangeError {
    constructor(){
        super("ERR_HTTP2_INVALID_PACKED_SETTINGS_LENGTH", `Packed settings length must be a multiple of six`);
    }
}
export class ERR_HTTP2_INVALID_PSEUDOHEADER extends NodeTypeError {
    constructor(x){
        super("ERR_HTTP2_INVALID_PSEUDOHEADER", `"${x}" is an invalid pseudoheader or is used incorrectly`);
    }
}
export class ERR_HTTP2_INVALID_SESSION extends NodeError {
    constructor(){
        super("ERR_HTTP2_INVALID_SESSION", `The session has been destroyed`);
    }
}
export class ERR_HTTP2_INVALID_STREAM extends NodeError {
    constructor(){
        super("ERR_HTTP2_INVALID_STREAM", `The stream has been destroyed`);
    }
}
export class ERR_HTTP2_MAX_PENDING_SETTINGS_ACK extends NodeError {
    constructor(){
        super("ERR_HTTP2_MAX_PENDING_SETTINGS_ACK", `Maximum number of pending settings acknowledgements`);
    }
}
export class ERR_HTTP2_NESTED_PUSH extends NodeError {
    constructor(){
        super("ERR_HTTP2_NESTED_PUSH", `A push stream cannot initiate another push stream.`);
    }
}
export class ERR_HTTP2_NO_SOCKET_MANIPULATION extends NodeError {
    constructor(){
        super("ERR_HTTP2_NO_SOCKET_MANIPULATION", `HTTP/2 sockets should not be directly manipulated (e.g. read and written)`);
    }
}
export class ERR_HTTP2_ORIGIN_LENGTH extends NodeTypeError {
    constructor(){
        super("ERR_HTTP2_ORIGIN_LENGTH", `HTTP/2 ORIGIN frames are limited to 16382 bytes`);
    }
}
export class ERR_HTTP2_OUT_OF_STREAMS extends NodeError {
    constructor(){
        super("ERR_HTTP2_OUT_OF_STREAMS", `No stream ID is available because maximum stream ID has been reached`);
    }
}
export class ERR_HTTP2_PAYLOAD_FORBIDDEN extends NodeError {
    constructor(x){
        super("ERR_HTTP2_PAYLOAD_FORBIDDEN", `Responses with ${x} status must not have a payload`);
    }
}
export class ERR_HTTP2_PING_CANCEL extends NodeError {
    constructor(){
        super("ERR_HTTP2_PING_CANCEL", `HTTP2 ping cancelled`);
    }
}
export class ERR_HTTP2_PING_LENGTH extends NodeRangeError {
    constructor(){
        super("ERR_HTTP2_PING_LENGTH", `HTTP2 ping payload must be 8 bytes`);
    }
}
export class ERR_HTTP2_PSEUDOHEADER_NOT_ALLOWED extends NodeTypeError {
    constructor(){
        super("ERR_HTTP2_PSEUDOHEADER_NOT_ALLOWED", `Cannot set HTTP/2 pseudo-headers`);
    }
}
export class ERR_HTTP2_PUSH_DISABLED extends NodeError {
    constructor(){
        super("ERR_HTTP2_PUSH_DISABLED", `HTTP/2 client has disabled push streams`);
    }
}
export class ERR_HTTP2_SEND_FILE extends NodeError {
    constructor(){
        super("ERR_HTTP2_SEND_FILE", `Directories cannot be sent`);
    }
}
export class ERR_HTTP2_SEND_FILE_NOSEEK extends NodeError {
    constructor(){
        super("ERR_HTTP2_SEND_FILE_NOSEEK", `Offset or length can only be specified for regular files`);
    }
}
export class ERR_HTTP2_SESSION_ERROR extends NodeError {
    constructor(x){
        super("ERR_HTTP2_SESSION_ERROR", `Session closed with error code ${x}`);
    }
}
export class ERR_HTTP2_SETTINGS_CANCEL extends NodeError {
    constructor(){
        super("ERR_HTTP2_SETTINGS_CANCEL", `HTTP2 session settings canceled`);
    }
}
export class ERR_HTTP2_SOCKET_BOUND extends NodeError {
    constructor(){
        super("ERR_HTTP2_SOCKET_BOUND", `The socket is already bound to an Http2Session`);
    }
}
export class ERR_HTTP2_SOCKET_UNBOUND extends NodeError {
    constructor(){
        super("ERR_HTTP2_SOCKET_UNBOUND", `The socket has been disconnected from the Http2Session`);
    }
}
export class ERR_HTTP2_STATUS_101 extends NodeError {
    constructor(){
        super("ERR_HTTP2_STATUS_101", `HTTP status code 101 (Switching Protocols) is forbidden in HTTP/2`);
    }
}
export class ERR_HTTP2_STATUS_INVALID extends NodeRangeError {
    constructor(x){
        super("ERR_HTTP2_STATUS_INVALID", `Invalid status code: ${x}`);
    }
}
export class ERR_HTTP2_STREAM_ERROR extends NodeError {
    constructor(x){
        super("ERR_HTTP2_STREAM_ERROR", `Stream closed with error code ${x}`);
    }
}
export class ERR_HTTP2_STREAM_SELF_DEPENDENCY extends NodeError {
    constructor(){
        super("ERR_HTTP2_STREAM_SELF_DEPENDENCY", `A stream cannot depend on itself`);
    }
}
export class ERR_HTTP2_TRAILERS_ALREADY_SENT extends NodeError {
    constructor(){
        super("ERR_HTTP2_TRAILERS_ALREADY_SENT", `Trailing headers have already been sent`);
    }
}
export class ERR_HTTP2_TRAILERS_NOT_READY extends NodeError {
    constructor(){
        super("ERR_HTTP2_TRAILERS_NOT_READY", `Trailing headers cannot be sent until after the wantTrailers event is emitted`);
    }
}
export class ERR_HTTP2_UNSUPPORTED_PROTOCOL extends NodeError {
    constructor(x){
        super("ERR_HTTP2_UNSUPPORTED_PROTOCOL", `protocol "${x}" is unsupported.`);
    }
}
export class ERR_HTTP_HEADERS_SENT extends NodeError {
    constructor(x){
        super("ERR_HTTP_HEADERS_SENT", `Cannot ${x} headers after they are sent to the client`);
    }
}
export class ERR_HTTP_INVALID_HEADER_VALUE extends NodeTypeError {
    constructor(x, y){
        super("ERR_HTTP_INVALID_HEADER_VALUE", `Invalid value "${x}" for header "${y}"`);
    }
}
export class ERR_HTTP_INVALID_STATUS_CODE extends NodeRangeError {
    constructor(x){
        super("ERR_HTTP_INVALID_STATUS_CODE", `Invalid status code: ${x}`);
    }
}
export class ERR_HTTP_SOCKET_ENCODING extends NodeError {
    constructor(){
        super("ERR_HTTP_SOCKET_ENCODING", `Changing the socket encoding is not allowed per RFC7230 Section 3.`);
    }
}
export class ERR_HTTP_TRAILER_INVALID extends NodeError {
    constructor(){
        super("ERR_HTTP_TRAILER_INVALID", `Trailers are invalid with this transfer encoding`);
    }
}
export class ERR_INCOMPATIBLE_OPTION_PAIR extends NodeTypeError {
    constructor(x, y){
        super("ERR_INCOMPATIBLE_OPTION_PAIR", `Option "${x}" cannot be used in combination with option "${y}"`);
    }
}
export class ERR_INPUT_TYPE_NOT_ALLOWED extends NodeError {
    constructor(){
        super("ERR_INPUT_TYPE_NOT_ALLOWED", `--input-type can only be used with string input via --eval, --print, or STDIN`);
    }
}
export class ERR_INSPECTOR_ALREADY_ACTIVATED extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_ALREADY_ACTIVATED", `Inspector is already activated. Close it with inspector.close() before activating it again.`);
    }
}
export class ERR_INSPECTOR_ALREADY_CONNECTED extends NodeError {
    constructor(x){
        super("ERR_INSPECTOR_ALREADY_CONNECTED", `${x} is already connected`);
    }
}
export class ERR_INSPECTOR_CLOSED extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_CLOSED", `Session was closed`);
    }
}
export class ERR_INSPECTOR_COMMAND extends NodeError {
    constructor(x, y){
        super("ERR_INSPECTOR_COMMAND", `Inspector error ${x}: ${y}`);
    }
}
export class ERR_INSPECTOR_NOT_ACTIVE extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_NOT_ACTIVE", `Inspector is not active`);
    }
}
export class ERR_INSPECTOR_NOT_AVAILABLE extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_NOT_AVAILABLE", `Inspector is not available`);
    }
}
export class ERR_INSPECTOR_NOT_CONNECTED extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_NOT_CONNECTED", `Session is not connected`);
    }
}
export class ERR_INSPECTOR_NOT_WORKER extends NodeError {
    constructor(){
        super("ERR_INSPECTOR_NOT_WORKER", `Current thread is not a worker`);
    }
}
export class ERR_INVALID_ASYNC_ID extends NodeRangeError {
    constructor(x, y){
        super("ERR_INVALID_ASYNC_ID", `Invalid ${x} value: ${y}`);
    }
}
export class ERR_INVALID_BUFFER_SIZE extends NodeRangeError {
    constructor(x){
        super("ERR_INVALID_BUFFER_SIZE", `Buffer size must be a multiple of ${x}`);
    }
}
export class ERR_INVALID_CALLBACK extends NodeTypeError {
    constructor(object){
        super("ERR_INVALID_CALLBACK", `Callback must be a function. Received ${inspect(object)}`);
    }
}
export class ERR_INVALID_CURSOR_POS extends NodeTypeError {
    constructor(){
        super("ERR_INVALID_CURSOR_POS", `Cannot set cursor row without setting its column`);
    }
}
export class ERR_INVALID_FD extends NodeRangeError {
    constructor(x){
        super("ERR_INVALID_FD", `"fd" must be a positive integer: ${x}`);
    }
}
export class ERR_INVALID_FD_TYPE extends NodeTypeError {
    constructor(x){
        super("ERR_INVALID_FD_TYPE", `Unsupported fd type: ${x}`);
    }
}
export class ERR_INVALID_FILE_URL_HOST extends NodeTypeError {
    constructor(x){
        super("ERR_INVALID_FILE_URL_HOST", `File URL host must be "localhost" or empty on ${x}`);
    }
}
export class ERR_INVALID_FILE_URL_PATH extends NodeTypeError {
    constructor(x){
        super("ERR_INVALID_FILE_URL_PATH", `File URL path ${x}`);
    }
}
export class ERR_INVALID_HANDLE_TYPE extends NodeTypeError {
    constructor(){
        super("ERR_INVALID_HANDLE_TYPE", `This handle type cannot be sent`);
    }
}
export class ERR_INVALID_HTTP_TOKEN extends NodeTypeError {
    constructor(x, y){
        super("ERR_INVALID_HTTP_TOKEN", `${x} must be a valid HTTP token ["${y}"]`);
    }
}
export class ERR_INVALID_IP_ADDRESS extends NodeTypeError {
    constructor(x){
        super("ERR_INVALID_IP_ADDRESS", `Invalid IP address: ${x}`);
    }
}
export class ERR_INVALID_OPT_VALUE_ENCODING extends NodeTypeError {
    constructor(x){
        super("ERR_INVALID_OPT_VALUE_ENCODING", `The value "${x}" is invalid for option "encoding"`);
    }
}
export class ERR_INVALID_PERFORMANCE_MARK extends NodeError {
    constructor(x){
        super("ERR_INVALID_PERFORMANCE_MARK", `The "${x}" performance mark has not been set`);
    }
}
export class ERR_INVALID_PROTOCOL extends NodeTypeError {
    constructor(x, y){
        super("ERR_INVALID_PROTOCOL", `Protocol "${x}" not supported. Expected "${y}"`);
    }
}
export class ERR_INVALID_REPL_EVAL_CONFIG extends NodeTypeError {
    constructor(){
        super("ERR_INVALID_REPL_EVAL_CONFIG", `Cannot specify both "breakEvalOnSigint" and "eval" for REPL`);
    }
}
export class ERR_INVALID_REPL_INPUT extends NodeTypeError {
    constructor(x){
        super("ERR_INVALID_REPL_INPUT", `${x}`);
    }
}
export class ERR_INVALID_SYNC_FORK_INPUT extends NodeTypeError {
    constructor(x){
        super("ERR_INVALID_SYNC_FORK_INPUT", `Asynchronous forks do not support Buffer, TypedArray, DataView or string input: ${x}`);
    }
}
export class ERR_INVALID_THIS extends NodeTypeError {
    constructor(x){
        super("ERR_INVALID_THIS", `Value of "this" must be of type ${x}`);
    }
}
export class ERR_INVALID_TUPLE extends NodeTypeError {
    constructor(x, y){
        super("ERR_INVALID_TUPLE", `${x} must be an iterable ${y} tuple`);
    }
}
export class ERR_INVALID_URI extends NodeURIError {
    constructor(){
        super("ERR_INVALID_URI", `URI malformed`);
    }
}
export class ERR_IPC_CHANNEL_CLOSED extends NodeError {
    constructor(){
        super("ERR_IPC_CHANNEL_CLOSED", `Channel closed`);
    }
}
export class ERR_IPC_DISCONNECTED extends NodeError {
    constructor(){
        super("ERR_IPC_DISCONNECTED", `IPC channel is already disconnected`);
    }
}
export class ERR_IPC_ONE_PIPE extends NodeError {
    constructor(){
        super("ERR_IPC_ONE_PIPE", `Child process can have only one IPC pipe`);
    }
}
export class ERR_IPC_SYNC_FORK extends NodeError {
    constructor(){
        super("ERR_IPC_SYNC_FORK", `IPC cannot be used with synchronous forks`);
    }
}
export class ERR_MANIFEST_DEPENDENCY_MISSING extends NodeError {
    constructor(x, y){
        super("ERR_MANIFEST_DEPENDENCY_MISSING", `Manifest resource ${x} does not list ${y} as a dependency specifier`);
    }
}
export class ERR_MANIFEST_INTEGRITY_MISMATCH extends NodeSyntaxError {
    constructor(x){
        super("ERR_MANIFEST_INTEGRITY_MISMATCH", `Manifest resource ${x} has multiple entries but integrity lists do not match`);
    }
}
export class ERR_MANIFEST_INVALID_RESOURCE_FIELD extends NodeTypeError {
    constructor(x, y){
        super("ERR_MANIFEST_INVALID_RESOURCE_FIELD", `Manifest resource ${x} has invalid property value for ${y}`);
    }
}
export class ERR_MANIFEST_TDZ extends NodeError {
    constructor(){
        super("ERR_MANIFEST_TDZ", `Manifest initialization has not yet run`);
    }
}
export class ERR_MANIFEST_UNKNOWN_ONERROR extends NodeSyntaxError {
    constructor(x){
        super("ERR_MANIFEST_UNKNOWN_ONERROR", `Manifest specified unknown error behavior "${x}".`);
    }
}
export class ERR_METHOD_NOT_IMPLEMENTED extends NodeError {
    constructor(x){
        super("ERR_METHOD_NOT_IMPLEMENTED", `The ${x} method is not implemented`);
    }
}
export class ERR_MISSING_ARGS extends NodeTypeError {
    constructor(...args){
        let msg = "The ";
        const len = args.length;
        const wrap = (a)=>`"${a}"`;
        args = args.map((a)=>Array.isArray(a) ? a.map(wrap).join(" or ") : wrap(a));
        switch(len){
            case 1:
                msg += `${args[0]} argument`;
                break;
            case 2:
                msg += `${args[0]} and ${args[1]} arguments`;
                break;
            default:
                msg += args.slice(0, len - 1).join(", ");
                msg += `, and ${args[len - 1]} arguments`;
                break;
        }
        super("ERR_MISSING_ARGS", `${msg} must be specified`);
    }
}
export class ERR_MISSING_OPTION extends NodeTypeError {
    constructor(x){
        super("ERR_MISSING_OPTION", `${x} is required`);
    }
}
export class ERR_MULTIPLE_CALLBACK extends NodeError {
    constructor(){
        super("ERR_MULTIPLE_CALLBACK", `Callback called multiple times`);
    }
}
export class ERR_NAPI_CONS_FUNCTION extends NodeTypeError {
    constructor(){
        super("ERR_NAPI_CONS_FUNCTION", `Constructor must be a function`);
    }
}
export class ERR_NAPI_INVALID_DATAVIEW_ARGS extends NodeRangeError {
    constructor(){
        super("ERR_NAPI_INVALID_DATAVIEW_ARGS", `byte_offset + byte_length should be less than or equal to the size in bytes of the array passed in`);
    }
}
export class ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT extends NodeRangeError {
    constructor(x, y){
        super("ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT", `start offset of ${x} should be a multiple of ${y}`);
    }
}
export class ERR_NAPI_INVALID_TYPEDARRAY_LENGTH extends NodeRangeError {
    constructor(){
        super("ERR_NAPI_INVALID_TYPEDARRAY_LENGTH", `Invalid typed array length`);
    }
}
export class ERR_NO_CRYPTO extends NodeError {
    constructor(){
        super("ERR_NO_CRYPTO", `Node.js is not compiled with OpenSSL crypto support`);
    }
}
export class ERR_NO_ICU extends NodeTypeError {
    constructor(x){
        super("ERR_NO_ICU", `${x} is not supported on Node.js compiled without ICU`);
    }
}
export class ERR_QUICCLIENTSESSION_FAILED extends NodeError {
    constructor(x){
        super("ERR_QUICCLIENTSESSION_FAILED", `Failed to create a new QuicClientSession: ${x}`);
    }
}
export class ERR_QUICCLIENTSESSION_FAILED_SETSOCKET extends NodeError {
    constructor(){
        super("ERR_QUICCLIENTSESSION_FAILED_SETSOCKET", `Failed to set the QuicSocket`);
    }
}
export class ERR_QUICSESSION_DESTROYED extends NodeError {
    constructor(x){
        super("ERR_QUICSESSION_DESTROYED", `Cannot call ${x} after a QuicSession has been destroyed`);
    }
}
export class ERR_QUICSESSION_INVALID_DCID extends NodeError {
    constructor(x){
        super("ERR_QUICSESSION_INVALID_DCID", `Invalid DCID value: ${x}`);
    }
}
export class ERR_QUICSESSION_UPDATEKEY extends NodeError {
    constructor(){
        super("ERR_QUICSESSION_UPDATEKEY", `Unable to update QuicSession keys`);
    }
}
export class ERR_QUICSOCKET_DESTROYED extends NodeError {
    constructor(x){
        super("ERR_QUICSOCKET_DESTROYED", `Cannot call ${x} after a QuicSocket has been destroyed`);
    }
}
export class ERR_QUICSOCKET_INVALID_STATELESS_RESET_SECRET_LENGTH extends NodeError {
    constructor(){
        super("ERR_QUICSOCKET_INVALID_STATELESS_RESET_SECRET_LENGTH", `The stateResetToken must be exactly 16-bytes in length`);
    }
}
export class ERR_QUICSOCKET_LISTENING extends NodeError {
    constructor(){
        super("ERR_QUICSOCKET_LISTENING", `This QuicSocket is already listening`);
    }
}
export class ERR_QUICSOCKET_UNBOUND extends NodeError {
    constructor(x){
        super("ERR_QUICSOCKET_UNBOUND", `Cannot call ${x} before a QuicSocket has been bound`);
    }
}
export class ERR_QUICSTREAM_DESTROYED extends NodeError {
    constructor(x){
        super("ERR_QUICSTREAM_DESTROYED", `Cannot call ${x} after a QuicStream has been destroyed`);
    }
}
export class ERR_QUICSTREAM_INVALID_PUSH extends NodeError {
    constructor(){
        super("ERR_QUICSTREAM_INVALID_PUSH", `Push streams are only supported on client-initiated, bidirectional streams`);
    }
}
export class ERR_QUICSTREAM_OPEN_FAILED extends NodeError {
    constructor(){
        super("ERR_QUICSTREAM_OPEN_FAILED", `Opening a new QuicStream failed`);
    }
}
export class ERR_QUICSTREAM_UNSUPPORTED_PUSH extends NodeError {
    constructor(){
        super("ERR_QUICSTREAM_UNSUPPORTED_PUSH", `Push streams are not supported on this QuicSession`);
    }
}
export class ERR_QUIC_TLS13_REQUIRED extends NodeError {
    constructor(){
        super("ERR_QUIC_TLS13_REQUIRED", `QUIC requires TLS version 1.3`);
    }
}
export class ERR_SCRIPT_EXECUTION_INTERRUPTED extends NodeError {
    constructor(){
        super("ERR_SCRIPT_EXECUTION_INTERRUPTED", "Script execution was interrupted by `SIGINT`");
    }
}
export class ERR_SERVER_ALREADY_LISTEN extends NodeError {
    constructor(){
        super("ERR_SERVER_ALREADY_LISTEN", `Listen method has been called more than once without closing.`);
    }
}
export class ERR_SERVER_NOT_RUNNING extends NodeError {
    constructor(){
        super("ERR_SERVER_NOT_RUNNING", `Server is not running.`);
    }
}
export class ERR_SOCKET_ALREADY_BOUND extends NodeError {
    constructor(){
        super("ERR_SOCKET_ALREADY_BOUND", `Socket is already bound`);
    }
}
export class ERR_SOCKET_BAD_BUFFER_SIZE extends NodeTypeError {
    constructor(){
        super("ERR_SOCKET_BAD_BUFFER_SIZE", `Buffer size must be a positive integer`);
    }
}
export class ERR_SOCKET_BAD_PORT extends NodeRangeError {
    constructor(name, port, allowZero = true){
        assert(typeof allowZero === "boolean", "The 'allowZero' argument must be of type boolean.");
        const operator = allowZero ? ">=" : ">";
        super("ERR_SOCKET_BAD_PORT", `${name} should be ${operator} 0 and < 65536. Received ${port}.`);
    }
}
export class ERR_SOCKET_BAD_TYPE extends NodeTypeError {
    constructor(){
        super("ERR_SOCKET_BAD_TYPE", `Bad socket type specified. Valid types are: udp4, udp6`);
    }
}
export class ERR_SOCKET_CLOSED extends NodeError {
    constructor(){
        super("ERR_SOCKET_CLOSED", `Socket is closed`);
    }
}
export class ERR_SOCKET_DGRAM_IS_CONNECTED extends NodeError {
    constructor(){
        super("ERR_SOCKET_DGRAM_IS_CONNECTED", `Already connected`);
    }
}
export class ERR_SOCKET_DGRAM_NOT_CONNECTED extends NodeError {
    constructor(){
        super("ERR_SOCKET_DGRAM_NOT_CONNECTED", `Not connected`);
    }
}
export class ERR_SOCKET_DGRAM_NOT_RUNNING extends NodeError {
    constructor(){
        super("ERR_SOCKET_DGRAM_NOT_RUNNING", `Not running`);
    }
}
export class ERR_SRI_PARSE extends NodeSyntaxError {
    constructor(name, char, position){
        super("ERR_SRI_PARSE", `Subresource Integrity string ${name} had an unexpected ${char} at position ${position}`);
    }
}
export class ERR_STREAM_ALREADY_FINISHED extends NodeError {
    constructor(x){
        super("ERR_STREAM_ALREADY_FINISHED", `Cannot call ${x} after a stream was finished`);
    }
}
export class ERR_STREAM_CANNOT_PIPE extends NodeError {
    constructor(){
        super("ERR_STREAM_CANNOT_PIPE", `Cannot pipe, not readable`);
    }
}
export class ERR_STREAM_DESTROYED extends NodeError {
    constructor(x){
        super("ERR_STREAM_DESTROYED", `Cannot call ${x} after a stream was destroyed`);
    }
}
export class ERR_STREAM_NULL_VALUES extends NodeTypeError {
    constructor(){
        super("ERR_STREAM_NULL_VALUES", `May not write null values to stream`);
    }
}
export class ERR_STREAM_PREMATURE_CLOSE extends NodeError {
    constructor(){
        super("ERR_STREAM_PREMATURE_CLOSE", `Premature close`);
    }
}
export class ERR_STREAM_PUSH_AFTER_EOF extends NodeError {
    constructor(){
        super("ERR_STREAM_PUSH_AFTER_EOF", `stream.push() after EOF`);
    }
}
export class ERR_STREAM_UNSHIFT_AFTER_END_EVENT extends NodeError {
    constructor(){
        super("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", `stream.unshift() after end event`);
    }
}
export class ERR_STREAM_WRAP extends NodeError {
    constructor(){
        super("ERR_STREAM_WRAP", `Stream has StringDecoder set or is in objectMode`);
    }
}
export class ERR_STREAM_WRITE_AFTER_END extends NodeError {
    constructor(){
        super("ERR_STREAM_WRITE_AFTER_END", `write after end`);
    }
}
export class ERR_SYNTHETIC extends NodeError {
    constructor(){
        super("ERR_SYNTHETIC", `JavaScript Callstack`);
    }
}
export class ERR_TLS_DH_PARAM_SIZE extends NodeError {
    constructor(x){
        super("ERR_TLS_DH_PARAM_SIZE", `DH parameter size ${x} is less than 2048`);
    }
}
export class ERR_TLS_HANDSHAKE_TIMEOUT extends NodeError {
    constructor(){
        super("ERR_TLS_HANDSHAKE_TIMEOUT", `TLS handshake timeout`);
    }
}
export class ERR_TLS_INVALID_CONTEXT extends NodeTypeError {
    constructor(x){
        super("ERR_TLS_INVALID_CONTEXT", `${x} must be a SecureContext`);
    }
}
export class ERR_TLS_INVALID_STATE extends NodeError {
    constructor(){
        super("ERR_TLS_INVALID_STATE", `TLS socket connection must be securely established`);
    }
}
export class ERR_TLS_INVALID_PROTOCOL_VERSION extends NodeTypeError {
    constructor(protocol, x){
        super("ERR_TLS_INVALID_PROTOCOL_VERSION", `${protocol} is not a valid ${x} TLS protocol version`);
    }
}
export class ERR_TLS_PROTOCOL_VERSION_CONFLICT extends NodeTypeError {
    constructor(prevProtocol, protocol){
        super("ERR_TLS_PROTOCOL_VERSION_CONFLICT", `TLS protocol version ${prevProtocol} conflicts with secureProtocol ${protocol}`);
    }
}
export class ERR_TLS_RENEGOTIATION_DISABLED extends NodeError {
    constructor(){
        super("ERR_TLS_RENEGOTIATION_DISABLED", `TLS session renegotiation disabled for this socket`);
    }
}
export class ERR_TLS_REQUIRED_SERVER_NAME extends NodeError {
    constructor(){
        super("ERR_TLS_REQUIRED_SERVER_NAME", `"servername" is required parameter for Server.addContext`);
    }
}
export class ERR_TLS_SESSION_ATTACK extends NodeError {
    constructor(){
        super("ERR_TLS_SESSION_ATTACK", `TLS session renegotiation attack detected`);
    }
}
export class ERR_TLS_SNI_FROM_SERVER extends NodeError {
    constructor(){
        super("ERR_TLS_SNI_FROM_SERVER", `Cannot issue SNI from a TLS server-side socket`);
    }
}
export class ERR_TRACE_EVENTS_CATEGORY_REQUIRED extends NodeTypeError {
    constructor(){
        super("ERR_TRACE_EVENTS_CATEGORY_REQUIRED", `At least one category is required`);
    }
}
export class ERR_TRACE_EVENTS_UNAVAILABLE extends NodeError {
    constructor(){
        super("ERR_TRACE_EVENTS_UNAVAILABLE", `Trace events are unavailable`);
    }
}
export class ERR_UNAVAILABLE_DURING_EXIT extends NodeError {
    constructor(){
        super("ERR_UNAVAILABLE_DURING_EXIT", `Cannot call function in process exit handler`);
    }
}
export class ERR_UNCAUGHT_EXCEPTION_CAPTURE_ALREADY_SET extends NodeError {
    constructor(){
        super("ERR_UNCAUGHT_EXCEPTION_CAPTURE_ALREADY_SET", "`process.setupUncaughtExceptionCapture()` was called while a capture callback was already active");
    }
}
export class ERR_UNESCAPED_CHARACTERS extends NodeTypeError {
    constructor(x){
        super("ERR_UNESCAPED_CHARACTERS", `${x} contains unescaped characters`);
    }
}
export class ERR_UNHANDLED_ERROR extends NodeError {
    constructor(x){
        super("ERR_UNHANDLED_ERROR", `Unhandled error. (${x})`);
    }
}
export class ERR_UNKNOWN_BUILTIN_MODULE extends NodeError {
    constructor(x){
        super("ERR_UNKNOWN_BUILTIN_MODULE", `No such built-in module: ${x}`);
    }
}
export class ERR_UNKNOWN_CREDENTIAL extends NodeError {
    constructor(x, y){
        super("ERR_UNKNOWN_CREDENTIAL", `${x} identifier does not exist: ${y}`);
    }
}
export class ERR_UNKNOWN_ENCODING extends NodeTypeError {
    constructor(x){
        super("ERR_UNKNOWN_ENCODING", `Unknown encoding: ${x}`);
    }
}
export class ERR_UNKNOWN_FILE_EXTENSION extends NodeTypeError {
    constructor(x, y){
        super("ERR_UNKNOWN_FILE_EXTENSION", `Unknown file extension "${x}" for ${y}`);
    }
}
export class ERR_UNKNOWN_MODULE_FORMAT extends NodeRangeError {
    constructor(x){
        super("ERR_UNKNOWN_MODULE_FORMAT", `Unknown module format: ${x}`);
    }
}
export class ERR_UNKNOWN_SIGNAL extends NodeTypeError {
    constructor(x){
        super("ERR_UNKNOWN_SIGNAL", `Unknown signal: ${x}`);
    }
}
export class ERR_UNSUPPORTED_DIR_IMPORT extends NodeError {
    constructor(x, y){
        super("ERR_UNSUPPORTED_DIR_IMPORT", `Directory import '${x}' is not supported resolving ES modules, imported from ${y}`);
    }
}
export class ERR_UNSUPPORTED_ESM_URL_SCHEME extends NodeError {
    constructor(){
        super("ERR_UNSUPPORTED_ESM_URL_SCHEME", `Only file and data URLs are supported by the default ESM loader`);
    }
}
export class ERR_V8BREAKITERATOR extends NodeError {
    constructor(){
        super("ERR_V8BREAKITERATOR", `Full ICU data not installed. See https://github.com/nodejs/node/wiki/Intl`);
    }
}
export class ERR_VALID_PERFORMANCE_ENTRY_TYPE extends NodeError {
    constructor(){
        super("ERR_VALID_PERFORMANCE_ENTRY_TYPE", `At least one valid performance entry type is required`);
    }
}
export class ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING extends NodeTypeError {
    constructor(){
        super("ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING", `A dynamic import callback was not specified.`);
    }
}
export class ERR_VM_MODULE_ALREADY_LINKED extends NodeError {
    constructor(){
        super("ERR_VM_MODULE_ALREADY_LINKED", `Module has already been linked`);
    }
}
export class ERR_VM_MODULE_CANNOT_CREATE_CACHED_DATA extends NodeError {
    constructor(){
        super("ERR_VM_MODULE_CANNOT_CREATE_CACHED_DATA", `Cached data cannot be created for a module which has been evaluated`);
    }
}
export class ERR_VM_MODULE_DIFFERENT_CONTEXT extends NodeError {
    constructor(){
        super("ERR_VM_MODULE_DIFFERENT_CONTEXT", `Linked modules must use the same context`);
    }
}
export class ERR_VM_MODULE_LINKING_ERRORED extends NodeError {
    constructor(){
        super("ERR_VM_MODULE_LINKING_ERRORED", `Linking has already failed for the provided module`);
    }
}
export class ERR_VM_MODULE_NOT_MODULE extends NodeError {
    constructor(){
        super("ERR_VM_MODULE_NOT_MODULE", `Provided module is not an instance of Module`);
    }
}
export class ERR_VM_MODULE_STATUS extends NodeError {
    constructor(x){
        super("ERR_VM_MODULE_STATUS", `Module status ${x}`);
    }
}
export class ERR_WASI_ALREADY_STARTED extends NodeError {
    constructor(){
        super("ERR_WASI_ALREADY_STARTED", `WASI instance has already started`);
    }
}
export class ERR_WORKER_INIT_FAILED extends NodeError {
    constructor(x){
        super("ERR_WORKER_INIT_FAILED", `Worker initialization failure: ${x}`);
    }
}
export class ERR_WORKER_NOT_RUNNING extends NodeError {
    constructor(){
        super("ERR_WORKER_NOT_RUNNING", `Worker instance not running`);
    }
}
export class ERR_WORKER_OUT_OF_MEMORY extends NodeError {
    constructor(x){
        super("ERR_WORKER_OUT_OF_MEMORY", `Worker terminated due to reaching memory limit: ${x}`);
    }
}
export class ERR_WORKER_UNSERIALIZABLE_ERROR extends NodeError {
    constructor(){
        super("ERR_WORKER_UNSERIALIZABLE_ERROR", `Serializing an uncaught exception failed`);
    }
}
export class ERR_WORKER_UNSUPPORTED_EXTENSION extends NodeTypeError {
    constructor(x){
        super("ERR_WORKER_UNSUPPORTED_EXTENSION", `The worker script extension must be ".js", ".mjs", or ".cjs". Received "${x}"`);
    }
}
export class ERR_WORKER_UNSUPPORTED_OPERATION extends NodeTypeError {
    constructor(x){
        super("ERR_WORKER_UNSUPPORTED_OPERATION", `${x} is not supported in workers`);
    }
}
export class ERR_ZLIB_INITIALIZATION_FAILED extends NodeError {
    constructor(){
        super("ERR_ZLIB_INITIALIZATION_FAILED", `Initialization failed`);
    }
}
export class ERR_FALSY_VALUE_REJECTION extends NodeError {
    reason;
    constructor(reason){
        super("ERR_FALSY_VALUE_REJECTION", "Promise was rejected with falsy value");
        this.reason = reason;
    }
}
export class ERR_HTTP2_INVALID_SETTING_VALUE extends NodeRangeError {
    actual;
    min;
    max;
    constructor(name, actual, min, max){
        super("ERR_HTTP2_INVALID_SETTING_VALUE", `Invalid value for setting "${name}": ${actual}`);
        this.actual = actual;
        if (min !== undefined) {
            this.min = min;
            this.max = max;
        }
    }
}
export class ERR_HTTP2_STREAM_CANCEL extends NodeError {
    cause;
    constructor(error){
        super("ERR_HTTP2_STREAM_CANCEL", typeof error.message === "string" ? `The pending stream has been canceled (caused by: ${error.message})` : "The pending stream has been canceled");
        if (error) {
            this.cause = error;
        }
    }
}
export class ERR_INVALID_ADDRESS_FAMILY extends NodeRangeError {
    host;
    port;
    constructor(addressType, host, port){
        super("ERR_INVALID_ADDRESS_FAMILY", `Invalid address family: ${addressType} ${host}:${port}`);
        this.host = host;
        this.port = port;
    }
}
export class ERR_INVALID_CHAR extends NodeTypeError {
    constructor(name, field){
        super("ERR_INVALID_CHAR", field ? `Invalid character in ${name}` : `Invalid character in ${name} ["${field}"]`);
    }
}
export class ERR_INVALID_OPT_VALUE extends NodeTypeError {
    constructor(name, value){
        super("ERR_INVALID_OPT_VALUE", `The value "${value}" is invalid for option "${name}"`);
    }
}
export class ERR_INVALID_RETURN_PROPERTY extends NodeTypeError {
    constructor(input, name, prop, value){
        super("ERR_INVALID_RETURN_PROPERTY", `Expected a valid ${input} to be returned for the "${prop}" from the "${name}" function but got ${value}.`);
    }
}
// deno-lint-ignore no-explicit-any
function buildReturnPropertyType(value) {
    if (value && value.constructor && value.constructor.name) {
        return `instance of ${value.constructor.name}`;
    } else {
        return `type ${typeof value}`;
    }
}
export class ERR_INVALID_RETURN_PROPERTY_VALUE extends NodeTypeError {
    constructor(input, name, prop, value){
        super("ERR_INVALID_RETURN_PROPERTY_VALUE", `Expected ${input} to be returned for the "${prop}" from the "${name}" function but got ${buildReturnPropertyType(value)}.`);
    }
}
export class ERR_INVALID_RETURN_VALUE extends NodeTypeError {
    constructor(input, name, value){
        super("ERR_INVALID_RETURN_VALUE", `Expected ${input} to be returned from the "${name}" function but got ${buildReturnPropertyType(value)}.`);
    }
}
export class ERR_INVALID_URL extends NodeTypeError {
    input;
    constructor(input){
        super("ERR_INVALID_URL", `Invalid URL: ${input}`);
        this.input = input;
    }
}
export class ERR_INVALID_URL_SCHEME extends NodeTypeError {
    constructor(expected){
        expected = Array.isArray(expected) ? expected : [
            expected
        ];
        const res = expected.length === 2 ? `one of scheme ${expected[0]} or ${expected[1]}` : `of scheme ${expected[0]}`;
        super("ERR_INVALID_URL_SCHEME", `The URL must be ${res}`);
    }
}
export class ERR_MODULE_NOT_FOUND extends NodeError {
    constructor(path, base, type = "package"){
        super("ERR_MODULE_NOT_FOUND", `Cannot find ${type} '${path}' imported from ${base}`);
    }
}
export class ERR_INVALID_PACKAGE_CONFIG extends NodeError {
    constructor(path, base, message){
        const msg = `Invalid package config ${path}${base ? ` while importing ${base}` : ""}${message ? `. ${message}` : ""}`;
        super("ERR_INVALID_PACKAGE_CONFIG", msg);
    }
}
export class ERR_INVALID_MODULE_SPECIFIER extends NodeTypeError {
    constructor(request, reason, base){
        super("ERR_INVALID_MODULE_SPECIFIER", `Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ""}`);
    }
}
export class ERR_INVALID_PACKAGE_TARGET extends NodeError {
    constructor(pkgPath, key, // deno-lint-ignore no-explicit-any
    target, isImport, base){
        let msg;
        const relError = typeof target === "string" && !isImport && target.length && !target.startsWith("./");
        if (key === ".") {
            assert(isImport === false);
            msg = `Invalid "exports" main target ${JSON.stringify(target)} defined ` + `in the package config ${pkgPath}package.json${base ? ` imported from ${base}` : ""}${relError ? '; targets must start with "./"' : ""}`;
        } else {
            msg = `Invalid "${isImport ? "imports" : "exports"}" target ${JSON.stringify(target)} defined for '${key}' in the package config ${pkgPath}package.json${base ? ` imported from ${base}` : ""}${relError ? '; targets must start with "./"' : ""}`;
        }
        super("ERR_INVALID_PACKAGE_TARGET", msg);
    }
}
export class ERR_PACKAGE_IMPORT_NOT_DEFINED extends NodeTypeError {
    constructor(specifier, packageJSONUrl, base){
        const packagePath = packageJSONUrl && fileURLToPath(new URL(".", packageJSONUrl));
        const msg = `Package import specifier "${specifier}" is not defined${packagePath ? ` in package ${packagePath}package.json` : ""} imported from ${fileURLToPath(base)}`;
        super("ERR_PACKAGE_IMPORT_NOT_DEFINED", msg);
    }
}
export class ERR_PACKAGE_PATH_NOT_EXPORTED extends NodeError {
    constructor(subpath, packageJSONUrl, base){
        const pkgPath = fileURLToPath(new URL(".", packageJSONUrl));
        const basePath = base && fileURLToPath(base);
        let msg;
        if (subpath === ".") {
            msg = `No "exports" main defined in ${pkgPath}package.json${basePath ? ` imported from ${basePath}` : ""}`;
        } else {
            msg = `Package subpath '${subpath}' is not defined by "exports" in ${pkgPath}package.json${basePath ? ` imported from ${basePath}` : ""}`;
        }
        super("ERR_PACKAGE_PATH_NOT_EXPORTED", msg);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL25vZGUvX2Vycm9ycy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgTm9kZS5qcyBjb250cmlidXRvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBMaWNlbnNlLlxuLyoqICoqKioqKioqKiogTk9UIElNUExFTUVOVEVEXG4gKiBFUlJfTUFOSUZFU1RfQVNTRVJUX0lOVEVHUklUWVxuICogRVJSX1FVSUNTRVNTSU9OX1ZFUlNJT05fTkVHT1RJQVRJT05cbiAqIEVSUl9SRVFVSVJFX0VTTVxuICogRVJSX1RMU19DRVJUX0FMVE5BTUVfSU5WQUxJRFxuICogRVJSX1dPUktFUl9JTlZBTElEX0VYRUNfQVJHVlxuICogRVJSX1dPUktFUl9QQVRIXG4gKiBFUlJfUVVJQ19FUlJPUlxuICogRVJSX1NPQ0tFVF9CVUZGRVJfU0laRSAvL1N5c3RlbSBlcnJvciwgc2hvdWxkbid0IGV2ZXIgaGFwcGVuIGluc2lkZSBEZW5vXG4gKiBFUlJfU1lTVEVNX0VSUk9SIC8vU3lzdGVtIGVycm9yLCBzaG91bGRuJ3QgZXZlciBoYXBwZW4gaW5zaWRlIERlbm9cbiAqIEVSUl9UVFlfSU5JVF9GQUlMRUQgLy9TeXN0ZW0gZXJyb3IsIHNob3VsZG4ndCBldmVyIGhhcHBlbiBpbnNpZGUgRGVub1xuICogRVJSX0lOVkFMSURfUEFDS0FHRV9DT05GSUcgLy8gcGFja2FnZS5qc29uIHN0dWZmLCBwcm9iYWJseSB1c2VsZXNzXG4gKiAqKioqKioqKioqKiAqL1xuXG5pbXBvcnQgeyBnZXRTeXN0ZW1FcnJvck5hbWUsIGluc3BlY3QgfSBmcm9tIFwiLi91dGlsLnRzXCI7XG5pbXBvcnQgeyBjb2RlTWFwLCBlcnJvck1hcCB9IGZyb20gXCIuL2ludGVybmFsX2JpbmRpbmcvdXYudHNcIjtcbmltcG9ydCB7IGFzc2VydCB9IGZyb20gXCIuLi9fdXRpbC9hc3NlcnQudHNcIjtcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tIFwiLi91cmwudHNcIjtcblxuZXhwb3J0IHsgZXJyb3JNYXAgfTtcblxuLyoqXG4gKiBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9ibG9iL2YzZWIyMjQvbGliL2ludGVybmFsL2Vycm9ycy5qc1xuICovXG5jb25zdCBjbGFzc1JlZ0V4cCA9IC9eKFtBLVpdW2EtejAtOV0qKSskLztcblxuLyoqXG4gKiBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9ibG9iL2YzZWIyMjQvbGliL2ludGVybmFsL2Vycm9ycy5qc1xuICogQGRlc2NyaXB0aW9uIFNvcnRlZCBieSBhIHJvdWdoIGVzdGltYXRlIG9uIG1vc3QgZnJlcXVlbnRseSB1c2VkIGVudHJpZXMuXG4gKi9cbmNvbnN0IGtUeXBlcyA9IFtcbiAgXCJzdHJpbmdcIixcbiAgXCJmdW5jdGlvblwiLFxuICBcIm51bWJlclwiLFxuICBcIm9iamVjdFwiLFxuICAvLyBBY2NlcHQgJ0Z1bmN0aW9uJyBhbmQgJ09iamVjdCcgYXMgYWx0ZXJuYXRpdmUgdG8gdGhlIGxvd2VyIGNhc2VkIHZlcnNpb24uXG4gIFwiRnVuY3Rpb25cIixcbiAgXCJPYmplY3RcIixcbiAgXCJib29sZWFuXCIsXG4gIFwiYmlnaW50XCIsXG4gIFwic3ltYm9sXCIsXG5dO1xuXG5jb25zdCBub2RlSW50ZXJuYWxQcmVmaXggPSBcIl9fbm9kZV9pbnRlcm5hbF9cIjtcblxuLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbnR5cGUgR2VuZXJpY0Z1bmN0aW9uID0gKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnk7XG5cbi8qKiBUaGlzIGZ1bmN0aW9uIHJlbW92ZXMgdW5uZWNlc3NhcnkgZnJhbWVzIGZyb20gTm9kZS5qcyBjb3JlIGVycm9ycy4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoaWRlU3RhY2tGcmFtZXMoZm46IEdlbmVyaWNGdW5jdGlvbikge1xuICAvLyBXZSByZW5hbWUgdGhlIGZ1bmN0aW9ucyB0aGF0IHdpbGwgYmUgaGlkZGVuIHRvIGN1dCBvZmYgdGhlIHN0YWNrdHJhY2VcbiAgLy8gYXQgdGhlIG91dGVybW9zdCBvbmUuXG4gIGNvbnN0IGhpZGRlbiA9IG5vZGVJbnRlcm5hbFByZWZpeCArIGZuLm5hbWU7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmbiwgXCJuYW1lXCIsIHsgdmFsdWU6IGhpZGRlbiB9KTtcblxuICByZXR1cm4gZm47XG59XG5cbmNvbnN0IGNhcHR1cmVMYXJnZXJTdGFja1RyYWNlID0gaGlkZVN0YWNrRnJhbWVzKFxuICBmdW5jdGlvbiBjYXB0dXJlTGFyZ2VyU3RhY2tUcmFjZShlcnIpIHtcbiAgICAvLyBAdHMtaWdub3JlIHRoaXMgZnVuY3Rpb24gaXMgbm90IGF2YWlsYWJsZSBpbiBsaWIuZG9tLmQudHNcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZShlcnIpO1xuXG4gICAgcmV0dXJuIGVycjtcbiAgfSxcbik7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXJybm9FeGNlcHRpb24gZXh0ZW5kcyBFcnJvciB7XG4gIGVycm5vPzogbnVtYmVyO1xuICBjb2RlPzogc3RyaW5nO1xuICBwYXRoPzogc3RyaW5nO1xuICBzeXNjYWxsPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFRoaXMgY3JlYXRlcyBhbiBlcnJvciBjb21wYXRpYmxlIHdpdGggZXJyb3JzIHByb2R1Y2VkIGluIHRoZSBDKytcbiAqIFRoaXMgZnVuY3Rpb24gc2hvdWxkIHJlcGxhY2UgdGhlIGRlcHJlY2F0ZWRcbiAqIGBleGNlcHRpb25XaXRoSG9zdFBvcnQoKWAgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIGVyciBBIGxpYnV2IGVycm9yIG51bWJlclxuICogQHBhcmFtIHN5c2NhbGxcbiAqIEBwYXJhbSBhZGRyZXNzXG4gKiBAcGFyYW0gcG9ydFxuICogQHJldHVybiBUaGUgZXJyb3IuXG4gKi9cbmV4cG9ydCBjb25zdCB1dkV4Y2VwdGlvbldpdGhIb3N0UG9ydCA9IGhpZGVTdGFja0ZyYW1lcyhcbiAgZnVuY3Rpb24gdXZFeGNlcHRpb25XaXRoSG9zdFBvcnQoXG4gICAgZXJyOiBudW1iZXIsXG4gICAgc3lzY2FsbDogc3RyaW5nLFxuICAgIGFkZHJlc3M6IHN0cmluZyxcbiAgICBwb3J0PzogbnVtYmVyLFxuICApIHtcbiAgICBjb25zdCB7IDA6IGNvZGUsIDE6IHV2bXNnIH0gPSB1dkVycm1hcEdldChlcnIpIHx8IHV2VW5tYXBwZWRFcnJvcjtcbiAgICBjb25zdCBtZXNzYWdlID0gYCR7c3lzY2FsbH0gJHtjb2RlfTogJHt1dm1zZ31gO1xuICAgIGxldCBkZXRhaWxzID0gXCJcIjtcblxuICAgIGlmIChwb3J0ICYmIHBvcnQgPiAwKSB7XG4gICAgICBkZXRhaWxzID0gYCAke2FkZHJlc3N9OiR7cG9ydH1gO1xuICAgIH0gZWxzZSBpZiAoYWRkcmVzcykge1xuICAgICAgZGV0YWlscyA9IGAgJHthZGRyZXNzfWA7XG4gICAgfVxuXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCBleDogYW55ID0gbmV3IEVycm9yKGAke21lc3NhZ2V9JHtkZXRhaWxzfWApO1xuICAgIGV4LmNvZGUgPSBjb2RlO1xuICAgIGV4LmVycm5vID0gZXJyO1xuICAgIGV4LnN5c2NhbGwgPSBzeXNjYWxsO1xuICAgIGV4LmFkZHJlc3MgPSBhZGRyZXNzO1xuXG4gICAgaWYgKHBvcnQpIHtcbiAgICAgIGV4LnBvcnQgPSBwb3J0O1xuICAgIH1cblxuICAgIHJldHVybiBjYXB0dXJlTGFyZ2VyU3RhY2tUcmFjZShleCk7XG4gIH0sXG4pO1xuXG4vKipcbiAqIFRoaXMgdXNlZCB0byBiZSBgdXRpbC5fZXJybm9FeGNlcHRpb24oKWAuXG4gKlxuICogQHBhcmFtIGVyciBBIGxpYnV2IGVycm9yIG51bWJlclxuICogQHBhcmFtIHN5c2NhbGxcbiAqIEBwYXJhbSBvcmlnaW5hbFxuICogQHJldHVybiBBIGBFcnJub0V4Y2VwdGlvbmBcbiAqL1xuZXhwb3J0IGNvbnN0IGVycm5vRXhjZXB0aW9uID0gaGlkZVN0YWNrRnJhbWVzKFxuICBmdW5jdGlvbiBlcnJub0V4Y2VwdGlvbihlcnIsIHN5c2NhbGwsIG9yaWdpbmFsKTogRXJybm9FeGNlcHRpb24ge1xuICAgIGNvbnN0IGNvZGUgPSBnZXRTeXN0ZW1FcnJvck5hbWUoZXJyKTtcbiAgICBjb25zdCBtZXNzYWdlID0gb3JpZ2luYWxcbiAgICAgID8gYCR7c3lzY2FsbH0gJHtjb2RlfSAke29yaWdpbmFsfWBcbiAgICAgIDogYCR7c3lzY2FsbH0gJHtjb2RlfWA7XG5cbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IGV4OiBhbnkgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgZXguZXJybm8gPSBlcnI7XG4gICAgZXguY29kZSA9IGNvZGU7XG4gICAgZXguc3lzY2FsbCA9IHN5c2NhbGw7XG5cbiAgICByZXR1cm4gY2FwdHVyZUxhcmdlclN0YWNrVHJhY2UoZXgpO1xuICB9LFxuKTtcblxuZnVuY3Rpb24gdXZFcnJtYXBHZXQobmFtZTogbnVtYmVyKSB7XG4gIHJldHVybiBlcnJvck1hcC5nZXQobmFtZSk7XG59XG5cbmNvbnN0IHV2VW5tYXBwZWRFcnJvciA9IFtcIlVOS05PV05cIiwgXCJ1bmtub3duIGVycm9yXCJdO1xuXG4vKipcbiAqIFRoaXMgY3JlYXRlcyBhbiBlcnJvciBjb21wYXRpYmxlIHdpdGggZXJyb3JzIHByb2R1Y2VkIGluIHRoZSBDKytcbiAqIGZ1bmN0aW9uIFVWRXhjZXB0aW9uIHVzaW5nIGEgY29udGV4dCBvYmplY3Qgd2l0aCBkYXRhIGFzc2VtYmxlZCBpbiBDKysuXG4gKiBUaGUgZ29hbCBpcyB0byBtaWdyYXRlIHRoZW0gdG8gRVJSXyogZXJyb3JzIGxhdGVyIHdoZW4gY29tcGF0aWJpbGl0eSBpc1xuICogbm90IGEgY29uY2Vybi5cbiAqXG4gKiBAcGFyYW0gY3R4XG4gKiBAcmV0dXJuIFRoZSBlcnJvci5cbiAqL1xuZXhwb3J0IGNvbnN0IHV2RXhjZXB0aW9uID0gaGlkZVN0YWNrRnJhbWVzKGZ1bmN0aW9uIHV2RXhjZXB0aW9uKGN0eCkge1xuICBjb25zdCB7IDA6IGNvZGUsIDE6IHV2bXNnIH0gPSB1dkVycm1hcEdldChjdHguZXJybm8pIHx8IHV2VW5tYXBwZWRFcnJvcjtcblxuICBsZXQgbWVzc2FnZSA9IGAke2NvZGV9OiAke2N0eC5tZXNzYWdlIHx8IHV2bXNnfSwgJHtjdHguc3lzY2FsbH1gO1xuXG4gIGxldCBwYXRoO1xuICBsZXQgZGVzdDtcblxuICBpZiAoY3R4LnBhdGgpIHtcbiAgICBwYXRoID0gY3R4LnBhdGgudG9TdHJpbmcoKTtcbiAgICBtZXNzYWdlICs9IGAgJyR7cGF0aH0nYDtcbiAgfVxuICBpZiAoY3R4LmRlc3QpIHtcbiAgICBkZXN0ID0gY3R4LmRlc3QudG9TdHJpbmcoKTtcbiAgICBtZXNzYWdlICs9IGAgLT4gJyR7ZGVzdH0nYDtcbiAgfVxuXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIGNvbnN0IGVycjogYW55ID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuXG4gIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyhjdHgpKSB7XG4gICAgaWYgKHByb3AgPT09IFwibWVzc2FnZVwiIHx8IHByb3AgPT09IFwicGF0aFwiIHx8IHByb3AgPT09IFwiZGVzdFwiKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBlcnJbcHJvcF0gPSBjdHhbcHJvcF07XG4gIH1cblxuICBlcnIuY29kZSA9IGNvZGU7XG5cbiAgaWYgKHBhdGgpIHtcbiAgICBlcnIucGF0aCA9IHBhdGg7XG4gIH1cblxuICBpZiAoZGVzdCkge1xuICAgIGVyci5kZXN0ID0gZGVzdDtcbiAgfVxuXG4gIHJldHVybiBjYXB0dXJlTGFyZ2VyU3RhY2tUcmFjZShlcnIpO1xufSk7XG5cbi8qKlxuICogRGVwcmVjYXRlZCwgbmV3IGZ1bmN0aW9uIGlzIGB1dkV4Y2VwdGlvbldpdGhIb3N0UG9ydCgpYFxuICogTmV3IGZ1bmN0aW9uIGFkZGVkIHRoZSBlcnJvciBkZXNjcmlwdGlvbiBkaXJlY3RseVxuICogZnJvbSBDKysuIHRoaXMgbWV0aG9kIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eVxuICogQHBhcmFtIGVyciBBIGxpYnV2IGVycm9yIG51bWJlclxuICogQHBhcmFtIHN5c2NhbGxcbiAqIEBwYXJhbSBhZGRyZXNzXG4gKiBAcGFyYW0gcG9ydFxuICogQHBhcmFtIGFkZGl0aW9uYWxcbiAqL1xuZXhwb3J0IGNvbnN0IGV4Y2VwdGlvbldpdGhIb3N0UG9ydCA9IGhpZGVTdGFja0ZyYW1lcyhcbiAgZnVuY3Rpb24gZXhjZXB0aW9uV2l0aEhvc3RQb3J0KFxuICAgIGVycjogbnVtYmVyLFxuICAgIHN5c2NhbGw6IHN0cmluZyxcbiAgICBhZGRyZXNzOiBzdHJpbmcsXG4gICAgcG9ydDogbnVtYmVyLFxuICAgIGFkZGl0aW9uYWw6IHN0cmluZyxcbiAgKSB7XG4gICAgY29uc3QgY29kZSA9IGdldFN5c3RlbUVycm9yTmFtZShlcnIpO1xuICAgIGxldCBkZXRhaWxzID0gXCJcIjtcblxuICAgIGlmIChwb3J0ICYmIHBvcnQgPiAwKSB7XG4gICAgICBkZXRhaWxzID0gYCAke2FkZHJlc3N9OiR7cG9ydH1gO1xuICAgIH0gZWxzZSBpZiAoYWRkcmVzcykge1xuICAgICAgZGV0YWlscyA9IGAgJHthZGRyZXNzfWA7XG4gICAgfVxuXG4gICAgaWYgKGFkZGl0aW9uYWwpIHtcbiAgICAgIGRldGFpbHMgKz0gYCAtIExvY2FsICgke2FkZGl0aW9uYWx9KWA7XG4gICAgfVxuXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCBleDogYW55ID0gbmV3IEVycm9yKGAke3N5c2NhbGx9ICR7Y29kZX0ke2RldGFpbHN9YCk7XG4gICAgZXguZXJybm8gPSBlcnI7XG4gICAgZXguY29kZSA9IGNvZGU7XG4gICAgZXguc3lzY2FsbCA9IHN5c2NhbGw7XG4gICAgZXguYWRkcmVzcyA9IGFkZHJlc3M7XG5cbiAgICBpZiAocG9ydCkge1xuICAgICAgZXgucG9ydCA9IHBvcnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhcHR1cmVMYXJnZXJTdGFja1RyYWNlKGV4KTtcbiAgfSxcbik7XG5cbi8qKlxuICogQHBhcmFtIGNvZGUgQSBsaWJ1diBlcnJvciBudW1iZXIgb3IgYSBjLWFyZXMgZXJyb3IgY29kZVxuICogQHBhcmFtIHN5c2NhbGxcbiAqIEBwYXJhbSBob3N0bmFtZVxuICovXG5leHBvcnQgY29uc3QgZG5zRXhjZXB0aW9uID0gaGlkZVN0YWNrRnJhbWVzKGZ1bmN0aW9uIChjb2RlLCBzeXNjYWxsLCBob3N0bmFtZSkge1xuICBsZXQgZXJybm87XG5cbiAgLy8gSWYgYGNvZGVgIGlzIG9mIHR5cGUgbnVtYmVyLCBpdCBpcyBhIGxpYnV2IGVycm9yIG51bWJlciwgZWxzZSBpdCBpcyBhXG4gIC8vIGMtYXJlcyBlcnJvciBjb2RlLlxuICBpZiAodHlwZW9mIGNvZGUgPT09IFwibnVtYmVyXCIpIHtcbiAgICBlcnJubyA9IGNvZGU7XG4gICAgLy8gRU5PVEZPVU5EIGlzIG5vdCBhIHByb3BlciBQT1NJWCBlcnJvciwgYnV0IHRoaXMgZXJyb3IgaGFzIGJlZW4gaW4gcGxhY2VcbiAgICAvLyBsb25nIGVub3VnaCB0aGF0IGl0J3Mgbm90IHByYWN0aWNhbCB0byByZW1vdmUgaXQuXG4gICAgaWYgKFxuICAgICAgY29kZSA9PT0gY29kZU1hcC5nZXQoXCJFQUlfTk9EQVRBXCIpIHx8XG4gICAgICBjb2RlID09PSBjb2RlTWFwLmdldChcIkVBSV9OT05BTUVcIilcbiAgICApIHtcbiAgICAgIGNvZGUgPSBcIkVOT1RGT1VORFwiOyAvLyBGYWJyaWNhdGVkIGVycm9yIG5hbWUuXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvZGUgPSBnZXRTeXN0ZW1FcnJvck5hbWUoY29kZSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbWVzc2FnZSA9IGAke3N5c2NhbGx9ICR7Y29kZX0ke2hvc3RuYW1lID8gYCAke2hvc3RuYW1lfWAgOiBcIlwifWA7XG5cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgY29uc3QgZXg6IGFueSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgZXguZXJybm8gPSBlcnJubztcbiAgZXguY29kZSA9IGNvZGU7XG4gIGV4LnN5c2NhbGwgPSBzeXNjYWxsO1xuXG4gIGlmIChob3N0bmFtZSkge1xuICAgIGV4Lmhvc3RuYW1lID0gaG9zdG5hbWU7XG4gIH1cblxuICByZXR1cm4gY2FwdHVyZUxhcmdlclN0YWNrVHJhY2UoZXgpO1xufSk7XG5cbi8qKlxuICogQWxsIGVycm9yIGluc3RhbmNlcyBpbiBOb2RlIGhhdmUgYWRkaXRpb25hbCBtZXRob2RzIGFuZCBwcm9wZXJ0aWVzXG4gKiBUaGlzIGV4cG9ydCBjbGFzcyBpcyBtZWFudCB0byBiZSBleHRlbmRlZCBieSB0aGVzZSBpbnN0YW5jZXMgYWJzdHJhY3RpbmcgbmF0aXZlIEpTIGVycm9yIGluc3RhbmNlc1xuICovXG5leHBvcnQgY2xhc3MgTm9kZUVycm9yQWJzdHJhY3Rpb24gZXh0ZW5kcyBFcnJvciB7XG4gIGNvZGU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIGNvZGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5jb2RlID0gY29kZTtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIC8vVGhpcyBudW1iZXIgY2hhbmdlcyBkZXBlbmRpbmcgb24gdGhlIG5hbWUgb2YgdGhpcyBjbGFzc1xuICAgIC8vMjAgY2hhcmFjdGVycyBhcyBvZiBub3dcbiAgICB0aGlzLnN0YWNrID0gdGhpcy5zdGFjayAmJiBgJHtuYW1lfSBbJHt0aGlzLmNvZGV9XSR7dGhpcy5zdGFjay5zbGljZSgyMCl9YDtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBgJHt0aGlzLm5hbWV9IFske3RoaXMuY29kZX1dOiAke3RoaXMubWVzc2FnZX1gO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBOb2RlRXJyb3IgZXh0ZW5kcyBOb2RlRXJyb3JBYnN0cmFjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKGNvZGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoRXJyb3IucHJvdG90eXBlLm5hbWUsIGNvZGUsIG1lc3NhZ2UpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBOb2RlU3ludGF4RXJyb3IgZXh0ZW5kcyBOb2RlRXJyb3JBYnN0cmFjdGlvblxuICBpbXBsZW1lbnRzIFN5bnRheEVycm9yIHtcbiAgY29uc3RydWN0b3IoY29kZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihTeW50YXhFcnJvci5wcm90b3R5cGUubmFtZSwgY29kZSwgbWVzc2FnZSk7XG4gICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsIFN5bnRheEVycm9yLnByb3RvdHlwZSk7XG4gICAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBgJHt0aGlzLm5hbWV9IFske3RoaXMuY29kZX1dOiAke3RoaXMubWVzc2FnZX1gO1xuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE5vZGVSYW5nZUVycm9yIGV4dGVuZHMgTm9kZUVycm9yQWJzdHJhY3Rpb24ge1xuICBjb25zdHJ1Y3Rvcihjb2RlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHN1cGVyKFJhbmdlRXJyb3IucHJvdG90eXBlLm5hbWUsIGNvZGUsIG1lc3NhZ2UpO1xuICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZih0aGlzLCBSYW5nZUVycm9yLnByb3RvdHlwZSk7XG4gICAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBgJHt0aGlzLm5hbWV9IFske3RoaXMuY29kZX1dOiAke3RoaXMubWVzc2FnZX1gO1xuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE5vZGVUeXBlRXJyb3IgZXh0ZW5kcyBOb2RlRXJyb3JBYnN0cmFjdGlvbiBpbXBsZW1lbnRzIFR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKGNvZGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoVHlwZUVycm9yLnByb3RvdHlwZS5uYW1lLCBjb2RlLCBtZXNzYWdlKTtcbiAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YodGhpcywgVHlwZUVycm9yLnByb3RvdHlwZSk7XG4gICAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBgJHt0aGlzLm5hbWV9IFske3RoaXMuY29kZX1dOiAke3RoaXMubWVzc2FnZX1gO1xuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE5vZGVVUklFcnJvciBleHRlbmRzIE5vZGVFcnJvckFic3RyYWN0aW9uIGltcGxlbWVudHMgVVJJRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcihjb2RlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHN1cGVyKFVSSUVycm9yLnByb3RvdHlwZS5uYW1lLCBjb2RlLCBtZXNzYWdlKTtcbiAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YodGhpcywgVVJJRXJyb3IucHJvdG90eXBlKTtcbiAgICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGAke3RoaXMubmFtZX0gWyR7dGhpcy5jb2RlfV06ICR7dGhpcy5tZXNzYWdlfWA7XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfQVJHX1RZUEUgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBleHBlY3RlZDogc3RyaW5nIHwgc3RyaW5nW10sIGFjdHVhbDogdW5rbm93bikge1xuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9ibG9iL2YzZWIyMjQvbGliL2ludGVybmFsL2Vycm9ycy5qcyNMMTAzNy1MMTA4N1xuICAgIGV4cGVjdGVkID0gQXJyYXkuaXNBcnJheShleHBlY3RlZCkgPyBleHBlY3RlZCA6IFtleHBlY3RlZF07XG4gICAgbGV0IG1zZyA9IFwiVGhlIFwiO1xuICAgIGlmIChuYW1lLmVuZHNXaXRoKFwiIGFyZ3VtZW50XCIpKSB7XG4gICAgICAvLyBGb3IgY2FzZXMgbGlrZSAnZmlyc3QgYXJndW1lbnQnXG4gICAgICBtc2cgKz0gYCR7bmFtZX0gYDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdHlwZSA9IG5hbWUuaW5jbHVkZXMoXCIuXCIpID8gXCJwcm9wZXJ0eVwiIDogXCJhcmd1bWVudFwiO1xuICAgICAgbXNnICs9IGBcIiR7bmFtZX1cIiAke3R5cGV9IGA7XG4gICAgfVxuICAgIG1zZyArPSBcIm11c3QgYmUgXCI7XG5cbiAgICBjb25zdCB0eXBlcyA9IFtdO1xuICAgIGNvbnN0IGluc3RhbmNlcyA9IFtdO1xuICAgIGNvbnN0IG90aGVyID0gW107XG4gICAgZm9yIChjb25zdCB2YWx1ZSBvZiBleHBlY3RlZCkge1xuICAgICAgaWYgKGtUeXBlcy5pbmNsdWRlcyh2YWx1ZSkpIHtcbiAgICAgICAgdHlwZXMucHVzaCh2YWx1ZS50b0xvY2FsZUxvd2VyQ2FzZSgpKTtcbiAgICAgIH0gZWxzZSBpZiAoY2xhc3NSZWdFeHAudGVzdCh2YWx1ZSkpIHtcbiAgICAgICAgaW5zdGFuY2VzLnB1c2godmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3RoZXIucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU3BlY2lhbCBoYW5kbGUgYG9iamVjdGAgaW4gY2FzZSBvdGhlciBpbnN0YW5jZXMgYXJlIGFsbG93ZWQgdG8gb3V0bGluZVxuICAgIC8vIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGVhY2ggb3RoZXIuXG4gICAgaWYgKGluc3RhbmNlcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBwb3MgPSB0eXBlcy5pbmRleE9mKFwib2JqZWN0XCIpO1xuICAgICAgaWYgKHBvcyAhPT0gLTEpIHtcbiAgICAgICAgdHlwZXMuc3BsaWNlKHBvcywgMSk7XG4gICAgICAgIGluc3RhbmNlcy5wdXNoKFwiT2JqZWN0XCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlcy5sZW5ndGggPiAwKSB7XG4gICAgICBpZiAodHlwZXMubGVuZ3RoID4gMikge1xuICAgICAgICBjb25zdCBsYXN0ID0gdHlwZXMucG9wKCk7XG4gICAgICAgIG1zZyArPSBgb25lIG9mIHR5cGUgJHt0eXBlcy5qb2luKFwiLCBcIil9LCBvciAke2xhc3R9YDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZXMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIG1zZyArPSBgb25lIG9mIHR5cGUgJHt0eXBlc1swXX0gb3IgJHt0eXBlc1sxXX1gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbXNnICs9IGBvZiB0eXBlICR7dHlwZXNbMF19YDtcbiAgICAgIH1cbiAgICAgIGlmIChpbnN0YW5jZXMubGVuZ3RoID4gMCB8fCBvdGhlci5sZW5ndGggPiAwKSB7XG4gICAgICAgIG1zZyArPSBcIiBvciBcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaW5zdGFuY2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmIChpbnN0YW5jZXMubGVuZ3RoID4gMikge1xuICAgICAgICBjb25zdCBsYXN0ID0gaW5zdGFuY2VzLnBvcCgpO1xuICAgICAgICBtc2cgKz0gYGFuIGluc3RhbmNlIG9mICR7aW5zdGFuY2VzLmpvaW4oXCIsIFwiKX0sIG9yICR7bGFzdH1gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbXNnICs9IGBhbiBpbnN0YW5jZSBvZiAke2luc3RhbmNlc1swXX1gO1xuICAgICAgICBpZiAoaW5zdGFuY2VzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgIG1zZyArPSBgIG9yICR7aW5zdGFuY2VzWzFdfWA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChvdGhlci5sZW5ndGggPiAwKSB7XG4gICAgICAgIG1zZyArPSBcIiBvciBcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3RoZXIubGVuZ3RoID4gMCkge1xuICAgICAgaWYgKG90aGVyLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgY29uc3QgbGFzdCA9IG90aGVyLnBvcCgpO1xuICAgICAgICBtc2cgKz0gYG9uZSBvZiAke290aGVyLmpvaW4oXCIsIFwiKX0sIG9yICR7bGFzdH1gO1xuICAgICAgfSBlbHNlIGlmIChvdGhlci5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgbXNnICs9IGBvbmUgb2YgJHtvdGhlclswXX0gb3IgJHtvdGhlclsxXX1gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG90aGVyWzBdLnRvTG93ZXJDYXNlKCkgIT09IG90aGVyWzBdKSB7XG4gICAgICAgICAgbXNnICs9IFwiYW4gXCI7XG4gICAgICAgIH1cbiAgICAgICAgbXNnICs9IGAke290aGVyWzBdfWA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0FSR19UWVBFXCIsXG4gICAgICBgJHttc2d9LiR7aW52YWxpZEFyZ1R5cGVIZWxwZXIoYWN0dWFsKX1gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX0FSR19WQUxVRSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duLCByZWFzb246IHN0cmluZyA9IFwiaXMgaW52YWxpZFwiKSB7XG4gICAgY29uc3QgdHlwZSA9IG5hbWUuaW5jbHVkZXMoXCIuXCIpID8gXCJwcm9wZXJ0eVwiIDogXCJhcmd1bWVudFwiO1xuICAgIGNvbnN0IGluc3BlY3RlZCA9IGluc3BlY3QodmFsdWUpO1xuXG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0FSR19WQUxVRVwiLFxuICAgICAgYFRoZSAke3R5cGV9ICcke25hbWV9JyAke3JlYXNvbn0uIFJlY2VpdmVkICR7aW5zcGVjdGVkfWAsXG4gICAgKTtcbiAgfVxufVxuXG4vLyBBIGhlbHBlciBmdW5jdGlvbiB0byBzaW1wbGlmeSBjaGVja2luZyBmb3IgRVJSX0lOVkFMSURfQVJHX1RZUEUgb3V0cHV0LlxuLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbmZ1bmN0aW9uIGludmFsaWRBcmdUeXBlSGVscGVyKGlucHV0OiBhbnkpIHtcbiAgaWYgKGlucHV0ID09IG51bGwpIHtcbiAgICByZXR1cm4gYCBSZWNlaXZlZCAke2lucHV0fWA7XG4gIH1cbiAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gXCJmdW5jdGlvblwiICYmIGlucHV0Lm5hbWUpIHtcbiAgICByZXR1cm4gYCBSZWNlaXZlZCBmdW5jdGlvbiAke2lucHV0Lm5hbWV9YDtcbiAgfVxuICBpZiAodHlwZW9mIGlucHV0ID09PSBcIm9iamVjdFwiKSB7XG4gICAgaWYgKGlucHV0LmNvbnN0cnVjdG9yICYmIGlucHV0LmNvbnN0cnVjdG9yLm5hbWUpIHtcbiAgICAgIHJldHVybiBgIFJlY2VpdmVkIGFuIGluc3RhbmNlIG9mICR7aW5wdXQuY29uc3RydWN0b3IubmFtZX1gO1xuICAgIH1cbiAgICByZXR1cm4gYCBSZWNlaXZlZCAke2luc3BlY3QoaW5wdXQsIHsgZGVwdGg6IC0xIH0pfWA7XG4gIH1cbiAgbGV0IGluc3BlY3RlZCA9IGluc3BlY3QoaW5wdXQsIHsgY29sb3JzOiBmYWxzZSB9KTtcbiAgaWYgKGluc3BlY3RlZC5sZW5ndGggPiAyNSkge1xuICAgIGluc3BlY3RlZCA9IGAke2luc3BlY3RlZC5zbGljZSgwLCAyNSl9Li4uYDtcbiAgfVxuICByZXR1cm4gYCBSZWNlaXZlZCB0eXBlICR7dHlwZW9mIGlucHV0fSAoJHtpbnNwZWN0ZWR9KWA7XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfT1VUX09GX1JBTkdFIGV4dGVuZHMgUmFuZ2VFcnJvciB7XG4gIGNvZGUgPSBcIkVSUl9PVVRfT0ZfUkFOR0VcIjtcblxuICBjb25zdHJ1Y3RvcihzdHI6IHN0cmluZywgcmFuZ2U6IHN0cmluZywgcmVjZWl2ZWQ6IHVua25vd24pIHtcbiAgICBzdXBlcihcbiAgICAgIGBUaGUgdmFsdWUgb2YgXCIke3N0cn1cIiBpcyBvdXQgb2YgcmFuZ2UuIEl0IG11c3QgYmUgJHtyYW5nZX0uIFJlY2VpdmVkICR7cmVjZWl2ZWR9YCxcbiAgICApO1xuXG4gICAgY29uc3QgeyBuYW1lIH0gPSB0aGlzO1xuICAgIC8vIEFkZCB0aGUgZXJyb3IgY29kZSB0byB0aGUgbmFtZSB0byBpbmNsdWRlIGl0IGluIHRoZSBzdGFjayB0cmFjZS5cbiAgICB0aGlzLm5hbWUgPSBgJHtuYW1lfSBbJHt0aGlzLmNvZGV9XWA7XG4gICAgLy8gQWNjZXNzIHRoZSBzdGFjayB0byBnZW5lcmF0ZSB0aGUgZXJyb3IgbWVzc2FnZSBpbmNsdWRpbmcgdGhlIGVycm9yIGNvZGUgZnJvbSB0aGUgbmFtZS5cbiAgICB0aGlzLnN0YWNrO1xuICAgIC8vIFJlc2V0IHRoZSBuYW1lIHRvIHRoZSBhY3R1YWwgbmFtZS5cbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQU1CSUdVT1VTX0FSR1VNRU5UIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXCJFUlJfQU1CSUdVT1VTX0FSR1VNRU5UXCIsIGBUaGUgXCIke3h9XCIgYXJndW1lbnQgaXMgYW1iaWd1b3VzLiAke3l9YCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9BUkdfTk9UX0lURVJBQkxFIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFwiRVJSX0FSR19OT1RfSVRFUkFCTEVcIiwgYCR7eH0gbXVzdCBiZSBpdGVyYWJsZWApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQVNTRVJUSU9OIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXCJFUlJfQVNTRVJUSU9OXCIsIGAke3h9YCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9BU1lOQ19DQUxMQkFDSyBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcIkVSUl9BU1lOQ19DQUxMQkFDS1wiLCBgJHt4fSBtdXN0IGJlIGEgZnVuY3Rpb25gKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0FTWU5DX1RZUEUgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXCJFUlJfQVNZTkNfVFlQRVwiLCBgSW52YWxpZCBuYW1lIGZvciBhc3luYyBcInR5cGVcIjogJHt4fWApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQlJPVExJX0lOVkFMSURfUEFSQU0gZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFwiRVJSX0JST1RMSV9JTlZBTElEX1BBUkFNXCIsIGAke3h9IGlzIG5vdCBhIHZhbGlkIEJyb3RsaSBwYXJhbWV0ZXJgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0JVRkZFUl9PVVRfT0ZfQk9VTkRTIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihuYW1lPzogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9CVUZGRVJfT1VUX09GX0JPVU5EU1wiLFxuICAgICAgbmFtZVxuICAgICAgICA/IGBcIiR7bmFtZX1cIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHNgXG4gICAgICAgIDogXCJBdHRlbXB0IHRvIGFjY2VzcyBtZW1vcnkgb3V0c2lkZSBidWZmZXIgYm91bmRzXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0JVRkZFUl9UT09fTEFSR0UgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQlVGRkVSX1RPT19MQVJHRVwiLFxuICAgICAgYENhbm5vdCBjcmVhdGUgYSBCdWZmZXIgbGFyZ2VyIHRoYW4gJHt4fSBieXRlc2AsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NBTk5PVF9XQVRDSF9TSUdJTlQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NBTk5PVF9XQVRDSF9TSUdJTlRcIixcbiAgICAgIFwiQ2Fubm90IHdhdGNoIGZvciBTSUdJTlQgc2lnbmFsc1wiLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DSElMRF9DTE9TRURfQkVGT1JFX1JFUExZIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DSElMRF9DTE9TRURfQkVGT1JFX1JFUExZXCIsXG4gICAgICBcIkNoaWxkIGNsb3NlZCBiZWZvcmUgcmVwbHkgcmVjZWl2ZWRcIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ0hJTERfUFJPQ0VTU19JUENfUkVRVUlSRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NISUxEX1BST0NFU1NfSVBDX1JFUVVJUkVEXCIsXG4gICAgICBgRm9ya2VkIHByb2Nlc3NlcyBtdXN0IGhhdmUgYW4gSVBDIGNoYW5uZWwsIG1pc3NpbmcgdmFsdWUgJ2lwYycgaW4gJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NISUxEX1BST0NFU1NfU1RESU9fTUFYQlVGRkVSIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NISUxEX1BST0NFU1NfU1RESU9fTUFYQlVGRkVSXCIsXG4gICAgICBgJHt4fSBtYXhCdWZmZXIgbGVuZ3RoIGV4Y2VlZGVkYCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ09OU09MRV9XUklUQUJMRV9TVFJFQU0gZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DT05TT0xFX1dSSVRBQkxFX1NUUkVBTVwiLFxuICAgICAgYENvbnNvbGUgZXhwZWN0cyBhIHdyaXRhYmxlIHN0cmVhbSBpbnN0YW5jZSBmb3IgJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NPTlRFWFRfTk9UX0lOSVRJQUxJWkVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DT05URVhUX05PVF9JTklUSUFMSVpFRFwiLFxuICAgICAgXCJjb250ZXh0IHVzZWQgaXMgbm90IGluaXRpYWxpemVkXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NQVV9VU0FHRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1BVX1VTQUdFXCIsXG4gICAgICBgVW5hYmxlIHRvIG9idGFpbiBjcHUgdXNhZ2UgJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19DVVNUT01fRU5HSU5FX05PVF9TVVBQT1JURUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19DVVNUT01fRU5HSU5FX05PVF9TVVBQT1JURURcIixcbiAgICAgIFwiQ3VzdG9tIGVuZ2luZXMgbm90IHN1cHBvcnRlZCBieSB0aGlzIE9wZW5TU0xcIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ1JZUFRPX0VDREhfSU5WQUxJRF9GT1JNQVQgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DUllQVE9fRUNESF9JTlZBTElEX0ZPUk1BVFwiLFxuICAgICAgYEludmFsaWQgRUNESCBmb3JtYXQ6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DUllQVE9fRUNESF9JTlZBTElEX1BVQkxJQ19LRVkgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19FQ0RIX0lOVkFMSURfUFVCTElDX0tFWVwiLFxuICAgICAgXCJQdWJsaWMga2V5IGlzIG5vdCB2YWxpZCBmb3Igc3BlY2lmaWVkIGN1cnZlXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19FTkdJTkVfVU5LTk9XTiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX0VOR0lORV9VTktOT1dOXCIsXG4gICAgICBgRW5naW5lIFwiJHt4fVwiIHdhcyBub3QgZm91bmRgLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DUllQVE9fRklQU19GT1JDRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19GSVBTX0ZPUkNFRFwiLFxuICAgICAgXCJDYW5ub3Qgc2V0IEZJUFMgbW9kZSwgaXQgd2FzIGZvcmNlZCB3aXRoIC0tZm9yY2UtZmlwcyBhdCBzdGFydHVwLlwiLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DUllQVE9fRklQU19VTkFWQUlMQUJMRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX0ZJUFNfVU5BVkFJTEFCTEVcIixcbiAgICAgIFwiQ2Fubm90IHNldCBGSVBTIG1vZGUgaW4gYSBub24tRklQUyBidWlsZC5cIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ1JZUFRPX0hBU0hfRklOQUxJWkVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DUllQVE9fSEFTSF9GSU5BTElaRURcIixcbiAgICAgIFwiRGlnZXN0IGFscmVhZHkgY2FsbGVkXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19IQVNIX1VQREFURV9GQUlMRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19IQVNIX1VQREFURV9GQUlMRURcIixcbiAgICAgIFwiSGFzaCB1cGRhdGUgZmFpbGVkXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19JTkNPTVBBVElCTEVfS0VZIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19JTkNPTVBBVElCTEVfS0VZXCIsXG4gICAgICBgSW5jb21wYXRpYmxlICR7eH06ICR7eX1gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DUllQVE9fSU5DT01QQVRJQkxFX0tFWV9PUFRJT05TIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19JTkNPTVBBVElCTEVfS0VZX09QVElPTlNcIixcbiAgICAgIGBUaGUgc2VsZWN0ZWQga2V5IGVuY29kaW5nICR7eH0gJHt5fS5gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DUllQVE9fSU5WQUxJRF9ESUdFU1QgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DUllQVE9fSU5WQUxJRF9ESUdFU1RcIixcbiAgICAgIGBJbnZhbGlkIGRpZ2VzdDogJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19JTlZBTElEX0tFWV9PQkpFQ1RfVFlQRSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcsIHk6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX0lOVkFMSURfS0VZX09CSkVDVF9UWVBFXCIsXG4gICAgICBgSW52YWxpZCBrZXkgb2JqZWN0IHR5cGUgJHt4fSwgZXhwZWN0ZWQgJHt5fS5gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DUllQVE9fSU5WQUxJRF9TVEFURSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX0lOVkFMSURfU1RBVEVcIixcbiAgICAgIGBJbnZhbGlkIHN0YXRlIGZvciBvcGVyYXRpb24gJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19QQktERjJfRVJST1IgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19QQktERjJfRVJST1JcIixcbiAgICAgIFwiUEJLREYyIGVycm9yXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19TQ1JZUFRfSU5WQUxJRF9QQVJBTUVURVIgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19TQ1JZUFRfSU5WQUxJRF9QQVJBTUVURVJcIixcbiAgICAgIFwiSW52YWxpZCBzY3J5cHQgcGFyYW1ldGVyXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19TQ1JZUFRfTk9UX1NVUFBPUlRFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX1NDUllQVF9OT1RfU1VQUE9SVEVEXCIsXG4gICAgICBcIlNjcnlwdCBhbGdvcml0aG0gbm90IHN1cHBvcnRlZFwiLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DUllQVE9fU0lHTl9LRVlfUkVRVUlSRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19TSUdOX0tFWV9SRVFVSVJFRFwiLFxuICAgICAgXCJObyBrZXkgcHJvdmlkZWQgdG8gc2lnblwiLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9ESVJfQ0xPU0VEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9ESVJfQ0xPU0VEXCIsXG4gICAgICBcIkRpcmVjdG9yeSBoYW5kbGUgd2FzIGNsb3NlZFwiLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9ESVJfQ09OQ1VSUkVOVF9PUEVSQVRJT04gZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0RJUl9DT05DVVJSRU5UX09QRVJBVElPTlwiLFxuICAgICAgXCJDYW5ub3QgZG8gc3luY2hyb25vdXMgd29yayBvbiBkaXJlY3RvcnkgaGFuZGxlIHdpdGggY29uY3VycmVudCBhc3luY2hyb25vdXMgb3BlcmF0aW9uc1wiLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9ETlNfU0VUX1NFUlZFUlNfRkFJTEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0ROU19TRVRfU0VSVkVSU19GQUlMRURcIixcbiAgICAgIGBjLWFyZXMgZmFpbGVkIHRvIHNldCBzZXJ2ZXJzOiBcIiR7eH1cIiBbJHt5fV1gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9ET01BSU5fQ0FMTEJBQ0tfTk9UX0FWQUlMQUJMRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfRE9NQUlOX0NBTExCQUNLX05PVF9BVkFJTEFCTEVcIixcbiAgICAgIFwiQSBjYWxsYmFjayB3YXMgcmVnaXN0ZXJlZCB0aHJvdWdoIFwiICtcbiAgICAgICAgXCJwcm9jZXNzLnNldFVuY2F1Z2h0RXhjZXB0aW9uQ2FwdHVyZUNhbGxiYWNrKCksIHdoaWNoIGlzIG11dHVhbGx5IFwiICtcbiAgICAgICAgXCJleGNsdXNpdmUgd2l0aCB1c2luZyB0aGUgYGRvbWFpbmAgbW9kdWxlXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0RPTUFJTl9DQU5OT1RfU0VUX1VOQ0FVR0hUX0VYQ0VQVElPTl9DQVBUVVJFXG4gIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9ET01BSU5fQ0FOTk9UX1NFVF9VTkNBVUdIVF9FWENFUFRJT05fQ0FQVFVSRVwiLFxuICAgICAgXCJUaGUgYGRvbWFpbmAgbW9kdWxlIGlzIGluIHVzZSwgd2hpY2ggaXMgbXV0dWFsbHkgZXhjbHVzaXZlIHdpdGggY2FsbGluZyBcIiArXG4gICAgICAgIFwicHJvY2Vzcy5zZXRVbmNhdWdodEV4Y2VwdGlvbkNhcHR1cmVDYWxsYmFjaygpXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0VOQ09ESU5HX0lOVkFMSURfRU5DT0RFRF9EQVRBIGV4dGVuZHMgTm9kZUVycm9yQWJzdHJhY3Rpb25cbiAgaW1wbGVtZW50cyBUeXBlRXJyb3Ige1xuICBlcnJubzogbnVtYmVyO1xuICBjb25zdHJ1Y3RvcihlbmNvZGluZzogc3RyaW5nLCByZXQ6IG51bWJlcikge1xuICAgIHN1cGVyKFxuICAgICAgVHlwZUVycm9yLnByb3RvdHlwZS5uYW1lLFxuICAgICAgXCJFUlJfRU5DT0RJTkdfSU5WQUxJRF9FTkNPREVEX0RBVEFcIixcbiAgICAgIGBUaGUgZW5jb2RlZCBkYXRhIHdhcyBub3QgdmFsaWQgZm9yIGVuY29kaW5nICR7ZW5jb2Rpbmd9YCxcbiAgICApO1xuICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZih0aGlzLCBUeXBlRXJyb3IucHJvdG90eXBlKTtcblxuICAgIHRoaXMuZXJybm8gPSByZXQ7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9FTkNPRElOR19OT1RfU1VQUE9SVEVEIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0VOQ09ESU5HX05PVF9TVVBQT1JURURcIixcbiAgICAgIGBUaGUgXCIke3h9XCIgZW5jb2RpbmcgaXMgbm90IHN1cHBvcnRlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9FVkFMX0VTTV9DQU5OT1RfUFJJTlQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0VWQUxfRVNNX0NBTk5PVF9QUklOVFwiLFxuICAgICAgYC0tcHJpbnQgY2Fubm90IGJlIHVzZWQgd2l0aCBFU00gaW5wdXRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfRVZFTlRfUkVDVVJTSU9OIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9FVkVOVF9SRUNVUlNJT05cIixcbiAgICAgIGBUaGUgZXZlbnQgXCIke3h9XCIgaXMgYWxyZWFkeSBiZWluZyBkaXNwYXRjaGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0ZFQVRVUkVfVU5BVkFJTEFCTEVfT05fUExBVEZPUk0gZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9GRUFUVVJFX1VOQVZBSUxBQkxFX09OX1BMQVRGT1JNXCIsXG4gICAgICBgVGhlIGZlYXR1cmUgJHt4fSBpcyB1bmF2YWlsYWJsZSBvbiB0aGUgY3VycmVudCBwbGF0Zm9ybSwgd2hpY2ggaXMgYmVpbmcgdXNlZCB0byBydW4gTm9kZS5qc2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9GU19GSUxFX1RPT19MQVJHRSBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9GU19GSUxFX1RPT19MQVJHRVwiLFxuICAgICAgYEZpbGUgc2l6ZSAoJHt4fSkgaXMgZ3JlYXRlciB0aGFuIDIgR0JgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfRlNfSU5WQUxJRF9TWU1MSU5LX1RZUEUgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0ZTX0lOVkFMSURfU1lNTElOS19UWVBFXCIsXG4gICAgICBgU3ltbGluayB0eXBlIG11c3QgYmUgb25lIG9mIFwiZGlyXCIsIFwiZmlsZVwiLCBvciBcImp1bmN0aW9uXCIuIFJlY2VpdmVkIFwiJHt4fVwiYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0FMVFNWQ19JTlZBTElEX09SSUdJTiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0FMVFNWQ19JTlZBTElEX09SSUdJTlwiLFxuICAgICAgYEhUVFAvMiBBTFRTVkMgZnJhbWVzIHJlcXVpcmUgYSB2YWxpZCBvcmlnaW5gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfQUxUU1ZDX0xFTkdUSCBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0FMVFNWQ19MRU5HVEhcIixcbiAgICAgIGBIVFRQLzIgQUxUU1ZDIGZyYW1lcyBhcmUgbGltaXRlZCB0byAxNjM4MiBieXRlc2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9DT05ORUNUX0FVVEhPUklUWSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfQ09OTkVDVF9BVVRIT1JJVFlcIixcbiAgICAgIGA6YXV0aG9yaXR5IGhlYWRlciBpcyByZXF1aXJlZCBmb3IgQ09OTkVDVCByZXF1ZXN0c2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9DT05ORUNUX1BBVEggZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0NPTk5FQ1RfUEFUSFwiLFxuICAgICAgYFRoZSA6cGF0aCBoZWFkZXIgaXMgZm9yYmlkZGVuIGZvciBDT05ORUNUIHJlcXVlc3RzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0NPTk5FQ1RfU0NIRU1FIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9DT05ORUNUX1NDSEVNRVwiLFxuICAgICAgYFRoZSA6c2NoZW1lIGhlYWRlciBpcyBmb3JiaWRkZW4gZm9yIENPTk5FQ1QgcmVxdWVzdHNgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfR09BV0FZX1NFU1NJT04gZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0dPQVdBWV9TRVNTSU9OXCIsXG4gICAgICBgTmV3IHN0cmVhbXMgY2Fubm90IGJlIGNyZWF0ZWQgYWZ0ZXIgcmVjZWl2aW5nIGEgR09BV0FZYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0hFQURFUlNfQUZURVJfUkVTUE9ORCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfSEVBREVSU19BRlRFUl9SRVNQT05EXCIsXG4gICAgICBgQ2Fubm90IHNwZWNpZnkgYWRkaXRpb25hbCBoZWFkZXJzIGFmdGVyIHJlc3BvbnNlIGluaXRpYXRlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9IRUFERVJTX1NFTlQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0hFQURFUlNfU0VOVFwiLFxuICAgICAgYFJlc3BvbnNlIGhhcyBhbHJlYWR5IGJlZW4gaW5pdGlhdGVkLmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9IRUFERVJfU0lOR0xFX1ZBTFVFIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfSEVBREVSX1NJTkdMRV9WQUxVRVwiLFxuICAgICAgYEhlYWRlciBmaWVsZCBcIiR7eH1cIiBtdXN0IG9ubHkgaGF2ZSBhIHNpbmdsZSB2YWx1ZWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9JTkZPX1NUQVRVU19OT1RfQUxMT1dFRCBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9JTkZPX1NUQVRVU19OT1RfQUxMT1dFRFwiLFxuICAgICAgYEluZm9ybWF0aW9uYWwgc3RhdHVzIGNvZGVzIGNhbm5vdCBiZSB1c2VkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0lOVkFMSURfQ09OTkVDVElPTl9IRUFERVJTIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfSU5WQUxJRF9DT05ORUNUSU9OX0hFQURFUlNcIixcbiAgICAgIGBIVFRQLzEgQ29ubmVjdGlvbiBzcGVjaWZpYyBoZWFkZXJzIGFyZSBmb3JiaWRkZW46IFwiJHt4fVwiYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0lOVkFMSURfSEVBREVSX1ZBTFVFIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9JTlZBTElEX0hFQURFUl9WQUxVRVwiLFxuICAgICAgYEludmFsaWQgdmFsdWUgXCIke3h9XCIgZm9yIGhlYWRlciBcIiR7eX1cImAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9JTlZBTElEX0lORk9fU1RBVFVTIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0lOVkFMSURfSU5GT19TVEFUVVNcIixcbiAgICAgIGBJbnZhbGlkIGluZm9ybWF0aW9uYWwgc3RhdHVzIGNvZGU6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfSU5WQUxJRF9PUklHSU4gZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9JTlZBTElEX09SSUdJTlwiLFxuICAgICAgYEhUVFAvMiBPUklHSU4gZnJhbWVzIHJlcXVpcmUgYSB2YWxpZCBvcmlnaW5gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfSU5WQUxJRF9QQUNLRURfU0VUVElOR1NfTEVOR1RIIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0lOVkFMSURfUEFDS0VEX1NFVFRJTkdTX0xFTkdUSFwiLFxuICAgICAgYFBhY2tlZCBzZXR0aW5ncyBsZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIHNpeGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9JTlZBTElEX1BTRVVET0hFQURFUiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0lOVkFMSURfUFNFVURPSEVBREVSXCIsXG4gICAgICBgXCIke3h9XCIgaXMgYW4gaW52YWxpZCBwc2V1ZG9oZWFkZXIgb3IgaXMgdXNlZCBpbmNvcnJlY3RseWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9JTlZBTElEX1NFU1NJT04gZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0lOVkFMSURfU0VTU0lPTlwiLFxuICAgICAgYFRoZSBzZXNzaW9uIGhhcyBiZWVuIGRlc3Ryb3llZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9JTlZBTElEX1NUUkVBTSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfSU5WQUxJRF9TVFJFQU1cIixcbiAgICAgIGBUaGUgc3RyZWFtIGhhcyBiZWVuIGRlc3Ryb3llZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9NQVhfUEVORElOR19TRVRUSU5HU19BQ0sgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX01BWF9QRU5ESU5HX1NFVFRJTkdTX0FDS1wiLFxuICAgICAgYE1heGltdW0gbnVtYmVyIG9mIHBlbmRpbmcgc2V0dGluZ3MgYWNrbm93bGVkZ2VtZW50c2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9ORVNURURfUFVTSCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfTkVTVEVEX1BVU0hcIixcbiAgICAgIGBBIHB1c2ggc3RyZWFtIGNhbm5vdCBpbml0aWF0ZSBhbm90aGVyIHB1c2ggc3RyZWFtLmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9OT19TT0NLRVRfTUFOSVBVTEFUSU9OIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9OT19TT0NLRVRfTUFOSVBVTEFUSU9OXCIsXG4gICAgICBgSFRUUC8yIHNvY2tldHMgc2hvdWxkIG5vdCBiZSBkaXJlY3RseSBtYW5pcHVsYXRlZCAoZS5nLiByZWFkIGFuZCB3cml0dGVuKWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9PUklHSU5fTEVOR1RIIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfT1JJR0lOX0xFTkdUSFwiLFxuICAgICAgYEhUVFAvMiBPUklHSU4gZnJhbWVzIGFyZSBsaW1pdGVkIHRvIDE2MzgyIGJ5dGVzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX09VVF9PRl9TVFJFQU1TIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9PVVRfT0ZfU1RSRUFNU1wiLFxuICAgICAgYE5vIHN0cmVhbSBJRCBpcyBhdmFpbGFibGUgYmVjYXVzZSBtYXhpbXVtIHN0cmVhbSBJRCBoYXMgYmVlbiByZWFjaGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1BBWUxPQURfRk9SQklEREVOIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9QQVlMT0FEX0ZPUkJJRERFTlwiLFxuICAgICAgYFJlc3BvbnNlcyB3aXRoICR7eH0gc3RhdHVzIG11c3Qgbm90IGhhdmUgYSBwYXlsb2FkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1BJTkdfQ0FOQ0VMIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9QSU5HX0NBTkNFTFwiLFxuICAgICAgYEhUVFAyIHBpbmcgY2FuY2VsbGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1BJTkdfTEVOR1RIIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1BJTkdfTEVOR1RIXCIsXG4gICAgICBgSFRUUDIgcGluZyBwYXlsb2FkIG11c3QgYmUgOCBieXRlc2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9QU0VVRE9IRUFERVJfTk9UX0FMTE9XRUQgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9QU0VVRE9IRUFERVJfTk9UX0FMTE9XRURcIixcbiAgICAgIGBDYW5ub3Qgc2V0IEhUVFAvMiBwc2V1ZG8taGVhZGVyc2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9QVVNIX0RJU0FCTEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9QVVNIX0RJU0FCTEVEXCIsXG4gICAgICBgSFRUUC8yIGNsaWVudCBoYXMgZGlzYWJsZWQgcHVzaCBzdHJlYW1zYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1NFTkRfRklMRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfU0VORF9GSUxFXCIsXG4gICAgICBgRGlyZWN0b3JpZXMgY2Fubm90IGJlIHNlbnRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfU0VORF9GSUxFX05PU0VFSyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfU0VORF9GSUxFX05PU0VFS1wiLFxuICAgICAgYE9mZnNldCBvciBsZW5ndGggY2FuIG9ubHkgYmUgc3BlY2lmaWVkIGZvciByZWd1bGFyIGZpbGVzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1NFU1NJT05fRVJST1IgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1NFU1NJT05fRVJST1JcIixcbiAgICAgIGBTZXNzaW9uIGNsb3NlZCB3aXRoIGVycm9yIGNvZGUgJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9TRVRUSU5HU19DQU5DRUwgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1NFVFRJTkdTX0NBTkNFTFwiLFxuICAgICAgYEhUVFAyIHNlc3Npb24gc2V0dGluZ3MgY2FuY2VsZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfU09DS0VUX0JPVU5EIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9TT0NLRVRfQk9VTkRcIixcbiAgICAgIGBUaGUgc29ja2V0IGlzIGFscmVhZHkgYm91bmQgdG8gYW4gSHR0cDJTZXNzaW9uYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1NPQ0tFVF9VTkJPVU5EIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9TT0NLRVRfVU5CT1VORFwiLFxuICAgICAgYFRoZSBzb2NrZXQgaGFzIGJlZW4gZGlzY29ubmVjdGVkIGZyb20gdGhlIEh0dHAyU2Vzc2lvbmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9TVEFUVVNfMTAxIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9TVEFUVVNfMTAxXCIsXG4gICAgICBgSFRUUCBzdGF0dXMgY29kZSAxMDEgKFN3aXRjaGluZyBQcm90b2NvbHMpIGlzIGZvcmJpZGRlbiBpbiBIVFRQLzJgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfU1RBVFVTX0lOVkFMSUQgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfU1RBVFVTX0lOVkFMSURcIixcbiAgICAgIGBJbnZhbGlkIHN0YXR1cyBjb2RlOiAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1NUUkVBTV9FUlJPUiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfU1RSRUFNX0VSUk9SXCIsXG4gICAgICBgU3RyZWFtIGNsb3NlZCB3aXRoIGVycm9yIGNvZGUgJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9TVFJFQU1fU0VMRl9ERVBFTkRFTkNZIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9TVFJFQU1fU0VMRl9ERVBFTkRFTkNZXCIsXG4gICAgICBgQSBzdHJlYW0gY2Fubm90IGRlcGVuZCBvbiBpdHNlbGZgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfVFJBSUxFUlNfQUxSRUFEWV9TRU5UIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9UUkFJTEVSU19BTFJFQURZX1NFTlRcIixcbiAgICAgIGBUcmFpbGluZyBoZWFkZXJzIGhhdmUgYWxyZWFkeSBiZWVuIHNlbnRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfVFJBSUxFUlNfTk9UX1JFQURZIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9UUkFJTEVSU19OT1RfUkVBRFlcIixcbiAgICAgIGBUcmFpbGluZyBoZWFkZXJzIGNhbm5vdCBiZSBzZW50IHVudGlsIGFmdGVyIHRoZSB3YW50VHJhaWxlcnMgZXZlbnQgaXMgZW1pdHRlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9VTlNVUFBPUlRFRF9QUk9UT0NPTCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfVU5TVVBQT1JURURfUFJPVE9DT0xcIixcbiAgICAgIGBwcm90b2NvbCBcIiR7eH1cIiBpcyB1bnN1cHBvcnRlZC5gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUF9IRUFERVJTX1NFTlQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFBfSEVBREVSU19TRU5UXCIsXG4gICAgICBgQ2Fubm90ICR7eH0gaGVhZGVycyBhZnRlciB0aGV5IGFyZSBzZW50IHRvIHRoZSBjbGllbnRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUF9JTlZBTElEX0hFQURFUl9WQUxVRSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcsIHk6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUF9JTlZBTElEX0hFQURFUl9WQUxVRVwiLFxuICAgICAgYEludmFsaWQgdmFsdWUgXCIke3h9XCIgZm9yIGhlYWRlciBcIiR7eX1cImAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQX0lOVkFMSURfU1RBVFVTX0NPREUgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUF9JTlZBTElEX1NUQVRVU19DT0RFXCIsXG4gICAgICBgSW52YWxpZCBzdGF0dXMgY29kZTogJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQX1NPQ0tFVF9FTkNPRElORyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUF9TT0NLRVRfRU5DT0RJTkdcIixcbiAgICAgIGBDaGFuZ2luZyB0aGUgc29ja2V0IGVuY29kaW5nIGlzIG5vdCBhbGxvd2VkIHBlciBSRkM3MjMwIFNlY3Rpb24gMy5gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUF9UUkFJTEVSX0lOVkFMSUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFBfVFJBSUxFUl9JTlZBTElEXCIsXG4gICAgICBgVHJhaWxlcnMgYXJlIGludmFsaWQgd2l0aCB0aGlzIHRyYW5zZmVyIGVuY29kaW5nYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOQ09NUEFUSUJMRV9PUFRJT05fUEFJUiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcsIHk6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5DT01QQVRJQkxFX09QVElPTl9QQUlSXCIsXG4gICAgICBgT3B0aW9uIFwiJHt4fVwiIGNhbm5vdCBiZSB1c2VkIGluIGNvbWJpbmF0aW9uIHdpdGggb3B0aW9uIFwiJHt5fVwiYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOUFVUX1RZUEVfTk9UX0FMTE9XRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOUFVUX1RZUEVfTk9UX0FMTE9XRURcIixcbiAgICAgIGAtLWlucHV0LXR5cGUgY2FuIG9ubHkgYmUgdXNlZCB3aXRoIHN0cmluZyBpbnB1dCB2aWEgLS1ldmFsLCAtLXByaW50LCBvciBTVERJTmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlNQRUNUT1JfQUxSRUFEWV9BQ1RJVkFURUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOU1BFQ1RPUl9BTFJFQURZX0FDVElWQVRFRFwiLFxuICAgICAgYEluc3BlY3RvciBpcyBhbHJlYWR5IGFjdGl2YXRlZC4gQ2xvc2UgaXQgd2l0aCBpbnNwZWN0b3IuY2xvc2UoKSBiZWZvcmUgYWN0aXZhdGluZyBpdCBhZ2Fpbi5gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5TUEVDVE9SX0FMUkVBRFlfQ09OTkVDVEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlNQRUNUT1JfQUxSRUFEWV9DT05ORUNURURcIixcbiAgICAgIGAke3h9IGlzIGFscmVhZHkgY29ubmVjdGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOU1BFQ1RPUl9DTE9TRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOU1BFQ1RPUl9DTE9TRURcIixcbiAgICAgIGBTZXNzaW9uIHdhcyBjbG9zZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5TUEVDVE9SX0NPTU1BTkQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBudW1iZXIsIHk6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5TUEVDVE9SX0NPTU1BTkRcIixcbiAgICAgIGBJbnNwZWN0b3IgZXJyb3IgJHt4fTogJHt5fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlNQRUNUT1JfTk9UX0FDVElWRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5TUEVDVE9SX05PVF9BQ1RJVkVcIixcbiAgICAgIGBJbnNwZWN0b3IgaXMgbm90IGFjdGl2ZWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlNQRUNUT1JfTk9UX0FWQUlMQUJMRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5TUEVDVE9SX05PVF9BVkFJTEFCTEVcIixcbiAgICAgIGBJbnNwZWN0b3IgaXMgbm90IGF2YWlsYWJsZWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlNQRUNUT1JfTk9UX0NPTk5FQ1RFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5TUEVDVE9SX05PVF9DT05ORUNURURcIixcbiAgICAgIGBTZXNzaW9uIGlzIG5vdCBjb25uZWN0ZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5TUEVDVE9SX05PVF9XT1JLRVIgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOU1BFQ1RPUl9OT1RfV09SS0VSXCIsXG4gICAgICBgQ3VycmVudCB0aHJlYWQgaXMgbm90IGEgd29ya2VyYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfQVNZTkNfSUQgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0FTWU5DX0lEXCIsXG4gICAgICBgSW52YWxpZCAke3h9IHZhbHVlOiAke3l9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfQlVGRkVSX1NJWkUgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9CVUZGRVJfU0laRVwiLFxuICAgICAgYEJ1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfQ0FMTEJBQ0sgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3Iob2JqZWN0OiB1bmtub3duKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0NBTExCQUNLXCIsXG4gICAgICBgQ2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uLiBSZWNlaXZlZCAke2luc3BlY3Qob2JqZWN0KX1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9DVVJTT1JfUE9TIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9DVVJTT1JfUE9TXCIsXG4gICAgICBgQ2Fubm90IHNldCBjdXJzb3Igcm93IHdpdGhvdXQgc2V0dGluZyBpdHMgY29sdW1uYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfRkQgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9GRFwiLFxuICAgICAgYFwiZmRcIiBtdXN0IGJlIGEgcG9zaXRpdmUgaW50ZWdlcjogJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX0ZEX1RZUEUgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0ZEX1RZUEVcIixcbiAgICAgIGBVbnN1cHBvcnRlZCBmZCB0eXBlOiAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfRklMRV9VUkxfSE9TVCBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfRklMRV9VUkxfSE9TVFwiLFxuICAgICAgYEZpbGUgVVJMIGhvc3QgbXVzdCBiZSBcImxvY2FsaG9zdFwiIG9yIGVtcHR5IG9uICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9GSUxFX1VSTF9QQVRIIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9GSUxFX1VSTF9QQVRIXCIsXG4gICAgICBgRmlsZSBVUkwgcGF0aCAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfSEFORExFX1RZUEUgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0hBTkRMRV9UWVBFXCIsXG4gICAgICBgVGhpcyBoYW5kbGUgdHlwZSBjYW5ub3QgYmUgc2VudGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX0hUVFBfVE9LRU4gZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfSFRUUF9UT0tFTlwiLFxuICAgICAgYCR7eH0gbXVzdCBiZSBhIHZhbGlkIEhUVFAgdG9rZW4gW1wiJHt5fVwiXWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX0lQX0FERFJFU1MgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0lQX0FERFJFU1NcIixcbiAgICAgIGBJbnZhbGlkIElQIGFkZHJlc3M6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9PUFRfVkFMVUVfRU5DT0RJTkcgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX09QVF9WQUxVRV9FTkNPRElOR1wiLFxuICAgICAgYFRoZSB2YWx1ZSBcIiR7eH1cIiBpcyBpbnZhbGlkIGZvciBvcHRpb24gXCJlbmNvZGluZ1wiYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfUEVSRk9STUFOQ0VfTUFSSyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9QRVJGT1JNQU5DRV9NQVJLXCIsXG4gICAgICBgVGhlIFwiJHt4fVwiIHBlcmZvcm1hbmNlIG1hcmsgaGFzIG5vdCBiZWVuIHNldGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX1BST1RPQ09MIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX1BST1RPQ09MXCIsXG4gICAgICBgUHJvdG9jb2wgXCIke3h9XCIgbm90IHN1cHBvcnRlZC4gRXhwZWN0ZWQgXCIke3l9XCJgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9SRVBMX0VWQUxfQ09ORklHIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9SRVBMX0VWQUxfQ09ORklHXCIsXG4gICAgICBgQ2Fubm90IHNwZWNpZnkgYm90aCBcImJyZWFrRXZhbE9uU2lnaW50XCIgYW5kIFwiZXZhbFwiIGZvciBSRVBMYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfUkVQTF9JTlBVVCBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfUkVQTF9JTlBVVFwiLFxuICAgICAgYCR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9TWU5DX0ZPUktfSU5QVVQgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX1NZTkNfRk9SS19JTlBVVFwiLFxuICAgICAgYEFzeW5jaHJvbm91cyBmb3JrcyBkbyBub3Qgc3VwcG9ydCBCdWZmZXIsIFR5cGVkQXJyYXksIERhdGFWaWV3IG9yIHN0cmluZyBpbnB1dDogJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX1RISVMgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX1RISVNcIixcbiAgICAgIGBWYWx1ZSBvZiBcInRoaXNcIiBtdXN0IGJlIG9mIHR5cGUgJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX1RVUExFIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX1RVUExFXCIsXG4gICAgICBgJHt4fSBtdXN0IGJlIGFuIGl0ZXJhYmxlICR7eX0gdHVwbGVgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9VUkkgZXh0ZW5kcyBOb2RlVVJJRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfVVJJXCIsXG4gICAgICBgVVJJIG1hbGZvcm1lZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JUENfQ0hBTk5FTF9DTE9TRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lQQ19DSEFOTkVMX0NMT1NFRFwiLFxuICAgICAgYENoYW5uZWwgY2xvc2VkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lQQ19ESVNDT05ORUNURUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lQQ19ESVNDT05ORUNURURcIixcbiAgICAgIGBJUEMgY2hhbm5lbCBpcyBhbHJlYWR5IGRpc2Nvbm5lY3RlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JUENfT05FX1BJUEUgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lQQ19PTkVfUElQRVwiLFxuICAgICAgYENoaWxkIHByb2Nlc3MgY2FuIGhhdmUgb25seSBvbmUgSVBDIHBpcGVgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSVBDX1NZTkNfRk9SSyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSVBDX1NZTkNfRk9SS1wiLFxuICAgICAgYElQQyBjYW5ub3QgYmUgdXNlZCB3aXRoIHN5bmNocm9ub3VzIGZvcmtzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX01BTklGRVNUX0RFUEVOREVOQ1lfTUlTU0lORyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9NQU5JRkVTVF9ERVBFTkRFTkNZX01JU1NJTkdcIixcbiAgICAgIGBNYW5pZmVzdCByZXNvdXJjZSAke3h9IGRvZXMgbm90IGxpc3QgJHt5fSBhcyBhIGRlcGVuZGVuY3kgc3BlY2lmaWVyYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX01BTklGRVNUX0lOVEVHUklUWV9NSVNNQVRDSCBleHRlbmRzIE5vZGVTeW50YXhFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfTUFOSUZFU1RfSU5URUdSSVRZX01JU01BVENIXCIsXG4gICAgICBgTWFuaWZlc3QgcmVzb3VyY2UgJHt4fSBoYXMgbXVsdGlwbGUgZW50cmllcyBidXQgaW50ZWdyaXR5IGxpc3RzIGRvIG5vdCBtYXRjaGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9NQU5JRkVTVF9JTlZBTElEX1JFU09VUkNFX0ZJRUxEIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9NQU5JRkVTVF9JTlZBTElEX1JFU09VUkNFX0ZJRUxEXCIsXG4gICAgICBgTWFuaWZlc3QgcmVzb3VyY2UgJHt4fSBoYXMgaW52YWxpZCBwcm9wZXJ0eSB2YWx1ZSBmb3IgJHt5fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9NQU5JRkVTVF9URFogZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX01BTklGRVNUX1REWlwiLFxuICAgICAgYE1hbmlmZXN0IGluaXRpYWxpemF0aW9uIGhhcyBub3QgeWV0IHJ1bmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9NQU5JRkVTVF9VTktOT1dOX09ORVJST1IgZXh0ZW5kcyBOb2RlU3ludGF4RXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX01BTklGRVNUX1VOS05PV05fT05FUlJPUlwiLFxuICAgICAgYE1hbmlmZXN0IHNwZWNpZmllZCB1bmtub3duIGVycm9yIGJlaGF2aW9yIFwiJHt4fVwiLmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9NRVRIT0RfTk9UX0lNUExFTUVOVEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9NRVRIT0RfTk9UX0lNUExFTUVOVEVEXCIsXG4gICAgICBgVGhlICR7eH0gbWV0aG9kIGlzIG5vdCBpbXBsZW1lbnRlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9NSVNTSU5HX0FSR1MgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoLi4uYXJnczogKHN0cmluZyB8IHN0cmluZ1tdKVtdKSB7XG4gICAgbGV0IG1zZyA9IFwiVGhlIFwiO1xuXG4gICAgY29uc3QgbGVuID0gYXJncy5sZW5ndGg7XG5cbiAgICBjb25zdCB3cmFwID0gKGE6IHVua25vd24pID0+IGBcIiR7YX1cImA7XG5cbiAgICBhcmdzID0gYXJncy5tYXAoXG4gICAgICAoYSkgPT4gKEFycmF5LmlzQXJyYXkoYSkgPyBhLm1hcCh3cmFwKS5qb2luKFwiIG9yIFwiKSA6IHdyYXAoYSkpLFxuICAgICk7XG5cbiAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBtc2cgKz0gYCR7YXJnc1swXX0gYXJndW1lbnRgO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgbXNnICs9IGAke2FyZ3NbMF19IGFuZCAke2FyZ3NbMV19IGFyZ3VtZW50c2A7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbXNnICs9IGFyZ3Muc2xpY2UoMCwgbGVuIC0gMSkuam9pbihcIiwgXCIpO1xuICAgICAgICBtc2cgKz0gYCwgYW5kICR7YXJnc1tsZW4gLSAxXX0gYXJndW1lbnRzYDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9NSVNTSU5HX0FSR1NcIixcbiAgICAgIGAke21zZ30gbXVzdCBiZSBzcGVjaWZpZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfTUlTU0lOR19PUFRJT04gZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9NSVNTSU5HX09QVElPTlwiLFxuICAgICAgYCR7eH0gaXMgcmVxdWlyZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfTVVMVElQTEVfQ0FMTEJBQ0sgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX01VTFRJUExFX0NBTExCQUNLXCIsXG4gICAgICBgQ2FsbGJhY2sgY2FsbGVkIG11bHRpcGxlIHRpbWVzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX05BUElfQ09OU19GVU5DVElPTiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX05BUElfQ09OU19GVU5DVElPTlwiLFxuICAgICAgYENvbnN0cnVjdG9yIG11c3QgYmUgYSBmdW5jdGlvbmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9OQVBJX0lOVkFMSURfREFUQVZJRVdfQVJHUyBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9OQVBJX0lOVkFMSURfREFUQVZJRVdfQVJHU1wiLFxuICAgICAgYGJ5dGVfb2Zmc2V0ICsgYnl0ZV9sZW5ndGggc2hvdWxkIGJlIGxlc3MgdGhhbiBvciBlcXVhbCB0byB0aGUgc2l6ZSBpbiBieXRlcyBvZiB0aGUgYXJyYXkgcGFzc2VkIGluYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX05BUElfSU5WQUxJRF9UWVBFREFSUkFZX0FMSUdOTUVOVCBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX05BUElfSU5WQUxJRF9UWVBFREFSUkFZX0FMSUdOTUVOVFwiLFxuICAgICAgYHN0YXJ0IG9mZnNldCBvZiAke3h9IHNob3VsZCBiZSBhIG11bHRpcGxlIG9mICR7eX1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfTkFQSV9JTlZBTElEX1RZUEVEQVJSQVlfTEVOR1RIIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX05BUElfSU5WQUxJRF9UWVBFREFSUkFZX0xFTkdUSFwiLFxuICAgICAgYEludmFsaWQgdHlwZWQgYXJyYXkgbGVuZ3RoYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX05PX0NSWVBUTyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfTk9fQ1JZUFRPXCIsXG4gICAgICBgTm9kZS5qcyBpcyBub3QgY29tcGlsZWQgd2l0aCBPcGVuU1NMIGNyeXB0byBzdXBwb3J0YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX05PX0lDVSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX05PX0lDVVwiLFxuICAgICAgYCR7eH0gaXMgbm90IHN1cHBvcnRlZCBvbiBOb2RlLmpzIGNvbXBpbGVkIHdpdGhvdXQgSUNVYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1FVSUNDTElFTlRTRVNTSU9OX0ZBSUxFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfUVVJQ0NMSUVOVFNFU1NJT05fRkFJTEVEXCIsXG4gICAgICBgRmFpbGVkIHRvIGNyZWF0ZSBhIG5ldyBRdWljQ2xpZW50U2Vzc2lvbjogJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9RVUlDQ0xJRU5UU0VTU0lPTl9GQUlMRURfU0VUU09DS0VUIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9RVUlDQ0xJRU5UU0VTU0lPTl9GQUlMRURfU0VUU09DS0VUXCIsXG4gICAgICBgRmFpbGVkIHRvIHNldCB0aGUgUXVpY1NvY2tldGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9RVUlDU0VTU0lPTl9ERVNUUk9ZRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1FVSUNTRVNTSU9OX0RFU1RST1lFRFwiLFxuICAgICAgYENhbm5vdCBjYWxsICR7eH0gYWZ0ZXIgYSBRdWljU2Vzc2lvbiBoYXMgYmVlbiBkZXN0cm95ZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfUVVJQ1NFU1NJT05fSU5WQUxJRF9EQ0lEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9RVUlDU0VTU0lPTl9JTlZBTElEX0RDSURcIixcbiAgICAgIGBJbnZhbGlkIERDSUQgdmFsdWU6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfUVVJQ1NFU1NJT05fVVBEQVRFS0VZIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9RVUlDU0VTU0lPTl9VUERBVEVLRVlcIixcbiAgICAgIGBVbmFibGUgdG8gdXBkYXRlIFF1aWNTZXNzaW9uIGtleXNgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfUVVJQ1NPQ0tFVF9ERVNUUk9ZRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1FVSUNTT0NLRVRfREVTVFJPWUVEXCIsXG4gICAgICBgQ2Fubm90IGNhbGwgJHt4fSBhZnRlciBhIFF1aWNTb2NrZXQgaGFzIGJlZW4gZGVzdHJveWVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1FVSUNTT0NLRVRfSU5WQUxJRF9TVEFURUxFU1NfUkVTRVRfU0VDUkVUX0xFTkdUSFxuICBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfUVVJQ1NPQ0tFVF9JTlZBTElEX1NUQVRFTEVTU19SRVNFVF9TRUNSRVRfTEVOR1RIXCIsXG4gICAgICBgVGhlIHN0YXRlUmVzZXRUb2tlbiBtdXN0IGJlIGV4YWN0bHkgMTYtYnl0ZXMgaW4gbGVuZ3RoYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1FVSUNTT0NLRVRfTElTVEVOSU5HIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9RVUlDU09DS0VUX0xJU1RFTklOR1wiLFxuICAgICAgYFRoaXMgUXVpY1NvY2tldCBpcyBhbHJlYWR5IGxpc3RlbmluZ2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9RVUlDU09DS0VUX1VOQk9VTkQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1FVSUNTT0NLRVRfVU5CT1VORFwiLFxuICAgICAgYENhbm5vdCBjYWxsICR7eH0gYmVmb3JlIGEgUXVpY1NvY2tldCBoYXMgYmVlbiBib3VuZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9RVUlDU1RSRUFNX0RFU1RST1lFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfUVVJQ1NUUkVBTV9ERVNUUk9ZRURcIixcbiAgICAgIGBDYW5ub3QgY2FsbCAke3h9IGFmdGVyIGEgUXVpY1N0cmVhbSBoYXMgYmVlbiBkZXN0cm95ZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfUVVJQ1NUUkVBTV9JTlZBTElEX1BVU0ggZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1FVSUNTVFJFQU1fSU5WQUxJRF9QVVNIXCIsXG4gICAgICBgUHVzaCBzdHJlYW1zIGFyZSBvbmx5IHN1cHBvcnRlZCBvbiBjbGllbnQtaW5pdGlhdGVkLCBiaWRpcmVjdGlvbmFsIHN0cmVhbXNgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfUVVJQ1NUUkVBTV9PUEVOX0ZBSUxFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfUVVJQ1NUUkVBTV9PUEVOX0ZBSUxFRFwiLFxuICAgICAgYE9wZW5pbmcgYSBuZXcgUXVpY1N0cmVhbSBmYWlsZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfUVVJQ1NUUkVBTV9VTlNVUFBPUlRFRF9QVVNIIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9RVUlDU1RSRUFNX1VOU1VQUE9SVEVEX1BVU0hcIixcbiAgICAgIGBQdXNoIHN0cmVhbXMgYXJlIG5vdCBzdXBwb3J0ZWQgb24gdGhpcyBRdWljU2Vzc2lvbmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9RVUlDX1RMUzEzX1JFUVVJUkVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9RVUlDX1RMUzEzX1JFUVVJUkVEXCIsXG4gICAgICBgUVVJQyByZXF1aXJlcyBUTFMgdmVyc2lvbiAxLjNgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU0NSSVBUX0VYRUNVVElPTl9JTlRFUlJVUFRFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU0NSSVBUX0VYRUNVVElPTl9JTlRFUlJVUFRFRFwiLFxuICAgICAgXCJTY3JpcHQgZXhlY3V0aW9uIHdhcyBpbnRlcnJ1cHRlZCBieSBgU0lHSU5UYFwiLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU0VSVkVSX0FMUkVBRFlfTElTVEVOIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TRVJWRVJfQUxSRUFEWV9MSVNURU5cIixcbiAgICAgIGBMaXN0ZW4gbWV0aG9kIGhhcyBiZWVuIGNhbGxlZCBtb3JlIHRoYW4gb25jZSB3aXRob3V0IGNsb3NpbmcuYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NFUlZFUl9OT1RfUlVOTklORyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU0VSVkVSX05PVF9SVU5OSU5HXCIsXG4gICAgICBgU2VydmVyIGlzIG5vdCBydW5uaW5nLmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9TT0NLRVRfQUxSRUFEWV9CT1VORCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU09DS0VUX0FMUkVBRFlfQk9VTkRcIixcbiAgICAgIGBTb2NrZXQgaXMgYWxyZWFkeSBib3VuZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9TT0NLRVRfQkFEX0JVRkZFUl9TSVpFIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU09DS0VUX0JBRF9CVUZGRVJfU0laRVwiLFxuICAgICAgYEJ1ZmZlciBzaXplIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NPQ0tFVF9CQURfUE9SVCBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBwb3J0OiB1bmtub3duLCBhbGxvd1plcm8gPSB0cnVlKSB7XG4gICAgYXNzZXJ0KFxuICAgICAgdHlwZW9mIGFsbG93WmVybyA9PT0gXCJib29sZWFuXCIsXG4gICAgICBcIlRoZSAnYWxsb3daZXJvJyBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi5cIixcbiAgICApO1xuXG4gICAgY29uc3Qgb3BlcmF0b3IgPSBhbGxvd1plcm8gPyBcIj49XCIgOiBcIj5cIjtcblxuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU09DS0VUX0JBRF9QT1JUXCIsXG4gICAgICBgJHtuYW1lfSBzaG91bGQgYmUgJHtvcGVyYXRvcn0gMCBhbmQgPCA2NTUzNi4gUmVjZWl2ZWQgJHtwb3J0fS5gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU09DS0VUX0JBRF9UWVBFIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU09DS0VUX0JBRF9UWVBFXCIsXG4gICAgICBgQmFkIHNvY2tldCB0eXBlIHNwZWNpZmllZC4gVmFsaWQgdHlwZXMgYXJlOiB1ZHA0LCB1ZHA2YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NPQ0tFVF9DTE9TRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NPQ0tFVF9DTE9TRURcIixcbiAgICAgIGBTb2NrZXQgaXMgY2xvc2VkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NPQ0tFVF9ER1JBTV9JU19DT05ORUNURUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NPQ0tFVF9ER1JBTV9JU19DT05ORUNURURcIixcbiAgICAgIGBBbHJlYWR5IGNvbm5lY3RlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9TT0NLRVRfREdSQU1fTk9UX0NPTk5FQ1RFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU09DS0VUX0RHUkFNX05PVF9DT05ORUNURURcIixcbiAgICAgIGBOb3QgY29ubmVjdGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NPQ0tFVF9ER1JBTV9OT1RfUlVOTklORyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU09DS0VUX0RHUkFNX05PVF9SVU5OSU5HXCIsXG4gICAgICBgTm90IHJ1bm5pbmdgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU1JJX1BBUlNFIGV4dGVuZHMgTm9kZVN5bnRheEVycm9yIHtcbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBjaGFyOiBzdHJpbmcsIHBvc2l0aW9uOiBudW1iZXIpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NSSV9QQVJTRVwiLFxuICAgICAgYFN1YnJlc291cmNlIEludGVncml0eSBzdHJpbmcgJHtuYW1lfSBoYWQgYW4gdW5leHBlY3RlZCAke2NoYXJ9IGF0IHBvc2l0aW9uICR7cG9zaXRpb259YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NUUkVBTV9BTFJFQURZX0ZJTklTSEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TVFJFQU1fQUxSRUFEWV9GSU5JU0hFRFwiLFxuICAgICAgYENhbm5vdCBjYWxsICR7eH0gYWZ0ZXIgYSBzdHJlYW0gd2FzIGZpbmlzaGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NUUkVBTV9DQU5OT1RfUElQRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU1RSRUFNX0NBTk5PVF9QSVBFXCIsXG4gICAgICBgQ2Fubm90IHBpcGUsIG5vdCByZWFkYWJsZWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9TVFJFQU1fREVTVFJPWUVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TVFJFQU1fREVTVFJPWUVEXCIsXG4gICAgICBgQ2Fubm90IGNhbGwgJHt4fSBhZnRlciBhIHN0cmVhbSB3YXMgZGVzdHJveWVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NUUkVBTV9OVUxMX1ZBTFVFUyBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NUUkVBTV9OVUxMX1ZBTFVFU1wiLFxuICAgICAgYE1heSBub3Qgd3JpdGUgbnVsbCB2YWx1ZXMgdG8gc3RyZWFtYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NUUkVBTV9QUkVNQVRVUkVfQ0xPU0UgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NUUkVBTV9QUkVNQVRVUkVfQ0xPU0VcIixcbiAgICAgIGBQcmVtYXR1cmUgY2xvc2VgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU1RSRUFNX1BVU0hfQUZURVJfRU9GIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TVFJFQU1fUFVTSF9BRlRFUl9FT0ZcIixcbiAgICAgIGBzdHJlYW0ucHVzaCgpIGFmdGVyIEVPRmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9TVFJFQU1fVU5TSElGVF9BRlRFUl9FTkRfRVZFTlQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NUUkVBTV9VTlNISUZUX0FGVEVSX0VORF9FVkVOVFwiLFxuICAgICAgYHN0cmVhbS51bnNoaWZ0KCkgYWZ0ZXIgZW5kIGV2ZW50YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NUUkVBTV9XUkFQIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TVFJFQU1fV1JBUFwiLFxuICAgICAgYFN0cmVhbSBoYXMgU3RyaW5nRGVjb2RlciBzZXQgb3IgaXMgaW4gb2JqZWN0TW9kZWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9TVFJFQU1fV1JJVEVfQUZURVJfRU5EIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TVFJFQU1fV1JJVEVfQUZURVJfRU5EXCIsXG4gICAgICBgd3JpdGUgYWZ0ZXIgZW5kYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NZTlRIRVRJQyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU1lOVEhFVElDXCIsXG4gICAgICBgSmF2YVNjcmlwdCBDYWxsc3RhY2tgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVExTX0RIX1BBUkFNX1NJWkUgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1RMU19ESF9QQVJBTV9TSVpFXCIsXG4gICAgICBgREggcGFyYW1ldGVyIHNpemUgJHt4fSBpcyBsZXNzIHRoYW4gMjA0OGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9UTFNfSEFORFNIQUtFX1RJTUVPVVQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1RMU19IQU5EU0hBS0VfVElNRU9VVFwiLFxuICAgICAgYFRMUyBoYW5kc2hha2UgdGltZW91dGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9UTFNfSU5WQUxJRF9DT05URVhUIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVExTX0lOVkFMSURfQ09OVEVYVFwiLFxuICAgICAgYCR7eH0gbXVzdCBiZSBhIFNlY3VyZUNvbnRleHRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVExTX0lOVkFMSURfU1RBVEUgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1RMU19JTlZBTElEX1NUQVRFXCIsXG4gICAgICBgVExTIHNvY2tldCBjb25uZWN0aW9uIG11c3QgYmUgc2VjdXJlbHkgZXN0YWJsaXNoZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVExTX0lOVkFMSURfUFJPVE9DT0xfVkVSU0lPTiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcihwcm90b2NvbDogc3RyaW5nLCB4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1RMU19JTlZBTElEX1BST1RPQ09MX1ZFUlNJT05cIixcbiAgICAgIGAke3Byb3RvY29sfSBpcyBub3QgYSB2YWxpZCAke3h9IFRMUyBwcm90b2NvbCB2ZXJzaW9uYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1RMU19QUk9UT0NPTF9WRVJTSU9OX0NPTkZMSUNUIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHByZXZQcm90b2NvbDogc3RyaW5nLCBwcm90b2NvbDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9UTFNfUFJPVE9DT0xfVkVSU0lPTl9DT05GTElDVFwiLFxuICAgICAgYFRMUyBwcm90b2NvbCB2ZXJzaW9uICR7cHJldlByb3RvY29sfSBjb25mbGljdHMgd2l0aCBzZWN1cmVQcm90b2NvbCAke3Byb3RvY29sfWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9UTFNfUkVORUdPVElBVElPTl9ESVNBQkxFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVExTX1JFTkVHT1RJQVRJT05fRElTQUJMRURcIixcbiAgICAgIGBUTFMgc2Vzc2lvbiByZW5lZ290aWF0aW9uIGRpc2FibGVkIGZvciB0aGlzIHNvY2tldGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9UTFNfUkVRVUlSRURfU0VSVkVSX05BTUUgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1RMU19SRVFVSVJFRF9TRVJWRVJfTkFNRVwiLFxuICAgICAgYFwic2VydmVybmFtZVwiIGlzIHJlcXVpcmVkIHBhcmFtZXRlciBmb3IgU2VydmVyLmFkZENvbnRleHRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVExTX1NFU1NJT05fQVRUQUNLIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9UTFNfU0VTU0lPTl9BVFRBQ0tcIixcbiAgICAgIGBUTFMgc2Vzc2lvbiByZW5lZ290aWF0aW9uIGF0dGFjayBkZXRlY3RlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9UTFNfU05JX0ZST01fU0VSVkVSIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9UTFNfU05JX0ZST01fU0VSVkVSXCIsXG4gICAgICBgQ2Fubm90IGlzc3VlIFNOSSBmcm9tIGEgVExTIHNlcnZlci1zaWRlIHNvY2tldGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9UUkFDRV9FVkVOVFNfQ0FURUdPUllfUkVRVUlSRUQgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9UUkFDRV9FVkVOVFNfQ0FURUdPUllfUkVRVUlSRURcIixcbiAgICAgIGBBdCBsZWFzdCBvbmUgY2F0ZWdvcnkgaXMgcmVxdWlyZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVFJBQ0VfRVZFTlRTX1VOQVZBSUxBQkxFIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9UUkFDRV9FVkVOVFNfVU5BVkFJTEFCTEVcIixcbiAgICAgIGBUcmFjZSBldmVudHMgYXJlIHVuYXZhaWxhYmxlYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1VOQVZBSUxBQkxFX0RVUklOR19FWElUIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9VTkFWQUlMQUJMRV9EVVJJTkdfRVhJVFwiLFxuICAgICAgYENhbm5vdCBjYWxsIGZ1bmN0aW9uIGluIHByb2Nlc3MgZXhpdCBoYW5kbGVyYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1VOQ0FVR0hUX0VYQ0VQVElPTl9DQVBUVVJFX0FMUkVBRFlfU0VUIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9VTkNBVUdIVF9FWENFUFRJT05fQ0FQVFVSRV9BTFJFQURZX1NFVFwiLFxuICAgICAgXCJgcHJvY2Vzcy5zZXR1cFVuY2F1Z2h0RXhjZXB0aW9uQ2FwdHVyZSgpYCB3YXMgY2FsbGVkIHdoaWxlIGEgY2FwdHVyZSBjYWxsYmFjayB3YXMgYWxyZWFkeSBhY3RpdmVcIixcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1VORVNDQVBFRF9DSEFSQUNURVJTIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVU5FU0NBUEVEX0NIQVJBQ1RFUlNcIixcbiAgICAgIGAke3h9IGNvbnRhaW5zIHVuZXNjYXBlZCBjaGFyYWN0ZXJzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1VOSEFORExFRF9FUlJPUiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVU5IQU5ETEVEX0VSUk9SXCIsXG4gICAgICBgVW5oYW5kbGVkIGVycm9yLiAoJHt4fSlgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVU5LTk9XTl9CVUlMVElOX01PRFVMRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVU5LTk9XTl9CVUlMVElOX01PRFVMRVwiLFxuICAgICAgYE5vIHN1Y2ggYnVpbHQtaW4gbW9kdWxlOiAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1VOS05PV05fQ1JFREVOVElBTCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9VTktOT1dOX0NSRURFTlRJQUxcIixcbiAgICAgIGAke3h9IGlkZW50aWZpZXIgZG9lcyBub3QgZXhpc3Q6ICR7eX1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVU5LTk9XTl9FTkNPRElORyBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1VOS05PV05fRU5DT0RJTkdcIixcbiAgICAgIGBVbmtub3duIGVuY29kaW5nOiAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1VOS05PV05fRklMRV9FWFRFTlNJT04gZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1VOS05PV05fRklMRV9FWFRFTlNJT05cIixcbiAgICAgIGBVbmtub3duIGZpbGUgZXh0ZW5zaW9uIFwiJHt4fVwiIGZvciAke3l9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1VOS05PV05fTU9EVUxFX0ZPUk1BVCBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9VTktOT1dOX01PRFVMRV9GT1JNQVRcIixcbiAgICAgIGBVbmtub3duIG1vZHVsZSBmb3JtYXQ6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVU5LTk9XTl9TSUdOQUwgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9VTktOT1dOX1NJR05BTFwiLFxuICAgICAgYFVua25vd24gc2lnbmFsOiAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1VOU1VQUE9SVEVEX0RJUl9JTVBPUlQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcsIHk6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVU5TVVBQT1JURURfRElSX0lNUE9SVFwiLFxuICAgICAgYERpcmVjdG9yeSBpbXBvcnQgJyR7eH0nIGlzIG5vdCBzdXBwb3J0ZWQgcmVzb2x2aW5nIEVTIG1vZHVsZXMsIGltcG9ydGVkIGZyb20gJHt5fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9VTlNVUFBPUlRFRF9FU01fVVJMX1NDSEVNRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVU5TVVBQT1JURURfRVNNX1VSTF9TQ0hFTUVcIixcbiAgICAgIGBPbmx5IGZpbGUgYW5kIGRhdGEgVVJMcyBhcmUgc3VwcG9ydGVkIGJ5IHRoZSBkZWZhdWx0IEVTTSBsb2FkZXJgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVjhCUkVBS0lURVJBVE9SIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9WOEJSRUFLSVRFUkFUT1JcIixcbiAgICAgIGBGdWxsIElDVSBkYXRhIG5vdCBpbnN0YWxsZWQuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvd2lraS9JbnRsYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1ZBTElEX1BFUkZPUk1BTkNFX0VOVFJZX1RZUEUgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1ZBTElEX1BFUkZPUk1BTkNFX0VOVFJZX1RZUEVcIixcbiAgICAgIGBBdCBsZWFzdCBvbmUgdmFsaWQgcGVyZm9ybWFuY2UgZW50cnkgdHlwZSBpcyByZXF1aXJlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9WTV9EWU5BTUlDX0lNUE9SVF9DQUxMQkFDS19NSVNTSU5HIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVk1fRFlOQU1JQ19JTVBPUlRfQ0FMTEJBQ0tfTUlTU0lOR1wiLFxuICAgICAgYEEgZHluYW1pYyBpbXBvcnQgY2FsbGJhY2sgd2FzIG5vdCBzcGVjaWZpZWQuYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1ZNX01PRFVMRV9BTFJFQURZX0xJTktFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVk1fTU9EVUxFX0FMUkVBRFlfTElOS0VEXCIsXG4gICAgICBgTW9kdWxlIGhhcyBhbHJlYWR5IGJlZW4gbGlua2VkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1ZNX01PRFVMRV9DQU5OT1RfQ1JFQVRFX0NBQ0hFRF9EQVRBIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9WTV9NT0RVTEVfQ0FOTk9UX0NSRUFURV9DQUNIRURfREFUQVwiLFxuICAgICAgYENhY2hlZCBkYXRhIGNhbm5vdCBiZSBjcmVhdGVkIGZvciBhIG1vZHVsZSB3aGljaCBoYXMgYmVlbiBldmFsdWF0ZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVk1fTU9EVUxFX0RJRkZFUkVOVF9DT05URVhUIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9WTV9NT0RVTEVfRElGRkVSRU5UX0NPTlRFWFRcIixcbiAgICAgIGBMaW5rZWQgbW9kdWxlcyBtdXN0IHVzZSB0aGUgc2FtZSBjb250ZXh0YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1ZNX01PRFVMRV9MSU5LSU5HX0VSUk9SRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1ZNX01PRFVMRV9MSU5LSU5HX0VSUk9SRURcIixcbiAgICAgIGBMaW5raW5nIGhhcyBhbHJlYWR5IGZhaWxlZCBmb3IgdGhlIHByb3ZpZGVkIG1vZHVsZWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9WTV9NT0RVTEVfTk9UX01PRFVMRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVk1fTU9EVUxFX05PVF9NT0RVTEVcIixcbiAgICAgIGBQcm92aWRlZCBtb2R1bGUgaXMgbm90IGFuIGluc3RhbmNlIG9mIE1vZHVsZWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9WTV9NT0RVTEVfU1RBVFVTIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9WTV9NT0RVTEVfU1RBVFVTXCIsXG4gICAgICBgTW9kdWxlIHN0YXR1cyAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1dBU0lfQUxSRUFEWV9TVEFSVEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9XQVNJX0FMUkVBRFlfU1RBUlRFRFwiLFxuICAgICAgYFdBU0kgaW5zdGFuY2UgaGFzIGFscmVhZHkgc3RhcnRlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9XT1JLRVJfSU5JVF9GQUlMRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1dPUktFUl9JTklUX0ZBSUxFRFwiLFxuICAgICAgYFdvcmtlciBpbml0aWFsaXphdGlvbiBmYWlsdXJlOiAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1dPUktFUl9OT1RfUlVOTklORyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfV09SS0VSX05PVF9SVU5OSU5HXCIsXG4gICAgICBgV29ya2VyIGluc3RhbmNlIG5vdCBydW5uaW5nYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1dPUktFUl9PVVRfT0ZfTUVNT1JZIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9XT1JLRVJfT1VUX09GX01FTU9SWVwiLFxuICAgICAgYFdvcmtlciB0ZXJtaW5hdGVkIGR1ZSB0byByZWFjaGluZyBtZW1vcnkgbGltaXQ6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfV09SS0VSX1VOU0VSSUFMSVpBQkxFX0VSUk9SIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9XT1JLRVJfVU5TRVJJQUxJWkFCTEVfRVJST1JcIixcbiAgICAgIGBTZXJpYWxpemluZyBhbiB1bmNhdWdodCBleGNlcHRpb24gZmFpbGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1dPUktFUl9VTlNVUFBPUlRFRF9FWFRFTlNJT04gZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9XT1JLRVJfVU5TVVBQT1JURURfRVhURU5TSU9OXCIsXG4gICAgICBgVGhlIHdvcmtlciBzY3JpcHQgZXh0ZW5zaW9uIG11c3QgYmUgXCIuanNcIiwgXCIubWpzXCIsIG9yIFwiLmNqc1wiLiBSZWNlaXZlZCBcIiR7eH1cImAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9XT1JLRVJfVU5TVVBQT1JURURfT1BFUkFUSU9OIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfV09SS0VSX1VOU1VQUE9SVEVEX09QRVJBVElPTlwiLFxuICAgICAgYCR7eH0gaXMgbm90IHN1cHBvcnRlZCBpbiB3b3JrZXJzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1pMSUJfSU5JVElBTElaQVRJT05fRkFJTEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9aTElCX0lOSVRJQUxJWkFUSU9OX0ZBSUxFRFwiLFxuICAgICAgYEluaXRpYWxpemF0aW9uIGZhaWxlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9GQUxTWV9WQUxVRV9SRUpFQ1RJT04gZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICByZWFzb246IHN0cmluZztcbiAgY29uc3RydWN0b3IocmVhc29uOiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0ZBTFNZX1ZBTFVFX1JFSkVDVElPTlwiLFxuICAgICAgXCJQcm9taXNlIHdhcyByZWplY3RlZCB3aXRoIGZhbHN5IHZhbHVlXCIsXG4gICAgKTtcbiAgICB0aGlzLnJlYXNvbiA9IHJlYXNvbjtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9JTlZBTElEX1NFVFRJTkdfVkFMVUUgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGFjdHVhbDogdW5rbm93bjtcbiAgbWluPzogbnVtYmVyO1xuICBtYXg/OiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBhY3R1YWw6IHVua25vd24sIG1pbj86IG51bWJlciwgbWF4PzogbnVtYmVyKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9JTlZBTElEX1NFVFRJTkdfVkFMVUVcIixcbiAgICAgIGBJbnZhbGlkIHZhbHVlIGZvciBzZXR0aW5nIFwiJHtuYW1lfVwiOiAke2FjdHVhbH1gLFxuICAgICk7XG4gICAgdGhpcy5hY3R1YWwgPSBhY3R1YWw7XG4gICAgaWYgKG1pbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm1pbiA9IG1pbjtcbiAgICAgIHRoaXMubWF4ID0gbWF4O1xuICAgIH1cbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9TVFJFQU1fQ0FOQ0VMIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY2F1c2U/OiBFcnJvcjtcbiAgY29uc3RydWN0b3IoZXJyb3I6IEVycm9yKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9TVFJFQU1fQ0FOQ0VMXCIsXG4gICAgICB0eXBlb2YgZXJyb3IubWVzc2FnZSA9PT0gXCJzdHJpbmdcIlxuICAgICAgICA/IGBUaGUgcGVuZGluZyBzdHJlYW0gaGFzIGJlZW4gY2FuY2VsZWQgKGNhdXNlZCBieTogJHtlcnJvci5tZXNzYWdlfSlgXG4gICAgICAgIDogXCJUaGUgcGVuZGluZyBzdHJlYW0gaGFzIGJlZW4gY2FuY2VsZWRcIixcbiAgICApO1xuICAgIGlmIChlcnJvcikge1xuICAgICAgdGhpcy5jYXVzZSA9IGVycm9yO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfQUREUkVTU19GQU1JTFkgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGhvc3Q6IHN0cmluZztcbiAgcG9ydDogbnVtYmVyO1xuICBjb25zdHJ1Y3RvcihhZGRyZXNzVHlwZTogc3RyaW5nLCBob3N0OiBzdHJpbmcsIHBvcnQ6IG51bWJlcikge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9BRERSRVNTX0ZBTUlMWVwiLFxuICAgICAgYEludmFsaWQgYWRkcmVzcyBmYW1pbHk6ICR7YWRkcmVzc1R5cGV9ICR7aG9zdH06JHtwb3J0fWAsXG4gICAgKTtcbiAgICB0aGlzLmhvc3QgPSBob3N0O1xuICAgIHRoaXMucG9ydCA9IHBvcnQ7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX0NIQVIgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBmaWVsZD86IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9DSEFSXCIsXG4gICAgICBmaWVsZFxuICAgICAgICA/IGBJbnZhbGlkIGNoYXJhY3RlciBpbiAke25hbWV9YFxuICAgICAgICA6IGBJbnZhbGlkIGNoYXJhY3RlciBpbiAke25hbWV9IFtcIiR7ZmllbGR9XCJdYCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9PUFRfVkFMVUUgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9PUFRfVkFMVUVcIixcbiAgICAgIGBUaGUgdmFsdWUgXCIke3ZhbHVlfVwiIGlzIGludmFsaWQgZm9yIG9wdGlvbiBcIiR7bmFtZX1cImAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfUkVUVVJOX1BST1BFUlRZIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKGlucHV0OiBzdHJpbmcsIG5hbWU6IHN0cmluZywgcHJvcDogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX1JFVFVSTl9QUk9QRVJUWVwiLFxuICAgICAgYEV4cGVjdGVkIGEgdmFsaWQgJHtpbnB1dH0gdG8gYmUgcmV0dXJuZWQgZm9yIHRoZSBcIiR7cHJvcH1cIiBmcm9tIHRoZSBcIiR7bmFtZX1cIiBmdW5jdGlvbiBidXQgZ290ICR7dmFsdWV9LmAsXG4gICAgKTtcbiAgfVxufVxuXG4vLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuZnVuY3Rpb24gYnVpbGRSZXR1cm5Qcm9wZXJ0eVR5cGUodmFsdWU6IGFueSkge1xuICBpZiAodmFsdWUgJiYgdmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IubmFtZSkge1xuICAgIHJldHVybiBgaW5zdGFuY2Ugb2YgJHt2YWx1ZS5jb25zdHJ1Y3Rvci5uYW1lfWA7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGB0eXBlICR7dHlwZW9mIHZhbHVlfWA7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX1JFVFVSTl9QUk9QRVJUWV9WQUxVRSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihpbnB1dDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIHByb3A6IHN0cmluZywgdmFsdWU6IHVua25vd24pIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfUkVUVVJOX1BST1BFUlRZX1ZBTFVFXCIsXG4gICAgICBgRXhwZWN0ZWQgJHtpbnB1dH0gdG8gYmUgcmV0dXJuZWQgZm9yIHRoZSBcIiR7cHJvcH1cIiBmcm9tIHRoZSBcIiR7bmFtZX1cIiBmdW5jdGlvbiBidXQgZ290ICR7XG4gICAgICAgIGJ1aWxkUmV0dXJuUHJvcGVydHlUeXBlKHZhbHVlKVxuICAgICAgfS5gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX1JFVFVSTl9WQUxVRSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihpbnB1dDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX1JFVFVSTl9WQUxVRVwiLFxuICAgICAgYEV4cGVjdGVkICR7aW5wdXR9IHRvIGJlIHJldHVybmVkIGZyb20gdGhlIFwiJHtuYW1lfVwiIGZ1bmN0aW9uIGJ1dCBnb3QgJHtcbiAgICAgICAgYnVpbGRSZXR1cm5Qcm9wZXJ0eVR5cGUodmFsdWUpXG4gICAgICB9LmAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfVVJMIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGlucHV0OiBzdHJpbmc7XG4gIGNvbnN0cnVjdG9yKGlucHV0OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfVVJMXCIsXG4gICAgICBgSW52YWxpZCBVUkw6ICR7aW5wdXR9YCxcbiAgICApO1xuICAgIHRoaXMuaW5wdXQgPSBpbnB1dDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfVVJMX1NDSEVNRSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihleHBlY3RlZDogc3RyaW5nIHwgW3N0cmluZ10gfCBbc3RyaW5nLCBzdHJpbmddKSB7XG4gICAgZXhwZWN0ZWQgPSBBcnJheS5pc0FycmF5KGV4cGVjdGVkKSA/IGV4cGVjdGVkIDogW2V4cGVjdGVkXTtcbiAgICBjb25zdCByZXMgPSBleHBlY3RlZC5sZW5ndGggPT09IDJcbiAgICAgID8gYG9uZSBvZiBzY2hlbWUgJHtleHBlY3RlZFswXX0gb3IgJHtleHBlY3RlZFsxXX1gXG4gICAgICA6IGBvZiBzY2hlbWUgJHtleHBlY3RlZFswXX1gO1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9VUkxfU0NIRU1FXCIsXG4gICAgICBgVGhlIFVSTCBtdXN0IGJlICR7cmVzfWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX01PRFVMRV9OT1RfRk9VTkQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihwYXRoOiBzdHJpbmcsIGJhc2U6IHN0cmluZywgdHlwZTogc3RyaW5nID0gXCJwYWNrYWdlXCIpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX01PRFVMRV9OT1RfRk9VTkRcIixcbiAgICAgIGBDYW5ub3QgZmluZCAke3R5cGV9ICcke3BhdGh9JyBpbXBvcnRlZCBmcm9tICR7YmFzZX1gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX1BBQ0tBR0VfQ09ORklHIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IocGF0aDogc3RyaW5nLCBiYXNlPzogc3RyaW5nLCBtZXNzYWdlPzogc3RyaW5nKSB7XG4gICAgY29uc3QgbXNnID0gYEludmFsaWQgcGFja2FnZSBjb25maWcgJHtwYXRofSR7XG4gICAgICBiYXNlID8gYCB3aGlsZSBpbXBvcnRpbmcgJHtiYXNlfWAgOiBcIlwiXG4gICAgfSR7bWVzc2FnZSA/IGAuICR7bWVzc2FnZX1gIDogXCJcIn1gO1xuICAgIHN1cGVyKFwiRVJSX0lOVkFMSURfUEFDS0FHRV9DT05GSUdcIiwgbXNnKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfTU9EVUxFX1NQRUNJRklFUiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihyZXF1ZXN0OiBzdHJpbmcsIHJlYXNvbjogc3RyaW5nLCBiYXNlPzogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX01PRFVMRV9TUEVDSUZJRVJcIixcbiAgICAgIGBJbnZhbGlkIG1vZHVsZSBcIiR7cmVxdWVzdH1cIiAke3JlYXNvbn0ke1xuICAgICAgICBiYXNlID8gYCBpbXBvcnRlZCBmcm9tICR7YmFzZX1gIDogXCJcIlxuICAgICAgfWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfUEFDS0FHRV9UQVJHRVQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICBwa2dQYXRoOiBzdHJpbmcsXG4gICAga2V5OiBzdHJpbmcsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICB0YXJnZXQ6IGFueSxcbiAgICBpc0ltcG9ydD86IGJvb2xlYW4sXG4gICAgYmFzZT86IHN0cmluZyxcbiAgKSB7XG4gICAgbGV0IG1zZzogc3RyaW5nO1xuICAgIGNvbnN0IHJlbEVycm9yID0gdHlwZW9mIHRhcmdldCA9PT0gXCJzdHJpbmdcIiAmJiAhaXNJbXBvcnQgJiZcbiAgICAgIHRhcmdldC5sZW5ndGggJiYgIXRhcmdldC5zdGFydHNXaXRoKFwiLi9cIik7XG4gICAgaWYgKGtleSA9PT0gXCIuXCIpIHtcbiAgICAgIGFzc2VydChpc0ltcG9ydCA9PT0gZmFsc2UpO1xuICAgICAgbXNnID0gYEludmFsaWQgXCJleHBvcnRzXCIgbWFpbiB0YXJnZXQgJHtKU09OLnN0cmluZ2lmeSh0YXJnZXQpfSBkZWZpbmVkIGAgK1xuICAgICAgICBgaW4gdGhlIHBhY2thZ2UgY29uZmlnICR7cGtnUGF0aH1wYWNrYWdlLmpzb24ke1xuICAgICAgICAgIGJhc2UgPyBgIGltcG9ydGVkIGZyb20gJHtiYXNlfWAgOiBcIlwiXG4gICAgICAgIH0ke3JlbEVycm9yID8gJzsgdGFyZ2V0cyBtdXN0IHN0YXJ0IHdpdGggXCIuL1wiJyA6IFwiXCJ9YDtcbiAgICB9IGVsc2Uge1xuICAgICAgbXNnID0gYEludmFsaWQgXCIke2lzSW1wb3J0ID8gXCJpbXBvcnRzXCIgOiBcImV4cG9ydHNcIn1cIiB0YXJnZXQgJHtcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkodGFyZ2V0KVxuICAgICAgfSBkZWZpbmVkIGZvciAnJHtrZXl9JyBpbiB0aGUgcGFja2FnZSBjb25maWcgJHtwa2dQYXRofXBhY2thZ2UuanNvbiR7XG4gICAgICAgIGJhc2UgPyBgIGltcG9ydGVkIGZyb20gJHtiYXNlfWAgOiBcIlwiXG4gICAgICB9JHtyZWxFcnJvciA/ICc7IHRhcmdldHMgbXVzdCBzdGFydCB3aXRoIFwiLi9cIicgOiBcIlwifWA7XG4gICAgfVxuICAgIHN1cGVyKFwiRVJSX0lOVkFMSURfUEFDS0FHRV9UQVJHRVRcIiwgbXNnKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX1BBQ0tBR0VfSU1QT1JUX05PVF9ERUZJTkVEIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHNwZWNpZmllcjogc3RyaW5nLFxuICAgIHBhY2thZ2VKU09OVXJsOiBVUkwgfCB1bmRlZmluZWQsXG4gICAgYmFzZTogc3RyaW5nIHwgVVJMLFxuICApIHtcbiAgICBjb25zdCBwYWNrYWdlUGF0aCA9IHBhY2thZ2VKU09OVXJsICYmXG4gICAgICBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuXCIsIHBhY2thZ2VKU09OVXJsKSk7XG4gICAgY29uc3QgbXNnID0gYFBhY2thZ2UgaW1wb3J0IHNwZWNpZmllciBcIiR7c3BlY2lmaWVyfVwiIGlzIG5vdCBkZWZpbmVkJHtcbiAgICAgIHBhY2thZ2VQYXRoID8gYCBpbiBwYWNrYWdlICR7cGFja2FnZVBhdGh9cGFja2FnZS5qc29uYCA6IFwiXCJcbiAgICB9IGltcG9ydGVkIGZyb20gJHtmaWxlVVJMVG9QYXRoKGJhc2UpfWA7XG5cbiAgICBzdXBlcihcIkVSUl9QQUNLQUdFX0lNUE9SVF9OT1RfREVGSU5FRFwiLCBtc2cpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfUEFDS0FHRV9QQVRIX05PVF9FWFBPUlRFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHN1YnBhdGg6IHN0cmluZyxcbiAgICBwYWNrYWdlSlNPTlVybDogc3RyaW5nLFxuICAgIGJhc2U/OiBzdHJpbmcsXG4gICkge1xuICAgIGNvbnN0IHBrZ1BhdGggPSBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuXCIsIHBhY2thZ2VKU09OVXJsKSk7XG4gICAgY29uc3QgYmFzZVBhdGggPSBiYXNlICYmIGZpbGVVUkxUb1BhdGgoYmFzZSk7XG5cbiAgICBsZXQgbXNnOiBzdHJpbmc7XG4gICAgaWYgKHN1YnBhdGggPT09IFwiLlwiKSB7XG4gICAgICBtc2cgPSBgTm8gXCJleHBvcnRzXCIgbWFpbiBkZWZpbmVkIGluICR7cGtnUGF0aH1wYWNrYWdlLmpzb24ke1xuICAgICAgICBiYXNlUGF0aCA/IGAgaW1wb3J0ZWQgZnJvbSAke2Jhc2VQYXRofWAgOiBcIlwiXG4gICAgICB9YDtcbiAgICB9IGVsc2Uge1xuICAgICAgbXNnID1cbiAgICAgICAgYFBhY2thZ2Ugc3VicGF0aCAnJHtzdWJwYXRofScgaXMgbm90IGRlZmluZWQgYnkgXCJleHBvcnRzXCIgaW4gJHtwa2dQYXRofXBhY2thZ2UuanNvbiR7XG4gICAgICAgICAgYmFzZVBhdGggPyBgIGltcG9ydGVkIGZyb20gJHtiYXNlUGF0aH1gIDogXCJcIlxuICAgICAgICB9YDtcbiAgICB9XG5cbiAgICBzdXBlcihcIkVSUl9QQUNLQUdFX1BBVEhfTk9UX0VYUE9SVEVEXCIsIG1zZyk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxvRUFBb0U7QUFDcEU7Ozs7Ozs7Ozs7OztpQkFZaUIsQ0FFakIsU0FBUyxrQkFBa0IsRUFBRSxPQUFPLFFBQVEsV0FBVyxDQUFDO0FBQ3hELFNBQVMsT0FBTyxFQUFFLFFBQVEsUUFBUSwwQkFBMEIsQ0FBQztBQUM3RCxTQUFTLE1BQU0sUUFBUSxvQkFBb0IsQ0FBQztBQUM1QyxTQUFTLGFBQWEsUUFBUSxVQUFVLENBQUM7QUFFekMsU0FBUyxRQUFRLEdBQUc7QUFFcEI7O0dBRUcsQ0FDSCxNQUFNLFdBQVcsd0JBQXdCLEFBQUM7QUFFMUM7OztHQUdHLENBQ0gsTUFBTSxNQUFNLEdBQUc7SUFDYixRQUFRO0lBQ1IsVUFBVTtJQUNWLFFBQVE7SUFDUixRQUFRO0lBQ1IsNEVBQTRFO0lBQzVFLFVBQVU7SUFDVixRQUFRO0lBQ1IsU0FBUztJQUNULFFBQVE7SUFDUixRQUFRO0NBQ1QsQUFBQztBQUVGLE1BQU0sa0JBQWtCLEdBQUcsa0JBQWtCLEFBQUM7QUFLOUMseUVBQXlFLENBQ3pFLE9BQU8sU0FBUyxlQUFlLENBQUMsRUFBbUIsRUFBRTtJQUNuRCx3RUFBd0U7SUFDeEUsd0JBQXdCO0lBQ3hCLE1BQU0sTUFBTSxHQUFHLGtCQUFrQixHQUFHLEVBQUUsQ0FBQyxJQUFJLEFBQUM7SUFDNUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFO1FBQUUsS0FBSyxFQUFFLE1BQU07S0FBRSxDQUFDLENBQUM7SUFFckQsT0FBTyxFQUFFLENBQUM7Q0FDWDtBQUVELE1BQU0sdUJBQXVCLEdBQUcsZUFBZSxDQUM3QyxTQUFTLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtJQUNwQyw0REFBNEQ7SUFDNUQsS0FBSyxD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