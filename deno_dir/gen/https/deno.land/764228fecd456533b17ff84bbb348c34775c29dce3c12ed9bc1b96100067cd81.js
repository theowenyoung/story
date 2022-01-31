import { State } from "../state.ts";
const { hasOwn } = Object;
function compileStyleMap(schema, map) {
    if (typeof map === "undefined" || map === null)
        return {};
    let type;
    const result = {};
    const keys = Object.keys(map);
    let tag, style;
    for (let index = 0, length = keys.length; index < length; index += 1) {
        tag = keys[index];
        style = String(map[tag]);
        if (tag.slice(0, 2) === "!!") {
            tag = `tag:yaml.org,2002:${tag.slice(2)}`;
        }
        type = schema.compiledTypeMap.fallback[tag];
        if (type &&
            typeof type.styleAliases !== "undefined" &&
            hasOwn(type.styleAliases, style)) {
            style = type.styleAliases[style];
        }
        result[tag] = style;
    }
    return result;
}
export class DumperState extends State {
    indent;
    noArrayIndent;
    skipInvalid;
    flowLevel;
    sortKeys;
    lineWidth;
    noRefs;
    noCompatMode;
    condenseFlow;
    implicitTypes;
    explicitTypes;
    tag = null;
    result = "";
    duplicates = [];
    usedDuplicates = [];
    styleMap;
    dump;
    constructor({ schema, indent = 2, noArrayIndent = false, skipInvalid = false, flowLevel = -1, styles = null, sortKeys = false, lineWidth = 80, noRefs = false, noCompatMode = false, condenseFlow = false, }) {
        super(schema);
        this.indent = Math.max(1, indent);
        this.noArrayIndent = noArrayIndent;
        this.skipInvalid = skipInvalid;
        this.flowLevel = flowLevel;
        this.styleMap = compileStyleMap(this.schema, styles);
        this.sortKeys = sortKeys;
        this.lineWidth = lineWidth;
        this.noRefs = noRefs;
        this.noCompatMode = noCompatMode;
        this.condenseFlow = condenseFlow;
        this.implicitTypes = this.schema.compiledImplicit;
        this.explicitTypes = this.schema.compiledExplicit;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHVtcGVyX3N0YXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZHVtcGVyX3N0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU1BLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFJcEMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQztBQUUxQixTQUFTLGVBQWUsQ0FDdEIsTUFBYyxFQUNkLEdBQXNDO0lBRXRDLElBQUksT0FBTyxHQUFHLEtBQUssV0FBVyxJQUFJLEdBQUcsS0FBSyxJQUFJO1FBQUUsT0FBTyxFQUFFLENBQUM7SUFFMUQsSUFBSSxJQUFVLENBQUM7SUFDZixNQUFNLE1BQU0sR0FBOEIsRUFBRSxDQUFDO0lBQzdDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDOUIsSUFBSSxHQUFXLEVBQUUsS0FBbUIsQ0FBQztJQUNyQyxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEdBQUcsTUFBTSxFQUFFLEtBQUssSUFBSSxDQUFDLEVBQUU7UUFDcEUsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsQixLQUFLLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBaUIsQ0FBQztRQUN6QyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUM1QixHQUFHLEdBQUcscUJBQXFCLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztTQUMzQztRQUNELElBQUksR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUU1QyxJQUNFLElBQUk7WUFDSixPQUFPLElBQUksQ0FBQyxZQUFZLEtBQUssV0FBVztZQUN4QyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsRUFDaEM7WUFDQSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNsQztRQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7S0FDckI7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBbURELE1BQU0sT0FBTyxXQUFZLFNBQVEsS0FBSztJQUM3QixNQUFNLENBQVM7SUFDZixhQUFhLENBQVU7SUFDdkIsV0FBVyxDQUFVO0lBQ3JCLFNBQVMsQ0FBUztJQUNsQixRQUFRLENBQXlDO0lBQ2pELFNBQVMsQ0FBUztJQUNsQixNQUFNLENBQVU7SUFDaEIsWUFBWSxDQUFVO0lBQ3RCLFlBQVksQ0FBVTtJQUN0QixhQUFhLENBQVM7SUFDdEIsYUFBYSxDQUFTO0lBQ3RCLEdBQUcsR0FBa0IsSUFBSSxDQUFDO0lBQzFCLE1BQU0sR0FBRyxFQUFFLENBQUM7SUFDWixVQUFVLEdBQVUsRUFBRSxDQUFDO0lBQ3ZCLGNBQWMsR0FBVSxFQUFFLENBQUM7SUFDM0IsUUFBUSxDQUE0QjtJQUNwQyxJQUFJLENBQU07SUFFakIsWUFBWSxFQUNWLE1BQU0sRUFDTixNQUFNLEdBQUcsQ0FBQyxFQUNWLGFBQWEsR0FBRyxLQUFLLEVBQ3JCLFdBQVcsR0FBRyxLQUFLLEVBQ25CLFNBQVMsR0FBRyxDQUFDLENBQUMsRUFDZCxNQUFNLEdBQUcsSUFBSSxFQUNiLFFBQVEsR0FBRyxLQUFLLEVBQ2hCLFNBQVMsR0FBRyxFQUFFLEVBQ2QsTUFBTSxHQUFHLEtBQUssRUFDZCxZQUFZLEdBQUcsS0FBSyxFQUNwQixZQUFZLEdBQUcsS0FBSyxHQUNEO1FBQ25CLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNkLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFFakMsSUFBSSxDQUFDLGFBQWEsR0FBSSxJQUFJLENBQUMsTUFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQztRQUM5RCxJQUFJLENBQUMsYUFBYSxHQUFJLElBQUksQ0FBQyxNQUFpQixDQUFDLGdCQUFnQixDQUFDO0lBQ2hFLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8vIFBvcnRlZCBmcm9tIGpzLXlhbWwgdjMuMTMuMTpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlY2EvanMteWFtbC9jb21taXQvNjY1YWFkZGE0MjM0OWRjYWU4NjlmMTIwNDBkOWIxMGVmMThkMTJkYVxuLy8gQ29weXJpZ2h0IDIwMTEtMjAxNSBieSBWaXRhbHkgUHV6cmluLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbmltcG9ydCB0eXBlIHsgU2NoZW1hLCBTY2hlbWFEZWZpbml0aW9uIH0gZnJvbSBcIi4uL3NjaGVtYS50c1wiO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tIFwiLi4vc3RhdGUudHNcIjtcbmltcG9ydCB0eXBlIHsgU3R5bGVWYXJpYW50LCBUeXBlIH0gZnJvbSBcIi4uL3R5cGUudHNcIjtcbmltcG9ydCB0eXBlIHsgQW55LCBBcnJheU9iamVjdCB9IGZyb20gXCIuLi91dGlscy50c1wiO1xuXG5jb25zdCB7IGhhc093biB9ID0gT2JqZWN0O1xuXG5mdW5jdGlvbiBjb21waWxlU3R5bGVNYXAoXG4gIHNjaGVtYTogU2NoZW1hLFxuICBtYXA/OiBBcnJheU9iamVjdDxTdHlsZVZhcmlhbnQ+IHwgbnVsbCxcbik6IEFycmF5T2JqZWN0PFN0eWxlVmFyaWFudD4ge1xuICBpZiAodHlwZW9mIG1hcCA9PT0gXCJ1bmRlZmluZWRcIiB8fCBtYXAgPT09IG51bGwpIHJldHVybiB7fTtcblxuICBsZXQgdHlwZTogVHlwZTtcbiAgY29uc3QgcmVzdWx0OiBBcnJheU9iamVjdDxTdHlsZVZhcmlhbnQ+ID0ge307XG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhtYXApO1xuICBsZXQgdGFnOiBzdHJpbmcsIHN0eWxlOiBTdHlsZVZhcmlhbnQ7XG4gIGZvciAobGV0IGluZGV4ID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgdGFnID0ga2V5c1tpbmRleF07XG4gICAgc3R5bGUgPSBTdHJpbmcobWFwW3RhZ10pIGFzIFN0eWxlVmFyaWFudDtcbiAgICBpZiAodGFnLnNsaWNlKDAsIDIpID09PSBcIiEhXCIpIHtcbiAgICAgIHRhZyA9IGB0YWc6eWFtbC5vcmcsMjAwMjoke3RhZy5zbGljZSgyKX1gO1xuICAgIH1cbiAgICB0eXBlID0gc2NoZW1hLmNvbXBpbGVkVHlwZU1hcC5mYWxsYmFja1t0YWddO1xuXG4gICAgaWYgKFxuICAgICAgdHlwZSAmJlxuICAgICAgdHlwZW9mIHR5cGUuc3R5bGVBbGlhc2VzICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICBoYXNPd24odHlwZS5zdHlsZUFsaWFzZXMsIHN0eWxlKVxuICAgICkge1xuICAgICAgc3R5bGUgPSB0eXBlLnN0eWxlQWxpYXNlc1tzdHlsZV07XG4gICAgfVxuXG4gICAgcmVzdWx0W3RhZ10gPSBzdHlsZTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRHVtcGVyU3RhdGVPcHRpb25zIHtcbiAgLyoqIGluZGVudGF0aW9uIHdpZHRoIHRvIHVzZSAoaW4gc3BhY2VzKS4gKi9cbiAgaW5kZW50PzogbnVtYmVyO1xuICAvKiogd2hlbiB0cnVlLCB3aWxsIG5vdCBhZGQgYW4gaW5kZW50YXRpb24gbGV2ZWwgdG8gYXJyYXkgZWxlbWVudHMgKi9cbiAgbm9BcnJheUluZGVudD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBkbyBub3QgdGhyb3cgb24gaW52YWxpZCB0eXBlcyAobGlrZSBmdW5jdGlvbiBpbiB0aGUgc2FmZSBzY2hlbWEpXG4gICAqIGFuZCBza2lwIHBhaXJzIGFuZCBzaW5nbGUgdmFsdWVzIHdpdGggc3VjaCB0eXBlcy5cbiAgICovXG4gIHNraXBJbnZhbGlkPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIHNwZWNpZmllcyBsZXZlbCBvZiBuZXN0aW5nLCB3aGVuIHRvIHN3aXRjaCBmcm9tXG4gICAqIGJsb2NrIHRvIGZsb3cgc3R5bGUgZm9yIGNvbGxlY3Rpb25zLiAtMSBtZWFucyBibG9jayBzdHlsZSBldmVyeXdoZXJlXG4gICAqL1xuICBmbG93TGV2ZWw/OiBudW1iZXI7XG4gIC8qKiBFYWNoIHRhZyBtYXkgaGF2ZSBvd24gc2V0IG9mIHN0eWxlcy5cdC0gXCJ0YWdcIiA9PiBcInN0eWxlXCIgbWFwLiAqL1xuICBzdHlsZXM/OiBBcnJheU9iamVjdDxTdHlsZVZhcmlhbnQ+IHwgbnVsbDtcbiAgLyoqIHNwZWNpZmllcyBhIHNjaGVtYSB0byB1c2UuICovXG4gIHNjaGVtYT86IFNjaGVtYURlZmluaXRpb247XG4gIC8qKlxuICAgKiBJZiB0cnVlLCBzb3J0IGtleXMgd2hlbiBkdW1waW5nIFlBTUwgaW4gYXNjZW5kaW5nLCBBU0NJSSBjaGFyYWN0ZXIgb3JkZXIuXG4gICAqIElmIGEgZnVuY3Rpb24sIHVzZSB0aGUgZnVuY3Rpb24gdG8gc29ydCB0aGUga2V5cy4gKGRlZmF1bHQ6IGZhbHNlKVxuICAgKiBJZiBhIGZ1bmN0aW9uIGlzIHNwZWNpZmllZCwgdGhlIGZ1bmN0aW9uIG11c3QgcmV0dXJuIGEgbmVnYXRpdmUgdmFsdWVcbiAgICogaWYgZmlyc3QgYXJndW1lbnQgaXMgbGVzcyB0aGFuIHNlY29uZCBhcmd1bWVudCwgemVybyBpZiB0aGV5J3JlIGVxdWFsXG4gICAqIGFuZCBhIHBvc2l0aXZlIHZhbHVlIG90aGVyd2lzZS5cbiAgICovXG4gIHNvcnRLZXlzPzogYm9vbGVhbiB8ICgoYTogc3RyaW5nLCBiOiBzdHJpbmcpID0+IG51bWJlcik7XG4gIC8qKiBzZXQgbWF4IGxpbmUgd2lkdGguIChkZWZhdWx0OiA4MCkgKi9cbiAgbGluZVdpZHRoPzogbnVtYmVyO1xuICAvKipcbiAgICogaWYgdHJ1ZSwgZG9uJ3QgY29udmVydCBkdXBsaWNhdGUgb2JqZWN0c1xuICAgKiBpbnRvIHJlZmVyZW5jZXMgKGRlZmF1bHQ6IGZhbHNlKVxuICAgKi9cbiAgbm9SZWZzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIGlmIHRydWUgZG9uJ3QgdHJ5IHRvIGJlIGNvbXBhdGlibGUgd2l0aCBvbGRlciB5YW1sIHZlcnNpb25zLlxuICAgKiBDdXJyZW50bHk6IGRvbid0IHF1b3RlIFwieWVzXCIsIFwibm9cIiBhbmQgc28gb24sXG4gICAqIGFzIHJlcXVpcmVkIGZvciBZQU1MIDEuMSAoZGVmYXVsdDogZmFsc2UpXG4gICAqL1xuICBub0NvbXBhdE1vZGU/OiBib29sZWFuO1xuICAvKipcbiAgICogaWYgdHJ1ZSBmbG93IHNlcXVlbmNlcyB3aWxsIGJlIGNvbmRlbnNlZCwgb21pdHRpbmcgdGhlXG4gICAqIHNwYWNlIGJldHdlZW4gYGtleTogdmFsdWVgIG9yIGBhLCBiYC4gRWcuIGAnW2EsYl0nYCBvciBge2E6e2I6Y319YC5cbiAgICogQ2FuIGJlIHVzZWZ1bCB3aGVuIHVzaW5nIHlhbWwgZm9yIHByZXR0eSBVUkwgcXVlcnkgcGFyYW1zXG4gICAqIGFzIHNwYWNlcyBhcmUgJS1lbmNvZGVkLiAoZGVmYXVsdDogZmFsc2UpLlxuICAgKi9cbiAgY29uZGVuc2VGbG93PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIER1bXBlclN0YXRlIGV4dGVuZHMgU3RhdGUge1xuICBwdWJsaWMgaW5kZW50OiBudW1iZXI7XG4gIHB1YmxpYyBub0FycmF5SW5kZW50OiBib29sZWFuO1xuICBwdWJsaWMgc2tpcEludmFsaWQ6IGJvb2xlYW47XG4gIHB1YmxpYyBmbG93TGV2ZWw6IG51bWJlcjtcbiAgcHVibGljIHNvcnRLZXlzOiBib29sZWFuIHwgKChhOiBBbnksIGI6IEFueSkgPT4gbnVtYmVyKTtcbiAgcHVibGljIGxpbmVXaWR0aDogbnVtYmVyO1xuICBwdWJsaWMgbm9SZWZzOiBib29sZWFuO1xuICBwdWJsaWMgbm9Db21wYXRNb2RlOiBib29sZWFuO1xuICBwdWJsaWMgY29uZGVuc2VGbG93OiBib29sZWFuO1xuICBwdWJsaWMgaW1wbGljaXRUeXBlczogVHlwZVtdO1xuICBwdWJsaWMgZXhwbGljaXRUeXBlczogVHlwZVtdO1xuICBwdWJsaWMgdGFnOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHVibGljIHJlc3VsdCA9IFwiXCI7XG4gIHB1YmxpYyBkdXBsaWNhdGVzOiBBbnlbXSA9IFtdO1xuICBwdWJsaWMgdXNlZER1cGxpY2F0ZXM6IEFueVtdID0gW107IC8vIGNoYW5nZWQgZnJvbSBudWxsIHRvIFtdXG4gIHB1YmxpYyBzdHlsZU1hcDogQXJyYXlPYmplY3Q8U3R5bGVWYXJpYW50PjtcbiAgcHVibGljIGR1bXA6IEFueTtcblxuICBjb25zdHJ1Y3Rvcih7XG4gICAgc2NoZW1hLFxuICAgIGluZGVudCA9IDIsXG4gICAgbm9BcnJheUluZGVudCA9IGZhbHNlLFxuICAgIHNraXBJbnZhbGlkID0gZmFsc2UsXG4gICAgZmxvd0xldmVsID0gLTEsXG4gICAgc3R5bGVzID0gbnVsbCxcbiAgICBzb3J0S2V5cyA9IGZhbHNlLFxuICAgIGxpbmVXaWR0aCA9IDgwLFxuICAgIG5vUmVmcyA9IGZhbHNlLFxuICAgIG5vQ29tcGF0TW9kZSA9IGZhbHNlLFxuICAgIGNvbmRlbnNlRmxvdyA9IGZhbHNlLFxuICB9OiBEdW1wZXJTdGF0ZU9wdGlvbnMpIHtcbiAgICBzdXBlcihzY2hlbWEpO1xuICAgIHRoaXMuaW5kZW50ID0gTWF0aC5tYXgoMSwgaW5kZW50KTtcbiAgICB0aGlzLm5vQXJyYXlJbmRlbnQgPSBub0FycmF5SW5kZW50O1xuICAgIHRoaXMuc2tpcEludmFsaWQgPSBza2lwSW52YWxpZDtcbiAgICB0aGlzLmZsb3dMZXZlbCA9IGZsb3dMZXZlbDtcbiAgICB0aGlzLnN0eWxlTWFwID0gY29tcGlsZVN0eWxlTWFwKHRoaXMuc2NoZW1hIGFzIFNjaGVtYSwgc3R5bGVzKTtcbiAgICB0aGlzLnNvcnRLZXlzID0gc29ydEtleXM7XG4gICAgdGhpcy5saW5lV2lkdGggPSBsaW5lV2lkdGg7XG4gICAgdGhpcy5ub1JlZnMgPSBub1JlZnM7XG4gICAgdGhpcy5ub0NvbXBhdE1vZGUgPSBub0NvbXBhdE1vZGU7XG4gICAgdGhpcy5jb25kZW5zZUZsb3cgPSBjb25kZW5zZUZsb3c7XG5cbiAgICB0aGlzLmltcGxpY2l0VHlwZXMgPSAodGhpcy5zY2hlbWEgYXMgU2NoZW1hKS5jb21waWxlZEltcGxpY2l0O1xuICAgIHRoaXMuZXhwbGljaXRUeXBlcyA9ICh0aGlzLnNjaGVtYSBhcyBTY2hlbWEpLmNvbXBpbGVkRXhwbGljaXQ7XG4gIH1cbn1cbiJdfQ==