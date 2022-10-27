import { EventEmitter } from "https://deno.land/std@0.114.0/node/events.ts";
import mri from "https://cdn.skypack.dev/mri";
import Command, { GlobalCommand } from "./Command.ts";
import { getMriOptions, setDotProp, setByType, getFileName, camelcaseOptionName } from "./utils.ts";
import { processArgs } from "./deno.ts";
class CAC extends EventEmitter {
    /** The program name to display in help and version message */ name;
    commands;
    globalCommand;
    matchedCommand;
    matchedCommandName;
    /**
   * Raw CLI arguments
   */ rawArgs;
    /**
   * Parsed CLI arguments
   */ args;
    /**
   * Parsed CLI options, camelCased
   */ options;
    showHelpOnExit;
    showVersionOnExit;
    /**
   * @param name The program name to display in help and version message
   */ constructor(name = ''){
        super();
        this.name = name;
        this.commands = [];
        this.rawArgs = [];
        this.args = [];
        this.options = {};
        this.globalCommand = new GlobalCommand(this);
        this.globalCommand.usage('<command> [options]');
    }
    /**
   * Add a global usage text.
   *
   * This is not used by sub-commands.
   */ usage(text) {
        this.globalCommand.usage(text);
        return this;
    }
    /**
   * Add a sub-command
   */ command(rawName, description, config) {
        const command = new Command(rawName, description || '', config, this);
        command.globalCommand = this.globalCommand;
        this.commands.push(command);
        return command;
    }
    /**
   * Add a global CLI option.
   *
   * Which is also applied to sub-commands.
   */ option(rawName, description, config) {
        this.globalCommand.option(rawName, description, config);
        return this;
    }
    /**
   * Show help message when `-h, --help` flags appear.
   *
   */ help(callback) {
        this.globalCommand.option('-h, --help', 'Display this message');
        this.globalCommand.helpCallback = callback;
        this.showHelpOnExit = true;
        return this;
    }
    /**
   * Show version number when `-v, --version` flags appear.
   *
   */ version(version, customFlags = '-v, --version') {
        this.globalCommand.version(version, customFlags);
        this.showVersionOnExit = true;
        return this;
    }
    /**
   * Add a global example.
   *
   * This example added here will not be used by sub-commands.
   */ example(example) {
        this.globalCommand.example(example);
        return this;
    }
    /**
   * Output the corresponding help message
   * When a sub-command is matched, output the help message for the command
   * Otherwise output the global one.
   *
   */ outputHelp() {
        if (this.matchedCommand) {
            this.matchedCommand.outputHelp();
        } else {
            this.globalCommand.outputHelp();
        }
    }
    /**
   * Output the version number.
   *
   */ outputVersion() {
        this.globalCommand.outputVersion();
    }
    setParsedInfo({ args , options  }, matchedCommand, matchedCommandName) {
        this.args = args;
        this.options = options;
        if (matchedCommand) {
            this.matchedCommand = matchedCommand;
        }
        if (matchedCommandName) {
            this.matchedCommandName = matchedCommandName;
        }
        return this;
    }
    unsetMatchedCommand() {
        this.matchedCommand = undefined;
        this.matchedCommandName = undefined;
    }
    /**
   * Parse argv
   */ parse(argv = processArgs, { /** Whether to run the action for matched command */ run =true  } = {}) {
        this.rawArgs = argv;
        if (!this.name) {
            this.name = argv[1] ? getFileName(argv[1]) : 'cli';
        }
        let shouldParse = true; // Search sub-commands
        for (const command of this.commands){
            const parsed = this.mri(argv.slice(2), command);
            const commandName = parsed.args[0];
            if (command.isMatched(commandName)) {
                shouldParse = false;
                const parsedInfo = {
                    ...parsed,
                    args: parsed.args.slice(1)
                };
                this.setParsedInfo(parsedInfo, command, commandName);
                this.emit(`command:${commandName}`, command);
            }
        }
        if (shouldParse) {
            // Search the default command
            for (const command1 of this.commands){
                if (command1.name === '') {
                    shouldParse = false;
                    const parsed1 = this.mri(argv.slice(2), command1);
                    this.setParsedInfo(parsed1, command1);
                    this.emit(`command:!`, command1);
                }
            }
        }
        if (shouldParse) {
            const parsed2 = this.mri(argv.slice(2));
            this.setParsedInfo(parsed2);
        }
        if (this.options.help && this.showHelpOnExit) {
            this.outputHelp();
            run = false;
            this.unsetMatchedCommand();
        }
        if (this.options.version && this.showVersionOnExit && this.matchedCommandName == null) {
            this.outputVersion();
            run = false;
            this.unsetMatchedCommand();
        }
        const parsedArgv = {
            args: this.args,
            options: this.options
        };
        if (run) {
            this.runMatchedCommand();
        }
        if (!this.matchedCommand && this.args[0]) {
            this.emit('command:*');
        }
        return parsedArgv;
    }
    mri(argv, /** Matched command */ command) {
        // All added options
        const cliOptions = [
            ...this.globalCommand.options,
            ...command ? command.options : []
        ];
        const mriOptions = getMriOptions(cliOptions); // Extract everything after `--` since mri doesn't support it
        let argsAfterDoubleDashes = [];
        const doubleDashesIndex = argv.indexOf('--');
        if (doubleDashesIndex > -1) {
            argsAfterDoubleDashes = argv.slice(doubleDashesIndex + 1);
            argv = argv.slice(0, doubleDashesIndex);
        }
        let parsed = mri(argv, mriOptions);
        parsed = Object.keys(parsed).reduce((res, name)=>{
            return {
                ...res,
                [camelcaseOptionName(name)]: parsed[name]
            };
        }, {
            _: []
        });
        const args = parsed._;
        const options = {
            '--': argsAfterDoubleDashes
        }; // Set option default value
        const ignoreDefault = command && command.config.ignoreOptionDefaultValue ? command.config.ignoreOptionDefaultValue : this.globalCommand.config.ignoreOptionDefaultValue;
        let transforms = Object.create(null);
        for (const cliOption of cliOptions){
            if (!ignoreDefault && cliOption.config.default !== undefined) {
                for (const name of cliOption.names){
                    options[name] = cliOption.config.default;
                }
            } // If options type is defined
            if (Array.isArray(cliOption.config.type)) {
                if (transforms[cliOption.name] === undefined) {
                    transforms[cliOption.name] = Object.create(null);
                    transforms[cliOption.name]['shouldTransform'] = true;
                    transforms[cliOption.name]['transformFunction'] = cliOption.config.type[0];
                }
            }
        } // Set option values (support dot-nested property name)
        for (const key of Object.keys(parsed)){
            if (key !== '_') {
                const keys = key.split('.');
                setDotProp(options, keys, parsed[key]);
                setByType(options, transforms);
            }
        }
        return {
            args,
            options
        };
    }
    runMatchedCommand() {
        const { args , options , matchedCommand: command  } = this;
        if (!command || !command.commandAction) return;
        command.checkUnknownOptions();
        command.checkOptionValue();
        command.checkRequiredArgs();
        const actionArgs = [];
        command.args.forEach((arg, index)=>{
            if (arg.variadic) {
                actionArgs.push(args.slice(index));
            } else {
                actionArgs.push(args[index]);
            }
        });
        actionArgs.push(options);
        return command.commandAction.apply(this, actionArgs);
    }
}
export default CAC;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vdW5wa2cuY29tL2NhY0A2LjcuMTIvZGVuby9DQUMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL25vZGUvZXZlbnRzLnRzXCI7XG5pbXBvcnQgbXJpIGZyb20gXCJodHRwczovL2Nkbi5za3lwYWNrLmRldi9tcmlcIjtcbmltcG9ydCBDb21tYW5kLCB7IEdsb2JhbENvbW1hbmQsIENvbW1hbmRDb25maWcsIEhlbHBDYWxsYmFjaywgQ29tbWFuZEV4YW1wbGUgfSBmcm9tIFwiLi9Db21tYW5kLnRzXCI7XG5pbXBvcnQgeyBPcHRpb25Db25maWcgfSBmcm9tIFwiLi9PcHRpb24udHNcIjtcbmltcG9ydCB7IGdldE1yaU9wdGlvbnMsIHNldERvdFByb3AsIHNldEJ5VHlwZSwgZ2V0RmlsZU5hbWUsIGNhbWVsY2FzZU9wdGlvbk5hbWUgfSBmcm9tIFwiLi91dGlscy50c1wiO1xuaW1wb3J0IHsgcHJvY2Vzc0FyZ3MgfSBmcm9tIFwiLi9kZW5vLnRzXCI7XG5pbnRlcmZhY2UgUGFyc2VkQXJndiB7XG4gIGFyZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbiAgb3B0aW9uczoge1xuICAgIFtrOiBzdHJpbmddOiBhbnk7XG4gIH07XG59XG5cbmNsYXNzIENBQyBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIC8qKiBUaGUgcHJvZ3JhbSBuYW1lIHRvIGRpc3BsYXkgaW4gaGVscCBhbmQgdmVyc2lvbiBtZXNzYWdlICovXG4gIG5hbWU6IHN0cmluZztcbiAgY29tbWFuZHM6IENvbW1hbmRbXTtcbiAgZ2xvYmFsQ29tbWFuZDogR2xvYmFsQ29tbWFuZDtcbiAgbWF0Y2hlZENvbW1hbmQ/OiBDb21tYW5kO1xuICBtYXRjaGVkQ29tbWFuZE5hbWU/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBSYXcgQ0xJIGFyZ3VtZW50c1xuICAgKi9cblxuICByYXdBcmdzOiBzdHJpbmdbXTtcbiAgLyoqXG4gICAqIFBhcnNlZCBDTEkgYXJndW1lbnRzXG4gICAqL1xuXG4gIGFyZ3M6IFBhcnNlZEFyZ3ZbJ2FyZ3MnXTtcbiAgLyoqXG4gICAqIFBhcnNlZCBDTEkgb3B0aW9ucywgY2FtZWxDYXNlZFxuICAgKi9cblxuICBvcHRpb25zOiBQYXJzZWRBcmd2WydvcHRpb25zJ107XG4gIHNob3dIZWxwT25FeGl0PzogYm9vbGVhbjtcbiAgc2hvd1ZlcnNpb25PbkV4aXQ/OiBib29sZWFuO1xuICAvKipcbiAgICogQHBhcmFtIG5hbWUgVGhlIHByb2dyYW0gbmFtZSB0byBkaXNwbGF5IGluIGhlbHAgYW5kIHZlcnNpb24gbWVzc2FnZVxuICAgKi9cblxuICBjb25zdHJ1Y3RvcihuYW1lID0gJycpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5jb21tYW5kcyA9IFtdO1xuICAgIHRoaXMucmF3QXJncyA9IFtdO1xuICAgIHRoaXMuYXJncyA9IFtdO1xuICAgIHRoaXMub3B0aW9ucyA9IHt9O1xuICAgIHRoaXMuZ2xvYmFsQ29tbWFuZCA9IG5ldyBHbG9iYWxDb21tYW5kKHRoaXMpO1xuICAgIHRoaXMuZ2xvYmFsQ29tbWFuZC51c2FnZSgnPGNvbW1hbmQ+IFtvcHRpb25zXScpO1xuICB9XG4gIC8qKlxuICAgKiBBZGQgYSBnbG9iYWwgdXNhZ2UgdGV4dC5cbiAgICpcbiAgICogVGhpcyBpcyBub3QgdXNlZCBieSBzdWItY29tbWFuZHMuXG4gICAqL1xuXG5cbiAgdXNhZ2UodGV4dDogc3RyaW5nKSB7XG4gICAgdGhpcy5nbG9iYWxDb21tYW5kLnVzYWdlKHRleHQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIC8qKlxuICAgKiBBZGQgYSBzdWItY29tbWFuZFxuICAgKi9cblxuXG4gIGNvbW1hbmQocmF3TmFtZTogc3RyaW5nLCBkZXNjcmlwdGlvbj86IHN0cmluZywgY29uZmlnPzogQ29tbWFuZENvbmZpZykge1xuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgQ29tbWFuZChyYXdOYW1lLCBkZXNjcmlwdGlvbiB8fCAnJywgY29uZmlnLCB0aGlzKTtcbiAgICBjb21tYW5kLmdsb2JhbENvbW1hbmQgPSB0aGlzLmdsb2JhbENvbW1hbmQ7XG4gICAgdGhpcy5jb21tYW5kcy5wdXNoKGNvbW1hbmQpO1xuICAgIHJldHVybiBjb21tYW5kO1xuICB9XG4gIC8qKlxuICAgKiBBZGQgYSBnbG9iYWwgQ0xJIG9wdGlvbi5cbiAgICpcbiAgICogV2hpY2ggaXMgYWxzbyBhcHBsaWVkIHRvIHN1Yi1jb21tYW5kcy5cbiAgICovXG5cblxuICBvcHRpb24ocmF3TmFtZTogc3RyaW5nLCBkZXNjcmlwdGlvbjogc3RyaW5nLCBjb25maWc/OiBPcHRpb25Db25maWcpIHtcbiAgICB0aGlzLmdsb2JhbENvbW1hbmQub3B0aW9uKHJhd05hbWUsIGRlc2NyaXB0aW9uLCBjb25maWcpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIC8qKlxuICAgKiBTaG93IGhlbHAgbWVzc2FnZSB3aGVuIGAtaCwgLS1oZWxwYCBmbGFncyBhcHBlYXIuXG4gICAqXG4gICAqL1xuXG5cbiAgaGVscChjYWxsYmFjaz86IEhlbHBDYWxsYmFjaykge1xuICAgIHRoaXMuZ2xvYmFsQ29tbWFuZC5vcHRpb24oJy1oLCAtLWhlbHAnLCAnRGlzcGxheSB0aGlzIG1lc3NhZ2UnKTtcbiAgICB0aGlzLmdsb2JhbENvbW1hbmQuaGVscENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgdGhpcy5zaG93SGVscE9uRXhpdCA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgLyoqXG4gICAqIFNob3cgdmVyc2lvbiBudW1iZXIgd2hlbiBgLXYsIC0tdmVyc2lvbmAgZmxhZ3MgYXBwZWFyLlxuICAgKlxuICAgKi9cblxuXG4gIHZlcnNpb24odmVyc2lvbjogc3RyaW5nLCBjdXN0b21GbGFncyA9ICctdiwgLS12ZXJzaW9uJykge1xuICAgIHRoaXMuZ2xvYmFsQ29tbWFuZC52ZXJzaW9uKHZlcnNpb24sIGN1c3RvbUZsYWdzKTtcbiAgICB0aGlzLnNob3dWZXJzaW9uT25FeGl0ID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICAvKipcbiAgICogQWRkIGEgZ2xvYmFsIGV4YW1wbGUuXG4gICAqXG4gICAqIFRoaXMgZXhhbXBsZSBhZGRlZCBoZXJlIHdpbGwgbm90IGJlIHVzZWQgYnkgc3ViLWNvbW1hbmRzLlxuICAgKi9cblxuXG4gIGV4YW1wbGUoZXhhbXBsZTogQ29tbWFuZEV4YW1wbGUpIHtcbiAgICB0aGlzLmdsb2JhbENvbW1hbmQuZXhhbXBsZShleGFtcGxlKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICAvKipcbiAgICogT3V0cHV0IHRoZSBjb3JyZXNwb25kaW5nIGhlbHAgbWVzc2FnZVxuICAgKiBXaGVuIGEgc3ViLWNvbW1hbmQgaXMgbWF0Y2hlZCwgb3V0cHV0IHRoZSBoZWxwIG1lc3NhZ2UgZm9yIHRoZSBjb21tYW5kXG4gICAqIE90aGVyd2lzZSBvdXRwdXQgdGhlIGdsb2JhbCBvbmUuXG4gICAqXG4gICAqL1xuXG5cbiAgb3V0cHV0SGVscCgpIHtcbiAgICBpZiAodGhpcy5tYXRjaGVkQ29tbWFuZCkge1xuICAgICAgdGhpcy5tYXRjaGVkQ29tbWFuZC5vdXRwdXRIZWxwKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZ2xvYmFsQ29tbWFuZC5vdXRwdXRIZWxwKCk7XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBPdXRwdXQgdGhlIHZlcnNpb24gbnVtYmVyLlxuICAgKlxuICAgKi9cblxuXG4gIG91dHB1dFZlcnNpb24oKSB7XG4gICAgdGhpcy5nbG9iYWxDb21tYW5kLm91dHB1dFZlcnNpb24oKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0UGFyc2VkSW5mbyh7XG4gICAgYXJncyxcbiAgICBvcHRpb25zXG4gIH06IFBhcnNlZEFyZ3YsIG1hdGNoZWRDb21tYW5kPzogQ29tbWFuZCwgbWF0Y2hlZENvbW1hbmROYW1lPzogc3RyaW5nKSB7XG4gICAgdGhpcy5hcmdzID0gYXJncztcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgaWYgKG1hdGNoZWRDb21tYW5kKSB7XG4gICAgICB0aGlzLm1hdGNoZWRDb21tYW5kID0gbWF0Y2hlZENvbW1hbmQ7XG4gICAgfVxuXG4gICAgaWYgKG1hdGNoZWRDb21tYW5kTmFtZSkge1xuICAgICAgdGhpcy5tYXRjaGVkQ29tbWFuZE5hbWUgPSBtYXRjaGVkQ29tbWFuZE5hbWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB1bnNldE1hdGNoZWRDb21tYW5kKCkge1xuICAgIHRoaXMubWF0Y2hlZENvbW1hbmQgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5tYXRjaGVkQ29tbWFuZE5hbWUgPSB1bmRlZmluZWQ7XG4gIH1cbiAgLyoqXG4gICAqIFBhcnNlIGFyZ3ZcbiAgICovXG5cblxuICBwYXJzZShhcmd2ID0gcHJvY2Vzc0FyZ3MsIHtcbiAgICAvKiogV2hldGhlciB0byBydW4gdGhlIGFjdGlvbiBmb3IgbWF0Y2hlZCBjb21tYW5kICovXG4gICAgcnVuID0gdHJ1ZVxuICB9ID0ge30pOiBQYXJzZWRBcmd2IHtcbiAgICB0aGlzLnJhd0FyZ3MgPSBhcmd2O1xuXG4gICAgaWYgKCF0aGlzLm5hbWUpIHtcbiAgICAgIHRoaXMubmFtZSA9IGFyZ3ZbMV0gPyBnZXRGaWxlTmFtZShhcmd2WzFdKSA6ICdjbGknO1xuICAgIH1cblxuICAgIGxldCBzaG91bGRQYXJzZSA9IHRydWU7IC8vIFNlYXJjaCBzdWItY29tbWFuZHNcblxuICAgIGZvciAoY29uc3QgY29tbWFuZCBvZiB0aGlzLmNvbW1hbmRzKSB7XG4gICAgICBjb25zdCBwYXJzZWQgPSB0aGlzLm1yaShhcmd2LnNsaWNlKDIpLCBjb21tYW5kKTtcbiAgICAgIGNvbnN0IGNvbW1hbmROYW1lID0gcGFyc2VkLmFyZ3NbMF07XG5cbiAgICAgIGlmIChjb21tYW5kLmlzTWF0Y2hlZChjb21tYW5kTmFtZSkpIHtcbiAgICAgICAgc2hvdWxkUGFyc2UgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgcGFyc2VkSW5mbyA9IHsgLi4ucGFyc2VkLFxuICAgICAgICAgIGFyZ3M6IHBhcnNlZC5hcmdzLnNsaWNlKDEpXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2V0UGFyc2VkSW5mbyhwYXJzZWRJbmZvLCBjb21tYW5kLCBjb21tYW5kTmFtZSk7XG4gICAgICAgIHRoaXMuZW1pdChgY29tbWFuZDoke2NvbW1hbmROYW1lfWAsIGNvbW1hbmQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzaG91bGRQYXJzZSkge1xuICAgICAgLy8gU2VhcmNoIHRoZSBkZWZhdWx0IGNvbW1hbmRcbiAgICAgIGZvciAoY29uc3QgY29tbWFuZCBvZiB0aGlzLmNvbW1hbmRzKSB7XG4gICAgICAgIGlmIChjb21tYW5kLm5hbWUgPT09ICcnKSB7XG4gICAgICAgICAgc2hvdWxkUGFyc2UgPSBmYWxzZTtcbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSB0aGlzLm1yaShhcmd2LnNsaWNlKDIpLCBjb21tYW5kKTtcbiAgICAgICAgICB0aGlzLnNldFBhcnNlZEluZm8ocGFyc2VkLCBjb21tYW5kKTtcbiAgICAgICAgICB0aGlzLmVtaXQoYGNvbW1hbmQ6IWAsIGNvbW1hbmQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNob3VsZFBhcnNlKSB7XG4gICAgICBjb25zdCBwYXJzZWQgPSB0aGlzLm1yaShhcmd2LnNsaWNlKDIpKTtcbiAgICAgIHRoaXMuc2V0UGFyc2VkSW5mbyhwYXJzZWQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuaGVscCAmJiB0aGlzLnNob3dIZWxwT25FeGl0KSB7XG4gICAgICB0aGlzLm91dHB1dEhlbHAoKTtcbiAgICAgIHJ1biA9IGZhbHNlO1xuICAgICAgdGhpcy51bnNldE1hdGNoZWRDb21tYW5kKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy52ZXJzaW9uICYmIHRoaXMuc2hvd1ZlcnNpb25PbkV4aXQgJiYgdGhpcy5tYXRjaGVkQ29tbWFuZE5hbWUgPT0gbnVsbCkge1xuICAgICAgdGhpcy5vdXRwdXRWZXJzaW9uKCk7XG4gICAgICBydW4gPSBmYWxzZTtcbiAgICAgIHRoaXMudW5zZXRNYXRjaGVkQ29tbWFuZCgpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcnNlZEFyZ3YgPSB7XG4gICAgICBhcmdzOiB0aGlzLmFyZ3MsXG4gICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnNcbiAgICB9O1xuXG4gICAgaWYgKHJ1bikge1xuICAgICAgdGhpcy5ydW5NYXRjaGVkQ29tbWFuZCgpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5tYXRjaGVkQ29tbWFuZCAmJiB0aGlzLmFyZ3NbMF0pIHtcbiAgICAgIHRoaXMuZW1pdCgnY29tbWFuZDoqJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlZEFyZ3Y7XG4gIH1cblxuICBwcml2YXRlIG1yaShhcmd2OiBzdHJpbmdbXSxcbiAgLyoqIE1hdGNoZWQgY29tbWFuZCAqL1xuICBjb21tYW5kPzogQ29tbWFuZCk6IFBhcnNlZEFyZ3Yge1xuICAgIC8vIEFsbCBhZGRlZCBvcHRpb25zXG4gICAgY29uc3QgY2xpT3B0aW9ucyA9IFsuLi50aGlzLmdsb2JhbENvbW1hbmQub3B0aW9ucywgLi4uKGNvbW1hbmQgPyBjb21tYW5kLm9wdGlvbnMgOiBbXSldO1xuICAgIGNvbnN0IG1yaU9wdGlvbnMgPSBnZXRNcmlPcHRpb25zKGNsaU9wdGlvbnMpOyAvLyBFeHRyYWN0IGV2ZXJ5dGhpbmcgYWZ0ZXIgYC0tYCBzaW5jZSBtcmkgZG9lc24ndCBzdXBwb3J0IGl0XG5cbiAgICBsZXQgYXJnc0FmdGVyRG91YmxlRGFzaGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IGRvdWJsZURhc2hlc0luZGV4ID0gYXJndi5pbmRleE9mKCctLScpO1xuXG4gICAgaWYgKGRvdWJsZURhc2hlc0luZGV4ID4gLTEpIHtcbiAgICAgIGFyZ3NBZnRlckRvdWJsZURhc2hlcyA9IGFyZ3Yuc2xpY2UoZG91YmxlRGFzaGVzSW5kZXggKyAxKTtcbiAgICAgIGFyZ3YgPSBhcmd2LnNsaWNlKDAsIGRvdWJsZURhc2hlc0luZGV4KTtcbiAgICB9XG5cbiAgICBsZXQgcGFyc2VkID0gbXJpKGFyZ3YsIG1yaU9wdGlvbnMpO1xuICAgIHBhcnNlZCA9IE9iamVjdC5rZXlzKHBhcnNlZCkucmVkdWNlKChyZXMsIG5hbWUpID0+IHtcbiAgICAgIHJldHVybiB7IC4uLnJlcyxcbiAgICAgICAgW2NhbWVsY2FzZU9wdGlvbk5hbWUobmFtZSldOiBwYXJzZWRbbmFtZV1cbiAgICAgIH07XG4gICAgfSwge1xuICAgICAgXzogW11cbiAgICB9KTtcbiAgICBjb25zdCBhcmdzID0gcGFyc2VkLl87XG4gICAgY29uc3Qgb3B0aW9uczoge1xuICAgICAgW2s6IHN0cmluZ106IGFueTtcbiAgICB9ID0ge1xuICAgICAgJy0tJzogYXJnc0FmdGVyRG91YmxlRGFzaGVzXG4gICAgfTsgLy8gU2V0IG9wdGlvbiBkZWZhdWx0IHZhbHVlXG5cbiAgICBjb25zdCBpZ25vcmVEZWZhdWx0ID0gY29tbWFuZCAmJiBjb21tYW5kLmNvbmZpZy5pZ25vcmVPcHRpb25EZWZhdWx0VmFsdWUgPyBjb21tYW5kLmNvbmZpZy5pZ25vcmVPcHRpb25EZWZhdWx0VmFsdWUgOiB0aGlzLmdsb2JhbENvbW1hbmQuY29uZmlnLmlnbm9yZU9wdGlvbkRlZmF1bHRWYWx1ZTtcbiAgICBsZXQgdHJhbnNmb3JtcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IGNsaU9wdGlvbiBvZiBjbGlPcHRpb25zKSB7XG4gICAgICBpZiAoIWlnbm9yZURlZmF1bHQgJiYgY2xpT3B0aW9uLmNvbmZpZy5kZWZhdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGNsaU9wdGlvbi5uYW1lcykge1xuICAgICAgICAgIG9wdGlvbnNbbmFtZV0gPSBjbGlPcHRpb24uY29uZmlnLmRlZmF1bHQ7XG4gICAgICAgIH1cbiAgICAgIH0gLy8gSWYgb3B0aW9ucyB0eXBlIGlzIGRlZmluZWRcblxuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShjbGlPcHRpb24uY29uZmlnLnR5cGUpKSB7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1zW2NsaU9wdGlvbi5uYW1lXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdHJhbnNmb3Jtc1tjbGlPcHRpb24ubmFtZV0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICAgIHRyYW5zZm9ybXNbY2xpT3B0aW9uLm5hbWVdWydzaG91bGRUcmFuc2Zvcm0nXSA9IHRydWU7XG4gICAgICAgICAgdHJhbnNmb3Jtc1tjbGlPcHRpb24ubmFtZV1bJ3RyYW5zZm9ybUZ1bmN0aW9uJ10gPSBjbGlPcHRpb24uY29uZmlnLnR5cGVbMF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IC8vIFNldCBvcHRpb24gdmFsdWVzIChzdXBwb3J0IGRvdC1uZXN0ZWQgcHJvcGVydHkgbmFtZSlcblxuXG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMocGFyc2VkKSkge1xuICAgICAgaWYgKGtleSAhPT0gJ18nKSB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBrZXkuc3BsaXQoJy4nKTtcbiAgICAgICAgc2V0RG90UHJvcChvcHRpb25zLCBrZXlzLCBwYXJzZWRba2V5XSk7XG4gICAgICAgIHNldEJ5VHlwZShvcHRpb25zLCB0cmFuc2Zvcm1zKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgYXJncyxcbiAgICAgIG9wdGlvbnNcbiAgICB9O1xuICB9XG5cbiAgcnVuTWF0Y2hlZENvbW1hbmQoKSB7XG4gICAgY29uc3Qge1xuICAgICAgYXJncyxcbiAgICAgIG9wdGlvbnMsXG4gICAgICBtYXRjaGVkQ29tbWFuZDogY29tbWFuZFxuICAgIH0gPSB0aGlzO1xuICAgIGlmICghY29tbWFuZCB8fCAhY29tbWFuZC5jb21tYW5kQWN0aW9uKSByZXR1cm47XG4gICAgY29tbWFuZC5jaGVja1Vua25vd25PcHRpb25zKCk7XG4gICAgY29tbWFuZC5jaGVja09wdGlvblZhbHVlKCk7XG4gICAgY29tbWFuZC5jaGVja1JlcXVpcmVkQXJncygpO1xuICAgIGNvbnN0IGFjdGlvbkFyZ3M6IGFueVtdID0gW107XG4gICAgY29tbWFuZC5hcmdzLmZvckVhY2goKGFyZywgaW5kZXgpID0+IHtcbiAgICAgIGlmIChhcmcudmFyaWFkaWMpIHtcbiAgICAgICAgYWN0aW9uQXJncy5wdXNoKGFyZ3Muc2xpY2UoaW5kZXgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFjdGlvbkFyZ3MucHVzaChhcmdzW2luZGV4XSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgYWN0aW9uQXJncy5wdXNoKG9wdGlvbnMpO1xuICAgIHJldHVybiBjb21tYW5kLmNvbW1hbmRBY3Rpb24uYXBwbHkodGhpcywgYWN0aW9uQXJncyk7XG4gIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBDQUM7Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsWUFBWSxRQUFRLCtDQUErQztBQUM1RSxPQUFPLFNBQVMsOEJBQThCO0FBQzlDLE9BQU8sV0FBVyxhQUFhLFFBQXFELGVBQWU7QUFFbkcsU0FBUyxhQUFhLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsbUJBQW1CLFFBQVEsYUFBYTtBQUNwRyxTQUFTLFdBQVcsUUFBUSxZQUFZO0FBUXhDLE1BQU0sWUFBWTtJQUNoQiw0REFBNEQsR0FDNUQsS0FBYTtJQUNiLFNBQW9CO0lBQ3BCLGNBQTZCO0lBQzdCLGVBQXlCO0lBQ3pCLG1CQUE0QjtJQUM1Qjs7R0FFQyxHQUVELFFBQWtCO0lBQ2xCOztHQUVDLEdBRUQsS0FBeUI7SUFDekI7O0dBRUMsR0FFRCxRQUErQjtJQUMvQixlQUF5QjtJQUN6QixrQkFBNEI7SUFDNUI7O0dBRUMsR0FFRCxZQUFZLE9BQU8sRUFBRSxDQUFFO1FBQ3JCLEtBQUs7UUFDTCxJ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