/**
 * @author: lencx
 * @create_at: Jun 17, 2020
 */ import { fmtFileSize, trimPath, fileExt, isStr } from './utils.ts';
const encoder = new TextEncoder();
export async function findFile({ path , collect , exclude , ignore , hasInfo , isFirst  }) {
    let rs;
    try {
        rs = Deno.readDirSync(path);
    } catch (e) {
        await Deno.stderr.write(encoder.encode('NotFound: No such file or directory\n'));
        Deno.exit(-1);
    }
    path = trimPath(path);
    if (exclude && exclude.length) {
        let flag = false;
        exclude.some((i)=>{
            if (trimPath(i) === path) {
                flag = true;
                return true;
            }
        });
        if (flag) return;
    }
    for (const item of rs){
        let _path = `${path}/${item.name}`;
        _path = trimPath(_path);
        if (item.isDirectory) {
            // recursively directory
            findFile({
                path: _path,
                collect,
                exclude,
                ignore,
                hasInfo,
                isFirst: false
            });
        } else {
            const fExt = fileExt(item.name);
            //=== ignore rules
            // `**/*.ts`: recursive directory ignores files
            // `*.ts` : ignore files under `root path` or `include path`
            // `a/b/c.ts`: specific ignore files
            let flag = false;
            if (ignore && ignore.length) {
                ignore.some((i)=>{
                    const regRule = /^\*\./.test(i) && isFirst || /\*\*\/\*\./.test(i);
                    if (regRule && fExt && fExt === fileExt(i) || trimPath(i) === _path) {
                        flag = true;
                        return true;
                    }
                });
            }
            // collect files according to rules
            let fileInfo = null;
            if (hasInfo) {
                const info = Deno.statSync(_path);
                fileInfo = {
                    ...info,
                    fmtSize: fmtFileSize(info.size)
                };
            }
            !flag && collect.push({
                path: _path,
                name: item.name,
                ext: fExt,
                realPath: Deno.realPathSync(_path),
                info: fileInfo
            });
        }
    }
}
export function getFiles(opts) {
    const files = [];
    if (isStr(opts)) {
        findFile({
            path: opts,
            collect: files
        });
    } else {
        // there are multiple parameters
        const { root , include , exclude , ignore , hasInfo  } = opts;
        if (root && include === undefined) {
            findFile({
                path: root,
                collect: files,
                exclude,
                ignore,
                hasInfo,
                isFirst: true
            });
        }
        if (include && include.length === 0) return [];
        if (include) {
            include.forEach((dir)=>findFile({
                    path: dir,
                    collect: files,
                    ignore,
                    exclude,
                    hasInfo,
                    isFirst: true
                }));
        }
    }
    return files;
}
export default getFiles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZ2V0ZmlsZXNAdjEuMC4wL2ZzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGF1dGhvcjogbGVuY3hcbiAqIEBjcmVhdGVfYXQ6IEp1biAxNywgMjAyMFxuICovXG5cbmltcG9ydCB7IGZtdEZpbGVTaXplLCB0cmltUGF0aCwgZmlsZUV4dCwgaXNTdHIgfSBmcm9tICcuL3V0aWxzLnRzJztcbmltcG9ydCB7IEdldEZpbGVzT3B0aW9ucywgRmluZEZpbGVPcHRpb25zLCBGaWxlSW5mbyB9IGZyb20gJy4vdHlwZXMudHMnO1xuXG5jb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kRmlsZSh7IHBhdGgsIGNvbGxlY3QsIGV4Y2x1ZGUsIGlnbm9yZSwgaGFzSW5mbywgaXNGaXJzdCB9OiBGaW5kRmlsZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IHJzO1xuICB0cnkge1xuICAgIHJzID0gRGVuby5yZWFkRGlyU3luYyhwYXRoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGF3YWl0IERlbm8uc3RkZXJyLndyaXRlKGVuY29kZXIuZW5jb2RlKCdOb3RGb3VuZDogTm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeVxcbicpKVxuICAgIERlbm8uZXhpdCgtMSk7XG4gIH1cblxuICBwYXRoID0gdHJpbVBhdGgocGF0aCk7XG5cbiAgaWYgKGV4Y2x1ZGUgJiYgZXhjbHVkZS5sZW5ndGgpIHtcbiAgICBsZXQgZmxhZyA9IGZhbHNlO1xuICAgIGV4Y2x1ZGUuc29tZShpID0+IHtcbiAgICAgIGlmICh0cmltUGF0aChpKSA9PT0gcGF0aCkge1xuICAgICAgICBmbGFnID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSlcbiAgICBpZiAoZmxhZykgcmV0dXJuO1xuICB9XG5cbiAgZm9yIChjb25zdCBpdGVtIG9mIHJzKSB7XG4gICAgbGV0IF9wYXRoID0gYCR7cGF0aH0vJHtpdGVtLm5hbWV9YDtcbiAgICBfcGF0aCA9IHRyaW1QYXRoKF9wYXRoKTtcbiAgICBpZiAoaXRlbS5pc0RpcmVjdG9yeSkge1xuICAgICAgLy8gcmVjdXJzaXZlbHkgZGlyZWN0b3J5XG4gICAgICBmaW5kRmlsZSh7IHBhdGg6IF9wYXRoLCBjb2xsZWN0LCBleGNsdWRlLCBpZ25vcmUsIGhhc0luZm8sIGlzRmlyc3Q6IGZhbHNlIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBmRXh0ID0gZmlsZUV4dChpdGVtLm5hbWUpO1xuXG4gICAgICAvLz09PSBpZ25vcmUgcnVsZXNcbiAgICAgIC8vIGAqKi8qLnRzYDogcmVjdXJzaXZlIGRpcmVjdG9yeSBpZ25vcmVzIGZpbGVzXG4gICAgICAvLyBgKi50c2AgOiBpZ25vcmUgZmlsZXMgdW5kZXIgYHJvb3QgcGF0aGAgb3IgYGluY2x1ZGUgcGF0aGBcbiAgICAgIC8vIGBhL2IvYy50c2A6IHNwZWNpZmljIGlnbm9yZSBmaWxlc1xuICAgICAgbGV0IGZsYWcgPSBmYWxzZTtcbiAgICAgIGlmIChpZ25vcmUgJiYgaWdub3JlLmxlbmd0aCkge1xuICAgICAgICBpZ25vcmUuc29tZShpID0+IHtcbiAgICAgICAgICBjb25zdCByZWdSdWxlID0gKC9eXFwqXFwuLy50ZXN0KGkpICYmIGlzRmlyc3QpIHx8IC9cXCpcXCpcXC9cXCpcXC4vLnRlc3QoaSk7XG4gICAgICAgICAgaWYgKChyZWdSdWxlICYmIGZFeHQgJiYgZkV4dCA9PT0gZmlsZUV4dChpKSkgfHwgdHJpbVBhdGgoaSkgPT09IF9wYXRoKSB7XG4gICAgICAgICAgICBmbGFnID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgLy8gY29sbGVjdCBmaWxlcyBhY2NvcmRpbmcgdG8gcnVsZXNcbiAgICAgIGxldCBmaWxlSW5mbyA9IG51bGw7XG4gICAgICBpZiAoaGFzSW5mbykge1xuICAgICAgICBjb25zdCBpbmZvID0gRGVuby5zdGF0U3luYyhfcGF0aCk7XG4gICAgICAgIGZpbGVJbmZvID0ge1xuICAgICAgICAgIC4uLmluZm8sXG4gICAgICAgICAgZm10U2l6ZTogZm10RmlsZVNpemUoaW5mby5zaXplKSxcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgIWZsYWcgJiYgY29sbGVjdC5wdXNoKHtcbiAgICAgICAgcGF0aDogX3BhdGgsXG4gICAgICAgIG5hbWU6IGl0ZW0ubmFtZSxcbiAgICAgICAgZXh0OiBmRXh0LFxuICAgICAgICByZWFsUGF0aDogRGVuby5yZWFsUGF0aFN5bmMoX3BhdGgpLFxuICAgICAgICBpbmZvOiBmaWxlSW5mbyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZXM8VCBleHRlbmRzIChzdHJpbmcgfCBHZXRGaWxlc09wdGlvbnMpPihvcHRzOiBUKTogRmlsZUluZm9bXSB7XG4gIGNvbnN0IGZpbGVzOiBGaWxlSW5mb1tdID0gW107XG5cbiAgaWYgKGlzU3RyKG9wdHMpKSB7XG4gICAgZmluZEZpbGUoeyBwYXRoOiAob3B0cyBhcyBzdHJpbmcpLCBjb2xsZWN0OiBmaWxlcyB9KTtcbiAgfSBlbHNlIHtcbiAgICAvLyB0aGVyZSBhcmUgbXVsdGlwbGUgcGFyYW1ldGVyc1xuICAgIGNvbnN0IHsgcm9vdCwgaW5jbHVkZSwgZXhjbHVkZSwgaWdub3JlLCBoYXNJbmZvIH0gPSAob3B0cyBhcyBHZXRGaWxlc09wdGlvbnMpO1xuXG4gICAgaWYgKHJvb3QgJiYgaW5jbHVkZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBmaW5kRmlsZSh7IHBhdGg6IHJvb3QsIGNvbGxlY3Q6IGZpbGVzLCBleGNsdWRlLCBpZ25vcmUsIGhhc0luZm8sIGlzRmlyc3Q6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgaWYgKGluY2x1ZGUgJiYgaW5jbHVkZS5sZW5ndGggPT09IDApIHJldHVybiBbXTtcblxuICAgIGlmIChpbmNsdWRlKSB7XG4gICAgICBpbmNsdWRlLmZvckVhY2goZGlyID0+IGZpbmRGaWxlKHsgcGF0aDogZGlyLCBjb2xsZWN0OiBmaWxlcywgaWdub3JlLCBleGNsdWRlLCBoYXNJbmZvLCBpc0ZpcnN0OiB0cnVlIH0pKVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmlsZXM7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdldEZpbGVzOyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0csQ0FFSCxTQUFTLFdBQVcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssUUFBUSxZQUFZLENBQUM7QUFHbkUsTUFBTSxPQUFPLEdBQUcsSUFBSSxXQUFXLEVBQUUsQUFBQztBQUVsQyxPQUFPLGVBQWUsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFBLEVBQUUsT0FBTyxDQUFBLEVBQUUsT0FBTyxDQUFBLEVBQUUsTUFBTSxDQUFBLEVBQUUsT0FBTyxDQUFBLEVBQUUsT0FBTyxDQUFBLEVBQW1CLEVBQWlCO0lBQ25ILElBQUksRUFBRSxBQUFDO0lBQ1AsSUFBSTtRQUNGLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQzdCLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsdUNBQXVDLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDZjtJQUVELElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFdEIsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtRQUM3QixJQUFJLElBQUksR0FBRyxLQUFLLEFBQUM7UUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBLENBQUMsR0FBSTtZQUNoQixJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hCLElBQUksR0FB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