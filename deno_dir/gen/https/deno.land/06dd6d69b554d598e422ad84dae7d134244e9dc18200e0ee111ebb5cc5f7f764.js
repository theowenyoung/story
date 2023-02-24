import { get } from "./utils/get.ts";
import { getFrom } from "./get-from.ts";
import { runScript } from "./utils/run-script.ts";
import { isClass } from "./utils/object.ts";
import { hasPermissionSlient } from "./permission.ts";
export function getStepResponse(ctx) {
    return {
        result: ctx.public.result,
        ok: ctx.public.ok,
        isRealOk: ctx.public.isRealOk,
        error: ctx.public.error,
        cmdResult: ctx.public.cmdResult,
        cmdCode: ctx.public.cmdCode,
        cmdOk: ctx.public.cmdOk,
        cmdError: ctx.public.cmdError
    };
}
export function setOkResult(ctx, stepResult) {
    ctx.public.result = stepResult;
    ctx.public.ok = true;
    ctx.public.isRealOk = true;
    ctx.public.error = undefined;
    return ctx;
}
export function setErrorResult(ctx, error) {
    ctx.public.result = undefined;
    ctx.public.error = error;
    ctx.public.isRealOk = false;
    ctx.public.ok = false;
    if (error.code !== undefined) {
        ctx.public.cmdCode = error.code;
        ctx.public.cmdError = error.message;
        ctx.public.cmdOk = false;
        ctx.public.cmdResult = undefined;
    }
    return ctx;
}
class Sample {
    constructor(args){
    // do thi
    }
}
export async function runStep(ctx, step) {
    // const currentStepType = ctx.currentStepType;
    const { reporter  } = step;
    // clear temp state
    // if (currentStepType === StepType.Source) {
    //   reporter.debug(
    //     `Source Options: ${JSON.stringify(step, null, 2)}`,
    //   );
    // } else if (currentStepType === StepType.Filter) {
    //   reporter.debug(
    //     `Filter Options: ${JSON.stringify(step, null, 2)}`,
    //   );
    // } else if (currentStepType === StepType.Step) {
    //   reporter.debug(
    //     `Step receive item: ${JSON.stringify(ctx.public.item, null, 2)}`,
    //   );
    //   reporter.debug(
    //     `Step Options: ${JSON.stringify(step, null, 2)}`,
    //   );
    // }
    // parse env to env
    if (step.env) {
        for(const key in step.env){
            const value = step.env[key];
            if (typeof value === "string") {
                const debugEnvPermmision = {
                    name: "env",
                    variable: key
                };
                if (await hasPermissionSlient(debugEnvPermmision)) {
                    Deno.env.set(key, value);
                }
            }
        }
    }
    let stepResult;
    try {
        const from = step.from;
        let use;
        const args = step.args || [];
        if (from) {
            const lib = await getFrom(ctx, from, reporter);
            use = get(lib, step.use ?? "default");
            if (step.use && !use) {
                // try to get use from default
                use = get(lib.default, step.use);
            }
            if (step.use && !use) {
                throw new Error(`Can not get use module: ${step.use}`);
            }
        } else if (step.use && typeof globalThis[step.use] === "function") {
            // TODO check default app
            use = globalThis[step.use];
        } else if (step.use && step.use.startsWith("Deno.")) {
            const denoApiMethod = step.use.replace("Deno.", "");
            use = get(Deno, denoApiMethod);
        } else if (step.use) {
            throw new Error(`${step.use} is not a function`);
        }
        if (use && isClass(use)) {
            reporter.debug(`Run ${use.name} instance with args: ${JSON.stringify(args, null, 2)}`);
            // @ts-ignore: Unreachable code error
            stepResult = await new use(...args);
            ctx = setOkResult(ctx, stepResult);
            reporter.debug(`use: result: ${typeof stepResult === "string" ? stepResult : JSON.stringify(stepResult, null, 2)}`);
        } else if (typeof use === "function") {
            reporter.debug(`Run function ${use.name} with args: ${JSON.stringify(args, null, 2)}`);
            stepResult = await use(...args);
            ctx = setOkResult(ctx, stepResult);
            reporter.debug(`use: result: ${typeof stepResult === "string" ? stepResult : JSON.stringify(stepResult, null, 2)}`);
        } else if (use !== undefined) {
            const e = "`use` must be a function, but got " + typeof use;
            throw new Error(e);
        }
    } catch (e) {
        reporter.warning(`Failed to run use`);
        throw e;
    }
    // check if then
    if (step.run) {
        // run then
        try {
            const scriptResult = await runScript(step.run, {
                ctx: ctx.public
            });
            stepResult = scriptResult.result;
            ctx = setOkResult(ctx, stepResult);
            ctx.public.state = scriptResult.ctx.state;
            reporter.debug(`Result: ${typeof stepResult === "string" ? stepResult : JSON.stringify(stepResult, null, 2)}`, "Success run script");
        } catch (e) {
            reporter.warning(`Failed to run script`);
            throw e;
        }
    }
    ctx.public.ok = true;
    return ctx;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvcnVuLXN0ZXAudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RlcE9wdGlvbnMsIFN0ZXBSZXNwb25zZSB9IGZyb20gXCIuL2ludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCIuL2ludGVybmFsLWludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgbG9nIH0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmltcG9ydCB7IGdldCB9IGZyb20gXCIuL3V0aWxzL2dldC50c1wiO1xuaW1wb3J0IHsgZ2V0RnJvbSB9IGZyb20gXCIuL2dldC1mcm9tLnRzXCI7XG5pbXBvcnQgeyBydW5TY3JpcHQgfSBmcm9tIFwiLi91dGlscy9ydW4tc2NyaXB0LnRzXCI7XG5pbXBvcnQgeyBpc0NsYXNzIH0gZnJvbSBcIi4vdXRpbHMvb2JqZWN0LnRzXCI7XG5pbXBvcnQgeyBoYXNQZXJtaXNzaW9uU2xpZW50IH0gZnJvbSBcIi4vcGVybWlzc2lvbi50c1wiO1xuXG5pbnRlcmZhY2UgUnVuU3RlcE9wdGlvbiBleHRlbmRzIFN0ZXBPcHRpb25zIHtcbiAgcmVwb3J0ZXI6IGxvZy5Mb2dnZXI7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RlcFJlc3BvbnNlKGN0eDogQ29udGV4dCk6IFN0ZXBSZXNwb25zZSB7XG4gIHJldHVybiB7XG4gICAgcmVzdWx0OiBjdHgucHVibGljLnJlc3VsdCxcbiAgICBvazogY3R4LnB1YmxpYy5vayEsXG4gICAgaXNSZWFsT2s6IGN0eC5wdWJsaWMuaXNSZWFsT2shLFxuICAgIGVycm9yOiBjdHgucHVibGljLmVycm9yLFxuICAgIGNtZFJlc3VsdDogY3R4LnB1YmxpYy5jbWRSZXN1bHQsXG4gICAgY21kQ29kZTogY3R4LnB1YmxpYy5jbWRDb2RlLFxuICAgIGNtZE9rOiBjdHgucHVibGljLmNtZE9rLFxuICAgIGNtZEVycm9yOiBjdHgucHVibGljLmNtZEVycm9yLFxuICB9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNldE9rUmVzdWx0KGN0eDogQ29udGV4dCwgc3RlcFJlc3VsdDogdW5rbm93bik6IENvbnRleHQge1xuICBjdHgucHVibGljLnJlc3VsdCA9IHN0ZXBSZXN1bHQ7XG4gIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICBjdHgucHVibGljLmlzUmVhbE9rID0gdHJ1ZTtcbiAgY3R4LnB1YmxpYy5lcnJvciA9IHVuZGVmaW5lZDtcbiAgcmV0dXJuIGN0eDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZXRFcnJvclJlc3VsdChjdHg6IENvbnRleHQsIGVycm9yOiB1bmtub3duKTogQ29udGV4dCB7XG4gIGN0eC5wdWJsaWMucmVzdWx0ID0gdW5kZWZpbmVkO1xuICBjdHgucHVibGljLmVycm9yID0gZXJyb3I7XG4gIGN0eC5wdWJsaWMuaXNSZWFsT2sgPSBmYWxzZTtcbiAgY3R4LnB1YmxpYy5vayA9IGZhbHNlO1xuICBpZiAoKGVycm9yIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5jb2RlICE9PSB1bmRlZmluZWQpIHtcbiAgICBjdHgucHVibGljLmNtZENvZGUgPSAoZXJyb3IgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLmNvZGUgYXMgbnVtYmVyO1xuICAgIGN0eC5wdWJsaWMuY21kRXJyb3IgPSAoZXJyb3IgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLm1lc3NhZ2UgYXMgc3RyaW5nO1xuICAgIGN0eC5wdWJsaWMuY21kT2sgPSBmYWxzZTtcbiAgICBjdHgucHVibGljLmNtZFJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gY3R4O1xufVxuXG5jbGFzcyBTYW1wbGUge1xuICBjb25zdHJ1Y3RvcihhcmdzOiBzdHJpbmcpIHtcbiAgICAvLyBkbyB0aGlcbiAgfVxufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blN0ZXAoXG4gIGN0eDogQ29udGV4dCxcbiAgc3RlcDogUnVuU3RlcE9wdGlvbixcbik6IFByb21pc2U8Q29udGV4dD4ge1xuICAvLyBjb25zdCBjdXJyZW50U3RlcFR5cGUgPSBjdHguY3VycmVudFN0ZXBUeXBlO1xuICBjb25zdCB7IHJlcG9ydGVyIH0gPSBzdGVwO1xuICAvLyBjbGVhciB0ZW1wIHN0YXRlXG4gIC8vIGlmIChjdXJyZW50U3RlcFR5cGUgPT09IFN0ZXBUeXBlLlNvdXJjZSkge1xuICAvLyAgIHJlcG9ydGVyLmRlYnVnKFxuICAvLyAgICAgYFNvdXJjZSBPcHRpb25zOiAke0pTT04uc3RyaW5naWZ5KHN0ZXAsIG51bGwsIDIpfWAsXG4gIC8vICAgKTtcbiAgLy8gfSBlbHNlIGlmIChjdXJyZW50U3RlcFR5cGUgPT09IFN0ZXBUeXBlLkZpbHRlcikge1xuICAvLyAgIHJlcG9ydGVyLmRlYnVnKFxuICAvLyAgICAgYEZpbHRlciBPcHRpb25zOiAke0pTT04uc3RyaW5naWZ5KHN0ZXAsIG51bGwsIDIpfWAsXG4gIC8vICAgKTtcbiAgLy8gfSBlbHNlIGlmIChjdXJyZW50U3RlcFR5cGUgPT09IFN0ZXBUeXBlLlN0ZXApIHtcbiAgLy8gICByZXBvcnRlci5kZWJ1ZyhcbiAgLy8gICAgIGBTdGVwIHJlY2VpdmUgaXRlbTogJHtKU09OLnN0cmluZ2lmeShjdHgucHVibGljLml0ZW0sIG51bGwsIDIpfWAsXG4gIC8vICAgKTtcbiAgLy8gICByZXBvcnRlci5kZWJ1ZyhcbiAgLy8gICAgIGBTdGVwIE9wdGlvbnM6ICR7SlNPTi5zdHJpbmdpZnkoc3RlcCwgbnVsbCwgMil9YCxcbiAgLy8gICApO1xuICAvLyB9XG5cbiAgLy8gcGFyc2UgZW52IHRvIGVudlxuICBpZiAoc3RlcC5lbnYpIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBzdGVwLmVudikge1xuICAgICAgY29uc3QgdmFsdWUgPSBzdGVwLmVudltrZXldO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBjb25zdCBkZWJ1Z0VudlBlcm1taXNpb24gPSB7IG5hbWU6IFwiZW52XCIsIHZhcmlhYmxlOiBrZXkgfSBhcyBjb25zdDtcbiAgICAgICAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoZGVidWdFbnZQZXJtbWlzaW9uKSkge1xuICAgICAgICAgIERlbm8uZW52LnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBsZXQgc3RlcFJlc3VsdDtcblxuICB0cnkge1xuICAgIGNvbnN0IGZyb20gPSBzdGVwLmZyb207XG4gICAgbGV0IHVzZTtcbiAgICBjb25zdCBhcmdzID0gc3RlcC5hcmdzIHx8IFtdO1xuXG4gICAgaWYgKGZyb20pIHtcbiAgICAgIGNvbnN0IGxpYiA9IGF3YWl0IGdldEZyb20oY3R4LCBmcm9tLCByZXBvcnRlcik7XG5cbiAgICAgIHVzZSA9IGdldChsaWIsIHN0ZXAudXNlID8/IFwiZGVmYXVsdFwiKTtcbiAgICAgIGlmIChzdGVwLnVzZSAmJiAhdXNlKSB7XG4gICAgICAgIC8vIHRyeSB0byBnZXQgdXNlIGZyb20gZGVmYXVsdFxuICAgICAgICB1c2UgPSBnZXQobGliLmRlZmF1bHQsIHN0ZXAudXNlISk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGVwLnVzZSAmJiAhdXNlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBnZXQgdXNlIG1vZHVsZTogJHtzdGVwLnVzZX1gKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFxuICAgICAgc3RlcC51c2UgJiZcbiAgICAgIHR5cGVvZiAoZ2xvYmFsVGhpcyBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbc3RlcC51c2VdID09PSBcImZ1bmN0aW9uXCJcbiAgICApIHtcbiAgICAgIC8vIFRPRE8gY2hlY2sgZGVmYXVsdCBhcHBcbiAgICAgIHVzZSA9IChnbG9iYWxUaGlzIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtzdGVwLnVzZV07XG4gICAgfSBlbHNlIGlmIChzdGVwLnVzZSAmJiBzdGVwLnVzZS5zdGFydHNXaXRoKFwiRGVuby5cIikpIHtcbiAgICAgIGNvbnN0IGRlbm9BcGlNZXRob2QgPSBzdGVwLnVzZS5yZXBsYWNlKFwiRGVuby5cIiwgXCJcIik7XG4gICAgICB1c2UgPSBnZXQoRGVubywgZGVub0FwaU1ldGhvZCk7XG4gICAgfSBlbHNlIGlmIChzdGVwLnVzZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3N0ZXAudXNlfSBpcyBub3QgYSBmdW5jdGlvbmApO1xuICAgIH1cblxuICAgIGlmICh1c2UgJiYgaXNDbGFzcyh1c2UpKSB7XG4gICAgICByZXBvcnRlci5kZWJ1ZyhcbiAgICAgICAgYFJ1biAkeyh1c2UgYXMgKCkgPT4gYm9vbGVhbikubmFtZX0gaW5zdGFuY2Ugd2l0aCBhcmdzOiAke1xuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGFyZ3MsIG51bGwsIDIpXG4gICAgICAgIH1gLFxuICAgICAgKTtcblxuICAgICAgLy8gQHRzLWlnbm9yZTogVW5yZWFjaGFibGUgY29kZSBlcnJvclxuICAgICAgc3RlcFJlc3VsdCA9IGF3YWl0IG5ldyB1c2UoXG4gICAgICAgIC4uLmFyZ3MsXG4gICAgICApO1xuICAgICAgY3R4ID0gc2V0T2tSZXN1bHQoY3R4LCBzdGVwUmVzdWx0KTtcblxuICAgICAgcmVwb3J0ZXIuZGVidWcoXG4gICAgICAgIGB1c2U6IHJlc3VsdDogJHtcbiAgICAgICAgICB0eXBlb2Ygc3RlcFJlc3VsdCA9PT0gXCJzdHJpbmdcIlxuICAgICAgICAgICAgPyBzdGVwUmVzdWx0XG4gICAgICAgICAgICA6IEpTT04uc3RyaW5naWZ5KHN0ZXBSZXN1bHQsIG51bGwsIDIpXG4gICAgICAgIH1gLFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB1c2UgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcmVwb3J0ZXIuZGVidWcoXG4gICAgICAgIGBSdW4gZnVuY3Rpb24gJHt1c2UubmFtZX0gd2l0aCBhcmdzOiAke0pTT04uc3RyaW5naWZ5KGFyZ3MsIG51bGwsIDIpfWAsXG4gICAgICApO1xuXG4gICAgICBzdGVwUmVzdWx0ID0gYXdhaXQgdXNlKC4uLmFyZ3MpO1xuXG4gICAgICBjdHggPSBzZXRPa1Jlc3VsdChjdHgsIHN0ZXBSZXN1bHQpO1xuXG4gICAgICByZXBvcnRlci5kZWJ1ZyhcbiAgICAgICAgYHVzZTogcmVzdWx0OiAke1xuICAgICAgICAgIHR5cGVvZiBzdGVwUmVzdWx0ID09PSBcInN0cmluZ1wiXG4gICAgICAgICAgICA/IHN0ZXBSZXN1bHRcbiAgICAgICAgICAgIDogSlNPTi5zdHJpbmdpZnkoc3RlcFJlc3VsdCwgbnVsbCwgMilcbiAgICAgICAgfWAsXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAodXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGUgPSBcImB1c2VgIG11c3QgYmUgYSBmdW5jdGlvbiwgYnV0IGdvdCBcIiArIHR5cGVvZiB1c2U7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoZSk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgcmVwb3J0ZXIud2FybmluZyhcbiAgICAgIGBGYWlsZWQgdG8gcnVuIHVzZWAsXG4gICAgKTtcbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgLy8gY2hlY2sgaWYgdGhlblxuICBpZiAoc3RlcC5ydW4pIHtcbiAgICAvLyBydW4gdGhlblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzY3JpcHRSZXN1bHQgPSBhd2FpdCBydW5TY3JpcHQoc3RlcC5ydW4sIHtcbiAgICAgICAgY3R4OiBjdHgucHVibGljLFxuICAgICAgfSk7XG5cbiAgICAgIHN0ZXBSZXN1bHQgPSBzY3JpcHRSZXN1bHQucmVzdWx0O1xuICAgICAgY3R4ID0gc2V0T2tSZXN1bHQoY3R4LCBzdGVwUmVzdWx0KTtcbiAgICAgIGN0eC5wdWJsaWMuc3RhdGUgPSBzY3JpcHRSZXN1bHQuY3R4LnN0YXRlO1xuICAgICAgcmVwb3J0ZXIuZGVidWcoXG4gICAgICAgIGBSZXN1bHQ6ICR7XG4gICAgICAgICAgdHlwZW9mIHN0ZXBSZXN1bHQgPT09IFwic3RyaW5nXCJcbiAgICAgICAgICAgID8gc3RlcFJlc3VsdFxuICAgICAgICAgICAgOiBKU09OLnN0cmluZ2lmeShzdGVwUmVzdWx0LCBudWxsLCAyKVxuICAgICAgICB9YCxcbiAgICAgICAgXCJTdWNjZXNzIHJ1biBzY3JpcHRcIixcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgYEZhaWxlZCB0byBydW4gc2NyaXB0YCxcbiAgICAgICk7XG5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgY3R4LnB1YmxpYy5vayA9IHRydWU7XG4gIHJldHVybiBjdHg7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsU0FBUyxHQUFHLFFBQVEsaUJBQWlCO0FBQ3JDLFNBQVMsT0FBTyxRQUFRLGdCQUFnQjtBQUN4QyxTQUFTLFNBQVMsUUFBUSx3QkFBd0I7QUFDbEQsU0FBUyxPQUFPLFFBQVEsb0JBQW9CO0FBQzVDLFNBQVMsbUJBQW1CLFFBQVEsa0JBQWtCO0FBS3RELE9BQU8sU0FBUyxnQkFBZ0IsR0FBWSxFQUFnQjtJQUMxRCxPQUFPO1FBQ0wsUUFBUSxJQUFJLE1BQU0sQ0FBQyxNQUFNO1FBQ3pCLElBQUksSUFBSSxNQUFNLENBQUMsRUFBRTtRQUNqQixVQUFVLElBQUksTUFBTSxDQUFDLFFBQVE7UUFDN0IsT0FBTyxJQUFJLE1BQU0sQ0FBQyxLQUFLO1FBQ3ZCLFdBQVcsSUFBSSxNQUFNLENBQUMsU0FBUztRQUMvQixTQUFTLElBQUksTUFBTSxDQUFDLE9BQU87UUFDM0IsT0FBTyxJQUFJLE1BQU0sQ0FBQyxLQUFLO1FBQ3ZCLFVBQVUsSUFBSSxNQUFNLENBQUMsUUFBUTtJQUMvQjtBQUNGLENBQUM7QUFDRCxPQUFPLFNBQVMsWUFBWSxHQUFZLEVBQUUsVUFBbUIsRUFBVztJQUN0RSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUc7SUFDcEIsSUFBSSxNQUFNLENBQUMsRUFBRSxHQUFHLElBQUk7SUFDcEIsSUFBSSxNQUFNLENBQUMsUUFB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