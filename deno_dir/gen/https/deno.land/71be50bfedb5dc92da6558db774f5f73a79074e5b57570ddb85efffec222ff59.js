import { getSourceItemUniqueKey } from "./get-source-items-from-result.ts";
import { runScript } from "./utils/run-script.ts";
import { getFrom } from "./get-from.ts";
export async function filterSourceItems(ctx, sourceOptions) {
    const reporter = sourceOptions.reporter;
    let finalItems = ctx.public.items;
    if (Array.isArray(ctx.public.items)) {
        if (sourceOptions.filter) {
            finalItems = [];
            for(let i = 0; i < ctx.public.items.length; i++){
                const item = ctx.public.items[i];
                try {
                    const key = getSourceItemUniqueKey(item, ctx.public.sourceIndex, sourceOptions);
                    const scriptResult = await runScript(sourceOptions.filter, {
                        ctx: {
                            ...ctx.public,
                            itemIndex: i,
                            itemKey: key,
                            item: item
                        }
                    });
                    if (scriptResult.result) {
                        finalItems.push(item);
                        reporter.debug(`filter item ${key} to ctx.items`);
                    }
                    ctx.public.state = scriptResult.ctx.state;
                } catch (e) {
                    reporter.error(`Failed to run filter script`);
                    throw new Error(e);
                }
            }
        } else if (sourceOptions.filterFrom) {
            finalItems = [];
            const lib = await getFrom(ctx, sourceOptions.filterFrom, reporter);
            if (lib && lib.default) {
                for(let i = 0; i < ctx.public.items.length; i++){
                    const item = ctx.public.items[i];
                    try {
                        const key = getSourceItemUniqueKey(item, ctx.public.sourceIndex, sourceOptions);
                        const scriptResult = await lib.default({
                            ...ctx.public,
                            itemIndex: i,
                            itemKey: key,
                            item: item
                        });
                        if (scriptResult) {
                            finalItems.push(item);
                            reporter.debug(`filter item ${key} to ctx.items`);
                        }
                    } catch (e) {
                        reporter.error(`Failed to run filterFrom script`);
                        throw new Error(e);
                    }
                }
            }
        } else if (sourceOptions.filterItems) {
            const filterItems = sourceOptions.filterItems;
            try {
                const scriptResult = await runScript(filterItems, {
                    ctx: {
                        ...ctx.public
                    }
                });
                if (Array.isArray(scriptResult.result) && scriptResult.result.length === ctx.public.items.length) {
                    finalItems = ctx.public.items.filter((_item, index)=>{
                        return scriptResult.result[index];
                    });
                    reporter.debug(`filter ${finalItems.length} items to ctx.items`);
                } else {
                    // invalid result
                    throw new Error("Invalid filterItems script code, result must be array , boolean[], which items length must be equal to ctx.items length");
                }
                ctx.public.state = scriptResult.ctx.state;
            } catch (e) {
                reporter.error(`Failed to run filterItems script`);
                throw new Error(e);
            }
        } else if (sourceOptions.filterItemsFrom) {
            const lib = await getFrom(ctx, sourceOptions.filterItemsFrom, reporter);
            if (lib && lib.default) {
                try {
                    const scriptResult = await lib.default({
                        ...ctx.public
                    });
                    if (Array.isArray(scriptResult) && scriptResult.length === ctx.public.items.length) {
                        finalItems = ctx.public.items.filter((_item, index)=>{
                            return scriptResult[index];
                        });
                        reporter.debug(`filter ${finalItems.length} items to ctx.items`);
                    } else {
                        // invalid result
                        throw new Error("Invalid filterItems script, result must be array , boolean[], which items length must be equal to ctx.items length");
                    }
                } catch (e) {
                    reporter.error(`Failed to run filterItemsFrom script`);
                    throw new Error(e);
                }
            }
        }
    }
    ctx.public.items = finalItems;
    ctx.public.result = finalItems;
    return ctx;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvZmlsdGVyLXNvdXJjZS1pdGVtcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb250ZXh0IH0gZnJvbSBcIi4vaW50ZXJuYWwtaW50ZXJmYWNlLnRzXCI7XG5pbXBvcnQgeyBnZXRTb3VyY2VJdGVtVW5pcXVlS2V5IH0gZnJvbSBcIi4vZ2V0LXNvdXJjZS1pdGVtcy1mcm9tLXJlc3VsdC50c1wiO1xuaW1wb3J0IHsgcnVuU2NyaXB0IH0gZnJvbSBcIi4vdXRpbHMvcnVuLXNjcmlwdC50c1wiO1xuaW1wb3J0IHsgbG9nIH0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmltcG9ydCB7IGdldEZyb20gfSBmcm9tIFwiLi9nZXQtZnJvbS50c1wiO1xuaW1wb3J0IHsgUHVibGljQ29udGV4dCwgU291cmNlT3B0aW9ucyB9IGZyb20gXCIuL2ludGVyZmFjZS50c1wiO1xudHlwZSBGaWx0ZXJGdW5jdGlvbiA9IChjdHg6IFB1YmxpY0NvbnRleHQpID0+IGJvb2xlYW47XG5pbnRlcmZhY2UgRmlsdGVyU291cmNlSXRlbXNPcHRpb24gZXh0ZW5kcyBTb3VyY2VPcHRpb25zIHtcbiAgcmVwb3J0ZXI6IGxvZy5Mb2dnZXI7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlsdGVyU291cmNlSXRlbXMoXG4gIGN0eDogQ29udGV4dCxcbiAgc291cmNlT3B0aW9uczogRmlsdGVyU291cmNlSXRlbXNPcHRpb24sXG4pOiBQcm9taXNlPENvbnRleHQ+IHtcbiAgY29uc3QgcmVwb3J0ZXIgPSBzb3VyY2VPcHRpb25zLnJlcG9ydGVyO1xuICBsZXQgZmluYWxJdGVtczogdW5rbm93bltdID0gY3R4LnB1YmxpYy5pdGVtcztcbiAgaWYgKEFycmF5LmlzQXJyYXkoY3R4LnB1YmxpYy5pdGVtcykpIHtcbiAgICBpZiAoc291cmNlT3B0aW9ucy5maWx0ZXIpIHtcbiAgICAgIGZpbmFsSXRlbXMgPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3R4LnB1YmxpYy5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBpdGVtID0gY3R4LnB1YmxpYy5pdGVtc1tpXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBrZXkgPSBnZXRTb3VyY2VJdGVtVW5pcXVlS2V5KFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlSW5kZXghLFxuICAgICAgICAgICAgc291cmNlT3B0aW9ucyxcbiAgICAgICAgICApO1xuICAgICAgICAgIGNvbnN0IHNjcmlwdFJlc3VsdCA9IGF3YWl0IHJ1blNjcmlwdChzb3VyY2VPcHRpb25zLmZpbHRlciwge1xuICAgICAgICAgICAgY3R4OiB7XG4gICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgIGl0ZW1JbmRleDogaSxcbiAgICAgICAgICAgICAgaXRlbUtleToga2V5LFxuICAgICAgICAgICAgICBpdGVtOiBpdGVtLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChzY3JpcHRSZXN1bHQucmVzdWx0KSB7XG4gICAgICAgICAgICBmaW5hbEl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgICAgICByZXBvcnRlci5kZWJ1ZyhgZmlsdGVyIGl0ZW0gJHtrZXl9IHRvIGN0eC5pdGVtc2ApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdHgucHVibGljLnN0YXRlID0gc2NyaXB0UmVzdWx0LmN0eC5zdGF0ZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyIHNjcmlwdGAsXG4gICAgICAgICAgKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHNvdXJjZU9wdGlvbnMuZmlsdGVyRnJvbSkge1xuICAgICAgZmluYWxJdGVtcyA9IFtdO1xuICAgICAgY29uc3QgbGliID0gYXdhaXQgZ2V0RnJvbShjdHgsIHNvdXJjZU9wdGlvbnMuZmlsdGVyRnJvbSwgcmVwb3J0ZXIpO1xuICAgICAgaWYgKGxpYiAmJiAobGliIGFzIFJlY29yZDxzdHJpbmcsIEZpbHRlckZ1bmN0aW9uPikuZGVmYXVsdCkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBpdGVtID0gY3R4LnB1YmxpYy5pdGVtc1tpXTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gZ2V0U291cmNlSXRlbVVuaXF1ZUtleShcbiAgICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VJbmRleCEsXG4gICAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgY29uc3Qgc2NyaXB0UmVzdWx0ID0gYXdhaXQgbGliLmRlZmF1bHQoe1xuICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICBpdGVtSW5kZXg6IGksXG4gICAgICAgICAgICAgIGl0ZW1LZXk6IGtleSxcbiAgICAgICAgICAgICAgaXRlbTogaXRlbSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoc2NyaXB0UmVzdWx0KSB7XG4gICAgICAgICAgICAgIGZpbmFsSXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgcmVwb3J0ZXIuZGVidWcoYGZpbHRlciBpdGVtICR7a2V5fSB0byBjdHguaXRlbXNgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyRnJvbSBzY3JpcHRgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHNvdXJjZU9wdGlvbnMuZmlsdGVySXRlbXMpIHtcbiAgICAgIGNvbnN0IGZpbHRlckl0ZW1zID0gc291cmNlT3B0aW9ucy5maWx0ZXJJdGVtcztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgc2NyaXB0UmVzdWx0ID0gYXdhaXQgcnVuU2NyaXB0KGZpbHRlckl0ZW1zLCB7XG4gICAgICAgICAgY3R4OiB7XG4gICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICBBcnJheS5pc0FycmF5KHNjcmlwdFJlc3VsdC5yZXN1bHQpICYmXG4gICAgICAgICAgc2NyaXB0UmVzdWx0LnJlc3VsdC5sZW5ndGggPT09IGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoXG4gICAgICAgICkge1xuICAgICAgICAgIGZpbmFsSXRlbXMgPSBjdHgucHVibGljLml0ZW1zLmZpbHRlcigoX2l0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gc2NyaXB0UmVzdWx0LnJlc3VsdFtpbmRleF07XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVwb3J0ZXIuZGVidWcoYGZpbHRlciAke2ZpbmFsSXRlbXMubGVuZ3RofSBpdGVtcyB0byBjdHguaXRlbXNgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBpbnZhbGlkIHJlc3VsdFxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIFwiSW52YWxpZCBmaWx0ZXJJdGVtcyBzY3JpcHQgY29kZSwgcmVzdWx0IG11c3QgYmUgYXJyYXkgLCBib29sZWFuW10sIHdoaWNoIGl0ZW1zIGxlbmd0aCBtdXN0IGJlIGVxdWFsIHRvIGN0eC5pdGVtcyBsZW5ndGhcIixcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGN0eC5wdWJsaWMuc3RhdGUgPSBzY3JpcHRSZXN1bHQuY3R4LnN0YXRlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXBvcnRlci5lcnJvcihcbiAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBmaWx0ZXJJdGVtcyBzY3JpcHRgLFxuICAgICAgICApO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzb3VyY2VPcHRpb25zLmZpbHRlckl0ZW1zRnJvbSkge1xuICAgICAgY29uc3QgbGliID0gYXdhaXQgZ2V0RnJvbShjdHgsIHNvdXJjZU9wdGlvbnMuZmlsdGVySXRlbXNGcm9tLCByZXBvcnRlcik7XG4gICAgICBpZiAobGliICYmIChsaWIgYXMgUmVjb3JkPHN0cmluZywgRmlsdGVyRnVuY3Rpb24+KS5kZWZhdWx0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qgc2NyaXB0UmVzdWx0ID0gYXdhaXQgbGliLmRlZmF1bHQoe1xuICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIEFycmF5LmlzQXJyYXkoc2NyaXB0UmVzdWx0KSAmJlxuICAgICAgICAgICAgc2NyaXB0UmVzdWx0Lmxlbmd0aCA9PT0gY3R4LnB1YmxpYy5pdGVtcy5sZW5ndGhcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGZpbmFsSXRlbXMgPSBjdHgucHVibGljLml0ZW1zLmZpbHRlcigoX2l0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiBzY3JpcHRSZXN1bHRbaW5kZXhdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXBvcnRlci5kZWJ1ZyhgZmlsdGVyICR7ZmluYWxJdGVtcy5sZW5ndGh9IGl0ZW1zIHRvIGN0eC5pdGVtc2ApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBpbnZhbGlkIHJlc3VsdFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBcIkludmFsaWQgZmlsdGVySXRlbXMgc2NyaXB0LCByZXN1bHQgbXVzdCBiZSBhcnJheSAsIGJvb2xlYW5bXSwgd2hpY2ggaXRlbXMgbGVuZ3RoIG11c3QgYmUgZXF1YWwgdG8gY3R4Lml0ZW1zIGxlbmd0aFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIGZpbHRlckl0ZW1zRnJvbSBzY3JpcHRgLFxuICAgICAgICAgICk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY3R4LnB1YmxpYy5pdGVtcyA9IGZpbmFsSXRlbXM7XG4gIGN0eC5wdWJsaWMucmVzdWx0ID0gZmluYWxJdGVtcztcbiAgcmV0dXJuIGN0eDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxTQUFTLHNCQUFzQixRQUFRLG9DQUFvQztBQUMzRSxTQUFTLFNBQVMsUUFBUSx3QkFBd0I7QUFFbEQsU0FBUyxPQUFPLFFBQVEsZ0JBQWdCO0FBTXhDLE9BQU8sZUFBZSxrQkFDcEIsR0FBWSxFQUNaLGFBQXNDLEVBQ3BCO0lBQ2xCLE1BQU0sV0FBVyxjQUFjLFFBQVE7SUFDdkMsSUFBSSxhQUF3QixJQUFJLE1BQU0sQ0FBQyxLQUFLO0lBQzVDLElBQUksTUFBTSxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsS0FBSyxHQUFHO1FBQ25DLElBQUksY0FBYyxNQUFNLEVBQUU7WUFDeEIsYUFBYSxFQUFFO1lBQ2YsSUFBSyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSztnQkFDaEQsTUFBTSxPQUFPLElBQUksTUFBTSxD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