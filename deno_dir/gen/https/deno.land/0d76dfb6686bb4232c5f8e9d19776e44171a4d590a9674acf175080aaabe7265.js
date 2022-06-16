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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2ZzL3dhbGsudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gRG9jdW1lbnRhdGlvbiBhbmQgaW50ZXJmYWNlIGZvciB3YWxrIHdlcmUgYWRhcHRlZCBmcm9tIEdvXG4vLyBodHRwczovL2dvbGFuZy5vcmcvcGtnL3BhdGgvZmlsZXBhdGgvI1dhbGtcbi8vIENvcHlyaWdodCAyMDA5IFRoZSBHbyBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBCU0QgbGljZW5zZS5cbmltcG9ydCB7IGFzc2VydCB9IGZyb20gXCIuLi9fdXRpbC9hc3NlcnQudHNcIjtcbmltcG9ydCB7IGJhc2VuYW1lLCBqb2luLCBub3JtYWxpemUgfSBmcm9tIFwiLi4vcGF0aC9tb2QudHNcIjtcblxuLyoqIENyZWF0ZSBXYWxrRW50cnkgZm9yIHRoZSBgcGF0aGAgc3luY2hyb25vdXNseSAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9jcmVhdGVXYWxrRW50cnlTeW5jKHBhdGg6IHN0cmluZyk6IFdhbGtFbnRyeSB7XG4gIHBhdGggPSBub3JtYWxpemUocGF0aCk7XG4gIGNvbnN0IG5hbWUgPSBiYXNlbmFtZShwYXRoKTtcbiAgY29uc3QgaW5mbyA9IERlbm8uc3RhdFN5bmMocGF0aCk7XG4gIHJldHVybiB7XG4gICAgcGF0aCxcbiAgICBuYW1lLFxuICAgIGlzRmlsZTogaW5mby5pc0ZpbGUsXG4gICAgaXNEaXJlY3Rvcnk6IGluZm8uaXNEaXJlY3RvcnksXG4gICAgaXNTeW1saW5rOiBpbmZvLmlzU3ltbGluayxcbiAgfTtcbn1cblxuLyoqIENyZWF0ZSBXYWxrRW50cnkgZm9yIHRoZSBgcGF0aGAgYXN5bmNocm9ub3VzbHkgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBfY3JlYXRlV2Fsa0VudHJ5KHBhdGg6IHN0cmluZyk6IFByb21pc2U8V2Fsa0VudHJ5PiB7XG4gIHBhdGggPSBub3JtYWxpemUocGF0aCk7XG4gIGNvbnN0IG5hbWUgPSBiYXNlbmFtZShwYXRoKTtcbiAgY29uc3QgaW5mbyA9IGF3YWl0IERlbm8uc3RhdChwYXRoKTtcbiAgcmV0dXJuIHtcbiAgICBwYXRoLFxuICAgIG5hbWUsXG4gICAgaXNGaWxlOiBpbmZvLmlzRmlsZSxcbiAgICBpc0RpcmVjdG9yeTogaW5mby5pc0RpcmVjdG9yeSxcbiAgICBpc1N5bWxpbms6IGluZm8uaXNTeW1saW5rLFxuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdhbGtPcHRpb25zIHtcbiAgbWF4RGVwdGg/OiBudW1iZXI7XG4gIGluY2x1ZGVGaWxlcz86IGJvb2xlYW47XG4gIGluY2x1ZGVEaXJzPzogYm9vbGVhbjtcbiAgZm9sbG93U3ltbGlua3M/OiBib29sZWFuO1xuICBleHRzPzogc3RyaW5nW107XG4gIG1hdGNoPzogUmVnRXhwW107XG4gIHNraXA/OiBSZWdFeHBbXTtcbn1cblxuZnVuY3Rpb24gaW5jbHVkZShcbiAgcGF0aDogc3RyaW5nLFxuICBleHRzPzogc3RyaW5nW10sXG4gIG1hdGNoPzogUmVnRXhwW10sXG4gIHNraXA/OiBSZWdFeHBbXSxcbik6IGJvb2xlYW4ge1xuICBpZiAoZXh0cyAmJiAhZXh0cy5zb21lKChleHQpOiBib29sZWFuID0+IHBhdGguZW5kc1dpdGgoZXh0KSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKG1hdGNoICYmICFtYXRjaC5zb21lKChwYXR0ZXJuKTogYm9vbGVhbiA9PiAhIXBhdGgubWF0Y2gocGF0dGVybikpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChza2lwICYmIHNraXAuc29tZSgocGF0dGVybik6IGJvb2xlYW4gPT4gISFwYXRoLm1hdGNoKHBhdHRlcm4pKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gd3JhcEVycm9yV2l0aFJvb3RQYXRoKGVycjogdW5rbm93biwgcm9vdDogc3RyaW5nKSB7XG4gIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvciAmJiBcInJvb3RcIiBpbiBlcnIpIHJldHVybiBlcnI7XG4gIGNvbnN0IGUgPSBuZXcgRXJyb3IoKSBhcyBFcnJvciAmIHsgcm9vdDogc3RyaW5nIH07XG4gIGUucm9vdCA9IHJvb3Q7XG4gIGUubWVzc2FnZSA9IGVyciBpbnN0YW5jZW9mIEVycm9yXG4gICAgPyBgJHtlcnIubWVzc2FnZX0gZm9yIHBhdGggXCIke3Jvb3R9XCJgXG4gICAgOiBgW25vbi1lcnJvciB0aHJvd25dIGZvciBwYXRoIFwiJHtyb290fVwiYDtcbiAgZS5zdGFjayA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLnN0YWNrIDogdW5kZWZpbmVkO1xuICBlLmNhdXNlID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIuY2F1c2UgOiB1bmRlZmluZWQ7XG4gIHJldHVybiBlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdhbGtFbnRyeSBleHRlbmRzIERlbm8uRGlyRW50cnkge1xuICBwYXRoOiBzdHJpbmc7XG59XG5cbi8qKiBXYWxrcyB0aGUgZmlsZSB0cmVlIHJvb3RlZCBhdCByb290LCB5aWVsZGluZyBlYWNoIGZpbGUgb3IgZGlyZWN0b3J5IGluIHRoZVxuICogdHJlZSBmaWx0ZXJlZCBhY2NvcmRpbmcgdG8gdGhlIGdpdmVuIG9wdGlvbnMuIFRoZSBmaWxlcyBhcmUgd2Fsa2VkIGluIGxleGljYWxcbiAqIG9yZGVyLCB3aGljaCBtYWtlcyB0aGUgb3V0cHV0IGRldGVybWluaXN0aWMgYnV0IG1lYW5zIHRoYXQgZm9yIHZlcnkgbGFyZ2VcbiAqIGRpcmVjdG9yaWVzIHdhbGsoKSBjYW4gYmUgaW5lZmZpY2llbnQuXG4gKlxuICogT3B0aW9uczpcbiAqIC0gbWF4RGVwdGg/OiBudW1iZXIgPSBJbmZpbml0eTtcbiAqIC0gaW5jbHVkZUZpbGVzPzogYm9vbGVhbiA9IHRydWU7XG4gKiAtIGluY2x1ZGVEaXJzPzogYm9vbGVhbiA9IHRydWU7XG4gKiAtIGZvbGxvd1N5bWxpbmtzPzogYm9vbGVhbiA9IGZhbHNlO1xuICogLSBleHRzPzogc3RyaW5nW107XG4gKiAtIG1hdGNoPzogUmVnRXhwW107XG4gKiAtIHNraXA/OiBSZWdFeHBbXTtcbiAqXG4gKiBgYGB0c1xuICogICAgICAgaW1wb3J0IHsgd2FsayB9IGZyb20gXCIuL3dhbGsudHNcIjtcbiAqICAgICAgIGltcG9ydCB7IGFzc2VydCB9IGZyb20gXCIuLi90ZXN0aW5nL2Fzc2VydHMudHNcIjtcbiAqXG4gKiAgICAgICBmb3IgYXdhaXQgKGNvbnN0IGVudHJ5IG9mIHdhbGsoXCIuXCIpKSB7XG4gKiAgICAgICAgIGNvbnNvbGUubG9nKGVudHJ5LnBhdGgpO1xuICogICAgICAgICBhc3NlcnQoZW50cnkuaXNGaWxlKTtcbiAqICAgICAgIH1cbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHdhbGsoXG4gIHJvb3Q6IHN0cmluZyxcbiAge1xuICAgIG1heERlcHRoID0gSW5maW5pdHksXG4gICAgaW5jbHVkZUZpbGVzID0gdHJ1ZSxcbiAgICBpbmNsdWRlRGlycyA9IHRydWUsXG4gICAgZm9sbG93U3ltbGlua3MgPSBmYWxzZSxcbiAgICBleHRzID0gdW5kZWZpbmVkLFxuICAgIG1hdGNoID0gdW5kZWZpbmVkLFxuICAgIHNraXAgPSB1bmRlZmluZWQsXG4gIH06IFdhbGtPcHRpb25zID0ge30sXG4pOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8V2Fsa0VudHJ5PiB7XG4gIGlmIChtYXhEZXB0aCA8IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGluY2x1ZGVEaXJzICYmIGluY2x1ZGUocm9vdCwgZXh0cywgbWF0Y2gsIHNraXApKSB7XG4gICAgeWllbGQgYXdhaXQgX2NyZWF0ZVdhbGtFbnRyeShyb290KTtcbiAgfVxuICBpZiAobWF4RGVwdGggPCAxIHx8ICFpbmNsdWRlKHJvb3QsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBza2lwKSkge1xuICAgIHJldHVybjtcbiAgfVxuICB0cnkge1xuICAgIGZvciBhd2FpdCAoY29uc3QgZW50cnkgb2YgRGVuby5yZWFkRGlyKHJvb3QpKSB7XG4gICAgICBhc3NlcnQoZW50cnkubmFtZSAhPSBudWxsKTtcbiAgICAgIGxldCBwYXRoID0gam9pbihyb290LCBlbnRyeS5uYW1lKTtcblxuICAgICAgbGV0IGlzRmlsZSA9IGVudHJ5LmlzRmlsZTtcblxuICAgICAgaWYgKGVudHJ5LmlzU3ltbGluaykge1xuICAgICAgICBpZiAoZm9sbG93U3ltbGlua3MpIHtcbiAgICAgICAgICBwYXRoID0gYXdhaXQgRGVuby5yZWFsUGF0aChwYXRoKTtcbiAgICAgICAgICBpc0ZpbGUgPSBhd2FpdCBEZW5vLmxzdGF0KHBhdGgpLnRoZW4oKHMpID0+IHMuaXNGaWxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoaXNGaWxlKSB7XG4gICAgICAgIGlmIChpbmNsdWRlRmlsZXMgJiYgaW5jbHVkZShwYXRoLCBleHRzLCBtYXRjaCwgc2tpcCkpIHtcbiAgICAgICAgICB5aWVsZCB7IHBhdGgsIC4uLmVudHJ5IH07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHlpZWxkKiB3YWxrKHBhdGgsIHtcbiAgICAgICAgICBtYXhEZXB0aDogbWF4RGVwdGggLSAxLFxuICAgICAgICAgIGluY2x1ZGVGaWxlcyxcbiAgICAgICAgICBpbmNsdWRlRGlycyxcbiAgICAgICAgICBmb2xsb3dTeW1saW5rcyxcbiAgICAgICAgICBleHRzLFxuICAgICAgICAgIG1hdGNoLFxuICAgICAgICAgIHNraXAsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgd3JhcEVycm9yV2l0aFJvb3RQYXRoKGVyciwgbm9ybWFsaXplKHJvb3QpKTtcbiAgfVxufVxuXG4vKiogU2FtZSBhcyB3YWxrKCkgYnV0IHVzZXMgc3luY2hyb25vdXMgb3BzICovXG5leHBvcnQgZnVuY3Rpb24qIHdhbGtTeW5jKFxuICByb290OiBzdHJpbmcsXG4gIHtcbiAgICBtYXhEZXB0aCA9IEluZmluaXR5LFxuICAgIGluY2x1ZGVGaWxlcyA9IHRydWUsXG4gICAgaW5jbHVkZURpcnMgPSB0cnVlLFxuICAgIGZvbGxvd1N5bWxpbmtzID0gZmFsc2UsXG4gICAgZXh0cyA9IHVuZGVmaW5lZCxcbiAgICBtYXRjaCA9IHVuZGVmaW5lZCxcbiAgICBza2lwID0gdW5kZWZpbmVkLFxuICB9OiBXYWxrT3B0aW9ucyA9IHt9LFxuKTogSXRlcmFibGVJdGVyYXRvcjxXYWxrRW50cnk+IHtcbiAgaWYgKG1heERlcHRoIDwgMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoaW5jbHVkZURpcnMgJiYgaW5jbHVkZShyb290LCBleHRzLCBtYXRjaCwgc2tpcCkpIHtcbiAgICB5aWVsZCBfY3JlYXRlV2Fsa0VudHJ5U3luYyhyb290KTtcbiAgfVxuICBpZiAobWF4RGVwdGggPCAxIHx8ICFpbmNsdWRlKHJvb3QsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBza2lwKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgZW50cmllcztcbiAgdHJ5IHtcbiAgICBlbnRyaWVzID0gRGVuby5yZWFkRGlyU3luYyhyb290KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgd3JhcEVycm9yV2l0aFJvb3RQYXRoKGVyciwgbm9ybWFsaXplKHJvb3QpKTtcbiAgfVxuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICBhc3NlcnQoZW50cnkubmFtZSAhPSBudWxsKTtcbiAgICBsZXQgcGF0aCA9IGpvaW4ocm9vdCwgZW50cnkubmFtZSk7XG5cbiAgICBsZXQgaXNGaWxlID0gZW50cnkuaXNGaWxlO1xuICAgIGlmIChlbnRyeS5pc1N5bWxpbmspIHtcbiAgICAgIGlmIChmb2xsb3dTeW1saW5rcykge1xuICAgICAgICBwYXRoID0gRGVuby5yZWFsUGF0aFN5bmMocGF0aCk7XG4gICAgICAgIGlzRmlsZSA9IERlbm8ubHN0YXRTeW5jKHBhdGgpLmlzRmlsZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc0ZpbGUpIHtcbiAgICAgIGlmIChpbmNsdWRlRmlsZXMgJiYgaW5jbHVkZShwYXRoLCBleHRzLCBtYXRjaCwgc2tpcCkpIHtcbiAgICAgICAgeWllbGQgeyBwYXRoLCAuLi5lbnRyeSB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB5aWVsZCogd2Fsa1N5bmMocGF0aCwge1xuICAgICAgICBtYXhEZXB0aDogbWF4RGVwdGggLSAxLFxuICAgICAgICBpbmNsdWRlRmlsZXMsXG4gICAgICAgIGluY2x1ZGVEaXJzLFxuICAgICAgICBmb2xsb3dTeW1saW5rcyxcbiAgICAgICAgZXh0cyxcbiAgICAgICAgbWF0Y2gsXG4gICAgICAgIHNraXAsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSw0REFBNEQ7QUFDNUQsNkNBQTZDO0FBQzdDLG1FQUFtRTtBQUNuRSxTQUFTLE1BQU0sUUFBUSxvQkFBb0IsQ0FBQztBQUM1QyxTQUFTLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBUyxRQUFRLGdCQUFnQixDQUFDO0FBRTNELG9EQUFvRCxDQUNwRCxPQUFPLFNBQVMsb0JBQW9CLENBQUMsSUFBWSxFQUFhO0lBQzVELElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkIsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxBQUFDO0lBQzVCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEFBQUM7SUFDakMsT0FBTztRQUNMLElBQUk7UUFDSixJQUFJO1FBQ0osTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1FBQ25CLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztRQUM3QixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7S0FDMUIs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