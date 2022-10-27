// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import * as path from "../path/mod.ts";
/**
 * Test whether or not `dest` is a sub-directory of `src`
 * @param src src file path
 * @param dest dest file path
 * @param sep path separator
 */ export function isSubdir(src, dest, sep = path.sep) {
    if (src === dest) {
        return false;
    }
    const srcArray = src.split(sep);
    const destArray = dest.split(sep);
    return srcArray.every((current, i)=>destArray[i] === current);
}
/**
 * Get a human readable file type string.
 *
 * @param fileInfo A FileInfo describes a file and is returned by `stat`,
 *                 `lstat`
 */ export function getFileInfoType(fileInfo) {
    return fileInfo.isFile ? "file" : fileInfo.isDirectory ? "dir" : fileInfo.isSymlink ? "symlink" : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2ZzL191dGlsLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCIuLi9wYXRoL21vZC50c1wiO1xuXG4vKipcbiAqIFRlc3Qgd2hldGhlciBvciBub3QgYGRlc3RgIGlzIGEgc3ViLWRpcmVjdG9yeSBvZiBgc3JjYFxuICogQHBhcmFtIHNyYyBzcmMgZmlsZSBwYXRoXG4gKiBAcGFyYW0gZGVzdCBkZXN0IGZpbGUgcGF0aFxuICogQHBhcmFtIHNlcCBwYXRoIHNlcGFyYXRvclxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdWJkaXIoXG4gIHNyYzogc3RyaW5nLFxuICBkZXN0OiBzdHJpbmcsXG4gIHNlcDogc3RyaW5nID0gcGF0aC5zZXAsXG4pOiBib29sZWFuIHtcbiAgaWYgKHNyYyA9PT0gZGVzdCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBzcmNBcnJheSA9IHNyYy5zcGxpdChzZXApO1xuICBjb25zdCBkZXN0QXJyYXkgPSBkZXN0LnNwbGl0KHNlcCk7XG4gIHJldHVybiBzcmNBcnJheS5ldmVyeSgoY3VycmVudCwgaSkgPT4gZGVzdEFycmF5W2ldID09PSBjdXJyZW50KTtcbn1cblxuZXhwb3J0IHR5cGUgUGF0aFR5cGUgPSBcImZpbGVcIiB8IFwiZGlyXCIgfCBcInN5bWxpbmtcIjtcblxuLyoqXG4gKiBHZXQgYSBodW1hbiByZWFkYWJsZSBmaWxlIHR5cGUgc3RyaW5nLlxuICpcbiAqIEBwYXJhbSBmaWxlSW5mbyBBIEZpbGVJbmZvIGRlc2NyaWJlcyBhIGZpbGUgYW5kIGlzIHJldHVybmVkIGJ5IGBzdGF0YCxcbiAqICAgICAgICAgICAgICAgICBgbHN0YXRgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlSW5mb1R5cGUoZmlsZUluZm86IERlbm8uRmlsZUluZm8pOiBQYXRoVHlwZSB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiBmaWxlSW5mby5pc0ZpbGVcbiAgICA/IFwiZmlsZVwiXG4gICAgOiBmaWxlSW5mby5pc0RpcmVjdG9yeVxuICAgID8gXCJkaXJcIlxuICAgIDogZmlsZUluZm8uaXNTeW1saW5rXG4gICAgPyBcInN5bWxpbmtcIlxuICAgIDogdW5kZWZpbmVkO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRSxZQUFZLFVBQVUsaUJBQWlCO0FBRXZDOzs7OztDQUtDLEdBQ0QsT0FBTyxTQUFTLFNBQ2QsR0FBVyxFQUNYLElBQVksRUFDWixNQUFjLEtBQUssR0FBRyxFQUNiO0lBQ1QsSUFBSSxRQUFRLE1BQU07UUFDaEIsT0FBTyxLQUFLO0lBQ2QsQ0FBQztJQUNELE1BQU0sV0FBVyxJQUFJLEtBQUssQ0FBQztJQUMzQixNQUFNLFlBQVksS0FBSyxLQUFLLENBQUM7SUFDN0IsT0FBTyxTQUFTLEtBQUssQ0FBQyxDQUFDLFNBQVMsSUFBTSxTQUFTLENBQUMsRUFBRSxLQUFLO0FBQ3pELENBQUM7QUFJRDs7Ozs7Q0FLQyxHQUNELE9BQU8sU0FBUyxnQkFBZ0IsUUFBdUIsRUFBd0I7SUFDN0UsT0FBTyxTQUFTLE1BQU0sR0FDbEIsU0FDQSxTQUFTLFdBQVcsR0FDcEIsUUFDQSxTQUFTLFNBQVMsR0FDbEIsWUFDQSxTQUFTO0FBQ2YsQ0FBQyJ9