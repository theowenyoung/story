export function debounce(fn, wait) {
    let timeout = null;
    let flush = null;
    const debounced = ((...args) => {
        debounced.clear();
        flush = () => {
            debounced.clear();
            fn.call(debounced, ...args);
        };
        timeout = setTimeout(flush, wait);
    });
    debounced.clear = () => {
        if (typeof timeout === "number") {
            clearTimeout(timeout);
            timeout = null;
            flush = null;
        }
    };
    debounced.flush = () => {
        flush?.();
    };
    Object.defineProperty(debounced, "pending", {
        get: () => typeof timeout === "number",
    });
    return debounced;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVib3VuY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkZWJvdW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUF5Q0EsTUFBTSxVQUFVLFFBQVEsQ0FDdEIsRUFBb0QsRUFDcEQsSUFBWTtJQUVaLElBQUksT0FBTyxHQUFrQixJQUFJLENBQUM7SUFDbEMsSUFBSSxLQUFLLEdBQXdCLElBQUksQ0FBQztJQUV0QyxNQUFNLFNBQVMsR0FBeUIsQ0FBQyxDQUFDLEdBQUcsSUFBTyxFQUFRLEVBQUU7UUFDNUQsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2xCLEtBQUssR0FBRyxHQUFTLEVBQUU7WUFDakIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2xCLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDOUIsQ0FBQyxDQUFDO1FBQ0YsT0FBTyxHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUF5QixDQUFDO0lBRTNCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsR0FBUyxFQUFFO1FBQzNCLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFO1lBQy9CLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0QixPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ2YsS0FBSyxHQUFHLElBQUksQ0FBQztTQUNkO0lBQ0gsQ0FBQyxDQUFDO0lBRUYsU0FBUyxDQUFDLEtBQUssR0FBRyxHQUFTLEVBQUU7UUFDM0IsS0FBSyxFQUFFLEVBQUUsQ0FBQztJQUNaLENBQUMsQ0FBQztJQUVGLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUMxQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxPQUFPLEtBQUssUUFBUTtLQUN2QyxDQUFDLENBQUM7SUFFSCxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqXG4gKiBBIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZGVsYXllZCBieSBhIGdpdmVuIGB3YWl0YFxuICogdGltZSBpbiBtaWxsaXNlY29uZHMuIElmIHRoZSBtZXRob2QgaXMgY2FsbGVkIGFnYWluIGJlZm9yZVxuICogdGhlIHRpbWVvdXQgZXhwaXJlcywgdGhlIHByZXZpb3VzIGNhbGwgd2lsbCBiZSBhYm9ydGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERlYm91bmNlZEZ1bmN0aW9uPFQgZXh0ZW5kcyBBcnJheTx1bmtub3duPj4ge1xuICAoLi4uYXJnczogVCk6IHZvaWQ7XG4gIC8qKiBDbGVhcnMgdGhlIGRlYm91bmNlIHRpbWVvdXQgYW5kIG9taXRzIGNhbGxpbmcgdGhlIGRlYm91bmNlZCBmdW5jdGlvbi4gKi9cbiAgY2xlYXIoKTogdm9pZDtcbiAgLyoqIENsZWFycyB0aGUgZGVib3VuY2UgdGltZW91dCBhbmQgY2FsbHMgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpbW1lZGlhdGVseS4gKi9cbiAgZmx1c2goKTogdm9pZDtcbiAgLyoqIFJldHVybnMgYSBib29sZWFuIHdldGhlciBhIGRlYm91bmNlIGNhbGwgaXMgcGVuZGluZyBvciBub3QuICovXG4gIHJlYWRvbmx5IHBlbmRpbmc6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyB0aGUgZ2l2ZW4gYGZ1bmNgXG4gKiBieSBhIGdpdmVuIGB3YWl0YCB0aW1lIGluIG1pbGxpc2Vjb25kcy4gSWYgdGhlIG1ldGhvZCBpcyBjYWxsZWRcbiAqIGFnYWluIGJlZm9yZSB0aGUgdGltZW91dCBleHBpcmVzLCB0aGUgcHJldmlvdXMgY2FsbCB3aWxsIGJlXG4gKiBhYm9ydGVkLlxuICpcbiAqIGBgYFxuICogaW1wb3J0IHsgZGVib3VuY2UgfSBmcm9tIFwiLi9kZWJvdW5jZS50c1wiO1xuICpcbiAqIGNvbnN0IGxvZyA9IGRlYm91bmNlKFxuICogICAoZXZlbnQ6IERlbm8uRnNFdmVudCkgPT5cbiAqICAgICBjb25zb2xlLmxvZyhcIlslc10gJXNcIiwgZXZlbnQua2luZCwgZXZlbnQucGF0aHNbMF0pLFxuICogICAyMDAsXG4gKiApO1xuICpcbiAqIGZvciBhd2FpdCAoY29uc3QgZXZlbnQgb2YgRGVuby53YXRjaEZzKFwiLi9cIikpIHtcbiAqICAgbG9nKGV2ZW50KTtcbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBmbiAgICBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gKiBAcGFyYW0gd2FpdCAgVGhlIHRpbWUgaW4gbWlsbGlzZWNvbmRzIHRvIGRlbGF5IHRoZSBmdW5jdGlvbi5cbiAqL1xuLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbmV4cG9ydCBmdW5jdGlvbiBkZWJvdW5jZTxUIGV4dGVuZHMgQXJyYXk8YW55Pj4oXG4gIGZuOiAodGhpczogRGVib3VuY2VkRnVuY3Rpb248VD4sIC4uLmFyZ3M6IFQpID0+IHZvaWQsXG4gIHdhaXQ6IG51bWJlcixcbik6IERlYm91bmNlZEZ1bmN0aW9uPFQ+IHtcbiAgbGV0IHRpbWVvdXQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBsZXQgZmx1c2g6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0IGRlYm91bmNlZDogRGVib3VuY2VkRnVuY3Rpb248VD4gPSAoKC4uLmFyZ3M6IFQpOiB2b2lkID0+IHtcbiAgICBkZWJvdW5jZWQuY2xlYXIoKTtcbiAgICBmbHVzaCA9ICgpOiB2b2lkID0+IHtcbiAgICAgIGRlYm91bmNlZC5jbGVhcigpO1xuICAgICAgZm4uY2FsbChkZWJvdW5jZWQsIC4uLmFyZ3MpO1xuICAgIH07XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoZmx1c2gsIHdhaXQpO1xuICB9KSBhcyBEZWJvdW5jZWRGdW5jdGlvbjxUPjtcblxuICBkZWJvdW5jZWQuY2xlYXIgPSAoKTogdm9pZCA9PiB7XG4gICAgaWYgKHR5cGVvZiB0aW1lb3V0ID09PSBcIm51bWJlclwiKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIGZsdXNoID0gbnVsbDtcbiAgICB9XG4gIH07XG5cbiAgZGVib3VuY2VkLmZsdXNoID0gKCk6IHZvaWQgPT4ge1xuICAgIGZsdXNoPy4oKTtcbiAgfTtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZGVib3VuY2VkLCBcInBlbmRpbmdcIiwge1xuICAgIGdldDogKCkgPT4gdHlwZW9mIHRpbWVvdXQgPT09IFwibnVtYmVyXCIsXG4gIH0pO1xuXG4gIHJldHVybiBkZWJvdW5jZWQ7XG59XG4iXX0=