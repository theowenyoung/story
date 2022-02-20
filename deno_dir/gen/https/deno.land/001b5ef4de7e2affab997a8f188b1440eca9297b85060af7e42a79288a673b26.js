import { getSourceItemUniqueKey } from "./get-source-items-from-result.ts";
import { isObject } from "./utils/object.ts";
export function markSourceItems(ctx, sourceOptions) {
    if (Array.isArray(ctx.public.items)) {
        ctx.public.items = ctx.public.items.map((item) => {
            const key = getSourceItemUniqueKey(item, ctx.public.sourceIndex, sourceOptions);
            if (isObject(item)) {
                Object.defineProperty(item, "@denoflowKey", {
                    value: key,
                    enumerable: false,
                    writable: false,
                });
                Object.defineProperty(item, "@denoflowSourceIndex", {
                    value: ctx.public.sourceIndex,
                    enumerable: false,
                    writable: false,
                });
            }
            return item;
        });
        ctx.public.result = ctx.public.items;
    }
    return ctx;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyay1zb3VyY2UtaXRlbXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXJrLXNvdXJjZS1pdGVtcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDN0MsTUFBTSxVQUFVLGVBQWUsQ0FDN0IsR0FBWSxFQUNaLGFBQTRCO0lBRTVCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ25DLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQy9DLE1BQU0sR0FBRyxHQUFHLHNCQUFzQixDQUNoQyxJQUFJLEVBQ0osR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFZLEVBQ3ZCLGFBQWEsQ0FDZCxDQUFDO1lBQ0YsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBRWxCLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtvQkFDMUMsS0FBSyxFQUFFLEdBQUc7b0JBQ1YsVUFBVSxFQUFFLEtBQUs7b0JBQ2pCLFFBQVEsRUFBRSxLQUFLO2lCQUNoQixDQUFDLENBQUM7Z0JBQ0gsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7b0JBQ2xELEtBQUssRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVk7b0JBQzlCLFVBQVUsRUFBRSxLQUFLO29CQUNqQixRQUFRLEVBQUUsS0FBSztpQkFDaEIsQ0FBQyxDQUFDO2FBQ0o7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0gsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7S0FDdEM7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb250ZXh0IH0gZnJvbSBcIi4vaW50ZXJuYWwtaW50ZXJmYWNlLnRzXCI7XG5pbXBvcnQgeyBTb3VyY2VPcHRpb25zIH0gZnJvbSBcIi4vaW50ZXJmYWNlLnRzXCI7XG5pbXBvcnQgeyBnZXRTb3VyY2VJdGVtVW5pcXVlS2V5IH0gZnJvbSBcIi4vZ2V0LXNvdXJjZS1pdGVtcy1mcm9tLXJlc3VsdC50c1wiO1xuaW1wb3J0IHsgaXNPYmplY3QgfSBmcm9tIFwiLi91dGlscy9vYmplY3QudHNcIjtcbmV4cG9ydCBmdW5jdGlvbiBtYXJrU291cmNlSXRlbXMoXG4gIGN0eDogQ29udGV4dCxcbiAgc291cmNlT3B0aW9uczogU291cmNlT3B0aW9ucyxcbik6IENvbnRleHQge1xuICBpZiAoQXJyYXkuaXNBcnJheShjdHgucHVibGljLml0ZW1zKSkge1xuICAgIGN0eC5wdWJsaWMuaXRlbXMgPSBjdHgucHVibGljLml0ZW1zLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgY29uc3Qga2V5ID0gZ2V0U291cmNlSXRlbVVuaXF1ZUtleShcbiAgICAgICAgaXRlbSxcbiAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VJbmRleCEsXG4gICAgICAgIHNvdXJjZU9wdGlvbnMsXG4gICAgICApO1xuICAgICAgaWYgKGlzT2JqZWN0KGl0ZW0pKSB7XG4gICAgICAgIC8vIEFkZCBzb3VyY2UgaW5kZXggYW5kIGl0ZW0ga2V5IHRvIGl0ZW1cbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGl0ZW0sIFwiQGRlbm9mbG93S2V5XCIsIHtcbiAgICAgICAgICB2YWx1ZToga2V5LFxuICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpdGVtLCBcIkBkZW5vZmxvd1NvdXJjZUluZGV4XCIsIHtcbiAgICAgICAgICB2YWx1ZTogY3R4LnB1YmxpYy5zb3VyY2VJbmRleCEsXG4gICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfSk7XG4gICAgY3R4LnB1YmxpYy5yZXN1bHQgPSBjdHgucHVibGljLml0ZW1zO1xuICB9XG4gIHJldHVybiBjdHg7XG59XG4iXX0=