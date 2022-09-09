import 'https://deno.land/x/hackle/init.ts';
import { isAbsolute, globToRegExp, normalize, joinGlobs, relative } from 'https://deno.land/std@0.71.0/path/mod.ts';
/**
 * Returns true if the file was included, but not excluded.
 * Files should be passed in as relative paths.
 * The first `./` part of the file or glob will be removed before testing
 *
 * > All Globs should be relative, preferably without the first `./` part
 */ export function checkFile({ file , absolutePathsAction , glob: { match: include , ignore: exclude  }  }) {
    const globIsFile = (file, glob)=>{
        file = normalize(file);
        const evaluate = (file, glob)=>{
            if (typeof glob === 'string') return globToRegExp(glob).test(file);
            else return glob.test(file);
        };
        if (isAbsolute(file)) {
            if (absolutePathsAction === 'error') throw new Error(`Encountered an absolute path while 'absolutePathsAction' was set to 'error'`);
            else if (absolutePathsAction === 'remove-slash-one') return globIsFile(file.slice(1), glob);
            else if (absolutePathsAction === 'make-glob-absolute' && typeof glob === 'string') return evaluate(file, joinGlobs([
                Deno.cwd(),
                glob
            ]));
            else if (!absolutePathsAction || absolutePathsAction === 'make-file-relative') return globIsFile(relative(Deno.cwd(), file), glob);
            else throw new Error(`'${absolutePathsAction}' is an invalid value for 'absolutePathsAction'.  See the glob-filter docs for details`);
        } else if (typeof glob === 'string' && glob.startsWith('./')) return globIsFile(file, glob.slice(2));
        else if (file.startsWith('./')) return globIsFile(file.slice(2), glob);
        return evaluate(file, glob);
    };
    const makeArray = (data)=>Array.isArray(data) ? data : [
            data
        ];
    let didInclude = false;
    for (let glob of makeArray(include)){
        if (globIsFile(file, glob)) {
            didInclude = true;
            break;
        }
    }
    if (!didInclude) return false;
    let didExclude = false;
    for (let glob1 of makeArray(exclude)){
        if (globIsFile(file, glob1)) {
            didExclude = true;
            break;
        }
    }
    return !didExclude;
}
/**
 * Filters out the files that were either not included in `globs.include`, or excluded from `globs.exclude`.
 * Files should be passed in as relative paths.
 * The first `./` part of the file or glob will be removed before testing
 */ export function filterFiles(files, globs, options = {}) {
    return files.filter((file)=>checkFile({
            file,
            glob: globs,
            ...options
        }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZ2xvYl9maWx0ZXJAMS4wLjAvbW9kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnaHR0cHM6Ly9kZW5vLmxhbmQveC9oYWNrbGUvaW5pdC50cydcbmltcG9ydCB7IGlzQWJzb2x1dGUsIGdsb2JUb1JlZ0V4cCwgbm9ybWFsaXplLCBqb2luR2xvYnMsIHJlbGF0aXZlIH0gZnJvbSAnaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQDAuNzEuMC9wYXRoL21vZC50cydcblxuZXhwb3J0IGludGVyZmFjZSBHbG9iRGF0YSB7XG5cdG1hdGNoOiAoc3RyaW5nIHwgUmVnRXhwKVtdIHwgc3RyaW5nIHwgUmVnRXhwXG5cdGlnbm9yZTogKHN0cmluZyB8IFJlZ0V4cClbXSB8IHN0cmluZyB8IFJlZ0V4cFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ09wdGlvbnMge1xuXHQvKipcblx0ICogV2hhdCBgZXZhbHVhdGVHbG9iYCBzaG91bGQgZG8gd2l0aCBhYnNvbHV0ZSBmaWxlc1xuXHQgKiAtIGBlcnJvcmAgLSBlcnJvcnMgb3V0XG5cdCAqIC0gYG1ha2UtZ2xvYi1hYnNvbHV0ZWAgLSBwcmVwZW5kcyBgRGVuby5jd2QoKWAgb250byB0aGUgZ2xvYlxuXHQgKiAtIGByZW1vdmUtc2xhc2gtb25lYCAtIHJlbW92ZXMgYW55IGxlYWRpbmcgYC9gJ3MgZnJvbSB0aGUgZmlsZSBwYXRoXG5cdCAqIC0gYG1ha2UtZmlsZS1yZWxhdGl2ZWAgLSB0cmllcyB0byBtYWtlIHRoZSBmaWxlIHBhdGggcmVsYXRpdmUgdG8gYERlbm8uY3dkKClgXG5cdCAqXG5cdCAqIEBkZWZhdWx0ICdtYWtlLWZpbGUtcmVsYXRpdmUnXG5cdCAqL1xuXHRhYnNvbHV0ZVBhdGhzQWN0aW9uPzogJ2Vycm9yJyB8ICdtYWtlLWdsb2ItYWJzb2x1dGUnIHwgJ3JlbW92ZS1zbGFzaC1vbmUnIHwgJ21ha2UtZmlsZS1yZWxhdGl2ZSdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFdmFsdWF0ZUdsb2JzUGFyYW1zIGV4dGVuZHMgQ29uZmlnT3B0aW9ucyB7XG5cdC8qKiBUaGUgZmlsZSB0byBiZSBldmFsdWF0ZWQgKi9cblx0ZmlsZTogc3RyaW5nXG5cblx0LyoqIFRoZSBnbG9icyB0aGUgZmlsZSBpcyB0byBiZSB0ZXN0ZWQgYnkgKi9cblx0Z2xvYjogR2xvYkRhdGFcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGZpbGUgd2FzIGluY2x1ZGVkLCBidXQgbm90IGV4Y2x1ZGVkLlxuICogRmlsZXMgc2hvdWxkIGJlIHBhc3NlZCBpbiBhcyByZWxhdGl2ZSBwYXRocy5cbiAqIFRoZSBmaXJzdCBgLi9gIHBhcnQgb2YgdGhlIGZpbGUgb3IgZ2xvYiB3aWxsIGJlIHJlbW92ZWQgYmVmb3JlIHRlc3RpbmdcbiAqXG4gKiA+IEFsbCBHbG9icyBzaG91bGQgYmUgcmVsYXRpdmUsIHByZWZlcmFibHkgd2l0aG91dCB0aGUgZmlyc3QgYC4vYCBwYXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0ZpbGUoeyBmaWxlLCBhYnNvbHV0ZVBhdGhzQWN0aW9uLCBnbG9iOiB7IG1hdGNoOiBpbmNsdWRlLCBpZ25vcmU6IGV4Y2x1ZGUgfSB9OiBFdmFsdWF0ZUdsb2JzUGFyYW1zKTogYm9vbGVhbiB7XG5cdGNvbnN0IGdsb2JJc0ZpbGUgPSAoZmlsZTogc3RyaW5nLCBnbG9iOiBzdHJpbmcgfCBSZWdFeHApOiBib29sZWFuID0+IHtcblx0XHRmaWxlID0gbm9ybWFsaXplKGZpbGUpXG5cblx0XHRjb25zdCBldmFsdWF0ZSA9IChmaWxlOiBzdHJpbmcsIGdsb2I6IHN0cmluZyB8IFJlZ0V4cCk6IGJvb2xlYW4gPT4ge1xuXHRcdFx0aWYgKHR5cGVvZiBnbG9iID09PSAnc3RyaW5nJykgcmV0dXJuIGdsb2JUb1JlZ0V4cChnbG9iKS50ZXN0KGZpbGUpXG5cdFx0XHRlbHNlIHJldHVybiBnbG9iLnRlc3QoZmlsZSlcblx0XHR9XG5cblx0XHRpZiAoaXNBYnNvbHV0ZShmaWxlKSkge1xuXHRcdFx0aWYgKGFic29sdXRlUGF0aHNBY3Rpb24gPT09ICdlcnJvcicpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihgRW5jb3VudGVyZWQgYW4gYWJzb2x1dGUgcGF0aCB3aGlsZSAnYWJzb2x1dGVQYXRoc0FjdGlvbicgd2FzIHNldCB0byAnZXJyb3InYClcblx0XHRcdGVsc2UgaWYgKGFic29sdXRlUGF0aHNBY3Rpb24gPT09ICdyZW1vdmUtc2xhc2gtb25lJykgcmV0dXJuIGdsb2JJc0ZpbGUoZmlsZS5zbGljZSgxKSwgZ2xvYilcblx0XHRcdGVsc2UgaWYgKGFic29sdXRlUGF0aHNBY3Rpb24gPT09ICdtYWtlLWdsb2ItYWJzb2x1dGUnICYmIHR5cGVvZiBnbG9iID09PSAnc3RyaW5nJylcblx0XHRcdFx0cmV0dXJuIGV2YWx1YXRlKGZpbGUsIGpvaW5HbG9icyhbRGVuby5jd2QoKSwgZ2xvYl0pKVxuXHRcdFx0ZWxzZSBpZiAoIWFic29sdXRlUGF0aHNBY3Rpb24gfHwgYWJzb2x1dGVQYXRoc0FjdGlvbiA9PT0gJ21ha2UtZmlsZS1yZWxhdGl2ZScpXG5cdFx0XHRcdHJldHVybiBnbG9iSXNGaWxlKHJlbGF0aXZlKERlbm8uY3dkKCksIGZpbGUpLCBnbG9iKVxuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXG5cdFx0XHRcdFx0YCcke2Fic29sdXRlUGF0aHNBY3Rpb259JyBpcyBhbiBpbnZhbGlkIHZhbHVlIGZvciAnYWJzb2x1dGVQYXRoc0FjdGlvbicuICBTZWUgdGhlIGdsb2ItZmlsdGVyIGRvY3MgZm9yIGRldGFpbHNgXG5cdFx0XHRcdClcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBnbG9iID09PSAnc3RyaW5nJyAmJiBnbG9iLnN0YXJ0c1dpdGgoJy4vJykpIHJldHVybiBnbG9iSXNGaWxlKGZpbGUsIGdsb2Iuc2xpY2UoMikpXG5cdFx0ZWxzZSBpZiAoZmlsZS5zdGFydHNXaXRoKCcuLycpKSByZXR1cm4gZ2xvYklzRmlsZShmaWxlLnNsaWNlKDIpLCBnbG9iKVxuXG5cdFx0cmV0dXJuIGV2YWx1YXRlKGZpbGUsIGdsb2IpXG5cdH1cblxuXHRjb25zdCBtYWtlQXJyYXkgPSA8VD4oZGF0YTogVFtdIHwgVCkgPT4gKEFycmF5LmlzQXJyYXkoZGF0YSkgPyBkYXRhIDogW2RhdGFdKVxuXG5cdGxldCBkaWRJbmNsdWRlID0gZmFsc2Vcblx0Zm9yIChsZXQgZ2xvYiBvZiBtYWtlQXJyYXkoaW5jbHVkZSkpIHtcblx0XHRpZiAoZ2xvYklzRmlsZShmaWxlLCBnbG9iKSkge1xuXHRcdFx0ZGlkSW5jbHVkZSA9IHRydWVcblx0XHRcdGJyZWFrXG5cdFx0fVxuXHR9XG5cblx0aWYgKCFkaWRJbmNsdWRlKSByZXR1cm4gZmFsc2VcblxuXHRsZXQgZGlkRXhjbHVkZSA9IGZhbHNlXG5cdGZvciAobGV0IGdsb2Igb2YgbWFrZUFycmF5KGV4Y2x1ZGUpKSB7XG5cdFx0aWYgKGdsb2JJc0ZpbGUoZmlsZSwgZ2xvYikpIHtcblx0XHRcdGRpZEV4Y2x1ZGUgPSB0cnVlXG5cdFx0XHRicmVha1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiAhZGlkRXhjbHVkZVxufVxuXG4vKipcbiAqIEZpbHRlcnMgb3V0IHRoZSBmaWxlcyB0aGF0IHdlcmUgZWl0aGVyIG5vdCBpbmNsdWRlZCBpbiBgZ2xvYnMuaW5jbHVkZWAsIG9yIGV4Y2x1ZGVkIGZyb20gYGdsb2JzLmV4Y2x1ZGVgLlxuICogRmlsZXMgc2hvdWxkIGJlIHBhc3NlZCBpbiBhcyByZWxhdGl2ZSBwYXRocy5cbiAqIFRoZSBmaXJzdCBgLi9gIHBhcnQgb2YgdGhlIGZpbGUgb3IgZ2xvYiB3aWxsIGJlIHJlbW92ZWQgYmVmb3JlIHRlc3RpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckZpbGVzKGZpbGVzOiBzdHJpbmdbXSwgZ2xvYnM6IEdsb2JEYXRhLCBvcHRpb25zOiBDb25maWdPcHRpb25zID0ge30pIHtcblx0cmV0dXJuIGZpbGVzLmZpbHRlcihmaWxlID0+IGNoZWNrRmlsZSh7IGZpbGUsIGdsb2I6IGds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