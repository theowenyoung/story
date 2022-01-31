import { isLocalPath } from "./utils/path.ts";
import { resolve } from "../deps.ts";
export async function getFrom(ctx, from, reporter) {
    const isUseLocalPath = isLocalPath(from);
    let modulePath = from;
    if (isUseLocalPath) {
        const absolutePath = resolve(ctx.public.workflowCwd, from);
        modulePath = `file://${absolutePath}`;
        reporter.debug(`import module from local path: ${modulePath}`);
    }
    const lib = await import(modulePath);
    return lib;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWZyb20uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtZnJvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDOUMsT0FBTyxFQUFPLE9BQU8sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUcxQyxNQUFNLENBQUMsS0FBSyxVQUFVLE9BQU8sQ0FDM0IsR0FBWSxFQUNaLElBQVksRUFDWixRQUFvQjtJQUVwQixNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ3RCLElBQUksY0FBYyxFQUFFO1FBRWxCLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzRCxVQUFVLEdBQUcsVUFBVSxZQUFZLEVBQUUsQ0FBQztRQUN0QyxRQUFRLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0tBQ2hFO0lBQ0QsTUFBTSxHQUFHLEdBQUcsTUFBTSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDckMsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaXNMb2NhbFBhdGggfSBmcm9tIFwiLi91dGlscy9wYXRoLnRzXCI7XG5pbXBvcnQgeyBsb2csIHJlc29sdmUgfSBmcm9tIFwiLi4vZGVwcy50c1wiO1xuaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCIuL2ludGVybmFsLWludGVyZmFjZS50c1wiO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0RnJvbShcbiAgY3R4OiBDb250ZXh0LFxuICBmcm9tOiBzdHJpbmcsXG4gIHJlcG9ydGVyOiBsb2cuTG9nZ2VyLFxuKSB7XG4gIGNvbnN0IGlzVXNlTG9jYWxQYXRoID0gaXNMb2NhbFBhdGgoZnJvbSk7XG4gIGxldCBtb2R1bGVQYXRoID0gZnJvbTtcbiAgaWYgKGlzVXNlTG9jYWxQYXRoKSB7XG4gICAgLy8gZ2V0IHJlbGF0aXZlIHBhdGggYmFzZSBwd2RcbiAgICBjb25zdCBhYnNvbHV0ZVBhdGggPSByZXNvbHZlKGN0eC5wdWJsaWMud29ya2Zsb3dDd2QsIGZyb20pO1xuICAgIG1vZHVsZVBhdGggPSBgZmlsZTovLyR7YWJzb2x1dGVQYXRofWA7XG4gICAgcmVwb3J0ZXIuZGVidWcoYGltcG9ydCBtb2R1bGUgZnJvbSBsb2NhbCBwYXRoOiAke21vZHVsZVBhdGh9YCk7XG4gIH1cbiAgY29uc3QgbGliID0gYXdhaXQgaW1wb3J0KG1vZHVsZVBhdGgpO1xuICByZXR1cm4gbGliO1xufVxuIl19