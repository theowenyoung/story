// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
/**
 * pooledMap transforms values from an (async) iterable into another async
 * iterable. The transforms are done concurrently, with a max concurrency
 * defined by the poolLimit.
 *
 * If an error is thrown from `iterableFn`, no new transformations will begin.
 * All currently executing transformations are allowed to finish and still
 * yielded on success. After that, the rejections among them are gathered and
 * thrown by the iterator in an `AggregateError`.
 *
 * @param poolLimit The maximum count of items being processed concurrently.
 * @param array The input array for mapping.
 * @param iteratorFn The function to call for every item of the array.
 */ export function pooledMap(poolLimit, array, iteratorFn) {
    // Create the async iterable that is returned from this function.
    const res = new TransformStream({
        async transform (p, controller) {
            controller.enqueue(await p);
        }
    });
    // Start processing items from the iterator
    (async ()=>{
        const writer = res.writable.getWriter();
        const executing = [];
        try {
            for await (const item of array){
                const p = Promise.resolve().then(()=>iteratorFn(item));
                // Only write on success. If we `writer.write()` a rejected promise,
                // that will end the iteration. We don't want that yet. Instead let it
                // fail the race, taking us to the catch block where all currently
                // executing jobs are allowed to finish and all rejections among them
                // can be reported together.
                p.then((v)=>writer.write(Promise.resolve(v))).catch(()=>{});
                const e = p.then(()=>executing.splice(executing.indexOf(e), 1));
                executing.push(e);
                if (executing.length >= poolLimit) {
                    await Promise.race(executing);
                }
            }
            // Wait until all ongoing events have processed, then close the writer.
            await Promise.all(executing);
            writer.close();
        } catch  {
            const errors = [];
            for (const result of (await Promise.allSettled(executing))){
                if (result.status == "rejected") {
                    errors.push(result.reason);
                }
            }
            writer.write(Promise.reject(new AggregateError(errors, "Threw while mapping."))).catch(()=>{});
        }
    })();
    return res.readable[Symbol.asyncIterator]();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL2FzeW5jL3Bvb2wudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqXG4gKiBwb29sZWRNYXAgdHJhbnNmb3JtcyB2YWx1ZXMgZnJvbSBhbiAoYXN5bmMpIGl0ZXJhYmxlIGludG8gYW5vdGhlciBhc3luY1xuICogaXRlcmFibGUuIFRoZSB0cmFuc2Zvcm1zIGFyZSBkb25lIGNvbmN1cnJlbnRseSwgd2l0aCBhIG1heCBjb25jdXJyZW5jeVxuICogZGVmaW5lZCBieSB0aGUgcG9vbExpbWl0LlxuICpcbiAqIElmIGFuIGVycm9yIGlzIHRocm93biBmcm9tIGBpdGVyYWJsZUZuYCwgbm8gbmV3IHRyYW5zZm9ybWF0aW9ucyB3aWxsIGJlZ2luLlxuICogQWxsIGN1cnJlbnRseSBleGVjdXRpbmcgdHJhbnNmb3JtYXRpb25zIGFyZSBhbGxvd2VkIHRvIGZpbmlzaCBhbmQgc3RpbGxcbiAqIHlpZWxkZWQgb24gc3VjY2Vzcy4gQWZ0ZXIgdGhhdCwgdGhlIHJlamVjdGlvbnMgYW1vbmcgdGhlbSBhcmUgZ2F0aGVyZWQgYW5kXG4gKiB0aHJvd24gYnkgdGhlIGl0ZXJhdG9yIGluIGFuIGBBZ2dyZWdhdGVFcnJvcmAuXG4gKlxuICogQHBhcmFtIHBvb2xMaW1pdCBUaGUgbWF4aW11bSBjb3VudCBvZiBpdGVtcyBiZWluZyBwcm9jZXNzZWQgY29uY3VycmVudGx5LlxuICogQHBhcmFtIGFycmF5IFRoZSBpbnB1dCBhcnJheSBmb3IgbWFwcGluZy5cbiAqIEBwYXJhbSBpdGVyYXRvckZuIFRoZSBmdW5jdGlvbiB0byBjYWxsIGZvciBldmVyeSBpdGVtIG9mIHRoZSBhcnJheS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvb2xlZE1hcDxULCBSPihcbiAgcG9vbExpbWl0OiBudW1iZXIsXG4gIGFycmF5OiBJdGVyYWJsZTxUPiB8IEFzeW5jSXRlcmFibGU8VD4sXG4gIGl0ZXJhdG9yRm46IChkYXRhOiBUKSA9PiBQcm9taXNlPFI+LFxuKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgLy8gQ3JlYXRlIHRoZSBhc3luYyBpdGVyYWJsZSB0aGF0IGlzIHJldHVybmVkIGZyb20gdGhpcyBmdW5jdGlvbi5cbiAgY29uc3QgcmVzID0gbmV3IFRyYW5zZm9ybVN0cmVhbTxQcm9taXNlPFI+LCBSPih7XG4gICAgYXN5bmMgdHJhbnNmb3JtKFxuICAgICAgcDogUHJvbWlzZTxSPixcbiAgICAgIGNvbnRyb2xsZXI6IFRyYW5zZm9ybVN0cmVhbURlZmF1bHRDb250cm9sbGVyPFI+LFxuICAgICkge1xuICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGF3YWl0IHApO1xuICAgIH0sXG4gIH0pO1xuICAvLyBTdGFydCBwcm9jZXNzaW5nIGl0ZW1zIGZyb20gdGhlIGl0ZXJhdG9yXG4gIChhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgd3JpdGVyID0gcmVzLndyaXRhYmxlLmdldFdyaXRlcigpO1xuICAgIGNvbnN0IGV4ZWN1dGluZzogQXJyYXk8UHJvbWlzZTx1bmtub3duPj4gPSBbXTtcbiAgICB0cnkge1xuICAgICAgZm9yIGF3YWl0IChjb25zdCBpdGVtIG9mIGFycmF5KSB7XG4gICAgICAgIGNvbnN0IHAgPSBQcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IGl0ZXJhdG9yRm4oaXRlbSkpO1xuICAgICAgICAvLyBPbmx5IHdyaXRlIG9uIHN1Y2Nlc3MuIElmIHdlIGB3cml0ZXIud3JpdGUoKWAgYSByZWplY3RlZCBwcm9taXNlLFxuICAgICAgICAvLyB0aGF0IHdpbGwgZW5kIHRoZSBpdGVyYXRpb24uIFdlIGRvbid0IHdhbnQgdGhhdCB5ZXQuIEluc3RlYWQgbGV0IGl0XG4gICAgICAgIC8vIGZhaWwgdGhlIHJhY2UsIHRha2luZyB1cyB0byB0aGUgY2F0Y2ggYmxvY2sgd2hlcmUgYWxsIGN1cnJlbnRseVxuICAgICAgICAvLyBleGVjdXRpbmcgam9icyBhcmUgYWxsb3dlZCB0byBmaW5pc2ggYW5kIGFsbCByZWplY3Rpb25zIGFtb25nIHRoZW1cbiAgICAgICAgLy8gY2FuIGJlIHJlcG9ydGVkIHRvZ2V0aGVyLlxuICAgICAgICBwLnRoZW4oKHYpID0+IHdyaXRlci53cml0ZShQcm9taXNlLnJlc29sdmUodikpKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgIGNvbnN0IGU6IFByb21pc2U8dW5rbm93bj4gPSBwLnRoZW4oKCkgPT5cbiAgICAgICAgICBleGVjdXRpbmcuc3BsaWNlKGV4ZWN1dGluZy5pbmRleE9mKGUpLCAxKVxuICAgICAgICApO1xuICAgICAgICBleGVjdXRpbmcucHVzaChlKTtcbiAgICAgICAgaWYgKGV4ZWN1dGluZy5sZW5ndGggPj0gcG9vbExpbWl0KSB7XG4gICAgICAgICAgYXdhaXQgUHJvbWlzZS5yYWNlKGV4ZWN1dGluZyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIFdhaXQgdW50aWwgYWxsIG9uZ29pbmcgZXZlbnRzIGhhdmUgcHJvY2Vzc2VkLCB0aGVuIGNsb3NlIHRoZSB3cml0ZXIuXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChleGVjdXRpbmcpO1xuICAgICAgd3JpdGVyLmNsb3NlKCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChleGVjdXRpbmcpKSB7XG4gICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09IFwicmVqZWN0ZWRcIikge1xuICAgICAgICAgIGVycm9ycy5wdXNoKHJlc3VsdC5yZWFzb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB3cml0ZXIud3JpdGUoUHJvbWlzZS5yZWplY3QoXG4gICAgICAgIG5ldyBBZ2dyZWdhdGVFcnJvcihlcnJvcnMsIFwiVGhyZXcgd2hpbGUgbWFwcGluZy5cIiksXG4gICAgICApKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgfVxuICB9KSgpO1xuICByZXR1cm4gcmVzLnJlYWRhYmxlW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUUxRTs7Ozs7Ozs7Ozs7OztDQWFDLEdBQ0QsT0FBTyxTQUFTLFNBQVMsQ0FDdkIsU0FBaUIsRUFDakIsS0FBcUMsRUFDckMsVUFBbUMsRUFDVDtJQUMxQixpRUFBaUU7SUFDakUsTUFBTSxHQUFHLEdBQUcsSUFBSSxlQUFlLENBQWdCO1FBQzdDLE1BQU0sU0FBUyxFQUNiLENBQWEsRUFDYixVQUErQyxFQUMvQztZQUNBLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUM5QixDQUFDO0tBQ0YsQ0FBQyxBQUFDO0lBQ0gsMkNBQTJDO0lBQzNDLENBQUMsVUFBWTtRQUNYLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLEFBQUM7UUFDeEMsTUFBTSxTQUFTLEdBQTRCLEVBQUUsQUFBQztRQUM5QyxJQUFJO1lBQ0YsV0FBVyxNQUFNLElBQUksSUFBSSxLQUFLLENBQUU7Z0JBQzlCLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBTSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQUFBQztnQkFDekQsb0VBQW9FO2dCQUNwRSxzRUFBc0U7Z0JBQ3RFLGtFQUFrRTtnQkFDbEUscUVBQXFFO2dCQUNyRSw0QkFBNEI7Z0JBQzVCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRSxNQUFNLENBQUMsR0FBcUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUNqQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQzFDLEFBQUM7Z0JBQ0YsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbEIsSUFBSSxTQUFTLENBQUMsTUFBTSxJQUFJLFNBQVMsRUFBRTtvQkFDakMsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNoQyxDQUFDO1lBQ0gsQ0FBQztZQUNELHVFQUF1RTtZQUN2RSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0IsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2pCLEVBQUUsT0FBTTtZQUNOLE1BQU0sTUFBTSxHQUFHLEVBQUUsQUFBQztZQUNsQixLQUFLLE1BQU0sTUFBTSxJQUFJLENBQUEsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBLENBQUU7Z0JBQ3hELElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxVQUFVLEVBQUU7b0JBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM3QixDQUFDO1lBQ0gsQ0FBQztZQUNELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FDekIsSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFLHNCQUFzQixDQUFDLENBQ25ELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLENBQUM7SUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ0wsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO0FBQzlDLENBQUMifQ==