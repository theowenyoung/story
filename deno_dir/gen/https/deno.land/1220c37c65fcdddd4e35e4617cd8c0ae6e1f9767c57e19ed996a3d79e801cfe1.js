import { difference, removeEmptyValues } from "./util.ts";
export function parse(rawDotenv) {
    const env = {};
    for (const line of rawDotenv.split("\n")){
        if (!isVariableStart(line)) continue;
        const key = line.slice(0, line.indexOf("=")).trim();
        let value = line.slice(line.indexOf("=") + 1).trim();
        if (hasSingleQuotes(value)) {
            value = value.slice(1, -1);
        } else if (hasDoubleQuotes(value)) {
            value = value.slice(1, -1);
            value = expandNewlines(value);
        } else value = value.trim();
        env[key] = value;
    }
    return env;
}
const defaultConfigOptions = {
    path: `.env`,
    export: false,
    safe: false,
    example: `.env.example`,
    allowEmptyValues: false,
    defaults: `.env.defaults`
};
export function config(options = {}) {
    const o = {
        ...defaultConfigOptions,
        ...options
    };
    const conf = parseFile(o.path);
    if (o.defaults) {
        const confDefaults = parseFile(o.defaults);
        for(const key in confDefaults){
            if (!(key in conf)) {
                conf[key] = confDefaults[key];
            }
        }
    }
    if (o.safe) {
        const confExample = parseFile(o.example);
        assertSafe(conf, confExample, o.allowEmptyValues);
    }
    if (o.export) {
        for(const key in conf){
            if (Deno.env.get(key) !== undefined) continue;
            Deno.env.set(key, conf[key]);
        }
    }
    return conf;
}
export async function configAsync(options = {}) {
    const o = {
        ...defaultConfigOptions,
        ...options
    };
    const conf = await parseFileAsync(o.path);
    if (o.defaults) {
        const confDefaults = await parseFileAsync(o.defaults);
        for(const key in confDefaults){
            if (!(key in conf)) {
                conf[key] = confDefaults[key];
            }
        }
    }
    if (o.safe) {
        const confExample = await parseFileAsync(o.example);
        assertSafe(conf, confExample, o.allowEmptyValues);
    }
    if (o.export) {
        for(const key in conf){
            if (Deno.env.get(key) !== undefined) continue;
            Deno.env.set(key, conf[key]);
        }
    }
    return conf;
}
function parseFile(filepath) {
    try {
        return parse(new TextDecoder("utf-8").decode(Deno.readFileSync(filepath)));
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) return {};
        throw e;
    }
}
async function parseFileAsync(filepath) {
    try {
        return parse(new TextDecoder("utf-8").decode(await Deno.readFile(filepath)));
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) return {};
        throw e;
    }
}
function isVariableStart(str) {
    return /^\s*[a-zA-Z_][a-zA-Z_0-9 ]*\s*=/.test(str);
}
function hasSingleQuotes(str) {
    return /^'([\s\S]*)'$/.test(str);
}
function hasDoubleQuotes(str) {
    return /^"([\s\S]*)"$/.test(str);
}
function expandNewlines(str) {
    return str.replaceAll("\\n", "\n");
}
function assertSafe(conf, confExample, allowEmptyValues) {
    const currentEnv = Deno.env.toObject();
    // Not all the variables have to be defined in .env, they can be supplied externally
    const confWithEnv = Object.assign({}, currentEnv, conf);
    const missing = difference(Object.keys(confExample), // If allowEmptyValues is false, filter out empty values from configuration
    Object.keys(allowEmptyValues ? confWithEnv : removeEmptyValues(confWithEnv)));
    if (missing.length > 0) {
        const errorMessages = [
            `The following variables were defined in the example file but are not present in the environment:\n  ${missing.join(", ")}`,
            `Make sure to add them to your env file.`,
            !allowEmptyValues && `If you expect any of these variables to be empty, you can set the allowEmptyValues option to true.`
        ];
        throw new MissingEnvVarsError(errorMessages.filter(Boolean).join("\n\n"));
    }
}
export class MissingEnvVarsError extends Error {
    constructor(message){
        super(message);
        this.name = "MissingEnvVarsError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZG90ZW52QHYzLjEuMC9tb2QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZGlmZmVyZW5jZSwgcmVtb3ZlRW1wdHlWYWx1ZXMgfSBmcm9tIFwiLi91dGlsLnRzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRG90ZW52Q29uZmlnIHtcbiAgW2tleTogc3RyaW5nXTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ09wdGlvbnMge1xuICBwYXRoPzogc3RyaW5nO1xuICBleHBvcnQ/OiBib29sZWFuO1xuICBzYWZlPzogYm9vbGVhbjtcbiAgZXhhbXBsZT86IHN0cmluZztcbiAgYWxsb3dFbXB0eVZhbHVlcz86IGJvb2xlYW47XG4gIGRlZmF1bHRzPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2UocmF3RG90ZW52OiBzdHJpbmcpOiBEb3RlbnZDb25maWcge1xuICBjb25zdCBlbnY6IERvdGVudkNvbmZpZyA9IHt9O1xuXG4gIGZvciAoY29uc3QgbGluZSBvZiByYXdEb3RlbnYuc3BsaXQoXCJcXG5cIikpIHtcbiAgICBpZiAoIWlzVmFyaWFibGVTdGFydChsaW5lKSkgY29udGludWU7XG4gICAgY29uc3Qga2V5ID0gbGluZS5zbGljZSgwLCBsaW5lLmluZGV4T2YoXCI9XCIpKS50cmltKCk7XG4gICAgbGV0IHZhbHVlID0gbGluZS5zbGljZShsaW5lLmluZGV4T2YoXCI9XCIpICsgMSkudHJpbSgpO1xuICAgIGlmIChoYXNTaW5nbGVRdW90ZXModmFsdWUpKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnNsaWNlKDEsIC0xKTtcbiAgICB9IGVsc2UgaWYgKGhhc0RvdWJsZVF1b3Rlcyh2YWx1ZSkpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUuc2xpY2UoMSwgLTEpO1xuICAgICAgdmFsdWUgPSBleHBhbmROZXdsaW5lcyh2YWx1ZSk7XG4gICAgfSBlbHNlIHZhbHVlID0gdmFsdWUudHJpbSgpO1xuICAgIGVudltrZXldID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gZW52O1xufVxuXG5jb25zdCBkZWZhdWx0Q29uZmlnT3B0aW9ucyA9IHtcbiAgcGF0aDogYC5lbnZgLFxuICBleHBvcnQ6IGZhbHNlLFxuICBzYWZlOiBmYWxzZSxcbiAgZXhhbXBsZTogYC5lbnYuZXhhbXBsZWAsXG4gIGFsbG93RW1wdHlWYWx1ZXM6IGZhbHNlLFxuICBkZWZhdWx0czogYC5lbnYuZGVmYXVsdHNgLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZyhvcHRpb25zOiBDb25maWdPcHRpb25zID0ge30pOiBEb3RlbnZDb25maWcge1xuICBjb25zdCBvOiBSZXF1aXJlZDxDb25maWdPcHRpb25zPiA9IHsgLi4uZGVmYXVsdENvbmZpZ09wdGlvbnMsIC4uLm9wdGlvbnMgfTtcblxuICBjb25zdCBjb25mID0gcGFyc2VGaWxlKG8ucGF0aCk7XG5cbiAgaWYgKG8uZGVmYXVsdHMpIHtcbiAgICBjb25zdCBjb25mRGVmYXVsdHMgPSBwYXJzZUZpbGUoby5kZWZhdWx0cyk7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gY29uZkRlZmF1bHRzKSB7XG4gICAgICBpZiAoIShrZXkgaW4gY29uZikpIHtcbiAgICAgICAgY29uZltrZXldID0gY29uZkRlZmF1bHRzW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKG8uc2FmZSkge1xuICAgIGNvbnN0IGNvbmZFeGFtcGxlID0gcGFyc2VGaWxlKG8uZXhhbXBsZSk7XG4gICAgYXNzZXJ0U2FmZShjb25mLCBjb25mRXhhbXBsZSwgby5hbGxvd0VtcHR5VmFsdWVzKTtcbiAgfVxuXG4gIGlmIChvLmV4cG9ydCkge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGNvbmYpIHtcbiAgICAgIGlmIChEZW5vLmVudi5nZXQoa2V5KSAhPT0gdW5kZWZpbmVkKSBjb250aW51ZTtcbiAgICAgIERlbm8uZW52LnNldChrZXksIGNvbmZba2V5XSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNvbmY7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25maWdBc3luYyhcbiAgb3B0aW9uczogQ29uZmlnT3B0aW9ucyA9IHt9LFxuKTogUHJvbWlzZTxEb3RlbnZDb25maWc+IHtcbiAgY29uc3QgbzogUmVxdWlyZWQ8Q29uZmlnT3B0aW9ucz4gPSB7IC4uLmRlZmF1bHRDb25maWdPcHRpb25zLCAuLi5vcHRpb25zIH07XG5cbiAgY29uc3QgY29uZiA9IGF3YWl0IHBhcnNlRmlsZUFzeW5jKG8ucGF0aCk7XG5cbiAgaWYgKG8uZGVmYXVsdHMpIHtcbiAgICBjb25zdCBjb25mRGVmYXVsdHMgPSBhd2FpdCBwYXJzZUZpbGVBc3luYyhvLmRlZmF1bHRzKTtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBjb25mRGVmYXVsdHMpIHtcbiAgICAgIGlmICghKGtleSBpbiBjb25mKSkge1xuICAgICAgICBjb25mW2tleV0gPSBjb25mRGVmYXVsdHNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoby5zYWZlKSB7XG4gICAgY29uc3QgY29uZkV4YW1wbGUgPSBhd2FpdCBwYXJzZUZpbGVBc3luYyhvLmV4YW1wbGUpO1xuICAgIGFzc2VydFNhZmUoY29uZiwgY29uZkV4YW1wbGUsIG8uYWxsb3dFbXB0eVZhbHVlcyk7XG4gIH1cblxuICBpZiAoby5leHBvcnQpIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBjb25mKSB7XG4gICAgICBpZiAoRGVuby5lbnYuZ2V0KGtleSkgIT09IHVuZGVmaW5lZCkgY29udGludWU7XG4gICAgICBEZW5vLmVudi5zZXQoa2V5LCBjb25mW2tleV0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb25mO1xufVxuXG5mdW5jdGlvbiBwYXJzZUZpbGUoZmlsZXBhdGg6IHN0cmluZykge1xuICB0cnkge1xuICAgIHJldHVybiBwYXJzZShuZXcgVGV4dERlY29kZXIoXCJ1dGYtOFwiKS5kZWNvZGUoRGVuby5yZWFkRmlsZVN5bmMoZmlsZXBhdGgpKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSByZXR1cm4ge307XG4gICAgdGhyb3cgZTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwYXJzZUZpbGVBc3luYyhmaWxlcGF0aDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHBhcnNlKFxuICAgICAgbmV3IFRleHREZWNvZGVyKFwidXRmLThcIikuZGVjb2RlKGF3YWl0IERlbm8ucmVhZEZpbGUoZmlsZXBhdGgpKSxcbiAgICApO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkgcmV0dXJuIHt9O1xuICAgIHRocm93IGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNWYXJpYWJsZVN0YXJ0KHN0cjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAvXlxccypbYS16QS1aX11bYS16QS1aXzAtOSBdKlxccyo9Ly50ZXN0KHN0cik7XG59XG5cbmZ1bmN0aW9uIGhhc1NpbmdsZVF1b3RlcyhzdHI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gL14nKFtcXHNcXFNdKiknJC8udGVzdChzdHIpO1xufVxuXG5mdW5jdGlvbiBoYXNEb3VibGVRdW90ZXMoc3RyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIC9eXCIoW1xcc1xcU10qKVwiJC8udGVzdChzdHIpO1xufVxuXG5mdW5jdGlvbiBleHBhbmROZXdsaW5lcyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzdHIucmVwbGFjZUFsbChcIlxcXFxuXCIsIFwiXFxuXCIpO1xufVxuXG5mdW5jdGlvbiBhc3NlcnRTYWZlKFxuICBjb25mOiBEb3RlbnZDb25maWcsXG4gIGNvbmZFeGFtcGxlOiBEb3RlbnZDb25maWcsXG4gIGFsbG93RW1wdHlWYWx1ZXM6IGJvb2xlYW4sXG4pIHtcbiAgY29uc3QgY3VycmVudEVudiA9IERlbm8uZW52LnRvT2JqZWN0KCk7XG5cbiAgLy8gTm90IGFsbCB0aGUgdmFyaWFibGVzIGhhdmUgdG8gYmUgZGVmaW5lZCBpbiAuZW52LCB0aGV5IGNhbiBiZSBzdXBwbGllZCBleHRlcm5hbGx5XG4gIGNvbnN0IGNvbmZXaXRoRW52ID0gT2JqZWN0LmFzc2lnbih7fSwgY3VycmVudEVudiwgY29uZik7XG5cbiAgY29uc3QgbWlzc2luZyA9IGRpZmZlcmVuY2UoXG4gICAgT2JqZWN0LmtleXMoY29uZkV4YW1wbGUpLFxuICAgIC8vIElmIGFsbG93RW1wdHlWYWx1ZXMgaXMgZmFsc2UsIGZpbHRlciBvdXQgZW1wdHkgdmFsdWVzIGZyb20gY29uZmlndXJhdGlvblxuICAgIE9iamVjdC5rZXlzKFxuICAgICAgYWxsb3dFbXB0eVZhbHVlcyA/IGNvbmZXaXRoRW52IDogcmVtb3ZlRW1wdHlWYWx1ZXMoY29uZldpdGhFbnYpLFxuICAgICksXG4gICk7XG5cbiAgaWYgKG1pc3NpbmcubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGVycm9yTWVzc2FnZXMgPSBbXG4gICAgICBgVGhlIGZvbGxvd2luZyB2YXJpYWJsZXMgd2VyZSBkZWZpbmVkIGluIHRoZSBleGFtcGxlIGZpbGUgYnV0IGFyZSBub3QgcHJlc2VudCBpbiB0aGUgZW52aXJvbm1lbnQ6XFxuICAke1xuICAgICAgICBtaXNzaW5nLmpvaW4oXG4gICAgICAgICAgXCIsIFwiLFxuICAgICAgICApXG4gICAgICB9YCxcbiAgICAgIGBNYWtlIHN1cmUgdG8gYWRkIHRoZW0gdG8geW91ciBlbnYgZmlsZS5gLFxuICAgICAgIWFsbG93RW1wdHlWYWx1ZXMgJiZcbiAgICAgIGBJZiB5b3UgZXhwZWN0IGFueSBvZiB0aGVzZSB2YXJpYWJsZXMgdG8gYmUgZW1wdHksIHlvdSBjYW4gc2V0IHRoZSBhbGxvd0VtcHR5VmFsdWVzIG9wdGlvbiB0byB0cnVlLmAsXG4gICAgXTtcblxuICAgIHRocm93IG5ldyBNaXNzaW5nRW52VmFyc0Vycm9yKGVycm9yTWVzc2FnZXMuZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCJcXG5cXG5cIikpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNaXNzaW5nRW52VmFyc0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlPzogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gXCJNaXNzaW5nRW52VmFyc0Vycm9yXCI7XG4gICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsIG5ldy50YXJnZXQucHJvdG90eXBlKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsVUFBVSxFQUFFLGlCQUFpQixRQUFRLFlBQVk7QUFlMUQsT0FBTyxTQUFTLE1BQU0sU0FBaUIsRUFBZ0I7SUFDckQsTUFBTSxNQUFvQixDQUFDO0lBRTNCLEtBQUssTUFBTSxRQUFRLFVBQVUsS0FBSyxDQUFDLE1BQU87UUFDeEMsSUFBSSxDQUFDLGdCQUFnQixPQUFPLFFBQVM7UUFDckMsTUFBTSxNQUFNLEtBQUssS0FBSyxDQUFDLEdBQUcsS0FBSyxPQUFPLENBQUMsTUFBTSxJQUFJO1FBQ2pELElBQUksUUFBUSxLQUFLLEtBQUssQ0FBQyxLQUFLLE9BQU8sQ0FBQyxPQUFPLEdBQUcsSUFBSTtRQUNsRCxJQUFJLGdCQUFnQixRQUFRO1lBQzFCLFFBQVEsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDO1FBQzFCLE9BQU8sSUFBSSxnQkFBZ0IsUUFBUTtZQUNqQyxRQUFRLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztZQUN4QixRQUFRLGVBQWU7UUFDekIsT0FBTyxRQUFRLE1BQU0sSUFBSTtRQUN6QixHQUFHLENBQUMsSUFBSSxHQUFHO0lBQ2I7SUFFQSxPQUFPO0FBQ1QsQ0FBQztBQUVELE1BQU0sdUJBQXVCO0lBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDWixRQUFRLEtBQUs7SUFDYixNQUFNLEtBQUs7SUFDWCxTQUFTLENBQUMsWUFBWSxDQUFDO0lBQ3ZCLGtCQUFrQixLQUFL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