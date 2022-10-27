import { getStr } from "./wasm.ts";
import { Status, Types, Values } from "./constants.ts";
import SqliteError from "./error.ts";
import { RowObjects } from "./row_objects.ts";
export class Rows {
    _db;
    _stmt;
    _done;
    /**
   * Rows
   *
   * Rows represent a set of results from a query.
   * They are iterable and yield arrays with
   * the data from the selected columns.
   *
   * This class is not exported from the module
   * and the only correct way to obtain a `Rows`
   * object is by making a database query.
   */ constructor(db, stmt){
        this._db = db;
        this._stmt = stmt;
        this._done = false;
        if (!this._db) {
            this._done = true;
        }
    }
    /**
   * Rows.return
   *
   * Implements the closing iterator
   * protocol. See also:
   * https://exploringjs.com/es6/ch_iteration.html#sec_closing-iterators
   */ return() {
        if (this._done) {
            return {
                done: true,
                value: undefined
            };
        }
        // Release transaction slot
        this._db._wasm.finalize(this._stmt);
        this._db._transactions.delete(this);
        this._done = true;
        return {
            done: true,
            value: undefined
        };
    }
    /**
   * Rows.done
   *
   * Deprecated, prefer `Rows.return`.
   */ done() {
        this.return();
    }
    /**
   * Rows.next
   *
   * Implements the iterator protocol.
   */ next() {
        if (this._done) return {
            value: undefined,
            done: true
        };
        // Load row data and advance statement
        const row = this._get();
        const status = this._db._wasm.step(this._stmt);
        switch(status){
            case Status.SqliteRow:
                break;
            case Status.SqliteDone:
                this.return();
                break;
            default:
                this.return();
                throw this._db._error(status);
                break;
        }
        return {
            value: row,
            done: false
        };
    }
    /**
   * Rows.columns
   *
   * Call this if you need column names from the result of a select query.
   *
   * This method returns an array of objects, where each object has the following properties:
   *
   * | Property     | Value                                      |
   * |--------------|--------------------------------------------|
   * | `name`       | the result of `sqlite3_column_name`        |
   * | `originName` | the result of `sqlite3_column_origin_name` |
   * | `tableName`  | the result of `sqlite3_column_table_name`  |
   */ columns() {
        if (this._done) {
            throw new SqliteError("Unable to retrieve column names as transaction is finalized.");
        }
        const columnCount = this._db._wasm.column_count(this._stmt);
        const columns = [];
        for(let i = 0; i < columnCount; i++){
            const name = getStr(this._db._wasm, this._db._wasm.column_name(this._stmt, i));
            const originName = getStr(this._db._wasm, this._db._wasm.column_origin_name(this._stmt, i));
            const tableName = getStr(this._db._wasm, this._db._wasm.column_table_name(this._stmt, i));
            columns.push({
                name,
                originName,
                tableName
            });
        }
        return columns;
    }
    /**
   * Rows.asObjects
   * 
   * Call this if you need to ouput the rows as objects.
   * 
   *     const rows = [...db.query("SELECT name FROM users;").asObjects()];
   */ asObjects() {
        return new RowObjects(this);
    }
    [Symbol.iterator]() {
        return this;
    }
    _get() {
        // Get results from row
        const row = [];
        // return row;
        for(let i = 0, c = this._db._wasm.column_count(this._stmt); i < c; i++){
            switch(this._db._wasm.column_type(this._stmt, i)){
                case Types.Integer:
                    row.push(this._db._wasm.column_int(this._stmt, i));
                    break;
                case Types.Float:
                    row.push(this._db._wasm.column_double(this._stmt, i));
                    break;
                case Types.Text:
                    row.push(getStr(this._db._wasm, this._db._wasm.column_text(this._stmt, i)));
                    break;
                case Types.Blob:
                    {
                        const ptr = this._db._wasm.column_blob(this._stmt, i);
                        if (ptr === 0) {
                            // Zero pointer results in null
                            row.push(null);
                        } else {
                            const length = this._db._wasm.column_bytes(this._stmt, i);
                            // Slice should copy the bytes, as it makes a shallow copy
                            row.push(new Uint8Array(this._db._wasm.memory.buffer, ptr, length).slice());
                        }
                        break;
                    }
                case Types.BigInteger:
                    {
                        const ptr1 = this._db._wasm.column_text(this._stmt, i);
                        row.push(BigInt(getStr(this._db._wasm, ptr1)));
                        break;
                    }
                default:
                    // TODO: Differentiate between NULL and not-recognized?
                    row.push(null);
                    break;
            }
        }
        return row;
    }
}
/**
 * Empty
 *
 * A special constant. This is a `Rows` object
 * which has no results. It is still iterable,
 * however it won't yield any results.
 *
 * `Empty` is returned from queries which return
 * no data.
 */ export const Empty = new Rows(null, Values.Null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvc3FsaXRlQHYyLjMuMi9zcmMvcm93cy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBnZXRTdHIgfSBmcm9tIFwiLi93YXNtLnRzXCI7XG5pbXBvcnQgeyBTdGF0dXMsIFR5cGVzLCBWYWx1ZXMgfSBmcm9tIFwiLi9jb25zdGFudHMudHNcIjtcbmltcG9ydCBTcWxpdGVFcnJvciBmcm9tIFwiLi9lcnJvci50c1wiO1xuaW1wb3J0IHsgUm93T2JqZWN0cyB9IGZyb20gXCIuL3Jvd19vYmplY3RzLnRzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29sdW1uTmFtZSB7XG4gIG5hbWU6IHN0cmluZztcbiAgb3JpZ2luTmFtZTogc3RyaW5nO1xuICB0YWJsZU5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFJvd3Mge1xuICBwcml2YXRlIF9kYjogYW55O1xuICBwcml2YXRlIF9zdG10OiBudW1iZXI7XG4gIHByaXZhdGUgX2RvbmU6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFJvd3NcbiAgICpcbiAgICogUm93cyByZXByZXNlbnQgYSBzZXQgb2YgcmVzdWx0cyBmcm9tIGEgcXVlcnkuXG4gICAqIFRoZXkgYXJlIGl0ZXJhYmxlIGFuZCB5aWVsZCBhcnJheXMgd2l0aFxuICAgKiB0aGUgZGF0YSBmcm9tIHRoZSBzZWxlY3RlZCBjb2x1bW5zLlxuICAgKlxuICAgKiBUaGlzIGNsYXNzIGlzIG5vdCBleHBvcnRlZCBmcm9tIHRoZSBtb2R1bGVcbiAgICogYW5kIHRoZSBvbmx5IGNvcnJlY3Qgd2F5IHRvIG9idGFpbiBhIGBSb3dzYFxuICAgKiBvYmplY3QgaXMgYnkgbWFraW5nIGEgZGF0YWJhc2UgcXVlcnkuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihkYjogYW55LCBzdG10OiBudW1iZXIpIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICAgIHRoaXMuX3N0bXQgPSBzdG10O1xuICAgIHRoaXMuX2RvbmUgPSBmYWxzZTtcblxuICAgIGlmICghdGhpcy5fZGIpIHtcbiAgICAgIHRoaXMuX2RvbmUgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSb3dzLnJldHVyblxuICAgKlxuICAgKiBJbXBsZW1lbnRzIHRoZSBjbG9zaW5nIGl0ZXJhdG9yXG4gICAqIHByb3RvY29sLiBTZWUgYWxzbzpcbiAgICogaHR0cHM6Ly9leHBsb3Jpbmdqcy5jb20vZXM2L2NoX2l0ZXJhdGlvbi5odG1sI3NlY19jbG9zaW5nLWl0ZXJhdG9yc1xuICAgKi9cbiAgcmV0dXJuKCk6IEl0ZXJhdG9yUmVzdWx0PGFueT4ge1xuICAgIGlmICh0aGlzLl9kb25lKSB7XG4gICAgICByZXR1cm4geyBkb25lOiB0cnVlLCB2YWx1ZTogdW5kZWZpbmVkIH07XG4gICAgfVxuICAgIC8vIFJlbGVhc2UgdHJhbnNhY3Rpb24gc2xvdFxuICAgIHRoaXMuX2RiLl93YXNtLmZpbmFsaXplKHRoaXMuX3N0bXQpO1xuICAgIHRoaXMuX2RiLl90cmFuc2FjdGlvbnMuZGVsZXRlKHRoaXMpO1xuICAgIHRoaXMuX2RvbmUgPSB0cnVlO1xuICAgIHJldHVybiB7IGRvbmU6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSb3dzLmRvbmVcbiAgICpcbiAgICogRGVwcmVjYXRlZCwgcHJlZmVyIGBSb3dzLnJldHVybmAuXG4gICAqL1xuICBkb25lKCkge1xuICAgIHRoaXMucmV0dXJuKCk7XG4gIH1cblxuICAvKipcbiAgICogUm93cy5uZXh0XG4gICAqXG4gICAqIEltcGxlbWVudHMgdGhlIGl0ZXJhdG9yIHByb3RvY29sLlxuICAgKi9cbiAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxhbnlbXT4ge1xuICAgIGlmICh0aGlzLl9kb25lKSByZXR1cm4geyB2YWx1ZTogdW5kZWZpbmVkLCBkb25lOiB0cnVlIH07XG4gICAgLy8gTG9hZCByb3cgZGF0YSBhbmQgYWR2YW5jZSBzdGF0ZW1lbnRcbiAgICBjb25zdCByb3cgPSB0aGlzLl9nZXQoKTtcbiAgICBjb25zdCBzdGF0dXMgPSB0aGlzLl9kYi5fd2FzbS5zdGVwKHRoaXMuX3N0bXQpO1xuICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICBjYXNlIFN0YXR1cy5TcWxpdGVSb3c6XG4gICAgICAgIC8vIE5PIE9QXG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBTdGF0dXMuU3FsaXRlRG9uZTpcbiAgICAgICAgdGhpcy5yZXR1cm4oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aGlzLnJldHVybigpO1xuICAgICAgICB0aHJvdyB0aGlzLl9kYi5fZXJyb3Ioc3RhdHVzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiB7IHZhbHVlOiByb3csIGRvbmU6IGZhbHNlIH07XG4gIH1cblxuICAvKipcbiAgICogUm93cy5jb2x1bW5zXG4gICAqXG4gICAqIENhbGwgdGhpcyBpZiB5b3UgbmVlZCBjb2x1bW4gbmFtZXMgZnJvbSB0aGUgcmVzdWx0IG9mIGEgc2VsZWN0IHF1ZXJ5LlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMsIHdoZXJlIGVhY2ggb2JqZWN0IGhhcyB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAqXG4gICAqIHwgUHJvcGVydHkgICAgIHwgVmFsdWUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbiAgICogfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tfFxuICAgKiB8IGBuYW1lYCAgICAgICB8IHRoZSByZXN1bHQgb2YgYHNxbGl0ZTNfY29sdW1uX25hbWVgICAgICAgICB8XG4gICAqIHwgYG9yaWdpbk5hbWVgIHwgdGhlIHJlc3VsdCBvZiBgc3FsaXRlM19jb2x1bW5fb3JpZ2luX25hbWVgIHxcbiAgICogfCBgdGFibGVOYW1lYCAgfCB0aGUgcmVzdWx0IG9mIGBzcWxpdGUzX2NvbHVtbl90YWJsZV9uYW1lYCAgfFxuICAgKi9cbiAgY29sdW1ucygpOiBDb2x1bW5OYW1lW10ge1xuICAgIGlmICh0aGlzLl9kb25lKSB7XG4gICAgICB0aHJvdyBuZXcgU3FsaXRlRXJyb3IoXG4gICAgICAgIFwiVW5hYmxlIHRvIHJldHJpZXZlIGNvbHVtbiBuYW1lcyBhcyB0cmFuc2FjdGlvbiBpcyBmaW5hbGl6ZWQuXCIsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbHVtbkNvdW50ID0gdGhpcy5fZGIuX3dhc20uY29sdW1uX2NvdW50KHRoaXMuX3N0bXQpO1xuICAgIGNvbnN0IGNvbHVtbnM6IENvbHVtbk5hbWVbXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29sdW1uQ291bnQ7IGkrKykge1xuICAgICAgY29uc3QgbmFtZSA9IGdldFN0cihcbiAgICAgICAgdGhpcy5fZGIuX3dhc20sXG4gICAgICAgIHRoaXMuX2RiLl93YXNtLmNvbHVtbl9uYW1lKHRoaXMuX3N0bXQsIGkpLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IG9yaWdpbk5hbWUgPSBnZXRTdHIoXG4gICAgICAgIHRoaXMuX2RiLl93YXNtLFxuICAgICAgICB0aGlzLl9kYi5fd2FzbS5jb2x1bW5fb3JpZ2luX25hbWUodGhpcy5fc3RtdCwgaSksXG4gICAgICApO1xuICAgICAgY29uc3QgdGFibGVOYW1lID0gZ2V0U3RyKFxuICAgICAgICB0aGlzLl9kYi5fd2FzbSxcbiAgICAgICAgdGhpcy5fZGIuX3dhc20uY29sdW1uX3RhYmxlX25hbWUodGhpcy5fc3RtdCwgaSksXG4gICAgICApO1xuICAgICAgY29sdW1ucy5wdXNoKHsgbmFtZSwgb3JpZ2luTmFtZSwgdGFibGVOYW1lIH0pO1xuICAgIH1cbiAgICByZXR1cm4gY29sdW1ucztcbiAgfVxuXG4gIC8qKlxuICAgKiBSb3dzLmFzT2JqZWN0c1xuICAgKiBcbiAgICogQ2FsbCB0aGlzIGlmIHlvdSBuZWVkIHRvIG91cHV0IHRoZSByb3dzIGFzIG9iamVjdHMuXG4gICAqIFxuICAgKiAgICAgY29uc3Qgcm93cyA9IFsuLi5kYi5xdWVyeShcIlNFTEVDVCBuYW1lIEZST00gdXNlcnM7XCIpLmFzT2JqZWN0cygpXTtcbiAgICovXG4gIGFzT2JqZWN0czxUIGV4dGVuZHMgYW55ID0gUmVjb3JkPHN0cmluZywgYW55Pj4oKTogUm93T2JqZWN0czxUPiB7XG4gICAgcmV0dXJuIG5ldyBSb3dPYmplY3RzPFQ+KHRoaXMpO1xuICB9XG5cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwcml2YXRlIF9nZXQoKTogYW55W10ge1xuICAgIC8vIEdldCByZXN1bHRzIGZyb20gcm93XG4gICAgY29uc3Qgcm93ID0gW107XG4gICAgLy8gcmV0dXJuIHJvdztcbiAgICBmb3IgKFxuICAgICAgbGV0IGkgPSAwLCBjID0gdGhpcy5fZGIuX3dhc20uY29sdW1uX2NvdW50KHRoaXMuX3N0bXQpO1xuICAgICAgaSA8IGM7XG4gICAgICBpKytcbiAgICApIHtcbiAgICAgIHN3aXRjaCAodGhpcy5fZGIuX3dhc20uY29sdW1uX3R5cGUodGhpcy5fc3RtdCwgaSkpIHtcbiAgICAgICAgY2FzZSBUeXBlcy5JbnRlZ2VyOlxuICAgICAgICAgIHJvdy5wdXNoKHRoaXMuX2RiLl93YXNtLmNvbHVtbl9pbnQodGhpcy5fc3RtdCwgaSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFR5cGVzLkZsb2F0OlxuICAgICAgICAgIHJvdy5wdXNoKHRoaXMuX2RiLl93YXNtLmNvbHVtbl9kb3VibGUodGhpcy5fc3RtdCwgaSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFR5cGVzLlRleHQ6XG4gICAgICAgICAgcm93LnB1c2goXG4gICAgICAgICAgICBnZXRTdHIoXG4gICAgICAgICAgICAgIHRoaXMuX2RiLl93YXNtLFxuICAgICAgICAgICAgICB0aGlzLl9kYi5fd2FzbS5jb2x1bW5fdGV4dCh0aGlzLl9zdG10LCBpKSxcbiAgICAgICAgICAgICksXG4gICAgICAgICAgKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBUeXBlcy5CbG9iOiB7XG4gICAgICAgICAgY29uc3QgcHRyID0gdGhpcy5fZGIuX3dhc20uY29sdW1uX2Jsb2IodGhpcy5fc3RtdCwgaSk7XG4gICAgICAgICAgaWYgKHB0ciA9PT0gMCkge1xuICAgICAgICAgICAgLy8gWmVybyBwb2ludGVyIHJlc3VsdHMgaW4gbnVsbFxuICAgICAgICAgICAgcm93LnB1c2gobnVsbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbmd0aCA9IHRoaXMuX2RiLl93YXNtLmNvbHVtbl9ieXRlcyh0aGlzLl9zdG10LCBpKTtcbiAgICAgICAgICAgIC8vIFNsaWNlIHNob3VsZCBjb3B5IHRoZSBieXRlcywgYXMgaXQgbWFrZXMgYSBzaGFsbG93IGNvcHlcbiAgICAgICAgICAgIHJvdy5wdXNoKFxuICAgICAgICAgICAgICBuZXcgVWludDhBcnJheSh0aGlzLl9kYi5fd2FzbS5tZW1vcnkuYnVmZmVyLCBwdHIsIGxlbmd0aCkuc2xpY2UoKSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgVHlwZXMuQmlnSW50ZWdlcjoge1xuICAgICAgICAgIGNvbnN0IHB0ciA9IHRoaXMuX2RiLl93YXNtLmNvbHVtbl90ZXh0KHRoaXMuX3N0bXQsIGkpO1xuICAgICAgICAgIHJvdy5wdXNoKEJpZ0ludChnZXRTdHIodGhpcy5fZGIuX3dhc20sIHB0cikpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIC8vIFRPRE86IERpZmZlcmVudGlhdGUgYmV0d2VlbiBOVUxMIGFuZCBub3QtcmVjb2duaXplZD9cbiAgICAgICAgICByb3cucHVzaChudWxsKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJvdztcbiAgfVxufVxuXG4vKipcbiAqIEVtcHR5XG4gKlxuICogQSBzcGVjaWFsIGNvbnN0YW50LiBUaGlzIGlzIGEgYFJvd3NgIG9iamVjdFxuICogd2hpY2ggaGFzIG5vIHJlc3VsdHMuIEl0IGlzIHN0aWxsIGl0ZXJhYmxlLFxuICogaG93ZXZlciBpdCB3b24ndCB5aWVsZCBhbnkgcmVzdWx0cy5cbiAqXG4gKiBgRW1wdHlgIGlzIHJldHVybmVkIGZyb20gcXVlcmllcyB3aGljaCByZXR1cm5cbiAqIG5vIGRhdGEuXG4gKi9cbmV4cG9ydCBjb25zdCBFbXB0eSA9IG5ldyBSb3dzKG51bGwsIFZhbHVlcy5OdWxsKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLE1BQU0sUUFBUSxZQUFZO0FBQ25DLFNBQVMsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLFFBQVEsaUJBQWlCO0FBQ3ZELE9BQU8saUJBQWlCLGFBQWE7QUFDckMsU0FBUyxVQUFVLFFBQVEsbUJBQW1CO0FBUTlDLE9BQU8sTUFBTTtJQUNILElBQVM7SUFDVCxNQUFjO0lBQ2QsTUFBZTtJQUV2Qjs7Ozs7Ozs7OztHQVVDLEdBQ0QsWUFBWSxFQUFPLEVBQUUsSUFBWSxDQUFFO1FBQ2pDLElBQUksQ0FBQyxHQUFHLEdBQUc7UUFDWCxJQUFJLENBQUMsS0FBSyxHQUFHO1FBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLO1FBRWxCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJO1FBQ25CLENBQUM7SUFDSDtJQUVBOzs7Ozs7R0FNQyxHQUNELFNBQThCO1FBQzVCLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNkLE9BQU87Z0JBQUUsTUFBTSxJQUFJO2dCQUFFLE9BQU87WUFBVTtRQUN4QyxDQUFDO1FBQ0QsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FB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