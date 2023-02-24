import instantiate from "../build/sqlite.js";
import { getStr, setArr, setStr } from "./wasm.ts";
import { Status, Values } from "./constants.ts";
import SqliteError from "./error.ts";
import { Empty, Rows } from "./rows.ts";
export class DB {
    _wasm;
    _open;
    _transactions;
    /**
   * DB
   *
   * Create a new database. The passed
   * path will be opened with read/ write
   * permissions and created if it does not
   * already exist.
   *
   * The default opens an in-memory database.
   */ constructor(path = ":memory:"){
        this._wasm = instantiate().exports;
        this._open = false;
        this._transactions = new Set();
        // Try to open the database
        let status;
        setStr(this._wasm, path, (ptr)=>{
            status = this._wasm.open(ptr);
        });
        if (status !== Status.SqliteOk) {
            throw this._error();
        }
        this._open = true;
    }
    /**
   * DB.query
   *
   * Run a query against the database. The query
   * can contain placeholder parameters, which
   * are bound to the values passed in 'values'.
   *
   *     db.query("SELECT name, email FROM users WHERE subscribed = ? AND list LIKE ?", [true, listName]);
   *
   * This supports positional and named parameters.
   * Positional parameters can be set by passing an
   * array for values. Named parameters can be set
   * by passing an object for values.
   *
   * While they can be mixed in principle, this is
   * not recommended.
   *
   * | Parameter     | Values                  |
   * |---------------|-------------------------|
   * | `?NNN` or `?` | NNN-th value in array   |
   * | `:AAAA`       | value `AAAA` or `:AAAA` |
   * | `@AAAA`       | value `@AAAA`           |
   * | `$AAAA`       | value `$AAAA`           |
   *
   * (see https://www.sqlite.org/lang_expr.html)
   *
   * Values may only be of the following
   * types and are converted as follows:
   *
   * | JS in      | SQL type        | JS out           |
   * |------------|-----------------|------------------|
   * | number     | INTEGER or REAL | number or bigint |
   * | bigint     | INTEGER         | number or bigint |
   * | boolean    | INTEGER         | number           |
   * | string     | TEXT            | string           |
   * | Date       | TEXT            | string           |
   * | Uint8Array | BLOB            | Uint8Array       |
   * | null       | NULL            | null             |
   * | undefined  | NULL            | null             |
   *
   * If no value is provided to a given parameter,
   * SQLite will default to NULL.
   *
   * If a `bigint` is bound, it is converted to a
   * signed 64 big integer, which may not be lossless.
   * If an integer value is read from the database, which
   * is too big to safely be contained in a `number`, it
   * is automatically returned as a `bigint`.
   *
   * If a `Date` is bound, it will be converted to
   * an ISO 8601 string: `YYYY-MM-DDTHH:MM:SS.SSSZ`.
   * This format is understood by built-in SQLite
   * date-time functions. Also see
   * https://sqlite.org/lang_datefunc.html.
   *
   * This always returns an iterable Rows object.
   * As a special case, if the query has no rows
   * to return this returns the Empty row (which
   * is also iterable, but has zero entries).
   *
   * !> Any returned Rows object needs to be fully
   * iterated over or discarded by calling
   * `.return()` or closing the iterator.
   */ query(sql, values) {
        if (!this._open) {
            throw new SqliteError("Database was closed.");
        }
        // Prepare sqlite query statement
        let stmt = Values.Null;
        setStr(this._wasm, sql, (ptr)=>{
            stmt = this._wasm.prepare(ptr);
        });
        if (stmt === Values.Null) {
            throw this._error();
        }
        // Prepare parameter array
        let parameters = [];
        if (Array.isArray(values)) {
            parameters = values;
        } else if (typeof values === "object") {
            // Resolve parameter index for named values
            for (const key of Object.keys(values)){
                let idx = Values.Error;
                // Prepend ':' to name, if it does not have a special starting character
                let name = key;
                if (name[0] !== ":" && name[0] !== "@" && name[0] !== "$") {
                    name = `:${name}`;
                }
                setStr(this._wasm, name, (ptr)=>{
                    idx = this._wasm.bind_parameter_index(stmt, ptr);
                });
                if (idx === Values.Error) {
                    this._wasm.finalize(stmt);
                    throw new SqliteError(`No parameter named '${name}'.`);
                }
                parameters[idx - 1] = values[key];
            }
        }
        // Bind parameters
        for(let i = 0; i < parameters.length; i++){
            let value = parameters[i];
            let status;
            switch(typeof value){
                case "boolean":
                    value = value ? 1 : 0;
                // fall through
                case "number":
                    if (Number.isSafeInteger(value)) {
                        status = this._wasm.bind_int(stmt, i + 1, value);
                    } else {
                        status = this._wasm.bind_double(stmt, i + 1, value);
                    }
                    break;
                case "bigint":
                    // bigint is bound as a string and converted to i64 on C side
                    setStr(this._wasm, value.toString(), (ptr)=>{
                        status = this._wasm.bind_big_int(stmt, i + 1, ptr);
                    });
                    break;
                case "string":
                    setStr(this._wasm, value, (ptr)=>{
                        status = this._wasm.bind_text(stmt, i + 1, ptr);
                    });
                    break;
                default:
                    if (value instanceof Date) {
                        // Dates are allowed and bound to TEXT, formatted `YYYY-MM-DDTHH:MM:SS.SSSZ`
                        setStr(this._wasm, value.toISOString(), (ptr)=>{
                            status = this._wasm.bind_text(stmt, i + 1, ptr);
                        });
                    } else if (value instanceof Uint8Array) {
                        // Uint8Arrays are allowed and bound to BLOB
                        setArr(this._wasm, value, (ptr)=>{
                            status = this._wasm.bind_blob(stmt, i + 1, ptr, value.length);
                        });
                    } else if (value === null || value === undefined) {
                        // Both null and undefined result in a NULL entry
                        status = this._wasm.bind_null(stmt, i + 1);
                    } else {
                        this._wasm.finalize(stmt);
                        throw new SqliteError(`Can not bind ${typeof value}.`);
                    }
                    break;
            }
            if (status !== Status.SqliteOk) {
                this._wasm.finalize(stmt);
                throw this._error(status);
            }
        }
        // Step once to handle case where result is empty
        const status = this._wasm.step(stmt);
        switch(status){
            case Status.SqliteDone:
                this._wasm.finalize(stmt);
                return Empty;
                break;
            case Status.SqliteRow:
                const transaction = new Rows(this, stmt);
                this._transactions.add(transaction);
                return transaction;
                break;
            default:
                this._wasm.finalize(stmt);
                throw this._error(status);
                break;
        }
    }
    /**
   * DB.close
   *
   * Close database handle. This must be called if
   * DB is no longer used, to avoid leaking file
   * resources.
   *
   * If force is specified, any on-going transactions
   * will be closed.
   */ close(force = false) {
        if (!this._open) {
            return;
        }
        if (force) {
            for (const transaction of this._transactions){
                transaction.return();
            }
        }
        if (this._wasm.close() !== Status.SqliteOk) {
            throw this._error();
        }
        this._open = false;
    }
    /**
   * DB.lastInsertRowId
   *
   * Get last inserted row id. This corresponds to
   * the SQLite function `sqlite3_last_insert_rowid`.
   * 
   * By default, it will return 0 if there is no row
   * inserted yet.
   */ get lastInsertRowId() {
        return this._wasm.last_insert_rowid();
    }
    /**
   * DB.changes
   *
   * Return the number of rows modified, inserted or
   * deleted by the most recently completed query.
   * This corresponds to the SQLite function
   * `sqlite3_changes`.
   */ get changes() {
        return this._wasm.changes();
    }
    /**
   * DB.totalChanges
   *
   * Return the number of rows modified, inserted or
   * deleted since the database was opened.
   * This corresponds to the SQLite function
   * `sqlite3_total_changes`.
   */ get totalChanges() {
        return this._wasm.total_changes();
    }
    _error(code) {
        if (code === undefined) {
            code = this._wasm.get_status();
        }
        const msg = getStr(this._wasm, this._wasm.get_sqlite_error_str());
        return new SqliteError(msg, code);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvc3FsaXRlQHYyLjMuMi9zcmMvZGIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGluc3RhbnRpYXRlIGZyb20gXCIuLi9idWlsZC9zcWxpdGUuanNcIjtcbmltcG9ydCB7IGdldFN0ciwgc2V0QXJyLCBzZXRTdHIgfSBmcm9tIFwiLi93YXNtLnRzXCI7XG5pbXBvcnQgeyBTdGF0dXMsIFZhbHVlcyB9IGZyb20gXCIuL2NvbnN0YW50cy50c1wiO1xuaW1wb3J0IFNxbGl0ZUVycm9yIGZyb20gXCIuL2Vycm9yLnRzXCI7XG5pbXBvcnQgeyBFbXB0eSwgUm93cyB9IGZyb20gXCIuL3Jvd3MudHNcIjtcblxuLy8gUG9zc2libGUgcGFyYW1ldGVycyB0byBiZSBib3VuZCB0byBhIHF1ZXJ5XG50eXBlIFF1ZXJ5UGFyYW0gPVxuICB8IGJvb2xlYW5cbiAgfCBudW1iZXJcbiAgfCBiaWdpbnRcbiAgfCBzdHJpbmdcbiAgfCBudWxsXG4gIHwgdW5kZWZpbmVkXG4gIHwgRGF0ZVxuICB8IFVpbnQ4QXJyYXk7XG5cbmV4cG9ydCBjbGFzcyBEQiB7XG4gIHByaXZhdGUgX3dhc206IGFueTtcbiAgcHJpdmF0ZSBfb3BlbjogYm9vbGVhbjtcbiAgcHJpdmF0ZSBfdHJhbnNhY3Rpb25zOiBTZXQ8Um93cz47XG5cbiAgLyoqXG4gICAqIERCXG4gICAqXG4gICAqIENyZWF0ZSBhIG5ldyBkYXRhYmFzZS4gVGhlIHBhc3NlZFxuICAgKiBwYXRoIHdpbGwgYmUgb3BlbmVkIHdpdGggcmVhZC8gd3JpdGVcbiAgICogcGVybWlzc2lvbnMgYW5kIGNyZWF0ZWQgaWYgaXQgZG9lcyBub3RcbiAgICogYWxyZWFkeSBleGlzdC5cbiAgICpcbiAgICogVGhlIGRlZmF1bHQgb3BlbnMgYW4gaW4tbWVtb3J5IGRhdGFiYXNlLlxuICAgKi9cbiAgY29uc3RydWN0b3IocGF0aDogc3RyaW5nID0gXCI6bWVtb3J5OlwiKSB7XG4gICAgdGhpcy5fd2FzbSA9IGluc3RhbnRpYXRlKCkuZXhwb3J0cztcbiAgICB0aGlzLl9vcGVuID0gZmFsc2U7XG4gICAgdGhpcy5fdHJhbnNhY3Rpb25zID0gbmV3IFNldCgpO1xuXG4gICAgLy8gVHJ5IHRvIG9wZW4gdGhlIGRhdGFiYXNlXG4gICAgbGV0IHN0YXR1cztcbiAgICBzZXRTdHIodGhpcy5fd2FzbSwgcGF0aCwgKHB0cikgPT4ge1xuICAgICAgc3RhdHVzID0gdGhpcy5fd2FzbS5vcGVuKHB0cik7XG4gICAgfSk7XG4gICAgaWYgKHN0YXR1cyAhPT0gU3RhdHVzLlNxbGl0ZU9rKSB7XG4gICAgICB0aHJvdyB0aGlzLl9lcnJvcigpO1xuICAgIH1cbiAgICB0aGlzLl9vcGVuID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEQi5xdWVyeVxuICAgKlxuICAgKiBSdW4gYSBxdWVyeSBhZ2FpbnN0IHRoZSBkYXRhYmFzZS4gVGhlIHF1ZXJ5XG4gICAqIGNhbiBjb250YWluIHBsYWNlaG9sZGVyIHBhcmFtZXRlcnMsIHdoaWNoXG4gICAqIGFyZSBib3VuZCB0byB0aGUgdmFsdWVzIHBhc3NlZCBpbiAndmFsdWVzJy5cbiAgICpcbiAgICogICAgIGRiLnF1ZXJ5KFwiU0VMRUNUIG5hbWUsIGVtYWlsIEZST00gdXNlcnMgV0hFUkUgc3Vic2NyaWJlZCA9ID8gQU5EIGxpc3QgTElLRSA/XCIsIFt0cnVlLCBsaXN0TmFtZV0pO1xuICAgKlxuICAgKiBUaGlzIHN1cHBvcnRzIHBvc2l0aW9uYWwgYW5kIG5hbWVkIHBhcmFtZXRlcnMuXG4gICAqIFBvc2l0aW9uYWwgcGFyYW1ldGVycyBjYW4gYmUgc2V0IGJ5IHBhc3NpbmcgYW5cbiAgICogYXJyYXkgZm9yIHZhbHVlcy4gTmFtZWQgcGFyYW1ldGVycyBjYW4gYmUgc2V0XG4gICAqIGJ5IHBhc3NpbmcgYW4gb2JqZWN0IGZvciB2YWx1ZXMuXG4gICAqXG4gICAqIFdoaWxlIHRoZXkgY2FuIGJlIG1peGVkIGluIHByaW5jaXBsZSwgdGhpcyBpc1xuICAgKiBub3QgcmVjb21tZW5kZWQuXG4gICAqXG4gICAqIHwgUGFyYW1ldGVyICAgICB8IFZhbHVlcyAgICAgICAgICAgICAgICAgIHxcbiAgICogfC0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tfFxuICAgKiB8IGA/Tk5OYCBvciBgP2AgfCBOTk4tdGggdmFsdWUgaW4gYXJyYXkgICB8XG4gICAqIHwgYDpBQUFBYCAgICAgICB8IHZhbHVlIGBBQUFBYCBvciBgOkFBQUFgIHxcbiAgICogfCBgQEFBQUFgICAgICAgIHwgdmFsdWUgYEBBQUFBYCAgICAgICAgICAgfFxuICAgKiB8IGAkQUFBQWAgICAgICAgfCB2YWx1ZSBgJEFBQUFgICAgICAgICAgICB8XG4gICAqXG4gICAqIChzZWUgaHR0cHM6Ly93d3cuc3FsaXRlLm9yZy9sYW5nX2V4cHIuaHRtbClcbiAgICpcbiAgICogVmFsdWVzIG1heSBvbmx5IGJlIG9mIHRoZSBmb2xsb3dpbmdcbiAgICogdHlwZXMgYW5kIGFyZSBjb252ZXJ0ZWQgYXMgZm9sbG93czpcbiAgICpcbiAgICogfCBKUyBpbiAgICAgIHwgU1FMIHR5cGUgICAgICAgIHwgSlMgb3V0ICAgICAgICAgICB8XG4gICAqIHwtLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS0tfFxuICAgKiB8IG51bWJlciAgICAgfCBJTlRFR0VSIG9yIFJFQUwgfCBudW1iZXIgb3IgYmlnaW50IHxcbiAgICogfCBiaWdpbnQgICAgIHwgSU5URUdFUiAgICAgICAgIHwgbnVtYmVyIG9yIGJpZ2ludCB8XG4gICAqIHwgYm9vbGVhbiAgICB8IElOVEVHRVIgICAgICAgICB8IG51bWJlciAgICAgICAgICAgfFxuICAgKiB8IHN0cmluZyAgICAgfCBURVhUICAgICAgICAgICAgfCBzdHJpbmcgICAgICAgICAgIHxcbiAgICogfCBEYXRlICAgICAgIHwgVEVYVCAgICAgICAgICAgIHwgc3RyaW5nICAgICAgICAgICB8XG4gICAqIHwgVWludDhBcnJheSB8IEJMT0IgICAgICAgICAgICB8IFVpbnQ4QXJyYXkgICAgICAgfFxuICAgKiB8IG51bGwgICAgICAgfCBOVUxMICAgICAgICAgICAgfCBudWxsICAgICAgICAgICAgIHxcbiAgICogfCB1bmRlZmluZWQgIHwgTlVMTCAgICAgICAgICAgIHwgbnVsbCAgICAgICAgICAgICB8XG4gICAqXG4gICAqIElmIG5vIHZhbHVlIGlzIHByb3ZpZGVkIHRvIGEgZ2l2ZW4gcGFyYW1ldGVyLFxuICAgKiBTUUxpdGUgd2lsbCBkZWZhdWx0IHRvIE5VTEwuXG4gICAqXG4gICAqIElmIGEgYGJpZ2ludGAgaXMgYm91bmQsIGl0IGlzIGNvbnZlcnRlZCB0byBhXG4gICAqIHNpZ25lZCA2NCBiaWcgaW50ZWdlciwgd2hpY2ggbWF5IG5vdCBiZSBsb3NzbGVzcy5cbiAgICogSWYgYW4gaW50ZWdlciB2YWx1ZSBpcyByZWFkIGZyb20gdGhlIGRhdGFiYXNlLCB3aGljaFxuICAgKiBpcyB0b28gYmlnIHRvIHNhZmVseSBiZSBjb250YWluZWQgaW4gYSBgbnVtYmVyYCwgaXRcbiAgICogaXMgYXV0b21hdGljYWxseSByZXR1cm5lZCBhcyBhIGBiaWdpbnRgLlxuICAgKlxuICAgKiBJZiBhIGBEYXRlYCBpcyBib3VuZCwgaXQgd2lsbCBiZSBjb252ZXJ0ZWQgdG9cbiAgICogYW4gSVNPIDg2MDEgc3RyaW5nOiBgWVlZWS1NTS1ERFRISDpNTTpTUy5TU1NaYC5cbiAgICogVGhpcyBmb3JtYXQgaXMgdW5kZXJzdG9vZCBieSBidWlsdC1pbiBTUUxpdGVcbiAgICogZGF0ZS10aW1lIGZ1bmN0aW9ucy4gQWxzbyBzZWVcbiAgICogaHR0cHM6Ly9zcWxpdGUub3JnL2xhbmdfZGF0ZWZ1bmMuaHRtbC5cbiAgICpcbiAgICogVGhpcyBhbHdheXMgcmV0dXJucyBhbiBpdGVyYWJsZSBSb3dzIG9iamVjdC5cbiAgICogQXMgYSBzcGVjaWFsIGNhc2UsIGlmIHRoZSBxdWVyeSBoYXMgbm8gcm93c1xuICAgKiB0byByZXR1cm4gdGhpcyByZXR1cm5zIHRoZSBFbXB0eSByb3cgKHdoaWNoXG4gICAqIGlzIGFsc28gaXRlcmFibGUsIGJ1dCBoYXMgemVybyBlbnRyaWVzKS5cbiAgICpcbiAgICogIT4gQW55IHJldHVybmVkIFJvd3Mgb2JqZWN0IG5lZWRzIHRvIGJlIGZ1bGx5XG4gICAqIGl0ZXJhdGVkIG92ZXIgb3IgZGlzY2FyZGVkIGJ5IGNhbGxpbmdcbiAgICogYC5yZXR1cm4oKWAgb3IgY2xvc2luZyB0aGUgaXRlcmF0b3IuXG4gICAqL1xuICBxdWVyeShzcWw6IHN0cmluZywgdmFsdWVzPzogb2JqZWN0IHwgUXVlcnlQYXJhbVtdKTogUm93cyB7XG4gICAgaWYgKCF0aGlzLl9vcGVuKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IoXCJEYXRhYmFzZSB3YXMgY2xvc2VkLlwiKTtcbiAgICB9XG5cbiAgICAvLyBQcmVwYXJlIHNxbGl0ZSBxdWVyeSBzdGF0ZW1lbnRcbiAgICBsZXQgc3RtdDogbnVtYmVyID0gVmFsdWVzLk51bGw7XG4gICAgc2V0U3RyKHRoaXMuX3dhc20sIHNxbCwgKHB0cikgPT4ge1xuICAgICAgc3RtdCA9IHRoaXMuX3dhc20ucHJlcGFyZShwdHIpO1xuICAgIH0pO1xuICAgIGlmIChzdG10ID09PSBWYWx1ZXMuTnVsbCkge1xuICAgICAgdGhyb3cgdGhpcy5fZXJyb3IoKTtcbiAgICB9XG5cbiAgICAvLyBQcmVwYXJlIHBhcmFtZXRlciBhcnJheVxuICAgIGxldCBwYXJhbWV0ZXJzOiBhbnlbXSA9IFtdO1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlcykpIHtcbiAgICAgIHBhcmFtZXRlcnMgPSB2YWx1ZXM7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWVzID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAvLyBSZXNvbHZlIHBhcmFtZXRlciBpbmRleCBmb3IgbmFtZWQgdmFsdWVzXG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh2YWx1ZXMpKSB7XG4gICAgICAgIGxldCBpZHggPSBWYWx1ZXMuRXJyb3I7XG4gICAgICAgIC8vIFByZXBlbmQgJzonIHRvIG5hbWUsIGlmIGl0IGRvZXMgbm90IGhhdmUgYSBzcGVjaWFsIHN0YXJ0aW5nIGNoYXJhY3RlclxuICAgICAgICBsZXQgbmFtZSA9IGtleTtcbiAgICAgICAgaWYgKG5hbWVbMF0gIT09IFwiOlwiICYmIG5hbWVbMF0gIT09IFwiQFwiICYmIG5hbWVbMF0gIT09IFwiJFwiKSB7XG4gICAgICAgICAgbmFtZSA9IGA6JHtuYW1lfWA7XG4gICAgICAgIH1cbiAgICAgICAgc2V0U3RyKHRoaXMuX3dhc20sIG5hbWUsIChwdHIpID0+IHtcbiAgICAgICAgICBpZHggPSB0aGlzLl93YXNtLmJpbmRfcGFyYW1ldGVyX2luZGV4KHN0bXQsIHB0cik7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaWR4ID09PSBWYWx1ZXMuRXJyb3IpIHtcbiAgICAgICAgICB0aGlzLl93YXNtLmZpbmFsaXplKHN0bXQpO1xuICAgICAgICAgIHRocm93IG5ldyBTcWxpdGVFcnJvcihgTm8gcGFyYW1ldGVyIG5hbWVkICcke25hbWV9Jy5gKTtcbiAgICAgICAgfVxuICAgICAgICBwYXJhbWV0ZXJzW2lkeCAtIDFdID0gKHZhbHVlcyBhcyBhbnkpW2tleV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQmluZCBwYXJhbWV0ZXJzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJhbWV0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgdmFsdWUgPSBwYXJhbWV0ZXJzW2ldO1xuICAgICAgbGV0IHN0YXR1cztcbiAgICAgIHN3aXRjaCAodHlwZW9mIHZhbHVlKSB7XG4gICAgICAgIGNhc2UgXCJib29sZWFuXCI6XG4gICAgICAgICAgdmFsdWUgPSB2YWx1ZSA/IDEgOiAwO1xuICAgICAgICAvLyBmYWxsIHRocm91Z2hcbiAgICAgICAgY2FzZSBcIm51bWJlclwiOlxuICAgICAgICAgIGlmIChOdW1iZXIuaXNTYWZlSW50ZWdlcih2YWx1ZSkpIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IHRoaXMuX3dhc20uYmluZF9pbnQoc3RtdCwgaSArIDEsIHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdHVzID0gdGhpcy5fd2FzbS5iaW5kX2RvdWJsZShzdG10LCBpICsgMSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcImJpZ2ludFwiOlxuICAgICAgICAgIC8vIGJpZ2ludCBpcyBib3VuZCBhcyBhIHN0cmluZyBhbmQgY29udmVydGVkIHRvIGk2NCBvbiBDIHNpZGVcbiAgICAgICAgICBzZXRTdHIodGhpcy5fd2FzbSwgdmFsdWUudG9TdHJpbmcoKSwgKHB0cikgPT4ge1xuICAgICAgICAgICAgc3RhdHVzID0gdGhpcy5fd2FzbS5iaW5kX2JpZ19pbnQoc3RtdCwgaSArIDEsIHB0cik7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgICAgICBzZXRTdHIodGhpcy5fd2FzbSwgdmFsdWUsIChwdHIpID0+IHtcbiAgICAgICAgICAgIHN0YXR1cyA9IHRoaXMuX3dhc20uYmluZF90ZXh0KHN0bXQsIGkgKyAxLCBwdHIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgICAgIC8vIERhdGVzIGFyZSBhbGxvd2VkIGFuZCBib3VuZCB0byBURVhULCBmb3JtYXR0ZWQgYFlZWVktTU0tRERUSEg6TU06U1MuU1NTWmBcbiAgICAgICAgICAgIHNldFN0cih0aGlzLl93YXNtLCB2YWx1ZS50b0lTT1N0cmluZygpLCAocHRyKSA9PiB7XG4gICAgICAgICAgICAgIHN0YXR1cyA9IHRoaXMuX3dhc20uYmluZF90ZXh0KHN0bXQsIGkgKyAxLCBwdHIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpIHtcbiAgICAgICAgICAgIC8vIFVpbnQ4QXJyYXlzIGFyZSBhbGxvd2VkIGFuZCBib3VuZCB0byBCTE9CXG4gICAgICAgICAgICBzZXRBcnIodGhpcy5fd2FzbSwgdmFsdWUsIChwdHIpID0+IHtcbiAgICAgICAgICAgICAgc3RhdHVzID0gdGhpcy5fd2FzbS5iaW5kX2Jsb2Ioc3RtdCwgaSArIDEsIHB0ciwgdmFsdWUubGVuZ3RoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gQm90aCBudWxsIGFuZCB1bmRlZmluZWQgcmVzdWx0IGluIGEgTlVMTCBlbnRyeVxuICAgICAgICAgICAgc3RhdHVzID0gdGhpcy5fd2FzbS5iaW5kX251bGwoc3RtdCwgaSArIDEpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl93YXNtLmZpbmFsaXplKHN0bXQpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IFNxbGl0ZUVycm9yKGBDYW4gbm90IGJpbmQgJHt0eXBlb2YgdmFsdWV9LmApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChzdGF0dXMgIT09IFN0YXR1cy5TcWxpdGVPaykge1xuICAgICAgICB0aGlzLl93YXNtLmZpbmFsaXplKHN0bXQpO1xuICAgICAgICB0aHJvdyB0aGlzLl9lcnJvcihzdGF0dXMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFN0ZXAgb25jZSB0byBoYW5kbGUgY2FzZSB3aGVyZSByZXN1bHQgaXMgZW1wdHlcbiAgICBjb25zdCBzdGF0dXMgPSB0aGlzLl93YXNtLnN0ZXAoc3RtdCk7XG4gICAgc3dpdGNoIChzdGF0dXMpIHtcbiAgICAgIGNhc2UgU3RhdHVzLlNxbGl0ZURvbmU6XG4gICAgICAgIHRoaXMuX3dhc20uZmluYWxpemUoc3RtdCk7XG4gICAgICAgIHJldHVybiBFbXB0eTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFN0YXR1cy5TcWxpdGVSb3c6XG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gbmV3IFJvd3ModGhpcywgc3RtdCk7XG4gICAgICAgIHRoaXMuX3RyYW5zYWN0aW9ucy5hZGQodHJhbnNhY3Rpb24pO1xuICAgICAgICByZXR1cm4gdHJhbnNhY3Rpb247XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhpcy5fd2FzbS5maW5hbGl6ZShzdG10KTtcbiAgICAgICAgdGhyb3cgdGhpcy5fZXJyb3Ioc3RhdHVzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERCLmNsb3NlXG4gICAqXG4gICAqIENsb3NlIGRhdGFiYXNlIGhhbmRsZS4gVGhpcyBtdXN0IGJlIGNhbGxlZCBpZlxuICAgKiBEQiBpcyBubyBsb25nZXIgdXNlZCwgdG8gYXZvaWQgbGVha2luZyBmaWxlXG4gICAqIHJlc291cmNlcy5cbiAgICpcbiAgICogSWYgZm9yY2UgaXMgc3BlY2lmaWVkLCBhbnkgb24tZ29pbmcgdHJhbnNhY3Rpb25zXG4gICAqIHdpbGwgYmUgY2xvc2VkLlxuICAgKi9cbiAgY2xvc2UoZm9yY2U6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIGlmICghdGhpcy5fb3Blbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZm9yY2UpIHtcbiAgICAgIGZvciAoY29uc3QgdHJhbnNhY3Rpb24gb2YgdGhpcy5fdHJhbnNhY3Rpb25zKSB7XG4gICAgICAgIHRyYW5zYWN0aW9uLnJldHVybigpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5fd2FzbS5jbG9zZSgpICE9PSBTdGF0dXMuU3FsaXRlT2spIHtcbiAgICAgIHRocm93IHRoaXMuX2Vycm9yKCk7XG4gICAgfVxuICAgIHRoaXMuX29wZW4gPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEQi5sYXN0SW5zZXJ0Um93SWRcbiAgICpcbiAgICogR2V0IGxhc3QgaW5zZXJ0ZWQgcm93IGlkLiBUaGlzIGNvcnJlc3BvbmRzIHRvXG4gICAqIHRoZSBTUUxpdGUgZnVuY3Rpb24gYHNxbGl0ZTNfbGFzdF9pbnNlcnRfcm93aWRgLlxuICAgKiBcbiAgICogQnkgZGVmYXVsdCwgaXQgd2lsbCByZXR1cm4gMCBpZiB0aGVyZSBpcyBubyByb3dcbiAgICogaW5zZXJ0ZWQgeWV0LlxuICAgKi9cbiAgZ2V0IGxhc3RJbnNlcnRSb3dJZCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl93YXNtLmxhc3RfaW5zZXJ0X3Jvd2lkKCk7XG4gIH1cblxuICAvKipcbiAgICogREIuY2hhbmdlc1xuICAgKlxuICAgKiBSZXR1cm4gdGhlIG51bWJlciBvZiByb3dzIG1vZGlmaWVkLCBpbnNlcnRlZCBvclxuICAgKiBkZWxldGVkIGJ5IHRoZSBtb3N0IHJlY2VudGx5IGNvbXBsZXRlZCBxdWVyeS5cbiAgICogVGhpcyBjb3JyZXNwb25kcyB0byB0aGUgU1FMaXRlIGZ1bmN0aW9uXG4gICAqIGBzcWxpdGUzX2NoYW5nZXNgLlxuICAgKi9cbiAgZ2V0IGNoYW5nZXMoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fd2FzbS5jaGFuZ2VzKCk7XG4gIH1cblxuICAvKipcbiAgICogREIudG90YWxDaGFuZ2VzXG4gICAqXG4gICAqIFJldHVybiB0aGUgbnVtYmVyIG9mIHJvd3MgbW9kaWZpZWQsIGluc2VydGVkIG9yXG4gICAqIGRlbGV0ZWQgc2luY2UgdGhlIGRhdGFiYXNlIHdhcyBvcGVuZWQuXG4gICAqIFRoaXMgY29ycmVzcG9uZHMgdG8gdGhlIFNRTGl0ZSBmdW5jdGlvblxuICAgKiBgc3FsaXRlM190b3RhbF9jaGFuZ2VzYC5cbiAgICovXG4gIGdldCB0b3RhbENoYW5nZXMoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fd2FzbS50b3RhbF9jaGFuZ2VzKCk7XG4gIH1cblxuICBwcml2YXRlIF9lcnJvcihjb2RlPzogbnVtYmVyKTogU3FsaXRlRXJyb3Ige1xuICAgIGlmIChjb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvZGUgPSB0aGlzLl93YXNtLmdldF9zdGF0dXMoKSBhcyBudW1iZXI7XG4gICAgfVxuICAgIGNvbnN0IG1zZyA9IGdldFN0cih0aGlzLl93YXNtLCB0aGlzLl93YXNtLmdldF9zcWxpdGVfZXJyb3Jfc3RyKCkpO1xuICAgIHJldHVybiBuZXcgU3FsaXRlRXJyb3IobXNnLCBjb2RlKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8saUJBQWlCLHFCQUFxQjtBQUM3QyxTQUFTLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxRQUFRLFlBQVk7QUFDbkQsU0FBUyxNQUFNLEVBQUUsTUFBTSxRQUFRLGlCQUFpQjtBQUNoRCxPQUFPLGlCQUFpQixhQUFhO0FBQ3JDLFNBQVMsS0FBSyxFQUFFLElBQUksUUFBUSxZQUFZO0FBYXhDLE9BQU8sTUFBTTtJQUNILE1BQVc7SUFDWCxNQUFlO0lBQ2YsY0FBeUI7SUFFakM7Ozs7Ozs7OztHQVNDLEdBQ0QsWUFBWSxPQUFlLFVBQVUsQ0FBRTtRQUNyQyxJQUFJLENBQUMsS0FBSyxHQUFHLGNBQWMsT0FBTztRQUNsQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUs7UUFDbEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJO1FBRXpCLDJCQUEyQjtRQUMzQixJQUFJO1FBQ0osT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFRO1lBQ2hDLFNBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDM0I7UUFDQSxJQUFJLFdBQVcsT0FBTyxRQUFRLEVBQUU7WUFDOUIsTUFBTSxJQUFJLENBQUMsTUFBTSxHQUFHO1FBQ3RCLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUk7SUFDbkI7SUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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