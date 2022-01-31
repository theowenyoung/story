import { ModuleCache } from "https://deno.land/x/module_cache@0.0.1/mod.ts";
const cache = new ModuleCache("keydb");
export var Adapters;
(function (Adapters) {
    function getAll() {
        return cache.get("adapters") || [];
    }
    Adapters.getAll = getAll;
    function get(protocol) {
        return getAll().find((e) => e.protocol.toLowerCase() == protocol.toLowerCase());
    }
    Adapters.get = get;
    function register(adapter) {
        if (/^[A-Za-z0-9]+$/.test(adapter.protocol) === false)
            throw new Error("Bad Adapter protocol. Must have only A-Z, a-z and 0-9.");
        const adapters = getAll();
        if (adapters.find((e) => e.protocol.toLowerCase() == adapter.protocol.toLowerCase()))
            throw new Error("Adapter with this protocol already exists");
        adapters.push(adapter);
        cache.set("adapters", adapters);
    }
    Adapters.register = register;
})(Adapters || (Adapters = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBa0M1RSxNQUFNLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUV2QyxNQUFNLEtBQVcsUUFBUSxDQXdCeEI7QUF4QkQsV0FBaUIsUUFBUTtJQUN2QixTQUFnQixNQUFNO1FBQ3BCLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUZlLGVBQU0sU0FFckIsQ0FBQTtJQUVELFNBQWdCLEdBQUcsQ0FBQyxRQUFnQjtRQUNsQyxPQUFPLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FDbEIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUMxRCxDQUFDO0lBQ0osQ0FBQztJQUplLFlBQUcsTUFJbEIsQ0FBQTtJQUVELFNBQWdCLFFBQVEsQ0FBQyxPQUEyQjtRQUNsRCxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssS0FBSztZQUNuRCxNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7UUFDNUUsTUFBTSxRQUFRLEdBQUcsTUFBTSxFQUFFLENBQUM7UUFDMUIsSUFDRSxRQUFRLENBQUMsSUFBSSxDQUNYLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQ2xFO1lBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1FBQy9ELFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQVplLGlCQUFRLFdBWXZCLENBQUE7QUFDSCxDQUFDLEVBeEJnQixRQUFRLEtBQVIsUUFBUSxRQXdCeEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb2R1bGVDYWNoZSB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC94L21vZHVsZV9jYWNoZUAwLjAuMS9tb2QudHNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgS2V5ZGJGaWVsZHMge1xyXG4gIGtleTogc3RyaW5nO1xyXG4gIHZhbHVlOiBzdHJpbmc7XHJcbiAgbnM6IHN0cmluZztcclxuICB0dGw6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBZGFwdGVyIHtcclxuICBhd2FpdFJlYWR5PzogUHJvbWlzZTxBZGFwdGVyPjtcclxuICBzZXQoXHJcbiAgICBrZXk6IHN0cmluZyxcclxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XHJcbiAgICB2YWx1ZTogYW55LFxyXG4gICAgbmFtZXNwYWNlOiBzdHJpbmcsXHJcbiAgICB0dGw6IG51bWJlclxyXG4gICk6IHRoaXMgfCBQcm9taXNlPHRoaXM+O1xyXG4gIGdldChcclxuICAgIGtleTogc3RyaW5nLFxyXG4gICAgbmFtZXNwYWNlOiBzdHJpbmdcclxuICApOiBLZXlkYkZpZWxkcyB8IHVuZGVmaW5lZCB8IFByb21pc2U8S2V5ZGJGaWVsZHMgfCB1bmRlZmluZWQ+O1xyXG4gIGRlbGV0ZShrZXk6IHN0cmluZywgbmFtZXNwYWNlOiBzdHJpbmcpOiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPjtcclxuICBoYXMoa2V5OiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nKTogYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj47XHJcbiAgY2xlYXIobmFtZXNwYWNlOiBzdHJpbmcpOiB0aGlzIHwgUHJvbWlzZTx0aGlzPjtcclxuICBrZXlzKG5hbWVzcGFjZTogc3RyaW5nKTogc3RyaW5nW10gfCBQcm9taXNlPHN0cmluZ1tdPjtcclxuICBkZWxldGVFeHBpcmVkKG5hbWVzcGFjZTogc3RyaW5nKTogdm9pZCB8IFByb21pc2U8dm9pZD47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQWRhcHRlckluaXRpYWxpemVyIHtcclxuICBwcm90b2NvbDogc3RyaW5nO1xyXG4gIGluaXQ6ICh1cmk6IFVSTCkgPT4gQWRhcHRlciB8IFByb21pc2U8QWRhcHRlcj47XHJcbn1cclxuXHJcbmNvbnN0IGNhY2hlID0gbmV3IE1vZHVsZUNhY2hlKFwia2V5ZGJcIik7XHJcbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tbmFtZXNwYWNlXHJcbmV4cG9ydCBuYW1lc3BhY2UgQWRhcHRlcnMge1xyXG4gIGV4cG9ydCBmdW5jdGlvbiBnZXRBbGwoKTogQWRhcHRlckluaXRpYWxpemVyW10ge1xyXG4gICAgcmV0dXJuIGNhY2hlLmdldChcImFkYXB0ZXJzXCIpIHx8IFtdO1xyXG4gIH1cclxuXHJcbiAgZXhwb3J0IGZ1bmN0aW9uIGdldChwcm90b2NvbDogc3RyaW5nKTogQWRhcHRlckluaXRpYWxpemVyIHwgdW5kZWZpbmVkIHtcclxuICAgIHJldHVybiBnZXRBbGwoKS5maW5kKFxyXG4gICAgICAoZSkgPT4gZS5wcm90b2NvbC50b0xvd2VyQ2FzZSgpID09IHByb3RvY29sLnRvTG93ZXJDYXNlKClcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBleHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXIoYWRhcHRlcjogQWRhcHRlckluaXRpYWxpemVyKTogdm9pZCB7XHJcbiAgICBpZiAoL15bQS1aYS16MC05XSskLy50ZXN0KGFkYXB0ZXIucHJvdG9jb2wpID09PSBmYWxzZSlcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQmFkIEFkYXB0ZXIgcHJvdG9jb2wuIE11c3QgaGF2ZSBvbmx5IEEtWiwgYS16IGFuZCAwLTkuXCIpO1xyXG4gICAgY29uc3QgYWRhcHRlcnMgPSBnZXRBbGwoKTtcclxuICAgIGlmIChcclxuICAgICAgYWRhcHRlcnMuZmluZChcclxuICAgICAgICAoZSkgPT4gZS5wcm90b2NvbC50b0xvd2VyQ2FzZSgpID09IGFkYXB0ZXIucHJvdG9jb2wudG9Mb3dlckNhc2UoKVxyXG4gICAgICApXHJcbiAgICApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkFkYXB0ZXIgd2l0aCB0aGlzIHByb3RvY29sIGFscmVhZHkgZXhpc3RzXCIpO1xyXG4gICAgYWRhcHRlcnMucHVzaChhZGFwdGVyKTtcclxuICAgIGNhY2hlLnNldChcImFkYXB0ZXJzXCIsIGFkYXB0ZXJzKTtcclxuICB9XHJcbn1cclxuIl19