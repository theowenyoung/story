// Documentation and interface for walk were adapted from Go
// https://golang.org/pkg/path/filepath/#Walk
// Copyright 2009 The Go Authors. All rights reserved. BSD license.
import { assert } from "../_util/assert.ts";
import { basename, join, normalize } from "../path/mod.ts";
/** Create WalkEntry for the `path` synchronously */ export function _createWalkEntrySync(path) {
    path = normalize(path);
    const name = basename(path);
    const info = Deno.statSync(path);
    return {
        path,
        name,
        isFile: info.isFile,
        isDirectory: info.isDirectory,
        isSymlink: info.isSymlink
    };
}
/** Create WalkEntry for the `path` asynchronously */ export async function _createWalkEntry(path) {
    path = normalize(path);
    const name = basename(path);
    const info = await Deno.stat(path);
    return {
        path,
        name,
        isFile: info.isFile,
        isDirectory: info.isDirectory,
        isSymlink: info.isSymlink
    };
}
function include(path, exts, match, skip) {
    if (exts && !exts.some((ext)=>path.endsWith(ext))) {
        return false;
    }
    if (match && !match.some((pattern)=>!!path.match(pattern))) {
        return false;
    }
    if (skip && skip.some((pattern)=>!!path.match(pattern))) {
        return false;
    }
    return true;
}
function wrapErrorWithRootPath(err, root) {
    if (err instanceof Error && "root" in err) return err;
    const e = new Error();
    e.root = root;
    e.message = err instanceof Error ? `${err.message} for path "${root}"` : `[non-error thrown] for path "${root}"`;
    e.stack = err instanceof Error ? err.stack : undefined;
    e.cause = err instanceof Error ? err.cause : undefined;
    return e;
}
/** Walks the file tree rooted at root, yielding each file or directory in the
 * tree filtered according to the given options. The files are walked in lexical
 * order, which makes the output deterministic but means that for very large
 * directories walk() can be inefficient.
 *
 * Options:
 * - maxDepth?: number = Infinity;
 * - includeFiles?: boolean = true;
 * - includeDirs?: boolean = true;
 * - followSymlinks?: boolean = false;
 * - exts?: string[];
 * - match?: RegExp[];
 * - skip?: RegExp[];
 *
 * ```ts
 *       import { walk } from "./walk.ts";
 *       import { assert } from "../testing/asserts.ts";
 *
 *       for await (const entry of walk(".")) {
 *         console.log(entry.path);
 *         assert(entry.isFile);
 *       }
 * ```
 */ export async function* walk(root, { maxDepth =Infinity , includeFiles =true , includeDirs =true , followSymlinks =false , exts =undefined , match =undefined , skip =undefined  } = {}) {
    if (maxDepth < 0) {
        return;
    }
    if (includeDirs && include(root, exts, match, skip)) {
        yield await _createWalkEntry(root);
    }
    if (maxDepth < 1 || !include(root, undefined, undefined, skip)) {
        return;
    }
    try {
        for await (const entry of Deno.readDir(root)){
            assert(entry.name != null);
            let path = join(root, entry.name);
            let isFile = entry.isFile;
            if (entry.isSymlink) {
                if (followSymlinks) {
                    path = await Deno.realPath(path);
                    isFile = await Deno.lstat(path).then((s)=>s.isFile);
                } else {
                    continue;
                }
            }
            if (isFile) {
                if (includeFiles && include(path, exts, match, skip)) {
                    yield {
                        path,
                        ...entry
                    };
                }
            } else {
                yield* walk(path, {
                    maxDepth: maxDepth - 1,
                    includeFiles,
                    includeDirs,
                    followSymlinks,
                    exts,
                    match,
                    skip
                });
            }
        }
    } catch (err) {
        throw wrapErrorWithRootPath(err, normalize(root));
    }
}
/** Same as walk() but uses synchronous ops */ export function* walkSync(root, { maxDepth =Infinity , includeFiles =true , includeDirs =true , followSymlinks =false , exts =undefined , match =undefined , skip =undefined  } = {}) {
    if (maxDepth < 0) {
        return;
    }
    if (includeDirs && include(root, exts, match, skip)) {
        yield _createWalkEntrySync(root);
    }
    if (maxDepth < 1 || !include(root, undefined, undefined, skip)) {
        return;
    }
    let entries;
    try {
        entries = Deno.readDirSync(root);
    } catch (err) {
        throw wrapErrorWithRootPath(err, normalize(root));
    }
    for (const entry of entries){
        assert(entry.name != null);
        let path = join(root, entry.name);
        let isFile = entry.isFile;
        if (entry.isSymlink) {
            if (followSymlinks) {
                path = Deno.realPathSync(path);
                isFile = Deno.lstatSync(path).isFile;
            } else {
                continue;
            }
        }
        if (isFile) {
            if (includeFiles && include(path, exts, match, skip)) {
                yield {
                    path,
                    ...entry
                };
            }
        } else {
            yield* walkSync(path, {
                maxDepth: maxDepth - 1,
                includeFiles,
                includeDirs,
                followSymlinks,
                exts,
                match,
                skip
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2ZzL3dhbGsudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gRG9jdW1lbnRhdGlvbiBhbmQgaW50ZXJmYWNlIGZvciB3YWxrIHdlcmUgYWRhcHRlZCBmcm9tIEdvXG4vLyBodHRwczovL2dvbGFuZy5vcmcvcGtnL3BhdGgvZmlsZXBhdGgvI1dhbGtcbi8vIENvcHlyaWdodCAyMDA5IFRoZSBHbyBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBCU0QgbGljZW5zZS5cbmltcG9ydCB7IGFzc2VydCB9IGZyb20gXCIuLi9fdXRpbC9hc3NlcnQudHNcIjtcbmltcG9ydCB7IGJhc2VuYW1lLCBqb2luLCBub3JtYWxpemUgfSBmcm9tIFwiLi4vcGF0aC9tb2QudHNcIjtcblxuLyoqIENyZWF0ZSBXYWxrRW50cnkgZm9yIHRoZSBgcGF0aGAgc3luY2hyb25vdXNseSAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9jcmVhdGVXYWxrRW50cnlTeW5jKHBhdGg6IHN0cmluZyk6IFdhbGtFbnRyeSB7XG4gIHBhdGggPSBub3JtYWxpemUocGF0aCk7XG4gIGNvbnN0IG5hbWUgPSBiYXNlbmFtZShwYXRoKTtcbiAgY29uc3QgaW5mbyA9IERlbm8uc3RhdFN5bmMocGF0aCk7XG4gIHJldHVybiB7XG4gICAgcGF0aCxcbiAgICBuYW1lLFxuICAgIGlzRmlsZTogaW5mby5pc0ZpbGUsXG4gICAgaXNEaXJlY3Rvcnk6IGluZm8uaXNEaXJlY3RvcnksXG4gICAgaXNTeW1saW5rOiBpbmZvLmlzU3ltbGluayxcbiAgfTtcbn1cblxuLyoqIENyZWF0ZSBXYWxrRW50cnkgZm9yIHRoZSBgcGF0aGAgYXN5bmNocm9ub3VzbHkgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBfY3JlYXRlV2Fsa0VudHJ5KHBhdGg6IHN0cmluZyk6IFByb21pc2U8V2Fsa0VudHJ5PiB7XG4gIHBhdGggPSBub3JtYWxpemUocGF0aCk7XG4gIGNvbnN0IG5hbWUgPSBiYXNlbmFtZShwYXRoKTtcbiAgY29uc3QgaW5mbyA9IGF3YWl0IERlbm8uc3RhdChwYXRoKTtcbiAgcmV0dXJuIHtcbiAgICBwYXRoLFxuICAgIG5hbWUsXG4gICAgaXNGaWxlOiBpbmZvLmlzRmlsZSxcbiAgICBpc0RpcmVjdG9yeTogaW5mby5pc0RpcmVjdG9yeSxcbiAgICBpc1N5bWxpbms6IGluZm8uaXNTeW1saW5rLFxuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdhbGtPcHRpb25zIHtcbiAgbWF4RGVwdGg/OiBudW1iZXI7XG4gIGluY2x1ZGVGaWxlcz86IGJvb2xlYW47XG4gIGluY2x1ZGVEaXJzPzogYm9vbGVhbjtcbiAgZm9sbG93U3ltbGlua3M/OiBib29sZWFuO1xuICBleHRzPzogc3RyaW5nW107XG4gIG1hdGNoPzogUmVnRXhwW107XG4gIHNraXA/OiBSZWdFeHBbXTtcbn1cblxuZnVuY3Rpb24gaW5jbHVkZShcbiAgcGF0aDogc3RyaW5nLFxuICBleHRzPzogc3RyaW5nW10sXG4gIG1hdGNoPzogUmVnRXhwW10sXG4gIHNraXA/OiBSZWdFeHBbXSxcbik6IGJvb2xlYW4ge1xuICBpZiAoZXh0cyAmJiAhZXh0cy5zb21lKChleHQpOiBib29sZWFuID0+IHBhdGguZW5kc1dpdGgoZXh0KSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKG1hdGNoICYmICFtYXRjaC5zb21lKChwYXR0ZXJuKTogYm9vbGVhbiA9PiAhIXBhdGgubWF0Y2gocGF0dGVybikpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChza2lwICYmIHNraXAuc29tZSgocGF0dGVybik6IGJvb2xlYW4gPT4gISFwYXRoLm1hdGNoKHBhdHRlcm4pKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gd3JhcEVycm9yV2l0aFJvb3RQYXRoKGVycjogdW5rbm93biwgcm9vdDogc3RyaW5nKSB7XG4gIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvciAmJiBcInJvb3RcIiBpbiBlcnIpIHJldHVybiBlcnI7XG4gIGNvbnN0IGUgPSBuZXcgRXJyb3IoKSBhcyBFcnJvciAmIHsgcm9vdDogc3RyaW5nIH07XG4gIGUucm9vdCA9IHJvb3Q7XG4gIGUubWVzc2FnZSA9IGVyciBpbnN0YW5jZW9mIEVycm9yXG4gICAgPyBgJHtlcnIubWVzc2FnZX0gZm9yIHBhdGggXCIke3Jvb3R9XCJgXG4gICAgOiBgW25vbi1lcnJvciB0aHJvd25dIGZvciBwYXRoIFwiJHtyb290fVwiYDtcbiAgZS5zdGFjayA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLnN0YWNrIDogdW5kZWZpbmVkO1xuICBlLmNhdXNlID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIuY2F1c2UgOiB1bmRlZmluZWQ7XG4gIHJldHVybiBlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdhbGtFbnRyeSBleHRlbmRzIERlbm8uRGlyRW50cnkge1xuICBwYXRoOiBzdHJpbmc7XG59XG5cbi8qKiBXYWxrcyB0aGUgZmlsZSB0cmVlIHJvb3RlZCBhdCByb290LCB5aWVsZGluZyBlYWNoIGZpbGUgb3IgZGlyZWN0b3J5IGluIHRoZVxuICogdHJlZSBmaWx0ZXJlZCBhY2NvcmRpbmcgdG8gdGhlIGdpdmVuIG9wdGlvbnMuIFRoZSBmaWxlcyBhcmUgd2Fsa2VkIGluIGxleGljYWxcbiAqIG9yZGVyLCB3aGljaCBtYWtlcyB0aGUgb3V0cHV0IGRldGVybWluaXN0aWMgYnV0IG1lYW5zIHRoYXQgZm9yIHZlcnkgbGFyZ2VcbiAqIGRpcmVjdG9yaWVzIHdhbGsoKSBjYW4gYmUgaW5lZmZpY2llbnQuXG4gKlxuICogT3B0aW9uczpcbiAqIC0gbWF4RGVwdGg/OiBudW1iZXIgPSBJbmZpbml0eTtcbiAqIC0gaW5jbHVkZUZpbGVzPzogYm9vbGVhbiA9IHRydWU7XG4gKiAtIGluY2x1ZGVEaXJzPzogYm9vbGVhbiA9IHRydWU7XG4gKiAtIGZvbGxvd1N5bWxpbmtzPzogYm9vbGVhbiA9IGZhbHNlO1xuICogLSBleHRzPzogc3RyaW5nW107XG4gKiAtIG1hdGNoPzogUmVnRXhwW107XG4gKiAtIHNraXA/OiBSZWdFeHBbXTtcbiAqXG4gKiBgYGB0c1xuICogICAgICAgaW1wb3J0IHsgd2FsayB9IGZyb20gXCIuL3dhbGsudHNcIjtcbiAqICAgICAgIGltcG9ydCB7IGFzc2VydCB9IGZyb20gXCIuLi90ZXN0aW5nL2Fzc2VydHMudHNcIjtcbiAqXG4gKiAgICAgICBmb3IgYXdhaXQgKGNvbnN0IGVudHJ5IG9mIHdhbGsoXCIuXCIpKSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKGVudHJ5LnBhdGgpO1xuICogICAgICAgICBhc3NlcnQoZW50cnkuaXNGaWxlKTtcbiAqICAgICAgIH1cbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHdhbGsoXG4gIHJvb3Q6IHN0cmluZyxcbiAge1xuICAgIG1heERlcHRoID0gSW5maW5pdHksXG4gICAgaW5jbHVkZUZpbGVzID0gdHJ1ZSxcbiAgICBpbmNsdWRlRGlycyA9IHRydWUsXG4gICAgZm9sbG93U3ltbGlua3MgPSBmYWxzZSxcbiAgICBleHRzID0gdW5kZWZpbmVkLFxuICAgIG1hdGNoID0gdW5kZWZpbmVkLFxuICAgIHNraXAgPSB1bmRlZmluZWQsXG4gIH06IFdhbGtPcHRpb25zID0ge30sXG4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8V2Fsa0VudHJ5PiB7XG4gIGlmIChtYXhEZXB0aCA8IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGluY2x1ZGVEaXJzICYmIGluY2x1ZGUocm9vdCwgZXh0cywgbWF0Y2gsIHNraXApKSB7XG4gICAgeWllbGQgYXdhaXQgX2NyZWF0ZVdhbGtFbnRyeShyb290KTtcbiAgfVxuICBpZiAobWF4RGVwdGggPCAxIHx8ICFpbmNsdWRlKHJvb3QsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBza2lwKSkge1xuICAgIHJldHVybjtcbiAgfVxuICB0cnkge1xuICAgIGZvciBhd2FpdCAoY29uc3QgZW50cnkgb2YgRGVuby5yZWFkRGlyKHJvb3QpKSB7XG4gICAgICBhc3NlcnQoZW50cnkubmFtZSAhPSBudWxsKTtcbiAgICAgIGxldCBwYXRoID0gam9pbihyb290LCBlbnRyeS5uYW1lKTtcblxuICAgICAgbGV0IGlzRmlsZSA9IGVudHJ5LmlzRmlsZTtcblxuICAgICAgaWYgKGVudHJ5LmlzU3ltbGluaykge1xuICAgICAgICBpZiAoZm9sbG93U3ltbGlua3MpIHtcbiAgICAgICAgICBwYXRoID0gYXdhaXQgRGVuby5yZWFsUGF0aChwYXRoKTtcbiAgICAgICAgICBpc0ZpbGUgPSBhd2FpdCBEZW5vLmxzdGF0KHBhdGgpLnRoZW4oKHMpID0+IHMuaXNGaWxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoaXNGaWxlKSB7XG4gICAgICAgIGlmIChpbmNsdWRlRmlsZXMgJiYgaW5jbHVkZShwYXRoLCBleHRzLCBtYXRjaCwgc2tpcCkpIHtcbiAgICAgICAgICB5aWVsZCB7IHBhdGgsIC4uLmVudHJ5IH07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHlpZWxkKiB3YWxrKHBhdGgsIHtcbiAgICAgICAgICBtYXhEZXB0aDogbWF4RGVwdGggLSAxLFxuICAgICAgICAgIGluY2x1ZGVGaWxlcyxcbiAgICAgICAgICBpbmNsdWRlRGlycyxcbiAgICAgICAgICBmb2xsb3dTeW1saW5rcyxcbiAgICAgICAgICBleHRzLFxuICAgICAgICAgIG1hdGNoLFxuICAgICAgICAgIHNraXAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgd3JhcEVycm9yV2l0aFJvb3RQYXRoKGVyciwgbm9ybWFsaXplKHJvb3QpKTtcbiAgfVxufVxuXG4vKiogU2FtZSBhcyB3YWxrKCkgYnV0IHVzZXMgc3luY2hyb25vdXMgb3BzICovXG5leHBvcnQgZnVuY3Rpb24qIHdhbGtTeW5jKFxuICByb290OiBzdHJpbmcsXG4gIHtcbiAgICBtYXhEZXB0aCA9IEluZmluaXR5LFxuICAgIGluY2x1ZGVGaWxlcyA9IHRydWUsXG4gICAgaW5jbHVkZURpcnMgPSB0cnVlLFxuICAgIGZvbGxvd1N5bWxpbmtzID0gZmFsc2UsXG4gICAgZXh0cyA9IHVuZGVmaW5lZCxcbiAgICBtYXRjaCA9IHVuZGVmaW5lZCxcbiAgICBza2lwID0gdW5kZWZpbmVkLFxuICB9OiBXYWxrT3B0aW9ucyA9IHt9LFxuKTogSXRlcmFibGVJdGVyYXRvcjxXYWxrRW50cnk+IHtcbiAgaWYgKG1heERlcHRoIDwgMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoaW5jbHVkZURpcnMgJiYgaW5jbHVkZShyb290LCBleHRzLCBtYXRjaCwgc2tpcCkpIHtcbiAgICB5aWVsZCBfY3JlYXRlV2Fsa0VudHJ5U3luYyhyb290KTtcbiAgfVxuICBpZiAobWF4RGVwdGggPCAxIHx8ICFpbmNsdWRlKHJvb3QsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBza2lwKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgZW50cmllcztcbiAgdHJ5IHtcbiAgICBlbnRyaWVzID0gRGVuby5yZWFkRGlyU3luYyhyb290KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgd3JhcEVycm9yV2l0aFJvb3RQYXRoKGVyciwgbm9ybWFsaXplKHJvb3QpKTtcbiAgfVxuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICBhc3NlcnQoZW50cnkubmFtZSAhPSBudWxsKTtcbiAgICBsZXQgcGF0aCA9IGpvaW4ocm9vdCwgZW50cnkubmFtZSk7XG5cbiAgICBsZXQgaXNGaWxlID0gZW50cnkuaXNGaWxlO1xuICAgIGlmIChlbnRyeS5pc1N5bWxpbmspIHtcbiAgICAgIGlmIChmb2xsb3dTeW1saW5rcykge1xuICAgICAgICBwYXRoID0gRGVuby5yZWFsUGF0aFN5bmMocGF0aCk7XG4gICAgICAgIGlzRmlsZSA9IERlbm8ubHN0YXRTeW5jKHBhdGgpLmlzRmlsZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc0ZpbGUpIHtcbiAgICAgIGlmIChpbmNsdWRlRmlsZXMgJiYgaW5jbHVkZShwYXRoLCBleHRzLCBtYXRjaCwgc2tpcCkpIHtcbiAgICAgICAgeWllbGQgeyBwYXRoLCAuLi5lbnRyeSB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB5aWVsZCogd2Fsa1N5bmMocGF0aCwge1xuICAgICAgICBtYXhEZXB0aDogbWF4RGVwdGggLSAxLFxuICAgICAgICBpbmNsdWRlRmlsZXMsXG4gICAgICAgIGluY2x1ZGVEaXJzLFxuICAgICAgICBmb2xsb3dTeW1saW5rcyxcbiAgICAgICAgZXh0cyxcbiAgICAgICAgbWF0Y2gsXG4gICAgICAgIHNraXAsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSw0REFBNEQ7QUFDNUQsNkNBQTZDO0FBQzdDLG1FQUFtRTtBQUNuRSxTQUFTLE1BQU0sUUFBUSxxQkFBcUI7QUFDNUMsU0FBUyxRQUFRLEVBQUUsSUFBSSxFQUFFLFNBQVMsUUFBUSxpQkFBaUI7QUFFM0Qsa0RBQWtELEdBQ2xELE9BQU8sU0FBUyxxQkFBcUIsSUFBWSxFQUFhO0lBQzVELE9BQU8sVUFBVTtJQUNqQixNQUFNLE9BQU8sU0FBUztJQUN0QixNQUFNLE9BQU8sS0FBSyxRQUFRLENBQUM7SUFDM0IsT0FBTztRQUNMO1FBQ0E7UUFDQSxRQUFRLEtBQUssTUFBTTtRQUNuQixhQUFhLEtBQUssV0FBVztRQUM3QixXQUFXLEtBQUssU0FBUztJQUMzQjtBQUNGLENBQUM7QUFFRCxtREFBbUQsR0FDbkQsT0FBTyxlQUFlLGlCQUFpQixJQUFZLEVBQXNCO0lBQ3ZFLE9BQU8sVUFBVTtJQUNqQixNQUFNLE9BQU8sU0FBUztJQUN0QixNQUFNLE9BQU8sTUFBTSxLQUFLLElBQUksQ0FBQztJ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