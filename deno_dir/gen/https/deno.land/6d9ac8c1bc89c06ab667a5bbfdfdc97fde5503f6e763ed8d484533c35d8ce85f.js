import { runScript } from "./run-script.ts";
export function template(str, locals) {
    const compiled = compile(str);
    return compiled(locals);
}
function compile(str) {
    // First pattern , note.
    // const es6TemplateRegex = /(\\)?\$\{\{([^(\{\})]+)\}\}/g;
    const es6TemplateRegex = /(\\)?\$\{\{(.*?)\}\}/g;
    const es6TemplateStartRegex = /\$\{\{/g;
    const es6TemplateEndRegex = /\}\}/g;
    return async function(locals) {
        const matched = str.match(es6TemplateRegex);
        const startMatched = str.match(es6TemplateStartRegex);
        const endMatched = str.match(es6TemplateEndRegex);
        if (Array.isArray(matched) && matched.length === 1 && startMatched && startMatched.length === 1 && endMatched && endMatched.length === 1) {
            // single variable
            if (str.startsWith("${{") && str.endsWith("}}")) {
                // single parse mode
                const result = await replaceAsync(str, es6TemplateRegex, function(matched) {
                    return parse(matched)(locals || {});
                }, {
                    single: true
                });
                return result;
            }
        }
        const result1 = await replaceAsync(str, es6TemplateRegex, function(matched) {
            return parse(matched)(locals || {});
        }, {
            single: false
        });
        // console.log("result", result);
        return result1;
    };
}
async function replaceAsync(str, regex, asyncFn, options) {
    let isSingle = false;
    if (options && options.single) {
        isSingle = true;
    }
    const promises = [];
    const tempStr = str;
    tempStr.replace(regex, (match, ..._args)=>{
        const promise = asyncFn(match);
        promises.push(promise);
        return "";
    });
    const data = await Promise.all(promises);
    let result;
    const regularReplacedResult = str.replace(regex, ()=>{
        const replaced = data.shift();
        if (isSingle) {
            result = replaced;
            return replaced;
        } else {
            return replaced;
        }
    });
    if (isSingle) {
        return result;
    } else {
        return regularReplacedResult;
    }
}
function parse(variable) {
    const matched = variable.match(/\{\{(.+)\}\}/);
    if (Array.isArray(matched) && matched.length > 0) {
        const exp = matched[1];
        if (variable[0] === "\\") {
            return async function(_locals) {
                return await variable.slice(1);
            };
        }
        // handle ${{}} and ${{ }} , not translate these pattern
        if (exp.trim() === "") {
            return async function(_locals) {
                return await variable;
            };
        }
        return async function(locals) {
            const scriptResult = await runScript(`return ${exp};`, locals);
            return scriptResult.result;
        };
    } else {
        return async function(_locals) {
            return await variable;
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvdXRpbHMvdGVtcGxhdGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcnVuU2NyaXB0IH0gZnJvbSBcIi4vcnVuLXNjcmlwdC50c1wiO1xuZXhwb3J0IGZ1bmN0aW9uIHRlbXBsYXRlKFxuICBzdHI6IHN0cmluZyxcbiAgbG9jYWxzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbik6IFByb21pc2U8dW5rbm93bj4ge1xuICBjb25zdCBjb21waWxlZCA9IGNvbXBpbGUoc3RyKTtcbiAgcmV0dXJuIGNvbXBpbGVkKGxvY2Fscyk7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGUoXG4gIHN0cjogc3RyaW5nLFxuKTogKGxvY2FsczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IFByb21pc2U8dW5rbm93bj4ge1xuICAvLyBGaXJzdCBwYXR0ZXJuICwgbm90ZS5cbiAgLy8gY29uc3QgZXM2VGVtcGxhdGVSZWdleCA9IC8oXFxcXCk/XFwkXFx7XFx7KFteKFxce1xcfSldKylcXH1cXH0vZztcbiAgY29uc3QgZXM2VGVtcGxhdGVSZWdleCA9IC8oXFxcXCk/XFwkXFx7XFx7KC4qPylcXH1cXH0vZztcblxuICBjb25zdCBlczZUZW1wbGF0ZVN0YXJ0UmVnZXggPSAvXFwkXFx7XFx7L2c7XG4gIGNvbnN0IGVzNlRlbXBsYXRlRW5kUmVnZXggPSAvXFx9XFx9L2c7XG5cbiAgcmV0dXJuIGFzeW5jIGZ1bmN0aW9uIChsb2NhbHM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gICAgY29uc3QgbWF0Y2hlZCA9IHN0ci5tYXRjaChlczZUZW1wbGF0ZVJlZ2V4KTtcbiAgICBjb25zdCBzdGFydE1hdGNoZWQgPSBzdHIubWF0Y2goZXM2VGVtcGxhdGVTdGFydFJlZ2V4KTtcbiAgICBjb25zdCBlbmRNYXRjaGVkID0gc3RyLm1hdGNoKGVzNlRlbXBsYXRlRW5kUmVnZXgpO1xuXG4gICAgaWYgKFxuICAgICAgQXJyYXkuaXNBcnJheShtYXRjaGVkKSAmJiBtYXRjaGVkLmxlbmd0aCA9PT0gMSAmJiBzdGFydE1hdGNoZWQgJiZcbiAgICAgIHN0YXJ0TWF0Y2hlZC5sZW5ndGggPT09IDEgJiYgZW5kTWF0Y2hlZCAmJiBlbmRNYXRjaGVkLmxlbmd0aCA9PT0gMVxuICAgICkge1xuICAgICAgLy8gc2luZ2xlIHZhcmlhYmxlXG4gICAgICBpZiAoc3RyLnN0YXJ0c1dpdGgoXCIke3tcIikgJiYgc3RyLmVuZHNXaXRoKFwifX1cIikpIHtcbiAgICAgICAgLy8gc2luZ2xlIHBhcnNlIG1vZGVcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVwbGFjZUFzeW5jKFxuICAgICAgICAgIHN0cixcbiAgICAgICAgICBlczZUZW1wbGF0ZVJlZ2V4LFxuICAgICAgICAgIGZ1bmN0aW9uIChtYXRjaGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2UobWF0Y2hlZCkobG9jYWxzIHx8IHt9KTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNpbmdsZTogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVwbGFjZUFzeW5jKFxuICAgICAgc3RyLFxuICAgICAgZXM2VGVtcGxhdGVSZWdleCxcbiAgICAgIGZ1bmN0aW9uIChtYXRjaGVkKSB7XG4gICAgICAgIHJldHVybiBwYXJzZShtYXRjaGVkKShsb2NhbHMgfHwge30pO1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgc2luZ2xlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgKTtcbiAgICAvLyBjb25zb2xlLmxvZyhcInJlc3VsdFwiLCByZXN1bHQpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cbmFzeW5jIGZ1bmN0aW9uIHJlcGxhY2VBc3luYyhcbiAgc3RyOiBzdHJpbmcsXG4gIHJlZ2V4OiBSZWdFeHAsXG4gIGFzeW5jRm46IChtYXRjaDogc3RyaW5nKSA9PiBQcm9taXNlPHN0cmluZz4sXG4gIG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuKSB7XG4gIGxldCBpc1NpbmdsZSA9IGZhbHNlO1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnNpbmdsZSkge1xuICAgIGlzU2luZ2xlID0gdHJ1ZTtcbiAgfVxuICBjb25zdCBwcm9taXNlczogUHJvbWlzZTxzdHJpbmc+W10gPSBbXTtcbiAgY29uc3QgdGVtcFN0ciA9IHN0cjtcbiAgdGVtcFN0ci5yZXBsYWNlKHJlZ2V4LCAobWF0Y2gsIC4uLl9hcmdzKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBwcm9taXNlID0gYXN5bmNGbihtYXRjaCk7XG4gICAgcHJvbWlzZXMucHVzaChwcm9taXNlKTtcbiAgICByZXR1cm4gXCJcIjtcbiAgfSk7XG4gIGNvbnN0IGRhdGEgPSBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gIGxldCByZXN1bHQ7XG5cbiAgY29uc3QgcmVndWxhclJlcGxhY2VkUmVzdWx0ID0gc3RyLnJlcGxhY2UocmVnZXgsICgpID0+IHtcbiAgICBjb25zdCByZXBsYWNlZCA9IGRhdGEuc2hpZnQoKSBhcyBzdHJpbmc7XG4gICAgaWYgKGlzU2luZ2xlKSB7XG4gICAgICByZXN1bHQgPSByZXBsYWNlZDtcbiAgICAgIHJldHVybiByZXBsYWNlZDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHJlcGxhY2VkO1xuICAgIH1cbiAgfSk7XG4gIGlmIChpc1NpbmdsZSkge1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJlZ3VsYXJSZXBsYWNlZFJlc3VsdDtcbiAgfVxufVxuZnVuY3Rpb24gcGFyc2UoXG4gIHZhcmlhYmxlOiBzdHJpbmcsXG4pOiAobG9jYWxzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgPT4gUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgbWF0Y2hlZCA9IHZhcmlhYmxlLm1hdGNoKC9cXHtcXHsoLispXFx9XFx9Lyk7XG4gIGlmIChBcnJheS5pc0FycmF5KG1hdGNoZWQpICYmIG1hdGNoZWQubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGV4cCA9IG1hdGNoZWRbMV07XG5cbiAgICBpZiAodmFyaWFibGVbMF0gPT09IFwiXFxcXFwiKSB7XG4gICAgICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKF9sb2NhbHM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB2YXJpYWJsZS5zbGljZSgxKTtcbiAgICAgIH07XG4gICAgfVxuICAgIC8vIGhhbmRsZSAke3t9fSBhbmQgJHt7IH19ICwgbm90IHRyYW5zbGF0ZSB0aGVzZSBwYXR0ZXJuXG4gICAgaWYgKGV4cC50cmltKCkgPT09IFwiXCIpIHtcbiAgICAgIHJldHVybiBhc3luYyBmdW5jdGlvbiAoX2xvY2FsczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHZhcmlhYmxlO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKGxvY2FsczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgICAgIGNvbnN0IHNjcmlwdFJlc3VsdCA9IGF3YWl0IHJ1blNjcmlwdChgcmV0dXJuICR7ZXhwfTtgLCBsb2NhbHMpO1xuXG4gICAgICByZXR1cm4gc2NyaXB0UmVzdWx0LnJlc3VsdDtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBhc3luYyBmdW5jdGlvbiAoX2xvY2FsczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgICAgIHJldHVybiBhd2FpdCB2YXJpYWJsZTtcbiAgICB9O1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxTQUFTLFFBQVEsa0JBQWtCO0FBQzVDLE9BQU8sU0FBUyxTQUNkLEdBQVcsRUFDWCxN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