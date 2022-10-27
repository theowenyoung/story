// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { load, loadAll } from "./loader/loader.ts";
/**
 * Parses `content` as single YAML document.
 *
 * Returns a JavaScript object or throws `YAMLException` on error.
 * By default, does not support regexps, functions and undefined. This method is safe for untrusted data.
 */ export function parse(content, options) {
    return load(content, options);
}
export function parseAll(content, iterator, options) {
    return loadAll(content, iterator, options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2VuY29kaW5nL195YW1sL3BhcnNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFBvcnRlZCBmcm9tIGpzLXlhbWwgdjMuMTMuMTpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlY2EvanMteWFtbC9jb21taXQvNjY1YWFkZGE0MjM0OWRjYWU4NjlmMTIwNDBkOWIxMGVmMThkMTJkYVxuLy8gQ29weXJpZ2h0IDIwMTEtMjAxNSBieSBWaXRhbHkgUHV6cmluLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbmltcG9ydCB7IENiRnVuY3Rpb24sIGxvYWQsIGxvYWRBbGwgfSBmcm9tIFwiLi9sb2FkZXIvbG9hZGVyLnRzXCI7XG5pbXBvcnQgdHlwZSB7IExvYWRlclN0YXRlT3B0aW9ucyB9IGZyb20gXCIuL2xvYWRlci9sb2FkZXJfc3RhdGUudHNcIjtcblxuZXhwb3J0IHR5cGUgUGFyc2VPcHRpb25zID0gTG9hZGVyU3RhdGVPcHRpb25zO1xuXG4vKipcbiAqIFBhcnNlcyBgY29udGVudGAgYXMgc2luZ2xlIFlBTUwgZG9jdW1lbnQuXG4gKlxuICogUmV0dXJucyBhIEphdmFTY3JpcHQgb2JqZWN0IG9yIHRocm93cyBgWUFNTEV4Y2VwdGlvbmAgb24gZXJyb3IuXG4gKiBCeSBkZWZhdWx0LCBkb2VzIG5vdCBzdXBwb3J0IHJlZ2V4cHMsIGZ1bmN0aW9ucyBhbmQgdW5kZWZpbmVkLiBUaGlzIG1ldGhvZCBpcyBzYWZlIGZvciB1bnRydXN0ZWQgZGF0YS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKGNvbnRlbnQ6IHN0cmluZywgb3B0aW9ucz86IFBhcnNlT3B0aW9ucyk6IHVua25vd24ge1xuICByZXR1cm4gbG9hZChjb250ZW50LCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBTYW1lIGFzIGBwYXJzZSgpYCwgYnV0IHVuZGVyc3RhbmRzIG11bHRpLWRvY3VtZW50IHNvdXJjZXMuXG4gKiBBcHBsaWVzIGl0ZXJhdG9yIHRvIGVhY2ggZG9jdW1lbnQgaWYgc3BlY2lmaWVkLCBvciByZXR1cm5zIGFycmF5IG9mIGRvY3VtZW50cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQWxsKFxuICBjb250ZW50OiBzdHJpbmcsXG4gIGl0ZXJhdG9yOiBDYkZ1bmN0aW9uLFxuICBvcHRpb25zPzogUGFyc2VPcHRpb25zLFxuKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUFsbChjb250ZW50OiBzdHJpbmcsIG9wdGlvbnM/OiBQYXJzZU9wdGlvbnMpOiB1bmtub3duO1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQWxsKFxuICBjb250ZW50OiBzdHJpbmcsXG4gIGl0ZXJhdG9yPzogQ2JGdW5jdGlvbiB8IFBhcnNlT3B0aW9ucyxcbiAgb3B0aW9ucz86IFBhcnNlT3B0aW9ucyxcbik6IHVua25vd24ge1xuICByZXR1cm4gbG9hZEFsbChjb250ZW50LCBpdGVyYXRvciwgb3B0aW9ucyk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsK0JBQStCO0FBQy9CLG9GQUFvRjtBQUNwRiwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBRTFFLFNBQXFCLElBQUksRUFBRSxPQUFPLFFBQVEscUJBQXFCO0FBSy9EOzs7OztDQUtDLEdBQ0QsT0FBTyxTQUFTLE1BQU0sT0FBZSxFQUFFLE9BQXNCLEVBQVc7SUFDdEUsT0FBTyxLQUFLLFNBQVM7QUFDdkIsQ0FBQztBQVlELE9BQU8sU0FBUyxTQUNkLE9BQWUsRUFDZixRQUFvQyxFQUNwQyxPQUFzQixFQUNiO0lBQ1QsT0FBTyxRQUFRLFNBQVMsVUFBVTtBQUNwQyxDQUFDIn0=