import { get } from "./utils/get.ts";
export function getSourceItemUniqueKey(item, sourceIndex, sourceOptions) {
    const defaultKeysFields = [
        "id",
        "guid",
        "_id",
        "objectId",
        "objectID",
        "ID",
        "url",
        "link", 
    ];
    const keyFields = sourceOptions.key ? [
        sourceOptions.key
    ].concat(defaultKeysFields) : defaultKeysFields;
    // unique key
    let itemKey;
    for(let keyFieldIndex = 0; keyFieldIndex < keyFields.length; keyFieldIndex++){
        const keyField = keyFields[keyFieldIndex];
        itemKey = get(item, keyField);
        if (typeof itemKey === "string") {
            break;
        }
    }
    const sourcePrefix = sourceOptions.id || sourceIndex;
    if (itemKey) {
        return `${sourcePrefix}${itemKey}`;
    } else {
        return undefined;
    }
}
export function getSourceItemsFromResult(ctx, sourceOptions) {
    const { reporter  } = sourceOptions;
    // format
    const force = sourceOptions?.force;
    // get items path, get deduplication key
    let items = ctx.public.result;
    if (sourceOptions.itemsPath) {
        items = get(ctx.public.result, sourceOptions.itemsPath);
    }
    if (!Array.isArray(items)) {
        throw new Error("source result must be an array, but got " + typeof items);
    }
    // reverse source items
    if (sourceOptions?.reverse) {
        items = items.reverse();
    }
    // limit source items
    // filter limit
    const limit = sourceOptions?.limit;
    if (limit !== undefined && items.length > limit) {
        items = items.slice(0, limit);
    }
    const finalItems = [];
    for(let itemIndex = 0; itemIndex < items.length; itemIndex++){
        // reach max items
        const item = items[itemIndex];
        const key = getSourceItemUniqueKey(item, ctx.public.sourceIndex, sourceOptions);
        if (key === undefined) {
            reporter.warning(`will be directly added to items`, "No unique key");
        }
        if (key !== undefined && ctx.internalState && (ctx.internalState.keys || []).includes(key) && !force) {
            reporter.debug(`${key}, cause it has been processed`, "Skip item");
            continue;
        } else if (key !== undefined && ctx.internalState && (ctx.internalState.keys || []).includes(key) && force) {
            reporter.debug(`${key}, cause --force is true`, "Add processed item");
        } else if (force) {
            reporter.debug(`${key}`, "add item");
        }
        finalItems.push(item);
    }
    // save current key to db
    ctx.public.items = finalItems;
    ctx.public.result = finalItems;
    return ctx;
}
export function filterCtxItems(ctx, filterOptions) {
    const { reporter  } = filterOptions;
    // format
    const limit = filterOptions?.limit;
    // get items path, get deduplication key
    const items = ctx.public.items;
    if (!Array.isArray(items)) {
        throw new Error("ctx.items must be an array, but got " + typeof items + ", filter failed");
    }
    reporter.debug(`Input ${items.length} items`);
    const finalItems = [];
    for(let i = 0; i < items.length; i++){
        // reach max items
        if (limit !== undefined && limit > 0 && finalItems.length >= limit) {
            break;
        }
        const item = items[i];
        finalItems.push(item);
    }
    // save current key to db
    ctx.public.items = finalItems;
    reporter.debug(`Output ${ctx.public.items.length} items`);
    return ctx;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvZ2V0LXNvdXJjZS1pdGVtcy1mcm9tLXJlc3VsdC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBGaWx0ZXJPcHRpb25zLCBTb3VyY2VPcHRpb25zIH0gZnJvbSBcIi4vaW50ZXJmYWNlLnRzXCI7XG5pbXBvcnQgeyBnZXQgfSBmcm9tIFwiLi91dGlscy9nZXQudHNcIjtcbmltcG9ydCB7IGxvZyB9IGZyb20gXCIuLi9kZXBzLnRzXCI7XG5pbXBvcnQgeyBDb250ZXh0IH0gZnJvbSBcIi4vaW50ZXJuYWwtaW50ZXJmYWNlLnRzXCI7XG5pbnRlcmZhY2UgRmlsdGVyVHJpZ2dlck9wdGlvbiBleHRlbmRzIEZpbHRlck9wdGlvbnMge1xuICByZXBvcnRlcjogbG9nLkxvZ2dlcjtcbn1cbmludGVyZmFjZSBTb3VyY2VUcmlnZ2VyT3B0aW9uIGV4dGVuZHMgU291cmNlT3B0aW9ucyB7XG4gIHJlcG9ydGVyOiBsb2cuTG9nZ2VyO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldFNvdXJjZUl0ZW1VbmlxdWVLZXkoXG4gIGl0ZW06IHVua25vd24sXG4gIHNvdXJjZUluZGV4OiBudW1iZXIsXG4gIHNvdXJjZU9wdGlvbnM6IFNvdXJjZU9wdGlvbnMsXG4pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCBkZWZhdWx0S2V5c0ZpZWxkcyA9IFtcbiAgICBcImlkXCIsXG4gICAgXCJndWlkXCIsXG4gICAgXCJfaWRcIixcbiAgICBcIm9iamVjdElkXCIsXG4gICAgXCJvYmplY3RJRFwiLFxuICAgIFwiSURcIixcbiAgICBcInVybFwiLFxuICAgIFwibGlua1wiLFxuICBdO1xuICBjb25zdCBrZXlGaWVsZHMgPSBzb3VyY2VPcHRpb25zLmtleVxuICAgID8gW3NvdXJjZU9wdGlvbnMua2V5XS5jb25jYXQoZGVmYXVsdEtleXNGaWVsZHMpXG4gICAgOiBkZWZhdWx0S2V5c0ZpZWxkcztcbiAgLy8gdW5pcXVlIGtleVxuICBsZXQgaXRlbUtleTtcbiAgZm9yIChcbiAgICBsZXQga2V5RmllbGRJbmRleCA9IDA7XG4gICAga2V5RmllbGRJbmRleCA8IGtleUZpZWxkcy5sZW5ndGg7XG4gICAga2V5RmllbGRJbmRleCsrXG4gICkge1xuICAgIGNvbnN0IGtleUZpZWxkID0ga2V5RmllbGRzW2tleUZpZWxkSW5kZXhdO1xuICAgIGl0ZW1LZXkgPSBnZXQoaXRlbSwga2V5RmllbGQpO1xuICAgIGlmICh0eXBlb2YgaXRlbUtleSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIGNvbnN0IHNvdXJjZVByZWZpeCA9IHNvdXJjZU9wdGlvbnMuaWQgfHwgc291cmNlSW5kZXg7XG4gIGlmIChpdGVtS2V5KSB7XG4gICAgcmV0dXJuIGAke3NvdXJjZVByZWZpeH0ke2l0ZW1LZXl9YDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0U291cmNlSXRlbXNGcm9tUmVzdWx0KFxuICBjdHg6IENvbnRleHQsXG4gIHNvdXJjZU9wdGlvbnM6IFNvdXJjZVRyaWdnZXJPcHRpb24sXG4pOiBDb250ZXh0IHtcbiAgY29uc3QgeyByZXBvcnRlciB9ID0gc291cmNlT3B0aW9ucztcbiAgLy8gZm9ybWF0XG4gIGNvbnN0IGZvcmNlID0gc291cmNlT3B0aW9ucz8uZm9yY2U7XG5cbiAgLy8gZ2V0IGl0ZW1zIHBhdGgsIGdldCBkZWR1cGxpY2F0aW9uIGtleVxuICBsZXQgaXRlbXM6IHVua25vd25bXSA9IGN0eC5wdWJsaWMucmVzdWx0IGFzIHVua25vd25bXTtcblxuICBpZiAoc291cmNlT3B0aW9ucy5pdGVtc1BhdGgpIHtcbiAgICBpdGVtcyA9IGdldChcbiAgICAgIGN0eC5wdWJsaWMucmVzdWx0IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICAgICAgc291cmNlT3B0aW9ucy5pdGVtc1BhdGgsXG4gICAgKSBhcyB1bmtub3duW107XG4gIH1cblxuICBpZiAoIUFycmF5LmlzQXJyYXkoaXRlbXMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwic291cmNlIHJlc3VsdCBtdXN0IGJlIGFuIGFycmF5LCBidXQgZ290IFwiICsgdHlwZW9mIGl0ZW1zKTtcbiAgfVxuXG4gIC8vIHJldmVyc2Ugc291cmNlIGl0ZW1zXG4gIGlmIChzb3VyY2VPcHRpb25zPy5yZXZlcnNlKSB7XG4gICAgaXRlbXMgPSBpdGVtcy5yZXZlcnNlKCk7XG4gIH1cbiAgLy8gbGltaXQgc291cmNlIGl0ZW1zXG4gIC8vIGZpbHRlciBsaW1pdFxuICBjb25zdCBsaW1pdCA9IHNvdXJjZU9wdGlvbnM/LmxpbWl0O1xuICBpZiAobGltaXQgIT09IHVuZGVmaW5lZCAmJiBpdGVtcy5sZW5ndGggPiBsaW1pdCkge1xuICAgIGl0ZW1zID0gaXRlbXMuc2xpY2UoMCwgbGltaXQpO1xuICB9XG5cbiAgY29uc3QgZmluYWxJdGVtcyA9IFtdO1xuICBmb3IgKGxldCBpdGVtSW5kZXggPSAwOyBpdGVtSW5kZXggPCBpdGVtcy5sZW5ndGg7IGl0ZW1JbmRleCsrKSB7XG4gICAgLy8gcmVhY2ggbWF4IGl0ZW1zXG4gICAgY29uc3QgaXRlbSA9IGl0ZW1zW2l0ZW1JbmRleF07XG5cbiAgICBjb25zdCBrZXkgPSBnZXRTb3VyY2VJdGVtVW5pcXVlS2V5KFxuICAgICAgaXRlbSxcbiAgICAgIGN0eC5wdWJsaWMuc291cmNlSW5kZXghLFxuICAgICAgc291cmNlT3B0aW9ucyxcbiAgICApO1xuICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgYHdpbGwgYmUgZGlyZWN0bHkgYWRkZWQgdG8gaXRlbXNgLFxuICAgICAgICBcIk5vIHVuaXF1ZSBrZXlcIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAga2V5ICE9PSB1bmRlZmluZWQgJiYgY3R4LmludGVybmFsU3RhdGUgJiZcbiAgICAgIChjdHguaW50ZXJuYWxTdGF0ZS5rZXlzIHx8IFtdKS5pbmNsdWRlcyhrZXkpICYmXG4gICAgICAhZm9yY2VcbiAgICApIHtcbiAgICAgIHJlcG9ydGVyLmRlYnVnKGAke2tleX0sIGNhdXNlIGl0IGhhcyBiZWVuIHByb2Nlc3NlZGAsIFwiU2tpcCBpdGVtXCIpO1xuICAgICAgY29udGludWU7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGtleSAhPT0gdW5kZWZpbmVkICYmIGN0eC5pbnRlcm5hbFN0YXRlICYmXG4gICAgICAoY3R4LmludGVybmFsU3RhdGUua2V5cyB8fCBbXSkuaW5jbHVkZXMoa2V5KSAmJiBmb3JjZVxuICAgICkge1xuICAgICAgcmVwb3J0ZXIuZGVidWcoXG4gICAgICAgIGAke2tleX0sIGNhdXNlIC0tZm9yY2UgaXMgdHJ1ZWAsXG4gICAgICAgIFwiQWRkIHByb2Nlc3NlZCBpdGVtXCIsXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoZm9yY2UpIHtcbiAgICAgIHJlcG9ydGVyLmRlYnVnKGAke2tleX1gLCBcImFkZCBpdGVtXCIpO1xuICAgIH1cblxuICAgIGZpbmFsSXRlbXMucHVzaChpdGVtKTtcbiAgfVxuICAvLyBzYXZlIGN1cnJlbnQga2V5IHRvIGRiXG4gIGN0eC5wdWJsaWMuaXRlbXMgPSBmaW5hbEl0ZW1zO1xuICBjdHgucHVibGljLnJlc3VsdCA9IGZpbmFsSXRlbXM7XG4gIHJldHVybiBjdHg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJDdHhJdGVtcyhcbiAgY3R4OiBDb250ZXh0LFxuICBmaWx0ZXJPcHRpb25zOiBGaWx0ZXJUcmlnZ2VyT3B0aW9uLFxuKTogQ29udGV4dCB7XG4gIGNvbnN0IHsgcmVwb3J0ZXIgfSA9IGZpbHRlck9wdGlvbnM7XG4gIC8vIGZvcm1hdFxuICBjb25zdCBsaW1pdCA9IGZpbHRlck9wdGlvbnM/LmxpbWl0O1xuICAvLyBnZXQgaXRlbXMgcGF0aCwgZ2V0IGRlZHVwbGljYXRpb24ga2V5XG4gIGNvbnN0IGl0ZW1zID0gY3R4LnB1YmxpYy5pdGVtcztcblxuICBpZiAoIUFycmF5LmlzQXJyYXkoaXRlbXMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJjdHguaXRlbXMgbXVzdCBiZSBhbiBhcnJheSwgYnV0IGdvdCBcIiArIHR5cGVvZiBpdGVtcyArIFwiLCBmaWx0ZXIgZmFpbGVkXCIsXG4gICAgKTtcbiAgfVxuICByZXBvcnRlci5kZWJ1ZyhgSW5wdXQgJHtpdGVtcy5sZW5ndGh9IGl0ZW1zYCk7XG5cbiAgY29uc3QgZmluYWxJdGVtcyA9IFtdO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyByZWFjaCBtYXggaXRlbXNcblxuICAgIGlmIChcbiAgICAgIGxpbWl0ICE9PSB1bmRlZmluZWQgJiYgbGltaXQgPiAwICYmIGZpbmFsSXRlbXMubGVuZ3RoID49IGxpbWl0XG4gICAgKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY29uc3QgaXRlbSA9IGl0ZW1zW2ldO1xuXG4gICAgZmluYWxJdGVtcy5wdXNoKGl0ZW0pO1xuICB9XG4gIC8vIHNhdmUgY3VycmVudCBrZXkgdG8gZGJcbiAgY3R4LnB1YmxpYy5pdGVtcyA9IGZpbmFsSXRlbXM7XG5cbiAgcmVwb3J0ZXIuZGVidWcoYE91dHB1dCAke2N0eC5wdWJsaWMuaXRlbXMubGVuZ3RofSBpdGVtc2ApO1xuXG4gIHJldHVybiBjdHg7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsU0FBUyxHQUFHLFFBQVEsZ0JBQWdCLENBQUM7QUFTckMsT0FBTyxTQUFTLHNCQUFzQixDQUNwQyxJQUFhLEVBQ2IsV0FBbUIsRUFDbkIsYUFBNEIsRUFDUjtJQUNwQixNQUFNLGlCQUFpQixHQUFHO1FBQ3hCLElBQUk7UUFDSixNQUFNO1FBQ04sS0FBSztRQUNMLFVBQVU7UUFDVixVQUFVO1FBQ1YsSUFBSTtRQUNKLEtBQUs7UUFDTCxNQUFNO0tBQ1AsQUFBQztJQUNGLE1BQU0sU0FBUyxHQUFHLGFB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