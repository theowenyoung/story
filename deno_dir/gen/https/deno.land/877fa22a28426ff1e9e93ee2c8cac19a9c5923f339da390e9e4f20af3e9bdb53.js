import { Buffer } from "https://deno.land/std@0.86.0/node/buffer.ts";
// deno-lint-ignore no-namespace
export var JSONB;
(function(JSONB) {
    var stringify = JSONB.stringify = function stringify(o) {
        if ("undefined" == typeof o) return o;
        if (o && Buffer.isBuffer(o)) return JSON.stringify(":base64:" + o.toString("base64"));
        if (o && o instanceof Map) return JSON.stringify(":map:" + JSON.stringify(Object.fromEntries(o)));
        if (o && o.toJSON) o = o.toJSON();
        if (o && "object" === typeof o) {
            var s = "";
            var array = Array.isArray(o);
            s = array ? "[" : "{";
            var first = true;
            for(var k in o){
                var ignore = "function" == typeof o[k] || !array && "undefined" === typeof o[k];
                if (Object.hasOwnProperty.call(o, k) && !ignore) {
                    if (!first) s += ",";
                    first = false;
                    if (array) {
                        if (o[k] == undefined) s += "null";
                        else s += stringify(o[k]);
                    } else if (o[k] !== void 0) {
                        s += stringify(k) + ":" + stringify(o[k]);
                    }
                }
            }
            s += array ? "]" : "}";
            return s;
        } else if ("string" === typeof o) {
            return JSON.stringify(/^:/.test(o) ? ":" + o : o);
        } else if ("undefined" === typeof o) {
            return "null";
        } else return JSON.stringify(o);
    };
    var parse = JSONB.parse = function(s) {
        return JSON.parse(s, function(_, value) {
            if ("string" === typeof value) {
                if (/^:base64:/.test(value)) return Buffer.from(value.substring(8), "base64");
                if (/^:map:/.test(value)) return new Map(Object.entries(JSON.parse(value.substring(5))));
                else return /^:/.test(value) ? value.substring(1) : value;
            }
            return value;
        });
    };
})(JSONB || (JSONB = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gva2V5ZGJAMS4wLjAvanNvbmIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQnVmZmVyIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjg2LjAvbm9kZS9idWZmZXIudHNcIjtcclxuXHJcbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tbmFtZXNwYWNlXHJcbmV4cG9ydCBuYW1lc3BhY2UgSlNPTkIge1xyXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XHJcbiAgZXhwb3J0IGNvbnN0IHN0cmluZ2lmeSA9IGZ1bmN0aW9uIHN0cmluZ2lmeShvOiBhbnkpIHtcclxuICAgIGlmIChcInVuZGVmaW5lZFwiID09IHR5cGVvZiBvKSByZXR1cm4gbztcclxuXHJcbiAgICBpZiAobyAmJiBCdWZmZXIuaXNCdWZmZXIobykpXHJcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShcIjpiYXNlNjQ6XCIgKyBvLnRvU3RyaW5nKFwiYmFzZTY0XCIpKTtcclxuICAgIGlmIChvICYmIG8gaW5zdGFuY2VvZiBNYXApXHJcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShcIjptYXA6XCIgKyBKU09OLnN0cmluZ2lmeShPYmplY3QuZnJvbUVudHJpZXMobykpKTtcclxuXHJcbiAgICBpZiAobyAmJiBvLnRvSlNPTikgbyA9IG8udG9KU09OKCk7XHJcblxyXG4gICAgaWYgKG8gJiYgXCJvYmplY3RcIiA9PT0gdHlwZW9mIG8pIHtcclxuICAgICAgdmFyIHMgPSBcIlwiO1xyXG4gICAgICB2YXIgYXJyYXkgPSBBcnJheS5pc0FycmF5KG8pO1xyXG4gICAgICBzID0gYXJyYXkgPyBcIltcIiA6IFwie1wiO1xyXG4gICAgICB2YXIgZmlyc3QgPSB0cnVlO1xyXG5cclxuICAgICAgZm9yICh2YXIgayBpbiBvKSB7XHJcbiAgICAgICAgdmFyIGlnbm9yZSA9XHJcbiAgICAgICAgICBcImZ1bmN0aW9uXCIgPT0gdHlwZW9mIG9ba10gfHwgKCFhcnJheSAmJiBcInVuZGVmaW5lZFwiID09PSB0eXBlb2Ygb1trXSk7XHJcbiAgICAgICAgaWYgKE9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIGspICYmICFpZ25vcmUpIHtcclxuICAgICAgICAgIGlmICghZmlyc3QpIHMgKz0gXCIsXCI7XHJcbiAgICAgICAgICBmaXJzdCA9IGZhbHNlO1xyXG4gICAgICAgICAgaWYgKGFycmF5KSB7XHJcbiAgICAgICAgICAgIGlmIChvW2tdID09IHVuZGVmaW5lZCkgcyArPSBcIm51bGxcIjtcclxuICAgICAgICAgICAgZWxzZSBzICs9IHN0cmluZ2lmeShvW2tdKTtcclxuICAgICAgICAgIH0gZWxzZSBpZiAob1trXSAhPT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgIHMgKz0gc3RyaW5naWZ5KGspICsgXCI6XCIgKyBzdHJpbmdpZnkob1trXSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBzICs9IGFycmF5ID8gXCJdXCIgOiBcIn1cIjtcclxuXHJcbiAgICAgIHJldHVybiBzO1xyXG4gICAgfSBlbHNlIGlmIChcInN0cmluZ1wiID09PSB0eXBlb2Ygbykge1xyXG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoL146Ly50ZXN0KG8pID8gXCI6XCIgKyBvIDogbyk7XHJcbiAgICB9IGVsc2UgaWYgKFwidW5kZWZpbmVkXCIgPT09IHR5cGVvZiBvKSB7XHJcbiAgICAgIHJldHVybiBcIm51bGxcIjtcclxuICAgIH0gZWxzZSByZXR1cm4gSlNPTi5zdHJpbmdpZnkobyk7XHJcbiAgfTtcclxuXHJcbiAgZXhwb3J0IGNvbnN0IHBhcnNlID0gZnVuY3Rpb24gKHM6IHN0cmluZykge1xyXG4gICAgcmV0dXJuIEpTT04ucGFyc2UocywgZnVuY3Rpb24gKF8sIHZhbHVlKSB7XHJcbiAgICAgIGlmIChcInN0cmluZ1wiID09PSB0eXBlb2YgdmFsdWUpIHtcclxuICAgICAgICBpZiAoL146YmFzZTY0Oi8udGVzdCh2YWx1ZSkpXHJcbiAgICAgICAgICByZXR1cm4gQnVmZmVyLmZyb20odmFsdWUuc3Vic3RyaW5nKDgpLCBcImJhc2U2NFwiKTtcclxuICAgICAgICBpZiAoL146bWFwOi8udGVzdCh2YWx1ZSkpXHJcbiAgICAgICAgICByZXR1cm4gbmV3IE1hcChPYmplY3QuZW50cmllcyhKU09OLnBhcnNlKHZhbHVlLnN1YnN0cmluZyg1KSkpKTtcclxuICAgICAgICBlbHNlIHJldHVybiAvXjovLnRlc3QodmFsdWUpID8gdmFsdWUuc3Vic3RyaW5nKDEpIDogdmFsdWU7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfSk7XHJcbiAgfTtcclxufVxyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxNQUFNLFFBQVEsOENBQThDO0FBRXJFLGdDQUFnQztBQUNoQyxPQUFPLElBQVUsTUF1RGhCOztRQXJEYyxrQkFBQSxZQUFZLFNBQVMsVUFBVSxDQUFNLEVBQUU7UUFDbEQsSUFBSSxlQUFlLE9BQU8sR0FBRyxPQUFPO1FBRXBDLElBQUksS0FBSyxPQUFPLFFBQVEsQ0FBQyxJQUN2QixPQUFPLEtBQUssU0FBUyxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUM7UUFDaEQsSUFBSSxLQUFLLGFBQWEsS0FDcEIsT0FBTyxLQUFLLFNBQVMsQ0FBQyxVQUFVLEtBQUssU0FBUyxDQUFDLE9BQU8sV0FBVyxDQUFDO1FBRXBFLElBQUksS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTTtRQUUvQixJQUFJLEtBQUssYUFBYSxPQUFPLEdBQUc7WUFDOUIsSUFBSSxJQUFJO1lBQ1IsSUFBSSxRQUFRLE1BQU0sT0FBTyxDQUFDO1lBQzFCLElBQUksUUFBUSxNQUFNLEdBQUc7WUFDckIsSUFBSSxRQUFRLElBQUk7WUFFaEIsSUFBSyxJQUFJLEtBQUssRUFBRztnQkFDZixJQUFJLFNBQ0YsY0FBYyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUssQ0FBQyxTQUFTLGdCQUFnQixPQUFPLENBQUMsQ0FBQyxFQUFFO2dCQUNyRSxJQUFJLE9BQU8sY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxRQUFRO29CQUMvQyxJQUFJLENBQUMsT0FBTyxLQUFLO29CQUNqQixRQUFRLEtBQUs7b0JBQ2IsSUFBSSxPQUFPO3dCQUNULElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxXQUFXLEtBQUs7NkJBQ3ZCLEtBQUssVUFBVSxDQUFDLENBQUMsRUFBRTtvQkFDMUIsT0FBTyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssS0FBSyxHQUFHO3dCQUMxQixLQUFLLFVBQVUsS0FBSyxNQUFNLFVBQVUsQ0FBQyxDQUFDLEVBQUU7b0JBQzFDLENBQUM7Z0JBQ0gsQ0FBQztZQUNIO1lBRUEsS0FBSyxRQUFRLE1BQU0sR0FBRztZQUV0QixPQUFPO1FBQ1QsT0FBTyxJQUFJLGFBQWEsT0FBTyxHQUFHO1lBQ2hDLE9BQU8sS0FBSyxTQUFTLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxNQUFNLElBQUksQ0FBQztRQUNsRCxPQUFPLElBQUksZ0JBQWdCLE9BQU8sR0FBRztZQUNuQyxPQUFPO1FBQ1QsT0FBTyxPQUFPLEtBQUssU0FBUyxDQUFDO0lBQy9CO1FBRWEsY0FBQSxRQUFRLFNBQVUsQ0FBUyxFQUFFO1FBQ3hDLE9BQU8sS0FBSyxLQUFLLENBQUMsR0FBRyxTQUFVLENBQUMsRUFBRSxLQUFLLEVBQUU7WUFDdkMsSUFBSSxhQUFhLE9BQU8sT0FBTztnQkFDN0IsSUFBSSxZQUFZLElBQUksQ0FBQyxRQUNuQixPQUFPLE9BQU8sSUFBSSxDQUFDLE1BQU0sU0FBUyxDQUFDLElBQUk7Z0JBQ3pDLElBQUksU0FBUyxJQUFJLENBQUMsUUFDaEIsT0FBTyxJQUFJLElBQUksT0FBTyxPQUFPLENBQUMsS0FBSyxLQUFLLENBQUMsTUFBTSxTQUFTLENBQUM7cUJBQ3RELE9BQU8sS0FBSyxJQUFJLENBQUMsU0FBUyxNQUFNLFNBQVMsQ0FBQyxLQUFLLEtBQUs7WUFDM0QsQ0FBQztZQUNELE9BQU87UUFDVDtJQUNGO0dBdERlLFVBQUEifQ==