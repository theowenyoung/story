import { Store } from "./json-store.ts";
import { Adapters, Keydb } from "../../deps.ts";
export class JsonStoreAdapter {
    namespaces = new Map();
    path = "data";
    constructor(path){
        this.path = path ?? this.path;
    }
    static getDataPathFromUri(uri) {
        if (!uri) {
            return undefined;
        }
        let path = uri.toString().slice(5);
        if (path.startsWith("//")) path = path.slice(2);
        return path;
    }
    checkNamespace(ns) {
        if (this.namespaces.has(ns)) {
            return;
        } else {
            this.namespaces.set(ns, new Store({
                name: `${ns}.json`,
                path: `${this.path}`
            }));
        }
    }
    ns(ns) {
        if (ns === "") {
            ns = "default-data";
        }
        this.checkNamespace(ns);
        return this.namespaces.get(ns);
    }
    // deno-lint-ignore no-explicit-any
    async set(k, v, ns = "", ttl = 0) {
        const n = this.ns(ns);
        await n.set(k, {
            value: v,
            ttl
        });
        return this;
    }
    async get(k, ns = "") {
        const n = this.ns(ns);
        const v = await n?.get(k);
        return !v ? undefined : {
            key: k,
            ns,
            value: v.value,
            ttl: v.ttl
        };
    }
    async has(k, ns = "") {
        const n = this.ns(ns);
        return await n.has(k) ?? false;
    }
    async delete(k, ns = "") {
        const n = this.ns(ns);
        return await n?.delete(k) ?? false;
    }
    async keys(ns = "") {
        const n = this.ns(ns);
        const obj = await n.toObject();
        return [
            ...Object.keys(obj) ?? []
        ];
    }
    async clear(ns = "") {
        const n = this.ns(ns);
        await n.clear();
        return this;
    }
    async deleteExpired(ns = "") {
        const obj = await this.ns(ns).toObject();
        const n = this.ns(ns);
        for (const k of Object.keys(obj)){
            const v = obj[k];
            if (v.ttl !== 0 && Date.now() > v.ttl) {
                delete obj[k];
            }
        }
        await n.set(obj);
    }
}
Adapters.register({
    protocol: "json",
    init (uri) {
        const path = JsonStoreAdapter.getDataPathFromUri(uri.toString());
        const store = new JsonStoreAdapter(path);
        return store;
    }
});
export { Keydb };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvYWRhcHRlcnMvanNvbi1zdG9yZS1hZGFwdGVyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0b3JlIH0gZnJvbSBcIi4vanNvbi1zdG9yZS50c1wiO1xuXG5pbXBvcnQgeyBBZGFwdGVyLCBBZGFwdGVycywgS2V5ZGIsIEtleWRiRmllbGRzIH0gZnJvbSBcIi4uLy4uL2RlcHMudHNcIjtcblxuZXhwb3J0IGNsYXNzIEpzb25TdG9yZUFkYXB0ZXIgaW1wbGVtZW50cyBBZGFwdGVyIHtcbiAgbmFtZXNwYWNlczogTWFwPFxuICAgIHN0cmluZyxcbiAgICBTdG9yZVxuICA+ID0gbmV3IE1hcCgpO1xuICBwYXRoID0gXCJkYXRhXCI7XG4gIGNvbnN0cnVjdG9yKHBhdGg/OiBzdHJpbmcpIHtcbiAgICB0aGlzLnBhdGggPSBwYXRoID8/IHRoaXMucGF0aDtcbiAgfVxuICBzdGF0aWMgZ2V0RGF0YVBhdGhGcm9tVXJpKHVyaTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXVyaSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgbGV0IHBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVyaS50b1N0cmluZygpLnNsaWNlKDUpO1xuICAgIGlmIChwYXRoLnN0YXJ0c1dpdGgoXCIvL1wiKSkgcGF0aCA9IHBhdGguc2xpY2UoMik7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cbiAgY2hlY2tOYW1lc3BhY2UobnM6IHN0cmluZykge1xuICAgIGlmICh0aGlzLm5hbWVzcGFjZXMuaGFzKG5zKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm5hbWVzcGFjZXMuc2V0KFxuICAgICAgICBucyxcbiAgICAgICAgbmV3IFN0b3JlKHtcbiAgICAgICAgICBuYW1lOiBgJHtuc30uanNvbmAsXG4gICAgICAgICAgcGF0aDogYCR7dGhpcy5wYXRofWAsXG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBucyhuczogc3RyaW5nKTogU3RvcmUge1xuICAgIGlmIChucyA9PT0gXCJcIikge1xuICAgICAgbnMgPSBcImRlZmF1bHQtZGF0YVwiO1xuICAgIH1cbiAgICB0aGlzLmNoZWNrTmFtZXNwYWNlKG5zKTtcbiAgICByZXR1cm4gdGhpcy5uYW1lc3BhY2VzLmdldChucykgYXMgU3RvcmU7XG4gIH1cblxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBhc3luYyBzZXQoazogc3RyaW5nLCB2OiBhbnksIG5zID0gXCJcIiwgdHRsID0gMCkge1xuICAgIGNvbnN0IG4gPSB0aGlzLm5zKG5zKTtcbiAgICBhd2FpdCBuLnNldChrLCB7IHZhbHVlOiB2LCB0dGwgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBhc3luYyBnZXQoazogc3RyaW5nLCBucyA9IFwiXCIpOiBQcm9taXNlPEtleWRiRmllbGRzIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgbiA9IHRoaXMubnMobnMpO1xuICAgIGNvbnN0IHYgPSBhd2FpdCBuPy5nZXQoayk7XG4gICAgcmV0dXJuICF2ID8gdW5kZWZpbmVkIDoge1xuICAgICAga2V5OiBrLFxuICAgICAgbnMsXG4gICAgICB2YWx1ZTogKHYgYXMgS2V5ZGJGaWVsZHMpLnZhbHVlLFxuICAgICAgdHRsOiAodiBhcyBLZXlkYkZpZWxkcykudHRsLFxuICAgIH07XG4gIH1cblxuICBhc3luYyBoYXMoazogc3RyaW5nLCBucyA9IFwiXCIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBuID0gdGhpcy5ucyhucyk7XG5cbiAgICByZXR1cm4gYXdhaXQgbi5oYXMoaykgPz8gZmFsc2U7XG4gIH1cblxuICBhc3luYyBkZWxldGUoazogc3RyaW5nLCBucyA9IFwiXCIpIHtcbiAgICBjb25zdCBuID0gdGhpcy5ucyhucyk7XG4gICAgcmV0dXJuIGF3YWl0IG4/LmRlbGV0ZShrKSA/PyBmYWxzZTtcbiAgfVxuXG4gIGFzeW5jIGtleXMobnMgPSBcIlwiKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IG4gPSB0aGlzLm5zKG5zKTtcbiAgICBjb25zdCBvYmogPSBhd2FpdCBuLnRvT2JqZWN0KCk7XG4gICAgcmV0dXJuIFsuLi4oT2JqZWN0LmtleXMob2JqKSA/PyBbXSldO1xuICB9XG5cbiAgYXN5bmMgY2xlYXIobnMgPSBcIlwiKSB7XG4gICAgY29uc3QgbiA9IHRoaXMubnMobnMpO1xuICAgIGF3YWl0IG4uY2xlYXIoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZUV4cGlyZWQobnMgPSBcIlwiKSB7XG4gICAgY29uc3Qgb2JqID0gYXdhaXQgdGhpcy5ucyhucykudG9PYmplY3QoKTtcbiAgICBjb25zdCBuID0gdGhpcy5ucyhucyk7XG4gICAgZm9yIChjb25zdCBrIG9mIE9iamVjdC5rZXlzKG9iaikpIHtcbiAgICAgIGNvbnN0IHYgPSBvYmpba10gYXMgS2V5ZGJGaWVsZHM7XG4gICAgICBpZiAoKHYudHRsKSAhPT0gMCAmJiBEYXRlLm5vdygpID4gdi50dGwpIHtcbiAgICAgICAgZGVsZXRlIG9ialtrXTtcbiAgICAgIH1cbiAgICB9XG4gICAgYXdhaXQgbi5zZXQob2JqKTtcbiAgfVxufVxuQWRhcHRlcnMucmVnaXN0ZXIoe1xuICBwcm90b2NvbDogXCJqc29uXCIsXG4gIGluaXQodXJpKSB7XG4gICAgY29uc3QgcGF0aCA9IEpzb25TdG9yZUFkYXB0ZXIuZ2V0RGF0YVBhdGhGcm9tVXJpKFxuICAgICAgdXJpLnRvU3RyaW5nKCksXG4gICAgKTtcblxuICAgIGNvbnN0IHN0b3JlID0gbmV3IEpzb25TdG9yZUFkYXB0ZXIocGF0aCk7XG4gICAgcmV0dXJuIHN0b3JlO1xuICB9LFxufSk7XG5leHBvcnQgeyBLZXlkYiB9O1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsS0FB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