import { hasPermissionSlient } from "./permission.ts";
import { StepType } from "./internal-interface.ts";
import { parseWorkflow } from "./parse-workflow.ts";
import { getContent } from "./utils/file.ts";
import { getFilesByFilter } from "./utils/filter.ts";
import { isObject } from "./utils/object.ts";
import { parseObject } from "./parse-object.ts";
import { isRemotePath } from "./utils/path.ts";
import { getStepResponse, runStep, setErrorResult } from "./run-step.ts";
import { filterCtxItems, getSourceItemsFromResult, } from "./get-source-items-from-result.ts";
import { config, delay, dirname, join, log, relative, SqliteDb, } from "../deps.ts";
import report, { getReporter } from "./report.ts";
import { Keydb } from "./adapters/json-store-adapter.ts";
import { filterSourceItems } from "./filter-source-items.ts";
import { markSourceItems } from "./mark-source-items.ts";
import { runCmd, setCmdOkResult } from "./run-cmd.ts";
import { getFinalRunOptions, getFinalSourceOptions, getFinalWorkflowOptions, } from "./default-options.ts";
import { runPost } from "./run-post.ts";
import { runAssert } from "./run-assert.ts";
export async function run(runOptions) {
    const debugEnvPermmision = { name: "env", variable: "DEBUG" };
    const dataPermission = { name: "read", path: "data" };
    let DebugEnvValue = undefined;
    if (await hasPermissionSlient(debugEnvPermmision)) {
        DebugEnvValue = Deno.env.get("DEBUG");
    }
    let isDebug = !!(DebugEnvValue !== undefined && DebugEnvValue !== "false");
    const cliWorkflowOptions = getFinalRunOptions(runOptions, isDebug);
    isDebug = cliWorkflowOptions.debug || false;
    const { files, content, } = cliWorkflowOptions;
    let workflowFiles = [];
    const cwd = Deno.cwd();
    if (content) {
        workflowFiles = [];
    }
    else {
        workflowFiles = await getFilesByFilter(cwd, files);
    }
    let env = {};
    const allEnvPermmision = { name: "env" };
    const dotEnvFilePermmision = {
        name: "read",
        path: ".env,.env.defaults,.env.example",
    };
    if (await hasPermissionSlient(dotEnvFilePermmision)) {
        env = config();
    }
    if (await hasPermissionSlient(allEnvPermmision)) {
        env = {
            ...env,
            ...Deno.env.toObject(),
        };
    }
    let validWorkflows = [];
    if (content) {
        const workflow = parseWorkflow(content);
        if (isObject(workflow)) {
            const workflowFilePath = "/tmp/denoflow/tmp-workflow.yml";
            const workflowRelativePath = relative(cwd, workflowFilePath);
            validWorkflows.push({
                ctx: {
                    public: {
                        env,
                        workflowPath: workflowFilePath,
                        workflowRelativePath,
                        workflowCwd: dirname(workflowFilePath),
                        cwd: cwd,
                        sources: {},
                        steps: {},
                        state: undefined,
                        items: [],
                    },
                    itemSourceOptions: undefined,
                    sourcesOptions: [],
                    currentStepType: StepType.Source,
                },
                workflow: workflow,
            });
        }
    }
    const errors = [];
    for (let i = 0; i < workflowFiles.length; i++) {
        const workflowRelativePath = workflowFiles[i];
        let fileContent = "";
        let workflowFilePath = "";
        if (isRemotePath(workflowRelativePath)) {
            const netContent = await fetch(workflowRelativePath);
            workflowFilePath = workflowRelativePath;
            fileContent = await netContent.text();
        }
        else {
            workflowFilePath = join(cwd, workflowRelativePath);
            fileContent = await getContent(workflowFilePath);
        }
        const workflow = parseWorkflow(fileContent);
        if (!isObject(workflow)) {
            continue;
        }
        validWorkflows.push({
            ctx: {
                public: {
                    env,
                    workflowPath: workflowFilePath,
                    workflowRelativePath: workflowRelativePath,
                    workflowCwd: dirname(workflowFilePath),
                    cwd: cwd,
                    sources: {},
                    steps: {},
                    state: undefined,
                    items: [],
                },
                itemSourceOptions: undefined,
                sourcesOptions: [],
                currentStepType: StepType.Source,
            },
            workflow: workflow,
        });
    }
    validWorkflows = validWorkflows.sort((a, b) => {
        const aPath = a.ctx.public.workflowRelativePath;
        const bPath = b.ctx.public.workflowRelativePath;
        if (aPath < bPath) {
            return -1;
        }
        if (aPath > bPath) {
            return 1;
        }
        return 0;
    });
    report.info(` ${validWorkflows.length} valid workflows:\n${validWorkflows.map((item) => getReporterName(item.ctx)).join("\n")}\n`, "Success found");
    for (let workflowIndex = 0; workflowIndex < validWorkflows.length; workflowIndex++) {
        let { ctx, workflow } = validWorkflows[workflowIndex];
        const parsedWorkflowFileOptionsWithEnv = await parseObject(workflow, ctx, {
            keys: ["env"],
        });
        if (parsedWorkflowFileOptionsWithEnv.env) {
            for (const key in parsedWorkflowFileOptionsWithEnv.env) {
                const value = parsedWorkflowFileOptionsWithEnv.env[key];
                if (typeof value === "string") {
                    const debugEnvPermmision = { name: "env", variable: key };
                    if (await hasPermissionSlient(debugEnvPermmision)) {
                        Deno.env.set(key, value);
                    }
                }
            }
        }
        const parsedWorkflowGeneralOptionsWithGeneral = await parseObject(parsedWorkflowFileOptionsWithEnv, ctx, {
            keys: ["if", "debug", "database", "sleep", "limit", "force"],
        });
        const workflowOptions = getFinalWorkflowOptions(parsedWorkflowGeneralOptionsWithGeneral ||
            {}, cliWorkflowOptions);
        isDebug = workflowOptions.debug || false;
        const workflowReporter = getReporter(`${getReporterName(ctx)}`, isDebug);
        if (workflowOptions?.if === false) {
            workflowReporter.info(`because if condition is false`, "Skip workflow");
            continue;
        }
        else {
            workflowReporter.info(``, "Start handle workflow");
        }
        ctx.public.options = workflowOptions;
        const database = workflowOptions.database;
        let db;
        if (database?.startsWith("sqlite")) {
            db = new SqliteDb(database);
        }
        else {
            let namespace = ctx.public.workflowRelativePath;
            if (namespace.startsWith("..")) {
                namespace = `@denoflowRoot${ctx.public.workflowPath}`;
            }
            db = new Keydb(database, {
                namespace: namespace,
            });
        }
        ctx.db = db;
        let state;
        let internalState = {
            keys: [],
        };
        if (await hasPermissionSlient(dataPermission)) {
            state = await db.get("state") || undefined;
            internalState = await db.get("internalState") || {
                keys: [],
            };
        }
        ctx.public.state = state;
        ctx.internalState = internalState;
        ctx.initState = JSON.stringify(state);
        ctx.initInternalState = JSON.stringify(internalState);
        const sources = workflow.sources;
        try {
            if (sources) {
                workflowReporter.info("", "Start get sources");
                for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
                    const source = sources[sourceIndex];
                    ctx.public.sourceIndex = sourceIndex;
                    const sourceReporter = getReporter(`${getReporterName(ctx)} -> source:${ctx.public.sourceIndex}`, isDebug);
                    let sourceOptions = {
                        ...source,
                    };
                    try {
                        sourceOptions = await parseObject(source, ctx, {
                            keys: ["env"],
                        });
                        sourceOptions = await parseObject(sourceOptions, ctx, {
                            keys: ["if", "debug"],
                        });
                        if (sourceOptions?.debug || ctx.public.options?.debug) {
                            sourceReporter.level = log.LogLevels.DEBUG;
                        }
                        if (sourceOptions.if === false) {
                            sourceReporter.info(`because if condition is false`, "Skip source");
                        }
                        sourceOptions = await parseObject(sourceOptions, {
                            ...ctx,
                            public: {
                                ...ctx.public,
                                env: {
                                    ...ctx.public.env,
                                    ...sourceOptions.env,
                                },
                            },
                        });
                        sourceOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, sourceOptions);
                        isDebug = sourceOptions.debug || false;
                        ctx.sourcesOptions.push(sourceOptions);
                        if (sourceOptions.if === false) {
                            ctx.public.result = undefined;
                            ctx.public.ok = true;
                            ctx.public.error = undefined;
                            ctx.public.cmdResult = undefined;
                            ctx.public.cmdCode = undefined;
                            ctx.public.cmdOk = true;
                            ctx.public.isRealOk = true;
                            ctx.public.sources[sourceIndex] = getStepResponse(ctx);
                            if (sourceOptions.id) {
                                ctx.public.sources[sourceOptions.id] =
                                    ctx.public.sources[sourceIndex];
                            }
                            continue;
                        }
                        ctx = await runStep(ctx, {
                            reporter: sourceReporter,
                            ...sourceOptions,
                        });
                        ctx = await getSourceItemsFromResult(ctx, {
                            ...sourceOptions,
                            reporter: sourceReporter,
                        });
                        if (sourceOptions.reverse) {
                            ctx.public.items = ctx.public.items.reverse();
                        }
                        ctx = await filterSourceItems(ctx, sourceReporter);
                        if (sourceOptions.cmd) {
                            const cmdResult = await runCmd(ctx, sourceOptions.cmd);
                            ctx = setCmdOkResult(ctx, cmdResult.stdout);
                        }
                        ctx = markSourceItems(ctx);
                        ctx.public.sources[sourceIndex] = getStepResponse(ctx);
                        if (sourceOptions.id) {
                            ctx.public.sources[sourceOptions.id] =
                                ctx.public.sources[sourceIndex];
                        }
                        if (sourceOptions.assert) {
                            ctx = await runAssert(ctx, {
                                reporter: sourceReporter,
                                ...sourceOptions,
                            });
                        }
                        if (ctx.public.items.length > 0) {
                            sourceReporter.info("", `Source ${sourceIndex} get ${ctx.public.items.length} items`);
                        }
                        if (sourceOptions.post) {
                            await runPost(ctx, {
                                reporter: sourceReporter,
                                ...sourceOptions,
                            });
                        }
                    }
                    catch (e) {
                        ctx = setErrorResult(ctx, e);
                        ctx.public.sources[sourceIndex] = getStepResponse(ctx);
                        if (source.id) {
                            ctx.public.sources[source.id] = ctx.public.sources[sourceIndex];
                        }
                        if (source.continueOnError) {
                            ctx.public.ok = true;
                            sourceReporter.warning(`Failed run source`);
                            sourceReporter.warning(e);
                            sourceReporter.warning(`Ignore this error, because continueOnError is true.`);
                            break;
                        }
                        else {
                            sourceReporter.error(`Failed run source`);
                            throw e;
                        }
                    }
                    if (sourceOptions.sleep && sourceOptions.sleep > 0) {
                        sourceReporter.info(`${sourceOptions.sleep} seconds`, "Sleep");
                        await delay(sourceOptions.sleep * 1000);
                    }
                }
            }
            if (sources) {
                let collectCtxItems = [];
                sources.forEach((_, theSourceIndex) => {
                    if (Array.isArray(ctx.public.sources[theSourceIndex].result)) {
                        collectCtxItems = collectCtxItems.concat(ctx.public.sources[theSourceIndex].result);
                    }
                });
                ctx.public.items = collectCtxItems;
                if (ctx.public.items.length > 0) {
                    workflowReporter.info(`Total ${ctx.public.items.length} items`, "Finish get sources");
                }
            }
            if (ctx.public.items.length === 0) {
                workflowReporter.info(`because no any valid sources items returned`, "Skip workflow");
                continue;
            }
            const filter = workflow.filter;
            if (filter) {
                ctx.currentStepType = StepType.Filter;
                const filterReporter = getReporter(`${getReporterName(ctx)} -> filter`, isDebug);
                let filterOptions = { ...filter };
                try {
                    filterOptions = await parseObject(filter, ctx, {
                        keys: ["env"],
                    });
                    filterOptions = await parseObject(filterOptions, ctx, {
                        keys: ["if", "debug"],
                    });
                    if (filterOptions?.debug || ctx.public.options?.debug) {
                        filterReporter.level = log.LogLevels.DEBUG;
                    }
                    if (filterOptions.if === false) {
                        filterReporter.info(`because if condition is false`, "Skip filter");
                    }
                    filterOptions = await parseObject(filterOptions, {
                        ...ctx,
                        public: {
                            ...ctx.public,
                            env: {
                                ...ctx.public.env,
                                ...filterOptions.env,
                            },
                        },
                    });
                    filterOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, filterOptions);
                    isDebug = filterOptions.debug || false;
                    if (filterOptions.if === false) {
                        continue;
                    }
                    filterReporter.info("", "Start handle filter");
                    ctx = await runStep(ctx, {
                        reporter: filterReporter,
                        ...filterOptions,
                    });
                    if (Array.isArray(ctx.public.result) &&
                        ctx.public.result.length === ctx.public.items.length) {
                        ctx.public.items = ctx.public.items.filter((_item, index) => {
                            return !!(ctx.public.result[index]);
                        });
                        ctx.public.result = ctx.public.items;
                    }
                    else if (filterOptions.run || filterOptions.use) {
                        filterReporter.error(`Failed to run filter script`);
                        throw new Error("Invalid filter step result, result must be array , boolean[], which array length must be equal to ctx.items length");
                    }
                    if (filterOptions.cmd) {
                        const cmdResult = await runCmd(ctx, filterOptions.cmd);
                        ctx = setCmdOkResult(ctx, cmdResult.stdout);
                    }
                    ctx.public.filter = getStepResponse(ctx);
                    ctx = filterCtxItems(ctx, {
                        ...filterOptions,
                        reporter: filterReporter,
                    });
                    if (filterOptions.assert) {
                        ctx = await runAssert(ctx, {
                            reporter: filterReporter,
                            ...filterOptions,
                        });
                    }
                    if (filterOptions.post) {
                        await runPost(ctx, {
                            reporter: filterReporter,
                            ...filterOptions,
                        });
                    }
                }
                catch (e) {
                    ctx = setErrorResult(ctx, e);
                    ctx.public.filter = getStepResponse(ctx);
                    if (filter.continueOnError) {
                        ctx.public.ok = true;
                        filterReporter.warning(`Failed to run filter`);
                        filterReporter.warning(e);
                        filterReporter.warning(`Ignore this error, because continueOnError is true.`);
                        break;
                    }
                    else {
                        filterReporter.error(`Failed to run filter`);
                        throw e;
                    }
                }
                filterReporter.info(`Total ${ctx.public.items.length} items`, "Finish handle filter");
                if (filterOptions.sleep && filterOptions.sleep > 0) {
                    filterReporter.info(`${filterOptions.sleep} seconds`, "Sleep");
                    await delay(filterOptions.sleep * 1000);
                }
            }
            ctx.currentStepType = StepType.Step;
            for (let index = 0; index < ctx.public.items.length; index++) {
                ctx.public.itemIndex = index;
                ctx.public.item = ctx.public.items[index];
                if (ctx.public.item &&
                    ctx.public.item["@denoflowKey"]) {
                    ctx.public.itemKey =
                        ctx.public.item["@denoflowKey"];
                }
                else if (isObject(ctx.public.item)) {
                    ctx.public.itemKey = undefined;
                    workflowReporter.warning(`Can not found internal item key \`@denoflowKey\`, maybe you changed the item format. Missing this key, denoflow can not store the unique key state. Fix this, Try not change the reference item, only change the property you need to change. Try to manual adding a \`@denoflowKey\` as item unique key.`);
                }
                else {
                    ctx.public.itemKey = undefined;
                }
                if (ctx.public.item &&
                    (ctx.public.item["@denoflowSourceIndex"]) >= 0) {
                    ctx.public.itemSourceIndex =
                        (ctx.public.item["@denoflowSourceIndex"]);
                    ctx.itemSourceOptions =
                        ctx.sourcesOptions[ctx.public.itemSourceIndex];
                }
                else if (isObject(ctx.public.item)) {
                    ctx.itemSourceOptions = undefined;
                    workflowReporter.warning(`Can not found internal item key \`@denoflowSourceIndex\`, maybe you changed the item format. Try not change the reference item, only change the property you need to change. Try to manual adding a \`@denoflowKey\` as item unique key.`);
                }
                else {
                    ctx.itemSourceOptions = undefined;
                }
                const itemReporter = getReporter(`${getReporterName(ctx)} -> item:${index}`, isDebug);
                if (ctx.public.options?.debug) {
                    itemReporter.level = log.LogLevels.DEBUG;
                }
                if (!workflow.steps) {
                    workflow.steps = [];
                }
                else {
                    itemReporter.info(``, "Start run steps");
                    itemReporter.debug(`${JSON.stringify(ctx.public.item, null, 2)}`);
                }
                for (let j = 0; j < workflow.steps.length; j++) {
                    const step = workflow.steps[j];
                    ctx.public.stepIndex = j;
                    const stepReporter = getReporter(`${getReporterName(ctx)} -> step:${ctx.public.stepIndex}`, isDebug);
                    let stepOptions = { ...step };
                    try {
                        stepOptions = await parseObject(stepOptions, ctx, {
                            keys: ["env"],
                        });
                        stepOptions = await parseObject(stepOptions, ctx, {
                            keys: ["if", "debug"],
                        });
                        if (stepOptions.debug || ctx.public.options?.debug) {
                            stepReporter.level = log.LogLevels.DEBUG;
                        }
                        if (stepOptions.if === false) {
                            stepReporter.info(`because if condition is false`, "Skip step");
                        }
                        stepOptions = await parseObject(stepOptions, {
                            ...ctx,
                            public: {
                                ...ctx.public,
                                env: {
                                    ...ctx.public.env,
                                    ...stepOptions.env,
                                },
                            },
                        });
                        stepOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, stepOptions);
                        isDebug = stepOptions.debug || false;
                        stepReporter.debug(`Start run this step.`);
                        if (stepOptions.if === false) {
                            ctx.public.result = undefined;
                            ctx.public.ok = true;
                            ctx.public.error = undefined;
                            ctx.public.cmdResult = undefined;
                            ctx.public.cmdCode = undefined;
                            ctx.public.cmdOk = true;
                            ctx.public.isRealOk = true;
                            ctx.public.steps[j] = getStepResponse(ctx);
                            if (step.id) {
                                ctx.public.steps[step.id] = ctx.public.steps[j];
                            }
                            continue;
                        }
                        ctx = await runStep(ctx, {
                            ...stepOptions,
                            reporter: stepReporter,
                        });
                        if (stepOptions.cmd) {
                            const cmdResult = await runCmd(ctx, stepOptions.cmd);
                            ctx = setCmdOkResult(ctx, cmdResult.stdout);
                        }
                        ctx.public.steps[j] = getStepResponse(ctx);
                        if (step.id) {
                            ctx.public.steps[step.id] = ctx.public.steps[j];
                        }
                        stepReporter.debug(`Finish to run this step.`);
                    }
                    catch (e) {
                        ctx.public.steps[j] = getStepResponse(ctx);
                        if (step.id) {
                            ctx.public.steps[step.id] = ctx.public.steps[j];
                        }
                        if (step.continueOnError) {
                            ctx.public.ok = true;
                            stepReporter.warning(`Failed to run step`);
                            stepReporter.warning(e);
                            stepReporter.warning(`Ignore this error, because continueOnError is true.`);
                            break;
                        }
                        else {
                            stepReporter.error(`Failed to run step`);
                            throw e;
                        }
                    }
                    if (stepOptions.assert) {
                        await runAssert(ctx, {
                            reporter: stepReporter,
                            ...stepOptions,
                        });
                    }
                    if (stepOptions.post) {
                        await runPost(ctx, {
                            reporter: stepReporter,
                            ...stepOptions,
                        });
                    }
                    stepReporter.info("", "Finish run step " + j);
                    if (stepOptions.sleep && stepOptions.sleep > 0) {
                        stepReporter.info(`${stepOptions.sleep} seconds`, "Sleep");
                        await delay(stepOptions.sleep * 1000);
                    }
                }
                if (ctx.itemSourceOptions && !ctx.itemSourceOptions.force) {
                    if (!ctx.internalState || !ctx.internalState.keys) {
                        ctx.internalState.keys = [];
                    }
                    if (ctx.public.itemKey &&
                        !ctx.internalState.keys.includes(ctx.public.itemKey)) {
                        ctx.internalState.keys.unshift(ctx.public.itemKey);
                    }
                    if (ctx.internalState.keys.length > 1000) {
                        ctx.internalState.keys = ctx.internalState.keys.slice(0, 1000);
                    }
                }
                if (workflow.steps.length > 0) {
                    itemReporter.info(``, `Finish run steps`);
                }
            }
            const post = workflow.post;
            if (post) {
                const postReporter = getReporter(`${getReporterName(ctx)} -> post`, isDebug);
                let postOptions = { ...post };
                try {
                    postOptions = await parseObject(postOptions, ctx, {
                        keys: ["env"],
                    });
                    postOptions = await parseObject(postOptions, ctx, {
                        keys: ["if", "debug"],
                    });
                    if (postOptions.debug || ctx.public.options?.debug) {
                        postReporter.level = log.LogLevels.DEBUG;
                    }
                    if (postOptions.if === false) {
                        postReporter.info(`because if condition is false`, "Skip post");
                        continue;
                    }
                    postOptions = await parseObject(postOptions, {
                        ...ctx,
                        public: {
                            ...ctx.public,
                            env: {
                                ...ctx.public.env,
                                ...postOptions.env,
                            },
                        },
                    });
                    postOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, postOptions);
                    isDebug = postOptions.debug || false;
                    postReporter.info(`Start run post.`);
                    ctx = await runStep(ctx, {
                        ...postOptions,
                        reporter: postReporter,
                    });
                    if (postOptions.cmd) {
                        const cmdResult = await runCmd(ctx, postOptions.cmd);
                        ctx = setCmdOkResult(ctx, cmdResult.stdout);
                    }
                    postReporter.debug(`Finish to run post.`);
                }
                catch (e) {
                    if (post.continueOnError) {
                        ctx.public.ok = true;
                        postReporter.warning(`Failed to run post`);
                        postReporter.warning(e);
                        postReporter.warning(`Ignore this error, because continueOnError is true.`);
                        break;
                    }
                    else {
                        postReporter.error(`Failed to run post`);
                        throw e;
                    }
                }
                if (postOptions.assert) {
                    await runAssert(ctx, {
                        reporter: postReporter,
                        ...postOptions,
                    });
                }
                if (postOptions.post) {
                    await runPost(ctx, {
                        reporter: postReporter,
                        ...postOptions,
                    });
                }
                postReporter.info("", "Finish run post ");
                if (postOptions.sleep && postOptions.sleep > 0) {
                    postReporter.info(`${postOptions.sleep} seconds`, "Sleep");
                    await delay(postOptions.sleep * 1000);
                }
            }
            const currentState = JSON.stringify(ctx.public.state);
            const currentInternalState = JSON.stringify(ctx.internalState);
            if (currentState !== ctx.initState) {
                workflowReporter.debug(`Save state`);
                await ctx.db.set("state", ctx.public.state);
            }
            else {
            }
            if (currentInternalState !== ctx.initInternalState) {
                workflowReporter.debug(`Save internal state`);
                await ctx.db.set("internalState", ctx.internalState);
            }
            else {
            }
            workflowReporter.info(``, "Finish workflow");
        }
        catch (e) {
            workflowReporter.error(`Failed to run this workflow`);
            workflowReporter.error(e);
            if (validWorkflows.length > workflowIndex + 1) {
                workflowReporter.debug("workflow", "Start next workflow");
            }
            errors.push({
                ctx,
                error: e,
            });
        }
        console.log("\n");
    }
    if (errors.length > 0) {
        report.error("Error details:");
        errors.forEach((error) => {
            report.error(`Run ${getReporterName(error.ctx)} failed, error: `);
            report.error(error.error);
        });
        throw new Error(`Failed to run this time`);
    }
}
function getReporterName(ctx) {
    const relativePath = ctx.public.workflowRelativePath;
    const absolutePath = ctx.public.workflowPath;
    if (relativePath.startsWith("..")) {
        return absolutePath;
    }
    else {
        return relativePath;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuLXdvcmtmbG93cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bi13b3JrZmxvd3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBT0EsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdEQsT0FBTyxFQUFXLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3pFLE9BQU8sRUFDTCxjQUFjLEVBQ2Qsd0JBQXdCLEdBQ3pCLE1BQU0sbUNBQW1DLENBQUM7QUFDM0MsT0FBTyxFQUNMLE1BQU0sRUFDTixLQUFLLEVBQ0wsT0FBTyxFQUNQLElBQUksRUFDSixHQUFHLEVBQ0gsUUFBUSxFQUNSLFFBQVEsR0FDVCxNQUFNLFlBQVksQ0FBQztBQUNwQixPQUFPLE1BQU0sRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNsRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sY0FB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QyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7S0FDNUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsR0FBWTtJQUNuQyxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDO0lBQ3JELE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDO0lBQzdDLElBQUksWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNqQyxPQUFPLFlBQVksQ0FBQztLQUNyQjtTQUFNO1FBQ0wsT0FBTyxZQUFZLENBQUM7S0FDckI7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgRmlsdGVyT3B0aW9ucyxcbiAgUnVuV29ya2Zsb3dPcHRpb25zLFxuICBTb3VyY2VPcHRpb25zLFxuICBTdGVwT3B0aW9ucyxcbiAgV29ya2Zsb3dPcHRpb25zLFxufSBmcm9tIFwiLi9pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7IGhhc1Blcm1pc3Npb25TbGllbnQgfSBmcm9tIFwiLi9wZXJtaXNzaW9uLnRzXCI7XG5pbXBvcnQgeyBDb250ZXh0LCBTdGVwVHlwZSB9IGZyb20gXCIuL2ludGVybmFsLWludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgcGFyc2VXb3JrZmxvdyB9IGZyb20gXCIuL3BhcnNlLXdvcmtmbG93LnRzXCI7XG5pbXBvcnQgeyBnZXRDb250ZW50IH0gZnJvbSBcIi4vdXRpbHMvZmlsZS50c1wiO1xuaW1wb3J0IHsgZ2V0RmlsZXNCeUZpbHRlciB9IGZyb20gXCIuL3V0aWxzL2ZpbHRlci50c1wiO1xuaW1wb3J0IHsgaXNPYmplY3QgfSBmcm9tIFwiLi91dGlscy9vYmplY3QudHNcIjtcbmltcG9ydCB7IHBhcnNlT2JqZWN0IH0gZnJvbSBcIi4vcGFyc2Utb2JqZWN0LnRzXCI7XG5pbXBvcnQgeyBpc1JlbW90ZVBhdGggfSBmcm9tIFwiLi91dGlscy9wYXRoLnRzXCI7XG5pbXBvcnQgeyBnZXRTdGVwUmVzcG9uc2UsIHJ1blN0ZXAsIHNldEVycm9yUmVzdWx0IH0gZnJvbSBcIi4vcnVuLXN0ZXAudHNcIjtcbmltcG9ydCB7XG4gIGZpbHRlckN0eEl0ZW1zLFxuICBnZXRTb3VyY2VJdGVtc0Zyb21SZXN1bHQsXG59IGZyb20gXCIuL2dldC1zb3VyY2UtaXRlbXMtZnJvbS1yZXN1bHQudHNcIjtcbmltcG9ydCB7XG4gIGNvbmZpZyxcbiAgZGVsYXksXG4gIGRpcm5hbWUsXG4gIGpvaW4sXG4gIGxvZyxcbiAgcmVsYXRpdmUsXG4gIFNxbGl0ZURiLFxufSBmcm9tIFwiLi4vZGVwcy50c1wiO1xuaW1wb3J0IHJlcG9ydCwgeyBnZXRSZXBvcnRlciB9IGZyb20gXCIuL3JlcG9ydC50c1wiO1xuaW1wb3J0IHsgS2V5ZGIgfSBmcm9tIFwiLi9hZGFwdGVycy9qc29uLXN0b3JlLWFkYXB0ZXIudHNcIjtcbmltcG9ydCB7IGZpbHRlclNvdXJjZUl0ZW1zIH0gZnJvbSBcIi4vZmlsdGVyLXNvdXJjZS1pdGVtcy50c1wiO1xuaW1wb3J0IHsgbWFya1NvdXJjZUl0ZW1zIH0gZnJvbSBcIi4vbWFyay1zb3VyY2UtaXRlbXMudHNcIjtcbmltcG9ydCB7IHJ1bkNtZCwgc2V0Q21kT2tSZXN1bHQgfSBmcm9tIFwiLi9ydW4tY21kLnRzXCI7XG5pbXBvcnQge1xuICBnZXRGaW5hbFJ1bk9wdGlvbnMsXG4gIGdldEZpbmFsU291cmNlT3B0aW9ucyxcbiAgZ2V0RmluYWxXb3JrZmxvd09wdGlvbnMsXG59IGZyb20gXCIuL2RlZmF1bHQtb3B0aW9ucy50c1wiO1xuaW1wb3J0IHsgcnVuUG9zdCB9IGZyb20gXCIuL3J1bi1wb3N0LnRzXCI7XG5pbXBvcnQgeyBydW5Bc3NlcnQgfSBmcm9tIFwiLi9ydW4tYXNzZXJ0LnRzXCI7XG5cbmludGVyZmFjZSBWYWxpZFdvcmtmbG93IHtcbiAgY3R4OiBDb250ZXh0O1xuICB3b3JrZmxvdzogV29ya2Zsb3dPcHRpb25zO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuKHJ1bk9wdGlvbnM6IFJ1bldvcmtmbG93T3B0aW9ucykge1xuICBjb25zdCBkZWJ1Z0VudlBlcm1taXNpb24gPSB7IG5hbWU6IFwiZW52XCIsIHZhcmlhYmxlOiBcIkRFQlVHXCIgfSBhcyBjb25zdDtcbiAgY29uc3QgZGF0YVBlcm1pc3Npb24gPSB7IG5hbWU6IFwicmVhZFwiLCBwYXRoOiBcImRhdGFcIiB9IGFzIGNvbnN0O1xuICBsZXQgRGVidWdFbnZWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoZGVidWdFbnZQZXJtbWlzaW9uKSkge1xuICAgIERlYnVnRW52VmFsdWUgPSBEZW5vLmVudi5nZXQoXCJERUJVR1wiKTtcbiAgfVxuICBsZXQgaXNEZWJ1ZyA9ICEhKERlYnVnRW52VmFsdWUgIT09IHVuZGVmaW5lZCAmJiBEZWJ1Z0VudlZhbHVlICE9PSBcImZhbHNlXCIpO1xuXG4gIGNvbnN0IGNsaVdvcmtmbG93T3B0aW9ucyA9IGdldEZpbmFsUnVuT3B0aW9ucyhydW5PcHRpb25zLCBpc0RlYnVnKTtcbiAgaXNEZWJ1ZyA9IGNsaVdvcmtmbG93T3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcbiAgY29uc3Qge1xuICAgIGZpbGVzLFxuICAgIGNvbnRlbnQsXG4gIH0gPSBjbGlXb3JrZmxvd09wdGlvbnM7XG4gIGxldCB3b3JrZmxvd0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBjd2QgPSBEZW5vLmN3ZCgpO1xuICBpZiAoY29udGVudCkge1xuICAgIHdvcmtmbG93RmlsZXMgPSBbXTtcbiAgfSBlbHNlIHtcbiAgICB3b3JrZmxvd0ZpbGVzID0gYXdhaXQgZ2V0RmlsZXNCeUZpbHRlcihjd2QsIGZpbGVzKTtcbiAgfVxuXG4gIGxldCBlbnYgPSB7fTtcblxuICBjb25zdCBhbGxFbnZQZXJtbWlzaW9uID0geyBuYW1lOiBcImVudlwiIH0gYXMgY29uc3Q7XG5cbiAgLy8gZmlyc3QgdHJ5IHRvIGdldCAuZW52XG4gIGNvbnN0IGRvdEVudkZpbGVQZXJtbWlzaW9uID0ge1xuICAgIG5hbWU6IFwicmVhZFwiLFxuICAgIHBhdGg6IFwiLmVudiwuZW52LmRlZmF1bHRzLC5lbnYuZXhhbXBsZVwiLFxuICB9IGFzIGNvbnN0O1xuXG4gIGlmIChhd2FpdCBoYXNQZXJtaXNzaW9uU2xpZW50KGRvdEVudkZpbGVQZXJtbWlzaW9uKSkge1xuICAgIGVudiA9IGNvbmZpZygpO1xuICB9XG5cbiAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoYWxsRW52UGVybW1pc2lvbikpIHtcbiAgICBlbnYgPSB7XG4gICAgICAuLi5lbnYsXG4gICAgICAuLi5EZW5vLmVudi50b09iamVjdCgpLFxuICAgIH07XG4gIH1cblxuICAvLyBnZXQgb3B0aW9uc1xuICBsZXQgdmFsaWRXb3JrZmxvd3M6IFZhbGlkV29ya2Zsb3dbXSA9IFtdO1xuXG4gIC8vIGlmIHN0ZGluXG5cbiAgaWYgKGNvbnRlbnQpIHtcbiAgICBjb25zdCB3b3JrZmxvdyA9IHBhcnNlV29ya2Zsb3coY29udGVudCk7XG5cbiAgICBpZiAoaXNPYmplY3Qod29ya2Zsb3cpKSB7XG4gICAgICBjb25zdCB3b3JrZmxvd0ZpbGVQYXRoID0gXCIvdG1wL2Rlbm9mbG93L3RtcC13b3JrZmxvdy55bWxcIjtcbiAgICAgIGNvbnN0IHdvcmtmbG93UmVsYXRpdmVQYXRoID0gcmVsYXRpdmUoY3dkLCB3b3JrZmxvd0ZpbGVQYXRoKTtcbiAgICAgIHZhbGlkV29ya2Zsb3dzLnB1c2goe1xuICAgICAgICBjdHg6IHtcbiAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgIGVudixcbiAgICAgICAgICAgIHdvcmtmbG93UGF0aDogd29ya2Zsb3dGaWxlUGF0aCxcbiAgICAgICAgICAgIHdvcmtmbG93UmVsYXRpdmVQYXRoLFxuICAgICAgICAgICAgd29ya2Zsb3dDd2Q6IGRpcm5hbWUod29ya2Zsb3dGaWxlUGF0aCksXG4gICAgICAgICAgICBjd2Q6IGN3ZCxcbiAgICAgICAgICAgIHNvdXJjZXM6IHt9LFxuICAgICAgICAgICAgc3RlcHM6IHt9LFxuICAgICAgICAgICAgc3RhdGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGl0ZW1Tb3VyY2VPcHRpb25zOiB1bmRlZmluZWQsXG4gICAgICAgICAgc291cmNlc09wdGlvbnM6IFtdLFxuICAgICAgICAgIGN1cnJlbnRTdGVwVHlwZTogU3RlcFR5cGUuU291cmNlLFxuICAgICAgICB9LFxuICAgICAgICB3b3JrZmxvdzogd29ya2Zsb3csXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3JrZmxvd0ZpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgd29ya2Zsb3dSZWxhdGl2ZVBhdGggPSB3b3JrZmxvd0ZpbGVzW2ldO1xuICAgIGxldCBmaWxlQ29udGVudCA9IFwiXCI7XG4gICAgbGV0IHdvcmtmbG93RmlsZVBhdGggPSBcIlwiO1xuICAgIGlmIChpc1JlbW90ZVBhdGgod29ya2Zsb3dSZWxhdGl2ZVBhdGgpKSB7XG4gICAgICBjb25zdCBuZXRDb250ZW50ID0gYXdhaXQgZmV0Y2god29ya2Zsb3dSZWxhdGl2ZVBhdGgpO1xuICAgICAgd29ya2Zsb3dGaWxlUGF0aCA9IHdvcmtmbG93UmVsYXRpdmVQYXRoO1xuICAgICAgZmlsZUNvbnRlbnQgPSBhd2FpdCBuZXRDb250ZW50LnRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd29ya2Zsb3dGaWxlUGF0aCA9IGpvaW4oY3dkLCB3b3JrZmxvd1JlbGF0aXZlUGF0aCk7XG4gICAgICBmaWxlQ29udGVudCA9IGF3YWl0IGdldENvbnRlbnQod29ya2Zsb3dGaWxlUGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBwYXJzZVdvcmtmbG93KGZpbGVDb250ZW50KTtcbiAgICBpZiAoIWlzT2JqZWN0KHdvcmtmbG93KSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFsaWRXb3JrZmxvd3MucHVzaCh7XG4gICAgICBjdHg6IHtcbiAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgZW52LFxuICAgICAgICAgIHdvcmtmbG93UGF0aDogd29ya2Zsb3dGaWxlUGF0aCxcbiAgICAgICAgICB3b3JrZmxvd1JlbGF0aXZlUGF0aDogd29ya2Zsb3dSZWxhdGl2ZVBhdGgsXG4gICAgICAgICAgd29ya2Zsb3dDd2Q6IGRpcm5hbWUod29ya2Zsb3dGaWxlUGF0aCksXG4gICAgICAgICAgY3dkOiBjd2QsXG4gICAgICAgICAgc291cmNlczoge30sXG4gICAgICAgICAgc3RlcHM6IHt9LFxuICAgICAgICAgIHN0YXRlOiB1bmRlZmluZWQsXG4gICAgICAgICAgaXRlbXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBpdGVtU291cmNlT3B0aW9uczogdW5kZWZpbmVkLFxuICAgICAgICBzb3VyY2VzT3B0aW9uczogW10sXG4gICAgICAgIGN1cnJlbnRTdGVwVHlwZTogU3RlcFR5cGUuU291cmNlLFxuICAgICAgfSxcbiAgICAgIHdvcmtmbG93OiB3b3JrZmxvdyxcbiAgICB9KTtcbiAgICAvLyBydW4gY29kZVxuICB9XG4gIC8vIHNvcnQgYnkgYWxwaGFiZXRcbiAgdmFsaWRXb3JrZmxvd3MgPSB2YWxpZFdvcmtmbG93cy5zb3J0KChhLCBiKSA9PiB7XG4gICAgY29uc3QgYVBhdGggPSBhLmN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgY29uc3QgYlBhdGggPSBiLmN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgaWYgKGFQYXRoIDwgYlBhdGgpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgaWYgKGFQYXRoID4gYlBhdGgpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSk7XG4gIHJlcG9ydC5pbmZvKFxuICAgIGAgJHt2YWxpZFdvcmtmbG93cy5sZW5ndGh9IHZhbGlkIHdvcmtmbG93czpcXG4ke1xuICAgICAgdmFsaWRXb3JrZmxvd3MubWFwKChpdGVtKSA9PiBnZXRSZXBvcnRlck5hbWUoaXRlbS5jdHgpKS5qb2luKFxuICAgICAgICBcIlxcblwiLFxuICAgICAgKVxuICAgIH1cXG5gLFxuICAgIFwiU3VjY2VzcyBmb3VuZFwiLFxuICApO1xuICAvLyBydW4gd29ya2Zsb3dzIHN0ZXAgYnkgc3RlcFxuICBmb3IgKFxuICAgIGxldCB3b3JrZmxvd0luZGV4ID0gMDtcbiAgICB3b3JrZmxvd0luZGV4IDwgdmFsaWRXb3JrZmxvd3MubGVuZ3RoO1xuICAgIHdvcmtmbG93SW5kZXgrK1xuICApIHtcbiAgICBsZXQgeyBjdHgsIHdvcmtmbG93IH0gPSB2YWxpZFdvcmtmbG93c1t3b3JrZmxvd0luZGV4XTtcbiAgICAvLyBwYXJzZSByb290IGVudiBmaXJzdFxuICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgIGNvbnN0IHBhcnNlZFdvcmtmbG93RmlsZU9wdGlvbnNXaXRoRW52ID0gYXdhaXQgcGFyc2VPYmplY3Qod29ya2Zsb3csIGN0eCwge1xuICAgICAga2V5czogW1wiZW52XCJdLFxuICAgIH0pIGFzIFdvcmtmbG93T3B0aW9ucztcbiAgICAvLyBydW4gZW52XG4gICAgLy8gcGFyc2UgZW52IHRvIGVudlxuICAgIGlmIChwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudi5lbnYpIHtcbiAgICAgIGZvciAoY29uc3Qga2V5IGluIHBhcnNlZFdvcmtmbG93RmlsZU9wdGlvbnNXaXRoRW52LmVudikge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHBhcnNlZFdvcmtmbG93RmlsZU9wdGlvbnNXaXRoRW52LmVudltrZXldO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgY29uc3QgZGVidWdFbnZQZXJtbWlzaW9uID0geyBuYW1lOiBcImVudlwiLCB2YXJpYWJsZToga2V5IH0gYXMgY29uc3Q7XG4gICAgICAgICAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoZGVidWdFbnZQZXJtbWlzaW9uKSkge1xuICAgICAgICAgICAgRGVuby5lbnYuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHBhcnNlIGdlbmVyYWwgb3B0aW9uc1xuXG4gICAgY29uc3QgcGFyc2VkV29ya2Zsb3dHZW5lcmFsT3B0aW9uc1dpdGhHZW5lcmFsID0gYXdhaXQgcGFyc2VPYmplY3QoXG4gICAgICBwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudixcbiAgICAgIGN0eCxcbiAgICAgIHtcbiAgICAgICAga2V5czogW1wiaWZcIiwgXCJkZWJ1Z1wiLCBcImRhdGFiYXNlXCIsIFwic2xlZXBcIiwgXCJsaW1pdFwiLCBcImZvcmNlXCJdLFxuICAgICAgfSxcbiAgICApIGFzIFdvcmtmbG93T3B0aW9ucztcblxuICAgIGNvbnN0IHdvcmtmbG93T3B0aW9ucyA9IGdldEZpbmFsV29ya2Zsb3dPcHRpb25zKFxuICAgICAgcGFyc2VkV29ya2Zsb3dHZW5lcmFsT3B0aW9uc1dpdGhHZW5lcmFsIHx8XG4gICAgICAgIHt9LFxuICAgICAgY2xpV29ya2Zsb3dPcHRpb25zLFxuICAgICk7XG4gICAgaXNEZWJ1ZyA9IHdvcmtmbG93T3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcblxuICAgIGNvbnN0IHdvcmtmbG93UmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfWAsXG4gICAgICBpc0RlYnVnLFxuICAgICk7XG5cbiAgICAvLyBjaGVjayBpZiBuZWVkIHRvIHJ1blxuICAgIGlmICh3b3JrZmxvd09wdGlvbnM/LmlmID09PSBmYWxzZSkge1xuICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFxuICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICBcIlNraXAgd29ya2Zsb3dcIixcbiAgICAgICk7XG4gICAgICBjb250aW51ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFxuICAgICAgICBgYCxcbiAgICAgICAgXCJTdGFydCBoYW5kbGUgd29ya2Zsb3dcIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gbWVyZ2UgdG8gZ2V0IGRlZmF1bHRcbiAgICBjdHgucHVibGljLm9wdGlvbnMgPSB3b3JrZmxvd09wdGlvbnM7XG5cbiAgICBjb25zdCBkYXRhYmFzZSA9IHdvcmtmbG93T3B0aW9ucy5kYXRhYmFzZSBhcyBzdHJpbmc7XG4gICAgbGV0IGRiO1xuICAgIGlmIChkYXRhYmFzZT8uc3RhcnRzV2l0aChcInNxbGl0ZVwiKSkge1xuICAgICAgZGIgPSBuZXcgU3FsaXRlRGIoZGF0YWJhc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgbmFtZXNwYWNlID0gY3R4LnB1YmxpYy53b3JrZmxvd1JlbGF0aXZlUGF0aDtcbiAgICAgIGlmIChuYW1lc3BhY2Uuc3RhcnRzV2l0aChcIi4uXCIpKSB7XG4gICAgICAgIC8vIHVzZSBhYnNvbHV0ZSBwYXRoIGFzIG5hbWVzcGFjZVxuICAgICAgICBuYW1lc3BhY2UgPSBgQGRlbm9mbG93Um9vdCR7Y3R4LnB1YmxpYy53b3JrZmxvd1BhdGh9YDtcbiAgICAgIH1cbiAgICAgIGRiID0gbmV3IEtleWRiKGRhdGFiYXNlLCB7XG4gICAgICAgIG5hbWVzcGFjZTogbmFtZXNwYWNlLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGN0eC5kYiA9IGRiO1xuICAgIC8vIGNoZWNrIHBlcm1pc3Npb25cbiAgICAvLyB1bmlxdWUga2V5XG4gICAgbGV0IHN0YXRlO1xuICAgIGxldCBpbnRlcm5hbFN0YXRlID0ge1xuICAgICAga2V5czogW10sXG4gICAgfTtcbiAgICBpZiAoYXdhaXQgaGFzUGVybWlzc2lvblNsaWVudChkYXRhUGVybWlzc2lvbikpIHtcbiAgICAgIHN0YXRlID0gYXdhaXQgZGIuZ2V0KFwic3RhdGVcIikgfHwgdW5kZWZpbmVkO1xuICAgICAgaW50ZXJuYWxTdGF0ZSA9IGF3YWl0IGRiLmdldChcImludGVybmFsU3RhdGVcIikgfHwge1xuICAgICAgICBrZXlzOiBbXSxcbiAgICAgIH07XG4gICAgfVxuICAgIGN0eC5wdWJsaWMuc3RhdGUgPSBzdGF0ZTtcbiAgICBjdHguaW50ZXJuYWxTdGF0ZSA9IGludGVybmFsU3RhdGU7XG4gICAgY3R4LmluaXRTdGF0ZSA9IEpTT04uc3RyaW5naWZ5KHN0YXRlKTtcbiAgICBjdHguaW5pdEludGVybmFsU3RhdGUgPSBKU09OLnN0cmluZ2lmeShpbnRlcm5hbFN0YXRlKTtcblxuICAgIGNvbnN0IHNvdXJjZXMgPSB3b3JrZmxvdy5zb3VyY2VzO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmIChzb3VyY2VzKSB7XG4gICAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcIlwiLCBcIlN0YXJ0IGdldCBzb3VyY2VzXCIpO1xuICAgICAgICBmb3IgKGxldCBzb3VyY2VJbmRleCA9IDA7IHNvdXJjZUluZGV4IDwgc291cmNlcy5sZW5ndGg7IHNvdXJjZUluZGV4KyspIHtcbiAgICAgICAgICBjb25zdCBzb3VyY2UgPSBzb3VyY2VzW3NvdXJjZUluZGV4XTtcbiAgICAgICAgICBjdHgucHVibGljLnNvdXJjZUluZGV4ID0gc291cmNlSW5kZXg7XG4gICAgICAgICAgY29uc3Qgc291cmNlUmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBzb3VyY2U6JHtjdHgucHVibGljLnNvdXJjZUluZGV4fWAsXG4gICAgICAgICAgICBpc0RlYnVnLFxuICAgICAgICAgICk7XG4gICAgICAgICAgbGV0IHNvdXJjZU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAuLi5zb3VyY2UsXG4gICAgICAgICAgfTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogW1wiZW52XCJdLFxuICAgICAgICAgICAgfSkgYXMgU291cmNlT3B0aW9ucztcblxuICAgICAgICAgICAgLy8gcGFyc2UgaWYgb25seVxuICAgICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgICAgICAgICBzb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICBjdHgsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXlzOiBbXCJpZlwiLCBcImRlYnVnXCJdLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgKSBhcyBTb3VyY2VPcHRpb25zO1xuXG4gICAgICAgICAgICAvLyBzZXQgbG9nIGxldmVsXG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucz8uZGVidWcgfHwgY3R4LnB1YmxpYy5vcHRpb25zPy5kZWJ1Zykge1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci5sZXZlbCA9IGxvZy5Mb2dMZXZlbHMuREVCVUc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIG5lZWQgdG8gcnVuXG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5pZiA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICAgIFwiU2tpcCBzb3VyY2VcIixcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcGFyc2Ugb25cbiAgICAgICAgICAgIC8vIGluc2VydCBzdGVwIGVudlxuICAgICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgICAgICAgICBzb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgICAgIHB1YmxpYzoge1xuICAgICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgICAgIGVudjoge1xuICAgICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLmVudixcbiAgICAgICAgICAgICAgICAgICAgLi4uc291cmNlT3B0aW9ucy5lbnYsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICApIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIGdldCBvcHRpb25zXG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gZ2V0RmluYWxTb3VyY2VPcHRpb25zKFxuICAgICAgICAgICAgICB3b3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICAgIGNsaVdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpc0RlYnVnID0gc291cmNlT3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcblxuICAgICAgICAgICAgY3R4LnNvdXJjZXNPcHRpb25zLnB1c2goc291cmNlT3B0aW9ucyk7XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmXG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5pZiA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmVycm9yID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZFJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRDb2RlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZE9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5pc1JlYWxPayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuaWQpIHtcbiAgICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlT3B0aW9ucy5pZF0gPVxuICAgICAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJ1biBzb3VyY2VcbiAgICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1blN0ZXAoY3R4LCB7XG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBnZXQgc291cmNlIGl0ZW1zIGJ5IGl0ZW1zUGF0aCwga2V5XG4gICAgICAgICAgICBjdHggPSBhd2FpdCBnZXRTb3VyY2VJdGVtc0Zyb21SZXN1bHQoY3R4LCB7XG4gICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMucmV2ZXJzZSkge1xuICAgICAgICAgICAgICAvLyByZXZlcnNlXG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbXMgPSBjdHgucHVibGljLml0ZW1zLnJldmVyc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJ1biB1c2VyIGZpbHRlciwgZmlsdGVyIGZyb20sIGZpbHRlckl0ZW1zLCBmaWx0ZXJJdGVtc0Zyb20sIG9ubHkgYWxsb3cgb25lLlxuICAgICAgICAgICAgY3R4ID0gYXdhaXQgZmlsdGVyU291cmNlSXRlbXMoY3R4LCBzb3VyY2VSZXBvcnRlcik7XG5cbiAgICAgICAgICAgIC8vIHJ1biBjbWRcblxuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuY21kKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNtZFJlc3VsdCA9IGF3YWl0IHJ1bkNtZChjdHgsIHNvdXJjZU9wdGlvbnMuY21kKTtcbiAgICAgICAgICAgICAgY3R4ID0gc2V0Q21kT2tSZXN1bHQoY3R4LCBjbWRSZXN1bHQuc3Rkb3V0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gbWFyayBzb3VyY2UgaXRlbXMsIGFkZCB1bmlxdWUga2V5IGFuZCBzb3VyY2UgaW5kZXggdG8gaXRlbXNcbiAgICAgICAgICAgIGN0eCA9IG1hcmtTb3VyY2VJdGVtcyhjdHgpO1xuICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XSA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuaWQpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZU9wdGlvbnMuaWRdID1cbiAgICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBydW4gYXNzZXJ0XG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5hc3NlcnQpIHtcbiAgICAgICAgICAgICAgY3R4ID0gYXdhaXQgcnVuQXNzZXJ0KGN0eCwge1xuICAgICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgICAgICAuLi5zb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjdHgucHVibGljLml0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgLy8gcnVuIHBvc3RcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBcIlwiLFxuICAgICAgICAgICAgICAgIGBTb3VyY2UgJHtzb3VyY2VJbmRleH0gZ2V0ICR7Y3R4LnB1YmxpYy5pdGVtcy5sZW5ndGh9IGl0ZW1zYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMucG9zdCkge1xuICAgICAgICAgICAgICBhd2FpdCBydW5Qb3N0KGN0eCwge1xuICAgICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgICAgICAuLi5zb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjdHggPSBzZXRFcnJvclJlc3VsdChjdHgsIGUpO1xuICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XSA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZS5pZCkge1xuICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlLmlkXSA9IGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc291cmNlLmNvbnRpbnVlT25FcnJvcikge1xuICAgICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHJ1biBzb3VyY2VgLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci53YXJuaW5nKGUpO1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICAgIGBJZ25vcmUgdGhpcyBlcnJvciwgYmVjYXVzZSBjb250aW51ZU9uRXJyb3IgaXMgdHJ1ZS5gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgICAgIGBGYWlsZWQgcnVuIHNvdXJjZWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gY2hlY2sgaXMgbmVlZCBzbGVlcFxuICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLnNsZWVwICYmIHNvdXJjZU9wdGlvbnMuc2xlZXAgPiAwKSB7XG4gICAgICAgICAgICBzb3VyY2VSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICBgJHtzb3VyY2VPcHRpb25zLnNsZWVwfSBzZWNvbmRzYCxcbiAgICAgICAgICAgICAgXCJTbGVlcFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGF3YWl0IGRlbGF5KHNvdXJjZU9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gaW5zZXJ0IG5ldyBjdHguaXRlbXNcbiAgICAgIGlmIChzb3VyY2VzKSB7XG4gICAgICAgIGxldCBjb2xsZWN0Q3R4SXRlbXM6IHVua25vd25bXSA9IFtdO1xuICAgICAgICBzb3VyY2VzLmZvckVhY2goKF8sIHRoZVNvdXJjZUluZGV4KSA9PiB7XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY3R4LnB1YmxpYy5zb3VyY2VzW3RoZVNvdXJjZUluZGV4XS5yZXN1bHQpKSB7XG4gICAgICAgICAgICBjb2xsZWN0Q3R4SXRlbXMgPSBjb2xsZWN0Q3R4SXRlbXMuY29uY2F0KFxuICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbdGhlU291cmNlSW5kZXhdLnJlc3VsdCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY3R4LnB1YmxpYy5pdGVtcyA9IGNvbGxlY3RDdHhJdGVtcztcbiAgICAgICAgaWYgKGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGBUb3RhbCAke2N0eC5wdWJsaWMuaXRlbXMubGVuZ3RofSBpdGVtc2AsXG4gICAgICAgICAgICBcIkZpbmlzaCBnZXQgc291cmNlc1wiLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gaWYgaXRlbXMgPjAsIHRoZW4gY29udGludWVcbiAgICAgIGlmICgoY3R4LnB1YmxpYy5pdGVtcyBhcyB1bmtub3duW10pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBubyBuZWVkIHRvIGhhbmRsZSBzdGVwc1xuICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXG4gICAgICAgICAgYGJlY2F1c2Ugbm8gYW55IHZhbGlkIHNvdXJjZXMgaXRlbXMgcmV0dXJuZWRgLFxuICAgICAgICAgIFwiU2tpcCB3b3JrZmxvd1wiLFxuICAgICAgICApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gcnVuIGZpbHRlclxuICAgICAgY29uc3QgZmlsdGVyID0gd29ya2Zsb3cuZmlsdGVyO1xuICAgICAgaWYgKGZpbHRlcikge1xuICAgICAgICBjdHguY3VycmVudFN0ZXBUeXBlID0gU3RlcFR5cGUuRmlsdGVyO1xuICAgICAgICBjb25zdCBmaWx0ZXJSZXBvcnRlciA9IGdldFJlcG9ydGVyKFxuICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBmaWx0ZXJgLFxuICAgICAgICAgIGlzRGVidWcsXG4gICAgICAgICk7XG4gICAgICAgIGxldCBmaWx0ZXJPcHRpb25zID0geyAuLi5maWx0ZXIgfTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBwYXJzZSBlbnYgZmlyc3RcbiAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoZmlsdGVyLCBjdHgsIHtcbiAgICAgICAgICAgIGtleXM6IFtcImVudlwiXSxcbiAgICAgICAgICB9KSBhcyBGaWx0ZXJPcHRpb25zO1xuXG4gICAgICAgICAgLy8gcGFyc2UgaWYgZGVidWcgb25seVxuICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChcbiAgICAgICAgICAgIGZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICBjdHgsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGtleXM6IFtcImlmXCIsIFwiZGVidWdcIl0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICkgYXMgRmlsdGVyT3B0aW9ucztcblxuICAgICAgICAgIC8vIHNldCBsb2cgbGV2ZWxcbiAgICAgICAgICBpZiAoZmlsdGVyT3B0aW9ucz8uZGVidWcgfHwgY3R4LnB1YmxpYy5vcHRpb25zPy5kZWJ1Zykge1xuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIubGV2ZWwgPSBsb2cuTG9nTGV2ZWxzLkRFQlVHO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGNoZWNrIGlmIG5lZWQgdG8gcnVuXG4gICAgICAgICAgaWYgKGZpbHRlck9wdGlvbnMuaWYgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICBcIlNraXAgZmlsdGVyXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHBhcnNlIG9uXG4gICAgICAgICAgLy8gaW5zZXJ0IHN0ZXAgZW52XG4gICAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgICAgICAgZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICAgIGVudjoge1xuICAgICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYy5lbnYsXG4gICAgICAgICAgICAgICAgICAuLi5maWx0ZXJPcHRpb25zLmVudixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICApIGFzIEZpbHRlck9wdGlvbnM7XG5cbiAgICAgICAgICAvLyBnZXQgb3B0aW9uc1xuICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBnZXRGaW5hbFNvdXJjZU9wdGlvbnMoXG4gICAgICAgICAgICB3b3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICBjbGlXb3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICBmaWx0ZXJPcHRpb25zLFxuICAgICAgICAgICk7XG4gICAgICAgICAgaXNEZWJ1ZyA9IGZpbHRlck9wdGlvbnMuZGVidWcgfHwgZmFsc2U7XG4gICAgICAgICAgaWYgKGZpbHRlck9wdGlvbnMuaWYgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmlsdGVyUmVwb3J0ZXIuaW5mbyhcIlwiLCBcIlN0YXJ0IGhhbmRsZSBmaWx0ZXJcIik7XG4gICAgICAgICAgLy8gcnVuIEZpbHRlclxuICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1blN0ZXAoY3R4LCB7XG4gICAgICAgICAgICByZXBvcnRlcjogZmlsdGVyUmVwb3J0ZXIsXG4gICAgICAgICAgICAuLi5maWx0ZXJPcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIEFycmF5LmlzQXJyYXkoY3R4LnB1YmxpYy5yZXN1bHQpICYmXG4gICAgICAgICAgICBjdHgucHVibGljLnJlc3VsdC5sZW5ndGggPT09IGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBjdHgucHVibGljLml0ZW1zID0gY3R4LnB1YmxpYy5pdGVtcy5maWx0ZXIoKF9pdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gISEoKGN0eC5wdWJsaWMucmVzdWx0IGFzIGJvb2xlYW5bXSlbaW5kZXhdKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY3R4LnB1YmxpYy5yZXN1bHQgPSBjdHgucHVibGljLml0ZW1zO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZmlsdGVyT3B0aW9ucy5ydW4gfHwgZmlsdGVyT3B0aW9ucy51c2UpIHtcbiAgICAgICAgICAgIC8vIGlmIHJ1biBvciB1c2UsIHRoZW4gcmVzdWx0IG11c3QgYmUgYXJyYXlcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBmaWx0ZXIgc2NyaXB0YCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBpbnZhbGlkIHJlc3VsdFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBcIkludmFsaWQgZmlsdGVyIHN0ZXAgcmVzdWx0LCByZXN1bHQgbXVzdCBiZSBhcnJheSAsIGJvb2xlYW5bXSwgd2hpY2ggYXJyYXkgbGVuZ3RoIG11c3QgYmUgZXF1YWwgdG8gY3R4Lml0ZW1zIGxlbmd0aFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZmlsdGVyT3B0aW9ucy5jbWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGNtZFJlc3VsdCA9IGF3YWl0IHJ1bkNtZChjdHgsIGZpbHRlck9wdGlvbnMuY21kKTtcbiAgICAgICAgICAgIGN0eCA9IHNldENtZE9rUmVzdWx0KGN0eCwgY21kUmVzdWx0LnN0ZG91dCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGN0eC5wdWJsaWMuZmlsdGVyID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG5cbiAgICAgICAgICAvLyBydW4gZmlsdGVyXG4gICAgICAgICAgY3R4ID0gZmlsdGVyQ3R4SXRlbXMoY3R4LCB7XG4gICAgICAgICAgICAuLi5maWx0ZXJPcHRpb25zLFxuICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gcnVuIGFzc2VydFxuICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLmFzc2VydCkge1xuICAgICAgICAgICAgY3R4ID0gYXdhaXQgcnVuQXNzZXJ0KGN0eCwge1xuICAgICAgICAgICAgICByZXBvcnRlcjogZmlsdGVyUmVwb3J0ZXIsXG4gICAgICAgICAgICAgIC4uLmZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBydW4gcG9zdFxuXG4gICAgICAgICAgaWYgKGZpbHRlck9wdGlvbnMucG9zdCkge1xuICAgICAgICAgICAgYXdhaXQgcnVuUG9zdChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgICAgICAuLi5maWx0ZXJPcHRpb25zLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgY3R4ID0gc2V0RXJyb3JSZXN1bHQoY3R4LCBlKTtcbiAgICAgICAgICBjdHgucHVibGljLmZpbHRlciA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuXG4gICAgICAgICAgaWYgKGZpbHRlci5jb250aW51ZU9uRXJyb3IpIHtcbiAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci53YXJuaW5nKGUpO1xuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgYElnbm9yZSB0aGlzIGVycm9yLCBiZWNhdXNlIGNvbnRpbnVlT25FcnJvciBpcyB0cnVlLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBmaWx0ZXJgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZpbHRlclJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgYFRvdGFsICR7Y3R4LnB1YmxpYy5pdGVtcy5sZW5ndGh9IGl0ZW1zYCxcbiAgICAgICAgICBcIkZpbmlzaCBoYW5kbGUgZmlsdGVyXCIsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gY2hlY2sgaXMgbmVlZCBzbGVlcFxuICAgICAgICBpZiAoZmlsdGVyT3B0aW9ucy5zbGVlcCAmJiBmaWx0ZXJPcHRpb25zLnNsZWVwID4gMCkge1xuICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgJHtmaWx0ZXJPcHRpb25zLnNsZWVwfSBzZWNvbmRzYCxcbiAgICAgICAgICAgIFwiU2xlZXBcIixcbiAgICAgICAgICApO1xuICAgICAgICAgIGF3YWl0IGRlbGF5KGZpbHRlck9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjdHguY3VycmVudFN0ZXBUeXBlID0gU3RlcFR5cGUuU3RlcDtcblxuICAgICAgZm9yIChcbiAgICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgICAgaW5kZXggPCAoY3R4LnB1YmxpYy5pdGVtcyBhcyB1bmtub3duW10pLmxlbmd0aDtcbiAgICAgICAgaW5kZXgrK1xuICAgICAgKSB7XG4gICAgICAgIGN0eC5wdWJsaWMuaXRlbUluZGV4ID0gaW5kZXg7XG4gICAgICAgIGN0eC5wdWJsaWMuaXRlbSA9IChjdHgucHVibGljLml0ZW1zIGFzIHVua25vd25bXSlbaW5kZXhdO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pICYmXG4gICAgICAgICAgKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVtcIkBkZW5vZmxvd0tleVwiXVxuICAgICAgICApIHtcbiAgICAgICAgICBjdHgucHVibGljLml0ZW1LZXkgPVxuICAgICAgICAgICAgKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVtcIkBkZW5vZmxvd0tleVwiXTtcbiAgICAgICAgfSBlbHNlIGlmIChpc09iamVjdChjdHgucHVibGljLml0ZW0pKSB7XG4gICAgICAgICAgY3R4LnB1YmxpYy5pdGVtS2V5ID0gdW5kZWZpbmVkO1xuICAgICAgICAgIHdvcmtmbG93UmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgIGBDYW4gbm90IGZvdW5kIGludGVybmFsIGl0ZW0ga2V5IFxcYEBkZW5vZmxvd0tleVxcYCwgbWF5YmUgeW91IGNoYW5nZWQgdGhlIGl0ZW0gZm9ybWF0LiBNaXNzaW5nIHRoaXMga2V5LCBkZW5vZmxvdyBjYW4gbm90IHN0b3JlIHRoZSB1bmlxdWUga2V5IHN0YXRlLiBGaXggdGhpcywgVHJ5IG5vdCBjaGFuZ2UgdGhlIHJlZmVyZW5jZSBpdGVtLCBvbmx5IGNoYW5nZSB0aGUgcHJvcGVydHkgeW91IG5lZWQgdG8gY2hhbmdlLiBUcnkgdG8gbWFudWFsIGFkZGluZyBhIFxcYEBkZW5vZmxvd0tleVxcYCBhcyBpdGVtIHVuaXF1ZSBrZXkuYCxcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbUtleSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pICYmXG4gICAgICAgICAgKCgoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW1xuICAgICAgICAgICAgICBcIkBkZW5vZmxvd1NvdXJjZUluZGV4XCJcbiAgICAgICAgICAgIF0pIGFzIG51bWJlcikgPj0gMFxuICAgICAgICApIHtcbiAgICAgICAgICBjdHgucHVibGljLml0ZW1Tb3VyY2VJbmRleCA9XG4gICAgICAgICAgICAoKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KVtcbiAgICAgICAgICAgICAgXCJAZGVub2Zsb3dTb3VyY2VJbmRleFwiXG4gICAgICAgICAgICBdKSBhcyBudW1iZXI7XG4gICAgICAgICAgY3R4Lml0ZW1Tb3VyY2VPcHRpb25zID1cbiAgICAgICAgICAgIGN0eC5zb3VyY2VzT3B0aW9uc1tjdHgucHVibGljLml0ZW1Tb3VyY2VJbmRleF07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoY3R4LnB1YmxpYy5pdGVtKSkge1xuICAgICAgICAgIGN0eC5pdGVtU291cmNlT3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICBgQ2FuIG5vdCBmb3VuZCBpbnRlcm5hbCBpdGVtIGtleSBcXGBAZGVub2Zsb3dTb3VyY2VJbmRleFxcYCwgbWF5YmUgeW91IGNoYW5nZWQgdGhlIGl0ZW0gZm9ybWF0LiBUcnkgbm90IGNoYW5nZSB0aGUgcmVmZXJlbmNlIGl0ZW0sIG9ubHkgY2hhbmdlIHRoZSBwcm9wZXJ0eSB5b3UgbmVlZCB0byBjaGFuZ2UuIFRyeSB0byBtYW51YWwgYWRkaW5nIGEgXFxgQGRlbm9mbG93S2V5XFxgIGFzIGl0ZW0gdW5pcXVlIGtleS5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY3R4Lml0ZW1Tb3VyY2VPcHRpb25zID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXRlbVJlcG9ydGVyID0gZ2V0UmVwb3J0ZXIoXG4gICAgICAgICAgYCR7Z2V0UmVwb3J0ZXJOYW1lKGN0eCl9IC0+IGl0ZW06JHtpbmRleH1gLFxuICAgICAgICAgIGlzRGVidWcsXG4gICAgICAgICk7XG4gICAgICAgIGlmIChjdHgucHVibGljLm9wdGlvbnM/LmRlYnVnKSB7XG4gICAgICAgICAgaXRlbVJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghd29ya2Zsb3cuc3RlcHMpIHtcbiAgICAgICAgICB3b3JrZmxvdy5zdGVwcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1SZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgYGAsXG4gICAgICAgICAgICBcIlN0YXJ0IHJ1biBzdGVwc1wiLFxuICAgICAgICAgICk7XG4gICAgICAgICAgaXRlbVJlcG9ydGVyLmRlYnVnKGAke0pTT04uc3RyaW5naWZ5KGN0eC5wdWJsaWMuaXRlbSwgbnVsbCwgMil9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHdvcmtmbG93LnN0ZXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgY29uc3Qgc3RlcCA9IHdvcmtmbG93LnN0ZXBzW2pdO1xuICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcEluZGV4ID0gajtcbiAgICAgICAgICBjb25zdCBzdGVwUmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBzdGVwOiR7Y3R4LnB1YmxpYy5zdGVwSW5kZXh9YCxcbiAgICAgICAgICAgIGlzRGVidWcsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBsZXQgc3RlcE9wdGlvbnMgPSB7IC4uLnN0ZXAgfTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHN0ZXBPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogW1wiZW52XCJdLFxuICAgICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIHBhcnNlIGlmIG9ubHlcbiAgICAgICAgICAgIHN0ZXBPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc3RlcE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICBrZXlzOiBbXCJpZlwiLCBcImRlYnVnXCJdLFxuICAgICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMuZGVidWcgfHwgY3R4LnB1YmxpYy5vcHRpb25zPy5kZWJ1Zykge1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIubGV2ZWwgPSBsb2cuTG9nTGV2ZWxzLkRFQlVHO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0ZXBPcHRpb25zLmlmID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICAgIFwiU2tpcCBzdGVwXCIsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBwYXJzZSBvblxuICAgICAgICAgICAgLy8gaW5zZXJ0IHN0ZXAgZW52XG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHN0ZXBPcHRpb25zLCB7XG4gICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMuZW52LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcbiAgICAgICAgICAgIC8vIGdldCBvcHRpb25zXG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGdldEZpbmFsU291cmNlT3B0aW9ucyhcbiAgICAgICAgICAgICAgd29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgICBjbGlXb3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICAgIHN0ZXBPcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlzRGVidWcgPSBzdGVwT3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcblxuICAgICAgICAgICAgc3RlcFJlcG9ydGVyLmRlYnVnKFxuICAgICAgICAgICAgICBgU3RhcnQgcnVuIHRoaXMgc3RlcC5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdjdHgyJyxjdHgpO1xuXG4gICAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMuaWYgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMucmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5lcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRSZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuY21kQ29kZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRPayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuaXNSZWFsT2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW2pdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICAgIGlmIChzdGVwLmlkKSB7XG4gICAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zdGVwc1tzdGVwLmlkXSA9IGN0eC5wdWJsaWMuc3RlcHNbal07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1blN0ZXAoY3R4LCB7XG4gICAgICAgICAgICAgIC4uLnN0ZXBPcHRpb25zLFxuICAgICAgICAgICAgICByZXBvcnRlcjogc3RlcFJlcG9ydGVyLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMuY21kKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNtZFJlc3VsdCA9IGF3YWl0IHJ1bkNtZChjdHgsIHN0ZXBPcHRpb25zLmNtZCk7XG4gICAgICAgICAgICAgIGN0eCA9IHNldENtZE9rUmVzdWx0KGN0eCwgY21kUmVzdWx0LnN0ZG91dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbal0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgIGlmIChzdGVwLmlkKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbc3RlcC5pZF0gPSBjdHgucHVibGljLnN0ZXBzW2pdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdGVwUmVwb3J0ZXIuZGVidWcoXG4gICAgICAgICAgICAgIGBGaW5pc2ggdG8gcnVuIHRoaXMgc3RlcC5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW2pdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG5cbiAgICAgICAgICAgIGlmIChzdGVwLmlkKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbc3RlcC5pZF0gPSBjdHgucHVibGljLnN0ZXBzW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0ZXAuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBzdGVwYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgc3RlcFJlcG9ydGVyLndhcm5pbmcoZSk7XG4gICAgICAgICAgICAgIHN0ZXBSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICAgIGBJZ25vcmUgdGhpcyBlcnJvciwgYmVjYXVzZSBjb250aW51ZU9uRXJyb3IgaXMgdHJ1ZS5gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHN0ZXBSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBzdGVwYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gdGhpcyBpdGVtIHN0ZXBzIGFsbCBvaywgYWRkIHVuaXF1ZSBrZXlzIHRvIHRoZSBpbnRlcm5hbCBzdGF0ZVxuXG4gICAgICAgICAgLy8gcnVuIGFzc2VydFxuICAgICAgICAgIGlmIChzdGVwT3B0aW9ucy5hc3NlcnQpIHtcbiAgICAgICAgICAgIGF3YWl0IHJ1bkFzc2VydChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHN0ZXBSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMucG9zdCkge1xuICAgICAgICAgICAgYXdhaXQgcnVuUG9zdChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHN0ZXBSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RlcFJlcG9ydGVyLmluZm8oXCJcIiwgXCJGaW5pc2ggcnVuIHN0ZXAgXCIgKyBqKTtcbiAgICAgICAgICAvLyBjaGVjayBpcyBuZWVkIHNsZWVwXG4gICAgICAgICAgaWYgKHN0ZXBPcHRpb25zLnNsZWVwICYmIHN0ZXBPcHRpb25zLnNsZWVwID4gMCkge1xuICAgICAgICAgICAgc3RlcFJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgIGAke3N0ZXBPcHRpb25zLnNsZWVwfSBzZWNvbmRzYCxcbiAgICAgICAgICAgICAgXCJTbGVlcFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGF3YWl0IGRlbGF5KHN0ZXBPcHRpb25zLnNsZWVwICogMTAwMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGNoZWNrIGlzICFmb3JjZVxuICAgICAgICAvLyBnZXQgaXRlbSBzb3VyY2Ugb3B0aW9uc1xuICAgICAgICBpZiAoY3R4Lml0ZW1Tb3VyY2VPcHRpb25zICYmICFjdHguaXRlbVNvdXJjZU9wdGlvbnMuZm9yY2UpIHtcbiAgICAgICAgICBpZiAoIWN0eC5pbnRlcm5hbFN0YXRlIHx8ICFjdHguaW50ZXJuYWxTdGF0ZS5rZXlzKSB7XG4gICAgICAgICAgICBjdHguaW50ZXJuYWxTdGF0ZSEua2V5cyA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBjdHgucHVibGljLml0ZW1LZXkgJiZcbiAgICAgICAgICAgICFjdHguaW50ZXJuYWxTdGF0ZSEua2V5cy5pbmNsdWRlcyhjdHgucHVibGljLml0ZW1LZXkhKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgY3R4LmludGVybmFsU3RhdGUhLmtleXMudW5zaGlmdChjdHgucHVibGljLml0ZW1LZXkhKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gb25seSBzYXZlIDEwMDAgaXRlbXMgZm9yIHNhdmUgbWVtb3J5XG4gICAgICAgICAgaWYgKGN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzLmxlbmd0aCA+IDEwMDApIHtcbiAgICAgICAgICAgIGN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzID0gY3R4LmludGVybmFsU3RhdGUhLmtleXMuc2xpY2UoMCwgMTAwMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh3b3JrZmxvdy5zdGVwcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgaXRlbVJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgYCxcbiAgICAgICAgICAgIGBGaW5pc2ggcnVuIHN0ZXBzYCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHJ1biBwb3N0IHN0ZXBcbiAgICAgIGNvbnN0IHBvc3QgPSB3b3JrZmxvdy5wb3N0O1xuICAgICAgaWYgKHBvc3QpIHtcbiAgICAgICAgY29uc3QgcG9zdFJlcG9ydGVyID0gZ2V0UmVwb3J0ZXIoXG4gICAgICAgICAgYCR7Z2V0UmVwb3J0ZXJOYW1lKGN0eCl9IC0+IHBvc3RgLFxuICAgICAgICAgIGlzRGVidWcsXG4gICAgICAgICk7XG4gICAgICAgIGxldCBwb3N0T3B0aW9ucyA9IHsgLi4ucG9zdCB9O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgICAgICAgIHBvc3RPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QocG9zdE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAga2V5czogW1wiZW52XCJdLFxuICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuXG4gICAgICAgICAgLy8gcGFyc2UgaWYgb25seVxuICAgICAgICAgIHBvc3RPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QocG9zdE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAga2V5czogW1wiaWZcIiwgXCJkZWJ1Z1wiXSxcbiAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcbiAgICAgICAgICBpZiAocG9zdE9wdGlvbnMuZGVidWcgfHwgY3R4LnB1YmxpYy5vcHRpb25zPy5kZWJ1Zykge1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHBvc3RPcHRpb25zLmlmID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgIGBiZWNhdXNlIGlmIGNvbmRpdGlvbiBpcyBmYWxzZWAsXG4gICAgICAgICAgICAgIFwiU2tpcCBwb3N0XCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHBhcnNlIG9uXG4gICAgICAgICAgLy8gaW5zZXJ0IHN0ZXAgZW52XG4gICAgICAgICAgcG9zdE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChwb3N0T3B0aW9ucywge1xuICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgIGVudjoge1xuICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgIC4uLnBvc3RPcHRpb25zLmVudixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgLy8gZ2V0IG9wdGlvbnNcbiAgICAgICAgICBwb3N0T3B0aW9ucyA9IGdldEZpbmFsU291cmNlT3B0aW9ucyhcbiAgICAgICAgICAgIHdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgIGNsaVdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgIHBvc3RPcHRpb25zLFxuICAgICAgICAgICk7XG4gICAgICAgICAgaXNEZWJ1ZyA9IHBvc3RPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuXG4gICAgICAgICAgcG9zdFJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgU3RhcnQgcnVuIHBvc3QuYCxcbiAgICAgICAgICApO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdjdHgyJyxjdHgpO1xuXG4gICAgICAgICAgY3R4ID0gYXdhaXQgcnVuU3RlcChjdHgsIHtcbiAgICAgICAgICAgIC4uLnBvc3RPcHRpb25zLFxuICAgICAgICAgICAgcmVwb3J0ZXI6IHBvc3RSZXBvcnRlcixcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAocG9zdE9wdGlvbnMuY21kKSB7XG4gICAgICAgICAgICBjb25zdCBjbWRSZXN1bHQgPSBhd2FpdCBydW5DbWQoY3R4LCBwb3N0T3B0aW9ucy5jbWQpO1xuICAgICAgICAgICAgY3R4ID0gc2V0Q21kT2tSZXN1bHQoY3R4LCBjbWRSZXN1bHQuc3Rkb3V0KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwb3N0UmVwb3J0ZXIuZGVidWcoXG4gICAgICAgICAgICBgRmluaXNoIHRvIHJ1biBwb3N0LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChwb3N0LmNvbnRpbnVlT25FcnJvcikge1xuICAgICAgICAgICAgY3R4LnB1YmxpYy5vayA9IHRydWU7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gcG9zdGAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLndhcm5pbmcoZSk7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgYElnbm9yZSB0aGlzIGVycm9yLCBiZWNhdXNlIGNvbnRpbnVlT25FcnJvciBpcyB0cnVlLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gcG9zdGAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gdGhpcyBpdGVtIHN0ZXBzIGFsbCBvaywgYWRkIHVuaXF1ZSBrZXlzIHRvIHRoZSBpbnRlcm5hbCBzdGF0ZVxuXG4gICAgICAgIC8vIHJ1biBhc3NlcnRcbiAgICAgICAgaWYgKHBvc3RPcHRpb25zLmFzc2VydCkge1xuICAgICAgICAgIGF3YWl0IHJ1bkFzc2VydChjdHgsIHtcbiAgICAgICAgICAgIHJlcG9ydGVyOiBwb3N0UmVwb3J0ZXIsXG4gICAgICAgICAgICAuLi5wb3N0T3B0aW9ucyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3N0T3B0aW9ucy5wb3N0KSB7XG4gICAgICAgICAgYXdhaXQgcnVuUG9zdChjdHgsIHtcbiAgICAgICAgICAgIHJlcG9ydGVyOiBwb3N0UmVwb3J0ZXIsXG4gICAgICAgICAgICAuLi5wb3N0T3B0aW9ucyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBwb3N0UmVwb3J0ZXIuaW5mbyhcIlwiLCBcIkZpbmlzaCBydW4gcG9zdCBcIik7XG4gICAgICAgIC8vIGNoZWNrIGlzIG5lZWQgc2xlZXBcbiAgICAgICAgaWYgKHBvc3RPcHRpb25zLnNsZWVwICYmIHBvc3RPcHRpb25zLnNsZWVwID4gMCkge1xuICAgICAgICAgIHBvc3RSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgYCR7cG9zdE9wdGlvbnMuc2xlZXB9IHNlY29uZHNgLFxuICAgICAgICAgICAgXCJTbGVlcFwiLFxuICAgICAgICAgICk7XG4gICAgICAgICAgYXdhaXQgZGVsYXkocG9zdE9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBzYXZlIHN0YXRlLCBpbnRlcm5hbFN0YXRlXG4gICAgICAvLyBjaGVjayBpcyBjaGFuZ2VkXG4gICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBKU09OLnN0cmluZ2lmeShjdHgucHVibGljLnN0YXRlKTtcbiAgICAgIC8vIGFkZCBzdWNjZXNzIGl0ZW1zIHVuaXF1ZUtleSB0byBpbnRlcm5hbCBTdGF0ZVxuXG4gICAgICBjb25zdCBjdXJyZW50SW50ZXJuYWxTdGF0ZSA9IEpTT04uc3RyaW5naWZ5KGN0eC5pbnRlcm5hbFN0YXRlKTtcbiAgICAgIGlmIChjdXJyZW50U3RhdGUgIT09IGN0eC5pbml0U3RhdGUpIHtcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhgU2F2ZSBzdGF0ZWApO1xuICAgICAgICBhd2FpdCBjdHguZGIhLnNldChcInN0YXRlXCIsIGN0eC5wdWJsaWMuc3RhdGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhgU2tpcCBzYXZlIHNhdGUsIGNhdXNlIG5vIGNoYW5nZSBoYXBwZW5lZGApO1xuICAgICAgfVxuICAgICAgaWYgKGN1cnJlbnRJbnRlcm5hbFN0YXRlICE9PSBjdHguaW5pdEludGVybmFsU3RhdGUpIHtcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhcbiAgICAgICAgICBgU2F2ZSBpbnRlcm5hbCBzdGF0ZWAsXG4gICAgICAgICk7XG4gICAgICAgIGF3YWl0IGN0eC5kYiEuc2V0KFwiaW50ZXJuYWxTdGF0ZVwiLCBjdHguaW50ZXJuYWxTdGF0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB3b3JrZmxvd1JlcG9ydGVyLmRlYnVnKFxuICAgICAgICAvLyAgIGBTa2lwIHNhdmUgaW50ZXJuYWwgc3RhdGUsIGNhdXNlIG5vIGNoYW5nZSBoYXBwZW5lZGAsXG4gICAgICAgIC8vICk7XG4gICAgICB9XG4gICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXG4gICAgICAgIGBgLFxuICAgICAgICBcIkZpbmlzaCB3b3JrZmxvd1wiLFxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB3b3JrZmxvd1JlcG9ydGVyLmVycm9yKFxuICAgICAgICBgRmFpbGVkIHRvIHJ1biB0aGlzIHdvcmtmbG93YCxcbiAgICAgICk7XG5cbiAgICAgIHdvcmtmbG93UmVwb3J0ZXIuZXJyb3IoZSk7XG4gICAgICBpZiAodmFsaWRXb3JrZmxvd3MubGVuZ3RoID4gd29ya2Zsb3dJbmRleCArIDEpIHtcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhcIndvcmtmbG93XCIsIFwiU3RhcnQgbmV4dCB3b3JrZmxvd1wiKTtcbiAgICAgIH1cbiAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgY3R4LFxuICAgICAgICBlcnJvcjogZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIlxcblwiKTtcbiAgfVxuICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICByZXBvcnQuZXJyb3IoXCJFcnJvciBkZXRhaWxzOlwiKTtcbiAgICBlcnJvcnMuZm9yRWFjaCgoZXJyb3IpID0+IHtcbiAgICAgIHJlcG9ydC5lcnJvcihcbiAgICAgICAgYFJ1biAke2dldFJlcG9ydGVyTmFtZShlcnJvci5jdHgpfSBmYWlsZWQsIGVycm9yOiBgLFxuICAgICAgKTtcbiAgICAgIHJlcG9ydC5lcnJvcihlcnJvci5lcnJvcik7XG4gICAgfSk7XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBydW4gdGhpcyB0aW1lYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UmVwb3J0ZXJOYW1lKGN0eDogQ29udGV4dCkge1xuICBjb25zdCByZWxhdGl2ZVBhdGggPSBjdHgucHVibGljLndvcmtmbG93UmVsYXRpdmVQYXRoO1xuICBjb25zdCBhYnNvbHV0ZVBhdGggPSBjdHgucHVibGljLndvcmtmbG93UGF0aDtcbiAgaWYgKHJlbGF0aXZlUGF0aC5zdGFydHNXaXRoKFwiLi5cIikpIHtcbiAgICByZXR1cm4gYWJzb2x1dGVQYXRoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZWxhdGl2ZVBhdGg7XG4gIH1cbn1cbiJdfQ==