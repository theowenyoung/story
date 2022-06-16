// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
/** This module is browser compatible. */ import { SEP } from "./separator.ts";
/** Determines the common path from a set of paths, using an optional separator,
 * which defaults to the OS default separator.
 *
 *       import { common } from "https://deno.land/std/path/mod.ts";
 *       const p = common([
 *         "./deno/std/path/mod.ts",
 *         "./deno/std/fs/mod.ts",
 *       ]);
 *       console.log(p); // "./deno/std/"
 *
 */ export function common(paths, sep = SEP) {
    const [first = "", ...remaining] = paths;
    if (first === "" || remaining.length === 0) {
        return first.substring(0, first.lastIndexOf(sep) + 1);
    }
    const parts = first.split(sep);
    let endOfPrefix = parts.length;
    for (const path of remaining){
        const compare = path.split(sep);
        for(let i = 0; i < endOfPrefix; i++){
            if (compare[i] !== parts[i]) {
                endOfPrefix = i;
            }
        }
        if (endOfPrefix === 0) {
            return "";
        }
    }
    const prefix = parts.slice(0, endOfPrefix).join(sep);
    return prefix.endsWith(sep) ? prefix : `${prefix}${sep}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjcxLjAvcGF0aC9jb21tb24udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMCB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8qKiBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuICovXG5cbmltcG9ydCB7IFNFUCB9IGZyb20gXCIuL3NlcGFyYXRvci50c1wiO1xuXG4vKiogRGV0ZXJtaW5lcyB0aGUgY29tbW9uIHBhdGggZnJvbSBhIHNldCBvZiBwYXRocywgdXNpbmcgYW4gb3B0aW9uYWwgc2VwYXJhdG9yLFxuICogd2hpY2ggZGVmYXVsdHMgdG8gdGhlIE9TIGRlZmF1bHQgc2VwYXJhdG9yLlxuICpcbiAqICAgICAgIGltcG9ydCB7IGNvbW1vbiB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGQvcGF0aC9tb2QudHNcIjtcbiAqICAgICAgIGNvbnN0IHAgPSBjb21tb24oW1xuICogICAgICAgICBcIi4vZGVuby9zdGQvcGF0aC9tb2QudHNcIixcbiAqICAgICAgICAgXCIuL2Rlbm8vc3RkL2ZzL21vZC50c1wiLFxuICogICAgICAgXSk7XG4gKiAgICAgICBjb25zb2xlLmxvZyhwKTsgLy8gXCIuL2Rlbm8vc3RkL1wiXG4gKlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tbW9uKHBhdGhzOiBzdHJpbmdbXSwgc2VwID0gU0VQKTogc3RyaW5nIHtcbiAgY29uc3QgW2ZpcnN0ID0gXCJcIiwgLi4ucmVtYWluaW5nXSA9IHBhdGhzO1xuICBpZiAoZmlyc3QgPT09IFwiXCIgfHwgcmVtYWluaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBmaXJzdC5zdWJzdHJpbmcoMCwgZmlyc3QubGFzdEluZGV4T2Yoc2VwKSArIDEpO1xuICB9XG4gIGNvbnN0IHBhcnRzID0gZmlyc3Quc3BsaXQoc2VwKTtcblxuICBsZXQgZW5kT2ZQcmVmaXggPSBwYXJ0cy5sZW5ndGg7XG4gIGZvciAoY29uc3QgcGF0aCBvZiByZW1haW5pbmcpIHtcbiAgICBjb25zdCBjb21wYXJlID0gcGF0aC5zcGxpdChzZXApO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZW5kT2ZQcmVmaXg7IGkrKykge1xuICAgICAgaWYgKGNvbXBhcmVbaV0gIT09IHBhcnRzW2ldKSB7XG4gICAgICAgIGVuZE9mUHJlZml4ID0gaTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5kT2ZQcmVmaXggPT09IDApIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbiAgfVxuICBjb25zdCBwcmVmaXggPSBwYXJ0cy5zbGljZSgwLCBlbmRPZlByZWZpeCkuam9pbihzZXApO1xuICByZXR1cm4gcHJlZml4LmVuZHNXaXRoKHNlcCkgPyBwcmVmaXggOiBgJHtwcmVmaXh9JHtzZXB9YDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUseUNBQXlDLENBRXpDLFNBQVMsR0FBRyxRQUFRLGdCQUFnQixDQUFDO0FBRXJDOzs7Ozs7Ozs7O0dBVUcsQ0FDSCxPQUFPLFNBQVMsTUFBTSxDQUFDLEtBQWUsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFVO0lBQ3pELE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxFQUFFLEdBQUcsU0FBUyxDQUFDLEdBQUcsS0FBSyxBQUFDO0lBQ3pDLElBQUksS0FBSyxLQUFLLEVBQUUsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMxQyxPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDdkQ7SUFDRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxBQUFDO0lBRS9CLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLEFBQUM7SUFDL0IsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLENBQUU7UUFDNUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQUFBQztRQUNoQyxJQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFFO1lBQ3BDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDM0IsV0FBVyxHQUFHLENBQUMsQ0FBQzthQUNqQjtTQUNGO1FBRUQsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFO1lBQ3JCLE9BQU8sRUFBRSxDQUFDO1NBQ1g7S0FDRjtJQUNELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQUFBQztJQUNyRCxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0NBQzFEIn0=