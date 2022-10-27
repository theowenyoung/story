import Option from "./Option.ts";
import { removeBrackets, findAllBrackets, findLongest, padRight, CACError } from "./utils.ts";
import { platformInfo } from "./deno.ts";
class Command {
    options;
    aliasNames;
    /* Parsed command name */ name;
    args;
    commandAction;
    usageText;
    versionNumber;
    examples;
    helpCallback;
    globalCommand;
    constructor(rawName, description, config = {}, cli){
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
    /**
   * Add a option for this command
   * @param rawName Raw option name(s)
   * @param description Option description
   * @param config Option config
   */ option(rawName, description, config) {
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
    /**
   * Check if a command name is matched by this command
   * @param name Command name
   */ isMatched(name) {
        return this.name === name || this.aliasNames.includes(name);
    }
    get isDefaultCommand() {
        return this.name === '' || this.aliasNames.includes('!');
    }
    get isGlobalCommand() {
        return this instanceof GlobalCommand;
    }
    /**
   * Check if an option is registered in this command
   * @param name Option name
   */ hasOption(name) {
        name = name.split('.')[0];
        return this.options.find((option)=>{
            return option.names.includes(name);
        });
    }
    outputHelp() {
        const { name , commands  } = this.cli;
        const { versionNumber , options: globalOptions , helpCallback  } = this.cli.globalCommand;
        let sections = [
            {
                body: `${name}${versionNumber ? `/${versionNumber}` : ''}`
            }
        ];
        sections.push({
            title: 'Usage',
            body: `  $ ${name} ${this.usageText || this.rawName}`
        });
        const showCommands = (this.isGlobalCommand || this.isDefaultCommand) && commands.length > 0;
        if (showCommands) {
            const longestCommandName = findLongest(commands.map((command)=>command.rawName));
            sections.push({
                title: 'Commands',
                body: commands.map((command)=>{
                    return `  ${padRight(command.rawName, longestCommandName.length)}  ${command.description}`;
                }).join('\n')
            });
            sections.push({
                title: `For more info, run any command with the \`--help\` flag`,
                body: commands.map((command)=>`  $ ${name}${command.name === '' ? '' : ` ${command.name}`} --help`).join('\n')
            });
        }
        let options = this.isGlobalCommand ? globalOptions : [
            ...this.options,
            ...globalOptions || []
        ];
        if (!this.isGlobalCommand && !this.isDefaultCommand) {
            options = options.filter((option)=>option.name !== 'version');
        }
        if (options.length > 0) {
            const longestOptionName = findLongest(options.map((option)=>option.rawName));
            sections.push({
                title: 'Options',
                body: options.map((option)=>{
                    return `  ${padRight(option.rawName, longestOptionName.length)}  ${option.description} ${option.config.default === undefined ? '' : `(default: ${option.config.default})`}`;
                }).join('\n')
            });
        }
        if (this.examples.length > 0) {
            sections.push({
                title: 'Examples',
                body: this.examples.map((example)=>{
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
        console.log(sections.map((section)=>{
            return section.title ? `${section.title}:\n${section.body}` : section.body;
        }).join('\n\n'));
    }
    outputVersion() {
        const { name  } = this.cli;
        const { versionNumber  } = this.cli.globalCommand;
        if (versionNumber) {
            console.log(`${name}/${versionNumber} ${platformInfo}`);
        }
    }
    checkRequiredArgs() {
        const minimalArgsCount = this.args.filter((arg)=>arg.required).length;
        if (this.cli.args.length < minimalArgsCount) {
            throw new CACError(`missing required args for command \`${this.rawName}\``);
        }
    }
    /**
   * Check if the parsed options contain any unknown options
   *
   * Exit and output error when true
   */ checkUnknownOptions() {
        const { options , globalCommand  } = this.cli;
        if (!this.config.allowUnknownOptions) {
            for (const name of Object.keys(options)){
                if (name !== '--' && !this.hasOption(name) && !globalCommand.hasOption(name)) {
                    throw new CACError(`Unknown option \`${name.length > 1 ? `--${name}` : `-${name}`}\``);
                }
            }
        }
    }
    /**
   * Check if the required string-type options exist
   */ checkOptionValue() {
        const { options: parsedOptions , globalCommand  } = this.cli;
        const options = [
            ...globalCommand.options,
            ...this.options
        ];
        for (const option of options){
            const value = parsedOptions[option.name.split('.')[0]]; // Check required option value
            if (option.required) {
                const hasNegated = options.some((o)=>o.negated && o.names.includes(option.name));
                if (value === true || value === false && !hasNegated) {
                    throw new CACError(`option \`${option.rawName}\` value is missing`);
                }
            }
        }
    }
    rawName;
    description;
    config;
    cli;
}
class GlobalCommand extends Command {
    constructor(cli){
        super('@@global@@', '', {}, cli);
    }
}
export { GlobalCommand };
export default Command;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vdW5wa2cuY29tL2NhY0A2LjcuMTIvZGVuby9Db21tYW5kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBDQUMgZnJvbSBcIi4vQ0FDLnRzXCI7XG5pbXBvcnQgT3B0aW9uLCB7IE9wdGlvbkNvbmZpZyB9IGZyb20gXCIuL09wdGlvbi50c1wiO1xuaW1wb3J0IHsgcmVtb3ZlQnJhY2tldHMsIGZpbmRBbGxCcmFja2V0cywgZmluZExvbmdlc3QsIHBhZFJpZ2h0LCBDQUNFcnJvciB9IGZyb20gXCIuL3V0aWxzLnRzXCI7XG5pbXBvcnQgeyBwbGF0Zm9ybUluZm8gfSBmcm9tIFwiLi9kZW5vLnRzXCI7XG5pbnRlcmZhY2UgQ29tbWFuZEFyZyB7XG4gIHJlcXVpcmVkOiBib29sZWFuO1xuICB2YWx1ZTogc3RyaW5nO1xuICB2YXJpYWRpYzogYm9vbGVhbjtcbn1cbmludGVyZmFjZSBIZWxwU2VjdGlvbiB7XG4gIHRpdGxlPzogc3RyaW5nO1xuICBib2R5OiBzdHJpbmc7XG59XG5pbnRlcmZhY2UgQ29tbWFuZENvbmZpZyB7XG4gIGFsbG93VW5rbm93bk9wdGlvbnM/OiBib29sZWFuO1xuICBpZ25vcmVPcHRpb25EZWZhdWx0VmFsdWU/OiBib29sZWFuO1xufVxudHlwZSBIZWxwQ2FsbGJhY2sgPSAoc2VjdGlvbnM6IEhlbHBTZWN0aW9uW10pID0+IHZvaWQgfCBIZWxwU2VjdGlvbltdO1xudHlwZSBDb21tYW5kRXhhbXBsZSA9ICgoYmluOiBzdHJpbmcpID0+IHN0cmluZykgfCBzdHJpbmc7XG5cbmNsYXNzIENvbW1hbmQge1xuICBvcHRpb25zOiBPcHRpb25bXTtcbiAgYWxpYXNOYW1lczogc3RyaW5nW107XG4gIC8qIFBhcnNlZCBjb21tYW5kIG5hbWUgKi9cblxuICBuYW1lOiBzdHJpbmc7XG4gIGFyZ3M6IENvbW1hbmRBcmdbXTtcbiAgY29tbWFuZEFjdGlvbj86ICguLi5hcmdzOiBhbnlbXSkgPT4gYW55O1xuICB1c2FnZVRleHQ/OiBzdHJpbmc7XG4gIHZlcnNpb25OdW1iZXI/OiBzdHJpbmc7XG4gIGV4YW1wbGVzOiBDb21tYW5kRXhhbXBsZVtdO1xuICBoZWxwQ2FsbGJhY2s/OiBIZWxwQ2FsbGJhY2s7XG4gIGdsb2JhbENvbW1hbmQ/OiBHbG9iYWxDb21tYW5kO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByYXdOYW1lOiBzdHJpbmcsIHB1YmxpYyBkZXNjcmlwdGlvbjogc3RyaW5nLCBwdWJsaWMgY29uZmlnOiBDb21tYW5kQ29uZmlnID0ge30sIHB1YmxpYyBjbGk6IENBQykge1xuICAgIHRoaXMub3B0aW9ucyA9IFtdO1xuICAgIHRoaXMuYWxpYXNOYW1lcyA9IFtdO1xuICAgIHRoaXMubmFtZSA9IHJlbW92ZUJyYWNrZXRzKHJhd05hbWUpO1xuICAgIHRoaXMuYXJncyA9IGZpbmRBbGxCcmFja2V0cyhyYXdOYW1lKTtcbiAgICB0aGlzLmV4YW1wbGVzID0gW107XG4gIH1cblxuICB1c2FnZSh0ZXh0OiBzdHJpbmcpIHtcbiAgICB0aGlzLnVzYWdlVGV4dCA9IHRleHQ7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBhbGxvd1Vua25vd25PcHRpb25zKCkge1xuICAgIHRoaXMuY29uZmlnLmFsbG93VW5rbm93bk9wdGlvbnMgPSB0cnVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgaWdub3JlT3B0aW9uRGVmYXVsdFZhbHVlKCkge1xuICAgIHRoaXMuY29uZmlnLmlnbm9yZU9wdGlvbkRlZmF1bHRWYWx1ZSA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2ZXJzaW9uKHZlcnNpb246IHN0cmluZywgY3VzdG9tRmxhZ3MgPSAnLXYsIC0tdmVyc2lvbicpIHtcbiAgICB0aGlzLnZlcnNpb25OdW1iZXIgPSB2ZXJzaW9uO1xuICAgIHRoaXMub3B0aW9uKGN1c3RvbUZsYWdzLCAnRGlzcGxheSB2ZXJzaW9uIG51bWJlcicpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZXhhbXBsZShleGFtcGxlOiBDb21tYW5kRXhhbXBsZSkge1xuICAgIHRoaXMuZXhhbXBsZXMucHVzaChleGFtcGxlKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICAvKipcbiAgICogQWRkIGEgb3B0aW9uIGZvciB0aGlzIGNvbW1hbmRcbiAgICogQHBhcmFtIHJhd05hbWUgUmF3IG9wdGlvbiBuYW1lKHMpXG4gICAqIEBwYXJhbSBkZXNjcmlwdGlvbiBPcHRpb24gZGVzY3JpcHRpb25cbiAgICogQHBhcmFtIGNvbmZpZyBPcHRpb24gY29uZmlnXG4gICAqL1xuXG5cbiAgb3B0aW9uKHJhd05hbWU6IHN0cmluZywgZGVzY3JpcHRpb246IHN0cmluZywgY29uZmlnPzogT3B0aW9uQ29uZmlnKSB7XG4gICAgY29uc3Qgb3B0aW9uID0gbmV3IE9wdGlvbihyYXdOYW1lLCBkZXNjcmlwdGlvbiwgY29uZmlnKTtcbiAgICB0aGlzLm9wdGlvbnMucHVzaChvcHRpb24pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYWxpYXMobmFtZTogc3RyaW5nKSB7XG4gICAgdGhpcy5hbGlhc05hbWVzLnB1c2gobmFtZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBhY3Rpb24oY2FsbGJhY2s6ICguLi5hcmdzOiBhbnlbXSkgPT4gYW55KSB7XG4gICAgdGhpcy5jb21tYW5kQWN0aW9uID0gY2FsbGJhY2s7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgLyoqXG4gICAqIENoZWNrIGlmIGEgY29tbWFuZCBuYW1lIGlzIG1hdGNoZWQgYnkgdGhpcyBjb21tYW5kXG4gICAqIEBwYXJhbSBuYW1lIENvbW1hbmQgbmFtZVxuICAgKi9cblxuXG4gIGlzTWF0Y2hlZChuYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5uYW1lID09PSBuYW1lIHx8IHRoaXMuYWxpYXNOYW1lcy5pbmNsdWRlcyhuYW1lKTtcbiAgfVxuXG4gIGdldCBpc0RlZmF1bHRDb21tYW5kKCkge1xuICAgIHJldHVybiB0aGlzLm5hbWUgPT09ICcnIHx8IHRoaXMuYWxpYXNOYW1lcy5pbmNsdWRlcygnIScpO1xuICB9XG5cbiAgZ2V0IGlzR2xvYmFsQ29tbWFuZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIEdsb2JhbENvbW1hbmQ7XG4gIH1cbiAgLyoqXG4gICAqIENoZWNrIGlmIGFuIG9wdGlvbiBpcyByZWdpc3RlcmVkIGluIHRoaXMgY29tbWFuZFxuICAgKiBAcGFyYW0gbmFtZSBPcHRpb24gbmFtZVxuICAgKi9cblxuXG4gIGhhc09wdGlvbihuYW1lOiBzdHJpbmcpIHtcbiAgICBuYW1lID0gbmFtZS5zcGxpdCgnLicpWzBdO1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuZmluZChvcHRpb24gPT4ge1xuICAgICAgcmV0dXJuIG9wdGlvbi5uYW1lcy5pbmNsdWRlcyhuYW1lKTtcbiAgICB9KTtcbiAgfVxuXG4gIG91dHB1dEhlbHAoKSB7XG4gICAgY29uc3Qge1xuICAgICAgbmFtZSxcbiAgICAgIGNvbW1hbmRzXG4gICAgfSA9IHRoaXMuY2xpO1xuICAgIGNvbnN0IHtcbiAgICAgIHZlcnNpb25OdW1iZXIsXG4gICAgICBvcHRpb25zOiBnbG9iYWxPcHRpb25zLFxuICAgICAgaGVscENhbGxiYWNrXG4gICAgfSA9IHRoaXMuY2xpLmdsb2JhbENvbW1hbmQ7XG4gICAgbGV0IHNlY3Rpb25zOiBIZWxwU2VjdGlvbltdID0gW3tcbiAgICAgIGJvZHk6IGAke25hbWV9JHt2ZXJzaW9uTnVtYmVyID8gYC8ke3ZlcnNpb25OdW1iZXJ9YCA6ICcnfWBcbiAgICB9XTtcbiAgICBzZWN0aW9ucy5wdXNoKHtcbiAgICAgIHRpdGxlOiAnVXNhZ2UnLFxuICAgICAgYm9keTogYCAgJCAke25hbWV9ICR7dGhpcy51c2FnZVRleHQgfHwgdGhpcy5yYXdOYW1lfWBcbiAgICB9KTtcbiAgICBjb25zdCBzaG93Q29tbWFuZHMgPSAodGhpcy5pc0dsb2JhbENvbW1hbmQgfHwgdGhpcy5pc0RlZmF1bHRDb21tYW5kKSAmJiBjb21tYW5kcy5sZW5ndGggPiAwO1xuXG4gICAgaWYgKHNob3dDb21tYW5kcykge1xuICAgICAgY29uc3QgbG9uZ2VzdENvbW1hbmROYW1lID0gZmluZExvbmdlc3QoY29tbWFuZHMubWFwKGNvbW1hbmQgPT4gY29tbWFuZC5yYXdOYW1lKSk7XG4gICAgICBzZWN0aW9ucy5wdXNoKHtcbiAgICAgICAgdGl0bGU6ICdDb21tYW5kcycsXG4gICAgICAgIGJvZHk6IGNvbW1hbmRzLm1hcChjb21tYW5kID0+IHtcbiAgICAgICAgICByZXR1cm4gYCAgJHtwYWRSaWdodChjb21tYW5kLnJhd05hbWUsIGxvbmdlc3RDb21tYW5kTmFtZS5sZW5ndGgpfSAgJHtjb21tYW5kLmRlc2NyaXB0aW9ufWA7XG4gICAgICAgIH0pLmpvaW4oJ1xcbicpXG4gICAgICB9KTtcbiAgICAgIHNlY3Rpb25zLnB1c2goe1xuICAgICAgICB0aXRsZTogYEZvciBtb3JlIGluZm8sIHJ1biBhbnkgY29tbWFuZCB3aXRoIHRoZSBcXGAtLWhlbHBcXGAgZmxhZ2AsXG4gICAgICAgIGJvZHk6IGNvbW1hbmRzLm1hcChjb21tYW5kID0+IGAgICQgJHtuYW1lfSR7Y29tbWFuZC5uYW1lID09PSAnJyA/ICcnIDogYCAke2NvbW1hbmQubmFtZX1gfSAtLWhlbHBgKS5qb2luKCdcXG4nKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgbGV0IG9wdGlvbnMgPSB0aGlzLmlzR2xvYmFsQ29tbWFuZCA/IGdsb2JhbE9wdGlvbnMgOiBbLi4udGhpcy5vcHRpb25zLCAuLi4oZ2xvYmFsT3B0aW9ucyB8fCBbXSldO1xuXG4gICAgaWYgKCF0aGlzLmlzR2xvYmFsQ29tbWFuZCAmJiAhdGhpcy5pc0RlZmF1bHRDb21tYW5kKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucy5maWx0ZXIob3B0aW9uID0+IG9wdGlvbi5uYW1lICE9PSAndmVyc2lvbicpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGxvbmdlc3RPcHRpb25OYW1lID0gZmluZExvbmdlc3Qob3B0aW9ucy5tYXAob3B0aW9uID0+IG9wdGlvbi5yYXdOYW1lKSk7XG4gICAgICBzZWN0aW9ucy5wdXNoKHtcbiAgICAgICAgdGl0bGU6ICdPcHRpb25zJyxcbiAgICAgICAgYm9keTogb3B0aW9ucy5tYXAob3B0aW9uID0+IHtcbiAgICAgICAgICByZXR1cm4gYCAgJHtwYWRSaWdodChvcHRpb24ucmF3TmFtZSwgbG9uZ2VzdE9wdGlvbk5hbWUubGVuZ3RoKX0gICR7b3B0aW9uLmRlc2NyaXB0aW9ufSAke29wdGlvbi5jb25maWcuZGVmYXVsdCA9PT0gdW5kZWZpbmVkID8gJycgOiBgKGRlZmF1bHQ6ICR7b3B0aW9uLmNvbmZpZy5kZWZhdWx0fSlgfWA7XG4gICAgICAgIH0pLmpvaW4oJ1xcbicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICBzZWN0aW9ucy5wdXNoKHtcbiAgICAgICAgdGl0bGU6ICdFeGFtcGxlcycsXG4gICAgICAgIGJvZHk6IHRoaXMuZXhhbXBsZXMubWFwKGV4YW1wbGUgPT4ge1xuICAgICAgICAgIGlmICh0eXBlb2YgZXhhbXBsZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIGV4YW1wbGUobmFtZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIGV4YW1wbGU7XG4gICAgICAgIH0pLmpvaW4oJ1xcbicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoaGVscENhbGxiYWNrKSB7XG4gICAgICBzZWN0aW9ucyA9IGhlbHBDYWxsYmFjayhzZWN0aW9ucykgfHwgc2VjdGlvbnM7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coc2VjdGlvbnMubWFwKHNlY3Rpb24gPT4ge1xuICAgICAgcmV0dXJuIHNlY3Rpb24udGl0bGUgPyBgJHtzZWN0aW9uLnRpdGxlfTpcXG4ke3NlY3Rpb24uYm9keX1gIDogc2VjdGlvbi5ib2R5O1xuICAgIH0pLmpvaW4oJ1xcblxcbicpKTtcbiAgfVxuXG4gIG91dHB1dFZlcnNpb24oKSB7XG4gICAgY29uc3Qge1xuICAgICAgbmFtZVxuICAgIH0gPSB0aGlzLmNsaTtcbiAgICBjb25zdCB7XG4gICAgICB2ZXJzaW9uTnVtYmVyXG4gICAgfSA9IHRoaXMuY2xpLmdsb2JhbENvbW1hbmQ7XG5cbiAgICBpZiAodmVyc2lvbk51bWJlcikge1xuICAgICAgY29uc29sZS5sb2coYCR7bmFtZX0vJHt2ZXJzaW9uTnVtYmVyfSAke3BsYXRmb3JtSW5mb31gKTtcbiAgICB9XG4gIH1cblxuICBjaGVja1JlcXVpcmVkQXJncygpIHtcbiAgICBjb25zdCBtaW5pbWFsQXJnc0NvdW50ID0gdGhpcy5hcmdzLmZpbHRlcihhcmcgPT4gYXJnLnJlcXVpcmVkKS5sZW5ndGg7XG5cbiAgICBpZiAodGhpcy5jbGkuYXJncy5sZW5ndGggPCBtaW5pbWFsQXJnc0NvdW50KSB7XG4gICAgICB0aHJvdyBuZXcgQ0FDRXJyb3IoYG1pc3NpbmcgcmVxdWlyZWQgYXJncyBmb3IgY29tbWFuZCBcXGAke3RoaXMucmF3TmFtZX1cXGBgKTtcbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRoZSBwYXJzZWQgb3B0aW9ucyBjb250YWluIGFueSB1bmtub3duIG9wdGlvbnNcbiAgICpcbiAgICogRXhpdCBhbmQgb3V0cHV0IGVycm9yIHdoZW4gdHJ1ZVxuICAgKi9cblxuXG4gIGNoZWNrVW5rbm93bk9wdGlvbnMoKSB7XG4gICAgY29uc3Qge1xuICAgICAgb3B0aW9ucyxcbiAgICAgIGdsb2JhbENvbW1hbmRcbiAgICB9ID0gdGhpcy5jbGk7XG5cbiAgICBpZiAoIXRoaXMuY29uZmlnLmFsbG93VW5rbm93bk9wdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhvcHRpb25zKSkge1xuICAgICAgICBpZiAobmFtZSAhPT0gJy0tJyAmJiAhdGhpcy5oYXNPcHRpb24obmFtZSkgJiYgIWdsb2JhbENvbW1hbmQuaGFzT3B0aW9uKG5hbWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IENBQ0Vycm9yKGBVbmtub3duIG9wdGlvbiBcXGAke25hbWUubGVuZ3RoID4gMSA/IGAtLSR7bmFtZX1gIDogYC0ke25hbWV9YH1cXGBgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICAvKipcbiAgICogQ2hlY2sgaWYgdGhlIHJlcXVpcmVkIHN0cmluZy10eXBlIG9wdGlvbnMgZXhpc3RcbiAgICovXG5cblxuICBjaGVja09wdGlvblZhbHVlKCkge1xuICAgIGNvbnN0IHtcbiAgICAgIG9wdGlvbnM6IHBhcnNlZE9wdGlvbnMsXG4gICAgICBnbG9iYWxDb21tYW5kXG4gICAgfSA9IHRoaXMuY2xpO1xuICAgIGNvbnN0IG9wdGlvbnMgPSBbLi4uZ2xvYmFsQ29tbWFuZC5vcHRpb25zLCAuLi50aGlzLm9wdGlvbnNdO1xuXG4gICAgZm9yIChjb25zdCBvcHRpb24gb2Ygb3B0aW9ucykge1xuICAgICAgY29uc3QgdmFsdWUgPSBwYXJzZWRPcHRpb25zW29wdGlvbi5uYW1lLnNwbGl0KCcuJylbMF1dOyAvLyBDaGVjayByZXF1aXJlZCBvcHRpb24gdmFsdWVcblxuICAgICAgaWYgKG9wdGlvbi5yZXF1aXJlZCkge1xuICAgICAgICBjb25zdCBoYXNOZWdhdGVkID0gb3B0aW9ucy5zb21lKG8gPT4gby5uZWdhdGVkICYmIG8ubmFtZXMuaW5jbHVkZXMob3B0aW9uLm5hbWUpKTtcblxuICAgICAgICBpZiAodmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09IGZhbHNlICYmICFoYXNOZWdhdGVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IENBQ0Vycm9yKGBvcHRpb24gXFxgJHtvcHRpb24ucmF3TmFtZX1cXGAgdmFsdWUgaXMgbWlzc2luZ2ApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbn1cblxuY2xhc3MgR2xvYmFsQ29tbWFuZCBleHRlbmRzIENvbW1hbmQge1xuICBjb25zdHJ1Y3RvcihjbGk6IENBQykge1xuICAgIHN1cGVyKCdAQGdsb2JhbEBAJywgJycsIHt9LCBjbGkpO1xuICB9XG5cbn1cblxuZXhwb3J0IHR5cGUgeyBIZWxwQ2FsbGJhY2ssIENvbW1hbmRFeGFtcGxlLCBDb21tYW5kQ29uZmlnIH07XG5leHBvcnQgeyBHbG9iYWxDb21tYW5kIH07XG5leHBvcnQgZGVmYXVsdCBDb21tYW5kOyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLFlBQThCLGNBQWM7QUFDbkQsU0FBUyxjQUFjLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsUUFBUSxRQUFRLGFBQWE7QUFDOUYsU0FBUyxZQUFZLFFBQVEsWUFBWTtBQWlCekMsTUFBTTtJQUNKLFFBQWtCO0lBQ2xCLFdBQXFCO0lBQ3JCLHVCQUF1QixHQUV2QixLQUFhO0lBQ2IsS0FBbUI7SUFDbkIsY0FBd0M7SUFDeEMsVUFBbUI7SUFDbkIsY0FBdUI7SUFDdkIsU0FBMkI7SUFDM0IsYUFBNEI7SUFDNUIsY0FBOEI7SUFFOUIsWUFBbUIsU0FBd0IsYUFBNEIsU0FBd0IsQ0FBQyxDQUFDLEVBQVMsSUFBVTt1QkFBakc7MkJBQXdCO3NCQUE0QjttQkFBbUM7UUFDeEcsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFO1FBQ2pCLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLGVBQWU7UUFDM0IsSUFBSSxDQUFDLElBQUksR0FBRyxnQkFBZ0I7UUFDNUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFO0lBQ3BCO0lBRUEsTUFBTSxJQUFZLEVBQUU7UUFDbEIsSUFBSSxDQUFDLFNBQVMsR0FBRztRQUNqQixPQUFPLElBQUk7SUFDYjtJQUVBLHNCQUFzQjtRQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixHQUFHLElBQUk7UUFDdEMsT0FBTyxJQUFJO0lBQ2I7SUFFQSwyQkFBMkI7UUFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsR0FBRyxJQUFJO1FBQzND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