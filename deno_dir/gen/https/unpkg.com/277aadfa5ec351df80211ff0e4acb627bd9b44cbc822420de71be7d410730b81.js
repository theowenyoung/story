import { removeBrackets, camelcaseOptionName } from "./utils.ts";
export default class Option {
    /** Option name */ name;
    /** Option name and aliases */ names;
    isBoolean;
    required;
    config;
    negated;
    constructor(rawName, description, config){
        this.rawName = rawName;
        this.description = description;
        this.config = Object.assign({}, config); // You may use cli.option('--env.* [value]', 'desc') to denote a dot-nested option
        rawName = rawName.replace(/\.\*/g, '');
        this.negated = false;
        this.names = removeBrackets(rawName).split(',').map((v)=>{
            let name = v.trim().replace(/^-{1,2}/, '');
            if (name.startsWith('no-')) {
                this.negated = true;
                name = name.replace(/^no-/, '');
            }
            return camelcaseOptionName(name);
        }).sort((a, b)=>a.length > b.length ? 1 : -1); // Sort names
        // Use the longest name (last one) as actual option name
        this.name = this.names[this.names.length - 1];
        if (this.negated && this.config.default == null) {
            this.config.default = true;
        }
        if (rawName.includes('<')) {
            this.required = true;
        } else if (rawName.includes('[')) {
            this.required = false;
        } else {
            // No arg needed, it's boolean flag
            this.isBoolean = true;
        }
    }
    rawName;
    description;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vdW5wa2cuY29tL2NhY0A2LjcuMTIvZGVuby9PcHRpb24udHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcmVtb3ZlQnJhY2tldHMsIGNhbWVsY2FzZU9wdGlvbk5hbWUgfSBmcm9tIFwiLi91dGlscy50c1wiO1xuaW50ZXJmYWNlIE9wdGlvbkNvbmZpZyB7XG4gIGRlZmF1bHQ/OiBhbnk7XG4gIHR5cGU/OiBhbnlbXTtcbn1cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9wdGlvbiB7XG4gIC8qKiBPcHRpb24gbmFtZSAqL1xuICBuYW1lOiBzdHJpbmc7XG4gIC8qKiBPcHRpb24gbmFtZSBhbmQgYWxpYXNlcyAqL1xuXG4gIG5hbWVzOiBzdHJpbmdbXTtcbiAgaXNCb29sZWFuPzogYm9vbGVhbjsgLy8gYHJlcXVpcmVkYCB3aWxsIGJlIGEgYm9vbGVhbiBmb3Igb3B0aW9ucyB3aXRoIGJyYWNrZXRzXG5cbiAgcmVxdWlyZWQ/OiBib29sZWFuO1xuICBjb25maWc6IE9wdGlvbkNvbmZpZztcbiAgbmVnYXRlZDogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmF3TmFtZTogc3RyaW5nLCBwdWJsaWMgZGVzY3JpcHRpb246IHN0cmluZywgY29uZmlnPzogT3B0aW9uQ29uZmlnKSB7XG4gICAgdGhpcy5jb25maWcgPSBPYmplY3QuYXNzaWduKHt9LCBjb25maWcpOyAvLyBZb3UgbWF5IHVzZSBjbGkub3B0aW9uKCctLWVudi4qIFt2YWx1ZV0nLCAnZGVzYycpIHRvIGRlbm90ZSBhIGRvdC1uZXN0ZWQgb3B0aW9uXG5cbiAgICByYXdOYW1lID0gcmF3TmFtZS5yZXBsYWNlKC9cXC5cXCovZywgJycpO1xuICAgIHRoaXMubmVnYXRlZCA9IGZhbHNlO1xuICAgIHRoaXMubmFtZXMgPSByZW1vdmVCcmFja2V0cyhyYXdOYW1lKS5zcGxpdCgnLCcpLm1hcCgodjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgbmFtZSA9IHYudHJpbSgpLnJlcGxhY2UoL14tezEsMn0vLCAnJyk7XG5cbiAgICAgIGlmIChuYW1lLnN0YXJ0c1dpdGgoJ25vLScpKSB7XG4gICAgICAgIHRoaXMubmVnYXRlZCA9IHRydWU7XG4gICAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL15uby0vLCAnJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjYW1lbGNhc2VPcHRpb25OYW1lKG5hbWUpO1xuICAgIH0pLnNvcnQoKGEsIGIpID0+IGEubGVuZ3RoID4gYi5sZW5ndGggPyAxIDogLTEpOyAvLyBTb3J0IG5hbWVzXG4gICAgLy8gVXNlIHRoZSBsb25nZXN0IG5hbWUgKGxhc3Qgb25lKSBhcyBhY3R1YWwgb3B0aW9uIG5hbWVcblxuICAgIHRoaXMubmFtZSA9IHRoaXMubmFtZXNbdGhpcy5uYW1lcy5sZW5ndGggLSAxXTtcblxuICAgIGlmICh0aGlzLm5lZ2F0ZWQgJiYgdGhpcy5jb25maWcuZGVmYXVsdCA9PSBudWxsKSB7XG4gICAgICB0aGlzLmNvbmZpZy5kZWZhdWx0ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAocmF3TmFtZS5pbmNsdWRlcygnPCcpKSB7XG4gICAgICB0aGlzLnJlcXVpcmVkID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHJhd05hbWUuaW5jbHVkZXMoJ1snKSkge1xuICAgICAgdGhpcy5yZXF1aXJlZCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBObyBhcmcgbmVlZGVkLCBpdCdzIGJvb2xlYW4gZmxhZ1xuICAgICAgdGhpcy5pc0Jvb2xlYW4gPSB0cnVlO1xuICAgIH1cbiAgfVxuXG59XG5leHBvcnQgdHlwZSB7IE9wdGlvbkNvbmZpZyB9OyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLGNBQWMsRUFBRSxtQkFBbUIsUUFBUSxhQUFhO0FBS2pFLGVBQWUsTUFBTTtJQUNuQixnQkFBZ0IsR0FDaEIsS0FBYTtJQUNiLDRCQUE0QixHQUU1QixNQUFnQjtJQUNoQixVQUFvQjtJQUVwQixTQUFtQjtJQUNuQixPQUFxQjtJQUNyQixRQUFpQjtJQUVqQixZQUFtQixTQUF3QixhQUFxQixNQUFxQixDQUFFO3VCQUFwRTsyQkFBd0I7UUFDekMsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEdBQUcsU0FBUyxrRkFBa0Y7UUFFM0gsVUFBVSxRQUFRLE9BQU8sQ0FBQyxTQUFTO1FBQ25DLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSztRQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLGVBQWUsU0FBUyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFjO1lBQ2pFLElBQUksT0FBTyxFQUFFLElBQUksR0FBRyxPQUFPLENBQUMsV0FBVztZQUV2QyxJQUFJLEtBQUssVUFBVSxDQUFDLFFBQVE7Z0JBQzFCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSTtnQkFDbkIsT0FBTyxLQUFLLE9BQU8sQ0FBQyxRQUFRO1lBQzlCLENBQUM7WUFFRCxPQUFPLG9CQUFvQjtRQUM3QixHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLGFBQWE7UUFDOUQsd0RBQXdEO1FBRXhELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxFQUFFO1FBRTdDLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDL0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSTtRQUM1QixDQUFDO1FBRUQsSUFBSSxRQUFRLFFBQVEsQ0FBQyxNQUFNO1lBQ3pCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSTtRQUN0QixPQUFPLElBQUksUUFBUSxRQUFRLENBQUMsTUFBTTtZQUNoQyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUs7UUFDdkIsT0FBTztZQUNMLG1DQUFtQztZQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUk7UUFDdkIsQ0FBQztJQUNIO0lBL0JtQjtJQUF3QjtBQWlDN0MsQ0FBQyJ9