// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import * as path from "../path/mod.ts";
import { ensureDir, ensureDirSync } from "./ensure_dir.ts";
import { exists, existsSync } from "./exists.ts";
import { getFileInfoType } from "./_util.ts";
import { isWindows } from "../_util/os.ts";
/**
 * Ensures that the link exists.
 * If the directory structure does not exist, it is created.
 *
 * @param src the source file path
 * @param dest the destination link path
 */ export async function ensureSymlink(src, dest) {
    const srcStatInfo = await Deno.lstat(src);
    const srcFilePathType = getFileInfoType(srcStatInfo);
    if (await exists(dest)) {
        const destStatInfo = await Deno.lstat(dest);
        const destFilePathType = getFileInfoType(destStatInfo);
        if (destFilePathType !== "symlink") {
            throw new Error(`Ensure path exists, expected 'symlink', got '${destFilePathType}'`);
        }
        return;
    }
    await ensureDir(path.dirname(dest));
    const options = isWindows ? {
        type: srcFilePathType === "dir" ? "dir" : "file"
    } : undefined;
    await Deno.symlink(src, dest, options);
}
/**
 * Ensures that the link exists.
 * If the directory structure does not exist, it is created.
 *
 * @param src the source file path
 * @param dest the destination link path
 */ export function ensureSymlinkSync(src, dest) {
    const srcStatInfo = Deno.lstatSync(src);
    const srcFilePathType = getFileInfoType(srcStatInfo);
    if (existsSync(dest)) {
        const destStatInfo = Deno.lstatSync(dest);
        const destFilePathType = getFileInfoType(destStatInfo);
        if (destFilePathType !== "symlink") {
            throw new Error(`Ensure path exists, expected 'symlink', got '${destFilePathType}'`);
        }
        return;
    }
    ensureDirSync(path.dirname(dest));
    const options = isWindows ? {
        type: srcFilePathType === "dir" ? "dir" : "file"
    } : undefined;
    Deno.symlinkSync(src, dest, options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2ZzL2Vuc3VyZV9zeW1saW5rLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCIuLi9wYXRoL21vZC50c1wiO1xuaW1wb3J0IHsgZW5zdXJlRGlyLCBlbnN1cmVEaXJTeW5jIH0gZnJvbSBcIi4vZW5zdXJlX2Rpci50c1wiO1xuaW1wb3J0IHsgZXhpc3RzLCBleGlzdHNTeW5jIH0gZnJvbSBcIi4vZXhpc3RzLnRzXCI7XG5pbXBvcnQgeyBnZXRGaWxlSW5mb1R5cGUgfSBmcm9tIFwiLi9fdXRpbC50c1wiO1xuaW1wb3J0IHsgaXNXaW5kb3dzIH0gZnJvbSBcIi4uL191dGlsL29zLnRzXCI7XG5cbi8qKlxuICogRW5zdXJlcyB0aGF0IHRoZSBsaW5rIGV4aXN0cy5cbiAqIElmIHRoZSBkaXJlY3Rvcnkgc3RydWN0dXJlIGRvZXMgbm90IGV4aXN0LCBpdCBpcyBjcmVhdGVkLlxuICpcbiAqIEBwYXJhbSBzcmMgdGhlIHNvdXJjZSBmaWxlIHBhdGhcbiAqIEBwYXJhbSBkZXN0IHRoZSBkZXN0aW5hdGlvbiBsaW5rIHBhdGhcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZVN5bWxpbmsoc3JjOiBzdHJpbmcsIGRlc3Q6IHN0cmluZykge1xuICBjb25zdCBzcmNTdGF0SW5mbyA9IGF3YWl0IERlbm8ubHN0YXQoc3JjKTtcbiAgY29uc3Qgc3JjRmlsZVBhdGhUeXBlID0gZ2V0RmlsZUluZm9UeXBlKHNyY1N0YXRJbmZvKTtcblxuICBpZiAoYXdhaXQgZXhpc3RzKGRlc3QpKSB7XG4gICAgY29uc3QgZGVzdFN0YXRJbmZvID0gYXdhaXQgRGVuby5sc3RhdChkZXN0KTtcbiAgICBjb25zdCBkZXN0RmlsZVBhdGhUeXBlID0gZ2V0RmlsZUluZm9UeXBlKGRlc3RTdGF0SW5mbyk7XG4gICAgaWYgKGRlc3RGaWxlUGF0aFR5cGUgIT09IFwic3ltbGlua1wiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBFbnN1cmUgcGF0aCBleGlzdHMsIGV4cGVjdGVkICdzeW1saW5rJywgZ290ICcke2Rlc3RGaWxlUGF0aFR5cGV9J2AsXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICBhd2FpdCBlbnN1cmVEaXIocGF0aC5kaXJuYW1lKGRlc3QpKTtcblxuICBjb25zdCBvcHRpb25zOiBEZW5vLlN5bWxpbmtPcHRpb25zIHwgdW5kZWZpbmVkID0gaXNXaW5kb3dzXG4gICAgPyB7XG4gICAgICB0eXBlOiBzcmNGaWxlUGF0aFR5cGUgPT09IFwiZGlyXCIgPyBcImRpclwiIDogXCJmaWxlXCIsXG4gICAgfVxuICAgIDogdW5kZWZpbmVkO1xuXG4gIGF3YWl0IERlbm8uc3ltbGluayhzcmMsIGRlc3QsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEVuc3VyZXMgdGhhdCB0aGUgbGluayBleGlzdHMuXG4gKiBJZiB0aGUgZGlyZWN0b3J5IHN0cnVjdHVyZSBkb2VzIG5vdCBleGlzdCwgaXQgaXMgY3JlYXRlZC5cbiAqXG4gKiBAcGFyYW0gc3JjIHRoZSBzb3VyY2UgZmlsZSBwYXRoXG4gKiBAcGFyYW0gZGVzdCB0aGUgZGVzdGluYXRpb24gbGluayBwYXRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVTeW1saW5rU3luYyhzcmM6IHN0cmluZywgZGVzdDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHNyY1N0YXRJbmZvID0gRGVuby5sc3RhdFN5bmMoc3JjKTtcbiAgY29uc3Qgc3JjRmlsZVBhdGhUeXBlID0gZ2V0RmlsZUluZm9UeXBlKHNyY1N0YXRJbmZvKTtcblxuICBpZiAoZXhpc3RzU3luYyhkZXN0KSkge1xuICAgIGNvbnN0IGRlc3RTdGF0SW5mbyA9IERlbm8ubHN0YXRTeW5jKGRlc3QpO1xuICAgIGNvbnN0IGRlc3RGaWxlUGF0aFR5cGUgPSBnZXRGaWxlSW5mb1R5cGUoZGVzdFN0YXRJbmZvKTtcbiAgICBpZiAoZGVzdEZpbGVQYXRoVHlwZSAhPT0gXCJzeW1saW5rXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEVuc3VyZSBwYXRoIGV4aXN0cywgZXhwZWN0ZWQgJ3N5bWxpbmsnLCBnb3QgJyR7ZGVzdEZpbGVQYXRoVHlwZX0nYCxcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIGVuc3VyZURpclN5bmMocGF0aC5kaXJuYW1lKGRlc3QpKTtcblxuICBjb25zdCBvcHRpb25zOiBEZW5vLlN5bWxpbmtPcHRpb25zIHwgdW5kZWZpbmVkID0gaXNXaW5kb3dzXG4gICAgPyB7XG4gICAgICB0eXBlOiBzcmNGaWxlUGF0aFR5cGUgPT09IFwiZGlyXCIgPyBcImRpclwiIDogXCJmaWxlXCIsXG4gICAgfVxuICAgIDogdW5kZWZpbmVkO1xuXG4gIERlbm8uc3ltbGlua1N5bmMoc3JjLCBkZXN0LCBvcHRpb25zKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUsWUFBWSxVQUFVLGlCQUFpQjtBQUN2QyxTQUFTLFNBQVMsRUFBRSxhQUFhLFFBQVEsa0JBQWtCO0FBQzNELFNBQVMsTUFBTSxFQUFFLFVBQVUsUUFBUSxjQUFjO0FBQ2pELFNBQVMsZUFBZSxRQUFRLGFBQWE7QUFDN0MsU0FBUyxTQUFTLFFBQVEsaUJBQWlCO0FBRTNDOzs7Ozs7Q0FNQyxHQUNELE9BQU8sZUFBZSxjQUFjLEdBQVcsRUFBRSxJQUFZLEVBQUU7SUFDN0QsTUFBTSxjQUFjLE1BQU0sS0FBSyxLQUFLLENBQUM7SUFDckMsTUFBTSxrQkFBa0IsZ0JBQWdCO0lBRXhDLElBQUksTUFBTSxPQUFPLE9BQU87UUFDdEIsTUFBTSxlQUFlLE1BQU0sS0FBSyxLQUFLLENBQUM7UUFDdEMsTUFBTSxtQkFBbUIsZ0JBQWdCO1FBQ3pDLElBQUkscUJBQXFCLFdBQVc7WUFDbEMsTUFBTSxJQUFJLE1BQ1IsQ0FBQyw2Q0FBNkMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLEVBQ25FO1FBQ0osQ0FBQztRQUNEO0lBQ0YsQ0FBQztJQUVELE1BQU0sVUFBVSxLQUFLLE9BQU8sQ0FBQztJQUU3QixNQUFNLFVBQTJDLFlBQzdDO1FBQ0EsTUFBTSxvQkFBb0IsUUFBUSxRQUFRLE1BQU07SUFDbEQsSUFDRSxTQUFTO0lBRWIsTUFBTSxLQUFLLE9BQU8sQ0FBQyxLQUFLLE1BQU07QUFDaEMsQ0FBQztBQUVEOzs7Ozs7Q0FNQyxHQUNELE9BQU8sU0FBUyxrQkFBa0IsR0FBVyxFQUFFLElBQVksRUFBUTtJQUNqRSxNQUFNLGNBQWMsS0FBSyxTQUFTLENBQUM7SUFDbkMsTUFBTSxrQkFBa0IsZ0JBQWdCO0lBRXhDLElBQUksV0FBVyxPQUFPO1FBQ3BCLE1BQU0sZUFBZSxLQUFLLFNBQVMsQ0FBQztRQUNwQyxNQUFNLG1CQUFtQixnQkFBZ0I7UUFDekMsSUFBSSxxQkFBcUIsV0FBVztZQUNsQyxNQUFNLElBQUksTUFDUixDQUFDLDZDQUE2QyxFQUFFLGlCQUFpQixDQUFDLENBQUMsRUFDbkU7UUFDSixDQUFDO1FBQ0Q7SUFDRixDQUFDO0lBRUQsY0FBYyxLQUFLLE9BQU8sQ0FBQztJQUUzQixNQUFNLFVBQTJDLFlBQzdDO1FBQ0EsTUFBTSxvQkFBb0IsUUFBUSxRQUFRLE1BQU07SUFDbEQsSUFDRSxTQUFTO0lBRWIsS0FBSyxXQUFXLENBQUMsS0FBSyxNQUFNO0FBQzlCLENBQUMifQ==