// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { deferred } from "./deferred.ts";
/** The MuxAsyncIterator class multiplexes multiple async iterators into a
 * single stream. It currently makes an assumption:
 * - The final result (the value returned and not yielded from the iterator)
 *   does not matter; if there is any, it is discarded.
 */ export class MuxAsyncIterator {
    iteratorCount = 0;
    yields = [];
    // deno-lint-ignore no-explicit-any
    throws = [];
    signal = deferred();
    add(iterator) {
        ++this.iteratorCount;
        this.callIteratorNext(iterator);
    }
    async callIteratorNext(iterator) {
        try {
            const { value , done  } = await iterator.next();
            if (done) {
                --this.iteratorCount;
            } else {
                this.yields.push({
                    iterator,
                    value
                });
            }
        } catch (e) {
            this.throws.push(e);
        }
        this.signal.resolve();
    }
    async *iterate() {
        while(this.iteratorCount > 0){
            // Sleep until any of the wrapped iterators yields.
            await this.signal;
            // Note that while we're looping over `yields`, new items may be added.
            for(let i = 0; i < this.yields.length; i++){
                const { iterator , value  } = this.yields[i];
                yield value;
                this.callIteratorNext(iterator);
            }
            if (this.throws.length) {
                for (const e of this.throws){
                    throw e;
                }
                this.throws.length = 0;
            }
            // Clear the `yields` list and reset the `signal` promise.
            this.yields.length = 0;
            this.signal = deferred();
        }
    }
    [Symbol.asyncIterator]() {
        return this.iterate();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjg2LjAvYXN5bmMvbXV4X2FzeW5jX2l0ZXJhdG9yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5pbXBvcnQgeyBEZWZlcnJlZCwgZGVmZXJyZWQgfSBmcm9tIFwiLi9kZWZlcnJlZC50c1wiO1xuXG5pbnRlcmZhY2UgVGFnZ2VkWWllbGRlZFZhbHVlPFQ+IHtcbiAgaXRlcmF0b3I6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxUPjtcbiAgdmFsdWU6IFQ7XG59XG5cbi8qKiBUaGUgTXV4QXN5bmNJdGVyYXRvciBjbGFzcyBtdWx0aXBsZXhlcyBtdWx0aXBsZSBhc3luYyBpdGVyYXRvcnMgaW50byBhXG4gKiBzaW5nbGUgc3RyZWFtLiBJdCBjdXJyZW50bHkgbWFrZXMgYW4gYXNzdW1wdGlvbjpcbiAqIC0gVGhlIGZpbmFsIHJlc3VsdCAodGhlIHZhbHVlIHJldHVybmVkIGFuZCBub3QgeWllbGRlZCBmcm9tIHRoZSBpdGVyYXRvcilcbiAqICAgZG9lcyBub3QgbWF0dGVyOyBpZiB0aGVyZSBpcyBhbnksIGl0IGlzIGRpc2NhcmRlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIE11eEFzeW5jSXRlcmF0b3I8VD4gaW1wbGVtZW50cyBBc3luY0l0ZXJhYmxlPFQ+IHtcbiAgcHJpdmF0ZSBpdGVyYXRvckNvdW50ID0gMDtcbiAgcHJpdmF0ZSB5aWVsZHM6IEFycmF5PFRhZ2dlZFlpZWxkZWRWYWx1ZTxUPj4gPSBbXTtcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgcHJpdmF0ZSB0aHJvd3M6IGFueVtdID0gW107XG4gIHByaXZhdGUgc2lnbmFsOiBEZWZlcnJlZDx2b2lkPiA9IGRlZmVycmVkKCk7XG5cbiAgYWRkKGl0ZXJhdG9yOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VD4pOiB2b2lkIHtcbiAgICArK3RoaXMuaXRlcmF0b3JDb3VudDtcbiAgICB0aGlzLmNhbGxJdGVyYXRvck5leHQoaXRlcmF0b3IpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjYWxsSXRlcmF0b3JOZXh0KFxuICAgIGl0ZXJhdG9yOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8VD4sXG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IHZhbHVlLCBkb25lIH0gPSBhd2FpdCBpdGVyYXRvci5uZXh0KCk7XG4gICAgICBpZiAoZG9uZSkge1xuICAgICAgICAtLXRoaXMuaXRlcmF0b3JDb3VudDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMueWllbGRzLnB1c2goeyBpdGVyYXRvciwgdmFsdWUgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy50aHJvd3MucHVzaChlKTtcbiAgICB9XG4gICAgdGhpcy5zaWduYWwucmVzb2x2ZSgpO1xuICB9XG5cbiAgYXN5bmMgKml0ZXJhdGUoKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICB3aGlsZSAodGhpcy5pdGVyYXRvckNvdW50ID4gMCkge1xuICAgICAgLy8gU2xlZXAgdW50aWwgYW55IG9mIHRoZSB3cmFwcGVkIGl0ZXJhdG9ycyB5aWVsZHMuXG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbDtcblxuICAgICAgLy8gTm90ZSB0aGF0IHdoaWxlIHdlJ3JlIGxvb3Bpbmcgb3ZlciBgeWllbGRzYCwgbmV3IGl0ZW1zIG1heSBiZSBhZGRlZC5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy55aWVsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgeyBpdGVyYXRvciwgdmFsdWUgfSA9IHRoaXMueWllbGRzW2ldO1xuICAgICAgICB5aWVsZCB2YWx1ZTtcbiAgICAgICAgdGhpcy5jYWxsSXRlcmF0b3JOZXh0KGl0ZXJhdG9yKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMudGhyb3dzLmxlbmd0aCkge1xuICAgICAgICBmb3IgKGNvbnN0IGUgb2YgdGhpcy50aHJvd3MpIHtcbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGhyb3dzLmxlbmd0aCA9IDA7XG4gICAgICB9XG4gICAgICAvLyBDbGVhciB0aGUgYHlpZWxkc2AgbGlzdCBhbmQgcmVzZXQgdGhlIGBzaWduYWxgIHByb21pc2UuXG4gICAgICB0aGlzLnlpZWxkcy5sZW5ndGggPSAwO1xuICAgICAgdGhpcy5zaWduYWwgPSBkZWZlcnJlZCgpO1xuICAgIH1cbiAgfVxuXG4gIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICByZXR1cm4gdGhpcy5pdGVyYXRlKCk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUsU0FBbUIsUUFBUSxRQUFRLGVBQWUsQ0FBQztBQU9uRDs7OztDQUlDLEdBQ0QsT0FBTyxNQUFNLGdCQUFnQjtJQUMzQixBQUFRLGFBQWEsR0FBRyxDQUFDLENBQUM7SUFDMUIsQUFBUSxNQUFNLEdBQWlDLEVBQUUsQ0FBQztJQUNsRCxtQ0FBbUM7SUFDbkMsQUFBUSxNQUFNLEdBQVUsRUFBRSxDQUFDO0lBQzNCLEFBQVEsTUFBTSxHQUFtQixRQUFRLEVBQUUsQ0FBQztJQUU1QyxHQUFHLENBQUMsUUFBa0MsRUFBUTtRQUM1QyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUM7UUFDckIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xDO1VBRWMsZ0JBQWdCLENBQzVCLFFBQWtDLEVBQ25CO1FBQ2YsSUFBSTtZQUNGLE1BQU0sRUFBRSxLQUFLLENBQUEsRUFBRSxJQUFJLENBQUEsRUFBRSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksRUFBRSxBQUFDO1lBQzlDLElBQUksSUFBSSxFQUFFO2dCQUNSLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQztZQUN2QixPQUFPO2dCQUNMLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUFFLFFBQVE7b0JBQUUsS0FBSztpQkFBRSxDQUFDLENBQUM7WUFDeEMsQ0FBQztRQUNILEVBQUUsT0FBTyxDQUFDLEVBQUU7WUFDVixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN4QjtXQUVPLE9BQU8sR0FBNkI7UUFDekMsTUFBTyxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBRTtZQUM3QixtREFBbUQ7WUFDbkQsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDO1lBRWxCLHVFQUF1RTtZQUN2RSxJQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUU7Z0JBQzNDLE1BQU0sRUFBRSxRQUFRLENBQUEsRUFBRSxLQUFLLENBQUEsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEFBQUM7Z0JBQzNDLE1BQU0sS0FBSyxDQUFDO2dCQUNaLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsQyxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtnQkFDdEIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFFO29CQUMzQixNQUFNLENBQUMsQ0FBQztnQkFDVixDQUFDO2dCQUNELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUN6QixDQUFDO1lBQ0QsMERBQTBEO1lBQzFELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUN2QixJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsRUFBRSxDQUFDO1FBQzNCLENBQUM7SUFDSDtJQUVBLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUE2QjtRQUNqRCxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN4QjtDQUNEIn0=