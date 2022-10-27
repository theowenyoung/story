// globToRegExp() is originall ported from globrex@0.1.2.
// Copyright 2018 Terkel Gjervig Nielsen. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { NATIVE_OS } from "./_constants.ts";
import { join, normalize } from "./mod.ts";
import { SEP, SEP_PATTERN } from "./separator.ts";
/** Convert a glob string to a regular expressions.
 *
 *      // Looking for all the `ts` files:
 *      walkSync(".", {
 *        match: [globToRegExp("*.ts")]
 *      });
 *
 *      Looking for all the `.json` files in any subfolder:
 *      walkSync(".", {
 *        match: [globToRegExp(join("a", "**", "*.json"), {
 *          extended: true,
 *          globstar: true
 *        })]
 *      }); */ export function globToRegExp(glob, { extended =true , globstar: globstarOption = true , os =NATIVE_OS  } = {}) {
    const sep = os == "windows" ? `(?:\\\\|\\/)+` : `\\/+`;
    const sepMaybe = os == "windows" ? `(?:\\\\|\\/)*` : `\\/*`;
    const seps = os == "windows" ? [
        "\\",
        "/"
    ] : [
        "/"
    ];
    const sepRaw = os == "windows" ? `\\` : `/`;
    const globstar = os == "windows" ? `(?:[^\\\\/]*(?:\\\\|\\/|$)+)*` : `(?:[^/]*(?:\\/|$)+)*`;
    const wildcard = os == "windows" ? `[^\\\\/]*` : `[^/]*`;
    // Keep track of scope for extended syntaxes.
    const extStack = [];
    // If we are doing extended matching, this boolean is true when we are inside
    // a group (eg {*.html,*.js}), and false otherwise.
    let inGroup = false;
    let inRange = false;
    let regExpString = "";
    // Remove trailing separators.
    let newLength = glob.length;
    for(; newLength > 0 && seps.includes(glob[newLength - 1]); newLength--);
    glob = glob.slice(0, newLength);
    let c, n;
    for(let i = 0; i < glob.length; i++){
        c = glob[i];
        n = glob[i + 1];
        if (seps.includes(c)) {
            regExpString += sep;
            while(seps.includes(glob[i + 1]))i++;
            continue;
        }
        if (c == "[") {
            if (inRange && n == ":") {
                i++; // skip [
                let value = "";
                while(glob[++i] !== ":")value += glob[i];
                if (value == "alnum") regExpString += "\\w\\d";
                else if (value == "space") regExpString += "\\s";
                else if (value == "digit") regExpString += "\\d";
                i++; // skip last ]
                continue;
            }
            inRange = true;
            regExpString += c;
            continue;
        }
        if (c == "]") {
            inRange = false;
            regExpString += c;
            continue;
        }
        if (c == "!") {
            if (inRange) {
                if (glob[i - 1] == "[") {
                    regExpString += "^";
                    continue;
                }
            } else if (extended) {
                if (n == "(") {
                    extStack.push(c);
                    regExpString += "(?!";
                    i++;
                    continue;
                }
                regExpString += `\\${c}`;
                continue;
            } else {
                regExpString += `\\${c}`;
                continue;
            }
        }
        if (inRange) {
            if (c == "\\" || c == "^" && glob[i - 1] == "[") regExpString += `\\${c}`;
            else regExpString += c;
            continue;
        }
        if ([
            "\\",
            "$",
            "^",
            ".",
            "="
        ].includes(c)) {
            regExpString += `\\${c}`;
            continue;
        }
        if (c == "(") {
            if (extStack.length) {
                regExpString += `${c}?:`;
                continue;
            }
            regExpString += `\\${c}`;
            continue;
        }
        if (c == ")") {
            if (extStack.length) {
                regExpString += c;
                const type = extStack.pop();
                if (type == "@") {
                    regExpString += "{1}";
                } else if (type == "!") {
                    regExpString += wildcard;
                } else {
                    regExpString += type;
                }
                continue;
            }
            regExpString += `\\${c}`;
            continue;
        }
        if (c == "|") {
            if (extStack.length) {
                regExpString += c;
                continue;
            }
            regExpString += `\\${c}`;
            continue;
        }
        if (c == "+") {
            if (n == "(" && extended) {
                extStack.push(c);
                continue;
            }
            regExpString += `\\${c}`;
            continue;
        }
        if (c == "@" && extended) {
            if (n == "(") {
                extStack.push(c);
                continue;
            }
        }
        if (c == "?") {
            if (extended) {
                if (n == "(") {
                    extStack.push(c);
                }
                continue;
            } else {
                regExpString += ".";
                continue;
            }
        }
        if (c == "{") {
            inGroup = true;
            regExpString += "(?:";
            continue;
        }
        if (c == "}") {
            inGroup = false;
            regExpString += ")";
            continue;
        }
        if (c == ",") {
            if (inGroup) {
                regExpString += "|";
                continue;
            }
            regExpString += `\\${c}`;
            continue;
        }
        if (c == "*") {
            if (n == "(" && extended) {
                extStack.push(c);
                continue;
            }
            // Move over all consecutive "*"'s.
            // Also store the previous and next characters
            const prevChar = glob[i - 1];
            let starCount = 1;
            while(glob[i + 1] == "*"){
                starCount++;
                i++;
            }
            const nextChar = glob[i + 1];
            const isGlobstar = globstarOption && starCount > 1 && // from the start of the segment
            [
                sepRaw,
                "/",
                undefined
            ].includes(prevChar) && // to the end of the segment
            [
                sepRaw,
                "/",
                undefined
            ].includes(nextChar);
            if (isGlobstar) {
                // it's a globstar, so match zero or more path segments
                regExpString += globstar;
                while(seps.includes(glob[i + 1]))i++;
            } else {
                // it's not a globstar, so only match one path segment
                regExpString += wildcard;
            }
            continue;
        }
        regExpString += c;
    }
    regExpString = `^${regExpString}${regExpString != "" ? sepMaybe : ""}$`;
    return new RegExp(regExpString);
}
/** Test whether the given string is a glob */ export function isGlob(str) {
    const chars = {
        "{": "}",
        "(": ")",
        "[": "]"
    };
    /* eslint-disable-next-line max-len */ const regex = /\\(.)|(^!|\*|[\].+)]\?|\[[^\\\]]+\]|\{[^\\}]+\}|\(\?[:!=][^\\)]+\)|\([^|]+\|[^\\)]+\))/;
    if (str === "") {
        return false;
    }
    let match;
    while(match = regex.exec(str)){
        if (match[2]) return true;
        let idx = match.index + match[0].length;
        // if an open bracket/brace/paren is escaped,
        // set the index to the next closing character
        const open = match[1];
        const close = open ? chars[open] : null;
        if (open && close) {
            const n = str.indexOf(close, idx);
            if (n !== -1) {
                idx = n + 1;
            }
        }
        str = str.slice(idx);
    }
    return false;
}
/** Like normalize(), but doesn't collapse "**\/.." when `globstar` is true. */ export function normalizeGlob(glob, { globstar =false  } = {}) {
    if (glob.match(/\0/g)) {
        throw new Error(`Glob contains invalid characters: "${glob}"`);
    }
    if (!globstar) {
        return normalize(glob);
    }
    const s = SEP_PATTERN.source;
    const badParentPattern = new RegExp(`(?<=(${s}|^)\\*\\*${s})\\.\\.(?=${s}|$)`, "g");
    return normalize(glob.replace(badParentPattern, "\0")).replace(/\0/g, "..");
}
/** Like join(), but doesn't collapse "**\/.." when `globstar` is true. */ export function joinGlobs(globs, { extended =false , globstar =false  } = {}) {
    if (!globstar || globs.length == 0) {
        return join(...globs);
    }
    if (globs.length === 0) return ".";
    let joined;
    for (const glob of globs){
        const path = glob;
        if (path.length > 0) {
            if (!joined) joined = path;
            else joined += `${SEP}${path}`;
        }
    }
    if (!joined) return ".";
    return normalizeGlob(joined, {
        extended,
        globstar
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjcxLjAvcGF0aC9nbG9iLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGdsb2JUb1JlZ0V4cCgpIGlzIG9yaWdpbmFsbCBwb3J0ZWQgZnJvbSBnbG9icmV4QDAuMS4yLlxuLy8gQ29weXJpZ2h0IDIwMTggVGVya2VsIEdqZXJ2aWcgTmllbHNlbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBDb3B5cmlnaHQgMjAxOC0yMDIwIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBOQVRJVkVfT1MgfSBmcm9tIFwiLi9fY29uc3RhbnRzLnRzXCI7XG5pbXBvcnQgeyBqb2luLCBub3JtYWxpemUgfSBmcm9tIFwiLi9tb2QudHNcIjtcbmltcG9ydCB7IFNFUCwgU0VQX1BBVFRFUk4gfSBmcm9tIFwiLi9zZXBhcmF0b3IudHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBHbG9iT3B0aW9ucyB7XG4gIC8qKiBFeHRlbmRlZCBnbG9iIHN5bnRheC5cbiAgICogU2VlIGh0dHBzOi8vd3d3LmxpbnV4am91cm5hbC5jb20vY29udGVudC9iYXNoLWV4dGVuZGVkLWdsb2JiaW5nLiBEZWZhdWx0c1xuICAgKiB0byB0cnVlLiAqL1xuICBleHRlbmRlZD86IGJvb2xlYW47XG4gIC8qKiBHbG9ic3RhciBzeW50YXguXG4gICAqIFNlZSBodHRwczovL3d3dy5saW51eGpvdXJuYWwuY29tL2NvbnRlbnQvZ2xvYnN0YXItbmV3LWJhc2gtZ2xvYmJpbmctb3B0aW9uLlxuICAgKiBJZiBmYWxzZSwgYCoqYCBpcyB0cmVhdGVkIGxpa2UgYCpgLiBEZWZhdWx0cyB0byB0cnVlLiAqL1xuICBnbG9ic3Rhcj86IGJvb2xlYW47XG4gIC8qKiBPcGVyYXRpbmcgc3lzdGVtLiBEZWZhdWx0cyB0byB0aGUgbmF0aXZlIE9TLiAqL1xuICBvcz86IHR5cGVvZiBEZW5vLmJ1aWxkLm9zO1xufVxuXG5leHBvcnQgdHlwZSBHbG9iVG9SZWdFeHBPcHRpb25zID0gR2xvYk9wdGlvbnM7XG5cbi8qKiBDb252ZXJ0IGEgZ2xvYiBzdHJpbmcgdG8gYSByZWd1bGFyIGV4cHJlc3Npb25zLlxuICpcbiAqICAgICAgLy8gTG9va2luZyBmb3IgYWxsIHRoZSBgdHNgIGZpbGVzOlxuICogICAgICB3YWxrU3luYyhcIi5cIiwge1xuICogICAgICAgIG1hdGNoOiBbZ2xvYlRvUmVnRXhwKFwiKi50c1wiKV1cbiAqICAgICAgfSk7XG4gKlxuICogICAgICBMb29raW5nIGZvciBhbGwgdGhlIGAuanNvbmAgZmlsZXMgaW4gYW55IHN1YmZvbGRlcjpcbiAqICAgICAgd2Fsa1N5bmMoXCIuXCIsIHtcbiAqICAgICAgICBtYXRjaDogW2dsb2JUb1JlZ0V4cChqb2luKFwiYVwiLCBcIioqXCIsIFwiKi5qc29uXCIpLCB7XG4gKiAgICAgICAgICBleHRlbmRlZDogdHJ1ZSxcbiAqICAgICAgICAgIGdsb2JzdGFyOiB0cnVlXG4gKiAgICAgICAgfSldXG4gKiAgICAgIH0pOyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdsb2JUb1JlZ0V4cChcbiAgZ2xvYjogc3RyaW5nLFxuICB7IGV4dGVuZGVkID0gdHJ1ZSwgZ2xvYnN0YXI6IGdsb2JzdGFyT3B0aW9uID0gdHJ1ZSwgb3MgPSBOQVRJVkVfT1MgfTpcbiAgICBHbG9iVG9SZWdFeHBPcHRpb25zID0ge30sXG4pOiBSZWdFeHAge1xuICBjb25zdCBzZXAgPSBvcyA9PSBcIndpbmRvd3NcIiA/IGAoPzpcXFxcXFxcXHxcXFxcLykrYCA6IGBcXFxcLytgO1xuICBjb25zdCBzZXBNYXliZSA9IG9zID09IFwid2luZG93c1wiID8gYCg/OlxcXFxcXFxcfFxcXFwvKSpgIDogYFxcXFwvKmA7XG4gIGNvbnN0IHNlcHMgPSBvcyA9PSBcIndpbmRvd3NcIiA/IFtcIlxcXFxcIiwgXCIvXCJdIDogW1wiL1wiXTtcbiAgY29uc3Qgc2VwUmF3ID0gb3MgPT0gXCJ3aW5kb3dzXCIgPyBgXFxcXGAgOiBgL2A7XG4gIGNvbnN0IGdsb2JzdGFyID0gb3MgPT0gXCJ3aW5kb3dzXCJcbiAgICA/IGAoPzpbXlxcXFxcXFxcL10qKD86XFxcXFxcXFx8XFxcXC98JCkrKSpgXG4gICAgOiBgKD86W14vXSooPzpcXFxcL3wkKSspKmA7XG4gIGNvbnN0IHdpbGRjYXJkID0gb3MgPT0gXCJ3aW5kb3dzXCIgPyBgW15cXFxcXFxcXC9dKmAgOiBgW14vXSpgO1xuXG4gIC8vIEtlZXAgdHJhY2sgb2Ygc2NvcGUgZm9yIGV4dGVuZGVkIHN5bnRheGVzLlxuICBjb25zdCBleHRTdGFjayA9IFtdO1xuXG4gIC8vIElmIHdlIGFyZSBkb2luZyBleHRlbmRlZCBtYXRjaGluZywgdGhpcyBib29sZWFuIGlzIHRydWUgd2hlbiB3ZSBhcmUgaW5zaWRlXG4gIC8vIGEgZ3JvdXAgKGVnIHsqLmh0bWwsKi5qc30pLCBhbmQgZmFsc2Ugb3RoZXJ3aXNlLlxuICBsZXQgaW5Hcm91cCA9IGZhbHNlO1xuICBsZXQgaW5SYW5nZSA9IGZhbHNlO1xuXG4gIGxldCByZWdFeHBTdHJpbmcgPSBcIlwiO1xuXG4gIC8vIFJlbW92ZSB0cmFpbGluZyBzZXBhcmF0b3JzLlxuICBsZXQgbmV3TGVuZ3RoID0gZ2xvYi5sZW5ndGg7XG4gIGZvciAoOyBuZXdMZW5ndGggPiAwICYmIHNlcHMuaW5jbHVkZXMoZ2xvYltuZXdMZW5ndGggLSAxXSk7IG5ld0xlbmd0aC0tKTtcbiAgZ2xvYiA9IGdsb2Iuc2xpY2UoMCwgbmV3TGVuZ3RoKTtcblxuICBsZXQgYywgbjtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBnbG9iLmxlbmd0aDsgaSsrKSB7XG4gICAgYyA9IGdsb2JbaV07XG4gICAgbiA9IGdsb2JbaSArIDFdO1xuXG4gICAgaWYgKHNlcHMuaW5jbHVkZXMoYykpIHtcbiAgICAgIHJlZ0V4cFN0cmluZyArPSBzZXA7XG4gICAgICB3aGlsZSAoc2Vwcy5pbmNsdWRlcyhnbG9iW2kgKyAxXSkpIGkrKztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjID09IFwiW1wiKSB7XG4gICAgICBpZiAoaW5SYW5nZSAmJiBuID09IFwiOlwiKSB7XG4gICAgICAgIGkrKzsgLy8gc2tpcCBbXG4gICAgICAgIGxldCB2YWx1ZSA9IFwiXCI7XG4gICAgICAgIHdoaWxlIChnbG9iWysraV0gIT09IFwiOlwiKSB2YWx1ZSArPSBnbG9iW2ldO1xuICAgICAgICBpZiAodmFsdWUgPT0gXCJhbG51bVwiKSByZWdFeHBTdHJpbmcgKz0gXCJcXFxcd1xcXFxkXCI7XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlID09IFwic3BhY2VcIikgcmVnRXhwU3RyaW5nICs9IFwiXFxcXHNcIjtcbiAgICAgICAgZWxzZSBpZiAodmFsdWUgPT0gXCJkaWdpdFwiKSByZWdFeHBTdHJpbmcgKz0gXCJcXFxcZFwiO1xuICAgICAgICBpKys7IC8vIHNraXAgbGFzdCBdXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaW5SYW5nZSA9IHRydWU7XG4gICAgICByZWdFeHBTdHJpbmcgKz0gYztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjID09IFwiXVwiKSB7XG4gICAgICBpblJhbmdlID0gZmFsc2U7XG4gICAgICByZWdFeHBTdHJpbmcgKz0gYztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjID09IFwiIVwiKSB7XG4gICAgICBpZiAoaW5SYW5nZSkge1xuICAgICAgICBpZiAoZ2xvYltpIC0gMV0gPT0gXCJbXCIpIHtcbiAgICAgICAgICByZWdFeHBTdHJpbmcgKz0gXCJeXCI7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZXh0ZW5kZWQpIHtcbiAgICAgICAgaWYgKG4gPT0gXCIoXCIpIHtcbiAgICAgICAgICBleHRTdGFjay5wdXNoKGMpO1xuICAgICAgICAgIHJlZ0V4cFN0cmluZyArPSBcIig/IVwiO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICByZWdFeHBTdHJpbmcgKz0gYFxcXFwke2N9YDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWdFeHBTdHJpbmcgKz0gYFxcXFwke2N9YDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGluUmFuZ2UpIHtcbiAgICAgIGlmIChjID09IFwiXFxcXFwiIHx8IGMgPT0gXCJeXCIgJiYgZ2xvYltpIC0gMV0gPT0gXCJbXCIpIHJlZ0V4cFN0cmluZyArPSBgXFxcXCR7Y31gO1xuICAgICAgZWxzZSByZWdFeHBTdHJpbmcgKz0gYztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChbXCJcXFxcXCIsIFwiJFwiLCBcIl5cIiwgXCIuXCIsIFwiPVwiXS5pbmNsdWRlcyhjKSkge1xuICAgICAgcmVnRXhwU3RyaW5nICs9IGBcXFxcJHtjfWA7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYyA9PSBcIihcIikge1xuICAgICAgaWYgKGV4dFN0YWNrLmxlbmd0aCkge1xuICAgICAgICByZWdFeHBTdHJpbmcgKz0gYCR7Y30/OmA7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcmVnRXhwU3RyaW5nICs9IGBcXFxcJHtjfWA7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYyA9PSBcIilcIikge1xuICAgICAgaWYgKGV4dFN0YWNrLmxlbmd0aCkge1xuICAgICAgICByZWdFeHBTdHJpbmcgKz0gYztcbiAgICAgICAgY29uc3QgdHlwZSA9IGV4dFN0YWNrLnBvcCgpITtcbiAgICAgICAgaWYgKHR5cGUgPT0gXCJAXCIpIHtcbiAgICAgICAgICByZWdFeHBTdHJpbmcgKz0gXCJ7MX1cIjtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09IFwiIVwiKSB7XG4gICAgICAgICAgcmVnRXhwU3RyaW5nICs9IHdpbGRjYXJkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlZ0V4cFN0cmluZyArPSB0eXBlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcmVnRXhwU3RyaW5nICs9IGBcXFxcJHtjfWA7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYyA9PSBcInxcIikge1xuICAgICAgaWYgKGV4dFN0YWNrLmxlbmd0aCkge1xuICAgICAgICByZWdFeHBTdHJpbmcgKz0gYztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICByZWdFeHBTdHJpbmcgKz0gYFxcXFwke2N9YDtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjID09IFwiK1wiKSB7XG4gICAgICBpZiAobiA9PSBcIihcIiAmJiBleHRlbmRlZCkge1xuICAgICAgICBleHRTdGFjay5wdXNoKGMpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHJlZ0V4cFN0cmluZyArPSBgXFxcXCR7Y31gO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGMgPT0gXCJAXCIgJiYgZXh0ZW5kZWQpIHtcbiAgICAgIGlmIChuID09IFwiKFwiKSB7XG4gICAgICAgIGV4dFN0YWNrLnB1c2goYyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjID09IFwiP1wiKSB7XG4gICAgICBpZiAoZXh0ZW5kZWQpIHtcbiAgICAgICAgaWYgKG4gPT0gXCIoXCIpIHtcbiAgICAgICAgICBleHRTdGFjay5wdXNoKGMpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVnRXhwU3RyaW5nICs9IFwiLlwiO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYyA9PSBcIntcIikge1xuICAgICAgaW5Hcm91cCA9IHRydWU7XG4gICAgICByZWdFeHBTdHJpbmcgKz0gXCIoPzpcIjtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjID09IFwifVwiKSB7XG4gICAgICBpbkdyb3VwID0gZmFsc2U7XG4gICAgICByZWdFeHBTdHJpbmcgKz0gXCIpXCI7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYyA9PSBcIixcIikge1xuICAgICAgaWYgKGluR3JvdXApIHtcbiAgICAgICAgcmVnRXhwU3RyaW5nICs9IFwifFwiO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHJlZ0V4cFN0cmluZyArPSBgXFxcXCR7Y31gO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGMgPT0gXCIqXCIpIHtcbiAgICAgIGlmIChuID09IFwiKFwiICYmIGV4dGVuZGVkKSB7XG4gICAgICAgIGV4dFN0YWNrLnB1c2goYyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLy8gTW92ZSBvdmVyIGFsbCBjb25zZWN1dGl2ZSBcIipcIidzLlxuICAgICAgLy8gQWxzbyBzdG9yZSB0aGUgcHJldmlvdXMgYW5kIG5leHQgY2hhcmFjdGVyc1xuICAgICAgY29uc3QgcHJldkNoYXIgPSBnbG9iW2kgLSAxXTtcbiAgICAgIGxldCBzdGFyQ291bnQgPSAxO1xuICAgICAgd2hpbGUgKGdsb2JbaSArIDFdID09IFwiKlwiKSB7XG4gICAgICAgIHN0YXJDb3VudCsrO1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXh0Q2hhciA9IGdsb2JbaSArIDFdO1xuICAgICAgY29uc3QgaXNHbG9ic3RhciA9IGdsb2JzdGFyT3B0aW9uICYmIHN0YXJDb3VudCA+IDEgJiZcbiAgICAgICAgLy8gZnJvbSB0aGUgc3RhcnQgb2YgdGhlIHNlZ21lbnRcbiAgICAgICAgW3NlcFJhdywgXCIvXCIsIHVuZGVmaW5lZF0uaW5jbHVkZXMocHJldkNoYXIpICYmXG4gICAgICAgIC8vIHRvIHRoZSBlbmQgb2YgdGhlIHNlZ21lbnRcbiAgICAgICAgW3NlcFJhdywgXCIvXCIsIHVuZGVmaW5lZF0uaW5jbHVkZXMobmV4dENoYXIpO1xuICAgICAgaWYgKGlzR2xvYnN0YXIpIHtcbiAgICAgICAgLy8gaXQncyBhIGdsb2JzdGFyLCBzbyBtYXRjaCB6ZXJvIG9yIG1vcmUgcGF0aCBzZWdtZW50c1xuICAgICAgICByZWdFeHBTdHJpbmcgKz0gZ2xvYnN0YXI7XG4gICAgICAgIHdoaWxlIChzZXBzLmluY2x1ZGVzKGdsb2JbaSArIDFdKSkgaSsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaXQncyBub3QgYSBnbG9ic3Rhciwgc28gb25seSBtYXRjaCBvbmUgcGF0aCBzZWdtZW50XG4gICAgICAgIHJlZ0V4cFN0cmluZyArPSB3aWxkY2FyZDtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlZ0V4cFN0cmluZyArPSBjO1xuICB9XG5cbiAgcmVnRXhwU3RyaW5nID0gYF4ke3JlZ0V4cFN0cmluZ30ke3JlZ0V4cFN0cmluZyAhPSBcIlwiID8gc2VwTWF5YmUgOiBcIlwifSRgO1xuICByZXR1cm4gbmV3IFJlZ0V4cChyZWdFeHBTdHJpbmcpO1xufVxuXG4vKiogVGVzdCB3aGV0aGVyIHRoZSBnaXZlbiBzdHJpbmcgaXMgYSBnbG9iICovXG5leHBvcnQgZnVuY3Rpb24gaXNHbG9iKHN0cjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IGNoYXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIntcIjogXCJ9XCIsIFwiKFwiOiBcIilcIiwgXCJbXCI6IFwiXVwiIH07XG4gIC8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGVuICovXG4gIGNvbnN0IHJlZ2V4ID1cbiAgICAvXFxcXCguKXwoXiF8XFwqfFtcXF0uKyldXFw/fFxcW1teXFxcXFxcXV0rXFxdfFxce1teXFxcXH1dK1xcfXxcXChcXD9bOiE9XVteXFxcXCldK1xcKXxcXChbXnxdK1xcfFteXFxcXCldK1xcKSkvO1xuXG4gIGlmIChzdHIgPT09IFwiXCIpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsZXQgbWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSB8IG51bGw7XG5cbiAgd2hpbGUgKChtYXRjaCA9IHJlZ2V4LmV4ZWMoc3RyKSkpIHtcbiAgICBpZiAobWF0Y2hbMl0pIHJldHVybiB0cnVlO1xuICAgIGxldCBpZHggPSBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aDtcblxuICAgIC8vIGlmIGFuIG9wZW4gYnJhY2tldC9icmFjZS9wYXJlbiBpcyBlc2NhcGVkLFxuICAgIC8vIHNldCB0aGUgaW5kZXggdG8gdGhlIG5leHQgY2xvc2luZyBjaGFyYWN0ZXJcbiAgICBjb25zdCBvcGVuID0gbWF0Y2hbMV07XG4gICAgY29uc3QgY2xvc2UgPSBvcGVuID8gY2hhcnNbb3Blbl0gOiBudWxsO1xuICAgIGlmIChvcGVuICYmIGNsb3NlKSB7XG4gICAgICBjb25zdCBuID0gc3RyLmluZGV4T2YoY2xvc2UsIGlkeCk7XG4gICAgICBpZiAobiAhPT0gLTEpIHtcbiAgICAgICAgaWR4ID0gbiArIDE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc3RyID0gc3RyLnNsaWNlKGlkeCk7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKiBMaWtlIG5vcm1hbGl6ZSgpLCBidXQgZG9lc24ndCBjb2xsYXBzZSBcIioqXFwvLi5cIiB3aGVuIGBnbG9ic3RhcmAgaXMgdHJ1ZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVHbG9iKFxuICBnbG9iOiBzdHJpbmcsXG4gIHsgZ2xvYnN0YXIgPSBmYWxzZSB9OiBHbG9iT3B0aW9ucyA9IHt9LFxuKTogc3RyaW5nIHtcbiAgaWYgKGdsb2IubWF0Y2goL1xcMC9nKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgR2xvYiBjb250YWlucyBpbnZhbGlkIGNoYXJhY3RlcnM6IFwiJHtnbG9ifVwiYCk7XG4gIH1cbiAgaWYgKCFnbG9ic3Rhcikge1xuICAgIHJldHVybiBub3JtYWxpemUoZ2xvYik7XG4gIH1cbiAgY29uc3QgcyA9IFNFUF9QQVRURVJOLnNvdXJjZTtcbiAgY29uc3QgYmFkUGFyZW50UGF0dGVybiA9IG5ldyBSZWdFeHAoXG4gICAgYCg/PD0oJHtzfXxeKVxcXFwqXFxcXCoke3N9KVxcXFwuXFxcXC4oPz0ke3N9fCQpYCxcbiAgICBcImdcIixcbiAgKTtcbiAgcmV0dXJuIG5vcm1hbGl6ZShnbG9iLnJlcGxhY2UoYmFkUGFyZW50UGF0dGVybiwgXCJcXDBcIikpLnJlcGxhY2UoL1xcMC9nLCBcIi4uXCIpO1xufVxuXG4vKiogTGlrZSBqb2luKCksIGJ1dCBkb2Vzbid0IGNvbGxhcHNlIFwiKipcXC8uLlwiIHdoZW4gYGdsb2JzdGFyYCBpcyB0cnVlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGpvaW5HbG9icyhcbiAgZ2xvYnM6IHN0cmluZ1tdLFxuICB7IGV4dGVuZGVkID0gZmFsc2UsIGdsb2JzdGFyID0gZmFsc2UgfTogR2xvYk9wdGlvbnMgPSB7fSxcbik6IHN0cmluZyB7XG4gIGlmICghZ2xvYnN0YXIgfHwgZ2xvYnMubGVuZ3RoID09IDApIHtcbiAgICByZXR1cm4gam9pbiguLi5nbG9icyk7XG4gIH1cbiAgaWYgKGdsb2JzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwiLlwiO1xuICBsZXQgam9pbmVkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGZvciAoY29uc3QgZ2xvYiBvZiBnbG9icykge1xuICAgIGNvbnN0IHBhdGggPSBnbG9iO1xuICAgIGlmIChwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmICgham9pbmVkKSBqb2luZWQgPSBwYXRoO1xuICAgICAgZWxzZSBqb2luZWQgKz0gYCR7U0VQfSR7cGF0aH1gO1xuICAgIH1cbiAgfVxuICBpZiAoIWpvaW5lZCkgcmV0dXJuIFwiLlwiO1xuICByZXR1cm4gbm9ybWFsaXplR2xvYihqb2luZWQsIHsgZXh0ZW5kZWQsIGdsb2JzdGFyIH0p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