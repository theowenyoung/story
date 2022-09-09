import { Status } from "./constants.ts";
export default class SqliteError extends Error {
    /**
   * SqliteError
   *
   * Extension over the standard JS Error object
   * to also contain class members for error code
   * and error code name.
   *
   * This class is not exported by the module and
   * should only be obtained from exceptions raised
   * in this module.
   */ constructor(message, code){
        super(message);
        this.name = "SqliteError";
        this.code = typeof code === "number" ? code : Status.Unknown;
    }
    /**
   * SqliteError.code
   *
   * The SQLite result status code,
   * see the SQLite docs for more
   * information about each code.
   *
   * https://www.sqlite.org/rescode.html
   *
   * Beyond the SQLite status codes, this member
   * can also contain custom status codes specific
   * to this library (starting from 1000).
   *
   * Errors that originate in the JavaScript part of
   * the library will not have an associated status
   * code. For these errors, the code will be
   * `Status.Unknown`.
   *
   * | JS name          | code | JS name (cont.)  | code |
   * |------------------|------|------------------|------|
   * | SqliteOk         | 0    | SqliteEmpty      | 16   |
   * | SqliteError      | 1    | SqliteSchema     | 17   |
   * | SqliteInternal   | 2    | SqliteTooBig     | 18   |
   * | SqlitePerm       | 3    | SqliteConstraint | 19   |
   * | SqliteAbort      | 4    | SqliteMismatch   | 20   |
   * | SqliteBusy       | 5    | SqliteMisuse     | 21   |
   * | SqliteLocked     | 6    | SqliteNoLFS      | 22   |
   * | SqliteNoMem      | 7    | SqliteAuth       | 23   |
   * | SqliteReadOnly   | 8    | SqliteFormat     | 24   |
   * | SqliteInterrupt  | 9    | SqliteRange      | 25   |
   * | SqliteIOErr      | 10   | SqliteNotADB     | 26   |
   * | SqliteCorrupt    | 11   | SqliteNotice     | 27   |
   * | SqliteNotFound   | 12   | SqliteWarning    | 28   |
   * | SqliteFull       | 13   | SqliteRow        | 100  |
   * | SqliteCantOpen   | 14   | SqliteDone       | 101  |
   * | SqliteProtocol   | 15   | Unknown          | -1   |
   *
   * These codes are accessible via
   * the exported `Status` object.
   */ code;
    /**
   * SqliteError.codeName
   *
   * Key of code in exported `status`
   * object.
   *
   * E.g. if `code` is `19`,
   * `codeName` would be `SqliteConstraint`.
   */ get codeName() {
        return Status[this.code];
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvc3FsaXRlQHYyLjMuMi9zcmMvZXJyb3IudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhdHVzIH0gZnJvbSBcIi4vY29uc3RhbnRzLnRzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNxbGl0ZUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogU3FsaXRlRXJyb3JcbiAgICpcbiAgICogRXh0ZW5zaW9uIG92ZXIgdGhlIHN0YW5kYXJkIEpTIEVycm9yIG9iamVjdFxuICAgKiB0byBhbHNvIGNvbnRhaW4gY2xhc3MgbWVtYmVycyBmb3IgZXJyb3IgY29kZVxuICAgKiBhbmQgZXJyb3IgY29kZSBuYW1lLlxuICAgKlxuICAgKiBUaGlzIGNsYXNzIGlzIG5vdCBleHBvcnRlZCBieSB0aGUgbW9kdWxlIGFuZFxuICAgKiBzaG91bGQgb25seSBiZSBvYnRhaW5lZCBmcm9tIGV4Y2VwdGlvbnMgcmFpc2VkXG4gICAqIGluIHRoaXMgbW9kdWxlLlxuICAgKi9cbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nLCBjb2RlPzogbnVtYmVyKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gXCJTcWxpdGVFcnJvclwiO1xuICAgIHRoaXMuY29kZSA9IHR5cGVvZiBjb2RlID09PSBcIm51bWJlclwiID8gY29kZSA6IFN0YXR1cy5Vbmtub3duO1xuICB9XG5cbiAgLyoqXG4gICAqIFNxbGl0ZUVycm9yLmNvZGVcbiAgICpcbiAgICogVGhlIFNRTGl0ZSByZXN1bHQgc3RhdHVzIGNvZGUsXG4gICAqIHNlZSB0aGUgU1FMaXRlIGRvY3MgZm9yIG1vcmVcbiAgICogaW5mb3JtYXRpb24gYWJvdXQgZWFjaCBjb2RlLlxuICAgKlxuICAgKiBodHRwczovL3d3dy5zcWxpdGUub3JnL3Jlc2NvZGUuaHRtbFxuICAgKlxuICAgKiBCZXlvbmQgdGhlIFNRTGl0ZSBzdGF0dXMgY29kZXMsIHRoaXMgbWVtYmVyXG4gICAqIGNhbiBhbHNvIGNvbnRhaW4gY3VzdG9tIHN0YXR1cyBjb2RlcyBzcGVjaWZpY1xuICAgKiB0byB0aGlzIGxpYnJhcnkgKHN0YXJ0aW5nIGZyb20gMTAwMCkuXG4gICAqXG4gICAqIEVycm9ycyB0aGF0IG9yaWdpbmF0ZSBpbiB0aGUgSmF2YVNjcmlwdCBwYXJ0IG9mXG4gICAqIHRoZSBsaWJyYXJ5IHdpbGwgbm90IGhhdmUgYW4gYXNzb2NpYXRlZCBzdGF0dXNcbiAgICogY29kZS4gRm9yIHRoZXNlIGVycm9ycywgdGhlIGNvZGUgd2lsbCBiZVxuICAgKiBgU3RhdHVzLlVua25vd25gLlxuICAgKlxuICAgKiB8IEpTIG5hbWUgICAgICAgICAgfCBjb2RlIHwgSlMgbmFtZSAoY29udC4pICB8IGNvZGUgfFxuICAgKiB8LS0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLXwtLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tfFxuICAgKiB8IFNxbGl0ZU9rICAgICAgICAgfCAwICAgIHwgU3FsaXRlRW1wdHkgICAgICB8IDE2ICAgfFxuICAgKiB8IFNxbGl0ZUVycm9yICAgICAgfCAxICAgIHwgU3FsaXRlU2NoZW1hICAgICB8IDE3ICAgfFxuICAgKiB8IFNxbGl0ZUludGVybmFsICAgfCAyICAgIHwgU3FsaXRlVG9vQmlnICAgICB8IDE4ICAgfFxuICAgKiB8IFNxbGl0ZVBlcm0gICAgICAgfCAzICAgIHwgU3FsaXRlQ29uc3RyYWludCB8IDE5ICAgfFxuICAgKiB8IFNxbGl0ZUFib3J0ICAgICAgfCA0ICAgIHwgU3FsaXRlTWlzbWF0Y2ggICB8IDIwICAgfFxuICAgKiB8IFNxbGl0ZUJ1c3kgICAgICAgfCA1ICAgIHwgU3FsaXRlTWlzdXNlICAgICB8IDIxICAgfFxuICAgKiB8IFNxbGl0ZUxvY2tlZCAgICAgfCA2ICAgIHwgU3FsaXRlTm9MRlMgICAgICB8IDIyICAgfFxuICAgKiB8IFNxbGl0ZU5vTWVtICAgICAgfCA3ICAgIHwgU3FsaXRlQXV0aCAgICAgICB8IDIzICAgfFxuICAgKiB8IFNxbGl0ZVJlYWRPbmx5ICAgfCA4ICAgIHwgU3FsaXRlRm9ybWF0ICAgICB8IDI0ICAgfFxuICAgKiB8IFNxbGl0ZUludGVycnVwdCAgfCA5ICAgIHwgU3FsaXRlUmFuZ2UgICAgICB8IDI1ICAgfFxuICAgKiB8IFNxbGl0ZUlPRXJyICAgICAgfCAxMCAgIHwgU3FsaXRlTm90QURCICAgICB8IDI2ICAgfFxuICAgKiB8IFNxbGl0ZUNvcnJ1cHQgICAgfCAxMSAgIHwgU3FsaXRlTm90aWNlICAgICB8IDI3ICAgfFxuICAgKiB8IFNxbGl0ZU5vdEZvdW5kICAgfCAxMiAgIHwgU3FsaXRlV2FybmluZyAgICB8IDI4ICAgfFxuICAgKiB8IFNxbGl0ZUZ1bGwgICAgICAgfCAxMyAgIHwgU3FsaXRlUm93ICAgICAgICB8IDEwMCAgfFxuICAgKiB8IFNxbGl0ZUNhbnRPcGVuICAgfCAxNCAgIHwgU3FsaXRlRG9uZSAgICAgICB8IDEwMSAgfFxuICAgKiB8IFNxbGl0ZVByb3RvY29sICAgfCAxNSAgIHwgVW5rbm93biAgICAgICAgICB8IC0xICAgfFxuICAgKlxuICAgKiBUaGVzZSBjb2RlcyBhcmUgYWNjZXNzaWJsZSB2aWFcbiAgICogdGhlIGV4cG9ydGVkIGBTdGF0dXNgIG9iamVjdC5cbiAgICovXG4gIGNvZGU6IG51bWJlcjtcblxuICAvKipcbiAgICogU3FsaXRlRXJyb3IuY29kZU5hbWVcbiAgICpcbiAgICogS2V5IG9mIGNvZGUgaW4gZXhwb3J0ZWQgYHN0YXR1c2BcbiAgICogb2JqZWN0LlxuICAgKlxuICAgKiBFLmcuIGlmIGBjb2RlYCBpcyBgMTlgLFxuICAgKiBgY29kZU5hbWVgIHdvdWxkIGJlIGBTcWxpdGVDb25zdHJhaW50YC5cbiAgICovXG4gIGdldCBjb2RlTmFtZSgpOiBrZXlvZiB0eXBlb2YgU3RhdHVzIHtcbiAgICByZXR1cm4gU3RhdHVzW3RoaXMuY29kZV0gYXMga2V5b2YgdHlwZW9mIFN0YXR1cztcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsTUFBTSxRQUFRLGdCQUFnQixDQUFDO0FBRXhDLGVBQWUsTUFBTSxXQUFXLFNBQVMsS0FBSztJQUM1Qzs7Ozs7Ozs7OztHQVVDLEdBQ0QsWUFBWSxPQUFlLEVBQUUsSUFBYSxDQUFFO1FBQzFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNmLElBQUksQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDO1FBQzFCLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxJQUFJLEtBQUssUUFBUSxHQUFHLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBQy9EO0lBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXVDQyxHQUNELElBQUksQ0FBUztJQUViOzs7Ozs7OztHQVFDLE9BQ0csUUFBUSxHQUF3QjtRQUNsQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQXdCO0lBQ2xEO0NBQ0QsQ0FBQSJ9