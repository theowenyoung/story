// Based on https://github.com/kelektiv/node-uuid
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
import * as v1 from "./v1.ts";
import * as v4 from "./v4.ts";
import * as v5 from "./v5.ts";
export const NIL_UUID = "00000000-0000-0000-0000-000000000000";
export function isNil(val) {
    return val === NIL_UUID;
}
const NOT_IMPLEMENTED = {
    generate () {
        throw new Error("Not implemented");
    },
    validate () {
        throw new Error("Not implemented");
    }
};
// TODO Implement
export const v3 = NOT_IMPLEMENTED;
export { v1, v4, v5 };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjUxLjAvdXVpZC9tb2QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQmFzZWQgb24gaHR0cHM6Ly9naXRodWIuY29tL2tlbGVrdGl2L25vZGUtdXVpZFxuLy8gQ29weXJpZ2h0IDIwMTgtMjAyMCB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbmltcG9ydCAqIGFzIHYxIGZyb20gXCIuL3YxLnRzXCI7XG5pbXBvcnQgKiBhcyB2NCBmcm9tIFwiLi92NC50c1wiO1xuaW1wb3J0ICogYXMgdjUgZnJvbSBcIi4vdjUudHNcIjtcblxuZXhwb3J0IGNvbnN0IE5JTF9VVUlEID0gXCIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDBcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzTmlsKHZhbDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiB2YWwgPT09IE5JTF9VVUlEO1xufVxuXG5jb25zdCBOT1RfSU1QTEVNRU5URUQgPSB7XG4gIGdlbmVyYXRlKCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWRcIik7XG4gIH0sXG4gIHZhbGlkYXRlKCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWRcIik7XG4gIH0sXG59O1xuXG4vLyBUT0RPIEltcGxlbWVudFxuZXhwb3J0IGNvbnN0IHYzID0gTk9UX0lNUExFTUVOVEVEO1xuXG5leHBvcnQgeyB2MSwgdjQsIHY1IH07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsaURBQWlEO0FBQ2pELDBFQUEwRTtBQUMxRSxZQUFZLFFBQVEsVUFBVTtBQUM5QixZQUFZLFFBQVEsVUFBVTtBQUM5QixZQUFZLFFBQVEsVUFBVTtBQUU5QixPQUFPLE1BQU0sV0FBVyx1Q0FBdUM7QUFFL0QsT0FBTyxTQUFTLE1BQU0sR0FBVyxFQUFXO0lBQzFDLE9BQU8sUUFBUTtBQUNqQixDQUFDO0FBRUQsTUFBTSxrQkFBa0I7SUFDdEIsWUFBa0I7UUFDaEIsTUFBTSxJQUFJLE1BQU0sbUJBQW1CO0lBQ3JDO0lBQ0EsWUFBa0I7UUFDaEIsTUFBTSxJQUFJLE1BQU0sbUJBQW1CO0lBQ3JDO0FBQ0Y7QUFFQSxpQkFBaUI7QUFDakIsT0FBTyxNQUFNLEtBQUssZ0JBQWdCO0FBRWxDLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcifQ==