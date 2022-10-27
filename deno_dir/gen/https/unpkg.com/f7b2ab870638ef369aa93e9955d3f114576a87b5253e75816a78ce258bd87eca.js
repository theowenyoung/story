export const removeBrackets = (v)=>v.replace(/[<[].+/, '').trim();
export const findAllBrackets = (v)=>{
    const ANGLED_BRACKET_RE_GLOBAL = /<([^>]+)>/g;
    const SQUARE_BRACKET_RE_GLOBAL = /\[([^\]]+)\]/g;
    const res = [];
    const parse = (match)=>{
        let variadic = false;
        let value = match[1];
        if (value.startsWith('...')) {
            value = value.slice(3);
            variadic = true;
        }
        return {
            required: match[0].startsWith('<'),
            value,
            variadic
        };
    };
    let angledMatch;
    while(angledMatch = ANGLED_BRACKET_RE_GLOBAL.exec(v)){
        res.push(parse(angledMatch));
    }
    let squareMatch;
    while(squareMatch = SQUARE_BRACKET_RE_GLOBAL.exec(v)){
        res.push(parse(squareMatch));
    }
    return res;
};
export const getMriOptions = (options)=>{
    const result = {
        alias: {},
        boolean: []
    };
    for (const [index, option] of options.entries()){
        // We do not set default values in mri options
        // Since its type (typeof) will be used to cast parsed arguments.
        // Which mean `--foo foo` will be parsed as `{foo: true}` if we have `{default:{foo: true}}`
        // Set alias
        if (option.names.length > 1) {
            result.alias[option.names[0]] = option.names.slice(1);
        } // Set boolean
        if (option.isBoolean) {
            if (option.negated) {
                // For negated option
                // We only set it to `boolean` type when there's no string-type option with the same name
                const hasStringTypeOption = options.some((o, i)=>{
                    return i !== index && o.names.some((name)=>option.names.includes(name)) && typeof o.required === 'boolean';
                });
                if (!hasStringTypeOption) {
                    result.boolean.push(option.names[0]);
                }
            } else {
                result.boolean.push(option.names[0]);
            }
        }
    }
    return result;
};
export const findLongest = (arr)=>{
    return arr.sort((a, b)=>{
        return a.length > b.length ? -1 : 1;
    })[0];
};
export const padRight = (str, length)=>{
    return str.length >= length ? str : `${str}${' '.repeat(length - str.length)}`;
};
export const camelcase = (input)=>{
    return input.replace(/([a-z])-([a-z])/g, (_, p1, p2)=>{
        return p1 + p2.toUpperCase();
    });
};
export const setDotProp = (obj, keys, val)=>{
    let i = 0;
    let length = keys.length;
    let t = obj;
    let x;
    for(; i < length; ++i){
        x = t[keys[i]];
        t = t[keys[i]] = i === length - 1 ? val : x != null ? x : !!~keys[i + 1].indexOf('.') || !(+keys[i + 1] > -1) ? {} : [];
    }
};
export const setByType = (obj, transforms)=>{
    for (const key of Object.keys(transforms)){
        const transform = transforms[key];
        if (transform.shouldTransform) {
            obj[key] = Array.prototype.concat.call([], obj[key]);
            if (typeof transform.transformFunction === 'function') {
                obj[key] = obj[key].map(transform.transformFunction);
            }
        }
    }
};
export const getFileName = (input)=>{
    const m = /([^\\\/]+)$/.exec(input);
    return m ? m[1] : '';
};
export const camelcaseOptionName = (name)=>{
    // Camelcase the option name
    // Don't camelcase anything after the dot `.`
    return name.split('.').map((v, i)=>{
        return i === 0 ? camelcase(v) : v;
    }).join('.');
};
export class CACError extends Error {
    constructor(message){
        super(message);
        this.name = this.constructor.name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = new Error(message).stack;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vdW5wa2cuY29tL2NhY0A2LjcuMTIvZGVuby91dGlscy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgT3B0aW9uIGZyb20gXCIuL09wdGlvbi50c1wiO1xuZXhwb3J0IGNvbnN0IHJlbW92ZUJyYWNrZXRzID0gKHY6IHN0cmluZykgPT4gdi5yZXBsYWNlKC9bPFtdLisvLCAnJykudHJpbSgpO1xuZXhwb3J0IGNvbnN0IGZpbmRBbGxCcmFja2V0cyA9ICh2OiBzdHJpbmcpID0+IHtcbiAgY29uc3QgQU5HTEVEX0JSQUNLRVRfUkVfR0xPQkFMID0gLzwoW14+XSspPi9nO1xuICBjb25zdCBTUVVBUkVfQlJBQ0tFVF9SRV9HTE9CQUwgPSAvXFxbKFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHJlcyA9IFtdO1xuXG4gIGNvbnN0IHBhcnNlID0gKG1hdGNoOiBzdHJpbmdbXSkgPT4ge1xuICAgIGxldCB2YXJpYWRpYyA9IGZhbHNlO1xuICAgIGxldCB2YWx1ZSA9IG1hdGNoWzFdO1xuXG4gICAgaWYgKHZhbHVlLnN0YXJ0c1dpdGgoJy4uLicpKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnNsaWNlKDMpO1xuICAgICAgdmFyaWFkaWMgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICByZXF1aXJlZDogbWF0Y2hbMF0uc3RhcnRzV2l0aCgnPCcpLFxuICAgICAgdmFsdWUsXG4gICAgICB2YXJpYWRpY1xuICAgIH07XG4gIH07XG5cbiAgbGV0IGFuZ2xlZE1hdGNoO1xuXG4gIHdoaWxlIChhbmdsZWRNYXRjaCA9IEFOR0xFRF9CUkFDS0VUX1JFX0dMT0JBTC5leGVjKHYpKSB7XG4gICAgcmVzLnB1c2gocGFyc2UoYW5nbGVkTWF0Y2gpKTtcbiAgfVxuXG4gIGxldCBzcXVhcmVNYXRjaDtcblxuICB3aGlsZSAoc3F1YXJlTWF0Y2ggPSBTUVVBUkVfQlJBQ0tFVF9SRV9HTE9CQUwuZXhlYyh2KSkge1xuICAgIHJlcy5wdXNoKHBhcnNlKHNxdWFyZU1hdGNoKSk7XG4gIH1cblxuICByZXR1cm4gcmVzO1xufTtcbmludGVyZmFjZSBNcmlPcHRpb25zIHtcbiAgYWxpYXM6IHtcbiAgICBbazogc3RyaW5nXTogc3RyaW5nW107XG4gIH07XG4gIGJvb2xlYW46IHN0cmluZ1tdO1xufVxuZXhwb3J0IGNvbnN0IGdldE1yaU9wdGlvbnMgPSAob3B0aW9uczogT3B0aW9uW10pID0+IHtcbiAgY29uc3QgcmVzdWx0OiBNcmlPcHRpb25zID0ge1xuICAgIGFsaWFzOiB7fSxcbiAgICBib29sZWFuOiBbXVxuICB9O1xuXG4gIGZvciAoY29uc3QgW2luZGV4LCBvcHRpb25dIG9mIG9wdGlvbnMuZW50cmllcygpKSB7XG4gICAgLy8gV2UgZG8gbm90IHNldCBkZWZhdWx0IHZhbHVlcyBpbiBtcmkgb3B0aW9uc1xuICAgIC8vIFNpbmNlIGl0cyB0eXBlICh0eXBlb2YpIHdpbGwgYmUgdXNlZCB0byBjYXN0IHBhcnNlZCBhcmd1bWVudHMuXG4gICAgLy8gV2hpY2ggbWVhbiBgLS1mb28gZm9vYCB3aWxsIGJlIHBhcnNlZCBhcyBge2ZvbzogdHJ1ZX1gIGlmIHdlIGhhdmUgYHtkZWZhdWx0Ontmb286IHRydWV9fWBcbiAgICAvLyBTZXQgYWxpYXNcbiAgICBpZiAob3B0aW9uLm5hbWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHJlc3VsdC5hbGlhc1tvcHRpb24ubmFtZXNbMF1dID0gb3B0aW9uLm5hbWVzLnNsaWNlKDEpO1xuICAgIH0gLy8gU2V0IGJvb2xlYW5cblxuXG4gICAgaWYgKG9wdGlvbi5pc0Jvb2xlYW4pIHtcbiAgICAgIGlmIChvcHRpb24ubmVnYXRlZCkge1xuICAgICAgICAvLyBGb3IgbmVnYXRlZCBvcHRpb25cbiAgICAgICAgLy8gV2Ugb25seSBzZXQgaXQgdG8gYGJvb2xlYW5gIHR5cGUgd2hlbiB0aGVyZSdzIG5vIHN0cmluZy10eXBlIG9wdGlvbiB3aXRoIHRoZSBzYW1lIG5hbWVcbiAgICAgICAgY29uc3QgaGFzU3RyaW5nVHlwZU9wdGlvbiA9IG9wdGlvbnMuc29tZSgobywgaSkgPT4ge1xuICAgICAgICAgIHJldHVybiBpICE9PSBpbmRleCAmJiBvLm5hbWVzLnNvbWUobmFtZSA9PiBvcHRpb24ubmFtZXMuaW5jbHVkZXMobmFtZSkpICYmIHR5cGVvZiBvLnJlcXVpcmVkID09PSAnYm9vbGVhbic7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghaGFzU3RyaW5nVHlwZU9wdGlvbikge1xuICAgICAgICAgIHJlc3VsdC5ib29sZWFuLnB1c2gob3B0aW9uLm5hbWVzWzBdKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0LmJvb2xlYW4ucHVzaChvcHRpb24ubmFtZXNbMF0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuZXhwb3J0IGNvbnN0IGZpbmRMb25nZXN0ID0gKGFycjogc3RyaW5nW10pID0+IHtcbiAgcmV0dXJuIGFyci5zb3J0KChhLCBiKSA9PiB7XG4gICAgcmV0dXJuIGEubGVuZ3RoID4gYi5sZW5ndGggPyAtMSA6IDE7XG4gIH0pWzBdO1xufTtcbmV4cG9ydCBjb25zdCBwYWRSaWdodCA9IChzdHI6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIpID0+IHtcbiAgcmV0dXJuIHN0ci5sZW5ndGggPj0gbGVuZ3RoID8gc3RyIDogYCR7c3RyfSR7JyAnLnJlcGVhdChsZW5ndGggLSBzdHIubGVuZ3RoKX1gO1xufTtcbmV4cG9ydCBjb25zdCBjYW1lbGNhc2UgPSAoaW5wdXQ6IHN0cmluZykgPT4ge1xuICByZXR1cm4gaW5wdXQucmVwbGFjZSgvKFthLXpdKS0oW2Etel0pL2csIChfLCBwMSwgcDIpID0+IHtcbiAgICByZXR1cm4gcDEgKyBwMi50b1VwcGVyQ2FzZSgpO1xuICB9KTtcbn07XG5leHBvcnQgY29uc3Qgc2V0RG90UHJvcCA9IChvYmo6IHtcbiAgW2s6IHN0cmluZ106IGFueTtcbn0sIGtleXM6IHN0cmluZ1tdLCB2YWw6IGFueSkgPT4ge1xuICBsZXQgaSA9IDA7XG4gIGxldCBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgbGV0IHQgPSBvYmo7XG4gIGxldCB4O1xuXG4gIGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICB4ID0gdFtrZXlzW2ldXTtcbiAgICB0ID0gdFtrZXlzW2ldXSA9IGkgPT09IGxlbmd0aCAtIDEgPyB2YWwgOiB4ICE9IG51bGwgPyB4IDogISF+a2V5c1tpICsgMV0uaW5kZXhPZignLicpIHx8ICEoK2tleXNbaSArIDFdID4gLTEpID8ge30gOiBbXTtcbiAgfVxufTtcbmV4cG9ydCBjb25zdCBzZXRCeVR5cGUgPSAob2JqOiB7XG4gIFtrOiBzdHJpbmddOiBhbnk7XG59LCB0cmFuc2Zvcm1zOiB7XG4gIFtrOiBzdHJpbmddOiBhbnk7XG59KSA9PiB7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRyYW5zZm9ybXMpKSB7XG4gICAgY29uc3QgdHJhbnNmb3JtID0gdHJhbnNmb3Jtc1trZXldO1xuXG4gICAgaWYgKHRyYW5zZm9ybS5zaG91bGRUcmFuc2Zvcm0pIHtcbiAgICAgIG9ialtrZXldID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5jYWxsKFtdLCBvYmpba2V5XSk7XG5cbiAgICAgIGlmICh0eXBlb2YgdHJhbnNmb3JtLnRyYW5zZm9ybUZ1bmN0aW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9ialtrZXldID0gb2JqW2tleV0ubWFwKHRyYW5zZm9ybS50cmFuc2Zvcm1GdW5jdGlvbik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuZXhwb3J0IGNvbnN0IGdldEZpbGVOYW1lID0gKGlucHV0OiBzdHJpbmcpID0+IHtcbiAgY29uc3QgbSA9IC8oW15cXFxcXFwvXSspJC8uZXhlYyhpbnB1dCk7XG4gIHJldHVybiBtID8gbVsxXSA6ICcnO1xufTtcbmV4cG9ydCBjb25zdCBjYW1lbGNhc2VPcHRpb25OYW1lID0gKG5hbWU6IHN0cmluZykgPT4ge1xuICAvLyBDYW1lbGNhc2UgdGhlIG9wdGlvbiBuYW1lXG4gIC8vIERvbid0IGNhbWVsY2FzZSBhbnl0aGluZyBhZnRlciB0aGUgZG90IGAuYFxuICByZXR1cm4gbmFtZS5zcGxpdCgnLicpLm1hcCgodiwgaSkgPT4ge1xuICAgIHJldHVybiBpID09PSAwID8gY2FtZWxjYXNlKHYpIDogdjtcbiAgfSkuam9pbignLicpO1xufTtcbmV4cG9ydCBjbGFzcyBDQUNFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXG4gICAgaWYgKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RhY2sgPSBuZXcgRXJyb3IobWVzc2FnZSkuc3RhY2s7XG4gICAgfVxuICB9XG5cbn0iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxNQUFNLGlCQUFpQixDQUFDLElBQWMsRUFBRSxPQUFPLENBQUMsVUFBVSxJQUFJLElBQUksR0FBRztBQUM1RSxPQUFPLE1BQU0sa0JBQWtCLENBQUMsSUFBYztJQUM1QyxNQUFNLDJCQUEyQjtJQUNqQyxNQUFNLDJCQUEyQjtJQUNqQyxNQUFNLE1BQU0sRUFBRTtJQUVkLE1BQU0sUUFBUSxDQUFDLFFBQW9CO1FBQ2pDLElBQUksV0FBVyxLQUFLO1FBQ3BCLElBQUksUUFBUSxLQUFLLENBQUMsRUFBRTtRQUVwQixJQUFJLE1BQU0sVUFBVSxDQUFDLFFBQVE7WUFDM0IsUUFBUSxNQUFNLEtBQUssQ0FBQztZQUNwQixXQUFXLElBQUk7UUFDakIsQ0FBQztRQUVELE9BQU87WUFDTCxVQUFVLEtBQUssQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDO1lBQzlCO1lBQ0E7UUFD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