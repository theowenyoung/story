import { Adapters } from "./adapter.ts";
import { JSONB } from "./jsonb.ts";
import { MemoryAdapter } from "./memory.ts";
function tryParseURL(q) {
    try {
        return new URL(q);
    } catch (e) {
        return;
    }
}
/** Simple and common Key-value storage interface for multiple Database backends. */ export class Keydb {
    adapter;
    awaitReady;
    namespace = "";
    // deno-lint-ignore no-explicit-any
    serialize = JSONB.stringify;
    // deno-lint-ignore no-explicit-any
    deserialize = JSONB.parse;
    ttl;
    constructor(adapter = new MemoryAdapter(), options){
        this.adapter = typeof adapter === "object" ? adapter : undefined;
        if (this.adapter === undefined && typeof adapter !== "object") {
            const proto = tryParseURL(adapter);
            if (!proto) throw new Error("Invalid Adapter Connection URI");
            const protocol = proto.protocol;
            const adp = Adapters.get(protocol.substr(0, protocol.length - 1));
            if (!adp) throw new Error(`Adapter not found for Protocol: ${protocol}`);
            const res = adp.init(proto);
            if (res instanceof Promise) {
                this.awaitReady = res.then((a)=>{
                    this.adapter = a;
                    this.awaitReady = undefined;
                    return a;
                });
            } else this.adapter = res;
        }
        this.namespace = options?.namespace ?? "";
        if (options?.serialize) this.serialize = options.serialize;
        if (options?.deserialize) this.deserialize = options.deserialize;
        if (options?.ttl) this.ttl = options.ttl;
    }
    /**
   * Get a Value by Key name.
   *
   * @param key Name of Key to get Value.
   */ // deno-lint-ignore no-explicit-any
    async get(key) {
        if (this.awaitReady) await this.awaitReady;
        await this.adapter?.deleteExpired(this.namespace);
        const val = await this.adapter?.get(key, this.namespace);
        if (val == undefined) return undefined;
        const res = this.deserialize(val.value);
        return res;
    }
    /**
   * Set a Key's Value.
   *
   * @param key Name of the Key to set.
   * @param value Value to set.
   */ // deno-lint-ignore no-explicit-any
    async set(key, value, ttl) {
        if (this.awaitReady) await this.awaitReady;
        const _ttl = ttl ?? this.ttl;
        value = {
            value,
            ttl: _ttl && typeof _ttl === "number" ? Date.now() + _ttl : undefined
        };
        await this.adapter?.set(key, this.serialize(value.value), this.namespace, value.ttl);
        return this;
    }
    /**
   * Delete a Key from Database.
   *
   * @param key Name of the Key to delete.
   */ async delete(key) {
        if (this.awaitReady) await this.awaitReady;
        return await this.adapter?.delete(key, this.namespace) ?? false;
    }
    /** Clear complete Database. */ async clear() {
        if (this.awaitReady) await this.awaitReady;
        await this.adapter?.clear(this.namespace);
        return this;
    }
    /** Get an Array of all Key Names. */ async keys() {
        if (this.awaitReady) await this.awaitReady;
        await this.adapter?.deleteExpired(this.namespace);
        const keys = await this.adapter?.keys(this.namespace) ?? [];
        return keys;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gva2V5ZGJAMS4wLjAva2V5ZGIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQWRhcHRlciwgQWRhcHRlcnMgfSBmcm9tIFwiLi9hZGFwdGVyLnRzXCI7XHJcbmltcG9ydCB7IEpTT05CIH0gZnJvbSBcIi4vanNvbmIudHNcIjtcclxuaW1wb3J0IHsgTWVtb3J5QWRhcHRlciB9IGZyb20gXCIuL21lbW9yeS50c1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBLZXlkYk9wdGlvbnMge1xyXG4gIG5hbWVzcGFjZT86IHN0cmluZztcclxuICB0dGw/OiBudW1iZXI7XHJcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcclxuICBzZXJpYWxpemU/OiAodmFsdWU6IGFueSkgPT4gc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XHJcbiAgZGVzZXJpYWxpemU/OiAodmFsdWU6IHN0cmluZykgPT4gYW55O1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cnlQYXJzZVVSTChxOiBzdHJpbmcpIHtcclxuICB0cnkge1xyXG4gICAgcmV0dXJuIG5ldyBVUkwocSk7XHJcbiAgfSBjYXRjaCAoZSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxufVxyXG5cclxuLyoqIFNpbXBsZSBhbmQgY29tbW9uIEtleS12YWx1ZSBzdG9yYWdlIGludGVyZmFjZSBmb3IgbXVsdGlwbGUgRGF0YWJhc2UgYmFja2VuZHMuICovXHJcbmV4cG9ydCBjbGFzcyBLZXlkYiB7XHJcbiAgYWRhcHRlcj86IEFkYXB0ZXI7XHJcbiAgYXdhaXRSZWFkeT86IFByb21pc2U8QWRhcHRlcj47XHJcbiAgbmFtZXNwYWNlID0gXCJcIjtcclxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxyXG4gIHNlcmlhbGl6ZTogKHZhbHVlOiBhbnkpID0+IHN0cmluZyB8IHVuZGVmaW5lZCA9IEpTT05CLnN0cmluZ2lmeTtcclxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxyXG4gIGRlc2VyaWFsaXplOiAodmFsdWU6IHN0cmluZykgPT4gYW55ID0gSlNPTkIucGFyc2U7XHJcbiAgdHRsPzogbnVtYmVyO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFkYXB0ZXI6IEFkYXB0ZXIgfCBzdHJpbmcgPSBuZXcgTWVtb3J5QWRhcHRlcigpLFxyXG4gICAgb3B0aW9ucz86IEtleWRiT3B0aW9uc1xyXG4gICkge1xyXG4gICAgdGhpcy5hZGFwdGVyID0gdHlwZW9mIGFkYXB0ZXIgPT09IFwib2JqZWN0XCIgPyBhZGFwdGVyIDogdW5kZWZpbmVkO1xyXG4gICAgaWYgKHRoaXMuYWRhcHRlciA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBhZGFwdGVyICE9PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgIGNvbnN0IHByb3RvID0gdHJ5UGFyc2VVUkwoYWRhcHRlcik7XHJcbiAgICAgIGlmICghcHJvdG8pIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgQWRhcHRlciBDb25uZWN0aW9uIFVSSVwiKTtcclxuICAgICAgY29uc3QgcHJvdG9jb2wgPSBwcm90by5wcm90b2NvbDtcclxuICAgICAgY29uc3QgYWRwID0gQWRhcHRlcnMuZ2V0KHByb3RvY29sLnN1YnN0cigwLCBwcm90b2NvbC5sZW5ndGggLSAxKSk7XHJcbiAgICAgIGlmICghYWRwKSB0aHJvdyBuZXcgRXJyb3IoYEFkYXB0ZXIgbm90IGZvdW5kIGZvciBQcm90b2NvbDogJHtwcm90b2NvbH1gKTtcclxuICAgICAgY29uc3QgcmVzID0gYWRwLmluaXQocHJvdG8pO1xyXG4gICAgICBpZiAocmVzIGluc3RhbmNlb2YgUHJvbWlzZSkge1xyXG4gICAgICAgIHRoaXMuYXdhaXRSZWFkeSA9IHJlcy50aGVuKChhKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLmFkYXB0ZXIgPSBhO1xyXG4gICAgICAgICAgdGhpcy5hd2FpdFJlYWR5ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgcmV0dXJuIGE7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB0aGlzLmFkYXB0ZXIgPSByZXM7XHJcbiAgICB9XHJcbiAgICB0aGlzLm5hbWVzcGFjZSA9IG9wdGlvbnM/Lm5hbWVzcGFjZSA/PyBcIlwiO1xyXG4gICAgaWYgKG9wdGlvbnM/LnNlcmlhbGl6ZSkgdGhpcy5zZXJpYWxpemUgPSBvcHRpb25zLnNlcmlhbGl6ZTtcclxuICAgIGlmIChvcHRpb25zPy5kZXNlcmlhbGl6ZSkgdGhpcy5kZXNlcmlhbGl6ZSA9IG9wdGlvbnMuZGVzZXJpYWxpemU7XHJcbiAgICBpZiAob3B0aW9ucz8udHRsKSB0aGlzLnR0bCA9IG9wdGlvbnMudHRsO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGEgVmFsdWUgYnkgS2V5IG5hbWUuXHJcbiAgICpcclxuICAgKiBAcGFyYW0ga2V5IE5hbWUgb2YgS2V5IHRvIGdldCBWYWx1ZS5cclxuICAgKi9cclxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxyXG4gIGFzeW5jIGdldDxUID0gYW55PihrZXk6IHN0cmluZyk6IFByb21pc2U8VCB8IHVuZGVmaW5lZD4ge1xyXG4gICAgaWYgKHRoaXMuYXdhaXRSZWFkeSkgYXdhaXQgdGhpcy5hd2FpdFJlYWR5O1xyXG4gICAgYXdhaXQgdGhpcy5hZGFwdGVyPy5kZWxldGVFeHBpcmVkKHRoaXMubmFtZXNwYWNlKTtcclxuICAgIGNvbnN0IHZhbCA9IGF3YWl0IHRoaXMuYWRhcHRlcj8uZ2V0KGtleSwgdGhpcy5uYW1lc3BhY2UpO1xyXG4gICAgaWYgKHZhbCA9PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICBjb25zdCByZXMgPSB0aGlzLmRlc2VyaWFsaXplKHZhbC52YWx1ZSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0IGEgS2V5J3MgVmFsdWUuXHJcbiAgICpcclxuICAgKiBAcGFyYW0ga2V5IE5hbWUgb2YgdGhlIEtleSB0byBzZXQuXHJcbiAgICogQHBhcmFtIHZhbHVlIFZhbHVlIHRvIHNldC5cclxuICAgKi9cclxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxyXG4gIGFzeW5jIHNldChrZXk6IHN0cmluZywgdmFsdWU6IGFueSwgdHRsPzogbnVtYmVyKTogUHJvbWlzZTx0aGlzPiB7XHJcbiAgICBpZiAodGhpcy5hd2FpdFJlYWR5KSBhd2FpdCB0aGlzLmF3YWl0UmVhZHk7XHJcbiAgICBjb25zdCBfdHRsID0gdHRsID8/IHRoaXMudHRsO1xyXG4gICAgdmFsdWUgPSB7XHJcbiAgICAgIHZhbHVlLFxyXG4gICAgICB0dGw6IF90dGwgJiYgdHlwZW9mIF90dGwgPT09IFwibnVtYmVyXCIgPyBEYXRlLm5vdygpICsgX3R0bCA6IHVuZGVmaW5lZCxcclxuICAgIH07XHJcbiAgICBhd2FpdCB0aGlzLmFkYXB0ZXI/LnNldChcclxuICAgICAga2V5LFxyXG4gICAgICB0aGlzLnNlcmlhbGl6ZSh2YWx1ZS52YWx1ZSksXHJcbiAgICAgIHRoaXMubmFtZXNwYWNlLFxyXG4gICAgICB2YWx1ZS50dGxcclxuICAgICk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlbGV0ZSBhIEtleSBmcm9tIERhdGFiYXNlLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIGtleSBOYW1lIG9mIHRoZSBLZXkgdG8gZGVsZXRlLlxyXG4gICAqL1xyXG4gIGFzeW5jIGRlbGV0ZShrZXk6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgaWYgKHRoaXMuYXdhaXRSZWFkeSkgYXdhaXQgdGhpcy5hd2FpdFJlYWR5O1xyXG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLmFkYXB0ZXI/LmRlbGV0ZShrZXksIHRoaXMubmFtZXNwYWNlKSkgPz8gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvKiogQ2xlYXIgY29tcGxldGUgRGF0YWJhc2UuICovXHJcbiAgYXN5bmMgY2xlYXIoKTogUHJvbWlzZTx0aGlzPiB7XHJcbiAgICBpZiAodGhpcy5hd2FpdFJlYWR5KSBhd2FpdCB0aGlzLmF3YWl0UmVhZHk7XHJcbiAgICBhd2FpdCB0aGlzLmFkYXB0ZXI/LmNsZWFyKHRoaXMubmFtZXNwYWNlKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgLyoqIEdldCBhbiBBcnJheSBvZiBhbGwgS2V5IE5hbWVzLiAqL1xyXG4gIGFzeW5jIGtleXMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG4gICAgaWYgKHRoaXMuYXdhaXRSZWFkeSkgYXdhaXQgdGhpcy5hd2FpdFJlYWR5O1xyXG4gICAgYXdhaXQgdGhpcy5hZGFwdGVyPy5kZWxldGVFeHBpcmVkKHRoaXMubmFtZXNwYWNlKTtcclxuICAgIGNvbnN0IGtleXMgPSAoYXdhaXQgdGhpcy5hZGFwdGVyPy5rZXlzKHRoaXMubmFtZXNwYWNlKSkgPz8gW107XHJcbiAgICByZXR1cm4ga2V5cztcclxuICB9XHJcbn1cclxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQWtCLFFBQVEsUUFBUSxlQUFlO0FBQ2pELFNBQVMsS0FBSyxRQUFRLGFBQWE7QUFDbkMsU0FBUyxhQUFhLFFBQVEsY0FBYztBQVc1QyxTQUFTLFlBQVksQ0FBUyxFQUFFO0lBQzlCLElBQUk7UUFDRixPQUFPLElBQUksSUFBSTtJQUNqQixFQUFFLE9BQU8sR0FBRztRQUNWO0lBQ0Y7QUFDRjtBQUVBLGtGQUFrRixHQUNsRixPQUFPLE1BQU07SUFDWCxRQUFrQjtJQUNsQixXQUE4QjtJQUM5QixZQUFZLEdBQUc7SUFDZixtQ0FBbUM7SUFDbkMsWUFBZ0QsTUFBTSxTQUFTLENBQUM7SUFDaEUsbUNBQW1DO0lBQ25DLGNBQXNDLE1BQU0sS0FBSyxDQUFDO0lBQ2xELElBQWE7SUFFYixZQUNFLFVBQTRCLElBQUksZUFBZSxFQUMvQyxPQUFzQixDQUN0QjtRQUNBLElBQUks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