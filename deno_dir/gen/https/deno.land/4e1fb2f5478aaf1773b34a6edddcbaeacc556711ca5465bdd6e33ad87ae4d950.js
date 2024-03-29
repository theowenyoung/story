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
            namespace
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
            namespace
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gva2V5ZGJAMS4wLjAvc3FsaXRlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERCIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3gvc3FsaXRlQHYyLjMuMi9tb2QudHNcIjtcclxuaW1wb3J0IHsgQWRhcHRlciwgQWRhcHRlcnMsIEtleWRiRmllbGRzIH0gZnJvbSBcIi4vYWRhcHRlci50c1wiO1xyXG5pbXBvcnQgeyBLZXlkYiB9IGZyb20gXCIuL2tleWRiLnRzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgU3FsaXRlQWRhcHRlciBpbXBsZW1lbnRzIEFkYXB0ZXIge1xyXG4gIGRiOiBEQjtcclxuICB0YWJsZTogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcihwYXRoPzogc3RyaW5nLCB0YWJsZTogc3RyaW5nID0gXCJrZXlkYlwiKSB7XHJcbiAgICB0aGlzLmRiID0gbmV3IERCKHBhdGgpO1xyXG4gICAgdGhpcy50YWJsZSA9IHRhYmxlO1xyXG4gICAgdGhpcy5xdWVyeShcclxuICAgICAgYENSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTICR7dGhpcy50YWJsZX0gKGtleSBWQVJDSEFSKDI1NSksIHZhbHVlIFRFWFQsIG5zIFZBUkNIQVIoMjU1KSwgdHRsIElOVEVHRVIpYFxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XHJcbiAgcXVlcnk8VCA9IGFueT4oc3FsOiBzdHJpbmcsIHBhcmFtczogYW55W10gPSBbXSk6IFRbXSB7XHJcbiAgICByZXR1cm4gWy4uLnRoaXMuZGIucXVlcnkoc3FsLCBwYXJhbXMpLmFzT2JqZWN0cygpXSBhcyBUW107XHJcbiAgfVxyXG5cclxuICBnZXQoa2V5OiBzdHJpbmcsIG5hbWVzcGFjZSA9IFwiXCIpOiBLZXlkYkZpZWxkcyB8IHVuZGVmaW5lZCB7XHJcbiAgICBjb25zdCByZXMgPSB0aGlzLnF1ZXJ5PHtcclxuICAgICAga2V5OiBzdHJpbmc7XHJcbiAgICAgIHZhbHVlOiBzdHJpbmc7XHJcbiAgICAgIG5zOiBzdHJpbmc7XHJcbiAgICAgIHR0bDogbnVtYmVyO1xyXG4gICAgfT4oYFNFTEVDVCAqIEZST00gJHt0aGlzLnRhYmxlfSBXSEVSRSBrZXkgPSA/IEFORCBucyA9ID9gLCBbXHJcbiAgICAgIGtleSxcclxuICAgICAgbmFtZXNwYWNlLFxyXG4gICAgXSlbMF07XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgaGFzKGtleTogc3RyaW5nLCBuYW1lc3BhY2UgPSBcIlwiKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCByZXMgPSB0aGlzLnF1ZXJ5PHsga2V5OiBzdHJpbmcgfT4oXHJcbiAgICAgIGBTRUxFQ1Qga2V5IEZST00gJHt0aGlzLnRhYmxlfSBXSEVSRSBrZXkgPSA/IEFORCBucyA9ID9gLFxyXG4gICAgICBba2V5LCBuYW1lc3BhY2VdXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIHJlcy5sZW5ndGggPiAwO1xyXG4gIH1cclxuXHJcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcclxuICBzZXQoa2V5OiBzdHJpbmcsIHZhbHVlOiBhbnksIG5hbWVzcGFjZSA9IFwiXCIsIHR0bCA9IDApOiB0aGlzIHtcclxuICAgIGlmICh0aGlzLmhhcyhrZXkpKVxyXG4gICAgICB0aGlzLnF1ZXJ5KFxyXG4gICAgICAgIGBVUERBVEUgJHt0aGlzLnRhYmxlfSBTRVQgdmFsdWUgPSA/LCB0dGwgPSA/IFdIRVJFIGtleSA9ID8gQU5EIG5zID0gP2AsXHJcbiAgICAgICAgW3ZhbHVlLCB0dGwsIGtleSwgbmFtZXNwYWNlXVxyXG4gICAgICApO1xyXG4gICAgZWxzZVxyXG4gICAgICB0aGlzLnF1ZXJ5KFxyXG4gICAgICAgIGBJTlNFUlQgSU5UTyAke3RoaXMudGFibGV9IChrZXksIHZhbHVlLCBucywgdHRsKSBWQUxVRVMgKD8sID8sID8sID8pYCxcclxuICAgICAgICBba2V5LCB2YWx1ZSwgbmFtZXNwYWNlLCB0dGxdXHJcbiAgICAgICk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGNsZWFyKG5hbWVzcGFjZSA9IFwiXCIpOiB0aGlzIHtcclxuICAgIHRoaXMucXVlcnkoYERFTEVURSBGUk9NICR7dGhpcy50YWJsZX0gV0hFUkUgbnMgPSA/YCwgW25hbWVzcGFjZV0pO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBkZWxldGUoa2V5OiBzdHJpbmcsIG5hbWVzcGFjZSA9IFwiXCIpOiBib29sZWFuIHtcclxuICAgIGlmICghdGhpcy5oYXMoa2V5KSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgdGhpcy5xdWVyeShgREVMRVRFIEZST00gJHt0aGlzLnRhYmxlfSBXSEVSRSBrZXkgPSA/IEFORCBucyA9ID9gLCBbXHJcbiAgICAgIGtleSxcclxuICAgICAgbmFtZXNwYWNlLFxyXG4gICAgXSk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIGtleXMobmFtZXNwYWNlID0gXCJcIik6IHN0cmluZ1tdIHtcclxuICAgIHJldHVybiB0aGlzLnF1ZXJ5PHsga2V5OiBzdHJpbmcgfT4oXHJcbiAgICAgIGBTRUxFQ1Qga2V5IEZST00gJHt0aGlzLnRhYmxlfSBXSEVSRSBucyA9ID9gLFxyXG4gICAgICBbbmFtZXNwYWNlXVxyXG4gICAgKS5tYXAoKGUpID0+IGUua2V5KTtcclxuICB9XHJcblxyXG4gIGRlbGV0ZUV4cGlyZWQobmFtZXNwYWNlID0gXCJcIik6IHZvaWQge1xyXG4gICAgdGhpcy5xdWVyeShcclxuICAgICAgYERFTEVURSBGUk9NICR7dGhpcy50YWJsZX0gV0hFUkUgbnMgPSA/IEFORCB0dGwgIT0gMCBBTkQgdHRsIDwgP2AsXHJcbiAgICAgIFtuYW1lc3BhY2UsIERhdGUubm93KCldXHJcbiAgICApO1xyXG4gIH1cclxufVxyXG5cclxuQWRhcHRlcnMucmVnaXN0ZXIoe1xyXG4gIHByb3RvY29sOiBcInNxbGl0ZVwiLFxyXG4gIGluaXQodXJpKSB7XHJcbiAgICBsZXQgcGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkID0gdXJpLnRvU3RyaW5nKCkuc2xpY2UoNyk7XHJcbiAgICBpZiAocGF0aC5zdGFydHNXaXRoKFwiLy9cIikpIHBhdGggPSBwYXRoLnNsaWNlKDIpO1xyXG4gICAgaWYgKHBhdGggPT0gXCJtZW1vcnlcIikgcGF0aCA9IHVuZGVmaW5lZDtcclxuICAgIHJldHVybiBuZXcgU3FsaXRlQWRhcHRlcihwYXRoKTtcclxuICB9LFxyXG59KTtcclxuXHJcbmV4cG9ydCB7IEtleWRiIH07XHJcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLEVBQUUsUUFBUSwyQ0FBMkM7QUFDOUQsU0FBa0IsUUFBUSxRQUFxQixlQUFlO0FBQzlELFNBQVMsS0FBSyxRQUFRLGFBQWE7QUFFbkMsT0FBTyxNQUFNO0lBQ1gsR0FBTztJQUNQLE1BQWM7SUFFZCxZQUFZLElBQWEsRUFBRSxRQUFnQixPQUFPLENBQUU7UUFDbEQsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLEdBQUc7UUFDakIsSUFBSSxDQUFDLEtBQUssR0FBRztRQUNiLElBQUksQ0FBQyxLQUFLLENBQ1IsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLDZEQUE2RCxDQUFDO0lBRTNHO0lBRUEsbUNBQW1DO0lBQ25DLE1BQWUsR0FBVyxFQUFFLFNBQWdCLEVBQUUsRUFBTztRQUNuRCxPQUFPO2VBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxRQUFRLFNBQVM7U0FBRztJQUNwRDtJQUVBLElBQUksR0FBVyxFQUFFLFlBQVksRUFBRSxFQUEyQjtRQUN4RCxNQUFNLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FLbkIsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFO1lBQ3pEO1lBQ0E7U0FDRCxDQUFDLENBQUMsRUFBRTtRQUNMLE9BQU87SUFDVDtJQUVBLElBQUksR0FBVyxFQUFFLFlBQVksRUFBRSxFQUFXO1FBQ3hDLE1BQU0sTUFBTSxJQUFJLENBQUMsS0FBSyxDQUNwQixDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUMsRUFDeEQ7WUFBQztZQUFLO1NBQVU7UUFFbEIsT0FBTyxJQUFJLE1BQU0sR0FBRztJQUN0QjtJQUVBLG1DQUFtQztJQUNuQyxJQUFJLEdBQVcsRUFBRSxLQUFVLEVBQUUsWUFBWSxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQVE7UUFDMUQsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQ1gsSUFBSSxDQUFDLEtBQUssQ0FDUixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGdEQUFnRCxDQUFDLEVBQ3RFO1lBQUM7WUFBTztZQUFLO1lBQUs7U0FBVTthQUc5QixJQUFJLENBQUMsS0FBSyxDQUNSLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsMENBQTBDLENBQUMsRUFDckU7WUFBQztZQUFLO1lBQU87WUFBVztTQUFJO1FBRWhDLE9BQU8sSUFBSTtJQUNiO0lBRUEsTUFBTSxZQUFZLEVBQUUsRUFBUTtRQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFBQztTQUFVO1FBQ2hFLE9BQU8sSUFBSTtJQUNiO0lBRUEsT0FBTyxHQUFXLEVBQUUsWUFBWSxFQUFFLEVBQVc7UUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxPQUFPLEtBQUs7UUFDaEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLEVBQUU7WUFDL0Q7WUFDQTtTQUNEO1FBQ0QsT0FBTyxJQUFJO0lBQ2I7SUFFQSxLQUFLLFlBQVksRUFBRSxFQUFZO1FBQzdCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FDZixDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQzVDO1lBQUM7U0FBVSxFQUNYLEdBQUcsQ0FBQyxDQUFDLElBQU0sRUFBRSxHQUFHO0lBQ3BCO0lBRUEsY0FBYyxZQUFZLEVBQUUsRUFBUTtRQUNsQyxJQUFJLENBQUMsS0FBSyxDQUNSLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsc0NBQXNDLENBQUMsRUFDakU7WUFBQztZQUFXLEtBQUssR0FBRztTQUFHO0lBRTNCO0FBQ0YsQ0FBQztBQUVELFNBQVMsUUFBUSxDQUFDO0lBQ2hCLFVBQVU7SUFDVixNQUFLLEdBQUcsRUFBRTtRQUNSLElBQUksT0FBMkIsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ3BELElBQUksS0FBSyxVQUFVLENBQUMsT0FBTyxPQUFPLEtBQUssS0FBSyxDQUFDO1FBQzdDLElBQUksUUFBUSxVQUFVLE9BQU87UUFDN0IsT0FBTyxJQUFJLGNBQWM7SUFDM0I7QUFDRjtBQUVBLFNBQVMsS0FBSyxHQUFHIn0=