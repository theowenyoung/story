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
                for(let i1 = 0; i1 < ctx.public.items.length; i1++){
                    const item1 = ctx.public.items[i1];
                    try {
                        const key1 = getSourceItemUniqueKey(item1, ctx.public.sourceIndex, sourceOptions);
                        const scriptResult1 = await lib.default({
                            ...ctx.public,
                            itemIndex: i1,
                            itemKey: key1,
                            item: item1
                        });
                        if (scriptResult1) {
                            finalItems.push(item1);
                            reporter.debug(`filter item ${key1} to ctx.items`);
                        }
                    } catch (e1) {
                        reporter.error(`Failed to run filterFrom script`);
                        throw new Error(e1);
                    }
                }
            }
        } else if (sourceOptions.filterItems) {
            const filterItems = sourceOptions.filterItems;
            try {
                const scriptResult2 = await runScript(filterItems, {
                    ctx: {
                        ...ctx.public
                    }
                });
                if (Array.isArray(scriptResult2.result) && scriptResult2.result.length === ctx.public.items.length) {
                    finalItems = ctx.public.items.filter((_item, index)=>{
                        return scriptResult2.result[index];
                    });
                    reporter.debug(`filter ${finalItems.length} items to ctx.items`);
                } else {
                    // invalid result
                    throw new Error("Invalid filterItems script code, result must be array , boolean[], which items length must be equal to ctx.items length");
                }
                ctx.public.state = scriptResult2.ctx.state;
            } catch (e2) {
                reporter.error(`Failed to run filterItems script`);
                throw new Error(e2);
            }
        } else if (sourceOptions.filterItemsFrom) {
            const lib1 = await getFrom(ctx, sourceOptions.filterItemsFrom, reporter);
            if (lib1 && lib1.default) {
                try {
                    const scriptResult3 = await lib1.default({
                        ...ctx.public
                    });
                    if (Array.isArray(scriptResult3) && scriptResult3.length === ctx.public.items.length) {
                        finalItems = ctx.public.items.filter((_item, index)=>{
                            return scriptResult3[index];
                        });
                        reporter.debug(`filter ${finalItems.length} items to ctx.items`);
                    } else {
                        // invalid result
                        throw new Error("Invalid filterItems script, result must be array , boolean[], which items length must be equal to ctx.items length");
                    }
                } catch (e3) {
                    reporter.error(`Failed to run filterItemsFrom script`);
                    throw new Error(e3);
                }
            }
        }
    }
    ctx.public.items = finalItems;
    ctx.public.result = finalItems;
    return ctx;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvZmlsdGVyLXNvdXJjZS1pdGVtcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb250ZXh0IH0gZnJvbSBcIi4vaW50ZXJuYWwtaW50ZXJmYWNlLnRzXCI7XG5pbXBvcnQgeyBnZXRTb3VyY2VJdGVtVW5pcXVlS2V5IH0gZnJvbSBcIi4vZ2V0LXNvdXJjZS1pdGVtcy1mcm9tLXJlc3VsdC50c1wiO1xuaW1wb3J0IHsgcnVuU2NyaXB0IH0gZnJvbSBcIi4vdXRpbHMvcnVuLXNjcmlwdC50c1wiO1xuaW1wb3J0IHsgbG9nIH0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmltcG9ydCB7IGdldEZyb20gfSBmcm9tIFwiLi9nZXQtZnJvbS50c1wiO1xuaW1wb3J0IHsgUHVibGljQ29udGV4dCwgU291cmNlT3B0aW9ucyB9IGZyb20gXCIuL2ludGVyZmFjZS50c1wiO1xudHlwZSBGaWx0ZXJGdW5jdGlvbiA9IChjdHg6IFB1YmxpY0NvbnRleHQpID0+IGJvb2xlYW47XG5pbnRlcmZhY2UgRmlsdGVyU291cmNlSXRlbXNPcHRpb24gZXh0ZW5kcyBTb3VyY2VPcHRpb25zIHtcbiAgcmVwb3J0ZXI6IGxvZy5Mb2dnZXI7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlsdGVyU291cmNlSXRlbXMoXG4gIGN0eDogQ29udGV4dCxcbiAgc291cmNlT3B0aW9uczogRmlsdGVyU291cmNlSXRlbXNPcHRpb24sXG4pOiBQcm9taXNlPENvbnRleHQ+IHtcbiAgY29uc3QgcmVwb3J0ZXIgPSBzb3VyY2VPcHRpb25zLnJlcG9ydGVyO1xuICBsZXQgZmluYWxJdGVtczogdW5rbm93bltdID0gY3R4LnB1YmxpYy5pdGVtcztcbiAgaWYgKEFycmF5LmlzQXJyYXkoY3R4LnB1YmxpYy5pdGVtcykpIHtcbiAgICBpZiAoc291cmNlT3B0aW9ucy5maWx0ZXIpIHtcbiAgICAgIGZpbmFsSXRlbXMgPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3R4LnB1YmxpYy5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBpdGVtID0gY3R4LnB1YmxpYy5pdGVtc1tpXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBrZXkgPSBnZXRTb3VyY2VJdGVtVW5pcXVlS2V5KFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlSW5kZXghLFxuICAgICAgICAgICAgc291cmNlT3B0aW9ucyxcbiAgICAgICAgICApO1xuICAgICAgICAgIGNvbnN0IHNjcmlwdFJlc3VsdCA9IGF3YWl0IHJ1blNjcmlwdChzb3VyY2VPcHRpb25zLmZpbHRlciwge1xuICAgICAgICAgICAgY3R4OiB7XG4gICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgIGl0ZW1JbmRleDogaSxcbiAgICAgICAgICAgICAgaXRlbUtleToga2V5LFxuICAgICAgICAgICAgICBpdGVtOiBpdGVtLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChzY3JpcHRSZXN1bHQucmVzdWx0KSB7XG4gICAgICAgICAgICBmaW5hbEl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgICAgICByZXBvcnRlci5kZWJ1ZyhgZmlsdGVyIGl0ZW0gJHtrZXl9IHRvIGN0eC5pdGVtc2ApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdHgucHVibGljLnN0YXRlID0gc2NyaXB0UmVzdWx0LmN0eC5zdGF0ZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyIHNjcmlwdGAsXG4gICAgICAgICAgKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHNvdXJjZU9wdGlvbnMuZmlsdGVyRnJvbSkge1xuICAgICAgZmluYWxJdGVtcyA9IFtdO1xuICAgICAgY29uc3QgbGliID0gYXdhaXQgZ2V0RnJvbShjdHgsIHNvdXJjZU9wdGlvbnMuZmlsdGVyRnJvbSwgcmVwb3J0ZXIpO1xuICAgICAgaWYgKGxpYiAmJiAobGliIGFzIFJlY29yZDxzdHJpbmcsIEZpbHRlckZ1bmN0aW9uPikuZGVmYXVsdCkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBpdGVtID0gY3R4LnB1YmxpYy5pdGVtc1tpXTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gZ2V0U291cmNlSXRlbVVuaXF1ZUtleShcbiAgICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VJbmRleCEsXG4gICAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgY29uc3Qgc2NyaXB0UmVzdWx0ID0gYXdhaXQgbGliLmRlZmF1bHQoe1xuICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICBpdGVtSW5kZXg6IGksXG4gICAgICAgICAgICAgIGl0ZW1LZXk6IGtleSxcbiAgICAgICAgICAgICAgaXRlbTogaXRlbSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoc2NyaXB0UmVzdWx0KSB7XG4gICAgICAgICAgICAgIGZpbmFsSXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgcmVwb3J0ZXIuZGVidWcoYGZpbHRlciBpdGVtICR7a2V5fSB0byBjdHguaXRlbXNgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyRnJvbSBzY3JpcHRgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHNvdXJjZU9wdGlvbnMuZmlsdGVySXRlbXMpIHtcbiAgICAgIGNvbnN0IGZpbHRlckl0ZW1zID0gc291cmNlT3B0aW9ucy5maWx0ZXJJdGVtcztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgc2NyaXB0UmVzdWx0ID0gYXdhaXQgcnVuU2NyaXB0KGZpbHRlckl0ZW1zLCB7XG4gICAgICAgICAgY3R4OiB7XG4gICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICBBcnJheS5pc0FycmF5KHNjcmlwdFJlc3VsdC5yZXN1bHQpICYmXG4gICAgICAgICAgc2NyaXB0UmVzdWx0LnJlc3VsdC5sZW5ndGggPT09IGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoXG4gICAgICAgICkge1xuICAgICAgICAgIGZpbmFsSXRlbXMgPSBjdHgucHVibGljLml0ZW1zLmZpbHRlcigoX2l0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gc2NyaXB0UmVzdWx0LnJlc3VsdFtpbmRleF07XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVwb3J0ZXIuZGVidWcoYGZpbHRlciAke2ZpbmFsSXRlbXMubGVuZ3RofSBpdGVtcyB0byBjdHguaXRlbXNgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBpbnZhbGlkIHJlc3VsdFxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIFwiSW52YWxpZCBmaWx0ZXJJdGVtcyBzY3JpcHQgY29kZSwgcmVzdWx0IG11c3QgYmUgYXJyYXkgLCBib29sZWFuW10sIHdoaWNoIGl0ZW1zIGxlbmd0aCBtdXN0IGJlIGVxdWFsIHRvIGN0eC5pdGVtcyBsZW5ndGhcIixcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGN0eC5wdWJsaWMuc3RhdGUgPSBzY3JpcHRSZXN1bHQuY3R4LnN0YXRlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXBvcnRlci5lcnJvcihcbiAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBmaWx0ZXJJdGVtcyBzY3JpcHRgLFxuICAgICAgICApO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzb3VyY2VPcHRpb25zLmZpbHRlckl0ZW1zRnJvbSkge1xuICAgICAgY29uc3QgbGliID0gYXdhaXQgZ2V0RnJvbShjdHgsIHNvdXJjZU9wdGlvbnMuZmlsdGVySXRlbXNGcm9tLCByZXBvcnRlcik7XG4gICAgICBpZiAobGliICYmIChsaWIgYXMgUmVjb3JkPHN0cmluZywgRmlsdGVyRnVuY3Rpb24+KS5kZWZhdWx0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qgc2NyaXB0UmVzdWx0ID0gYXdhaXQgbGliLmRlZmF1bHQoe1xuICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIEFycmF5LmlzQXJyYXkoc2NyaXB0UmVzdWx0KSAmJlxuICAgICAgICAgICAgc2NyaXB0UmVzdWx0Lmxlbmd0aCA9PT0gY3R4LnB1YmxpYy5pdGVtcy5sZW5ndGhcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGZpbmFsSXRlbXMgPSBjdHgucHVibGljLml0ZW1zLmZpbHRlcigoX2l0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiBzY3JpcHRSZXN1bHRbaW5kZXhdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXBvcnRlci5kZWJ1ZyhgZmlsdGVyICR7ZmluYWxJdGVtcy5sZW5ndGh9IGl0ZW1zIHRvIGN0eC5pdGVtc2ApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBpbnZhbGlkIHJlc3VsdFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBcIkludmFsaWQgZmlsdGVySXRlbXMgc2NyaXB0LCByZXN1bHQgbXVzdCBiZSBhcnJheSAsIGJvb2xlYW5bXSwgd2hpY2ggaXRlbXMgbGVuZ3RoIG11c3QgYmUgZXF1YWwgdG8gY3R4Lml0ZW1zIGxlbmd0aFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIGZpbHRlckl0ZW1zRnJvbSBzY3JpcHRgLFxuICAgICAgICAgICk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY3R4LnB1YmxpYy5pdGVtcyA9IGZpbmFsSXRlbXM7XG4gIGN0eC5wdWJsaWMucmVzdWx0ID0gZmluYWxJdGVtcztcbiAgcmV0dXJuIGN0eDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxTQUFTLHNCQUFzQixRQUFRLG1DQUFtQyxDQUFDO0FBQzNFLFNBQVMsU0FBUyxRQUFRLHVCQUF1QixDQUFDO0FBRWxELFNBQVMsT0FBTyxRQUFRLGVBQWUsQ0FBQztBQU14QyxPQUFPLGVBQWUsaUJBQWlCLENBQ3JDLEdBQVksRUFDWixhQUFzQyxFQUNwQjtJQUNsQixNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsUUFBUSxBQUFDO0lBQ3hDLElBQUksVUFBVSxHQUFjLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxBQUFDO0lBQzdDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ25DLElBQUksYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUN4QixVQUFVLEdBQUcsRUFBRSxDQUFDO1lBQ2hCLElBQUssSUFBSSxDQUFD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