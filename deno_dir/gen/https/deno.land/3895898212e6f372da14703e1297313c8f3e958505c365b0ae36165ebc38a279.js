// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { join } from "../path/mod.ts";
/**
 * Ensures that a directory is empty.
 * Deletes directory contents if the directory is not empty.
 * If the directory does not exist, it is created.
 * The directory itself is not deleted.
 * Requires the `--allow-read` and `--allow-write` flag.
 */ export async function emptyDir(dir) {
    try {
        const items = [];
        for await (const dirEntry of Deno.readDir(dir)){
            items.push(dirEntry);
        }
        while(items.length){
            const item = items.shift();
            if (item && item.name) {
                const filepath = join(dir, item.name);
                await Deno.remove(filepath, {
                    recursive: true
                });
            }
        }
    } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
            throw err;
        }
        // if not exist. then create it
        await Deno.mkdir(dir, {
            recursive: true
        });
    }
}
/**
 * Ensures that a directory is empty.
 * Deletes directory contents if the directory is not empty.
 * If the directory does not exist, it is created.
 * The directory itself is not deleted.
 * Requires the `--allow-read` and `--allow-write` flag.
 */ export function emptyDirSync(dir) {
    try {
        const items = [
            ...Deno.readDirSync(dir)
        ];
        // If the directory exists, remove all entries inside it.
        while(items.length){
            const item = items.shift();
            if (item && item.name) {
                const filepath = join(dir, item.name);
                Deno.removeSync(filepath, {
                    recursive: true
                });
            }
        }
    } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
            throw err;
        }
        // if not exist. then create it
        Deno.mkdirSync(dir, {
            recursive: true
        });
        return;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2ZzL2VtcHR5X2Rpci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIxIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuaW1wb3J0IHsgam9pbiB9IGZyb20gXCIuLi9wYXRoL21vZC50c1wiO1xuXG4vKipcbiAqIEVuc3VyZXMgdGhhdCBhIGRpcmVjdG9yeSBpcyBlbXB0eS5cbiAqIERlbGV0ZXMgZGlyZWN0b3J5IGNvbnRlbnRzIGlmIHRoZSBkaXJlY3RvcnkgaXMgbm90IGVtcHR5LlxuICogSWYgdGhlIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdCwgaXQgaXMgY3JlYXRlZC5cbiAqIFRoZSBkaXJlY3RvcnkgaXRzZWxmIGlzIG5vdCBkZWxldGVkLlxuICogUmVxdWlyZXMgdGhlIGAtLWFsbG93LXJlYWRgIGFuZCBgLS1hbGxvdy13cml0ZWAgZmxhZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVtcHR5RGlyKGRpcjogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgaXRlbXMgPSBbXTtcbiAgICBmb3IgYXdhaXQgKGNvbnN0IGRpckVudHJ5IG9mIERlbm8ucmVhZERpcihkaXIpKSB7XG4gICAgICBpdGVtcy5wdXNoKGRpckVudHJ5KTtcbiAgICB9XG5cbiAgICB3aGlsZSAoaXRlbXMubGVuZ3RoKSB7XG4gICAgICBjb25zdCBpdGVtID0gaXRlbXMuc2hpZnQoKTtcbiAgICAgIGlmIChpdGVtICYmIGl0ZW0ubmFtZSkge1xuICAgICAgICBjb25zdCBmaWxlcGF0aCA9IGpvaW4oZGlyLCBpdGVtLm5hbWUpO1xuICAgICAgICBhd2FpdCBEZW5vLnJlbW92ZShmaWxlcGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkpIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICAvLyBpZiBub3QgZXhpc3QuIHRoZW4gY3JlYXRlIGl0XG4gICAgYXdhaXQgRGVuby5ta2RpcihkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICB9XG59XG5cbi8qKlxuICogRW5zdXJlcyB0aGF0IGEgZGlyZWN0b3J5IGlzIGVtcHR5LlxuICogRGVsZXRlcyBkaXJlY3RvcnkgY29udGVudHMgaWYgdGhlIGRpcmVjdG9yeSBpcyBub3QgZW1wdHkuXG4gKiBJZiB0aGUgZGlyZWN0b3J5IGRvZXMgbm90IGV4aXN0LCBpdCBpcyBjcmVhdGVkLlxuICogVGhlIGRpcmVjdG9yeSBpdHNlbGYgaXMgbm90IGRlbGV0ZWQuXG4gKiBSZXF1aXJlcyB0aGUgYC0tYWxsb3ctcmVhZGAgYW5kIGAtLWFsbG93LXdyaXRlYCBmbGFnLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW1wdHlEaXJTeW5jKGRpcjogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgaXRlbXMgPSBbLi4uRGVuby5yZWFkRGlyU3luYyhkaXIpXTtcblxuICAgIC8vIElmIHRoZSBkaXJlY3RvcnkgZXhpc3RzLCByZW1vdmUgYWxsIGVudHJpZXMgaW5zaWRlIGl0LlxuICAgIHdoaWxlIChpdGVtcy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSBpdGVtcy5zaGlmdCgpO1xuICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5uYW1lKSB7XG4gICAgICAgIGNvbnN0IGZpbGVwYXRoID0gam9pbihkaXIsIGl0ZW0ubmFtZSk7XG4gICAgICAgIERlbm8ucmVtb3ZlU3luYyhmaWxlcGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkpIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gICAgLy8gaWYgbm90IGV4aXN0LiB0aGVuIGNyZWF0ZSBpdFxuICAgIERlbm8ubWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgcmV0dXJuO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLFNBQVMsSUFBSSxRQUFRLGlCQUFpQjtBQUV0Qzs7Ozs7O0NBTUMsR0FDRCxPQUFPLGVBQWUsU0FBUyxHQUFXLEVBQUU7SUFDMUMsSUFBSTtRQUNGLE1BQU0sUUFBUSxFQUFFO1FBQ2hCLFdBQVcsTUFBTSxZQUFZLEtBQUssT0FBTyxDQUFDLEtBQU07WUFDOUMsTUFBTSxJQUFJLENBQUM7UUFDYjtRQUVBLE1BQU8sTUFBTSxNQUFNLENBQUU7WUFDbkIsTUFBTSxPQUFPLE1BQU0sS0FBSztZQUN4QixJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JCLE1BQU0sV0FBVyxLQUFLLEtBQUssS0FBSyxJQUFJO2dCQUNwQyxNQUFNLEtBQUssTUFBTSxDQUFDLFVBQVU7b0JBQUUsV0FBVyxJQUFJO2dCQUFDO1lBQ2hELENBQUM7UUFDSDtJQUNGLEVBQUUsT0FBTyxLQUFLO1FBQ1osSUFBSSxDQUFDLENBQUMsZUFBZSxLQUFLLE1BQU0sQ0FBQyxRQUFRLEdBQUc7WUFDMUMsTUFBTSxJQUFJO1FBQ1osQ0FBQztRQUVELCtCQUErQjtRQUMvQixNQUFNLEtBQUssS0FBSyxDQUFDLEtBQUs7WUFBRSxXQUFXLElBQUk7UUFBQztJQUMxQztBQUNGLENBQUM7QUFFRDs7Ozs7O0NBTUMsR0FDRCxPQUFPLFNBQVMsYUFBYSxHQUFXLEVBQVE7SUFDOUMsSUFBSTtRQUNGLE1BQU0sUUFBUTtlQUFJLEtBQUssV0FBVyxDQUFDO1NBQUs7UUFFeEMseURBQXlEO1FBQ3pELE1BQU8sTUFBTSxNQUFNLENBQUU7WUFDbkIsTUFBTSxPQUFPLE1BQU0sS0FBSztZQUN4QixJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JCLE1BQU0sV0FBVyxLQUFLLEtBQUssS0FBSyxJQUFJO2dCQUNwQyxLQUFLLFVBQVUsQ0FBQyxVQUFVO29CQUFFLFdBQVcsSUFBSTtnQkFBQztZQUM5QyxDQUFDO1FBQ0g7SUFDRixFQUFFLE9BQU8sS0FBSztRQUNaLElBQUksQ0FBQyxDQUFDLGVBQWUsS0FBSyxNQUFNLENBQUMsUUFBUSxHQUFHO1lBQzFDLE1BQU0sSUFBSTtRQUNaLENBQUM7UUFDRCwrQkFBK0I7UUFDL0IsS0FBSyxTQUFTLENBQUMsS0FBSztZQUFFLFdBQVcsSUFBSTtRQUFDO1FBQ3RDO0lBQ0Y7QUFDRixDQUFDIn0=