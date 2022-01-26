import { getSourceItemUniqueKey } from "./get-source-items-from-result.ts";
import { runScript } from "./utils/run-script.ts";
import { getFrom } from "./get-from.ts";
export async function filterSourceItems(ctx, reporter) {
    let finalItems = ctx.public.items;
    if (Array.isArray(ctx.public.items)) {
        const sourceOptions = ctx.sourcesOptions[ctx.public.sourceIndex];
        if (sourceOptions.filter) {
            finalItems = [];
            for (let i = 0; i < ctx.public.items.length; i++) {
                const item = ctx.public.items[i];
                try {
                    const key = getSourceItemUniqueKey(item, ctx.public.sourceIndex, sourceOptions);
                    const scriptResult = await runScript(sourceOptions.filter, {
                        ctx: {
                            ...ctx.public,
                            itemIndex: i,
                            itemKey: key,
                            item: item,
                        },
                    });
                    if (scriptResult.result) {
                        finalItems.push(item);
                        reporter.debug(`filter item ${key} to ctx.items`);
                    }
                    ctx.public.state = scriptResult.ctx.state;
                }
                catch (e) {
                    reporter.error(`Failed to run filter script`);
                    throw new Error(e);
                }
            }
        }
        else if (sourceOptions.filterFrom) {
            finalItems = [];
            const lib = await getFrom(ctx, sourceOptions.filterFrom, reporter);
            if (lib && lib.default) {
                for (let i = 0; i < ctx.public.items.length; i++) {
                    const item = ctx.public.items[i];
                    try {
                        const key = getSourceItemUniqueKey(item, ctx.public.sourceIndex, sourceOptions);
                        const scriptResult = await lib.default({
                            ...ctx.public,
                            itemIndex: i,
                            itemKey: key,
                            item: item,
                        });
                        if (scriptResult) {
                            finalItems.push(item);
                            reporter.debug(`filter item ${key} to ctx.items`);
                        }
                    }
                    catch (e) {
                        reporter.error(`Failed to run filterFrom script`);
                        throw new Error(e);
                    }
                }
            }
        }
        else if (sourceOptions.filterItems) {
            const filterItems = sourceOptions.filterItems;
            try {
                const scriptResult = await runScript(filterItems, {
                    ctx: {
                        ...ctx.public,
                    },
                });
                if (Array.isArray(scriptResult.result) &&
                    scriptResult.result.length === ctx.public.items.length) {
                    finalItems = ctx.public.items.filter((_item, index) => {
                        return scriptResult.result[index];
                    });
                    reporter.debug(`filter ${finalItems.length} items to ctx.items`);
                }
                else {
                    throw new Error("Invalid filterItems script code, result must be array , boolean[], which items length must be equal to ctx.items length");
                }
                ctx.public.state = scriptResult.ctx.state;
            }
            catch (e) {
                reporter.error(`Failed to run filterItems script`);
                throw new Error(e);
            }
        }
        else if (sourceOptions.filterItemsFrom) {
            const lib = await getFrom(ctx, sourceOptions.filterItemsFrom, reporter);
            if (lib && lib.default) {
                try {
                    const scriptResult = await lib.default({
                        ...ctx.public,
                    });
                    if (Array.isArray(scriptResult.result) &&
                        scriptResult.result.length === ctx.public.items.length) {
                        finalItems = ctx.public.items.filter((_item, index) => {
                            return scriptResult.result[index];
                        });
                        reporter.debug(`filter ${finalItems.length} items to ctx.items`);
                    }
                    else {
                        throw new Error("Invalid filterItems script, result must be array , boolean[], which items length must be equal to ctx.items length");
                    }
                }
                catch (e) {
                    reporter.error(`Failed to run filterItemsFrom script`);
                    throw new Error(e);
                }
            }
        }
        const limit = sourceOptions?.limit;
        if (limit !== undefined && finalItems.length > limit) {
            finalItems = finalItems.slice(0, limit);
        }
    }
    ctx.public.items = finalItems;
    ctx.public.result = finalItems;
    return ctx;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyLXNvdXJjZS1pdGVtcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbHRlci1zb3VyY2UtaXRlbXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWxELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFJeEMsTUFBTSxDQUFDLEtBQUssVUFBVSxpQkFBaUIsQ0FDckMsR0FBWSxFQUNaLFFBQW9CO0lBRXBCLElBQUksVUFBVSxHQUFjLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQzdDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ25DLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFZLENBQUMsQ0FBQztRQUVsRSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDeEIsVUFBVSxHQUFHLEVBQUUsQ0FBQztZQUNoQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNoRCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakMsSUFBSTtvQkFDRixNQUFNLEdBQUcsR0FBRyxzQkFBc0IsQ0FDaEMsSUFBSSxFQUNKLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBWSxFQUN2QixhQUFhLENBQ2QsQ0FBQztvQkFDRixNQUFNLFlBQVksR0FBRyxNQUFNLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO3dCQUN6RCxHQUFHLEVBQUU7NEJB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d0JBRUwsTUFBTSxJQUFJLEtBQUssQ0FDYixvSEFBb0gsQ0FDckgsQ0FBQztxQkFDSDtpQkFDRjtnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDVixRQUFRLENBQUMsS0FBSyxDQUNaLHNDQUFzQyxDQUN2QyxDQUFDO29CQUNGLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ3BCO2FBQ0Y7U0FDRjtRQUdELE1BQU0sS0FBSyxHQUFHLGFBQWEsRUFBRSxLQUFLLENBQUM7UUFDbkMsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsS0FBSyxFQUFFO1lBQ3BELFVBQVUsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN6QztLQUNGO0lBRUQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDO0lBQzlCLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQztJQUMvQixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb250ZXh0IH0gZnJvbSBcIi4vaW50ZXJuYWwtaW50ZXJmYWNlLnRzXCI7XG5pbXBvcnQgeyBnZXRTb3VyY2VJdGVtVW5pcXVlS2V5IH0gZnJvbSBcIi4vZ2V0LXNvdXJjZS1pdGVtcy1mcm9tLXJlc3VsdC50c1wiO1xuaW1wb3J0IHsgcnVuU2NyaXB0IH0gZnJvbSBcIi4vdXRpbHMvcnVuLXNjcmlwdC50c1wiO1xuaW1wb3J0IHsgbG9nIH0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmltcG9ydCB7IGdldEZyb20gfSBmcm9tIFwiLi9nZXQtZnJvbS50c1wiO1xuaW1wb3J0IHsgUHVibGljQ29udGV4dCB9IGZyb20gXCIuL2ludGVyZmFjZS50c1wiO1xudHlwZSBGaWx0ZXJGdW5jdGlvbiA9IChjdHg6IFB1YmxpY0NvbnRleHQpID0+IGJvb2xlYW47XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaWx0ZXJTb3VyY2VJdGVtcyhcbiAgY3R4OiBDb250ZXh0LFxuICByZXBvcnRlcjogbG9nLkxvZ2dlcixcbik6IFByb21pc2U8Q29udGV4dD4ge1xuICBsZXQgZmluYWxJdGVtczogdW5rbm93bltdID0gY3R4LnB1YmxpYy5pdGVtcztcbiAgaWYgKEFycmF5LmlzQXJyYXkoY3R4LnB1YmxpYy5pdGVtcykpIHtcbiAgICBjb25zdCBzb3VyY2VPcHRpb25zID0gY3R4LnNvdXJjZXNPcHRpb25zW2N0eC5wdWJsaWMuc291cmNlSW5kZXghXTtcblxuICAgIGlmIChzb3VyY2VPcHRpb25zLmZpbHRlcikge1xuICAgICAgZmluYWxJdGVtcyA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjdHgucHVibGljLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSBjdHgucHVibGljLml0ZW1zW2ldO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGtleSA9IGdldFNvdXJjZUl0ZW1VbmlxdWVLZXkoXG4gICAgICAgICAgICBpdGVtLFxuICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VJbmRleCEsXG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zLFxuICAgICAgICAgICk7XG4gICAgICAgICAgY29uc3Qgc2NyaXB0UmVzdWx0ID0gYXdhaXQgcnVuU2NyaXB0KHNvdXJjZU9wdGlvbnMuZmlsdGVyLCB7XG4gICAgICAgICAgICBjdHg6IHtcbiAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgaXRlbUluZGV4OiBpLFxuICAgICAgICAgICAgICBpdGVtS2V5OiBrZXksXG4gICAgICAgICAgICAgIGl0ZW06IGl0ZW0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKHNjcmlwdFJlc3VsdC5yZXN1bHQpIHtcbiAgICAgICAgICAgIGZpbmFsSXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgIHJlcG9ydGVyLmRlYnVnKGBmaWx0ZXIgaXRlbSAke2tleX0gdG8gY3R4Lml0ZW1zYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGN0eC5wdWJsaWMuc3RhdGUgPSBzY3JpcHRSZXN1bHQuY3R4LnN0YXRlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBmaWx0ZXIgc2NyaXB0YCxcbiAgICAgICAgICApO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc291cmNlT3B0aW9ucy5maWx0ZXJGcm9tKSB7XG4gICAgICBmaW5hbEl0ZW1zID0gW107XG4gICAgICBjb25zdCBsaWIgPSBhd2FpdCBnZXRGcm9tKGN0eCwgc291cmNlT3B0aW9ucy5maWx0ZXJGcm9tLCByZXBvcnRlcik7XG4gICAgICBpZiAobGliICYmIChsaWIgYXMgUmVjb3JkPHN0cmluZywgRmlsdGVyRnVuY3Rpb24+KS5kZWZhdWx0KSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3R4LnB1YmxpYy5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSBjdHgucHVibGljLml0ZW1zW2ldO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBnZXRTb3VyY2VJdGVtVW5pcXVlS2V5KFxuICAgICAgICAgICAgICBpdGVtLFxuICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZUluZGV4ISxcbiAgICAgICAgICAgICAgc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBzY3JpcHRSZXN1bHQgPSBhd2FpdCBsaWIuZGVmYXVsdCh7XG4gICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgIGl0ZW1JbmRleDogaSxcbiAgICAgICAgICAgICAgaXRlbUtleToga2V5LFxuICAgICAgICAgICAgICBpdGVtOiBpdGVtLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChzY3JpcHRSZXN1bHQpIHtcbiAgICAgICAgICAgICAgZmluYWxJdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICByZXBvcnRlci5kZWJ1ZyhgZmlsdGVyIGl0ZW0gJHtrZXl9IHRvIGN0eC5pdGVtc2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBmaWx0ZXJGcm9tIHNjcmlwdGAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc291cmNlT3B0aW9ucy5maWx0ZXJJdGVtcykge1xuICAgICAgY29uc3QgZmlsdGVySXRlbXMgPSBzb3VyY2VPcHRpb25zLmZpbHRlckl0ZW1zO1xuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzY3JpcHRSZXN1bHQgPSBhd2FpdCBydW5TY3JpcHQoZmlsdGVySXRlbXMsIHtcbiAgICAgICAgICBjdHg6IHtcbiAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIEFycmF5LmlzQXJyYXkoc2NyaXB0UmVzdWx0LnJlc3VsdCkgJiZcbiAgICAgICAgICBzY3JpcHRSZXN1bHQucmVzdWx0Lmxlbmd0aCA9PT0gY3R4LnB1YmxpYy5pdGVtcy5sZW5ndGhcbiAgICAgICAgKSB7XG4gICAgICAgICAgZmluYWxJdGVtcyA9IGN0eC5wdWJsaWMuaXRlbXMuZmlsdGVyKChfaXRlbSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBzY3JpcHRSZXN1bHQucmVzdWx0W2luZGV4XTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXBvcnRlci5kZWJ1ZyhgZmlsdGVyICR7ZmluYWxJdGVtcy5sZW5ndGh9IGl0ZW1zIHRvIGN0eC5pdGVtc2ApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGludmFsaWQgcmVzdWx0XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgXCJJbnZhbGlkIGZpbHRlckl0ZW1zIHNjcmlwdCBjb2RlLCByZXN1bHQgbXVzdCBiZSBhcnJheSAsIGJvb2xlYW5bXSwgd2hpY2ggaXRlbXMgbGVuZ3RoIG11c3QgYmUgZXF1YWwgdG8gY3R4Lml0ZW1zIGxlbmd0aFwiLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgY3R4LnB1YmxpYy5zdGF0ZSA9IHNjcmlwdFJlc3VsdC5jdHguc3RhdGU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIGZpbHRlckl0ZW1zIHNjcmlwdGAsXG4gICAgICAgICk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHNvdXJjZU9wdGlvbnMuZmlsdGVySXRlbXNGcm9tKSB7XG4gICAgICBjb25zdCBsaWIgPSBhd2FpdCBnZXRGcm9tKGN0eCwgc291cmNlT3B0aW9ucy5maWx0ZXJJdGVtc0Zyb20sIHJlcG9ydGVyKTtcbiAgICAgIGlmIChsaWIgJiYgKGxpYiBhcyBSZWNvcmQ8c3RyaW5nLCBGaWx0ZXJGdW5jdGlvbj4pLmRlZmF1bHQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBzY3JpcHRSZXN1bHQgPSBhd2FpdCBsaWIuZGVmYXVsdCh7XG4gICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgQXJyYXkuaXNBcnJheShzY3JpcHRSZXN1bHQucmVzdWx0KSAmJlxuICAgICAgICAgICAgc2NyaXB0UmVzdWx0LnJlc3VsdC5sZW5ndGggPT09IGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBmaW5hbEl0ZW1zID0gY3R4LnB1YmxpYy5pdGVtcy5maWx0ZXIoKF9pdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gc2NyaXB0UmVzdWx0LnJlc3VsdFtpbmRleF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlcG9ydGVyLmRlYnVnKGBmaWx0ZXIgJHtmaW5hbEl0ZW1zLmxlbmd0aH0gaXRlbXMgdG8gY3R4Lml0ZW1zYCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGludmFsaWQgcmVzdWx0XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIFwiSW52YWxpZCBmaWx0ZXJJdGVtcyBzY3JpcHQsIHJlc3VsdCBtdXN0IGJlIGFycmF5ICwgYm9vbGVhbltdLCB3aGljaCBpdGVtcyBsZW5ndGggbXVzdCBiZSBlcXVhbCB0byBjdHguaXRlbXMgbGVuZ3RoXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVySXRlbXNGcm9tIHNjcmlwdGAsXG4gICAgICAgICAgKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBmaWx0ZXIgbGltaXRcbiAgICBjb25zdCBsaW1pdCA9IHNvdXJjZU9wdGlvbnM/LmxpbWl0O1xuICAgIGlmIChsaW1pdCAhPT0gdW5kZWZpbmVkICYmIGZpbmFsSXRlbXMubGVuZ3RoID4gbGltaXQpIHtcbiAgICAgIGZpbmFsSXRlbXMgPSBmaW5hbEl0ZW1zLnNsaWNlKDAsIGxpbWl0KTtcbiAgICB9XG4gIH1cblxuICBjdHgucHVibGljLml0ZW1zID0gZmluYWxJdGVtcztcbiAgY3R4LnB1YmxpYy5yZXN1bHQgPSBmaW5hbEl0ZW1zO1xuICByZXR1cm4gY3R4O1xufVxuIl19