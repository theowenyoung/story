import { Buffer } from "https://deno.land/std@0.86.0/node/buffer.ts";
export var JSONB;
(function (JSONB) {
    JSONB.stringify = function stringify(o) {
        if ("undefined" == typeof o)
            return o;
        if (o && Buffer.isBuffer(o))
            return JSON.stringify(":base64:" + o.toString("base64"));
        if (o && o instanceof Map)
            return JSON.stringify(":map:" + JSON.stringify(Object.fromEntries(o)));
        if (o && o.toJSON)
            o = o.toJSON();
        if (o && "object" === typeof o) {
            var s = "";
            var array = Array.isArray(o);
            s = array ? "[" : "{";
            var first = true;
            for (var k in o) {
                var ignore = "function" == typeof o[k] || (!array && "undefined" === typeof o[k]);
                if (Object.hasOwnProperty.call(o, k) && !ignore) {
                    if (!first)
                        s += ",";
                    first = false;
                    if (array) {
                        if (o[k] == undefined)
                            s += "null";
                        else
                            s += stringify(o[k]);
                    }
                    else if (o[k] !== void 0) {
                        s += stringify(k) + ":" + stringify(o[k]);
                    }
                }
            }
            s += array ? "]" : "}";
            return s;
        }
        else if ("string" === typeof o) {
            return JSON.stringify(/^:/.test(o) ? ":" + o : o);
        }
        else if ("undefined" === typeof o) {
            return "null";
        }
        else
            return JSON.stringify(o);
    };
    JSONB.parse = function (s) {
        return JSON.parse(s, function (_, value) {
            if ("string" === typeof value) {
                if (/^:base64:/.test(value))
                    return Buffer.from(value.substring(8), "base64");
                if (/^:map:/.test(value))
                    return new Map(Object.entries(JSON.parse(value.substring(5))));
                else
                    return /^:/.test(value) ? value.substring(1) : value;
            }
            return value;
        });
    };
})(JSONB || (JSONB = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbmIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqc29uYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHckUsTUFBTSxLQUFXLEtBQUssQ0F1RHJCO0FBdkRELFdBQWlCLEtBQUs7SUFFUCxlQUFTLEdBQUcsU0FBUyxTQUFTLENBQUMsQ0FBTTtRQUNoRCxJQUFJLFdBQVcsSUFBSSxPQUFPLENBQUM7WUFBRSxPQUFPLENBQUMsQ0FBQztRQUV0QyxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUMzRCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRztZQUN2QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFekUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU07WUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRWxDLElBQUksQ0FBQyxJQUFJLFFBQVEsS0FBSyxPQUFPLENBQUMsRUFBRTtZQUM5QixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDWCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdCLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ3RCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQztZQUVqQixLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDZixJQUFJLE1BQU0sR0FDUixVQUFVLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxXQUFXLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdkUsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQy9DLElBQUksQ0FBQyxLQUFLO3dCQUFFLENBQUMsSUFBSSxHQUFHLENBQUM7b0JBQ3JCLEtBQUssR0FBRyxLQUFLLENBQUM7b0JBQ2QsSUFBSSxLQUFLLEVBQUU7d0JBQ1QsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUzs0QkFBRSxDQUFDLElBQUksTUFBTSxDQUFDOzs0QkFDOUIsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDM0I7eUJBQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUU7d0JBQzFCLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDM0M7aUJBQ0Y7YUFDRjtZQUVELENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBRXZCLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7YUFBTSxJQUFJLFFBQVEsS0FBSyxPQUFPLENBQUMsRUFBRTtZQUNoQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkQ7YUFBTSxJQUFJLFdBQVcsS0FBSyxPQUFPLENBQUMsRUFBRTtZQUNuQyxPQUFPLE1BQU0sQ0FBQztTQUNmOztZQUFNLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQyxDQUFDLENBQUM7SUFFVyxXQUFLLEdBQUcsVUFBVSxDQUFTO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLEVBQUUsS0FBSztZQUNyQyxJQUFJLFFBQVEsS0FBSyxPQUFPLEtBQUssRUFBRTtnQkFDN0IsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztvQkFDekIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ25ELElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7b0JBQ3RCLE9BQU8sSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O29CQUM1RCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQzthQUMzRDtZQUNELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDLEVBdkRnQixLQUFLLEtBQUwsS0FBSyxRQXVEckIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCdWZmZXIgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQDAuODYuMC9ub2RlL2J1ZmZlci50c1wiO1xyXG5cclxuLy8gZGVuby1saW50LWlnbm9yZSBuby1uYW1lc3BhY2VcclxuZXhwb3J0IG5hbWVzcGFjZSBKU09OQiB7XHJcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcclxuICBleHBvcnQgY29uc3Qgc3RyaW5naWZ5ID0gZnVuY3Rpb24gc3RyaW5naWZ5KG86IGFueSkge1xyXG4gICAgaWYgKFwidW5kZWZpbmVkXCIgPT0gdHlwZW9mIG8pIHJldHVybiBvO1xyXG5cclxuICAgIGlmIChvICYmIEJ1ZmZlci5pc0J1ZmZlcihvKSlcclxuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KFwiOmJhc2U2NDpcIiArIG8udG9TdHJpbmcoXCJiYXNlNjRcIikpO1xyXG4gICAgaWYgKG8gJiYgbyBpbnN0YW5jZW9mIE1hcClcclxuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KFwiOm1hcDpcIiArIEpTT04uc3RyaW5naWZ5KE9iamVjdC5mcm9tRW50cmllcyhvKSkpO1xyXG5cclxuICAgIGlmIChvICYmIG8udG9KU09OKSBvID0gby50b0pTT04oKTtcclxuXHJcbiAgICBpZiAobyAmJiBcIm9iamVjdFwiID09PSB0eXBlb2Ygbykge1xyXG4gICAgICB2YXIgcyA9IFwiXCI7XHJcbiAgICAgIHZhciBhcnJheSA9IEFycmF5LmlzQXJyYXkobyk7XHJcbiAgICAgIHMgPSBhcnJheSA/IFwiW1wiIDogXCJ7XCI7XHJcbiAgICAgIHZhciBmaXJzdCA9IHRydWU7XHJcblxyXG4gICAgICBmb3IgKHZhciBrIGluIG8pIHtcclxuICAgICAgICB2YXIgaWdub3JlID1cclxuICAgICAgICAgIFwiZnVuY3Rpb25cIiA9PSB0eXBlb2Ygb1trXSB8fCAoIWFycmF5ICYmIFwidW5kZWZpbmVkXCIgPT09IHR5cGVvZiBvW2tdKTtcclxuICAgICAgICBpZiAoT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobywgaykgJiYgIWlnbm9yZSkge1xyXG4gICAgICAgICAgaWYgKCFmaXJzdCkgcyArPSBcIixcIjtcclxuICAgICAgICAgIGZpcnN0ID0gZmFsc2U7XHJcbiAgICAgICAgICBpZiAoYXJyYXkpIHtcclxuICAgICAgICAgICAgaWYgKG9ba10gPT0gdW5kZWZpbmVkKSBzICs9IFwibnVsbFwiO1xyXG4gICAgICAgICAgICBlbHNlIHMgKz0gc3RyaW5naWZ5KG9ba10pO1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChvW2tdICE9PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgcyArPSBzdHJpbmdpZnkoaykgKyBcIjpcIiArIHN0cmluZ2lmeShvW2tdKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHMgKz0gYXJyYXkgPyBcIl1cIiA6IFwifVwiO1xyXG5cclxuICAgICAgcmV0dXJuIHM7XHJcbiAgICB9IGVsc2UgaWYgKFwic3RyaW5nXCIgPT09IHR5cGVvZiBvKSB7XHJcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSgvXjovLnRlc3QobykgPyBcIjpcIiArIG8gOiBvKTtcclxuICAgIH0gZWxzZSBpZiAoXCJ1bmRlZmluZWRcIiA9PT0gdHlwZW9mIG8pIHtcclxuICAgICAgcmV0dXJuIFwibnVsbFwiO1xyXG4gICAgfSBlbHNlIHJldHVybiBKU09OLnN0cmluZ2lmeShvKTtcclxuICB9O1xyXG5cclxuICBleHBvcnQgY29uc3QgcGFyc2UgPSBmdW5jdGlvbiAoczogc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gSlNPTi5wYXJzZShzLCBmdW5jdGlvbiAoXywgdmFsdWUpIHtcclxuICAgICAgaWYgKFwic3RyaW5nXCIgPT09IHR5cGVvZiB2YWx1ZSkge1xyXG4gICAgICAgIGlmICgvXjpiYXNlNjQ6Ly50ZXN0KHZhbHVlKSlcclxuICAgICAgICAgIHJldHVybiBCdWZmZXIuZnJvbSh2YWx1ZS5zdWJzdHJpbmcoOCksIFwiYmFzZTY0XCIpO1xyXG4gICAgICAgIGlmICgvXjptYXA6Ly50ZXN0KHZhbHVlKSlcclxuICAgICAgICAgIHJldHVybiBuZXcgTWFwKE9iamVjdC5lbnRyaWVzKEpTT04ucGFyc2UodmFsdWUuc3Vic3RyaW5nKDUpKSkpO1xyXG4gICAgICAgIGVsc2UgcmV0dXJuIC9eOi8udGVzdCh2YWx1ZSkgPyB2YWx1ZS5zdWJzdHJpbmcoMSkgOiB2YWx1ZTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9KTtcclxuICB9O1xyXG59XHJcbiJdfQ==