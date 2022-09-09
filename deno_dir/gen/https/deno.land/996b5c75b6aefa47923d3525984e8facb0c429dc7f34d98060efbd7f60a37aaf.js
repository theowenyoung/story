// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { exists, existsSync } from "./exists.ts";
import { isSubdir } from "./_util.ts";
/** Moves a file or directory */ export async function move(src, dest, { overwrite =false  } = {}) {
    const srcStat = await Deno.stat(src);
    if (srcStat.isDirectory && isSubdir(src, dest)) {
        throw new Error(`Cannot move '${src}' to a subdirectory of itself, '${dest}'.`);
    }
    if (overwrite) {
        if (await exists(dest)) {
            await Deno.remove(dest, {
                recursive: true
            });
        }
    } else {
        if (await exists(dest)) {
            throw new Error("dest already exists.");
        }
    }
    await Deno.rename(src, dest);
    return;
}
/** Moves a file or directory synchronously */ export function moveSync(src, dest, { overwrite =false  } = {}) {
    const srcStat = Deno.statSync(src);
    if (srcStat.isDirectory && isSubdir(src, dest)) {
        throw new Error(`Cannot move '${src}' to a subdirectory of itself, '${dest}'.`);
    }
    if (overwrite) {
        if (existsSync(dest)) {
            Deno.removeSync(dest, {
                recursive: true
            });
        }
    } else {
        if (existsSync(dest)) {
            throw new Error("dest already exists.");
        }
    }
    Deno.renameSync(src, dest);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2ZzL21vdmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbmltcG9ydCB7IGV4aXN0cywgZXhpc3RzU3luYyB9IGZyb20gXCIuL2V4aXN0cy50c1wiO1xuaW1wb3J0IHsgaXNTdWJkaXIgfSBmcm9tIFwiLi9fdXRpbC50c1wiO1xuXG5pbnRlcmZhY2UgTW92ZU9wdGlvbnMge1xuICBvdmVyd3JpdGU/OiBib29sZWFuO1xufVxuXG4vKiogTW92ZXMgYSBmaWxlIG9yIGRpcmVjdG9yeSAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1vdmUoXG4gIHNyYzogc3RyaW5nLFxuICBkZXN0OiBzdHJpbmcsXG4gIHsgb3ZlcndyaXRlID0gZmFsc2UgfTogTW92ZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCBzcmNTdGF0ID0gYXdhaXQgRGVuby5zdGF0KHNyYyk7XG5cbiAgaWYgKHNyY1N0YXQuaXNEaXJlY3RvcnkgJiYgaXNTdWJkaXIoc3JjLCBkZXN0KSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBDYW5ub3QgbW92ZSAnJHtzcmN9JyB0byBhIHN1YmRpcmVjdG9yeSBvZiBpdHNlbGYsICcke2Rlc3R9Jy5gLFxuICAgICk7XG4gIH1cblxuICBpZiAob3ZlcndyaXRlKSB7XG4gICAgaWYgKGF3YWl0IGV4aXN0cyhkZXN0KSkge1xuICAgICAgYXdhaXQgRGVuby5yZW1vdmUoZGVzdCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChhd2FpdCBleGlzdHMoZGVzdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImRlc3QgYWxyZWFkeSBleGlzdHMuXCIpO1xuICAgIH1cbiAgfVxuXG4gIGF3YWl0IERlbm8ucmVuYW1lKHNyYywgZGVzdCk7XG5cbiAgcmV0dXJuO1xufVxuXG4vKiogTW92ZXMgYSBmaWxlIG9yIGRpcmVjdG9yeSBzeW5jaHJvbm91c2x5ICovXG5leHBvcnQgZnVuY3Rpb24gbW92ZVN5bmMoXG4gIHNyYzogc3RyaW5nLFxuICBkZXN0OiBzdHJpbmcsXG4gIHsgb3ZlcndyaXRlID0gZmFsc2UgfTogTW92ZU9wdGlvbnMgPSB7fSxcbik6IHZvaWQge1xuICBjb25zdCBzcmNTdGF0ID0gRGVuby5zdGF0U3luYyhzcmMpO1xuXG4gIGlmIChzcmNTdGF0LmlzRGlyZWN0b3J5ICYmIGlzU3ViZGlyKHNyYywgZGVzdCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgQ2Fubm90IG1vdmUgJyR7c3JjfScgdG8gYSBzdWJkaXJlY3Rvcnkgb2YgaXRzZWxmLCAnJHtkZXN0fScuYCxcbiAgICApO1xuICB9XG5cbiAgaWYgKG92ZXJ3cml0ZSkge1xuICAgIGlmIChleGlzdHNTeW5jKGRlc3QpKSB7XG4gICAgICBEZW5vLnJlbW92ZVN5bmMoZGVzdCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChleGlzdHNTeW5jKGRlc3QpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJkZXN0IGFscmVhZHkgZXhpc3RzLlwiKTtcbiAgICB9XG4gIH1cblxuICBEZW5vLnJlbmFtZVN5bmMoc3JjLCBkZXN0KTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUsU0FBUyxNQUFNLEVBQUUsVUFBVSxRQUFRLGFBQWEsQ0FBQztBQUNqRCxTQUFTLFFBQVEsUUFBUSxZQUFZLENBQUM7QUFNdEMsOEJBQThCLEdBQzlCLE9BQU8sZUFBZSxJQUFJLENBQ3hCLEdBQVcsRUFDWCxJQUFZLEVBQ1osRUFBRSxTQUFTLEVBQUcsS0FBSyxDQUFBLEVBQWUsR0FBRyxFQUFFLEVBQ3ZDO0lBQ0EsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxBQUFDO0lBRXJDLElBQUksT0FBTyxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFO1FBQzlDLE1BQU0sSUFBSSxLQUFLLENBQ2IsQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLGdDQUFnQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FDL0QsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFJLFNBQVMsRUFBRTtRQUNiLElBQUksTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdEIsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRTtnQkFBRSxTQUFTLEVBQUUsSUFBSTthQUFFLENBQUMsQ0FBQztRQUMvQyxDQUFDO0lBQ0gsT0FBTztRQUNMLElBQUksTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUU3QixPQUFPO0FBQ1QsQ0FBQztBQUVELDRDQUE0QyxHQUM1QyxPQUFPLFNBQVMsUUFBUSxDQUN0QixHQUFXLEVBQ1gsSUFBWSxFQUNaLEVBQUUsU0FBUyxFQUFHLEtBQUssQ0FBQSxFQUFlLEdBQUcsRUFBRSxFQUNqQztJQUNOLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEFBQUM7SUFFbkMsSUFBSSxPQUFPLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUU7UUFDOUMsTUFBTSxJQUFJLEtBQUssQ0FDYixDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUMvRCxDQUFDO0lBQ0osQ0FBQztJQUVELElBQUksU0FBUyxFQUFFO1FBQ2IsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUU7Z0JBQUUsU0FBUyxFQUFFLElBQUk7YUFBRSxDQUFDLENBQUM7UUFDN0MsQ0FBQztJQUNILE9BQU87UUFDTCxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDMUMsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QixDQUFDIn0=