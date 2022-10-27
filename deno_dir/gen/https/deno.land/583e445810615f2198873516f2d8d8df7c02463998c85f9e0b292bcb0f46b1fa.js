var Type;
(function(Type) {
    Type[Type["NO_DEPENDENCY"] = 0] = "NO_DEPENDENCY";
    Type[Type["PREVIOUS_COMMAND_MUST_SUCCEED"] = 1] = "PREVIOUS_COMMAND_MUST_SUCCEED";
    Type[Type["PREVIOUS_COMMAND_MUST_FAIL"] = 2] = "PREVIOUS_COMMAND_MUST_FAIL";
})(Type || (Type = {}));
class CmdError extends Error {
    code;
    constructor(code, message){
        super(message);
        this.message = message;
        this.code = code;
    }
    message;
}
function getCommandParams(command) {
    const myRegexp = /[^\s"]+|"([^"]*)"/gi;
    const splits = [];
    let match;
    do {
        //Each call to exec returns the next regex match as an array
        match = myRegexp.exec(command);
        if (match != null) {
            //Index 1 in the array is the captured group if it exists
            //Index 0 is the matched text, which we use if no captured group exists
            splits.push(match[1] ? match[1] : match[0]);
        }
    }while (match != null)
    return splits;
}
export function setCmdOkResult(ctx, cmdResult) {
    ctx.public.cmdResult = cmdResult;
    ctx.public.cmdOk = true;
    ctx.public.cmdError = undefined;
    ctx.public.cmdCode = 0;
    return ctx;
}
export function setCmdErrorResult(ctx, error, code) {
    ctx.public.cmdResult = undefined;
    ctx.public.cmdOk = false;
    ctx.public.cmdError = error;
    ctx.public.cmdCode = code;
    return ctx;
}
function splitCommand(command) {
    const commands = [];
    let currentAppendingCommandIndex = 0;
    let stringStartIndexOfCurrentCommand = 0;
    let currentCommandType = Type.NO_DEPENDENCY;
    for(let i = 0; i < command.length; i++){
        if (i === command.length - 1) {
            commands[currentAppendingCommandIndex] = {
                command: command.slice(stringStartIndexOfCurrentCommand).trim(),
                type: currentCommandType,
                muted: false
            };
        }
        if (command[i] === "&") {
            if (command[i + 1] && command[i + 1] === "&") {
                commands[currentAppendingCommandIndex] = {
                    command: command.slice(stringStartIndexOfCurrentCommand, i - 1).trim(),
                    type: currentCommandType,
                    muted: false
                };
                currentCommandType = Type.PREVIOUS_COMMAND_MUST_SUCCEED;
            } else {
                commands[currentAppendingCommandIndex] = {
                    command: command.slice(stringStartIndexOfCurrentCommand, i - 1).trim(),
                    type: currentCommandType,
                    muted: true
                };
            }
            i += 2;
            stringStartIndexOfCurrentCommand = i;
            currentAppendingCommandIndex++;
        }
        if (command[i] === "|") {
            if (command[i + 1] && command[i + 1] === "|") {
                commands[currentAppendingCommandIndex] = {
                    command: command.slice(stringStartIndexOfCurrentCommand, i - 1).trim(),
                    type: currentCommandType,
                    muted: false
                };
                currentCommandType = Type.PREVIOUS_COMMAND_MUST_FAIL;
                i += 2;
                stringStartIndexOfCurrentCommand = i;
                currentAppendingCommandIndex++;
            }
        }
    }
    return commands;
}
export const runCmd = async (_ctx, command, options = {
    verbose: false
})=>{
    const commands = splitCommand(command);
    let output = "";
    let lastRunFailed = false;
    for (const individualCommand of commands){
        if (individualCommand.type === Type.PREVIOUS_COMMAND_MUST_SUCCEED && lastRunFailed) {
            if (options.verbose) {
                console.log(`Skipped command ' ${individualCommand.command}' because last process did fail`);
            }
            lastRunFailed = true;
            continue;
        }
        if (individualCommand.type === Type.PREVIOUS_COMMAND_MUST_FAIL && !lastRunFailed) {
            if (options.verbose) {
                console.log(`Skipped command '${individualCommand.command}' because last process didn't fail`);
            }
            lastRunFailed = true;
            continue;
        }
        if (options.verbose) {
            console.log(`Executing command '${individualCommand.command}'`);
        }
        const commandParameters = getCommandParams(individualCommand.command);
        const process = Deno.run({
            cmd: commandParameters,
            stdout: "piped",
            stderr: "piped"
        });
        let response = "";
        let stderr = "";
        const decoder = new TextDecoder();
        const buff = new Uint8Array(1);
        while(true){
            try {
                const result = await process.stdout?.read(buff);
                if (!result) {
                    break;
                }
                response = response + decoder.decode(buff);
                await Deno.stdout.write(buff);
            } catch (_) {
                break;
            }
        }
        const errorBuff = new Uint8Array(1);
        while(true){
            try {
                const result1 = await process.stderr?.read(errorBuff);
                if (!result1) {
                    break;
                }
                stderr = stderr + decoder.decode(errorBuff);
                await Deno.stdout.write(errorBuff);
            } catch (_1) {
                break;
            }
        }
        const status = await process.status();
        process.stdout?.close();
        process.stderr?.close();
        process.close();
        if (!individualCommand.muted && !status.success) {
            if (options.verbose) {
                console.log(`Process of command '${individualCommand.command}' threw an error`);
            }
            if (!options.continueOnError) {
                const error = new CmdError(status.code, stderr);
                throw error;
            } else {
                lastRunFailed = true;
            }
        } else {
            lastRunFailed = false;
        }
        output += response;
    }
    const finalStdout = output.replace(/\n$/, "");
    return {
        code: 0,
        stdout: finalStdout
    };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvcnVuLWNtZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb250ZXh0IH0gZnJvbSBcIi4vaW50ZXJuYWwtaW50ZXJmYWNlLnRzXCI7XG5lbnVtIFR5cGUge1xuICBOT19ERVBFTkRFTkNZLFxuICBQUkVWSU9VU19DT01NQU5EX01VU1RfU1VDQ0VFRCxcbiAgUFJFVklPVVNfQ09NTUFORF9NVVNUX0ZBSUwsXG59XG5jbGFzcyBDbWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcHVibGljIGNvZGU6IG51bWJlcjtcbiAgY29uc3RydWN0b3IoY29kZTogbnVtYmVyLCBwdWJsaWMgbWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5jb2RlID0gY29kZTtcbiAgfVxufVxuZnVuY3Rpb24gZ2V0Q29tbWFuZFBhcmFtcyhjb21tYW5kOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IG15UmVnZXhwID0gL1teXFxzXCJdK3xcIihbXlwiXSopXCIvZ2k7XG4gIGNvbnN0IHNwbGl0cyA9IFtdO1xuICBsZXQgbWF0Y2g7XG4gIGRvIHtcbiAgICAvL0VhY2ggY2FsbCB0byBleGVjIHJldHVybnMgdGhlIG5leHQgcmVnZXggbWF0Y2ggYXMgYW4gYXJyYXlcbiAgICBtYXRjaCA9IG15UmVnZXhwLmV4ZWMoY29tbWFuZCk7XG4gICAgaWYgKG1hdGNoICE9IG51bGwpIHtcbiAgICAgIC8vSW5kZXggMSBpbiB0aGUgYXJyYXkgaXMgdGhlIGNhcHR1cmVkIGdyb3VwIGlmIGl0IGV4aXN0c1xuICAgICAgLy9JbmRleCAwIGlzIHRoZSBtYXRjaGVkIHRleHQsIHdoaWNoIHdlIHVzZSBpZiBubyBjYXB0dXJlZCBncm91cCBleGlzdHNcbiAgICAgIHNwbGl0cy5wdXNoKG1hdGNoWzFdID8gbWF0Y2hbMV0gOiBtYXRjaFswXSk7XG4gICAgfVxuICB9IHdoaWxlIChtYXRjaCAhPSBudWxsKTtcblxuICByZXR1cm4gc3BsaXRzO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNldENtZE9rUmVzdWx0KGN0eDogQ29udGV4dCwgY21kUmVzdWx0OiBzdHJpbmcpOiBDb250ZXh0IHtcbiAgY3R4LnB1YmxpYy5jbWRSZXN1bHQgPSBjbWRSZXN1bHQ7XG4gIGN0eC5wdWJsaWMuY21kT2sgPSB0cnVlO1xuICBjdHgucHVibGljLmNtZEVycm9yID0gdW5kZWZpbmVkO1xuICBjdHgucHVibGljLmNtZENvZGUgPSAwO1xuXG4gIHJldHVybiBjdHg7XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0Q21kRXJyb3JSZXN1bHQoXG4gIGN0eDogQ29udGV4dCxcbiAgZXJyb3I6IHN0cmluZyxcbiAgY29kZTogbnVtYmVyLFxuKTogQ29udGV4dCB7XG4gIGN0eC5wdWJsaWMuY21kUmVzdWx0ID0gdW5kZWZpbmVkO1xuICBjdHgucHVibGljLmNtZE9rID0gZmFsc2U7XG4gIGN0eC5wdWJsaWMuY21kRXJyb3IgPSBlcnJvcjtcbiAgY3R4LnB1YmxpYy5jbWRDb2RlID0gY29kZTtcbiAgcmV0dXJuIGN0eDtcbn1cbmZ1bmN0aW9uIHNwbGl0Q29tbWFuZChcbiAgY29tbWFuZDogc3RyaW5nLFxuKTogeyBjb21tYW5kOiBzdHJpbmc7IHR5cGU6IFR5cGU7IG11dGVkOiBib29sZWFuIH1bXSB7XG4gIGNvbnN0IGNvbW1hbmRzOiB7IGNvbW1hbmQ6IHN0cmluZzsgdHlwZTogVHlwZTsgbXV0ZWQ6IGJvb2xlYW4gfVtdID0gW107XG4gIGxldCBjdXJyZW50QXBwZW5kaW5nQ29tbWFuZEluZGV4ID0gMDtcbiAgbGV0IHN0cmluZ1N0YXJ0SW5kZXhPZkN1cnJlbnRDb21tYW5kID0gMDtcbiAgbGV0IGN1cnJlbnRDb21tYW5kVHlwZTogVHlwZSA9IFR5cGUuTk9fREVQRU5ERU5DWTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbW1hbmQubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoaSA9PT0gY29tbWFuZC5sZW5ndGggLSAxKSB7XG4gICAgICBjb21tYW5kc1tjdXJyZW50QXBwZW5kaW5nQ29tbWFuZEluZGV4XSA9IHtcbiAgICAgICAgY29tbWFuZDogY29tbWFuZC5zbGljZShzdHJpbmdTdGFydEluZGV4T2ZDdXJyZW50Q29tbWFuZCkudHJpbSgpLFxuICAgICAgICB0eXBlOiBjdXJyZW50Q29tbWFuZFR5cGUsXG4gICAgICAgIG11dGVkOiBmYWxzZSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNvbW1hbmRbaV0gPT09IFwiJlwiKSB7XG4gICAgICBpZiAoY29tbWFuZFtpICsgMV0gJiYgY29tbWFuZFtpICsgMV0gPT09IFwiJlwiKSB7XG4gICAgICAgIGNvbW1hbmRzW2N1cnJlbnRBcHBlbmRpbmdDb21tYW5kSW5kZXhdID0ge1xuICAgICAgICAgIGNvbW1hbmQ6IGNvbW1hbmQuc2xpY2Uoc3RyaW5nU3RhcnRJbmRleE9mQ3VycmVudENvbW1hbmQsIGkgLSAxKVxuICAgICAgICAgICAgLnRyaW0oKSxcbiAgICAgICAgICB0eXBlOiBjdXJyZW50Q29tbWFuZFR5cGUsXG4gICAgICAgICAgbXV0ZWQ6IGZhbHNlLFxuICAgICAgICB9O1xuICAgICAgICBjdXJyZW50Q29tbWFuZFR5cGUgPSBUeXBlLlBSRVZJT1VTX0NPTU1BTkRfTVVTVF9TVUNDRUVEO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tbWFuZHNbY3VycmVudEFwcGVuZGluZ0NvbW1hbmRJbmRleF0gPSB7XG4gICAgICAgICAgY29tbWFuZDogY29tbWFuZC5zbGljZShzdHJpbmdTdGFydEluZGV4T2ZDdXJyZW50Q29tbWFuZCwgaSAtIDEpXG4gICAgICAgICAgICAudHJpbSgpLFxuICAgICAgICAgIHR5cGU6IGN1cnJlbnRDb21tYW5kVHlwZSxcbiAgICAgICAgICBtdXRlZDogdHJ1ZSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGkgKz0gMjtcbiAgICAgIHN0cmluZ1N0YXJ0SW5kZXhPZkN1cnJlbnRDb21tYW5kID0gaTtcbiAgICAgIGN1cnJlbnRBcHBlbmRpbmdDb21tYW5kSW5kZXgrKztcbiAgICB9XG5cbiAgICBpZiAoY29tbWFuZFtpXSA9PT0gXCJ8XCIpIHtcbiAgICAgIGlmIChjb21tYW5kW2kgKyAxXSAmJiBjb21tYW5kW2kgKyAxXSA9PT0gXCJ8XCIpIHtcbiAgICAgICAgY29tbWFuZHNbY3VycmVudEFwcGVuZGluZ0NvbW1hbmRJbmRleF0gPSB7XG4gICAgICAgICAgY29tbWFuZDogY29tbWFuZC5zbGljZShzdHJpbmdTdGFydEluZGV4T2ZDdXJyZW50Q29tbWFuZCwgaSAtIDEpXG4gICAgICAgICAgICAudHJpbSgpLFxuICAgICAgICAgIHR5cGU6IGN1cnJlbnRDb21tYW5kVHlwZSxcbiAgICAgICAgICBtdXRlZDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICAgIGN1cnJlbnRDb21tYW5kVHlwZSA9IFR5cGUuUFJFVklPVVNfQ09NTUFORF9NVVNUX0ZBSUw7XG4gICAgICAgIGkgKz0gMjtcbiAgICAgICAgc3RyaW5nU3RhcnRJbmRleE9mQ3VycmVudENvbW1hbmQgPSBpO1xuICAgICAgICBjdXJyZW50QXBwZW5kaW5nQ29tbWFuZEluZGV4Kys7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBjb21tYW5kcztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJRXhlY1Jlc3BvbnNlIHtcbiAgY29kZTogbnVtYmVyO1xuICBzdGRvdXQ6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIElPcHRpb25zIHtcbiAgdmVyYm9zZT86IGJvb2xlYW47XG4gIGNvbnRpbnVlT25FcnJvcj86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBydW5DbWQgPSBhc3luYyAoXG4gIF9jdHg6IENvbnRleHQsXG4gIGNvbW1hbmQ6IHN0cmluZyxcbiAgb3B0aW9uczogSU9wdGlvbnMgPSB7IHZlcmJvc2U6IGZhbHNlIH0sXG4pOiBQcm9taXNlPElFeGVjUmVzcG9uc2U+ID0+IHtcbiAgY29uc3QgY29tbWFuZHMgPSBzcGxpdENvbW1hbmQoY29tbWFuZCk7XG5cbiAgbGV0IG91dHB1dCA9IFwiXCI7XG4gIGxldCBsYXN0UnVuRmFpbGVkID0gZmFsc2U7XG5cbiAgZm9yIChjb25zdCBpbmRpdmlkdWFsQ29tbWFuZCBvZiBjb21tYW5kcykge1xuICAgIGlmIChcbiAgICAgIGluZGl2aWR1YWxDb21tYW5kLnR5cGUgPT09IFR5cGUuUFJFVklPVVNfQ09NTUFORF9NVVNUX1NVQ0NFRUQgJiZcbiAgICAgIGxhc3RSdW5GYWlsZWRcbiAgICApIHtcbiAgICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgYFNraXBwZWQgY29tbWFuZCAnICR7aW5kaXZpZHVhbENvbW1hbmQuY29tbWFuZH0nIGJlY2F1c2UgbGFzdCBwcm9jZXNzIGRpZCBmYWlsYCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGxhc3RSdW5GYWlsZWQgPSB0cnVlO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgaW5kaXZpZHVhbENvbW1hbmQudHlwZSA9PT0gVHlwZS5QUkVWSU9VU19DT01NQU5EX01VU1RfRkFJTCAmJlxuICAgICAgIWxhc3RSdW5GYWlsZWRcbiAgICApIHtcbiAgICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgYFNraXBwZWQgY29tbWFuZCAnJHtpbmRpdmlkdWFsQ29tbWFuZC5jb21tYW5kfScgYmVjYXVzZSBsYXN0IHByb2Nlc3MgZGlkbid0IGZhaWxgLFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgbGFzdFJ1bkZhaWxlZCA9IHRydWU7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy52ZXJib3NlKSB7XG4gICAgICBjb25zb2xlLmxvZyhgRXhlY3V0aW5nIGNvbW1hbmQgJyR7aW5kaXZpZHVhbENvbW1hbmQuY29tbWFuZH0nYCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbW1hbmRQYXJhbWV0ZXJzOiBzdHJpbmdbXSA9IGdldENvbW1hbmRQYXJhbXMoXG4gICAgICBpbmRpdmlkdWFsQ29tbWFuZC5jb21tYW5kLFxuICAgICk7XG4gICAgY29uc3QgcHJvY2VzczogRGVuby5Qcm9jZXNzID0gRGVuby5ydW4oe1xuICAgICAgY21kOiBjb21tYW5kUGFyYW1ldGVycyxcbiAgICAgIHN0ZG91dDogXCJwaXBlZFwiLFxuICAgICAgc3RkZXJyOiBcInBpcGVkXCIsXG4gICAgfSk7XG4gICAgbGV0IHJlc3BvbnNlID0gXCJcIjtcbiAgICBsZXQgc3RkZXJyID0gXCJcIjtcbiAgICBjb25zdCBkZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKCk7XG5cbiAgICBjb25zdCBidWZmID0gbmV3IFVpbnQ4QXJyYXkoMSk7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcHJvY2Vzcy5zdGRvdXQ/LnJlYWQoYnVmZik7XG4gICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmVzcG9uc2UgPSByZXNwb25zZSArIGRlY29kZXIuZGVjb2RlKGJ1ZmYpO1xuICAgICAgICBhd2FpdCBEZW5vLnN0ZG91dC53cml0ZShidWZmKTtcbiAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGVycm9yQnVmZiA9IG5ldyBVaW50OEFycmF5KDEpO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb2Nlc3Muc3RkZXJyPy5yZWFkKGVycm9yQnVmZik7XG4gICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgc3RkZXJyID0gc3RkZXJyICsgZGVjb2Rlci5kZWNvZGUoZXJyb3JCdWZmKTtcbiAgICAgICAgYXdhaXQgRGVuby5zdGRvdXQud3JpdGUoZXJyb3JCdWZmKTtcbiAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IHByb2Nlc3Muc3RhdHVzKCk7XG4gICAgcHJvY2Vzcy5zdGRvdXQ/LmNsb3NlKCk7XG4gICAgcHJvY2Vzcy5zdGRlcnI/LmNsb3NlKCk7XG4gICAgcHJvY2Vzcy5jbG9zZSgpO1xuXG4gICAgaWYgKCFpbmRpdmlkdWFsQ29tbWFuZC5tdXRlZCAmJiAhc3RhdHVzLnN1Y2Nlc3MpIHtcbiAgICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgYFByb2Nlc3Mgb2YgY29tbWFuZCAnJHtpbmRpdmlkdWFsQ29tbWFuZC5jb21tYW5kfScgdGhyZXcgYW4gZXJyb3JgLFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgaWYgKCFvcHRpb25zLmNvbnRpbnVlT25FcnJvcikge1xuICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBDbWRFcnJvcihzdGF0dXMuY29kZSwgc3RkZXJyKTtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYXN0UnVuRmFpbGVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbGFzdFJ1bkZhaWxlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIG91dHB1dCArPSByZXNwb25zZTtcbiAgfVxuXG4gIGNvbnN0IGZpbmFsU3Rkb3V0ID0gb3V0cHV0LnJlcGxhY2UoL1xcbiQvLCBcIlwiKTtcblxuICByZXR1cm4ge1xuICAgIGNvZGU6IDAsXG4gICAgc3Rkb3V0OiBmaW5hbFN0ZG91dCxcbiAgfTtcbn07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFDQTtVQUFLLElBQUk7SUFBSixLQUFBLEtBQ0gsbUJBQUEsS0FBQTtJQURHLEtBQUEsS0FFSCxt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