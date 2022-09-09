import { DB } from "https://deno.land/x/sqlite@v2.3.2/mod.ts";
import { Adapters } from "./adapter.ts";
import { Keydb } from "./keydb.ts";
export class SqliteAdapter {
    db;
    table;
    constructor(path, table = "keydb"){
        this.db = new DB(path);
        this.table = table;
        this.query(`CREATE TABLE IF NOT EXISTS ${this.table} (key VARCHAR(255), value TEXT, ns VARCHAR(255), ttl INTEGER)`);
    }
    // deno-lint-ignore no-explicit-any
    query(sql, params = []) {
        return [
            ...this.db.query(sql, params).asObjects()
        ];
    }
    get(key, namespace = "") {
        const res = this.query(`SELECT * FROM ${this.table} WHERE key = ? AND ns = ?`, [
            key,
            namespace, 
        ])[0];
        return res;
    }
    has(key, namespace = "") {
        const res = this.query(`SELECT key FROM ${this.table} WHERE key = ? AND ns = ?`, [
            key,
            namespace
        ]);
        return res.length > 0;
    }
    // deno-lint-ignore no-explicit-any
    set(key, value, namespace = "", ttl = 0) {
        if (this.has(key)) this.query(`UPDATE ${this.table} SET value = ?, ttl = ? WHERE key = ? AND ns = ?`, [
            value,
            ttl,
            key,
            namespace
        ]);
        else this.query(`INSERT INTO ${this.table} (key, value, ns, ttl) VALUES (?, ?, ?, ?)`, [
            key,
            value,
            namespace,
            ttl
        ]);
        return this;
    }
    clear(namespace = "") {
        this.query(`DELETE FROM ${this.table} WHERE ns = ?`, [
            namespace
        ]);
        return this;
    }
    delete(key, namespace = "") {
        if (!this.has(key)) return false;
        this.query(`DELETE FROM ${this.table} WHERE key = ? AND ns = ?`, [
            key,
            namespace, 
        ]);
        return true;
    }
    keys(namespace = "") {
        return this.query(`SELECT key FROM ${this.table} WHERE ns = ?`, [
            namespace
        ]).map((e)=>e.key);
    }
    deleteExpired(namespace = "") {
        this.query(`DELETE FROM ${this.table} WHERE ns = ? AND ttl != 0 AND ttl < ?`, [
            namespace,
            Date.now()
        ]);
    }
}
Adapters.register({
    protocol: "sqlite",
    init (uri) {
        let path = uri.toString().slice(7);
        if (path.startsWith("//")) path = path.slice(2);
        if (path == "memory") path = undefined;
        return new SqliteAdapter(path);
    }
});
export { Keydb };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gva2V5ZGJAMS4wLjAvc3FsaXRlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERCIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3gvc3FsaXRlQHYyLjMuMi9tb2QudHNcIjtcclxuaW1wb3J0IHsgQWRhcHRlciwgQWRhcHRlcnMsIEtleWRiRmllbGRzIH0gZnJvbSBcIi4vYWRhcHRlci50c1wiO1xyXG5pbXBvcnQgeyBLZXlkYiB9IGZyb20gXCIuL2tleWRiLnRzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgU3FsaXRlQWRhcHRlciBpbXBsZW1lbnRzIEFkYXB0ZXIge1xyXG4gIGRiOiBEQjtcclxuICB0YWJsZTogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcihwYXRoPzogc3RyaW5nLCB0YWJsZTogc3RyaW5nID0gXCJrZXlkYlwiKSB7XHJcbiAgICB0aGlzLmRiID0gbmV3IERCKHBhdGgpO1xyXG4gICAgdGhpcy50YWJsZSA9IHRhYmxlO1xyXG4gICAgdGhpcy5xdWVyeShcclxuICAgICAgYENSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTICR7dGhpcy50YWJsZX0gKGtleSBWQVJDSEFSKDI1NSksIHZhbHVlIFRFWFQsIG5zIFZBUkNIQVIoMjU1KSwgdHRsIElOVEVHRVIpYFxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XHJcbiAgcXVlcnk8VCA9IGFueT4oc3FsOiBzdHJpbmcsIHBhcmFtczogYW55W10gPSBbXSk6IFRbXSB7XHJcbiAgICByZXR1cm4gWy4uLnRoaXMuZGIucXVlcnkoc3FsLCBwYXJhbXMpLmFzT2JqZWN0cygpXSBhcyBUW107XHJcbiAgfVxyXG5cclxuICBnZXQoa2V5OiBzdHJpbmcsIG5hbWVzcGFjZSA9IFwiXCIpOiBLZXlkYkZpZWxkcyB8IHVuZGVmaW5lZCB7XHJcbiAgICBjb25zdCByZXMgPSB0aGlzLnF1ZXJ5PHtcclxuICAgICAga2V5OiBzdHJpbmc7XHJcbiAgICAgIHZhbHVlOiBzdHJpbmc7XHJcbiAgICAgIG5zOiBzdHJpbmc7XHJcbiAgICAgIHR0bDogbnVtYmVyO1xyXG4gICAgfT4oYFNFTEVDVCAqIEZST00gJHt0aGlzLnRhYmxlfSBXSEVSRSBrZXkgPSA/IEFORCBucyA9ID9gLCBbXHJcbiAgICAgIGtleSxcclxuICAgICAgbmFtZXNwYWNlLFxyXG4gICAgXSlbMF07XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgaGFzKGtleTogc3RyaW5nLCBuYW1lc3BhY2UgPSBcIlwiKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCByZXMgPSB0aGlzLnF1ZXJ5PHsga2V5OiBzdHJpbmcgfT4oXHJcbiAgICAgIGBTRUxFQ1Qga2V5IEZST00gJHt0aGlzLnRhYmxlfSBXSEVSRSBrZXkgPSA/IEFORCBucyA9ID9gLFxyXG4gICAgICBba2V5LCBuYW1lc3BhY2VdXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIHJlcy5sZW5ndGggPiAwO1xyXG4gIH1cclxuXHJcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcclxuICBzZXQoa2V5OiBzdHJpbmcsIHZhbHVlOiBhbnksIG5hbWVzcGFjZSA9IFwiXCIsIHR0bCA9IDApOiB0aGlzIHtcclxuICAgIGlmICh0aGlzLmhhcyhrZXkpKVxyXG4gICAgICB0aGlzLnF1ZXJ5KFxyXG4gICAgICAgIGBVUERBVEUgJHt0aGlzLnRhYmxlfSBTRVQgdmFsdWUgPSA/LCB0dGwgPSA/IFdIRVJFIGtleSA9ID8gQU5EIG5zID0gP2AsXHJcbiAgICAgICAgW3ZhbHVlLCB0dGwsIGtleSwgbmFtZXNwYWNlXVxyXG4gICAgICApO1xyXG4gICAgZWxzZVxyXG4gICAgICB0aGlzLnF1ZXJ5KFxyXG4gICAgICAgIGBJTlNFUlQgSU5UTyAke3RoaXMudGFibGV9IChrZXksIHZhbHVlLCBucywgdHRsKSBWQUxVRVMgKD8sID8sID8sID8pYCxcclxuICAgICAgICBba2V5LCB2YWx1ZSwgbmFtZXNwYWNlLCB0dGxdXHJcbiAgICAgICk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGNsZWFyKG5hbWVzcGFjZSA9IFwiXCIpOiB0aGlzIHtcclxuICAgIHRoaXMucXVlcnkoYERFTEVURSBGUk9NICR7dGhpcy50YWJsZX0gV0hFUkUgbnMgPSA/YCwgW25hbWVzcGFjZV0pO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBkZWxldGUoa2V5OiBzdHJpbmcsIG5hbWVzcGFjZSA9IFwiXCIpOiBib29sZWFuIHtcclxuICAgIGlmICghdGhpcy5oYXMoa2V5KSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgdGhpcy5xdWVyeShgREVMRVRFIEZST00gJHt0aGlzLnRhYmxlfSBXSEVSRSBrZXkgPSA/IEFORCBucyA9ID9gLCBbXHJcbiAgICAgIGtleSxcclxuICAgICAgbmFtZXNwYWNlLFxyXG4gICAgXSk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIGtleXMobmFtZXNwYWNlID0gXCJcIik6IHN0cmluZ1tdIHtcclxuICAgIHJldHVybiB0aGlzLnF1ZXJ5PHsga2V5OiBzdHJpbmcgfT4oXHJcbiAgICAgIGBTRUxFQ1Qga2V5IEZST00gJHt0aGlzLnRhYmxlfSBXSEVSRSBucyA9ID9gLFxyXG4gICAgICBbbmFtZXNwYWNlXVxyXG4gICAgKS5tYXAoKGUpID0+IGUua2V5KTtcclxuICB9XHJcblxyXG4gIGRlbGV0ZUV4cGlyZWQobmFtZXNwYWNlID0gXCJcIik6IHZvaWQge1xyXG4gICAgdGhpcy5xdWVyeShcclxuICAgICAgYERFTEVURSBGUk9NICR7dGhpcy50YWJsZX0gV0hFUkUgbnMgPSA/IEFORCB0dGwgIT0gMCBBTkQgdHRsIDwgP2AsXHJcbiAgICAgIFtuYW1lc3BhY2UsIERhdGUubm93KCldXHJcbiAgICApO1xyXG4gIH1cclxufVxyXG5cclxuQWRhcHRlcnMucmVnaXN0ZXIoe1xyXG4gIHByb3RvY29sOiBcInNxbGl0ZVwiLFxyXG4gIGluaXQodXJpKSB7XHJcbiAgICBsZXQgcGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkID0gdXJpLnRvU3RyaW5nKCkuc2xpY2UoNyk7XHJcbiAgICBpZiAocGF0aC5zdGFydHNXaXRoKFwiLy9cIikpIHBhdGggPSBwYXRoLnNsaWNlKDIpO1xyXG4gICAgaWYgKHBhdGggPT0gXCJtZW1vcnlcIikgcGF0aCA9IHVuZGVmaW5lZDtcclxuICAgIHJldHVybiBuZXcgU3FsaXRlQWRhcHRlcihwYXRoKTtcclxuICB9LFxyXG59KTtcclxuXHJcbmV4cG9ydCB7IEtleWRiIH07XHJcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLEVBQUUsUUFBUSwwQ0FBMEMsQ0FBQztBQUM5RCxTQUFrQixRQUFRLFFBQXFCLGNBQWMsQ0FBQztBQUM5RCxTQUFTLEtBQUssUUFBUSxZQUFZLENBQUM7QUFFbkMsT0FBTyxNQUFNLGFBQWE7SUFDeEIsRUFBRSxDQUFLO0lBQ1AsS0FBSyxDQUFTO0lBRWQsWUFBWSxJQUFhLEVBQUUsS0FBYSxHQUFHLE9BQU8sQ0FBRTtRQUNsRCxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxLQUFLLENBQ1IsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLDZEQUE2RCxDQUFDLENBQ3hHLENBQUM7SUFDSjtJQUVBLG1DQUFtQztJQUNuQyxLQUFLLENBQVUsR0FBVyxFQUFFLE1BQWEsR0FBRyxFQUFFLEVBQU87UUFDbkQsT0FBTztlQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxTQUFTLEVBQUU7U0FBQyxDQUFRO0lBQzVEO0lBRUEsR0FBRyxDQUFDLEdBQVcsRUFBRSxTQUFTLEdBQUcsRUFBRSxFQUEyQjtRQUN4RCxNQUFNLEdBQUcsR0FBRyxJQUFJLENB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