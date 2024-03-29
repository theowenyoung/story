// Copyright the Browserify authors. MIT License.
// Ported mostly from https://github.com/browserify/path-browserify/
// This module is browser compatible.
import { isWindows } from "../_util/os.ts";
import * as _win32 from "./win32.ts";
import * as _posix from "./posix.ts";
const path = isWindows ? _win32 : _posix;
export const win32 = _win32;
export const posix = _posix;
export const { basename , delimiter , dirname , extname , format , fromFileUrl , isAbsolute , join , normalize , parse , relative , resolve , sep , toFileUrl , toNamespacedPath  } = path;
export * from "./common.ts";
export { SEP, SEP_PATTERN } from "./separator.ts";
export * from "./_interface.ts";
export * from "./glob.ts";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL3BhdGgvbW9kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCB0aGUgQnJvd3NlcmlmeSBhdXRob3JzLiBNSVQgTGljZW5zZS5cbi8vIFBvcnRlZCBtb3N0bHkgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vYnJvd3NlcmlmeS9wYXRoLWJyb3dzZXJpZnkvXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmltcG9ydCB7IGlzV2luZG93cyB9IGZyb20gXCIuLi9fdXRpbC9vcy50c1wiO1xuaW1wb3J0ICogYXMgX3dpbjMyIGZyb20gXCIuL3dpbjMyLnRzXCI7XG5pbXBvcnQgKiBhcyBfcG9zaXggZnJvbSBcIi4vcG9zaXgudHNcIjtcblxuY29uc3QgcGF0aCA9IGlzV2luZG93cyA/IF93aW4zMiA6IF9wb3NpeDtcblxuZXhwb3J0IGNvbnN0IHdpbjMyID0gX3dpbjMyO1xuZXhwb3J0IGNvbnN0IHBvc2l4ID0gX3Bvc2l4O1xuZXhwb3J0IGNvbnN0IHtcbiAgYmFzZW5hbWUsXG4gIGRlbGltaXRlcixcbiAgZGlybmFtZSxcbiAgZXh0bmFtZSxcbiAgZm9ybWF0LFxuICBmcm9tRmlsZVVybCxcbiAgaXNBYnNvbHV0ZSxcbiAgam9pbixcbiAgbm9ybWFsaXplLFxuICBwYXJzZSxcbiAgcmVsYXRpdmUsXG4gIHJlc29sdmUsXG4gIHNlcCxcbiAgdG9GaWxlVXJsLFxuICB0b05hbWVzcGFjZWRQYXRoLFxufSA9IHBhdGg7XG5cbmV4cG9ydCAqIGZyb20gXCIuL2NvbW1vbi50c1wiO1xuZXhwb3J0IHsgU0VQLCBTRVBfUEFUVEVSTiB9IGZyb20gXCIuL3NlcGFyYXRvci50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vX2ludGVyZmFjZS50c1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vZ2xvYi50c1wiO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGlEQUFpRDtBQUNqRCxvRUFBb0U7QUFDcEUscUNBQXFDO0FBRXJDLFNBQVMsU0FBUyxRQUFRLGlCQUFpQjtBQUMzQyxZQUFZLFlBQVksYUFBYTtBQUNyQyxZQUFZLFlBQVksYUFBYTtBQUVyQyxNQUFNLE9BQU8sWUFBWSxTQUFTLE1BQU07QUFFeEMsT0FBTyxNQUFNLFFBQVEsT0FBTztBQUM1QixPQUFPLE1BQU0sUUFBUSxPQUFPO0FBQzVCLE9BQU8sTUFBTSxFQUNYLFNBQVEsRUFDUixVQUFTLEVBQ1QsUUFBTyxFQUNQLFFBQU8sRUFDUCxPQUFNLEVBQ04sWUFBVyxFQUNYLFdBQVUsRUFDVixLQUFJLEVBQ0osVUFBUyxFQUNULE1BQUssRUFDTCxTQUFRLEVBQ1IsUUFBTyxFQUNQLElBQUcsRUFDSCxVQUFTLEVBQ1QsaUJBQWdCLEVBQ2pCLEdBQUcsS0FBSztBQUVULGNBQWMsY0FBYztBQUM1QixTQUFTLEdBQUcsRUFBRSxXQUFXLFFBQVEsaUJBQWlCO0FBQ2xELGNBQWMsa0JBQWtCO0FBQ2hDLGNBQWMsWUFBWSJ9