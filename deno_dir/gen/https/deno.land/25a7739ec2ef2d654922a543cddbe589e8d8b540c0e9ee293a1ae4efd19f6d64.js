const DEFAULT_RESOLVE = ()=>true;
const DEFAULT_CONSTRUCT = (data)=>data;
function checkTagFormat(tag) {
    return tag;
}
export class Type {
    tag;
    kind = null;
    instanceOf;
    predicate;
    represent;
    defaultStyle;
    styleAliases;
    loadKind;
    constructor(tag, options){
        this.tag = checkTagFormat(tag);
        if (options) {
            this.kind = options.kind;
            this.resolve = options.resolve || DEFAULT_RESOLVE;
            this.construct = options.construct || DEFAULT_CONSTRUCT;
            this.instanceOf = options.instanceOf;
            this.predicate = options.predicate;
            this.represent = options.represent;
            this.defaultStyle = options.defaultStyle;
            this.styleAliases = options.styleAliases;
        }
    }
    resolve = ()=>true;
    construct = (data)=>data;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2VuY29kaW5nL195YW1sL3R5cGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gUG9ydGVkIGZyb20ganMteWFtbCB2My4xMy4xOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVjYS9qcy15YW1sL2NvbW1pdC82NjVhYWRkYTQyMzQ5ZGNhZTg2OWYxMjA0MGQ5YjEwZWYxOGQxMmRhXG4vLyBDb3B5cmlnaHQgMjAxMS0yMDE1IGJ5IFZpdGFseSBQdXpyaW4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuaW1wb3J0IHR5cGUgeyBBbnksIEFycmF5T2JqZWN0IH0gZnJvbSBcIi4vdXRpbHMudHNcIjtcblxuZXhwb3J0IHR5cGUgS2luZFR5cGUgPSBcInNlcXVlbmNlXCIgfCBcInNjYWxhclwiIHwgXCJtYXBwaW5nXCI7XG5leHBvcnQgdHlwZSBTdHlsZVZhcmlhbnQgPSBcImxvd2VyY2FzZVwiIHwgXCJ1cHBlcmNhc2VcIiB8IFwiY2FtZWxjYXNlXCIgfCBcImRlY2ltYWxcIjtcbmV4cG9ydCB0eXBlIFJlcHJlc2VudEZuID0gKGRhdGE6IEFueSwgc3R5bGU/OiBTdHlsZVZhcmlhbnQpID0+IEFueTtcblxuY29uc3QgREVGQVVMVF9SRVNPTFZFID0gKCk6IGJvb2xlYW4gPT4gdHJ1ZTtcbmNvbnN0IERFRkFVTFRfQ09OU1RSVUNUID0gKGRhdGE6IEFueSk6IEFueSA9PiBkYXRhO1xuXG5pbnRlcmZhY2UgVHlwZU9wdGlvbnMge1xuICBraW5kOiBLaW5kVHlwZTtcbiAgcmVzb2x2ZT86IChkYXRhOiBBbnkpID0+IGJvb2xlYW47XG4gIGNvbnN0cnVjdD86IChkYXRhOiBzdHJpbmcpID0+IEFueTtcbiAgaW5zdGFuY2VPZj86IEFueTtcbiAgcHJlZGljYXRlPzogKGRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSA9PiBib29sZWFuO1xuICByZXByZXNlbnQ/OiBSZXByZXNlbnRGbiB8IEFycmF5T2JqZWN0PFJlcHJlc2VudEZuPjtcbiAgZGVmYXVsdFN0eWxlPzogU3R5bGVWYXJpYW50O1xuICBzdHlsZUFsaWFzZXM/OiBBcnJheU9iamVjdDtcbn1cblxuZnVuY3Rpb24gY2hlY2tUYWdGb3JtYXQodGFnOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdGFnO1xufVxuXG5leHBvcnQgY2xhc3MgVHlwZSB7XG4gIHB1YmxpYyB0YWc6IHN0cmluZztcbiAgcHVibGljIGtpbmQ6IEtpbmRUeXBlIHwgbnVsbCA9IG51bGw7XG4gIHB1YmxpYyBpbnN0YW5jZU9mOiBBbnk7XG4gIHB1YmxpYyBwcmVkaWNhdGU/OiAoZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IGJvb2xlYW47XG4gIHB1YmxpYyByZXByZXNlbnQ/OiBSZXByZXNlbnRGbiB8IEFycmF5T2JqZWN0PFJlcHJlc2VudEZuPjtcbiAgcHVibGljIGRlZmF1bHRTdHlsZT86IFN0eWxlVmFyaWFudDtcbiAgcHVibGljIHN0eWxlQWxpYXNlcz86IEFycmF5T2JqZWN0O1xuICBwdWJsaWMgbG9hZEtpbmQ/OiBLaW5kVHlwZTtcblxuICBjb25zdHJ1Y3Rvcih0YWc6IHN0cmluZywgb3B0aW9ucz86IFR5cGVPcHRpb25zKSB7XG4gICAgdGhpcy50YWcgPSBjaGVja1RhZ0Zvcm1hdCh0YWcpO1xuICAgIGlmIChvcHRpb25zKSB7XG4gICAgICB0aGlzLmtpbmQgPSBvcHRpb25zLmtpbmQ7XG4gICAgICB0aGlzLnJlc29sdmUgPSBvcHRpb25zLnJlc29sdmUgfHwgREVGQVVMVF9SRVNPTFZFO1xuICAgICAgdGhpcy5jb25zdHJ1Y3QgPSBvcHRpb25zLmNvbnN0cnVjdCB8fCBERUZBVUxUX0NPTlNUUlVDVDtcbiAgICAgIHRoaXMuaW5zdGFuY2VPZiA9IG9wdGlvbnMuaW5zdGFuY2VPZjtcbiAgICAgIHRoaXMucHJlZGljYXRlID0gb3B0aW9ucy5wcmVkaWNhdGU7XG4gICAgICB0aGlzLnJlcHJlc2VudCA9IG9wdGlvbnMucmVwcmVzZW50O1xuICAgICAgdGhpcy5kZWZhdWx0U3R5bGUgPSBvcHRpb25zLmRlZmF1bHRTdHlsZTtcbiAgICAgIHRoaXMuc3R5bGVBbGlhc2VzID0gb3B0aW9ucy5zdHlsZUFsaWFzZXM7XG4gICAgfVxuICB9XG4gIHB1YmxpYyByZXNvbHZlOiAoZGF0YT86IEFueSkgPT4gYm9vbGVhbiA9ICgpOiBib29sZWFuID0+IHRydWU7XG4gIHB1YmxpYyBjb25zdHJ1Y3Q6IChkYXRhPzogQW55KSA9PiBBbnkgPSAoZGF0YSk6IEFueSA9PiBkYXRhO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVdBLE1BQU0sZUFBZSxHQUFHLElBQWUsSUFBSSxBQUFDO0FBQzVDLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxJQUFTLEdBQVUsSUFBSSxBQUFDO0FBYW5ELFNBQVMsY0FBYyxDQUFDLEdBQVcsRUFBVTtJQUMzQyxPQUFPLEdBQUcsQ0FBQztDQUNaO0FBRUQsT0FBTyxNQUFNLElBQUk7SUFDZixBQUFPLEdBQUcsQ0FBUztJQUNuQixBQUFPLElBQUksR0FBb0IsSUFBSSxDQUFDO0lBQ3BDLEFBQU8sVUFBVSxDQUFNO0lBQ3ZCLEFBQU8sU0FBUyxDQUE4QztJQUM5RCxBQUFPLFNBQVMsQ0FBMEM7SUFDMUQsQUFBTyxZQUFZLENBQWdCO0lBQ25DLEFBQU8sWUFBWSxDQUFlO0lBQ2xDLEFBQU8sUUFBUSxDQUFZO0lBRTNCLFlBQVksR0FBVyxFQUFFLE9BQXFCLENBQUU7UUFDOUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsSUFBSSxPQUFPLEVBQUU7WUFDWCxJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDekIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxJQUFJLGVBQWUsQ0FBQztZQUNsRCxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLElBQUksaUJBQWlCLENBQUM7WUFDeEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7WUFDbkMsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQztTQUMxQztLQUNGO0lBQ0QsQUFBTyxPQUFPLEdBQTRCLElBQWUsSUFBSSxDQUFDO0lBQzlELEFBQU8sU0FBUyxHQUF3QixDQUFDLElBQUksR0FBVSxJQUFJLENBQUM7Q0FDN0QifQ==