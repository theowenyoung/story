import { getSourceItemUniqueKey } from "./get-source-items-from-result.ts";
import { isObject } from "./utils/object.ts";
export function markSourceItems(ctx, sourceOptions) {
    if (Array.isArray(ctx.public.items)) {
        ctx.public.items = ctx.public.items.map((item)=>{
            const key = getSourceItemUniqueKey(item, ctx.public.sourceIndex, sourceOptions);
            if (isObject(item)) {
                // Add source index and item key to item
                Object.defineProperty(item, "@denoflowKey", {
                    value: key,
                    enumerable: false,
                    writable: false
                });
                Object.defineProperty(item, "@denoflowSourceIndex", {
                    value: ctx.public.sourceIndex,
                    enumerable: false,
                    writable: false
                });
            }
            return item;
        });
        ctx.public.result = ctx.public.items;
    }
    return ctx;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvbWFyay1zb3VyY2UtaXRlbXMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCIuL2ludGVybmFsLWludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgU291cmNlT3B0aW9ucyB9IGZyb20gXCIuL2ludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgZ2V0U291cmNlSXRlbVVuaXF1ZUtleSB9IGZyb20gXCIuL2dldC1zb3VyY2UtaXRlbXMtZnJvbS1yZXN1bHQudHNcIjtcbmltcG9ydCB7IGlzT2JqZWN0IH0gZnJvbSBcIi4vdXRpbHMvb2JqZWN0LnRzXCI7XG5leHBvcnQgZnVuY3Rpb24gbWFya1NvdXJjZUl0ZW1zKFxuICBjdHg6IENvbnRleHQsXG4gIHNvdXJjZU9wdGlvbnM6IFNvdXJjZU9wdGlvbnMsXG4pOiBDb250ZXh0IHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoY3R4LnB1YmxpYy5pdGVtcykpIHtcbiAgICBjdHgucHVibGljLml0ZW1zID0gY3R4LnB1YmxpYy5pdGVtcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgIGNvbnN0IGtleSA9IGdldFNvdXJjZUl0ZW1VbmlxdWVLZXkoXG4gICAgICAgIGl0ZW0sXG4gICAgICAgIGN0eC5wdWJsaWMuc291cmNlSW5kZXghLFxuICAgICAgICBzb3VyY2VPcHRpb25zLFxuICAgICAgKTtcbiAgICAgIGlmIChpc09iamVjdChpdGVtKSkge1xuICAgICAgICAvLyBBZGQgc291cmNlIGluZGV4IGFuZCBpdGVtIGtleSB0byBpdGVtXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpdGVtLCBcIkBkZW5vZmxvd0tleVwiLCB7XG4gICAgICAgICAgdmFsdWU6IGtleSxcbiAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoaXRlbSwgXCJAZGVub2Zsb3dTb3VyY2VJbmRleFwiLCB7XG4gICAgICAgICAgdmFsdWU6IGN0eC5wdWJsaWMuc291cmNlSW5kZXghLFxuICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpdGVtO1xuICAgIH0pO1xuICAgIGN0eC5wdWJsaWMucmVzdWx0ID0gY3R4LnB1YmxpYy5pdGVtcztcbiAgfVxuICByZXR1cm4gY3R4O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLFNBQVMsc0JBQXNCLFFBQVEsbUNBQW1DLENBQUM7QUFDM0UsU0FBUyxRQUFRLFFBQVEsbUJBQW1CLENBQUM7QUFDN0MsT0FBTyxTQUFTLGVBQWUsQ0FDN0IsR0FBWSxFQUNaLGFBQTRCLEVBQ25CO0lBQ1QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDbkMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFLO1lBQ2hELE1BQU0sR0FBRyxHQUFHLHNCQUFzQixDQUNoQyxJQUFJLEVBQ0osR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQ3RCLGFBQWEsQ0FDZCxBQUFDO1lBQ0YsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xCLHdDQUF3QztnQkFDeEMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO29CQUMxQyxLQUFLLEVBQUUsR0FBRztvQkFDVixVQUFVLEVBQUUsS0FBSztvQkFDakIsUUFBUSxFQUFFLEtBQUs7aUJBQ2hCLENBQUMsQ0FBQztnQkFDSCxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtvQkFDbEQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVztvQkFDN0IsVUFBVSxFQUFFLEtBQUs7b0JBQ2pCLFFBQVEsRUFBRSxLQUFLO2lCQUNoQixDQUFDLENBQUM7YUFDSjtZQUVELE9BQU8sSUFBSSxDQUFDO1NBQ2IsQ0FBQyxDQUFDO1FBQ0gsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7S0FDdEM7SUFDRCxPQUFPLEdBQUcsQ0FBQztDQUNaIn0=