import { Empty } from "./rows.ts";
export class RowObjects {
    _rows;
    _columns;
    /**
   * RowObjects
   *
   * RowObjects represent a set of results 
   * from a query in the form of an object.
   * They are iterable and yield objects.
   *
   * This class is not exported from the module
   * and the only correct way to obtain a `RowObjects`
   * object is by making a database query
   * and using the `asObject()` method on the `Rows` result.
   */ constructor(rows){
        this._rows = rows;
        if (rows !== Empty) {
            this._columns = this._rows.columns();
        }
    }
    /**
   * RowObjects.return
   *
   * Implements the closing iterator
   * protocol. See also:
   * https://exploringjs.com/es6/ch_iteration.html#sec_closing-iterators
   */ return() {
        return this._rows.return();
    }
    /**
   * RowObjects.next
   *
   * Implements the iterator protocol.
   */ next() {
        const { value , done  } = this._rows.next();
        if (done) {
            return {
                value: value,
                done: true
            };
        }
        const rowAsObject = {};
        for(let i = 0; i < value.length; i++){
            rowAsObject[this._columns[i].name] = value[i];
        }
        return {
            value: rowAsObject,
            done: false
        };
    }
    [Symbol.iterator]() {
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvc3FsaXRlQHYyLjMuMi9zcmMvcm93X29iamVjdHMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29sdW1uTmFtZSwgRW1wdHksIFJvd3MgfSBmcm9tIFwiLi9yb3dzLnRzXCI7XG5cbmV4cG9ydCBjbGFzcyBSb3dPYmplY3RzPFQgZXh0ZW5kcyBhbnkgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PiB7XG4gIHByaXZhdGUgX3Jvd3M6IFJvd3M7XG4gIHByaXZhdGUgX2NvbHVtbnM/OiBDb2x1bW5OYW1lW107XG5cbiAgLyoqXG4gICAqIFJvd09iamVjdHNcbiAgICpcbiAgICogUm93T2JqZWN0cyByZXByZXNlbnQgYSBzZXQgb2YgcmVzdWx0cyBcbiAgICogZnJvbSBhIHF1ZXJ5IGluIHRoZSBmb3JtIG9mIGFuIG9iamVjdC5cbiAgICogVGhleSBhcmUgaXRlcmFibGUgYW5kIHlpZWxkIG9iamVjdHMuXG4gICAqXG4gICAqIFRoaXMgY2xhc3MgaXMgbm90IGV4cG9ydGVkIGZyb20gdGhlIG1vZHVsZVxuICAgKiBhbmQgdGhlIG9ubHkgY29ycmVjdCB3YXkgdG8gb2J0YWluIGEgYFJvd09iamVjdHNgXG4gICAqIG9iamVjdCBpcyBieSBtYWtpbmcgYSBkYXRhYmFzZSBxdWVyeVxuICAgKiBhbmQgdXNpbmcgdGhlIGBhc09iamVjdCgpYCBtZXRob2Qgb24gdGhlIGBSb3dzYCByZXN1bHQuXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihyb3dzOiBSb3dzKSB7XG4gICAgdGhpcy5fcm93cyA9IHJvd3M7XG5cbiAgICBpZiAocm93cyAhPT0gRW1wdHkpIHtcbiAgICAgIHRoaXMuX2NvbHVtbnMgPSB0aGlzLl9yb3dzLmNvbHVtbnMoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUm93T2JqZWN0cy5yZXR1cm5cbiAgICpcbiAgICogSW1wbGVtZW50cyB0aGUgY2xvc2luZyBpdGVyYXRvclxuICAgKiBwcm90b2NvbC4gU2VlIGFsc286XG4gICAqIGh0dHBzOi8vZXhwbG9yaW5nanMuY29tL2VzNi9jaF9pdGVyYXRpb24uaHRtbCNzZWNfY2xvc2luZy1pdGVyYXRvcnNcbiAgICovXG4gIHJldHVybigpOiBJdGVyYXRvclJlc3VsdDxUPiB7XG4gICAgcmV0dXJuIHRoaXMuX3Jvd3MucmV0dXJuKCk7XG4gIH1cblxuICAvKipcbiAgICogUm93T2JqZWN0cy5uZXh0XG4gICAqXG4gICAqIEltcGxlbWVudHMgdGhlIGl0ZXJhdG9yIHByb3RvY29sLlxuICAgKi9cbiAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxUPiB7XG4gICAgY29uc3QgeyB2YWx1ZSwgZG9uZSB9ID0gdGhpcy5fcm93cy5uZXh0KCk7XG4gICAgaWYgKGRvbmUpIHtcbiAgICAgIHJldHVybiB7IHZhbHVlOiB2YWx1ZSwgZG9uZTogdHJ1ZSB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJvd0FzT2JqZWN0OiBhbnkgPSB7fTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJvd0FzT2JqZWN0W3RoaXMuX2NvbHVtbnMhW2ldLm5hbWVdID0gdmFsdWVbaV07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdmFsdWU6IHJvd0FzT2JqZWN0LCBkb25lOiBmYWxzZSB9O1xuICB9XG5cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFxQixLQUFLLFFBQWMsV0FBVyxDQUFDO0FBRXBELE9BQU8sTUFBTSxVQUFVO0lBQ3JCLEFBQVEsS0FBSyxDQUFPO0lBQ3BCLEFBQVEsUUFBUSxDQUFnQjtJQUVoQzs7Ozs7Ozs7Ozs7S0FXRyxDQUNILFlBQVksSUFBVSxDQUFFO1FBQ3RCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBRWxCLElBQUksSUFBSSxLQUFLLEtBQUssRUFBRTtZQUNsQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDdEM7S0FDRjtJQUVEOzs7Ozs7S0FNRyxDQUNILE1BQU0sR0FBc0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQzVCO0lBRUQ7Ozs7S0FJRyxDQUNILElBQUksR0FBc0I7UUFDeEIsTUFBTSxFQUFFLEtBQUssQ0FBQSxFQUFFLElBQUksQ0FBQSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQUFBQztRQUMxQyxJQUFJLElBQUksRUFBRTtZQUNSLE9BQU87Z0JBQUUsS0FBSyxFQUFFLEtBQUs7Z0JBQUUsSUFBSSxFQUFFLElBQUk7YUFBRSxDQUFDO1NBQ3JDO1FBRUQsTUFBTSxXQUFXLEdBQVEsRUFBRSxBQUFDO1FBRTVCLElBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFFO1lBQ3JDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxBQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2hEO1FBRUQsT0FBTztZQUFFLEtBQUssRUFBRSxXQUFXO1lBQUUsSUFBSSxFQUFFLEtBQUs7U0FBRSxDQUFDO0tBQzVDO0lBRUQsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUc7UUFDbEIsT0FBTyxJQUFJLENBQUM7S0FDYjtDQUNGIn0=