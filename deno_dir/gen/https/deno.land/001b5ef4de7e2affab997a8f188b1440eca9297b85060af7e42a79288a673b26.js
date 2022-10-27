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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvbWFyay1zb3VyY2UtaXRlbXMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCIuL2ludGVybmFsLWludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgU291cmNlT3B0aW9ucyB9IGZyb20gXCIuL2ludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgZ2V0U291cmNlSXRlbVVuaXF1ZUtleSB9IGZyb20gXCIuL2dldC1zb3VyY2UtaXRlbXMtZnJvbS1yZXN1bHQudHNcIjtcbmltcG9ydCB7IGlzT2JqZWN0IH0gZnJvbSBcIi4vdXRpbHMvb2JqZWN0LnRzXCI7XG5leHBvcnQgZnVuY3Rpb24gbWFya1NvdXJjZUl0ZW1zKFxuICBjdHg6IENvbnRleHQsXG4gIHNvdXJjZU9wdGlvbnM6IFNvdXJjZU9wdGlvbnMsXG4pOiBDb250ZXh0IHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoY3R4LnB1YmxpYy5pdGVtcykpIHtcbiAgICBjdHgucHVibGljLml0ZW1zID0gY3R4LnB1YmxpYy5pdGVtcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgIGNvbnN0IGtleSA9IGdldFNvdXJjZUl0ZW1VbmlxdWVLZXkoXG4gICAgICAgIGl0ZW0sXG4gICAgICAgIGN0eC5wdWJsaWMuc291cmNlSW5kZXghLFxuICAgICAgICBzb3VyY2VPcHRpb25zLFxuICAgICAgKTtcbiAgICAgIGlmIChpc09iamVjdChpdGVtKSkge1xuICAgICAgICAvLyBBZGQgc291cmNlIGluZGV4IGFuZCBpdGVtIGtleSB0byBpdGVtXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpdGVtLCBcIkBkZW5vZmxvd0tleVwiLCB7XG4gICAgICAgICAgdmFsdWU6IGtleSxcbiAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoaXRlbSwgXCJAZGVub2Zsb3dTb3VyY2VJbmRleFwiLCB7XG4gICAgICAgICAgdmFsdWU6IGN0eC5wdWJsaWMuc291cmNlSW5kZXghLFxuICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpdGVtO1xuICAgIH0pO1xuICAgIGN0eC5wdWJsaWMucmVzdWx0ID0gY3R4LnB1YmxpYy5pdGVtcztcbiAgfVxuICByZXR1cm4gY3R4O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLFNBQVMsc0JBQXNCLFFBQVEsb0NBQW9DO0FBQzNFLFNBQVMsUUFBUSxRQUFRLG9CQUFvQjtBQUM3QyxPQUFPLFNBQVMsZ0JBQ2QsR0FBWSxFQUNaLGFBQTRCLEVBQ25CO0lBQ1QsSUFBSSxNQUFNLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEdBQUc7UUFDbkMsSUFBSSxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFTO1lBQ2hELE1BQU0sTUFBTSx1QkFDVixNQUNBLElBQUksTUFBTSxDQUFDLFdBQVcsRUFDdEI7WUFFRixJQUFJLFNBQVMsT0FBTztnQkFDbEIsd0NBQXdDO2dCQUN4QyxPQUFPLGNBQWMsQ0FBQyxNQUFNLGdCQUFnQjtvQkFDMUMsT0FBTztvQkFDUCxZQUFZLEtBQUs7b0JBQ2pCLFVBQVUsS0FBSztnQkFDakI7Z0JBQ0EsT0FBTyxjQUFjLENBQUMsTUFBTSx3QkFBd0I7b0JBQ2xELE9BQU8sSUFBSSxNQUFNLENBQUMsV0FBVztvQkFDN0IsWUFBWSxLQUFLO29CQUNqQixVQUFVLEtBQUs7Z0JBQ2pCO1lBQ0YsQ0FBQztZQUVELE9BQU87UUFDVDtRQUNBLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxLQUFLO0lBQ3RDLENBQUM7SUFDRCxPQUFPO0FBQ1QsQ0FBQyJ9