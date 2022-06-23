import * as tools from './tools.ts';
export { tools };
export function makeHackle(options = {}) {
    const stringify = options.stringify || tools.defaultStringify;
    const rejectDefaultScopes = options.rejectDefaultScopes || false;
    const rawScopes = options.additionalScopes || [];
    let logLevel = options.defaultLogLevel || 'debug';
    let loggers = options.loggers || [
        tools.consoleLogger
    ];
    // Mount the default scopes if allowed
    if (!rejectDefaultScopes) rawScopes.unshift(...tools.defaultScopes);
    // Create out storage maps for easy access later
    const scopes = new Map();
    const logStorage = new Map();
    // Populate the scopes map
    rawScopes.forEach((scope)=>scopes.set(scope.name, scope));
    function log(scopeName, message) {
        if (!logLevel) return;
        const scope = scopes.get(scopeName);
        if (scope === undefined) throw new Error(`No scope has been set for '${scopeName}'`);
        const levelMap = {
            error: 5,
            warn: 4,
            notice: 3,
            info: 2,
            debug: 1
        };
        if (levelMap[scope.level] < levelMap[logLevel]) return;
        let prettyMessage = ``;
        const defaultProcedure = ()=>{
            if (scope.prepend) message = [
                scope.prepend,
                ...message
            ];
            if (scope.append) message = [
                ...message,
                scope.append
            ];
            prettyMessage = stringify(message);
        };
        if (scope.messageMap) {
            const res = scope.messageMap(message);
            if (typeof res === 'string') prettyMessage = res;
            else {
                message = res;
                defaultProcedure();
            }
        } else defaultProcedure();
        if (scope.storeLogs) {
            const previousLogs = logStorage.get(scope.name);
            logStorage.set(scope.name, previousLogs ? [
                ...previousLogs,
                prettyMessage
            ] : [
                prettyMessage
            ]);
        }
        loggers.forEach((logger)=>logger(prettyMessage, scope.level));
    }
    /** Logs a message to the 'error' level and exits */ function critical(...message) {
        error(...message);
        if (Deno) return Deno.exit();
        else throw new Error(`A critical error was encountered`);
    }
    /** Logs message to the 'error' level */ function error(...message) {
        scope('default-error')(...message);
    }
    /** Logs message to the 'warn' level */ function warn(...message) {
        scope('default-warn')(...message);
    }
    /** Logs message to the 'notice' level */ function notice(...message) {
        scope('default-notice')(...message);
    }
    /** Logs message to the 'info' level */ function info(...message) {
        scope('default-info')(...message);
    }
    /** Logs message to the 'debug' level */ function debug(...message) {
        scope('default-debug')(...message);
    }
    /**
	 * Logs the current call stack to the 'debug' level
	 *
	 * ```ts
	 * hackle.logStack()
	 * ```
	 */ function logStack() {
        scope('default-stack')();
    }
    /**
	 * Sets the log level to the value of 'level'.
	 * Only logs that are equal to or higher than the set level will be logged.
	 *
	 * Level order:
	 * - `error`
	 * - `warn`
	 * - `notice`
	 * - `info`
	 * - `debug`
	 *
	 * So if I set the log level to `warn`...
	 *
	 * ```ts
	 * hackle.setLogLevel('warn')
	 *
	 * hackle.error('some error')
	 * hackle.warn('some warn')
	 * hackle.notice('some notice')
	 * hackle.info('some info')
	 * ```
	 *
	 * ...only errors and warnings will appear on the console.
	 *
	 * ```
	 * some error
	 * some warn
	 * ```
	 */ function setLogLevel(level) {
        logLevel = level;
    }
    /**
	 * Just a wrapper around `hackle.setLogLevel` except it validates the level first.
	 * NOTE: The string `none` counts as `hackle.setLogLevel(null)`.  Non-string values are ignored.
	 *
	 * The intended usage for this function is to make it easier to set the log level straight from a CLI option.
	 *
	 * Here is an example using `cmd`:
	 * ```ts
	 * const program = new Command()
	 * program.option('--log-level <level>')
	 * program.parse(Deno.args)
	 *
	 * hackle.setRawLogLevel(program.logLevel)
	 * ```
	 */ function setRawLogLevel(level) {
        if (level === 'none') setLogLevel(null);
        else if (level === 'error') setLogLevel('error');
        else if (level === 'warn') setLogLevel('warn');
        else if (level === 'notice') setLogLevel('notice');
        else if (level === 'info') setLogLevel('info');
        else if (level === 'debug') setLogLevel('debug');
        else if (typeof level === 'string') error(`An invalid log level was received.  '${level}' is not one of the valid log levels: 'none', 'error', 'warn', 'notice', 'info', and 'debug'.`);
    }
    /**
	 * Adds a custom scope that can be later accessed with the `hackle.scope` function.
	 *
	 * ```ts
	 * hackle.addScope({
	 * 	name: 'my-scope',
	 * 	level: 'notice',
	 * 	prepend: 'myScope: ',
	 * })
	 *
	 * const log = hackle.scope('my-scope')
	 *
	 * log('hello there') // -> myScope: hello there
	 * ```
	 */ function addScope(scope) {
        scopes.set(scope.name, scope);
    }
    /**
	 * Activates a certain scope.
	 *
	 * ```ts
	 * hackle.addScope({
	 * 	name: 'my-scope',
	 * 	level: 'notice',
	 * 	prepend: 'myScope: ',
	 * })
	 *
	 * const log = hackle.scope('my-scope')
	 *
	 * log('hello there') // -> myScope: hello there
	 * ```
	 */ function scope(scopeName) {
        return (...message)=>{
            log(scopeName, message);
        };
    }
    /** Get the currently used scopes */ function currentScopes() {
        return Array.from(scopes.values());
    }
    /** Removes the default scopes */ function removeDefaultScopes() {
        Object.values(tools.defaultScopes).map((scope)=>scope.name).forEach((name)=>scopes.delete(name));
    }
    /**
	 * Get the logs that have already been logged on `scopeName`
	 *
	 * @returns `null` if `storeLogs` is not set to `true` on the particular scope
	 *
	 * ```ts
	 * hackle.error('Some error') // uses the 'default-error' scope behind the scenes
	 *
	 * const logs = hackle.getLogsOnScope('default-error')
	 *
	 * stripColor(logs[0]) // -> 'error: Some error'
	 * ```
	 */ function getLogsOnScope(scopeName) {
        return logStorage.get(scopeName) || null;
    }
    /**
	 * Sets the loggers to be used
	 *
	 * ```ts
	 * hackle.error('error for console')
	 *
	 * hackle.setLoggers(tools.makeFileLogger('.log'))
	 * hackle.error('error for file')
	 */ function setLoggers(newLoggers) {
        loggers = newLoggers;
    }
    return {
        critical,
        error,
        warn,
        notice,
        info,
        debug,
        logStack,
        setLogLevel,
        setRawLogLevel,
        addScope,
        scope,
        currentScopes,
        removeDefaultScopes,
        getLogsOnScope,
        setLoggers
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvaGFja2xlQDEuMS4xL21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB0b29scyBmcm9tICcuL3Rvb2xzLnRzJ1xuXG5leHBvcnQgeyB0b29scyB9XG5cbmV4cG9ydCB0eXBlIExvZ2dlciA9IChtZXNzYWdlOiBzdHJpbmcsIGxldmVsOiBMb2dMZXZlbCkgPT4gUHJvbWlzZTx2b2lkPiB8IHZvaWRcbmV4cG9ydCB0eXBlIExvZ0xldmVsID0gJ2Vycm9yJyB8ICd3YXJuJyB8ICdub3RpY2UnIHwgJ2luZm8nIHwgJ2RlYnVnJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFNjb3BlIHtcblx0LyoqXG5cdCAqIFRoZSBuYW1lIG9mIHRoYXQgc2NvcGUuICBZb3UgY2FuIGxhdGVyIHVzZSB0aGlzIG5hbWUgdG8gYWNjZXNzIHRoaXMgc2NvcGUgdmlhIHRoZSBgaGFja2xlLnNjb3BlYCBmdW5jdGlvbi5cblx0ICpcblx0ICogYGBgdHNcblx0ICogaGFja2xlLmFkZFNjb3BlKHtcblx0ICogXHRuYW1lOiAnc29tZS1uYW1lJyxcblx0ICogXHQvLyAuLi5cblx0ICogfSlcblx0ICpcblx0ICogaGFja2xlLnNjb3BlKCdzb21lLXNjb3BlJykoJ1NvbWUgbG9nIG1lc3NhZ2UnKVxuXHQgKi9cblx0bmFtZTogc3RyaW5nXG5cblx0LyoqXG5cdCAqIFdoaWNoIGxldmVsIGxvZ3MgdG8gdGhpcyBzY29wZSBhcmUgdG8gYmUgbG9nZ2VkIHRvLlxuXHQgKlxuXHQgKiBQcmVjZWRlbmNlIGlzIGFzIGZvbGxvd3M6XG5cdCAqIC0gYGVycm9yYFxuXHQgKiAtIGB3YXJuYFxuXHQgKiAtIGBub3RpY2VgXG5cdCAqIC0gYGluZm9gXG5cdCAqIC0gYGRlYnVnYFxuXHQgKi9cblx0bGV2ZWw6IExvZ0xldmVsXG5cblx0LyoqIFRoaXMgd2lsbCBiZSAndW5zaGlmdGVkJyB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBhcnJheSBvZiBtZXNzYWdlcyAqL1xuXHRwcmVwZW5kPzogc3RyaW5nXG5cblx0LyoqIFRoaXMgd2lsbCBiZSAncHVzaGVkJyB0byB0aGUgZW5kIG9mIHRoZSBhcnJheSBvZiBtZXNzYWdlcyAqL1xuXHRhcHBlbmQ/OiBzdHJpbmdcblxuXHQvKipcblx0ICogQWxsIG1lc3NhZ2VzIHRvIHRoaXMgc2NvcGUgd2lsbCBiZSBtYXBwZWQgdGhyb3VnaCB0aGlzIGZ1bmN0aW9uIGlmIGl0IGlzIHNwZWNpZmllZC5cblx0ICogSWYgdGhpcyBpdCByZXR1cm5zIGEgc3RyaW5nLCAnYXBwZW5kJyBhbmQgJ3ByZXBlbmQnIHdpbGwgYmUgaWdub3JlZCBhbmQgSGFja2xlIHdpbGwgbm90XG5cdCAqIGF0dGVtcHQgdG8gc3RyaW5naWZ5IHRoZSBtZXNzYWdlLiAgSWYgYW4gYXJyYXkgaXMgcmV0dXJuZWQsXG5cdCAqIHRoZSBub3JtYWwgcHJvY2VkdXJlIHdpbGwgYmUgYWRoZXJlZCB0b1xuXHQgKi9cblx0bWVzc2FnZU1hcD86IChtZXNzYWdlOiBhbnlbXSkgPT4gYW55W10gfCBzdHJpbmdcblxuXHQvKipcblx0ICogSWYgYHRydWVgLCB0aGUgYWxsIHRoZSBsb2dzIGluIHRoaXMgc2NvcGUgd2lsbCBiZSBzdG9yZWQgZm9yIGxhdGVyIGFjY2Vzc1xuXHQgKiB2aWEgdGhlIGBoYWNrbGUuZ2V0U3RvcmVkTG9nc2AgZnVuY3Rpb25cblx0ICogQGRlZmF1bHQgZmFsc2Vcblx0ICovXG5cdHN0b3JlTG9ncz86IGJvb2xlYW5cbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYWtlSGFja2xlT3B0aW9ucyB7XG5cdC8qKlxuXHQgKiBIb3cgdGhlIGxvZyBtZXNzYWdlIHRvIGJlIGRpc3BsYXllZFxuXHQgKiBAZGVmYXVsdCB0b29scy5zdHJpbmdpZnlcblx0ICovXG5cdHN0cmluZ2lmeT86IChtZXNzYWdlOiBhbnlbXSkgPT4gc3RyaW5nXG5cblx0LyoqXG5cdCAqIEhvdyB0aGUgbWVzc2FnZSBpcyB0byBiZSBsb2dnZWRcblx0ICogQGRlZmF1bHQgW3Rvb2xzLmNvbnNvbGVMb2dnZXJdXG5cdCAqL1xuXHRsb2dnZXJzPzogTG9nZ2VyW11cblxuXHQvKipcblx0ICogRGVmYXVsdCBsb2cgbGV2ZWxcblx0ICogQGRlZmF1bHQgJ2RlYnVnJ1xuXHQgKi9cblx0ZGVmYXVsdExvZ0xldmVsPzogTG9nTGV2ZWxcblxuXHQvKipcblx0ICogQWRkaXRpb25hbCBzY29wZXMgdGhhdCBjYW4gYmUgYWNjZXNzZWQgd2l0aCB0aGUgYGhhY2tsZS5zY29wZWAgZnVuY3Rpb25cblx0ICogQGRlZmF1bHQgW11cblx0ICovXG5cdGFkZGl0aW9uYWxTY29wZXM/OiBTY29wZVtdXG5cblx0LyoqXG5cdCAqIElmIHRydWUgaGFja2xlIHdpbGwgbm90IHVzZSB0aGUgZGVmYXVsdCBzY29wZXMgZGVmaW5lZCBpbiBgdG9vbHMuZGVmYXVsdFNjb3Blc2Bcblx0ICogQGRlZmF1bHQgZmFsc2Vcblx0ICovXG5cdHJlamVjdERlZmF1bHRTY29wZXM/OiBib29sZWFuXG59XG5cbmV4cG9ydCB0eXBlIEhhY2tsZSA9IFJldHVyblR5cGU8dHlwZW9mIG1ha2VIYWNrbGU+XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlSGFja2xlKG9wdGlvbnM6IE1ha2VIYWNrbGVPcHRpb25zID0ge30pIHtcblx0Y29uc3Qgc3RyaW5naWZ5ID0gb3B0aW9ucy5zdHJpbmdpZnkgfHwgdG9vbHMuZGVmYXVsdFN0cmluZ2lmeVxuXHRjb25zdCByZWplY3REZWZhdWx0U2NvcGVzID0gb3B0aW9ucy5yZWplY3REZWZhdWx0U2NvcGVzIHx8IGZhbHNlXG5cdGNvbnN0IHJhd1Njb3BlcyA9IG9wdGlvbnMuYWRkaXRpb25hbFNjb3BlcyB8fCBbXVxuXG5cdGxldCBsb2dMZXZlbDogTG9nTGV2ZWwgfCBudWxsID0gb3B0aW9ucy5kZWZhdWx0TG9nTGV2ZWwgfHwgJ2RlYnVnJ1xuXHRsZXQgbG9nZ2VycyA9IG9wdGlvbnMubG9nZ2VycyB8fCBbdG9vbHMuY29uc29sZUxvZ2dlcl1cblxuXHQvLyBNb3VudCB0aGUgZGVmYXVsdCBzY29wZXMgaWYgYWxsb3dlZFxuXHRpZiAoIXJlamVjdERlZmF1bHRTY29wZXMpIHJhd1Njb3Blcy51bnNoaWZ0KC4uLnRvb2xzLmRlZmF1bHRTY29wZXMpXG5cblx0Ly8gQ3JlYXRlIG91dCBzdG9yYWdlIG1hcHMgZm9yIGVhc3kgYWNjZXNzIGxhdGVyXG5cdGNvbnN0IHNjb3BlczogTWFwPHN0cmluZywgU2NvcGU+ID0gbmV3IE1hcCgpXG5cdGNvbnN0IGxvZ1N0b3JhZ2U6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPiA9IG5ldyBNYXAoKVxuXG5cdC8vIFBvcHVsYXRlIHRoZSBzY29wZXMgbWFwXG5cdHJhd1Njb3Blcy5mb3JFYWNoKHNjb3BlID0+IHNjb3Blcy5zZXQoc2NvcGUubmFtZSwgc2NvcGUpKVxuXG5cdGZ1bmN0aW9uIGxvZyhzY29wZU5hbWU6IHN0cmluZywgbWVzc2FnZTogYW55W10pIHtcblx0XHRpZiAoIWxvZ0xldmVsKSByZXR1cm5cblxuXHRcdGNvbnN0IHNjb3BlID0gc2NvcGVzLmdldChzY29wZU5hbWUpXG5cdFx0aWYgKHNjb3BlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcihgTm8gc2NvcGUgaGFzIGJlZW4gc2V0IGZvciAnJHtzY29wZU5hbWV9J2ApXG5cblx0XHRjb25zdCBsZXZlbE1hcCA9IHtcblx0XHRcdGVycm9yOiA1LFxuXHRcdFx0d2FybjogNCxcblx0XHRcdG5vdGljZTogMyxcblx0XHRcdGluZm86IDIsXG5cdFx0XHRkZWJ1ZzogMSxcblx0XHR9XG5cblx0XHRpZiAobGV2ZWxNYXBbc2NvcGUubGV2ZWxdIDwgbGV2ZWxNYXBbbG9nTGV2ZWxdKSByZXR1cm5cblxuXHRcdGxldCBwcmV0dHlNZXNzYWdlID0gYGBcblxuXHRcdGNvbnN0IGRlZmF1bHRQcm9jZWR1cmUgPSAoKSA9PiB7XG5cdFx0XHRpZiAoc2NvcGUucHJlcGVuZCkgbWVzc2FnZSA9IFtzY29wZS5wcmVwZW5kLCAuLi5tZXNzYWdlXVxuXHRcdFx0aWYgKHNjb3BlLmFwcGVuZCkgbWVzc2FnZSA9IFsuLi5tZXNzYWdlLCBzY29wZS5hcHBlbmRdXG5cblx0XHRcdHByZXR0eU1lc3NhZ2UgPSBzdHJpbmdpZnkobWVzc2FnZSlcblx0XHR9XG5cblx0XHRpZiAoc2NvcGUubWVzc2FnZU1hcCkge1xuXHRcdFx0Y29uc3QgcmVzID0gc2NvcGUubWVzc2FnZU1hcChtZXNzYWdlKVxuXHRcdFx0aWYgKHR5cGVvZiByZXMgPT09ICdzdHJpbmcnKSBwcmV0dHlNZXNzYWdlID0gcmVzXG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0bWVzc2FnZSA9IHJlc1xuXHRcdFx0XHRkZWZhdWx0UHJvY2VkdXJlKClcblx0XHRcdH1cblx0XHR9IGVsc2UgZGVmYXVsdFByb2NlZHVyZSgpXG5cblx0XHRpZiAoc2NvcGUuc3RvcmVMb2dzKSB7XG5cdFx0XHRjb25zdCBwcmV2aW91c0xvZ3MgPSBsb2dTdG9yYWdlLmdldChzY29wZS5uYW1lKVxuXHRcdFx0bG9nU3RvcmFnZS5zZXQoc2NvcGUubmFtZSwgcHJldmlvdXNMb2dzID8gWy4uLnByZXZpb3VzTG9ncywgcHJldHR5TWVzc2FnZV0gOiBbcHJldHR5TWVzc2FnZV0pXG5cdFx0fVxuXG5cdFx0bG9nZ2Vycy5mb3JFYWNoKGxvZ2dlciA9PiBsb2dnZXIocHJldHR5TWVzc2FnZSwgc2NvcGUubGV2ZWwpKVxuXHR9XG5cblx0LyoqIExvZ3MgYSBtZXNzYWdlIHRvIHRoZSAnZXJyb3InIGxldmVsIGFuZCBleGl0cyAqL1xuXHRmdW5jdGlvbiBjcml0aWNhbCguLi5tZXNzYWdlOiBhbnlbXSk6IG5ldmVyIHtcblx0XHRlcnJvciguLi5tZXNzYWdlKVxuXHRcdGlmIChEZW5vKSByZXR1cm4gRGVuby5leGl0KClcblx0XHRlbHNlIHRocm93IG5ldyBFcnJvcihgQSBjcml0aWNhbCBlcnJvciB3YXMgZW5jb3VudGVyZWRgKVxuXHR9XG5cblx0LyoqIExvZ3MgbWVzc2FnZSB0byB0aGUgJ2Vycm9yJyBsZXZlbCAqL1xuXHRmdW5jdGlvbiBlcnJvciguLi5tZXNzYWdlOiBhbnlbXSkge1xuXHRcdHNjb3BlKCdkZWZhdWx0LWVycm9yJykoLi4ubWVzc2FnZSlcblx0fVxuXG5cdC8qKiBMb2dzIG1lc3NhZ2UgdG8gdGhlICd3YXJuJyBsZXZlbCAqL1xuXHRmdW5jdGlvbiB3YXJuKC4uLm1lc3NhZ2U6IGFueVtdKSB7XG5cdFx0c2NvcGUoJ2RlZmF1bHQtd2FybicpKC4uLm1lc3NhZ2UpXG5cdH1cblxuXHQvKiogTG9ncyBtZXNzYWdlIHRvIHRoZSAnbm90aWNlJyBsZXZlbCAqL1xuXHRmdW5jdGlvbiBub3RpY2UoLi4ubWVzc2FnZTogYW55W10pIHtcblx0XHRzY29wZSgnZGVmYXVsdC1ub3RpY2UnKSguLi5tZXNzYWdlKVxuXHR9XG5cblx0LyoqIExvZ3MgbWVzc2FnZSB0byB0aGUgJ2luZm8nIGxldmVsICovXG5cdGZ1bmN0aW9uIGluZm8oLi4ubWVzc2FnZTogYW55W10pIHtcblx0XHRzY29wZSgnZGVmYXVsdC1pbmZvJykoLi4ubWVzc2FnZSlcblx0fVxuXG5cdC8qKiBMb2dzIG1lc3NhZ2UgdG8gdGhlICdkZWJ1ZycgbGV2ZWwgKi9cblx0ZnVuY3Rpb24gZGVidWcoLi4ubWVzc2FnZTogYW55W10pIHtcblx0XHRzY29wZSgnZGVmYXVsdC1kZWJ1ZycpKC4uLm1lc3NhZ2UpXG5cdH1cblxuXHQvKipcblx0ICogTG9ncyB0aGUgY3VycmVudCBjYWxsIHN0YWNrIHRvIHRoZSAnZGVidWcnIGxldmVsXG5cdCAqXG5cdCAqIGBgYHRzXG5cdCAqIGhhY2tsZS5sb2dTdGFjaygpXG5cdCAqIGBgYFxuXHQgKi9cblx0ZnVuY3Rpb24gbG9nU3RhY2soKSB7XG5cdFx0c2NvcGUoJ2RlZmF1bHQtc3RhY2snKSgpXG5cdH1cblxuXHQvKipcblx0ICogU2V0cyB0aGUgbG9nIGxldmVsIHRvIHRoZSB2YWx1ZSBvZiAnbGV2ZWwnLlxuXHQgKiBPbmx5IGxvZ3MgdGhhdCBhcmUgZXF1YWwgdG8gb3IgaGlnaGVyIHRoYW4gdGhlIHNldCBsZXZlbCB3aWxsIGJlIGxvZ2dlZC5cblx0ICpcblx0ICogTGV2ZWwgb3JkZXI6XG5cdCAqIC0gYGVycm9yYFxuXHQgKiAtIGB3YXJuYFxuXHQgKiAtIGBub3RpY2VgXG5cdCAqIC0gYGluZm9gXG5cdCAqIC0gYGRlYnVnYFxuXHQgKlxuXHQgKiBTbyBpZiBJIHNldCB0aGUgbG9nIGxldmVsIHRvIGB3YXJuYC4uLlxuXHQgKlxuXHQgKiBgYGB0c1xuXHQgKiBoYWNrbGUuc2V0TG9nTGV2ZWwoJ3dhcm4nKVxuXHQgKlxuXHQgKiBoYWNrbGUuZXJyb3IoJ3NvbWUgZXJyb3InKVxuXHQgKiBoYWNrbGUud2Fybignc29tZSB3YXJuJylcblx0ICogaGFja2xlLm5vdGljZSgnc29tZSBub3RpY2UnKVxuXHQgKiBoYWNrbGUuaW5mbygnc29tZSBpbmZvJylcblx0ICogYGBgXG5cdCAqXG5cdCAqIC4uLm9ubHkgZXJyb3JzIGFuZCB3YXJuaW5ncyB3aWxsIGFwcGVhciBvbiB0aGUgY29uc29sZS5cblx0ICpcblx0ICogYGBgXG5cdCAqIHNvbWUgZXJyb3Jcblx0ICogc29tZSB3YXJuXG5cdCAqIGBgYFxuXHQgKi9cblx0ZnVuY3Rpb24gc2V0TG9nTGV2ZWwobGV2ZWw6IExvZ0xldmVsIHwgbnVsbCkge1xuXHRcdGxvZ0xldmVsID0gbGV2ZWxcblx0fVxuXG5cdC8qKlxuXHQgKiBKdXN0IGEgd3JhcHBlciBhcm91bmQgYGhhY2tsZS5zZXRMb2dMZXZlbGAgZXhjZXB0IGl0IHZhbGlkYXRlcyB0aGUgbGV2ZWwgZmlyc3QuXG5cdCAqIE5PVEU6IFRoZSBzdHJpbmcgYG5vbmVgIGNvdW50cyBhcyBgaGFja2xlLnNldExvZ0xldmVsKG51bGwpYC4gIE5vbi1zdHJpbmcgdmFsdWVzIGFyZSBpZ25vcmVkLlxuXHQgKlxuXHQgKiBUaGUgaW50ZW5kZWQgdXNhZ2UgZm9yIHRoaXMgZnVuY3Rpb24gaXMgdG8gbWFrZSBpdCBlYXNpZXIgdG8gc2V0IHRoZSBsb2cgbGV2ZWwgc3RyYWlnaHQgZnJvbSBhIENMSSBvcHRpb24uXG5cdCAqXG5cdCAqIEhlcmUgaXMgYW4gZXhhbXBsZSB1c2luZyBgY21kYDpcblx0ICogYGBgdHNcblx0ICogY29uc3QgcHJvZ3JhbSA9IG5ldyBDb21tYW5kKClcblx0ICogcHJvZ3JhbS5vcHRpb24oJy0tbG9nLWxldmVsIDxsZXZlbD4nKVxuXHQgKiBwcm9ncmFtLnBhcnNlKERlbm8uYXJncylcblx0ICpcblx0ICogaGFja2xlLnNldFJhd0xvZ0xldmVsKHByb2dyYW0ubG9nTGV2ZWwpXG5cdCAqIGBgYFxuXHQgKi9cblx0ZnVuY3Rpb24gc2V0UmF3TG9nTGV2ZWwobGV2ZWw6IGFueSkge1xuXHRcdGlmIChsZXZlbCA9PT0gJ25vbmUnKSBzZXRMb2dMZXZlbChudWxsKVxuXHRcdGVsc2UgaWYgKGxldmVsID09PSAnZXJyb3InKSBzZXRMb2dMZXZlbCgnZXJyb3InKVxuXHRcdGVsc2UgaWYgKGxldmVsID09PSAnd2FybicpIHNldExvZ0xldmVsKCd3YXJuJylcblx0XHRlbHNlIGlmIChsZXZlbCA9PT0gJ25vdGljZScpIHNldExvZ0xldmVsKCdub3RpY2UnKVxuXHRcdGVsc2UgaWYgKGxldmVsID09PSAnaW5mbycpIHNldExvZ0xldmVsKCdpbmZvJylcblx0XHRlbHNlIGlmIChsZXZlbCA9PT0gJ2RlYnVnJykgc2V0TG9nTGV2ZWwoJ2RlYnVnJylcblx0XHRlbHNlIGlmICh0eXBlb2YgbGV2ZWwgPT09ICdzdHJpbmcnKVxuXHRcdFx0ZXJyb3IoXG5cdFx0XHRcdGBBbiBpbnZhbGlkIGxvZyBsZXZlbCB3YXMgcmVjZWl2ZWQuICAnJHtsZXZlbH0nIGlzIG5vdCBvbmUgb2YgdGhlIHZhbGlkIGxvZyBsZXZlbHM6ICdub25lJywgJ2Vycm9yJywgJ3dhcm4nLCAnbm90aWNlJywgJ2luZm8nLCBhbmQgJ2RlYnVnJy5gXG5cdFx0XHQpXG5cdH1cblxuXHQvKipcblx0ICogQWRkcyBhIGN1c3RvbSBzY29wZSB0aGF0IGNhbiBiZSBsYXRlciBhY2Nlc3NlZCB3aXRoIHRoZSBgaGFja2xlLnNjb3BlYCBmdW5jdGlvbi5cblx0ICpcblx0ICogYGBgdHNcblx0ICogaGFja2xlLmFkZFNjb3BlKHtcblx0ICogXHRuYW1lOiAnbXktc2NvcGUnLFxuXHQgKiBcdGxldmVsOiAnbm90aWNlJyxcblx0ICogXHRwcmVwZW5kOiAnbXlTY29wZTogJyxcblx0ICogfSlcblx0ICpcblx0ICogY29uc3QgbG9nID0gaGFja2xlLnNjb3BlKCdteS1zY29wZScpXG5cdCAqXG5cdCAqIGxvZygnaGVsbG8gdGhlcmUnKSAvLyAtPiBteVNjb3BlOiBoZWxsbyB0aGVyZVxuXHQgKiBgYGBcblx0ICovXG5cdGZ1bmN0aW9uIGFkZFNjb3BlKHNjb3BlOiBTY29wZSkge1xuXHRcdHNjb3Blcy5zZXQoc2NvcGUubmFtZSwgc2NvcGUpXG5cdH1cblxuXHQvKipcblx0ICogQWN0aXZhdGVzIGEgY2VydGFpbiBzY29wZS5cblx0ICpcblx0ICogYGBgdHNcblx0ICogaGFja2xlLmFkZFNjb3BlKHtcblx0ICogXHRuYW1lOiAnbXktc2NvcGUnLFxuXHQgKiBcdGxldmVsOiAnbm90aWNlJyxcblx0ICogXHRwcmVwZW5kOiAnbXlTY29wZTogJyxcblx0ICogfSlcblx0ICpcblx0ICogY29uc3QgbG9nID0gaGFja2xlLnNjb3BlKCdteS1zY29wZScpXG5cdCAqXG5cdCAqIGxvZygnaGVsbG8gdGhlcmUnKSAvLyAtPiBteVNjb3BlOiBoZWxsbyB0aGVyZVxuXHQgKiBgYGBcblx0ICovXG5cdGZ1bmN0aW9uIHNjb3BlKHNjb3BlTmFtZTogc3RyaW5nKSB7XG5cdFx0cmV0dXJuICguLi5tZXNzYWdlOiBhbnlbXSkgPT4ge1xuXHRcdFx0bG9nKHNjb3BlTmFtZSwgbWVzc2FnZSlcblx0XHR9XG5cdH1cblxuXHQvKiogR2V0IHRoZSBjdXJyZW50bHkgdXNlZCBzY29wZXMgKi9cblx0ZnVuY3Rpb24gY3VycmVudFNjb3BlcygpOiBTY29wZVtdIHtcblx0XHRyZXR1cm4gQXJyYXkuZnJvbShzY29wZXMudmFsdWVzKCkpXG5cdH1cblxuXHQvKiogUmVtb3ZlcyB0aGUgZGVmYXVsdCBzY29wZXMgKi9cblx0ZnVuY3Rpb24gcmVtb3ZlRGVmYXVsdFNjb3BlcygpIHtcblx0XHRPYmplY3QudmFsdWVzKHRvb2xzLmRlZmF1bHRTY29wZXMpXG5cdFx0XHQubWFwKHNjb3BlID0+IHNjb3BlLm5hbWUpXG5cdFx0XHQuZm9yRWFjaChuYW1lID0+IHNjb3Blcy5kZWxldGUobmFtZSkpXG5cdH1cblxuXHQvKipcblx0ICogR2V0IHRoZSBsb2dzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gbG9nZ2VkIG9uIGBzY29wZU5hbWVgXG5cdCAqXG5cdCAqIEByZXR1cm5zIGBudWxsYCBpZiBgc3RvcmVMb2dzYCBpcyBub3Qgc2V0IHRvIGB0cnVlYCBvbiB0aGUgcGFydGljdWxhciBzY29wZVxuXHQgKlxuXHQgKiBgYGB0c1xuXHQgKiBoYWNrbGUuZXJyb3IoJ1NvbWUgZXJyb3InKSAvLyB1c2VzIHRoZSAnZGVmYXVsdC1lcnJvcicgc2NvcGUgYmVoaW5kIHRoZSBzY2VuZXNcblx0ICpcblx0ICogY29uc3QgbG9ncyA9IGhhY2tsZS5nZXRMb2dzT25TY29wZSgnZGVmYXVsdC1lcnJvcicpXG5cdCAqXG5cdCAqIHN0cmlwQ29sb3IobG9nc1swXSkgLy8gLT4gJ2Vycm9yOiBTb21lIGVycm9yJ1xuXHQgKiBgYGBcblx0ICovXG5cdGZ1bmN0aW9uIGdldExvZ3NPblNjb3BlKHNjb3BlTmFtZTogc3RyaW5nKTogc3RyaW5nW10gfCBudWxsIHtcblx0XHRyZXR1cm4gbG9nU3RvcmFnZS5nZXQoc2NvcGVOYW1lKSB8fCBudWxsXG5cdH1cblxuXHQvKipcblx0ICogU2V0cyB0aGUgbG9nZ2VycyB0byBiZSB1c2VkXG5cdCAqXG5cdCAqIGBgYHRzXG5cdCAqIGhhY2tsZS5lcnJvcignZXJyb3IgZm9yIGNvbnNvbGUnKVxuXHQgKlxuXHQgKiBoYWNrbGUuc2V0TG9nZ2Vycyh0b29scy5tYWtlRmlsZUxvZ2dlcignLmxvZycpKVxuXHQgKiBoYWNrbGUuZXJyb3IoJ2Vycm9yIGZvciBmaWxlJylcblx0ICovXG5cdGZ1bmN0aW9uIHNldExvZ2dlcnMobmV3TG9nZ2VyczogTG9nZ2VyW10pIHtcblx0XHRsb2dnZXJzID0gbmV3TG9nZ2Vyc1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRjcml0aWNhbCxcblx0XHRlcnJvcixcblx0XHR3YXJuLFxuXHRcdG5vdGljZSxcblx0XHRpbmZvLFxuXHRcdGRlYnVnLFxuXHRcdGxvZ1N0YWNrLFxuXHRcdHNldExvZ0xldmVsLFxuXHRcdHNldFJhd0xvZ0xldmVsLFxuXHRcdGFkZFNjb3BlLFxuXHRcdHNjb3BlLFxuXHRcdGN1cnJlbnRTY29wZXMsXG5cdFx0cmVtb3ZlRGVmYXVsdFNjb3Blcyxcblx0XHRnZXRMb2dzT25TY29wZSxcblx0XHRzZXRMb2dnZXJzLFxuXHR9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxLQUFLLE1BQU0sWUFBWSxDQUFBO0FBRW5DLFNBQVMsS0FBSyxHQUFFO0FBdUZoQixPQUFPLFNBQVMsVUFBVSxDQUFDLE9BQTBCLEdBQUcsRUFBRSxFQUFFO0lBQzNELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLGdCQUFnQjtJQUM3RCxNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsSUFBSSxLQUFLO0lBQ2hFLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFO0lBRWhELElBQUksUUFBUSxHQUFvQixPQUFPLENBQUMsZUFBZSxJQUFJLE9BQU87SUFDbEUsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sSUFBSTtRQUFDLEtBQUssQ0FBQyxhQUFhO0tBQUM7SUFFdEQsc0NBQXNDO0lBQ3RDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUM7SUFFbkUsZ0RBQWdEO0lBQ2hELE1BQU0sTUFBTSxHQUF1QixJQUFJLEdBQUcsRUFBRTtJQUM1QyxNQUFNLFVBQVUsR0FBMEIsSUFBSSxHQUFHLEVBQUU7SUFFbkQsMEJBQTBCO0lBQzFCLFNBQVMsQ0FBQyxP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