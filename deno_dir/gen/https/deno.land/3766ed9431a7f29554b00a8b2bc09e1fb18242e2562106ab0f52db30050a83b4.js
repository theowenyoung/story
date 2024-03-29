// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { State } from "../state.ts";
export class LoaderState extends State {
    documents;
    length;
    lineIndent;
    lineStart;
    position;
    line;
    filename;
    onWarning;
    legacy;
    json;
    listener;
    implicitTypes;
    typeMap;
    version;
    checkLineBreaks;
    tagMap;
    anchorMap;
    tag;
    anchor;
    kind;
    result;
    constructor(input, { filename , schema , onWarning , legacy =false , json =false , listener =null  }){
        super(schema);
        this.input = input;
        this.documents = [];
        this.lineIndent = 0;
        this.lineStart = 0;
        this.position = 0;
        this.line = 0;
        this.result = "";
        this.filename = filename;
        this.onWarning = onWarning;
        this.legacy = legacy;
        this.json = json;
        this.listener = listener;
        this.implicitTypes = this.schema.compiledImplicit;
        this.typeMap = this.schema.compiledTypeMap;
        this.length = input.length;
    }
    input;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2VuY29kaW5nL195YW1sL2xvYWRlci9sb2FkZXJfc3RhdGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gUG9ydGVkIGZyb20ganMteWFtbCB2My4xMy4xOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVjYS9qcy15YW1sL2NvbW1pdC82NjVhYWRkYTQyMzQ5ZGNhZTg2OWYxMjA0MGQ5YjEwZWYxOGQxMmRhXG4vLyBDb3B5cmlnaHQgMjAxMS0yMDE1IGJ5IFZpdGFseSBQdXpyaW4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuaW1wb3J0IHR5cGUgeyBZQU1MRXJyb3IgfSBmcm9tIFwiLi4vZXJyb3IudHNcIjtcbmltcG9ydCB0eXBlIHsgU2NoZW1hLCBTY2hlbWFEZWZpbml0aW9uLCBUeXBlTWFwIH0gZnJvbSBcIi4uL3NjaGVtYS50c1wiO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tIFwiLi4vc3RhdGUudHNcIjtcbmltcG9ydCB0eXBlIHsgVHlwZSB9IGZyb20gXCIuLi90eXBlLnRzXCI7XG5pbXBvcnQgdHlwZSB7IEFueSwgQXJyYXlPYmplY3QgfSBmcm9tIFwiLi4vdXRpbHMudHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBMb2FkZXJTdGF0ZU9wdGlvbnMge1xuICBsZWdhY3k/OiBib29sZWFuO1xuICBsaXN0ZW5lcj86ICgoLi4uYXJnczogQW55W10pID0+IHZvaWQpIHwgbnVsbDtcbiAgLyoqIHN0cmluZyB0byBiZSB1c2VkIGFzIGEgZmlsZSBwYXRoIGluIGVycm9yL3dhcm5pbmcgbWVzc2FnZXMuICovXG4gIGZpbGVuYW1lPzogc3RyaW5nO1xuICAvKiogc3BlY2lmaWVzIGEgc2NoZW1hIHRvIHVzZS4gKi9cbiAgc2NoZW1hPzogU2NoZW1hRGVmaW5pdGlvbjtcbiAgLyoqIGNvbXBhdGliaWxpdHkgd2l0aCBKU09OLnBhcnNlIGJlaGF2aW91ci4gKi9cbiAganNvbj86IGJvb2xlYW47XG4gIC8qKiBmdW5jdGlvbiB0byBjYWxsIG9uIHdhcm5pbmcgbWVzc2FnZXMuICovXG4gIG9uV2FybmluZz8odGhpczogbnVsbCwgZT86IFlBTUxFcnJvcik6IHZvaWQ7XG59XG5cbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5leHBvcnQgdHlwZSBSZXN1bHRUeXBlID0gYW55W10gfCBSZWNvcmQ8c3RyaW5nLCBhbnk+IHwgc3RyaW5nO1xuXG5leHBvcnQgY2xhc3MgTG9hZGVyU3RhdGUgZXh0ZW5kcyBTdGF0ZSB7XG4gIHB1YmxpYyBkb2N1bWVudHM6IEFueVtdID0gW107XG4gIHB1YmxpYyBsZW5ndGg6IG51bWJlcjtcbiAgcHVibGljIGxpbmVJbmRlbnQgPSAwO1xuICBwdWJsaWMgbGluZVN0YXJ0ID0gMDtcbiAgcHVibGljIHBvc2l0aW9uID0gMDtcbiAgcHVibGljIGxpbmUgPSAwO1xuICBwdWJsaWMgZmlsZW5hbWU/OiBzdHJpbmc7XG4gIHB1YmxpYyBvbldhcm5pbmc/OiAoLi4uYXJnczogQW55W10pID0+IHZvaWQ7XG4gIHB1YmxpYyBsZWdhY3k6IGJvb2xlYW47XG4gIHB1YmxpYyBqc29uOiBib29sZWFuO1xuICBwdWJsaWMgbGlzdGVuZXI/OiAoKC4uLmFyZ3M6IEFueVtdKSA9PiB2b2lkKSB8IG51bGw7XG4gIHB1YmxpYyBpbXBsaWNpdFR5cGVzOiBUeXBlW107XG4gIHB1YmxpYyB0eXBlTWFwOiBUeXBlTWFwO1xuXG4gIHB1YmxpYyB2ZXJzaW9uPzogc3RyaW5nIHwgbnVsbDtcbiAgcHVibGljIGNoZWNrTGluZUJyZWFrcz86IGJvb2xlYW47XG4gIHB1YmxpYyB0YWdNYXA/OiBBcnJheU9iamVjdDtcbiAgcHVibGljIGFuY2hvck1hcD86IEFycmF5T2JqZWN0O1xuICBwdWJsaWMgdGFnPzogc3RyaW5nIHwgbnVsbDtcbiAgcHVibGljIGFuY2hvcj86IHN0cmluZyB8IG51bGw7XG4gIHB1YmxpYyBraW5kPzogc3RyaW5nIHwgbnVsbDtcbiAgcHVibGljIHJlc3VsdDogUmVzdWx0VHlwZSB8IG51bGwgPSBcIlwiO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBpbnB1dDogc3RyaW5nLFxuICAgIHtcbiAgICAgIGZpbGVuYW1lLFxuICAgICAgc2NoZW1hLFxuICAgICAgb25XYXJuaW5nLFxuICAgICAgbGVnYWN5ID0gZmFsc2UsXG4gICAgICBqc29uID0gZmFsc2UsXG4gICAgICBsaXN0ZW5lciA9IG51bGwsXG4gICAgfTogTG9hZGVyU3RhdGVPcHRpb25zLFxuICApIHtcbiAgICBzdXBlcihzY2hlbWEpO1xuICAgIHRoaXMuZmlsZW5hbWUgPSBmaWxlbmFtZTtcbiAgICB0aGlzLm9uV2FybmluZyA9IG9uV2FybmluZztcbiAgICB0aGlzLmxlZ2FjeSA9IGxlZ2FjeTtcbiAgICB0aGlzLmpzb24gPSBqc29uO1xuICAgIHRoaXMubGlzdGVuZXIgPSBsaXN0ZW5lcjtcblxuICAgIHRoaXMuaW1wbGljaXRUeXBlcyA9ICh0aGlzLnNjaGVtYSBhcyBTY2hlbWEpLmNvbXBpbGVkSW1wbGljaXQ7XG4gICAgdGhpcy50eXBlTWFwID0gKHRoaXMuc2NoZW1hIGFzIFNjaGVtYSkuY29tcGlsZWRUeXBlTWFwO1xuXG4gICAgdGhpcy5sZW5ndGggPSBpbnB1dC5sZW5ndGg7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwrQkFBK0I7QUFDL0Isb0ZBQW9GO0FBQ3BGLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFJMUUsU0FBUyxLQUFLLFFBQVEsY0FBYztBQW9CcEMsT0FBTyxNQUFNLG9CQUFvQjtJQUN4QixVQUFzQjtJQUN0QixPQUFlO0lBQ2YsV0FBZTtJQUNmLFVBQWM7SUFDZCxTQUFhO0lBQ2IsS0FBUztJQUNULFNBQWtCO0lBQ2xCLFVBQXFDO0lBQ3JDLE9BQWdCO0lBQ2hCLEtBQWM7SUFDZCxTQUE2QztJQUM3QyxjQUFzQjtJQUN0QixRQUFpQjtJQUVqQixRQUF3QjtJQUN4QixnQkFBMEI7SUFDMUIsT0FBcUI7SUFDckIsVUFBd0I7SUFDeEIsSUFBb0I7SUFDcEIsT0FBdUI7SUFDdkIsS0FBcUI7SUFDckIsT0FBK0I7SUFFdEMsWUFDUyxPQUNQLEVBQ0UsU0FBUSxFQUNSLE9BQU0sRUFDTixVQUFTLEVBQ1QsUUFBUyxLQUFLLENBQUEsRUFDZCxNQUFPLEtBQUssQ0FBQSxFQUNaLFVBQVcsSUFBSSxDQUFBLEVBQ0ksQ0FDckI7UUFDQSxLQUFLLENBQUM7cUJBVkM7YUF4QkYsWUFBbUIsRUFBRTthQUVyQixhQUFhO2FBQ2IsWUFBWTthQUNaLFdBQVc7YUFDWCxPQUFPO2FBZ0JQLFNBQTRCO1FBY2pDLElBQUksQ0FBQyxRQUFRLEdBQUc7UUFDaEIsSUFBSSxDQUFDLFNBQVMsR0FBRztRQUNqQixJQUFJLENBQUMsTUFBTSxHQUFHO1FBQ2QsSUFBSSxDQUFDLElBQUksR0FBRztRQUNaLElBQUksQ0FBQyxRQUFRLEdBQUc7UUFFaEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxBQUFDLElBQUksQ0FBQyxNQUFNLENBQVksZ0JBQWdCO1FBQzdELElBQUksQ0FBQyxPQUFPLEdBQUcsQUFBQyxJQUFJLENBQUMsTUFBTSxDQUFZLGVBQWU7UUFFdEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLE1BQU07SUFDNUI7SUFyQlM7QUFzQlgsQ0FBQyJ9