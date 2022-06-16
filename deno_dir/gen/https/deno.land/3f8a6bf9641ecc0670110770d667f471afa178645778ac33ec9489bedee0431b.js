// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { Type } from "../type.ts";
import { isNegativeZero } from "../utils.ts";
const YAML_FLOAT_PATTERN = new RegExp(// 2.5e4, 2.5 and integers
"^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?" + // .2e4, .2
// special case, seems not from spec
"|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?" + // 20:59
"|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*" + // .inf
"|[-+]?\\.(?:inf|Inf|INF)" + // .nan
"|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat(data) {
    if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
    // Probably should update regexp & check speed
    data[data.length - 1] === "_") {
        return false;
    }
    return true;
}
function constructYamlFloat(data) {
    let value = data.replace(/_/g, "").toLowerCase();
    const sign = value[0] === "-" ? -1 : 1;
    const digits = [];
    if ("+-".indexOf(value[0]) >= 0) {
        value = value.slice(1);
    }
    if (value === ".inf") {
        return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    }
    if (value === ".nan") {
        return NaN;
    }
    if (value.indexOf(":") >= 0) {
        value.split(":").forEach((v)=>{
            digits.unshift(parseFloat(v));
        });
        let valueNb = 0.0;
        let base = 1;
        digits.forEach((d)=>{
            valueNb += d * base;
            base *= 60;
        });
        return sign * valueNb;
    }
    return sign * parseFloat(value);
}
const SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
    if (isNaN(object)) {
        switch(style){
            case "lowercase":
                return ".nan";
            case "uppercase":
                return ".NAN";
            case "camelcase":
                return ".NaN";
        }
    } else if (Number.POSITIVE_INFINITY === object) {
        switch(style){
            case "lowercase":
                return ".inf";
            case "uppercase":
                return ".INF";
            case "camelcase":
                return ".Inf";
        }
    } else if (Number.NEGATIVE_INFINITY === object) {
        switch(style){
            case "lowercase":
                return "-.inf";
            case "uppercase":
                return "-.INF";
            case "camelcase":
                return "-.Inf";
        }
    } else if (isNegativeZero(object)) {
        return "-0.0";
    }
    const res = object.toString(10);
    // JS stringifier can build scientific format without dots: 5e-100,
    // while YAML requires dot: 5.e-100. Fix it with simple hack
    return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || isNegativeZero(object));
}
export const float = new Type("tag:yaml.org,2002:float", {
    construct: constructYamlFloat,
    defaultStyle: "lowercase",
    kind: "scalar",
    predicate: isFloat,
    represent: representYamlFloat,
    resolve: resolveYamlFloat
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2VuY29kaW5nL195YW1sL3R5cGUvZmxvYXQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gUG9ydGVkIGZyb20ganMteWFtbCB2My4xMy4xOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVjYS9qcy15YW1sL2NvbW1pdC82NjVhYWRkYTQyMzQ5ZGNhZTg2OWYxMjA0MGQ5YjEwZWYxOGQxMmRhXG4vLyBDb3B5cmlnaHQgMjAxMS0yMDE1IGJ5IFZpdGFseSBQdXpyaW4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuaW1wb3J0IHsgU3R5bGVWYXJpYW50LCBUeXBlIH0gZnJvbSBcIi4uL3R5cGUudHNcIjtcbmltcG9ydCB7IEFueSwgaXNOZWdhdGl2ZVplcm8gfSBmcm9tIFwiLi4vdXRpbHMudHNcIjtcblxuY29uc3QgWUFNTF9GTE9BVF9QQVRURVJOID0gbmV3IFJlZ0V4cChcbiAgLy8gMi41ZTQsIDIuNSBhbmQgaW50ZWdlcnNcbiAgXCJeKD86Wy0rXT8oPzowfFsxLTldWzAtOV9dKikoPzpcXFxcLlswLTlfXSopPyg/OltlRV1bLStdP1swLTldKyk/XCIgK1xuICAgIC8vIC4yZTQsIC4yXG4gICAgLy8gc3BlY2lhbCBjYXNlLCBzZWVtcyBub3QgZnJvbSBzcGVjXG4gICAgXCJ8XFxcXC5bMC05X10rKD86W2VFXVstK10/WzAtOV0rKT9cIiArXG4gICAgLy8gMjA6NTlcbiAgICBcInxbLStdP1swLTldWzAtOV9dKig/OjpbMC01XT9bMC05XSkrXFxcXC5bMC05X10qXCIgK1xuICAgIC8vIC5pbmZcbiAgICBcInxbLStdP1xcXFwuKD86aW5mfEluZnxJTkYpXCIgK1xuICAgIC8vIC5uYW5cbiAgICBcInxcXFxcLig/Om5hbnxOYU58TkFOKSkkXCIsXG4pO1xuXG5mdW5jdGlvbiByZXNvbHZlWWFtbEZsb2F0KGRhdGE6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAoXG4gICAgIVlBTUxfRkxPQVRfUEFUVEVSTi50ZXN0KGRhdGEpIHx8XG4gICAgLy8gUXVpY2sgaGFjayB0byBub3QgYWxsb3cgaW50ZWdlcnMgZW5kIHdpdGggYF9gXG4gICAgLy8gUHJvYmFibHkgc2hvdWxkIHVwZGF0ZSByZWdleHAgJiBjaGVjayBzcGVlZFxuICAgIGRhdGFbZGF0YS5sZW5ndGggLSAxXSA9PT0gXCJfXCJcbiAgKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxGbG9hdChkYXRhOiBzdHJpbmcpOiBudW1iZXIge1xuICBsZXQgdmFsdWUgPSBkYXRhLnJlcGxhY2UoL18vZywgXCJcIikudG9Mb3dlckNhc2UoKTtcbiAgY29uc3Qgc2lnbiA9IHZhbHVlWzBdID09PSBcIi1cIiA/IC0xIDogMTtcbiAgY29uc3QgZGlnaXRzOiBudW1iZXJbXSA9IFtdO1xuXG4gIGlmIChcIistXCIuaW5kZXhPZih2YWx1ZVswXSkgPj0gMCkge1xuICAgIHZhbHVlID0gdmFsdWUuc2xpY2UoMSk7XG4gIH1cblxuICBpZiAodmFsdWUgPT09IFwiLmluZlwiKSB7XG4gICAgcmV0dXJuIHNpZ24gPT09IDEgPyBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkgOiBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFk7XG4gIH1cbiAgaWYgKHZhbHVlID09PSBcIi5uYW5cIikge1xuICAgIHJldHVybiBOYU47XG4gIH1cbiAgaWYgKHZhbHVlLmluZGV4T2YoXCI6XCIpID49IDApIHtcbiAgICB2YWx1ZS5zcGxpdChcIjpcIikuZm9yRWFjaCgodik6IHZvaWQgPT4ge1xuICAgICAgZGlnaXRzLnVuc2hpZnQocGFyc2VGbG9hdCh2KSk7XG4gICAgfSk7XG5cbiAgICBsZXQgdmFsdWVOYiA9IDAuMDtcbiAgICBsZXQgYmFzZSA9IDE7XG5cbiAgICBkaWdpdHMuZm9yRWFjaCgoZCk6IHZvaWQgPT4ge1xuICAgICAgdmFsdWVOYiArPSBkICogYmFzZTtcbiAgICAgIGJhc2UgKj0gNjA7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2lnbiAqIHZhbHVlTmI7XG4gIH1cbiAgcmV0dXJuIHNpZ24gKiBwYXJzZUZsb2F0KHZhbHVlKTtcbn1cblxuY29uc3QgU0NJRU5USUZJQ19XSVRIT1VUX0RPVCA9IC9eWy0rXT9bMC05XStlLztcblxuZnVuY3Rpb24gcmVwcmVzZW50WWFtbEZsb2F0KG9iamVjdDogQW55LCBzdHlsZT86IFN0eWxlVmFyaWFudCk6IEFueSB7XG4gIGlmIChpc05hTihvYmplY3QpKSB7XG4gICAgc3dpdGNoIChzdHlsZSkge1xuICAgICAgY2FzZSBcImxvd2VyY2FzZVwiOlxuICAgICAgICByZXR1cm4gXCIubmFuXCI7XG4gICAgICBjYXNlIFwidXBwZXJjYXNlXCI6XG4gICAgICAgIHJldHVybiBcIi5OQU5cIjtcbiAgICAgIGNhc2UgXCJjYW1lbGNhc2VcIjpcbiAgICAgICAgcmV0dXJuIFwiLk5hTlwiO1xuICAgIH1cbiAgfSBlbHNlIGlmIChOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkgPT09IG9iamVjdCkge1xuICAgIHN3aXRjaCAoc3R5bGUpIHtcbiAgICAgIGNhc2UgXCJsb3dlcmNhc2VcIjpcbiAgICAgICAgcmV0dXJuIFwiLmluZlwiO1xuICAgICAgY2FzZSBcInVwcGVyY2FzZVwiOlxuICAgICAgICByZXR1cm4gXCIuSU5GXCI7XG4gICAgICBjYXNlIFwiY2FtZWxjYXNlXCI6XG4gICAgICAgIHJldHVybiBcIi5JbmZcIjtcbiAgICB9XG4gIH0gZWxzZSBpZiAoTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZID09PSBvYmplY3QpIHtcbiAgICBzd2l0Y2ggKHN0eWxlKSB7XG4gICAgICBjYXNlIFwibG93ZXJjYXNlXCI6XG4gICAgICAgIHJldHVybiBcIi0uaW5mXCI7XG4gICAgICBjYXNlIFwidXBwZXJjYXNlXCI6XG4gICAgICAgIHJldHVybiBcIi0uSU5GXCI7XG4gICAgICBjYXNlIFwiY2FtZWxjYXNlXCI6XG4gICAgICAgIHJldHVybiBcIi0uSW5mXCI7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzTmVnYXRpdmVaZXJvKG9iamVjdCkpIHtcbiAgICByZXR1cm4gXCItMC4wXCI7XG4gIH1cblxuICBjb25zdCByZXMgPSBvYmplY3QudG9TdHJpbmcoMTApO1xuXG4gIC8vIEpTIHN0cmluZ2lmaWVyIGNhbiBidWlsZCBzY2llbnRpZmljIGZvcm1hdCB3aXRob3V0IGRvdHM6IDVlLTEwMCxcbiAgLy8gd2hpbGUgWUFNTCByZXF1aXJlcyBkb3Q6IDUuZS0xMDAuIEZpeCBpdCB3aXRoIHNpbXBsZSBoYWNrXG5cbiAgcmV0dXJuIFNDSUVOVElGSUNfV0lUSE9VVF9ET1QudGVzdChyZXMpID8gcmVzLnJlcGxhY2UoXCJlXCIsIFwiLmVcIikgOiByZXM7XG59XG5cbmZ1bmN0aW9uIGlzRmxvYXQob2JqZWN0OiBBbnkpOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gXCJbb2JqZWN0IE51bWJlcl1cIiAmJlxuICAgIChvYmplY3QgJSAxICE9PSAwIHx8IGlzTmVnYXRpdmVaZXJvKG9iamVjdCkpXG4gICk7XG59XG5cbmV4cG9ydCBjb25zdCBmbG9hdCA9IG5ldyBUeXBlKFwidGFnOnlhbWwub3JnLDIwMDI6ZmxvYXRcIiwge1xuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxGbG9hdCxcbiAgZGVmYXVsdFN0eWxlOiBcImxvd2VyY2FzZVwiLFxuICBraW5kOiBcInNjYWxhclwiLFxuICBwcmVkaWNhdGU6IGlzRmxvYXQsXG4gIHJlcHJlc2VudDogcmVwcmVzZW50WWFtbEZsb2F0LFxuICByZXNvbHZlOiByZXNvbHZlWWFtbEZsb2F0LFxufSk7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsK0JBQStCO0FBQy9CLG9GQUFv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