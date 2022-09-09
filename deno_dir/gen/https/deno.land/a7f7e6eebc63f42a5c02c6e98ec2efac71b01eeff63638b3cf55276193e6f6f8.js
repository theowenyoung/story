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
        const { name =".json" , path ="." ,  } = opts || {};
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvYWRhcHRlcnMvanNvbi1zdG9yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBqb2luIH0gZnJvbSBcIi4uLy4uL2RlcHMudHNcIjtcbmltcG9ydCB7IGVuc3VyZUZpbGUgfSBmcm9tIFwiLi4vLi4vZGVwcy50c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JlT3B0aW9ucyB7XG4gIG5hbWU/OiBzdHJpbmc7XG4gIHBhdGg/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBTdG9yZSB7XG4gIHB1YmxpYyBuYW1lOiBzdHJpbmc7XG4gIHB1YmxpYyBwYXRoOiBzdHJpbmc7XG5cbiAgcHJpdmF0ZSBmaWxlUGF0aDogc3RyaW5nO1xuICBwcml2YXRlIGZpbGVFbnN1cmVkID0gZmFsc2U7XG4gIHByaXZhdGUgZGF0YT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBwcml2YXRlIGlzSW5pdCA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKG9wdHM/OiBzdHJpbmcgfCBTdG9yZU9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIG9wdHMgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIG9wdHMgPSB7XG4gICAgICAgIG5hbWU6IG9wdHMsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHtcbiAgICAgIG5hbWUgPSBcIi5qc29uXCIsXG4gICAgICBwYXRoID0gXCIuXCIsXG4gICAgfSA9IG9wdHMgfHwge307XG5cbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMucGF0aCA9IHBhdGguc3RhcnRzV2l0aChcIi9cIikgPyBwYXRoIDogam9pbihEZW5vLmN3ZCgpLCBwYXRoKTtcbiAgICB0aGlzLmZpbGVQYXRoID0gam9pbih0aGlzLnBhdGgsIG5hbWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBpc051bGxPckVtcHR5RGF0YSgpIHtcbiAgICByZXR1cm4gIXRoaXMuZGF0YSB8fCAhT2JqZWN0LmtleXModGhpcy5kYXRhKS5sZW5ndGg7XG4gIH1cbiAgcHVibGljIGFzeW5jIGluaXQoKSB7XG4gICAgLy8gY2hlY2sgZGF0YSBqc29uIGlzIGV4aXN0c1xuICAgIC8vIGlmIG5vdCBleGlzdHMsIGNyZWF0ZSBpdFxuICAgIC8vIGlmIGV4aXN0cywgbG9hZCBpdFxuICAgIGlmICh0aGlzLmlzSW5pdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBjaGVjayBpZiBkYXRhIGZpbGUgZXhpc3RzXG5cbiAgICBjb25zdCBpc0ZpbGVleGlzdHMgPSBleGlzdHNTeW5jKHRoaXMuZmlsZVBhdGgpO1xuICAgIGlmIChpc0ZpbGVleGlzdHMpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoXG4gICAgICAgIGF3YWl0IERlbm8ucmVhZEZpbGUodGhpcy5maWxlUGF0aCksXG4gICAgICApO1xuICAgICAgbGV0IGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICBkYXRhID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAgIC8vIGNhbid0IHBhcnNlIGpzb25cbiAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgfVxuICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kYXRhID0ge307XG4gICAgfVxuXG4gICAgdGhpcy5pc0luaXQgPSB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBsb2FkKCkge1xuICAgIGlmICghdGhpcy5pc0luaXQpIHtcbiAgICAgIGF3YWl0IHRoaXMuaW5pdCgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2F2ZSgpIHtcbiAgICBjb25zdCB7IGRhdGEsIGZpbGVQYXRoIH0gPSB0aGlzO1xuXG4gICAgaWYgKCF0aGlzLmRhdGEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZpbGVFbnN1cmVkKSB7XG4gICAgICAvLyBlbnN1cmUgZmlsZVxuICAgICAgYXdhaXQgZW5zdXJlRmlsZShmaWxlUGF0aCk7XG4gICAgICB0aGlzLmZpbGVFbnN1cmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IERlbm8ud3JpdGVGaWxlKFxuICAgICAgICBmaWxlUGF0aCxcbiAgICAgICAgbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpKSxcbiAgICAgICAge1xuICAgICAgICAgIG1vZGU6IDBvMDYwMCxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBnZXQoa2V5OiBzdHJpbmcpIHtcbiAgICBhd2FpdCB0aGlzLmxvYWQoKTtcblxuICAgIHJldHVybiB0aGlzLmRhdGEhW2tleV07XG4gIH1cblxuICBhc3luYyBzZXQoa2V5OiBzdHJpbmcgfCB7IFtrZXk6IHN0cmluZ106IHVua25vd24gfSwgdmFsPzogdW5rbm93bikge1xuICAgIGF3YWl0IHRoaXMubG9hZCgpO1xuXG4gICAgbGV0IGRhdGFDaGFuZ2VkID0gZmFsc2U7XG5cbiAgICBpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgY29uc3Qgb2xkVmFsID0gdGhpcy5kYXRhIVtrZXldO1xuXG4gICAgICBpZiAob2xkVmFsICE9PSB2YWwpIHtcbiAgICAgICAgdGhpcy5kYXRhIVtrZXldID0gdmFsO1xuICAgICAgICBkYXRhQ2hhbmdlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhrZXkpO1xuXG4gICAgICBmb3IgKGNvbnN0IGsgb2Yga2V5cykge1xuICAgICAgICBjb25zdCBvbGRWYWwgPSB0aGlzLmRhdGEhW2tdO1xuICAgICAgICBjb25zdCB2YWwgPSBrZXlba107XG5cbiAgICAgICAgaWYgKG9sZFZhbCAhPT0gdmFsKSB7XG4gICAgICAgICAgdGhpcy5kYXRhIVtrXSA9IHZhbDtcbiAgICAgICAgICBkYXRhQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZGF0YUNoYW5nZWQpIHtcbiAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgYXN5bmMgaGFzKGtleTogc3RyaW5nKSB7XG4gICAgYXdhaXQgdGhpcy5sb2FkKCk7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmRhdGEhLCBrZXkpO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlKGtleTogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgICBpZiAodGhpcy5pc051bGxPckVtcHR5RGF0YSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5sb2FkKCk7XG5cbiAgICBsZXQgZGF0YUNoYW5nZWQgPSBmYWxzZTtcblxuICAgIGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBrZXkgPSBba2V5XTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGsgb2Yga2V5KSB7XG4gICAgICBpZiAodGhpcy5kYXRhIVtrXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmRhdGEhW2tdO1xuICAgICAgICBkYXRhQ2hhbmdlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRhdGFDaGFuZ2VkKSB7XG4gICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGFzeW5jIGNsZWFyKCkge1xuICAgIGlmICh0aGlzLmlzTnVsbE9yRW1wdHlEYXRhKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmRhdGEgPSB7fTtcbiAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgfVxuXG4gIGFzeW5jIHRvT2JqZWN0KCkge1xuICAgIGF3YWl0IHRoaXMubG9hZCgpO1xuICAgIHJldHVybiB0aGlzLmRhdGEhO1xuICB9XG59XG5leHBvcnQgY29uc3QgZGlyZWN0b3J5RXhpc3RzID0gYXN5bmMgKGRpcjogc3RyaW5nLCBwYXJlbnQ6IHN0cmluZykgPT4ge1xuICBmb3IgYXdhaXQgKGNvbnN0IGVudHJ5IG9mIERlbm8ucmVhZERpcihwYXJlbnQpKSB7XG4gICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5ICYmIGVudHJ5Lm5hbWUgPT09IGRpcikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmV4cG9ydCBjb25zdCBta2RpciA9IGFzeW5jIChwYXRoOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgcGFyZW50ID0gRGVuby5jd2QoKTtcbiAgY29uc3Qgc2VnbWVudHMgPSBwYXRoLnJlcGxhY2UocGFyZW50LCBcIlwiKS5zcGxpdChcIi9cIik7XG4gIGxldCBleGlzdHMgPSB0cnVlO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2VnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBzID0gc2VnbWVudHNbaV07XG5cbiAgICBpZiAoIXMgfHwgIWkgJiYgcyA9PT0gXCIuXCIpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH0gZWxzZSBpZiAocyA9PT0gXCIuLlwiKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFhd2FpdCBkaXJlY3RvcnlFeGlzdHMocywgcGFyZW50ICsgc2VnbWVudHMuc2xpY2UoMCwgaSkuam9pbihcIi9cIikpKSB7XG4gICAgICBleGlzdHMgPSBmYWxzZTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICghZXhpc3RzKSB7XG4gICAgYXdhaXQgRGVuby5ta2RpcihwYXRoLCB7XG4gICAgICByZWN1cnNpdmU6IHRydWUsXG4gICAgfSk7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBleGlzdHNTeW5jKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBEZW5vLmxzdGF0U3luYyhmaWxlUGF0aCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0aHJvdyBlcnI7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLElBQUksUUFBUSxlQUFlLENBQUM7QUFDckMsU0FBUyxVQUFVLFFBQVEsZUFBZSxDQUFDO0FBTzNDLE9BQU8sTUFBTSxLQUFLO0lBQ2hCLEFBQU8sSUFBSSxDQUFTO0lBQ3BCLEFBQU8sSUFBSSxDQUFTO0lBRXBCLEFBQVEsUUFBUSxDQUFTO0lBQ3pCLEFBQVEsV0FBVyxHQUFHLEtBQUssQ0FBQztJQUM1QixBQUFRLElBQUksQ0FBMkI7SUFDdkMsQUFBUSxNQUFNLEdBQUcsS0FBSyxDQUFDO0lBRXZCLFlBQVksSUFBNEIsQ0FBRTtRQUN4QyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRTtZQUM1QixJQUFJLEdBQUc7Z0JBQ0wsSUFBSSxFQUFFLElBQUk7YUFDWCxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sRUFDSixJQUFJLEVBQUcsT0FBTyxDQUFBLEVBQ2QsSUFBSSxFQUFHLEdBQUcsQ0FBQSxJQUNYLEdBQUcsSUFBSSxJQUFJLEVBQUUsQUFBQztRQUVmLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxH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