import Option from "./Option.ts";
import { removeBrackets, findAllBrackets, findLongest, padRight, CACError } from "./utils.ts";
import { platformInfo } from "./deno.ts";
class Command {
    rawName;
    description;
    config;
    cli;
    options;
    aliasNames;
    name;
    args;
    commandAction;
    usageText;
    versionNumber;
    examples;
    helpCallback;
    globalCommand;
    constructor(rawName, description, config = {}, cli) {
        this.rawName = rawName;
        this.description = description;
        this.config = config;
        this.cli = cli;
        this.options = [];
        this.aliasNames = [];
        this.name = removeBrackets(rawName);
        this.args = findAllBrackets(rawName);
        this.examples = [];
    }
    usage(text) {
        this.usageText = text;
        return this;
    }
    allowUnknownOptions() {
        this.config.allowUnknownOptions = true;
        return this;
    }
    ignoreOptionDefaultValue() {
        this.config.ignoreOptionDefaultValue = true;
        return this;
    }
    version(version, customFlags = '-v, --version') {
        this.versionNumber = version;
        this.option(customFlags, 'Display version number');
        return this;
    }
    example(example) {
        this.examples.push(example);
        return this;
    }
    option(rawName, description, config) {
        const option = new Option(rawName, description, config);
        this.options.push(option);
        return this;
    }
    alias(name) {
        this.aliasNames.push(name);
        return this;
    }
    action(callback) {
        this.commandAction = callback;
        return this;
    }
    isMatched(name) {
        return this.name === name || this.aliasNames.includes(name);
    }
    get isDefaultCommand() {
        return this.name === '' || this.aliasNames.includes('!');
    }
    get isGlobalCommand() {
        return this instanceof GlobalCommand;
    }
    hasOption(name) {
        name = name.split('.')[0];
        return this.options.find(option => {
            return option.names.includes(name);
        });
    }
    outputHelp() {
        const { name, commands } = this.cli;
        const { versionNumber, options: globalOptions, helpCallback } = this.cli.globalCommand;
        let sections = [{
                body: `${name}${versionNumber ? `/${versionNumber}` : ''}`
            }];
        sections.push({
            title: 'Usage',
            body: `  $ ${name} ${this.usageText || this.rawName}`
        });
        const showCommands = (this.isGlobalCommand || this.isDefaultCommand) && commands.length > 0;
        if (showCommands) {
            const longestCommandName = findLongest(commands.map(command => command.rawName));
            sections.push({
                title: 'Commands',
                body: commands.map(command => {
                    return `  ${padRight(command.rawName, longestCommandName.length)}  ${command.description}`;
                }).join('\n')
            });
            sections.push({
                title: `For more info, run any command with the \`--help\` flag`,
                body: commands.map(command => `  $ ${name}${command.name === '' ? '' : ` ${command.name}`} --help`).join('\n')
            });
        }
        let options = this.isGlobalCommand ? globalOptions : [...this.options, ...(globalOptions || [])];
        if (!this.isGlobalCommand && !this.isDefaultCommand) {
            options = options.filter(option => option.name !== 'version');
        }
        if (options.length > 0) {
            const longestOptionName = findLongest(options.map(option => option.rawName));
            sections.push({
                title: 'Options',
                body: options.map(option => {
                    return `  ${padRight(option.rawName, longestOptionName.length)}  ${option.description} ${option.config.default === undefined ? '' : `(default: ${option.config.default})`}`;
                }).join('\n')
            });
        }
        if (this.examples.length > 0) {
            sections.push({
                title: 'Examples',
                body: this.examples.map(example => {
                    if (typeof example === 'function') {
                        return example(name);
                    }
                    return example;
                }).join('\n')
            });
        }
        if (helpCallback) {
            sections = helpCallback(sections) || sections;
        }
        console.log(sections.map(section => {
            return section.title ? `${section.title}:\n${section.body}` : section.body;
        }).join('\n\n'));
    }
    outputVersion() {
        const { name } = this.cli;
        const { versionNumber } = this.cli.globalCommand;
        if (versionNumber) {
            console.log(`${name}/${versionNumber} ${platformInfo}`);
        }
    }
    checkRequiredArgs() {
        const minimalArgsCount = this.args.filter(arg => arg.required).length;
        if (this.cli.args.length < minimalArgsCount) {
            throw new CACError(`missing required args for command \`${this.rawName}\``);
        }
    }
    checkUnknownOptions() {
        const { options, globalCommand } = this.cli;
        if (!this.config.allowUnknownOptions) {
            for (const name of Object.keys(options)) {
                if (name !== '--' && !this.hasOption(name) && !globalCommand.hasOption(name)) {
                    throw new CACError(`Unknown option \`${name.length > 1 ? `--${name}` : `-${name}`}\``);
                }
            }
        }
    }
    checkOptionValue() {
        const { options: parsedOptions, globalCommand } = this.cli;
        const options = [...globalCommand.options, ...this.options];
        for (const option of options) {
            const value = parsedOptions[option.name.split('.')[0]];
            if (option.required) {
                const hasNegated = options.some(o => o.negated && o.names.includes(option.name));
                if (value === true || value === false && !hasNegated) {
                    throw new CACError(`option \`${option.rawName}\` value is missing`);
                }
            }
        }
    }
}
class GlobalCommand extends Command {
    constructor(cli) {
        super('@@global@@', '', {}, cli);
    }
}
export { GlobalCommand };
export default Command;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxNQUF3QixNQUFNLGFBQWEsQ0FBQztBQUNuRCxPQUFPLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM5RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBaUJ6QyxNQUFNLE9BQU87SUFjUTtJQUF3QjtJQUE0QjtJQUFtQztJQWIxRyxPQUFPLENBQVc7SUFDbEIsVUFBVSxDQUFXO0lBR3JCLElBQUksQ0FBUztJQUNiLElBQUksQ0FBZTtJQUNuQixhQUFhLENBQTJCO0lBQ3hDLFNBQVMsQ0FBVTtJQUNuQixhQUFhLENBQVU7SUFDdkIsUUFBUSxDQUFtQjtJQUMzQixZQUFZLENBQWdCO0lBQzVCLGFBQWEsQ0FBaUI7SUFFOUIsWUFBbUIsT0FBZSxFQUFTLFdBQW1CLEVBQVMsU0FBd0IsRUFBRSxFQUFTLEdBQVE7UUFBL0YsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUFTLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQVMsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7UUFBUyxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ2hILElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxJQUFJLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBWTtRQUNoQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUN0QixPQUFPLElB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O2dCQUVqRixJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLEtBQUssSUFBSSxDQUFDLFVBQVUsRUFBRTtvQkFDcEQsTUFBTSxJQUFJLFFBQVEsQ0FBQyxZQUFZLE1BQU0sQ0FBQyxPQUFPLHFCQUFxQixDQUFDLENBQUM7aUJBQ3JFO2FBQ0Y7U0FDRjtJQUNILENBQUM7Q0FFRjtBQUVELE1BQU0sYUFBYyxTQUFRLE9BQU87SUFDakMsWUFBWSxHQUFRO1FBQ2xCLEtBQUssQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNuQyxDQUFDO0NBRUY7QUFHRCxPQUFPLEVBQUUsYUFBYSxFQUFFLENBQUM7QUFDekIsZUFBZSxPQUFPLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ0FDIGZyb20gXCIuL0NBQy50c1wiO1xuaW1wb3J0IE9wdGlvbiwgeyBPcHRpb25Db25maWcgfSBmcm9tIFwiLi9PcHRpb24udHNcIjtcbmltcG9ydCB7IHJlbW92ZUJyYWNrZXRzLCBmaW5kQWxsQnJhY2tldHMsIGZpbmRMb25nZXN0LCBwYWRSaWdodCwgQ0FDRXJyb3IgfSBmcm9tIFwiLi91dGlscy50c1wiO1xuaW1wb3J0IHsgcGxhdGZvcm1JbmZvIH0gZnJvbSBcIi4vZGVuby50c1wiO1xuaW50ZXJmYWNlIENvbW1hbmRBcmcge1xuICByZXF1aXJlZDogYm9vbGVhbjtcbiAgdmFsdWU6IHN0cmluZztcbiAgdmFyaWFkaWM6IGJvb2xlYW47XG59XG5pbnRlcmZhY2UgSGVscFNlY3Rpb24ge1xuICB0aXRsZT86IHN0cmluZztcbiAgYm9keTogc3RyaW5nO1xufVxuaW50ZXJmYWNlIENvbW1hbmRDb25maWcge1xuICBhbGxvd1Vua25vd25PcHRpb25zPzogYm9vbGVhbjtcbiAgaWdub3JlT3B0aW9uRGVmYXVsdFZhbHVlPzogYm9vbGVhbjtcbn1cbnR5cGUgSGVscENhbGxiYWNrID0gKHNlY3Rpb25zOiBIZWxwU2VjdGlvbltdKSA9PiB2b2lkIHwgSGVscFNlY3Rpb25bXTtcbnR5cGUgQ29tbWFuZEV4YW1wbGUgPSAoKGJpbjogc3RyaW5nKSA9PiBzdHJpbmcpIHwgc3RyaW5nO1xuXG5jbGFzcyBDb21tYW5kIHtcbiAgb3B0aW9uczogT3B0aW9uW107XG4gIGFsaWFzTmFtZXM6IHN0cmluZ1tdO1xuICAvKiBQYXJzZWQgY29tbWFuZCBuYW1lICovXG5cbiAgbmFtZTogc3RyaW5nO1xuICBhcmdzOiBDb21tYW5kQXJnW107XG4gIGNvbW1hbmRBY3Rpb24/OiAoLi4uYXJnczogYW55W10pID0+IGFueTtcbiAgdXNhZ2VUZXh0Pzogc3RyaW5nO1xuICB2ZXJzaW9uTnVtYmVyPzogc3RyaW5nO1xuICBleGFtcGxlczogQ29tbWFuZEV4YW1wbGVbXTtcbiAgaGVscENhbGxiYWNrPzogSGVscENhbGxiYWNrO1xuICBnbG9iYWxDb21tYW5kPzogR2xvYmFsQ29tbWFuZDtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmF3TmFtZTogc3RyaW5nLCBwdWJsaWMgZGVzY3JpcHRpb246IHN0cmluZywgcHVibGljIGNvbmZpZzogQ29tbWFuZENvbmZpZyA9IHt9LCBwdWJsaWMgY2xpOiBDQUMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBbXTtcbiAgICB0aGlzLmFsaWFzTmFtZXMgPSBbXTtcbiAgICB0aGlzLm5hbWUgPSByZW1vdmVCcmFja2V0cyhyYXdOYW1lKTtcbiAgICB0aGlzLmFyZ3MgPSBmaW5kQWxsQnJhY2tldHMocmF3TmFtZSk7XG4gICAgdGhpcy5leGFtcGxlcyA9IFtdO1xuICB9XG5cbiAgdXNhZ2UodGV4dDogc3RyaW5nKSB7XG4gICAgdGhpcy51c2FnZVRleHQgPSB0ZXh0O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYWxsb3dVbmtub3duT3B0aW9ucygpIHtcbiAgICB0aGlzLmNvbmZpZy5hbGxvd1Vua25vd25PcHRpb25zID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGlnbm9yZU9wdGlvbkRlZmF1bHRWYWx1ZSgpIHtcbiAgICB0aGlzLmNvbmZpZy5pZ25vcmVPcHRpb25EZWZhdWx0VmFsdWUgPSB0cnVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmVyc2lvbih2ZXJzaW9uOiBzdHJpbmcsIGN1c3RvbUZsYWdzID0gJy12LCAtLXZlcnNpb24nKSB7XG4gICAgdGhpcy52ZXJzaW9uTnVtYmVyID0gdmVyc2lvbjtcbiAgICB0aGlzLm9wdGlvbihjdXN0b21GbGFncywgJ0Rpc3BsYXkgdmVyc2lvbiBudW1iZXInKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGV4YW1wbGUoZXhhbXBsZTogQ29tbWFuZEV4YW1wbGUpIHtcbiAgICB0aGlzLmV4YW1wbGVzLnB1c2goZXhhbXBsZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgLyoqXG4gICAqIEFkZCBhIG9wdGlvbiBmb3IgdGhpcyBjb21tYW5kXG4gICAqIEBwYXJhbSByYXdOYW1lIFJhdyBvcHRpb24gbmFtZShzKVxuICAgKiBAcGFyYW0gZGVzY3JpcHRpb24gT3B0aW9uIGRlc2NyaXB0aW9uXG4gICAqIEBwYXJhbSBjb25maWcgT3B0aW9uIGNvbmZpZ1xuICAgKi9cblxuXG4gIG9wdGlvbihyYXdOYW1lOiBzdHJpbmcsIGRlc2NyaXB0aW9uOiBzdHJpbmcsIGNvbmZpZz86IE9wdGlvbkNvbmZpZykge1xuICAgIGNvbnN0IG9wdGlvbiA9IG5ldyBPcHRpb24ocmF3TmFtZSwgZGVzY3JpcHRpb24sIGNvbmZpZyk7XG4gICAgdGhpcy5vcHRpb25zLnB1c2gob3B0aW9uKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGFsaWFzKG5hbWU6IHN0cmluZykge1xuICAgIHRoaXMuYWxpYXNOYW1lcy5wdXNoKG5hbWUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYWN0aW9uKGNhbGxiYWNrOiAoLi4uYXJnczogYW55W10pID0+IGFueSkge1xuICAgIHRoaXMuY29tbWFuZEFjdGlvbiA9IGNhbGxiYWNrO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIC8qKlxuICAgKiBDaGVjayBpZiBhIGNvbW1hbmQgbmFtZSBpcyBtYXRjaGVkIGJ5IHRoaXMgY29tbWFuZFxuICAgKiBAcGFyYW0gbmFtZSBDb21tYW5kIG5hbWVcbiAgICovXG5cblxuICBpc01hdGNoZWQobmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMubmFtZSA9PT0gbmFtZSB8fCB0aGlzLmFsaWFzTmFtZXMuaW5jbHVkZXMobmFtZSk7XG4gIH1cblxuICBnZXQgaXNEZWZhdWx0Q29tbWFuZCgpIHtcbiAgICByZXR1cm4gdGhpcy5uYW1lID09PSAnJyB8fCB0aGlzLmFsaWFzTmFtZXMuaW5jbHVkZXMoJyEnKTtcbiAgfVxuXG4gIGdldCBpc0dsb2JhbENvbW1hbmQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBHbG9iYWxDb21tYW5kO1xuICB9XG4gIC8qKlxuICAgKiBDaGVjayBpZiBhbiBvcHRpb24gaXMgcmVnaXN0ZXJlZCBpbiB0aGlzIGNvbW1hbmRcbiAgICogQHBhcmFtIG5hbWUgT3B0aW9uIG5hbWVcbiAgICovXG5cblxuICBoYXNPcHRpb24obmFtZTogc3RyaW5nKSB7XG4gICAgbmFtZSA9IG5hbWUuc3BsaXQoJy4nKVswXTtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmZpbmQob3B0aW9uID0+IHtcbiAgICAgIHJldHVybiBvcHRpb24ubmFtZXMuaW5jbHVkZXMobmFtZSk7XG4gICAgfSk7XG4gIH1cblxuICBvdXRwdXRIZWxwKCkge1xuICAgIGNvbnN0IHtcbiAgICAgIG5hbWUsXG4gICAgICBjb21tYW5kc1xuICAgIH0gPSB0aGlzLmNsaTtcbiAgICBjb25zdCB7XG4gICAgICB2ZXJzaW9uTnVtYmVyLFxuICAgICAgb3B0aW9uczogZ2xvYmFsT3B0aW9ucyxcbiAgICAgIGhlbHBDYWxsYmFja1xuICAgIH0gPSB0aGlzLmNsaS5nbG9iYWxDb21tYW5kO1xuICAgIGxldCBzZWN0aW9uczogSGVscFNlY3Rpb25bXSA9IFt7XG4gICAgICBib2R5OiBgJHtuYW1lfSR7dmVyc2lvbk51bWJlciA/IGAvJHt2ZXJzaW9uTnVtYmVyfWAgOiAnJ31gXG4gICAgfV07XG4gICAgc2VjdGlvbnMucHVzaCh7XG4gICAgICB0aXRsZTogJ1VzYWdlJyxcbiAgICAgIGJvZHk6IGAgICQgJHtuYW1lfSAke3RoaXMudXNhZ2VUZXh0IHx8IHRoaXMucmF3TmFtZX1gXG4gICAgfSk7XG4gICAgY29uc3Qgc2hvd0NvbW1hbmRzID0gKHRoaXMuaXNHbG9iYWxDb21tYW5kIHx8IHRoaXMuaXNEZWZhdWx0Q29tbWFuZCkgJiYgY29tbWFuZHMubGVuZ3RoID4gMDtcblxuICAgIGlmIChzaG93Q29tbWFuZHMpIHtcbiAgICAgIGNvbnN0IGxvbmdlc3RDb21tYW5kTmFtZSA9IGZpbmRMb25nZXN0KGNvbW1hbmRzLm1hcChjb21tYW5kID0+IGNvbW1hbmQucmF3TmFtZSkpO1xuICAgICAgc2VjdGlvbnMucHVzaCh7XG4gICAgICAgIHRpdGxlOiAnQ29tbWFuZHMnLFxuICAgICAgICBib2R5OiBjb21tYW5kcy5tYXAoY29tbWFuZCA9PiB7XG4gICAgICAgICAgcmV0dXJuIGAgICR7cGFkUmlnaHQoY29tbWFuZC5yYXdOYW1lLCBsb25nZXN0Q29tbWFuZE5hbWUubGVuZ3RoKX0gICR7Y29tbWFuZC5kZXNjcmlwdGlvbn1gO1xuICAgICAgICB9KS5qb2luKCdcXG4nKVxuICAgICAgfSk7XG4gICAgICBzZWN0aW9ucy5wdXNoKHtcbiAgICAgICAgdGl0bGU6IGBGb3IgbW9yZSBpbmZvLCBydW4gYW55IGNvbW1hbmQgd2l0aCB0aGUgXFxgLS1oZWxwXFxgIGZsYWdgLFxuICAgICAgICBib2R5OiBjb21tYW5kcy5tYXAoY29tbWFuZCA9PiBgICAkICR7bmFtZX0ke2NvbW1hbmQubmFtZSA9PT0gJycgPyAnJyA6IGAgJHtjb21tYW5kLm5hbWV9YH0gLS1oZWxwYCkuam9pbignXFxuJylcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGxldCBvcHRpb25zID0gdGhpcy5pc0dsb2JhbENvbW1hbmQgPyBnbG9iYWxPcHRpb25zIDogWy4uLnRoaXMub3B0aW9ucywgLi4uKGdsb2JhbE9wdGlvbnMgfHwgW10pXTtcblxuICAgIGlmICghdGhpcy5pc0dsb2JhbENvbW1hbmQgJiYgIXRoaXMuaXNEZWZhdWx0Q29tbWFuZCkge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMuZmlsdGVyKG9wdGlvbiA9PiBvcHRpb24ubmFtZSAhPT0gJ3ZlcnNpb24nKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBsb25nZXN0T3B0aW9uTmFtZSA9IGZpbmRMb25nZXN0KG9wdGlvbnMubWFwKG9wdGlvbiA9PiBvcHRpb24ucmF3TmFtZSkpO1xuICAgICAgc2VjdGlvbnMucHVzaCh7XG4gICAgICAgIHRpdGxlOiAnT3B0aW9ucycsXG4gICAgICAgIGJvZHk6IG9wdGlvbnMubWFwKG9wdGlvbiA9PiB7XG4gICAgICAgICAgcmV0dXJuIGAgICR7cGFkUmlnaHQob3B0aW9uLnJhd05hbWUsIGxvbmdlc3RPcHRpb25OYW1lLmxlbmd0aCl9ICAke29wdGlvbi5kZXNjcmlwdGlvbn0gJHtvcHRpb24uY29uZmlnLmRlZmF1bHQgPT09IHVuZGVmaW5lZCA/ICcnIDogYChkZWZhdWx0OiAke29wdGlvbi5jb25maWcuZGVmYXVsdH0pYH1gO1xuICAgICAgICB9KS5qb2luKCdcXG4nKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgc2VjdGlvbnMucHVzaCh7XG4gICAgICAgIHRpdGxlOiAnRXhhbXBsZXMnLFxuICAgICAgICBib2R5OiB0aGlzLmV4YW1wbGVzLm1hcChleGFtcGxlID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIGV4YW1wbGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiBleGFtcGxlKG5hbWUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBleGFtcGxlO1xuICAgICAgICB9KS5qb2luKCdcXG4nKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGhlbHBDYWxsYmFjaykge1xuICAgICAgc2VjdGlvbnMgPSBoZWxwQ2FsbGJhY2soc2VjdGlvbnMpIHx8IHNlY3Rpb25zO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKHNlY3Rpb25zLm1hcChzZWN0aW9uID0+IHtcbiAgICAgIHJldHVybiBzZWN0aW9uLnRpdGxlID8gYCR7c2VjdGlvbi50aXRsZX06XFxuJHtzZWN0aW9uLmJvZHl9YCA6IHNlY3Rpb24uYm9keTtcbiAgICB9KS5qb2luKCdcXG5cXG4nKSk7XG4gIH1cblxuICBvdXRwdXRWZXJzaW9uKCkge1xuICAgIGNvbnN0IHtcbiAgICAgIG5hbWVcbiAgICB9ID0gdGhpcy5jbGk7XG4gICAgY29uc3Qge1xuICAgICAgdmVyc2lvbk51bWJlclxuICAgIH0gPSB0aGlzLmNsaS5nbG9iYWxDb21tYW5kO1xuXG4gICAgaWYgKHZlcnNpb25OdW1iZXIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGAke25hbWV9LyR7dmVyc2lvbk51bWJlcn0gJHtwbGF0Zm9ybUluZm99YCk7XG4gICAgfVxuICB9XG5cbiAgY2hlY2tSZXF1aXJlZEFyZ3MoKSB7XG4gICAgY29uc3QgbWluaW1hbEFyZ3NDb3VudCA9IHRoaXMuYXJncy5maWx0ZXIoYXJnID0+IGFyZy5yZXF1aXJlZCkubGVuZ3RoO1xuXG4gICAgaWYgKHRoaXMuY2xpLmFyZ3MubGVuZ3RoIDwgbWluaW1hbEFyZ3NDb3VudCkge1xuICAgICAgdGhyb3cgbmV3IENBQ0Vycm9yKGBtaXNzaW5nIHJlcXVpcmVkIGFyZ3MgZm9yIGNvbW1hbmQgXFxgJHt0aGlzLnJhd05hbWV9XFxgYCk7XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBDaGVjayBpZiB0aGUgcGFyc2VkIG9wdGlvbnMgY29udGFpbiBhbnkgdW5rbm93biBvcHRpb25zXG4gICAqXG4gICAqIEV4aXQgYW5kIG91dHB1dCBlcnJvciB3aGVuIHRydWVcbiAgICovXG5cblxuICBjaGVja1Vua25vd25PcHRpb25zKCkge1xuICAgIGNvbnN0IHtcbiAgICAgIG9wdGlvbnMsXG4gICAgICBnbG9iYWxDb21tYW5kXG4gICAgfSA9IHRoaXMuY2xpO1xuXG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hbGxvd1Vua25vd25PcHRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMob3B0aW9ucykpIHtcbiAgICAgICAgaWYgKG5hbWUgIT09ICctLScgJiYgIXRoaXMuaGFzT3B0aW9uKG5hbWUpICYmICFnbG9iYWxDb21tYW5kLmhhc09wdGlvbihuYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBDQUNFcnJvcihgVW5rbm93biBvcHRpb24gXFxgJHtuYW1lLmxlbmd0aCA+IDEgPyBgLS0ke25hbWV9YCA6IGAtJHtuYW1lfWB9XFxgYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRoZSByZXF1aXJlZCBzdHJpbmctdHlwZSBvcHRpb25zIGV4aXN0XG4gICAqL1xuXG5cbiAgY2hlY2tPcHRpb25WYWx1ZSgpIHtcbiAgICBjb25zdCB7XG4gICAgICBvcHRpb25zOiBwYXJzZWRPcHRpb25zLFxuICAgICAgZ2xvYmFsQ29tbWFuZFxuICAgIH0gPSB0aGlzLmNsaTtcbiAgICBjb25zdCBvcHRpb25zID0gWy4uLmdsb2JhbENvbW1hbmQub3B0aW9ucywgLi4udGhpcy5vcHRpb25zXTtcblxuICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIG9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gcGFyc2VkT3B0aW9uc1tvcHRpb24ubmFtZS5zcGxpdCgnLicpWzBdXTsgLy8gQ2hlY2sgcmVxdWlyZWQgb3B0aW9uIHZhbHVlXG5cbiAgICAgIGlmIChvcHRpb24ucmVxdWlyZWQpIHtcbiAgICAgICAgY29uc3QgaGFzTmVnYXRlZCA9IG9wdGlvbnMuc29tZShvID0+IG8ubmVnYXRlZCAmJiBvLm5hbWVzLmluY2x1ZGVzKG9wdGlvbi5uYW1lKSk7XG5cbiAgICAgICAgaWYgKHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09PSBmYWxzZSAmJiAhaGFzTmVnYXRlZCkge1xuICAgICAgICAgIHRocm93IG5ldyBDQUNFcnJvcihgb3B0aW9uIFxcYCR7b3B0aW9uLnJhd05hbWV9XFxgIHZhbHVlIGlzIG1pc3NpbmdgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG59XG5cbmNsYXNzIEdsb2JhbENvbW1hbmQgZXh0ZW5kcyBDb21tYW5kIHtcbiAgY29uc3RydWN0b3IoY2xpOiBDQUMpIHtcbiAgICBzdXBlcignQEBnbG9iYWxAQCcsICcnLCB7fSwgY2xpKTtcbiAgfVxuXG59XG5cbmV4cG9ydCB0eXBlIHsgSGVscENhbGxiYWNrLCBDb21tYW5kRXhhbXBsZSwgQ29tbWFuZENvbmZpZyB9O1xuZXhwb3J0IHsgR2xvYmFsQ29tbWFuZCB9O1xuZXhwb3J0IGRlZmF1bHQgQ29tbWFuZDsiXX0=