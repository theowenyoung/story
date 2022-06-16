import { template } from "./utils/template.ts";
import mapObject from "./utils/map-obj.js";
import { isObject } from "./utils/object.ts";
export async function parseObject(step, ctx, options) {
    const { keys: rawKeys , default: defaultOptions  } = options || {};
    const keys = rawKeys || Object.keys(step);
    // if keys provided, check is include keys
    for (const key of keys){
        if (key in step) {
            const parsed = await parseTopValue(step[key], ctx);
            step[key] = parsed;
        }
    }
    return {
        ...defaultOptions,
        ...step
    };
}
async function parseTopValue(step, ctx) {
    try {
        if (typeof step === "string") {
            const parsed = await template(step, {
                ctx: ctx.public
            });
            return parsed;
        } else if (Array.isArray(step)) {
            const finalArray = [];
            for(let i = 0; i < step.length; i++){
                const item = step[i];
                finalArray.push(await parseTopValue(item, ctx));
            }
            return finalArray;
        } else if (isObject(step)) {
            const returned = await mapObject(step, async (sourceKey, sourceValue)=>{
                if (typeof sourceValue === "string") {
                    const parsed = await template(sourceValue, {
                        ctx: ctx.public
                    });
                    return [
                        sourceKey,
                        parsed,
                        {
                            shouldRecurse: false
                        }
                    ];
                } else {
                    if (Array.isArray(sourceValue)) {
                        const finalArray = [];
                        for(let i = 0; i < sourceValue.length; i++){
                            const item = sourceValue[i];
                            if (typeof item === "string") {
                                const parsed = await template(item, {
                                    ctx: ctx.public
                                });
                                finalArray.push(parsed);
                            } else {
                                finalArray.push(item);
                            }
                        }
                        return [
                            sourceKey,
                            finalArray, 
                        ];
                    } else {
                        return [
                            sourceKey,
                            sourceValue
                        ];
                    }
                }
            }, {
                deep: true
            });
            return returned;
        } else {
            return step;
        }
    } catch (e) {
        const isReferenced = e instanceof ReferenceError;
        if (isReferenced) {
            e.message = `${e.message} , Did you forget \`ctx.\` ?`;
        }
        throw e;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvcGFyc2Utb2JqZWN0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0ZXBPcHRpb25zLCBXb3JrZmxvd09wdGlvbnMgfSBmcm9tIFwiLi9pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tIFwiLi9pbnRlcm5hbC1pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7IHRlbXBsYXRlIH0gZnJvbSBcIi4vdXRpbHMvdGVtcGxhdGUudHNcIjtcbmltcG9ydCBtYXBPYmplY3QgZnJvbSBcIi4vdXRpbHMvbWFwLW9iai5qc1wiO1xuaW1wb3J0IHsgaXNPYmplY3QgfSBmcm9tIFwiLi91dGlscy9vYmplY3QudHNcIjtcbmludGVyZmFjZSBPYmplY3RwYXJzZU9wdGlvbnMge1xuICBrZXlzPzogc3RyaW5nW107XG4gIGRlZmF1bHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZU9iamVjdChcbiAgc3RlcDogU3RlcE9wdGlvbnMgfCBXb3JrZmxvd09wdGlvbnMgfCBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY3R4OiBDb250ZXh0LFxuICBvcHRpb25zPzogT2JqZWN0cGFyc2VPcHRpb25zLFxuKTogUHJvbWlzZTx1bmtub3duPiB7XG4gIGNvbnN0IHsga2V5czogcmF3S2V5cywgZGVmYXVsdDogZGVmYXVsdE9wdGlvbnMgfSA9IG9wdGlvbnMgfHwge307XG4gIGNvbnN0IGtleXMgPSByYXdLZXlzIHx8IE9iamVjdC5rZXlzKHN0ZXApO1xuICAvLyBpZiBrZXlzIHByb3ZpZGVkLCBjaGVjayBpcyBpbmNsdWRlIGtleXNcblxuICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgaWYgKChrZXkgaW4gc3RlcCkpIHtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IGF3YWl0IHBhcnNlVG9wVmFsdWUoXG4gICAgICAgIChzdGVwIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtrZXldLFxuICAgICAgICBjdHgsXG4gICAgICApO1xuICAgICAgKHN0ZXAgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW2tleV0gPSBwYXJzZWQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAuLi5kZWZhdWx0T3B0aW9ucyxcbiAgICAuLi5zdGVwLFxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBwYXJzZVRvcFZhbHVlKFxuICBzdGVwOiB1bmtub3duLFxuICBjdHg6IENvbnRleHQsXG4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgdHJ5IHtcbiAgICBpZiAodHlwZW9mIHN0ZXAgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IGF3YWl0IHRlbXBsYXRlKHN0ZXAsIHtcbiAgICAgICAgY3R4OiBjdHgucHVibGljLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcGFyc2VkO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShzdGVwKSkge1xuICAgICAgY29uc3QgZmluYWxBcnJheSA9IFtdO1xuICAgICAgZm9yIChcbiAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICBpIDwgKHN0ZXAgYXMgdW5rbm93bltdKS5sZW5ndGg7XG4gICAgICAgIGkrK1xuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSAoc3RlcCBhcyB1bmtub3duW10pW2ldO1xuXG4gICAgICAgIGZpbmFsQXJyYXkucHVzaChhd2FpdCBwYXJzZVRvcFZhbHVlKGl0ZW0sIGN0eCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZpbmFsQXJyYXk7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChzdGVwKSkge1xuICAgICAgY29uc3QgcmV0dXJuZWQgPSBhd2FpdCBtYXBPYmplY3QoXG4gICAgICAgIHN0ZXAsXG4gICAgICAgIGFzeW5jIChzb3VyY2VLZXk6IHN0cmluZywgc291cmNlVmFsdWU6IHVua25vd24pID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBhd2FpdCB0ZW1wbGF0ZShzb3VyY2VWYWx1ZSwge1xuICAgICAgICAgICAgICBjdHg6IGN0eC5wdWJsaWMsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIFtzb3VyY2VLZXksIHBhcnNlZCwge1xuICAgICAgICAgICAgICBzaG91bGRSZWN1cnNlOiBmYWxzZSxcbiAgICAgICAgICAgIH1dO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2VWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgY29uc3QgZmluYWxBcnJheSA9IFtdO1xuICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNvdXJjZVZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHNvdXJjZVZhbHVlW2ldO1xuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBhd2FpdCB0ZW1wbGF0ZShpdGVtLCB7XG4gICAgICAgICAgICAgICAgICAgIGN0eDogY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgZmluYWxBcnJheS5wdXNoKHBhcnNlZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGZpbmFsQXJyYXkucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBzb3VyY2VLZXksXG4gICAgICAgICAgICAgICAgZmluYWxBcnJheSxcbiAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBbc291cmNlS2V5LCBzb3VyY2VWYWx1ZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgZGVlcDogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgICByZXR1cm4gcmV0dXJuZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzdGVwO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnN0IGlzUmVmZXJlbmNlZCA9IGUgaW5zdGFuY2VvZiBSZWZlcmVuY2VFcnJvcjtcblxuICAgIGlmIChpc1JlZmVyZW5jZWQpIHtcbiAgICAgIGUubWVzc2FnZSA9IGAke2UubWVzc2FnZX0gLCBEaWQgeW91IGZvcmdldCBcXGBjdHguXFxgID9gO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsU0FBUyxRQUFRLFFBQVEscUJBQXFCLENBQUM7QUFDL0MsT0FBTyxTQUFTLE1BQU0sb0JBQW9CLENBQUM7QUFDM0MsU0FBUyxRQUFRLFFBQVEsbUJBQW1CLENBQUM7QUFLN0MsT0FBTyxlQUFlLFdBQVcsQ0FDL0IsSUFBNkQsRUFDN0QsR0FBWSxFQUNaLE9BQTRCLEVBQ1Y7SUFDbEIsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUEsRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFBLEVBQUUsR0FBRyxPQUFPLElBQUksRUFBRSxBQUFDO0lBQ2pFLE1BQU0sSUFBSSxHQUFHLE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxBQUFDO0lBQzFDLDBDQUEwQztJQUUxQyxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBRTtRQUN0QixJQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUc7WUFDakIsTUFBTSxNQUFNLEdBQUcsTUFBTSxhQUFhLENBQ2hDLEFBQUMsSUFBSSxBQUE0QixDQUFDLEdBQUcs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