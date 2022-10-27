import { filterFiles, getFiles, relative } from "../../deps.ts";
import { isRemotePath } from "./path.ts";
const validSuffix = [
    "yml",
    "yaml"
];
export function getFilesByFilter(cwd, files) {
    // glob all files
    let relativePath = relative(Deno.cwd(), cwd);
    if (!relativePath.startsWith(".")) {
        relativePath = `./${relativePath}`;
    }
    const allFiles = getFiles({
        root: "./",
        hasInfo: false,
        exclude: [
            ".git",
            ".github",
            ".vscode",
            ".vscode-test",
            "node_modules"
        ]
    });
    // filter only .yml .yaml files
    const allYamlFiles = allFiles.filter((file)=>validSuffix.includes(file.ext)).map((item)=>item.path);
    return filterGlobFiles(allYamlFiles, files);
}
export function filterGlobFiles(allYamlFiles, globs) {
    const matchCondition = globs ?? [
        "workflows"
    ];
    const matchConditionGlob = [];
    const anyMatch = [];
    let uniqueFiles = new Set();
    matchCondition.forEach((item)=>{
        if (!item.includes("*") && !validSuffix.includes(item)) {
            anyMatch.push(item);
        }
        if (isRemotePath(item) && !item.includes("*")) {
            uniqueFiles.add(item);
        }
        matchConditionGlob.push(item);
    });
    let anyMatchedFiles = [];
    if (anyMatch.length > 0) {
        anyMatchedFiles = allYamlFiles.filter((file)=>{
            let isMatch = false;
            anyMatch.forEach((item)=>{
                if (file.includes(item)) {
                    isMatch = true;
                }
            });
            return isMatch;
        });
    }
    const globFiles = filterFiles(allYamlFiles, {
        match: matchConditionGlob,
        ignore: ""
    });
    // unique files
    uniqueFiles = new Set([
        ...uniqueFiles,
        ...anyMatchedFiles,
        ...globFiles
    ]);
    return Array.from(uniqueFiles);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvdXRpbHMvZmlsdGVyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGZpbHRlckZpbGVzLCBnZXRGaWxlcywgcmVsYXRpdmUgfSBmcm9tIFwiLi4vLi4vZGVwcy50c1wiO1xuaW1wb3J0IHsgaXNSZW1vdGVQYXRoIH0gZnJvbSBcIi4vcGF0aC50c1wiO1xuY29uc3QgdmFsaWRTdWZmaXggPSBbXCJ5bWxcIiwgXCJ5YW1sXCJdO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZXNCeUZpbHRlcihjd2Q6IHN0cmluZywgZmlsZXM6IHN0cmluZ1tdKSB7XG4gIC8vIGdsb2IgYWxsIGZpbGVzXG4gIGxldCByZWxhdGl2ZVBhdGggPSByZWxhdGl2ZShEZW5vLmN3ZCgpLCBjd2QpO1xuICBpZiAoIXJlbGF0aXZlUGF0aC5zdGFydHNXaXRoKFwiLlwiKSkge1xuICAgIHJlbGF0aXZlUGF0aCA9IGAuLyR7cmVsYXRpdmVQYXRofWA7XG4gIH1cblxuICBjb25zdCBhbGxGaWxlcyA9IGdldEZpbGVzKHtcbiAgICByb290OiBcIi4vXCIsXG4gICAgaGFzSW5mbzogZmFsc2UsXG4gICAgZXhjbHVkZTogW1wiLmdpdFwiLCBcIi5naXRodWJcIiwgXCIudnNjb2RlXCIsIFwiLnZzY29kZS10ZXN0XCIsIFwibm9kZV9tb2R1bGVzXCJdLFxuICB9KTtcbiAgLy8gZmlsdGVyIG9ubHkgLnltbCAueWFtbCBmaWxlc1xuICBjb25zdCBhbGxZYW1sRmlsZXMgPSBhbGxGaWxlcy5maWx0ZXIoKGZpbGUpID0+IHZhbGlkU3VmZml4LmluY2x1ZGVzKGZpbGUuZXh0KSlcbiAgICAubWFwKChpdGVtKSA9PiBpdGVtLnBhdGgpO1xuICByZXR1cm4gZmlsdGVyR2xvYkZpbGVzKGFsbFlhbWxGaWxlcywgZmlsZXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyR2xvYkZpbGVzKFxuICBhbGxZYW1sRmlsZXM6IHN0cmluZ1tdLFxuICBnbG9icz86IHN0cmluZ1tdLFxuKTogc3RyaW5nW10ge1xuICBjb25zdCBtYXRjaENvbmRpdGlvbiA9IGdsb2JzID8/IFtcIndvcmtmbG93c1wiXTtcbiAgY29uc3QgbWF0Y2hDb25kaXRpb25HbG9iOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBhbnlNYXRjaDogc3RyaW5nW10gPSBbXTtcbiAgbGV0IHVuaXF1ZUZpbGVzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcblxuICBtYXRjaENvbmRpdGlvbi5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgaWYgKCFpdGVtLmluY2x1ZGVzKFwiKlwiKSAmJiAhdmFsaWRTdWZmaXguaW5jbHVkZXMoaXRlbSkpIHtcbiAgICAgIGFueU1hdGNoLnB1c2goaXRlbSk7XG4gICAgfVxuICAgIGlmIChpc1JlbW90ZVBhdGgoaXRlbSkgJiYgIWl0ZW0uaW5jbHVkZXMoXCIqXCIpKSB7XG4gICAgICB1bmlxdWVGaWxlcy5hZGQoaXRlbSk7XG4gICAgfVxuICAgIG1hdGNoQ29uZGl0aW9uR2xvYi5wdXNoKGl0ZW0pO1xuICB9KTtcbiAgbGV0IGFueU1hdGNoZWRGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKGFueU1hdGNoLmxlbmd0aCA+IDApIHtcbiAgICBhbnlNYXRjaGVkRmlsZXMgPSBhbGxZYW1sRmlsZXMuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICBsZXQgaXNNYXRjaCA9IGZhbHNlO1xuICAgICAgYW55TWF0Y2guZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICBpZiAoZmlsZS5pbmNsdWRlcyhpdGVtKSkge1xuICAgICAgICAgIGlzTWF0Y2ggPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBpc01hdGNoO1xuICAgIH0pO1xuICB9XG4gIGNvbnN0IGdsb2JGaWxlcyA9IGZpbHRlckZpbGVzKGFsbFlhbWxGaWxlcywge1xuICAgIG1hdGNoOiBtYXRjaENvbmRpdGlvbkdsb2IsXG4gICAgaWdub3JlOiBcIlwiLFxuICB9KTtcbiAgLy8gdW5pcXVlIGZpbGVzXG4gIHVuaXF1ZUZpbGVzID0gbmV3IFNldChbLi4udW5pcXVlRmlsZXMsIC4uLmFueU1hdGNoZWRGaWxlcywgLi4uZ2xvYkZpbGVzXSk7XG4gIHJldHVybiBBcnJheS5mcm9tKHVuaXF1ZUZpbGVzKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLFdBQVcsRUFBRSxRQUFRLEVBQUUsUUFBUSxRQUFRLGdCQUFnQjtBQUNoRSxTQUFTLFlBQVksUUFBUSxZQUFZO0FBQ3pDLE1BQU0sY0FBYztJQUFDO0lBQU87Q0FBTztBQUVuQyxPQUFPLFNBQVMsaUJBQWlCLEdBQVcsRUFBRSxLQUFlLEVBQUU7SUFDN0QsaUJBQWlCO0lBQ2pCLElBQUksZUFBZSxTQUFTLEtBQUssR0FBRyxJQUFJO0lBQ3hDLElBQUksQ0FBQyxhQUFhLFVBQVUsQ0FBQyxNQUFNO1FBQ2pDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDO0lBQ3BDLENBQUM7SUFFRCxNQUFNLFdBQVcsU0FBUztRQUN4QixNQUFNO1FBQ04sU0FBUyxLQUFLO1FBQ2QsU0FBUztZQUFDO1lBQVE7WUFBVztZQUFXO1lBQWdCO1NBQWU7SUFDekU7SUFDQSwrQkFBK0I7SUFDL0IsTUFBTSxlQUFlLFNBQVMsTUFBTSxDQUFDLENBQUMsT0FBUyxZQUFZLFFBQVEsQ0FBQyxLQUFLLEdBQUcsR0FDekUsR0FBRyxDQUFDLENBQUMsT0FBUyxLQUFLLElBQUk7SUFDMUIsT0FBTyxnQkFBZ0IsY0FBYztBQUN2QyxDQUFDO0FBRUQsT0FBTyxTQUFTLGdCQUNkLFlBQXNCLEVBQ3RCLEtBQWdCLEVBQ047SUFDVixNQUFNLGlCQUFpQixTQUFTO1FBQUM7S0FBWTtJQUM3QyxNQUFNLHFCQUErQixFQUFFO0lBQ3ZDLE1BQU0sV0FBcUIsRUFBRTtJQUM3QixJQUFJLGNBQTJCLElBQUk7SUFFbkMsZUFBZSxPQUFPLENBQUMsQ0FBQyxPQUFTO1FBQy9CLElBQUksQ0FBQyxLQUFLLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxRQUFRLENBQUMsT0FBTztZQUN0RCxTQUFTLElBQUksQ0FBQztRQUNoQixDQUFDO1FBQ0QsSUFBSSxhQUFhLFNBQVMsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxNQUFNO1lBQzdDLFlBQVksR0FBRyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxtQkFBbUIsSUFBSSxDQUFDO0lBQzFCO0lBQ0EsSUFBSSxrQkFBNEIsRUFBRTtJQUNsQyxJQUFJLFNBQVMsTUFBTSxHQUFHLEdBQUc7UUFDdkIsa0JBQWtCLGFBQWEsTUFBTSxDQUFDLENBQUMsT0FBUztZQUM5QyxJQUFJLFVBQVUsS0FBSztZQUNuQixTQUFTLE9BQU8sQ0FBQyxDQUFDLE9BQVM7Z0JBQ3pCLElBQUksS0FBSyxRQUFRLENBQUMsT0FBTztvQkFDdkIsVUFBVSxJQUFJO2dCQUNoQixDQUFDO1lBQ0g7WUFDQSxPQUFPO1FBQ1Q7SUFDRixDQUFDO0lBQ0QsTUFBTSxZQUFZLFlBQVksY0FBYztRQUMxQyxPQUFPO1FBQ1AsUUFBUTtJQUNWO0lBQ0EsZUFBZTtJQUNmLGNBQWMsSUFBSSxJQUFJO1dBQUk7V0FBZ0I7V0FBb0I7S0FBVTtJQUN4RSxPQUFPLE1BQU0sSUFBSSxDQUFDO0FBQ3BCLENBQUMifQ==