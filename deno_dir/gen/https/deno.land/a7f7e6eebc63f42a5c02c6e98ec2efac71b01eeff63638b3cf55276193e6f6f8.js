import { join } from "../../deps.ts";
import { ensureFile } from "../../deps.ts";
export class Store {
    name;
    path;
    filePath;
    fileEnsured = false;
    data;
    isInit = false;
    constructor(opts){
        if (typeof opts === "string") {
            opts = {
                name: opts
            };
        }
        const { name =".json" , path ="."  } = opts || {};
        this.name = name;
        this.path = path.startsWith("/") ? path : join(Deno.cwd(), path);
        this.filePath = join(this.path, name);
    }
    isNullOrEmptyData() {
        return !this.data || !Object.keys(this.data).length;
    }
    async init() {
        // check data json is exists
        // if not exists, create it
        // if exists, load it
        if (this.isInit) {
            return;
        }
        // check if data file exists
        const isFileexists = existsSync(this.filePath);
        if (isFileexists) {
            const content = new TextDecoder().decode(await Deno.readFile(this.filePath));
            let data = this.data;
            try {
                data = JSON.parse(content);
            } catch (_e) {
                // can't parse json
                data = {};
            }
            this.data = data;
        } else {
            this.data = {};
        }
        this.isInit = true;
    }
    async load() {
        if (!this.isInit) {
            await this.init();
        }
    }
    async save() {
        const { data , filePath  } = this;
        if (!this.data) {
            return;
        }
        if (!this.fileEnsured) {
            // ensure file
            await ensureFile(filePath);
            this.fileEnsured = true;
        }
        try {
            await Deno.writeFile(filePath, new TextEncoder().encode(JSON.stringify(data, null, 2)), {
                mode: 0o0600
            });
        } catch (e) {
            throw e;
        }
    }
    async get(key) {
        await this.load();
        return this.data[key];
    }
    async set(key, val) {
        await this.load();
        let dataChanged = false;
        if (typeof key === "string") {
            const oldVal = this.data[key];
            if (oldVal !== val) {
                this.data[key] = val;
                dataChanged = true;
            }
        } else {
            const keys = Object.keys(key);
            for (const k of keys){
                const oldVal1 = this.data[k];
                const val1 = key[k];
                if (oldVal1 !== val1) {
                    this.data[k] = val1;
                    dataChanged = true;
                }
            }
        }
        if (dataChanged) {
            await this.save();
            return true;
        }
        return false;
    }
    async has(key) {
        await this.load();
        return Object.prototype.hasOwnProperty.call(this.data, key);
    }
    async delete(key) {
        if (this.isNullOrEmptyData()) {
            return false;
        }
        await this.load();
        let dataChanged = false;
        if (typeof key === "string") {
            key = [
                key
            ];
        }
        for (const k of key){
            if (this.data[k] !== undefined) {
                delete this.data[k];
                dataChanged = true;
            }
        }
        if (dataChanged) {
            await this.save();
            return true;
        }
        return false;
    }
    async clear() {
        if (this.isNullOrEmptyData()) {
            return;
        }
        this.data = {};
        await this.save();
    }
    async toObject() {
        await this.load();
        return this.data;
    }
}
export const directoryExists = async (dir, parent)=>{
    for await (const entry of Deno.readDir(parent)){
        if (entry.isDirectory && entry.name === dir) {
            return true;
        }
    }
    return false;
};
export const mkdir = async (path)=>{
    const parent = Deno.cwd();
    const segments = path.replace(parent, "").split("/");
    let exists = true;
    for(let i = 0; i < segments.length; i++){
        const s = segments[i];
        if (!s || !i && s === ".") {
            continue;
        } else if (s === "..") {
            return;
        }
        if (!await directoryExists(s, parent + segments.slice(0, i).join("/"))) {
            exists = false;
            break;
        }
    }
    if (!exists) {
        await Deno.mkdir(path, {
            recursive: true
        });
        return path;
    }
};
export function existsSync(filePath) {
    try {
        Deno.lstatSync(filePath);
        return true;
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            return false;
        }
        throw err;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvYWRhcHRlcnMvanNvbi1zdG9yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBqb2luIH0gZnJvbSBcIi4uLy4uL2RlcHMudHNcIjtcbmltcG9ydCB7IGVuc3VyZUZpbGUgfSBmcm9tIFwiLi4vLi4vZGVwcy50c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JlT3B0aW9ucyB7XG4gIG5hbWU/OiBzdHJpbmc7XG4gIHBhdGg/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBTdG9yZSB7XG4gIHB1YmxpYyBuYW1lOiBzdHJpbmc7XG4gIHB1YmxpYyBwYXRoOiBzdHJpbmc7XG5cbiAgcHJpdmF0ZSBmaWxlUGF0aDogc3RyaW5nO1xuICBwcml2YXRlIGZpbGVFbnN1cmVkID0gZmFsc2U7XG4gIHByaXZhdGUgZGF0YT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBwcml2YXRlIGlzSW5pdCA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKG9wdHM/OiBzdHJpbmcgfCBTdG9yZU9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIG9wdHMgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIG9wdHMgPSB7XG4gICAgICAgIG5hbWU6IG9wdHMsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHtcbiAgICAgIG5hbWUgPSBcIi5qc29uXCIsXG4gICAgICBwYXRoID0gXCIuXCIsXG4gICAgfSA9IG9wdHMgfHwge307XG5cbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMucGF0aCA9IHBhdGguc3RhcnRzV2l0aChcIi9cIikgPyBwYXRoIDogam9pbihEZW5vLmN3ZCgpLCBwYXRoKTtcbiAgICB0aGlzLmZpbGVQYXRoID0gam9pbih0aGlzLnBhdGgsIG5hbWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBpc051bGxPckVtcHR5RGF0YSgpIHtcbiAgICByZXR1cm4gIXRoaXMuZGF0YSB8fCAhT2JqZWN0LmtleXModGhpcy5kYXRhKS5sZW5ndGg7XG4gIH1cbiAgcHVibGljIGFzeW5jIGluaXQoKSB7XG4gICAgLy8gY2hlY2sgZGF0YSBqc29uIGlzIGV4aXN0c1xuICAgIC8vIGlmIG5vdCBleGlzdHMsIGNyZWF0ZSBpdFxuICAgIC8vIGlmIGV4aXN0cywgbG9hZCBpdFxuICAgIGlmICh0aGlzLmlzSW5pdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBjaGVjayBpZiBkYXRhIGZpbGUgZXhpc3RzXG5cbiAgICBjb25zdCBpc0ZpbGVleGlzdHMgPSBleGlzdHNTeW5jKHRoaXMuZmlsZVBhdGgpO1xuICAgIGlmIChpc0ZpbGVleGlzdHMpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoXG4gICAgICAgIGF3YWl0IERlbm8ucmVhZEZpbGUodGhpcy5maWxlUGF0aCksXG4gICAgICApO1xuICAgICAgbGV0IGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICBkYXRhID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAgIC8vIGNhbid0IHBhcnNlIGpzb25cbiAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgfVxuICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kYXRhID0ge307XG4gICAgfVxuXG4gICAgdGhpcy5pc0luaXQgPSB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBsb2FkKCkge1xuICAgIGlmICghdGhpcy5pc0luaXQpIHtcbiAgICAgIGF3YWl0IHRoaXMuaW5pdCgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2F2ZSgpIHtcbiAgICBjb25zdCB7IGRhdGEsIGZpbGVQYXRoIH0gPSB0aGlzO1xuXG4gICAgaWYgKCF0aGlzLmRhdGEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZpbGVFbnN1cmVkKSB7XG4gICAgICAvLyBlbnN1cmUgZmlsZVxuICAgICAgYXdhaXQgZW5zdXJlRmlsZShmaWxlUGF0aCk7XG4gICAgICB0aGlzLmZpbGVFbnN1cmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IERlbm8ud3JpdGVGaWxlKFxuICAgICAgICBmaWxlUGF0aCxcbiAgICAgICAgbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpKSxcbiAgICAgICAge1xuICAgICAgICAgIG1vZGU6IDBvMDYwMCxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBnZXQoa2V5OiBzdHJpbmcpIHtcbiAgICBhd2FpdCB0aGlzLmxvYWQoKTtcblxuICAgIHJldHVybiB0aGlzLmRhdGEhW2tleV07XG4gIH1cblxuICBhc3luYyBzZXQoa2V5OiBzdHJpbmcgfCB7IFtrZXk6IHN0cmluZ106IHVua25vd24gfSwgdmFsPzogdW5rbm93bikge1xuICAgIGF3YWl0IHRoaXMubG9hZCgpO1xuXG4gICAgbGV0IGRhdGFDaGFuZ2VkID0gZmFsc2U7XG5cbiAgICBpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgY29uc3Qgb2xkVmFsID0gdGhpcy5kYXRhIVtrZXldO1xuXG4gICAgICBpZiAob2xkVmFsICE9PSB2YWwpIHtcbiAgICAgICAgdGhpcy5kYXRhIVtrZXldID0gdmFsO1xuICAgICAgICBkYXRhQ2hhbmdlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhrZXkpO1xuXG4gICAgICBmb3IgKGNvbnN0IGsgb2Yga2V5cykge1xuICAgICAgICBjb25zdCBvbGRWYWwgPSB0aGlzLmRhdGEhW2tdO1xuICAgICAgICBjb25zdCB2YWwgPSBrZXlba107XG5cbiAgICAgICAgaWYgKG9sZFZhbCAhPT0gdmFsKSB7XG4gICAgICAgICAgdGhpcy5kYXRhIVtrXSA9IHZhbDtcbiAgICAgICAgICBkYXRhQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZGF0YUNoYW5nZWQpIHtcbiAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgYXN5bmMgaGFzKGtleTogc3RyaW5nKSB7XG4gICAgYXdhaXQgdGhpcy5sb2FkKCk7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmRhdGEhLCBrZXkpO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlKGtleTogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgICBpZiAodGhpcy5pc051bGxPckVtcHR5RGF0YSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5sb2FkKCk7XG5cbiAgICBsZXQgZGF0YUNoYW5nZWQgPSBmYWxzZTtcblxuICAgIGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBrZXkgPSBba2V5XTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGsgb2Yga2V5KSB7XG4gICAgICBpZiAodGhpcy5kYXRhIVtrXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmRhdGEhW2tdO1xuICAgICAgICBkYXRhQ2hhbmdlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRhdGFDaGFuZ2VkKSB7XG4gICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGFzeW5jIGNsZWFyKCkge1xuICAgIGlmICh0aGlzLmlzTnVsbE9yRW1wdHlEYXRhKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmRhdGEgPSB7fTtcbiAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgfVxuXG4gIGFzeW5jIHRvT2JqZWN0KCkge1xuICAgIGF3YWl0IHRoaXMubG9hZCgpO1xuICAgIHJldHVybiB0aGlzLmRhdGEhO1xuICB9XG59XG5leHBvcnQgY29uc3QgZGlyZWN0b3J5RXhpc3RzID0gYXN5bmMgKGRpcjogc3RyaW5nLCBwYXJlbnQ6IHN0cmluZykgPT4ge1xuICBmb3IgYXdhaXQgKGNvbnN0IGVudHJ5IG9mIERlbm8ucmVhZERpcihwYXJlbnQpKSB7XG4gICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5ICYmIGVudHJ5Lm5hbWUgPT09IGRpcikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmV4cG9ydCBjb25zdCBta2RpciA9IGFzeW5jIChwYXRoOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgcGFyZW50ID0gRGVuby5jd2QoKTtcbiAgY29uc3Qgc2VnbWVudHMgPSBwYXRoLnJlcGxhY2UocGFyZW50LCBcIlwiKS5zcGxpdChcIi9cIik7XG4gIGxldCBleGlzdHMgPSB0cnVlO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2VnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBzID0gc2VnbWVudHNbaV07XG5cbiAgICBpZiAoIXMgfHwgIWkgJiYgcyA9PT0gXCIuXCIpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH0gZWxzZSBpZiAocyA9PT0gXCIuLlwiKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFhd2FpdCBkaXJlY3RvcnlFeGlzdHMocywgcGFyZW50ICsgc2VnbWVudHMuc2xpY2UoMCwgaSkuam9pbihcIi9cIikpKSB7XG4gICAgICBleGlzdHMgPSBmYWxzZTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICghZXhpc3RzKSB7XG4gICAgYXdhaXQgRGVuby5ta2RpcihwYXRoLCB7XG4gICAgICByZWN1cnNpdmU6IHRydWUsXG4gICAgfSk7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBleGlzdHNTeW5jKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBEZW5vLmxzdGF0U3luYyhmaWxlUGF0aCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0aHJvdyBlcnI7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLElBQUksUUFBUSxnQkFBZ0I7QUFDckMsU0FBUyxVQUFVLFFBQVEsZ0JBQWdCO0FBTzNDLE9BQU8sTUFBTTtJQUNKLEtBQWE7SUFDYixLQUFhO0lBRVosU0FBaUI7SUFDakIsY0FBYyxLQUFLLENBQUM7SUFDcEIsS0FBK0I7SUFDL0IsU0FBUyxLQUFLLENBQUM7SUFFdkIsWUFBWSxJQUE0QixDQUFFO1FBQ3hDLElBQUksT0FBTyxTQUFTLFVBQVU7WUFDNUIsT0FBTztnQkFDTCxNQUFNO1lBQ1I7UUFDRixDQUFDO1FBRUQsTUFBTSxFQUNKLE1BQU8sUUFBTyxFQUNkLE1BQU8sSUFBRyxFQUNYLEdBQUcsUUFBUSxDQUFDO1FBRWIsSUFBSSxDQUFDLElBQUksR0FBRztRQUNaLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxVQUFVLENBQUMsT0FBTyxPQUFPLEtBQUssS0FBSyxHQUFHLElBQUksS0FBSztRQUNoRSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRTtJQUNsQztJQUVRLG9CQUFvQjtRQUMxQixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTTtJQUNyRDtJQUNB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