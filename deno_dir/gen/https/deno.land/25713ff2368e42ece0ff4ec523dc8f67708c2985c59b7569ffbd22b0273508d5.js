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
import { getEnv } from "./utils/env.ts";
const parse1Keys = ["env"];
const parse2Keys = ["if", "debug"];
const parse3ForGeneralKeys = [
    "if",
    "debug",
    "database",
    "sleep",
    "limit",
    "force",
];
const parse3ForStepKeys = [
    "id",
    "from",
    "use",
    "args",
];
const parse4ForSourceKeys = [
    "force",
    "itemsPath",
    "key",
    "limit",
    "reverse",
];
const parse6ForSourceKeys = [
    "filterFrom",
    "filterItemsFrom",
];
const parse7ForSourceKeys = [
    "cmd",
];
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
            keys: parse1Keys,
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
            keys: parse3ForGeneralKeys,
            default: {
                if: true,
            },
        });
        const workflowOptions = getFinalWorkflowOptions(parsedWorkflowGeneralOptionsWithGeneral ||
            {}, cliWorkflowOptions);
        isDebug = workflowOptions.debug || false;
        const workflowReporter = getReporter(`${getReporterName(ctx)}`, isDebug);
        if (!workflowOptions?.if) {
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
                            keys: parse1Keys,
                        });
                        sourceOptions = await parseObject(sourceOptions, ctx, {
                            keys: parse2Keys,
                            default: {
                                if: true,
                            },
                        });
                        if (sourceOptions?.debug || ctx.public.options?.debug) {
                            sourceReporter.level = log.LogLevels.DEBUG;
                        }
                        if (!sourceOptions.if) {
                            sourceReporter.info(`because if condition is false`, "Skip source");
                        }
                        sourceOptions = await parseObject(sourceOptions, {
                            ...ctx,
                            public: {
                                ...ctx.public,
                                env: {
                                    ...ctx.public.env,
                                    ...await getEnv(),
                                    ...sourceOptions.env,
                                },
                            },
                        }, {
                            keys: parse3ForStepKeys,
                        });
                        sourceOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, sourceOptions);
                        isDebug = sourceOptions.debug || false;
                        if (!sourceOptions.if) {
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
                        sourceOptions = await parseObject(sourceOptions, ctx, {
                            keys: parse4ForSourceKeys,
                        });
                        ctx = await getSourceItemsFromResult(ctx, {
                            ...sourceOptions,
                            reporter: sourceReporter,
                        });
                        sourceOptions = await parseObject(sourceOptions, ctx, {
                            keys: parse6ForSourceKeys,
                        });
                        ctx = await filterSourceItems(ctx, {
                            reporter: sourceReporter,
                            ...sourceOptions,
                        });
                        if (sourceOptions.cmd) {
                            sourceOptions = await parseObject(sourceOptions, ctx, {
                                keys: parse7ForSourceKeys,
                            });
                            const cmdResult = await runCmd(ctx, sourceOptions.cmd);
                            ctx = setCmdOkResult(ctx, cmdResult.stdout);
                        }
                        ctx = markSourceItems(ctx, sourceOptions);
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
                        ctx.sourcesOptions.push(sourceOptions);
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
                    sourceOptions = await parseObject(sourceOptions, ctx, {
                        keys: ["sleep"],
                    });
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
                let ifFilter = true;
                try {
                    filterOptions = await parseObject(filter, ctx, {
                        keys: parse1Keys,
                    });
                    filterOptions = await parseObject(filterOptions, ctx, {
                        keys: parse2Keys,
                        default: {
                            if: true,
                        },
                    });
                    if (filterOptions?.debug || ctx.public.options?.debug) {
                        filterReporter.level = log.LogLevels.DEBUG;
                    }
                    if (!filterOptions.if) {
                        ifFilter = false;
                        filterReporter.info(`because if condition is false`, "Skip filter");
                    }
                    else {
                        filterOptions = await parseObject(filterOptions, {
                            ...ctx,
                            public: {
                                ...ctx.public,
                                env: {
                                    ...ctx.public.env,
                                    ...await getEnv(),
                                    ...filterOptions.env,
                                },
                            },
                        }, {
                            keys: parse3ForStepKeys,
                        });
                        filterOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, filterOptions);
                        isDebug = filterOptions.debug || false;
                        if (!filterOptions.if) {
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
                            filterOptions = await parseObject(filterOptions, ctx, {
                                keys: ["cmd"],
                            });
                            const cmdResult = await runCmd(ctx, filterOptions.cmd);
                            ctx = setCmdOkResult(ctx, cmdResult.stdout);
                        }
                        ctx.public.filter = getStepResponse(ctx);
                        filterOptions = await parseObject(filterOptions, ctx, {
                            keys: ["limit"],
                        });
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
                if (ifFilter) {
                    filterReporter.info(`Total ${ctx.public.items.length} items`, "Finish handle filter");
                    filterOptions = await parseObject(filterOptions, ctx, {
                        keys: ["sleep"],
                    });
                    if (filterOptions.sleep && filterOptions.sleep > 0) {
                        filterReporter.info(`${filterOptions.sleep} seconds`, "Sleep");
                        await delay(filterOptions.sleep * 1000);
                    }
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
                            keys: parse1Keys,
                        });
                        stepOptions = await parseObject(stepOptions, ctx, {
                            keys: parse2Keys,
                            default: {
                                if: true,
                            },
                        });
                        if (stepOptions.debug || ctx.public.options?.debug) {
                            stepReporter.level = log.LogLevels.DEBUG;
                        }
                        if (!stepOptions.if) {
                            stepReporter.info(`because if condition is false`, "Skip step");
                        }
                        stepOptions = await parseObject(stepOptions, {
                            ...ctx,
                            public: {
                                ...ctx.public,
                                env: {
                                    ...ctx.public.env,
                                    ...await getEnv(),
                                    ...stepOptions.env,
                                },
                            },
                        }, {
                            keys: parse3ForStepKeys,
                            default: {
                                if: true,
                            },
                        });
                        stepOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, stepOptions);
                        isDebug = stepOptions.debug || false;
                        stepReporter.debug(`Start run this step.`);
                        if (!stepOptions.if) {
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
                            stepOptions = await parseObject(stepOptions, {
                                ...ctx,
                                public: {
                                    ...ctx.public,
                                    env: {
                                        ...ctx.public.env,
                                        ...await getEnv(),
                                        ...stepOptions.env,
                                    },
                                },
                            }, {
                                keys: ["cmd"],
                            });
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
                    stepOptions = await parseObject(stepOptions, ctx, {
                        keys: ["sleep"],
                    });
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
                        keys: parse1Keys,
                    });
                    postOptions = await parseObject(postOptions, ctx, {
                        keys: parse2Keys,
                        default: {
                            if: true,
                        },
                    });
                    if (postOptions.debug || ctx.public.options?.debug) {
                        postReporter.level = log.LogLevels.DEBUG;
                    }
                    if (!postOptions.if) {
                        postReporter.info(`because if condition is false`, "Skip post");
                        continue;
                    }
                    postOptions = await parseObject(postOptions, {
                        ...ctx,
                        public: {
                            ...ctx.public,
                            env: {
                                ...ctx.public.env,
                                ...await getEnv(),
                                ...postOptions.env,
                            },
                        },
                    }, {
                        keys: parse3ForStepKeys,
                    });
                    postOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, postOptions);
                    isDebug = postOptions.debug || false;
                    postReporter.info(`Start run post.`);
                    ctx = await runStep(ctx, {
                        ...postOptions,
                        reporter: postReporter,
                    });
                    if (postOptions.cmd) {
                        postOptions = await parseObject(postOptions, ctx, {
                            keys: ["cmd"],
                        });
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
                postOptions = await parseObject(postOptions, ctx, {
                    keys: ["sleep"],
                });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuLXdvcmtmbG93cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bi13b3JrZmxvd3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBT0EsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdEQsT0FBTyxFQUFXLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3pFLE9BQU8sRUFDTCxjQUFjLEVBQ2Qsd0JBQXdCLEdBQ3pCLE1BQU0sbUNBQW1DLENBQUM7QUFDM0MsT0FBTyxFQUNMLE1BQU0sRUFDTixLQUFLLEVBQ0wsT0FBTyxFQUNQLElBQUksRUFDSixHQUFHLEVBQ0gsUUFBUSxFQUNSLFFBQVEsR0FDVCxNQUFNLFlBQVksQ0FBQztBQUNwQixPQUFPLE1BQU0sRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNsRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sY0FB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QUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ25CO0lBQ0QsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNyQixNQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDL0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3ZCLE1BQU0sQ0FBQyxLQUFLLENBQ1YsT0FBTyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FDcEQsQ0FBQztZQUNGLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0tBQzVDO0FBQ0gsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLEdBQVk7SUFDbkMsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQztJQUNyRCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUM3QyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDakMsT0FBTyxZQUFZLENBQUM7S0FDckI7U0FBTTtRQUNMLE9BQU8sWUFBWSxDQUFDO0tBQ3JCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIEZpbHRlck9wdGlvbnMsXG4gIFJ1bldvcmtmbG93T3B0aW9ucyxcbiAgU291cmNlT3B0aW9ucyxcbiAgU3RlcE9wdGlvbnMsXG4gIFdvcmtmbG93T3B0aW9ucyxcbn0gZnJvbSBcIi4vaW50ZXJmYWNlLnRzXCI7XG5pbXBvcnQgeyBoYXNQZXJtaXNzaW9uU2xpZW50IH0gZnJvbSBcIi4vcGVybWlzc2lvbi50c1wiO1xuaW1wb3J0IHsgQ29udGV4dCwgU3RlcFR5cGUgfSBmcm9tIFwiLi9pbnRlcm5hbC1pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7IHBhcnNlV29ya2Zsb3cgfSBmcm9tIFwiLi9wYXJzZS13b3JrZmxvdy50c1wiO1xuaW1wb3J0IHsgZ2V0Q29udGVudCB9IGZyb20gXCIuL3V0aWxzL2ZpbGUudHNcIjtcbmltcG9ydCB7IGdldEZpbGVzQnlGaWx0ZXIgfSBmcm9tIFwiLi91dGlscy9maWx0ZXIudHNcIjtcbmltcG9ydCB7IGlzT2JqZWN0IH0gZnJvbSBcIi4vdXRpbHMvb2JqZWN0LnRzXCI7XG5pbXBvcnQgeyBwYXJzZU9iamVjdCB9IGZyb20gXCIuL3BhcnNlLW9iamVjdC50c1wiO1xuaW1wb3J0IHsgaXNSZW1vdGVQYXRoIH0gZnJvbSBcIi4vdXRpbHMvcGF0aC50c1wiO1xuaW1wb3J0IHsgZ2V0U3RlcFJlc3BvbnNlLCBydW5TdGVwLCBzZXRFcnJvclJlc3VsdCB9IGZyb20gXCIuL3J1bi1zdGVwLnRzXCI7XG5pbXBvcnQge1xuICBmaWx0ZXJDdHhJdGVtcyxcbiAgZ2V0U291cmNlSXRlbXNGcm9tUmVzdWx0LFxufSBmcm9tIFwiLi9nZXQtc291cmNlLWl0ZW1zLWZyb20tcmVzdWx0LnRzXCI7XG5pbXBvcnQge1xuICBjb25maWcsXG4gIGRlbGF5LFxuICBkaXJuYW1lLFxuICBqb2luLFxuICBsb2csXG4gIHJlbGF0aXZlLFxuICBTcWxpdGVEYixcbn0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmltcG9ydCByZXBvcnQsIHsgZ2V0UmVwb3J0ZXIgfSBmcm9tIFwiLi9yZXBvcnQudHNcIjtcbmltcG9ydCB7IEtleWRiIH0gZnJvbSBcIi4vYWRhcHRlcnMvanNvbi1zdG9yZS1hZGFwdGVyLnRzXCI7XG5pbXBvcnQgeyBmaWx0ZXJTb3VyY2VJdGVtcyB9IGZyb20gXCIuL2ZpbHRlci1zb3VyY2UtaXRlbXMudHNcIjtcbmltcG9ydCB7IG1hcmtTb3VyY2VJdGVtcyB9IGZyb20gXCIuL21hcmstc291cmNlLWl0ZW1zLnRzXCI7XG5pbXBvcnQgeyBydW5DbWQsIHNldENtZE9rUmVzdWx0IH0gZnJvbSBcIi4vcnVuLWNtZC50c1wiO1xuaW1wb3J0IHtcbiAgZ2V0RmluYWxSdW5PcHRpb25zLFxuICBnZXRGaW5hbFNvdXJjZU9wdGlvbnMsXG4gIGdldEZpbmFsV29ya2Zsb3dPcHRpb25zLFxufSBmcm9tIFwiLi9kZWZhdWx0LW9wdGlvbnMudHNcIjtcbmltcG9ydCB7IHJ1blBvc3QgfSBmcm9tIFwiLi9ydW4tcG9zdC50c1wiO1xuaW1wb3J0IHsgcnVuQXNzZXJ0IH0gZnJvbSBcIi4vcnVuLWFzc2VydC50c1wiO1xuaW1wb3J0IHsgZ2V0RW52IH0gZnJvbSBcIi4vdXRpbHMvZW52LnRzXCI7XG5cbmludGVyZmFjZSBWYWxpZFdvcmtmbG93IHtcbiAgY3R4OiBDb250ZXh0O1xuICB3b3JrZmxvdzogV29ya2Zsb3dPcHRpb25zO1xufVxuXG5jb25zdCBwYXJzZTFLZXlzID0gW1wiZW52XCJdO1xuY29uc3QgcGFyc2UyS2V5cyA9IFtcImlmXCIsIFwiZGVidWdcIl07XG5jb25zdCBwYXJzZTNGb3JHZW5lcmFsS2V5cyA9IFtcbiAgXCJpZlwiLFxuICBcImRlYnVnXCIsXG4gIFwiZGF0YWJhc2VcIixcbiAgXCJzbGVlcFwiLFxuICBcImxpbWl0XCIsXG4gIFwiZm9yY2VcIixcbl07XG5jb25zdCBwYXJzZTNGb3JTdGVwS2V5cyA9IFtcbiAgXCJpZFwiLFxuICBcImZyb21cIixcbiAgXCJ1c2VcIixcbiAgXCJhcmdzXCIsXG5dO1xuY29uc3QgcGFyc2U0Rm9yU291cmNlS2V5cyA9IFtcbiAgXCJmb3JjZVwiLFxuICBcIml0ZW1zUGF0aFwiLFxuICBcImtleVwiLFxuICBcImxpbWl0XCIsXG4gIFwicmV2ZXJzZVwiLFxuXTtcblxuY29uc3QgcGFyc2U2Rm9yU291cmNlS2V5cyA9IFtcbiAgXCJmaWx0ZXJGcm9tXCIsXG4gIFwiZmlsdGVySXRlbXNGcm9tXCIsXG5dO1xuY29uc3QgcGFyc2U3Rm9yU291cmNlS2V5cyA9IFtcbiAgXCJjbWRcIixcbl07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW4ocnVuT3B0aW9uczogUnVuV29ya2Zsb3dPcHRpb25zKSB7XG4gIGNvbnN0IGRlYnVnRW52UGVybW1pc2lvbiA9IHsgbmFtZTogXCJlbnZcIiwgdmFyaWFibGU6IFwiREVCVUdcIiB9IGFzIGNvbnN0O1xuICBjb25zdCBkYXRhUGVybWlzc2lvbiA9IHsgbmFtZTogXCJyZWFkXCIsIHBhdGg6IFwiZGF0YVwiIH0gYXMgY29uc3Q7XG4gIGxldCBEZWJ1Z0VudlZhbHVlID0gdW5kZWZpbmVkO1xuICBpZiAoYXdhaXQgaGFzUGVybWlzc2lvblNsaWVudChkZWJ1Z0VudlBlcm1taXNpb24pKSB7XG4gICAgRGVidWdFbnZWYWx1ZSA9IERlbm8uZW52LmdldChcIkRFQlVHXCIpO1xuICB9XG4gIGxldCBpc0RlYnVnID0gISEoRGVidWdFbnZWYWx1ZSAhPT0gdW5kZWZpbmVkICYmIERlYnVnRW52VmFsdWUgIT09IFwiZmFsc2VcIik7XG5cbiAgY29uc3QgY2xpV29ya2Zsb3dPcHRpb25zID0gZ2V0RmluYWxSdW5PcHRpb25zKHJ1bk9wdGlvbnMsIGlzRGVidWcpO1xuICBpc0RlYnVnID0gY2xpV29ya2Zsb3dPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuICBjb25zdCB7XG4gICAgZmlsZXMsXG4gICAgY29udGVudCxcbiAgfSA9IGNsaVdvcmtmbG93T3B0aW9ucztcbiAgbGV0IHdvcmtmbG93RmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGN3ZCA9IERlbm8uY3dkKCk7XG4gIGlmIChjb250ZW50KSB7XG4gICAgd29ya2Zsb3dGaWxlcyA9IFtdO1xuICB9IGVsc2Uge1xuICAgIHdvcmtmbG93RmlsZXMgPSBhd2FpdCBnZXRGaWxlc0J5RmlsdGVyKGN3ZCwgZmlsZXMpO1xuICB9XG5cbiAgbGV0IGVudiA9IHt9O1xuXG4gIGNvbnN0IGFsbEVudlBlcm1taXNpb24gPSB7IG5hbWU6IFwiZW52XCIgfSBhcyBjb25zdDtcblxuICAvLyBmaXJzdCB0cnkgdG8gZ2V0IC5lbnZcbiAgY29uc3QgZG90RW52RmlsZVBlcm1taXNpb24gPSB7XG4gICAgbmFtZTogXCJyZWFkXCIsXG4gICAgcGF0aDogXCIuZW52LC5lbnYuZGVmYXVsdHMsLmVudi5leGFtcGxlXCIsXG4gIH0gYXMgY29uc3Q7XG5cbiAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoZG90RW52RmlsZVBlcm1taXNpb24pKSB7XG4gICAgZW52ID0gY29uZmlnKCk7XG4gIH1cblxuICBpZiAoYXdhaXQgaGFzUGVybWlzc2lvblNsaWVudChhbGxFbnZQZXJtbWlzaW9uKSkge1xuICAgIGVudiA9IHtcbiAgICAgIC4uLmVudixcbiAgICAgIC4uLkRlbm8uZW52LnRvT2JqZWN0KCksXG4gICAgfTtcbiAgfVxuXG4gIC8vIGdldCBvcHRpb25zXG4gIGxldCB2YWxpZFdvcmtmbG93czogVmFsaWRXb3JrZmxvd1tdID0gW107XG5cbiAgLy8gaWYgc3RkaW5cblxuICBpZiAoY29udGVudCkge1xuICAgIGNvbnN0IHdvcmtmbG93ID0gcGFyc2VXb3JrZmxvdyhjb250ZW50KTtcblxuICAgIGlmIChpc09iamVjdCh3b3JrZmxvdykpIHtcbiAgICAgIGNvbnN0IHdvcmtmbG93RmlsZVBhdGggPSBcIi90bXAvZGVub2Zsb3cvdG1wLXdvcmtmbG93LnltbFwiO1xuICAgICAgY29uc3Qgd29ya2Zsb3dSZWxhdGl2ZVBhdGggPSByZWxhdGl2ZShjd2QsIHdvcmtmbG93RmlsZVBhdGgpO1xuICAgICAgdmFsaWRXb3JrZmxvd3MucHVzaCh7XG4gICAgICAgIGN0eDoge1xuICAgICAgICAgIHB1YmxpYzoge1xuICAgICAgICAgICAgZW52LFxuICAgICAgICAgICAgd29ya2Zsb3dQYXRoOiB3b3JrZmxvd0ZpbGVQYXRoLFxuICAgICAgICAgICAgd29ya2Zsb3dSZWxhdGl2ZVBhdGgsXG4gICAgICAgICAgICB3b3JrZmxvd0N3ZDogZGlybmFtZSh3b3JrZmxvd0ZpbGVQYXRoKSxcbiAgICAgICAgICAgIGN3ZDogY3dkLFxuICAgICAgICAgICAgc291cmNlczoge30sXG4gICAgICAgICAgICBzdGVwczoge30sXG4gICAgICAgICAgICBzdGF0ZTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgaXRlbXM6IFtdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgaXRlbVNvdXJjZU9wdGlvbnM6IHVuZGVmaW5lZCxcbiAgICAgICAgICBzb3VyY2VzT3B0aW9uczogW10sXG4gICAgICAgICAgY3VycmVudFN0ZXBUeXBlOiBTdGVwVHlwZS5Tb3VyY2UsXG4gICAgICAgIH0sXG4gICAgICAgIHdvcmtmbG93OiB3b3JrZmxvdyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGVycm9ycyA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHdvcmtmbG93RmlsZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCB3b3JrZmxvd1JlbGF0aXZlUGF0aCA9IHdvcmtmbG93RmlsZXNbaV07XG4gICAgbGV0IGZpbGVDb250ZW50ID0gXCJcIjtcbiAgICBsZXQgd29ya2Zsb3dGaWxlUGF0aCA9IFwiXCI7XG4gICAgaWYgKGlzUmVtb3RlUGF0aCh3b3JrZmxvd1JlbGF0aXZlUGF0aCkpIHtcbiAgICAgIGNvbnN0IG5ldENvbnRlbnQgPSBhd2FpdCBmZXRjaCh3b3JrZmxvd1JlbGF0aXZlUGF0aCk7XG4gICAgICB3b3JrZmxvd0ZpbGVQYXRoID0gd29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgICBmaWxlQ29udGVudCA9IGF3YWl0IG5ldENvbnRlbnQudGV4dCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3b3JrZmxvd0ZpbGVQYXRoID0gam9pbihjd2QsIHdvcmtmbG93UmVsYXRpdmVQYXRoKTtcbiAgICAgIGZpbGVDb250ZW50ID0gYXdhaXQgZ2V0Q29udGVudCh3b3JrZmxvd0ZpbGVQYXRoKTtcbiAgICB9XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IHBhcnNlV29ya2Zsb3coZmlsZUNvbnRlbnQpO1xuICAgIGlmICghaXNPYmplY3Qod29ya2Zsb3cpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB2YWxpZFdvcmtmbG93cy5wdXNoKHtcbiAgICAgIGN0eDoge1xuICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICBlbnYsXG4gICAgICAgICAgd29ya2Zsb3dQYXRoOiB3b3JrZmxvd0ZpbGVQYXRoLFxuICAgICAgICAgIHdvcmtmbG93UmVsYXRpdmVQYXRoOiB3b3JrZmxvd1JlbGF0aXZlUGF0aCxcbiAgICAgICAgICB3b3JrZmxvd0N3ZDogZGlybmFtZSh3b3JrZmxvd0ZpbGVQYXRoKSxcbiAgICAgICAgICBjd2Q6IGN3ZCxcbiAgICAgICAgICBzb3VyY2VzOiB7fSxcbiAgICAgICAgICBzdGVwczoge30sXG4gICAgICAgICAgc3RhdGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICBpdGVtczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIGl0ZW1Tb3VyY2VPcHRpb25zOiB1bmRlZmluZWQsXG4gICAgICAgIHNvdXJjZXNPcHRpb25zOiBbXSxcbiAgICAgICAgY3VycmVudFN0ZXBUeXBlOiBTdGVwVHlwZS5Tb3VyY2UsXG4gICAgICB9LFxuICAgICAgd29ya2Zsb3c6IHdvcmtmbG93LFxuICAgIH0pO1xuICAgIC8vIHJ1biBjb2RlXG4gIH1cbiAgLy8gc29ydCBieSBhbHBoYWJldFxuICB2YWxpZFdvcmtmbG93cyA9IHZhbGlkV29ya2Zsb3dzLnNvcnQoKGEsIGIpID0+IHtcbiAgICBjb25zdCBhUGF0aCA9IGEuY3R4LnB1YmxpYy53b3JrZmxvd1JlbGF0aXZlUGF0aDtcbiAgICBjb25zdCBiUGF0aCA9IGIuY3R4LnB1YmxpYy53b3JrZmxvd1JlbGF0aXZlUGF0aDtcbiAgICBpZiAoYVBhdGggPCBiUGF0aCkge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbiAgICBpZiAoYVBhdGggPiBiUGF0aCkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9KTtcbiAgcmVwb3J0LmluZm8oXG4gICAgYCAke3ZhbGlkV29ya2Zsb3dzLmxlbmd0aH0gdmFsaWQgd29ya2Zsb3dzOlxcbiR7XG4gICAgICB2YWxpZFdvcmtmbG93cy5tYXAoKGl0ZW0pID0+IGdldFJlcG9ydGVyTmFtZShpdGVtLmN0eCkpLmpvaW4oXG4gICAgICAgIFwiXFxuXCIsXG4gICAgICApXG4gICAgfVxcbmAsXG4gICAgXCJTdWNjZXNzIGZvdW5kXCIsXG4gICk7XG4gIC8vIHJ1biB3b3JrZmxvd3Mgc3RlcCBieSBzdGVwXG4gIGZvciAoXG4gICAgbGV0IHdvcmtmbG93SW5kZXggPSAwO1xuICAgIHdvcmtmbG93SW5kZXggPCB2YWxpZFdvcmtmbG93cy5sZW5ndGg7XG4gICAgd29ya2Zsb3dJbmRleCsrXG4gICkge1xuICAgIGxldCB7IGN0eCwgd29ya2Zsb3cgfSA9IHZhbGlkV29ya2Zsb3dzW3dvcmtmbG93SW5kZXhdO1xuICAgIC8vIHBhcnNlIHJvb3QgZW52IGZpcnN0XG4gICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgY29uc3QgcGFyc2VkV29ya2Zsb3dGaWxlT3B0aW9uc1dpdGhFbnYgPSBhd2FpdCBwYXJzZU9iamVjdCh3b3JrZmxvdywgY3R4LCB7XG4gICAgICBrZXlzOiBwYXJzZTFLZXlzLFxuICAgIH0pIGFzIFdvcmtmbG93T3B0aW9ucztcbiAgICAvLyBydW4gZW52XG4gICAgLy8gcGFyc2UgZW52IHRvIGVudlxuICAgIGlmIChwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudi5lbnYpIHtcbiAgICAgIGZvciAoY29uc3Qga2V5IGluIHBhcnNlZFdvcmtmbG93RmlsZU9wdGlvbnNXaXRoRW52LmVudikge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHBhcnNlZFdvcmtmbG93RmlsZU9wdGlvbnNXaXRoRW52LmVudltrZXldO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgY29uc3QgZGVidWdFbnZQZXJtbWlzaW9uID0geyBuYW1lOiBcImVudlwiLCB2YXJpYWJsZToga2V5IH0gYXMgY29uc3Q7XG4gICAgICAgICAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoZGVidWdFbnZQZXJtbWlzaW9uKSkge1xuICAgICAgICAgICAgRGVuby5lbnYuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHBhcnNlIGdlbmVyYWwgb3B0aW9uc1xuXG4gICAgY29uc3QgcGFyc2VkV29ya2Zsb3dHZW5lcmFsT3B0aW9uc1dpdGhHZW5lcmFsID0gYXdhaXQgcGFyc2VPYmplY3QoXG4gICAgICBwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudixcbiAgICAgIGN0eCxcbiAgICAgIHtcbiAgICAgICAga2V5czogcGFyc2UzRm9yR2VuZXJhbEtleXMsXG4gICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICBpZjogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgKSBhcyBXb3JrZmxvd09wdGlvbnM7XG5cbiAgICBjb25zdCB3b3JrZmxvd09wdGlvbnMgPSBnZXRGaW5hbFdvcmtmbG93T3B0aW9ucyhcbiAgICAgIHBhcnNlZFdvcmtmbG93R2VuZXJhbE9wdGlvbnNXaXRoR2VuZXJhbCB8fFxuICAgICAgICB7fSxcbiAgICAgIGNsaVdvcmtmbG93T3B0aW9ucyxcbiAgICApO1xuICAgIGlzRGVidWcgPSB3b3JrZmxvd09wdGlvbnMuZGVidWcgfHwgZmFsc2U7XG5cbiAgICBjb25zdCB3b3JrZmxvd1JlcG9ydGVyID0gZ2V0UmVwb3J0ZXIoXG4gICAgICBgJHtnZXRSZXBvcnRlck5hbWUoY3R4KX1gLFxuICAgICAgaXNEZWJ1ZyxcbiAgICApO1xuXG4gICAgLy8gY2hlY2sgaWYgbmVlZCB0byBydW5cbiAgICBpZiAoIXdvcmtmbG93T3B0aW9ucz8uaWYpIHtcbiAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgYGJlY2F1c2UgaWYgY29uZGl0aW9uIGlzIGZhbHNlYCxcbiAgICAgICAgXCJTa2lwIHdvcmtmbG93XCIsXG4gICAgICApO1xuICAgICAgY29udGludWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgYGAsXG4gICAgICAgIFwiU3RhcnQgaGFuZGxlIHdvcmtmbG93XCIsXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIG1lcmdlIHRvIGdldCBkZWZhdWx0XG4gICAgY3R4LnB1YmxpYy5vcHRpb25zID0gd29ya2Zsb3dPcHRpb25zO1xuXG4gICAgY29uc3QgZGF0YWJhc2UgPSB3b3JrZmxvd09wdGlvbnMuZGF0YWJhc2UgYXMgc3RyaW5nO1xuICAgIGxldCBkYjtcblxuICAgIGlmIChkYXRhYmFzZT8uc3RhcnRzV2l0aChcInNxbGl0ZVwiKSkge1xuICAgICAgZGIgPSBuZXcgU3FsaXRlRGIoZGF0YWJhc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgbmFtZXNwYWNlID0gY3R4LnB1YmxpYy53b3JrZmxvd1JlbGF0aXZlUGF0aDtcbiAgICAgIGlmIChuYW1lc3BhY2Uuc3RhcnRzV2l0aChcIi4uXCIpKSB7XG4gICAgICAgIC8vIHVzZSBhYnNvbHV0ZSBwYXRoIGFzIG5hbWVzcGFjZVxuICAgICAgICBuYW1lc3BhY2UgPSBgQGRlbm9mbG93Um9vdCR7Y3R4LnB1YmxpYy53b3JrZmxvd1BhdGh9YDtcbiAgICAgIH1cblxuICAgICAgZGIgPSBuZXcgS2V5ZGIoZGF0YWJhc2UsIHtcbiAgICAgICAgbmFtZXNwYWNlOiBuYW1lc3BhY2UsXG4gICAgICB9KTtcbiAgICB9XG4gICAgY3R4LmRiID0gZGI7XG4gICAgLy8gY2hlY2sgcGVybWlzc2lvblxuICAgIC8vIHVuaXF1ZSBrZXlcbiAgICBsZXQgc3RhdGU7XG4gICAgbGV0IGludGVybmFsU3RhdGUgPSB7XG4gICAgICBrZXlzOiBbXSxcbiAgICB9O1xuICAgIGlmIChhd2FpdCBoYXNQZXJtaXNzaW9uU2xpZW50KGRhdGFQZXJtaXNzaW9uKSkge1xuICAgICAgc3RhdGUgPSBhd2FpdCBkYi5nZXQoXCJzdGF0ZVwiKSB8fCB1bmRlZmluZWQ7XG4gICAgICBpbnRlcm5hbFN0YXRlID0gYXdhaXQgZGIuZ2V0KFwiaW50ZXJuYWxTdGF0ZVwiKSB8fCB7XG4gICAgICAgIGtleXM6IFtdLFxuICAgICAgfTtcbiAgICB9XG4gICAgY3R4LnB1YmxpYy5zdGF0ZSA9IHN0YXRlO1xuICAgIGN0eC5pbnRlcm5hbFN0YXRlID0gaW50ZXJuYWxTdGF0ZTtcbiAgICBjdHguaW5pdFN0YXRlID0gSlNPTi5zdHJpbmdpZnkoc3RhdGUpO1xuICAgIGN0eC5pbml0SW50ZXJuYWxTdGF0ZSA9IEpTT04uc3RyaW5naWZ5KGludGVybmFsU3RhdGUpO1xuXG4gICAgY29uc3Qgc291cmNlcyA9IHdvcmtmbG93LnNvdXJjZXM7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKHNvdXJjZXMpIHtcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFwiXCIsIFwiU3RhcnQgZ2V0IHNvdXJjZXNcIik7XG4gICAgICAgIGZvciAobGV0IHNvdXJjZUluZGV4ID0gMDsgc291cmNlSW5kZXggPCBzb3VyY2VzLmxlbmd0aDsgc291cmNlSW5kZXgrKykge1xuICAgICAgICAgIGNvbnN0IHNvdXJjZSA9IHNvdXJjZXNbc291cmNlSW5kZXhdO1xuICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlSW5kZXggPSBzb3VyY2VJbmRleDtcbiAgICAgICAgICBjb25zdCBzb3VyY2VSZXBvcnRlciA9IGdldFJlcG9ydGVyKFxuICAgICAgICAgICAgYCR7Z2V0UmVwb3J0ZXJOYW1lKGN0eCl9IC0+IHNvdXJjZToke2N0eC5wdWJsaWMuc291cmNlSW5kZXh9YCxcbiAgICAgICAgICAgIGlzRGVidWcsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBsZXQgc291cmNlT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIC4uLnNvdXJjZSxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBwYXJzZSBlbnYgZmlyc3RcbiAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzb3VyY2UsIGN0eCwge1xuICAgICAgICAgICAgICBrZXlzOiBwYXJzZTFLZXlzLFxuICAgICAgICAgICAgfSkgYXMgU291cmNlT3B0aW9ucztcblxuICAgICAgICAgICAgLy8gcGFyc2UgaWYgb25seVxuICAgICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgICAgICAgICBzb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICBjdHgsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXlzOiBwYXJzZTJLZXlzLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICAgIGlmOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICApIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIHNldCBsb2cgbGV2ZWxcbiAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zPy5kZWJ1ZyB8fCBjdHgucHVibGljLm9wdGlvbnM/LmRlYnVnKSB7XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY2hlY2sgaWYgbmVlZCB0byBydW5cbiAgICAgICAgICAgIGlmICghc291cmNlT3B0aW9ucy5pZikge1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICAgIGBiZWNhdXNlIGlmIGNvbmRpdGlvbiBpcyBmYWxzZWAsXG4gICAgICAgICAgICAgICAgXCJTa2lwIHNvdXJjZVwiLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwYXJzZSBvblxuICAgICAgICAgICAgLy8gaW5zZXJ0IHN0ZXAgZW52XG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoXG4gICAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgICAgICAuLi5hd2FpdCBnZXRFbnYoKSxcbiAgICAgICAgICAgICAgICAgICAgLi4uc291cmNlT3B0aW9ucy5lbnYsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXlzOiBwYXJzZTNGb3JTdGVwS2V5cyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICkgYXMgU291cmNlT3B0aW9ucztcblxuICAgICAgICAgICAgLy8gZ2V0IG9wdGlvbnNcbiAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBnZXRGaW5hbFNvdXJjZU9wdGlvbnMoXG4gICAgICAgICAgICAgIHdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgY2xpV29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgICBzb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaXNEZWJ1ZyA9IHNvdXJjZU9wdGlvbnMuZGVidWcgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmXG4gICAgICAgICAgICBpZiAoIXNvdXJjZU9wdGlvbnMuaWYpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmVycm9yID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZFJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRDb2RlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZE9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5pc1JlYWxPayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuaWQpIHtcbiAgICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlT3B0aW9ucy5pZF0gPVxuICAgICAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJ1biBzb3VyY2VcbiAgICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1blN0ZXAoY3R4LCB7XG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBwYXJzZTRcbiAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzb3VyY2VPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2U0Rm9yU291cmNlS2V5cyxcbiAgICAgICAgICAgIH0pIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIGdldCBzb3VyY2UgaXRlbXMgYnkgaXRlbXNQYXRoLCBrZXlcbiAgICAgICAgICAgIGN0eCA9IGF3YWl0IGdldFNvdXJjZUl0ZW1zRnJvbVJlc3VsdChjdHgsIHtcbiAgICAgICAgICAgICAgLi4uc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHNvdXJjZVJlcG9ydGVyLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIHBhcnNlNlxuXG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlNkZvclNvdXJjZUtleXMsXG4gICAgICAgICAgICB9KSBhcyBTb3VyY2VPcHRpb25zO1xuICAgICAgICAgICAgLy8gcnVuIHVzZXIgZmlsdGVyLCBmaWx0ZXIgZnJvbSwgZmlsdGVySXRlbXMsIGZpbHRlckl0ZW1zRnJvbSwgb25seSBhbGxvdyBvbmUuXG4gICAgICAgICAgICBjdHggPSBhd2FpdCBmaWx0ZXJTb3VyY2VJdGVtcyhjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHNvdXJjZVJlcG9ydGVyLFxuICAgICAgICAgICAgICAuLi5zb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIHJ1biBjbWRcblxuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuY21kKSB7XG4gICAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzb3VyY2VPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAgICBrZXlzOiBwYXJzZTdGb3JTb3VyY2VLZXlzLFxuICAgICAgICAgICAgICB9KSBhcyBTb3VyY2VPcHRpb25zO1xuICAgICAgICAgICAgICBjb25zdCBjbWRSZXN1bHQgPSBhd2FpdCBydW5DbWQoY3R4LCBzb3VyY2VPcHRpb25zLmNtZCBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgICBjdHggPSBzZXRDbWRPa1Jlc3VsdChjdHgsIGNtZFJlc3VsdC5zdGRvdXQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBtYXJrIHNvdXJjZSBpdGVtcywgYWRkIHVuaXF1ZSBrZXkgYW5kIHNvdXJjZSBpbmRleCB0byBpdGVtc1xuICAgICAgICAgICAgY3R4ID0gbWFya1NvdXJjZUl0ZW1zKGN0eCwgc291cmNlT3B0aW9ucyk7XG4gICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5pZCkge1xuICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlT3B0aW9ucy5pZF0gPVxuICAgICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHJ1biBhc3NlcnRcbiAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLmFzc2VydCkge1xuICAgICAgICAgICAgICBjdHggPSBhd2FpdCBydW5Bc3NlcnQoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVwb3J0ZXI6IHNvdXJjZVJlcG9ydGVyLFxuICAgICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAvLyBydW4gcG9zdFxuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICAgIFwiXCIsXG4gICAgICAgICAgICAgICAgYFNvdXJjZSAke3NvdXJjZUluZGV4fSBnZXQgJHtjdHgucHVibGljLml0ZW1zLmxlbmd0aH0gaXRlbXNgLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5wb3N0KSB7XG4gICAgICAgICAgICAgIGF3YWl0IHJ1blBvc3QoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVwb3J0ZXI6IHNvdXJjZVJlcG9ydGVyLFxuICAgICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3R4LnNvdXJjZXNPcHRpb25zLnB1c2goc291cmNlT3B0aW9ucyk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY3R4ID0gc2V0RXJyb3JSZXN1bHQoY3R4LCBlKTtcbiAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaWQpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZS5pZF0gPSBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNvdXJjZS5jb250aW51ZU9uRXJyb3IpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5vayA9IHRydWU7XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgICAgYEZhaWxlZCBydW4gc291cmNlYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIud2FybmluZyhlKTtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgICBgSWdub3JlIHRoaXMgZXJyb3IsIGJlY2F1c2UgY29udGludWVPbkVycm9yIGlzIHRydWUuYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHJ1biBzb3VyY2VgLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBwYXJzZSA4IHNsZWVwXG4gICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHNvdXJjZU9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAga2V5czogW1wic2xlZXBcIl0sXG4gICAgICAgICAgfSkgYXMgU291cmNlT3B0aW9ucztcblxuICAgICAgICAgIC8vIGNoZWNrIGlzIG5lZWQgc2xlZXBcbiAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5zbGVlcCAmJiBzb3VyY2VPcHRpb25zLnNsZWVwID4gMCkge1xuICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgYCR7c291cmNlT3B0aW9ucy5zbGVlcH0gc2Vjb25kc2AsXG4gICAgICAgICAgICAgIFwiU2xlZXBcIixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBhd2FpdCBkZWxheShzb3VyY2VPcHRpb25zLnNsZWVwICogMTAwMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGluc2VydCBuZXcgY3R4Lml0ZW1zXG4gICAgICBpZiAoc291cmNlcykge1xuICAgICAgICBsZXQgY29sbGVjdEN0eEl0ZW1zOiB1bmtub3duW10gPSBbXTtcbiAgICAgICAgc291cmNlcy5mb3JFYWNoKChfLCB0aGVTb3VyY2VJbmRleCkgPT4ge1xuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGN0eC5wdWJsaWMuc291cmNlc1t0aGVTb3VyY2VJbmRleF0ucmVzdWx0KSkge1xuICAgICAgICAgICAgY29sbGVjdEN0eEl0ZW1zID0gY29sbGVjdEN0eEl0ZW1zLmNvbmNhdChcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3RoZVNvdXJjZUluZGV4XS5yZXN1bHQsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGN0eC5wdWJsaWMuaXRlbXMgPSBjb2xsZWN0Q3R4SXRlbXM7XG4gICAgICAgIGlmIChjdHgucHVibGljLml0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgVG90YWwgJHtjdHgucHVibGljLml0ZW1zLmxlbmd0aH0gaXRlbXNgLFxuICAgICAgICAgICAgXCJGaW5pc2ggZ2V0IHNvdXJjZXNcIixcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGlmIGl0ZW1zID4wLCB0aGVuIGNvbnRpbnVlXG4gICAgICBpZiAoKGN0eC5wdWJsaWMuaXRlbXMgYXMgdW5rbm93bltdKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gbm8gbmVlZCB0byBoYW5kbGUgc3RlcHNcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFxuICAgICAgICAgIGBiZWNhdXNlIG5vIGFueSB2YWxpZCBzb3VyY2VzIGl0ZW1zIHJldHVybmVkYCxcbiAgICAgICAgICBcIlNraXAgd29ya2Zsb3dcIixcbiAgICAgICAgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIHJ1biBmaWx0ZXJcbiAgICAgIGNvbnN0IGZpbHRlciA9IHdvcmtmbG93LmZpbHRlcjtcbiAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgY3R4LmN1cnJlbnRTdGVwVHlwZSA9IFN0ZXBUeXBlLkZpbHRlcjtcbiAgICAgICAgY29uc3QgZmlsdGVyUmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICBgJHtnZXRSZXBvcnRlck5hbWUoY3R4KX0gLT4gZmlsdGVyYCxcbiAgICAgICAgICBpc0RlYnVnLFxuICAgICAgICApO1xuICAgICAgICBsZXQgZmlsdGVyT3B0aW9ucyA9IHsgLi4uZmlsdGVyIH07XG4gICAgICAgIGxldCBpZkZpbHRlciA9IHRydWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KGZpbHRlciwgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBwYXJzZTFLZXlzLFxuICAgICAgICAgIH0pIGFzIEZpbHRlck9wdGlvbnM7XG5cbiAgICAgICAgICAvLyBwYXJzZSBpZiBkZWJ1ZyBvbmx5XG4gICAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgICAgICAgZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICAgIGN0eCxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2UyS2V5cyxcbiAgICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIGlmOiB0cnVlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICApIGFzIEZpbHRlck9wdGlvbnM7XG5cbiAgICAgICAgICAvLyBzZXQgbG9nIGxldmVsXG4gICAgICAgICAgaWYgKGZpbHRlck9wdGlvbnM/LmRlYnVnIHx8IGN0eC5wdWJsaWMub3B0aW9ucz8uZGVidWcpIHtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBjaGVjayBpZiBuZWVkIHRvIHJ1blxuICAgICAgICAgIGlmICghZmlsdGVyT3B0aW9ucy5pZikge1xuICAgICAgICAgICAgaWZGaWx0ZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgIGBiZWNhdXNlIGlmIGNvbmRpdGlvbiBpcyBmYWxzZWAsXG4gICAgICAgICAgICAgIFwiU2tpcCBmaWx0ZXJcIixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHBhcnNlIG9uXG4gICAgICAgICAgICAvLyBpbnNlcnQgc3RlcCBlbnZcbiAgICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChcbiAgICAgICAgICAgICAgZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYy5lbnYsXG4gICAgICAgICAgICAgICAgICAgIC4uLmF3YWl0IGdldEVudigpLFxuICAgICAgICAgICAgICAgICAgICAuLi5maWx0ZXJPcHRpb25zLmVudixcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGtleXM6IHBhcnNlM0ZvclN0ZXBLZXlzLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgKSBhcyBGaWx0ZXJPcHRpb25zO1xuXG4gICAgICAgICAgICAvLyBnZXQgb3B0aW9uc1xuICAgICAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGdldEZpbmFsU291cmNlT3B0aW9ucyhcbiAgICAgICAgICAgICAgd29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgICBjbGlXb3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICAgIGZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaXNEZWJ1ZyA9IGZpbHRlck9wdGlvbnMuZGVidWcgfHwgZmFsc2U7XG4gICAgICAgICAgICBpZiAoIWZpbHRlck9wdGlvbnMuaWYpIHtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5pbmZvKFwiXCIsIFwiU3RhcnQgaGFuZGxlIGZpbHRlclwiKTtcbiAgICAgICAgICAgIC8vIHJ1biBGaWx0ZXJcbiAgICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1blN0ZXAoY3R4LCB7XG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBmaWx0ZXJSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBBcnJheS5pc0FycmF5KGN0eC5wdWJsaWMucmVzdWx0KSAmJlxuICAgICAgICAgICAgICBjdHgucHVibGljLnJlc3VsdC5sZW5ndGggPT09IGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5pdGVtcyA9IGN0eC5wdWJsaWMuaXRlbXMuZmlsdGVyKChfaXRlbSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gISEoKGN0eC5wdWJsaWMucmVzdWx0IGFzIGJvb2xlYW5bXSlbaW5kZXhdKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMucmVzdWx0ID0gY3R4LnB1YmxpYy5pdGVtcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmlsdGVyT3B0aW9ucy5ydW4gfHwgZmlsdGVyT3B0aW9ucy51c2UpIHtcbiAgICAgICAgICAgICAgLy8gaWYgcnVuIG9yIHVzZSwgdGhlbiByZXN1bHQgbXVzdCBiZSBhcnJheVxuICAgICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBmaWx0ZXIgc2NyaXB0YCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgLy8gaW52YWxpZCByZXN1bHRcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIFwiSW52YWxpZCBmaWx0ZXIgc3RlcCByZXN1bHQsIHJlc3VsdCBtdXN0IGJlIGFycmF5ICwgYm9vbGVhbltdLCB3aGljaCBhcnJheSBsZW5ndGggbXVzdCBiZSBlcXVhbCB0byBjdHguaXRlbXMgbGVuZ3RoXCIsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLmNtZCkge1xuICAgICAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoZmlsdGVyT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgICAga2V5czogW1wiY21kXCJdLFxuICAgICAgICAgICAgICB9KSBhcyBGaWx0ZXJPcHRpb25zO1xuICAgICAgICAgICAgICBjb25zdCBjbWRSZXN1bHQgPSBhd2FpdCBydW5DbWQoY3R4LCBmaWx0ZXJPcHRpb25zLmNtZCBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgICBjdHggPSBzZXRDbWRPa1Jlc3VsdChjdHgsIGNtZFJlc3VsdC5zdGRvdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3R4LnB1YmxpYy5maWx0ZXIgPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgIC8vIHBhcnNlIGxpbWl0XG4gICAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoZmlsdGVyT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IFtcImxpbWl0XCJdLFxuICAgICAgICAgICAgfSkgYXMgRmlsdGVyT3B0aW9ucztcbiAgICAgICAgICAgIC8vIHJ1biBmaWx0ZXJcbiAgICAgICAgICAgIGN0eCA9IGZpbHRlckN0eEl0ZW1zKGN0eCwge1xuICAgICAgICAgICAgICAuLi5maWx0ZXJPcHRpb25zLFxuICAgICAgICAgICAgICByZXBvcnRlcjogZmlsdGVyUmVwb3J0ZXIsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gcnVuIGFzc2VydFxuICAgICAgICAgICAgaWYgKGZpbHRlck9wdGlvbnMuYXNzZXJ0KSB7XG4gICAgICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1bkFzc2VydChjdHgsIHtcbiAgICAgICAgICAgICAgICByZXBvcnRlcjogZmlsdGVyUmVwb3J0ZXIsXG4gICAgICAgICAgICAgICAgLi4uZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHJ1biBwb3N0XG5cbiAgICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLnBvc3QpIHtcbiAgICAgICAgICAgICAgYXdhaXQgcnVuUG9zdChjdHgsIHtcbiAgICAgICAgICAgICAgICByZXBvcnRlcjogZmlsdGVyUmVwb3J0ZXIsXG4gICAgICAgICAgICAgICAgLi4uZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgY3R4ID0gc2V0RXJyb3JSZXN1bHQoY3R4LCBlKTtcbiAgICAgICAgICBjdHgucHVibGljLmZpbHRlciA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuXG4gICAgICAgICAgaWYgKGZpbHRlci5jb250aW51ZU9uRXJyb3IpIHtcbiAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci53YXJuaW5nKGUpO1xuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgYElnbm9yZSB0aGlzIGVycm9yLCBiZWNhdXNlIGNvbnRpbnVlT25FcnJvciBpcyB0cnVlLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBmaWx0ZXJgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlmRmlsdGVyKSB7XG4gICAgICAgICAgZmlsdGVyUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGBUb3RhbCAke2N0eC5wdWJsaWMuaXRlbXMubGVuZ3RofSBpdGVtc2AsXG4gICAgICAgICAgICBcIkZpbmlzaCBoYW5kbGUgZmlsdGVyXCIsXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIC8vIGNoZWNrIGlzIG5lZWQgc2xlZXBcbiAgICAgICAgICAvLyBwYXJzZSBzbGVlcFxuICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChmaWx0ZXJPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgIGtleXM6IFtcInNsZWVwXCJdLFxuICAgICAgICAgIH0pIGFzIEZpbHRlck9wdGlvbnM7XG4gICAgICAgICAgaWYgKGZpbHRlck9wdGlvbnMuc2xlZXAgJiYgZmlsdGVyT3B0aW9ucy5zbGVlcCA+IDApIHtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgIGAke2ZpbHRlck9wdGlvbnMuc2xlZXB9IHNlY29uZHNgLFxuICAgICAgICAgICAgICBcIlNsZWVwXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYXdhaXQgZGVsYXkoZmlsdGVyT3B0aW9ucy5zbGVlcCAqIDEwMDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjdHguY3VycmVudFN0ZXBUeXBlID0gU3RlcFR5cGUuU3RlcDtcblxuICAgICAgZm9yIChcbiAgICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgICAgaW5kZXggPCAoY3R4LnB1YmxpYy5pdGVtcyBhcyB1bmtub3duW10pLmxlbmd0aDtcbiAgICAgICAgaW5kZXgrK1xuICAgICAgKSB7XG4gICAgICAgIGN0eC5wdWJsaWMuaXRlbUluZGV4ID0gaW5kZXg7XG4gICAgICAgIGN0eC5wdWJsaWMuaXRlbSA9IChjdHgucHVibGljLml0ZW1zIGFzIHVua25vd25bXSlbaW5kZXhdO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pICYmXG4gICAgICAgICAgKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVtcIkBkZW5vZmxvd0tleVwiXVxuICAgICAgICApIHtcbiAgICAgICAgICBjdHgucHVibGljLml0ZW1LZXkgPVxuICAgICAgICAgICAgKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVtcIkBkZW5vZmxvd0tleVwiXTtcbiAgICAgICAgfSBlbHNlIGlmIChpc09iamVjdChjdHgucHVibGljLml0ZW0pKSB7XG4gICAgICAgICAgY3R4LnB1YmxpYy5pdGVtS2V5ID0gdW5kZWZpbmVkO1xuICAgICAgICAgIHdvcmtmbG93UmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgIGBDYW4gbm90IGZvdW5kIGludGVybmFsIGl0ZW0ga2V5IFxcYEBkZW5vZmxvd0tleVxcYCwgbWF5YmUgeW91IGNoYW5nZWQgdGhlIGl0ZW0gZm9ybWF0LiBNaXNzaW5nIHRoaXMga2V5LCBkZW5vZmxvdyBjYW4gbm90IHN0b3JlIHRoZSB1bmlxdWUga2V5IHN0YXRlLiBGaXggdGhpcywgVHJ5IG5vdCBjaGFuZ2UgdGhlIHJlZmVyZW5jZSBpdGVtLCBvbmx5IGNoYW5nZSB0aGUgcHJvcGVydHkgeW91IG5lZWQgdG8gY2hhbmdlLiBUcnkgdG8gbWFudWFsIGFkZGluZyBhIFxcYEBkZW5vZmxvd0tleVxcYCBhcyBpdGVtIHVuaXF1ZSBrZXkuYCxcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbUtleSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pICYmXG4gICAgICAgICAgKCgoY3R4LnB1YmxpYy5pdGVtIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW1xuICAgICAgICAgICAgICBcIkBkZW5vZmxvd1NvdXJjZUluZGV4XCJcbiAgICAgICAgICAgIF0pIGFzIG51bWJlcikgPj0gMFxuICAgICAgICApIHtcbiAgICAgICAgICBjdHgucHVibGljLml0ZW1Tb3VyY2VJbmRleCA9XG4gICAgICAgICAgICAoKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KVtcbiAgICAgICAgICAgICAgXCJAZGVub2Zsb3dTb3VyY2VJbmRleFwiXG4gICAgICAgICAgICBdKSBhcyBudW1iZXI7XG4gICAgICAgICAgY3R4Lml0ZW1Tb3VyY2VPcHRpb25zID1cbiAgICAgICAgICAgIGN0eC5zb3VyY2VzT3B0aW9uc1tjdHgucHVibGljLml0ZW1Tb3VyY2VJbmRleF07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoY3R4LnB1YmxpYy5pdGVtKSkge1xuICAgICAgICAgIGN0eC5pdGVtU291cmNlT3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICBgQ2FuIG5vdCBmb3VuZCBpbnRlcm5hbCBpdGVtIGtleSBcXGBAZGVub2Zsb3dTb3VyY2VJbmRleFxcYCwgbWF5YmUgeW91IGNoYW5nZWQgdGhlIGl0ZW0gZm9ybWF0LiBUcnkgbm90IGNoYW5nZSB0aGUgcmVmZXJlbmNlIGl0ZW0sIG9ubHkgY2hhbmdlIHRoZSBwcm9wZXJ0eSB5b3UgbmVlZCB0byBjaGFuZ2UuIFRyeSB0byBtYW51YWwgYWRkaW5nIGEgXFxgQGRlbm9mbG93S2V5XFxgIGFzIGl0ZW0gdW5pcXVlIGtleS5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY3R4Lml0ZW1Tb3VyY2VPcHRpb25zID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXRlbVJlcG9ydGVyID0gZ2V0UmVwb3J0ZXIoXG4gICAgICAgICAgYCR7Z2V0UmVwb3J0ZXJOYW1lKGN0eCl9IC0+IGl0ZW06JHtpbmRleH1gLFxuICAgICAgICAgIGlzRGVidWcsXG4gICAgICAgICk7XG4gICAgICAgIGlmIChjdHgucHVibGljLm9wdGlvbnM/LmRlYnVnKSB7XG4gICAgICAgICAgaXRlbVJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghd29ya2Zsb3cuc3RlcHMpIHtcbiAgICAgICAgICB3b3JrZmxvdy5zdGVwcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1SZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgYGAsXG4gICAgICAgICAgICBcIlN0YXJ0IHJ1biBzdGVwc1wiLFxuICAgICAgICAgICk7XG4gICAgICAgICAgaXRlbVJlcG9ydGVyLmRlYnVnKGAke0pTT04uc3RyaW5naWZ5KGN0eC5wdWJsaWMuaXRlbSwgbnVsbCwgMil9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHdvcmtmbG93LnN0ZXBzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgY29uc3Qgc3RlcCA9IHdvcmtmbG93LnN0ZXBzW2pdO1xuICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcEluZGV4ID0gajtcbiAgICAgICAgICBjb25zdCBzdGVwUmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBzdGVwOiR7Y3R4LnB1YmxpYy5zdGVwSW5kZXh9YCxcbiAgICAgICAgICAgIGlzRGVidWcsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBsZXQgc3RlcE9wdGlvbnMgPSB7IC4uLnN0ZXAgfTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHN0ZXBPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuXG4gICAgICAgICAgICAvLyBwYXJzZSBpZiBvbmx5XG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHN0ZXBPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2UyS2V5cyxcbiAgICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIGlmOiB0cnVlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMuZGVidWcgfHwgY3R4LnB1YmxpYy5vcHRpb25zPy5kZWJ1Zykge1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIubGV2ZWwgPSBsb2cuTG9nTGV2ZWxzLkRFQlVHO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJzdGVwT3B0aW9uczFcIiwgc3RlcE9wdGlvbnMpO1xuXG4gICAgICAgICAgICBpZiAoIXN0ZXBPcHRpb25zLmlmKSB7XG4gICAgICAgICAgICAgIHN0ZXBSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICAgIGBiZWNhdXNlIGlmIGNvbmRpdGlvbiBpcyBmYWxzZWAsXG4gICAgICAgICAgICAgICAgXCJTa2lwIHN0ZXBcIixcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHBhcnNlIG9uXG4gICAgICAgICAgICAvLyBpbnNlcnQgc3RlcCBlbnZcbiAgICAgICAgICAgIHN0ZXBPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc3RlcE9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICAgIGVudjoge1xuICAgICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYy5lbnYsXG4gICAgICAgICAgICAgICAgICAuLi5hd2FpdCBnZXRFbnYoKSxcbiAgICAgICAgICAgICAgICAgIC4uLnN0ZXBPcHRpb25zLmVudixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICBrZXlzOiBwYXJzZTNGb3JTdGVwS2V5cyxcbiAgICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIGlmOiB0cnVlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInN0ZXBPcHRpb25zMi41XCIsIHN0ZXBPcHRpb25zKTtcblxuICAgICAgICAgICAgLy8gZ2V0IG9wdGlvbnNcbiAgICAgICAgICAgIHN0ZXBPcHRpb25zID0gZ2V0RmluYWxTb3VyY2VPcHRpb25zKFxuICAgICAgICAgICAgICB3b3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICAgIGNsaVdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaXNEZWJ1ZyA9IHN0ZXBPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuXG4gICAgICAgICAgICBzdGVwUmVwb3J0ZXIuZGVidWcoXG4gICAgICAgICAgICAgIGBTdGFydCBydW4gdGhpcyBzdGVwLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ2N0eDInLGN0eCk7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInN0ZXBPcHRpb25zMlwiLCBzdGVwT3B0aW9ucyk7XG5cbiAgICAgICAgICAgIGlmICghc3RlcE9wdGlvbnMuaWYpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmVycm9yID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZFJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRDb2RlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLmNtZE9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5pc1JlYWxPayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbal0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgICAgaWYgKHN0ZXAuaWQpIHtcbiAgICAgICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW3N0ZXAuaWRdID0gY3R4LnB1YmxpYy5zdGVwc1tqXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY3R4ID0gYXdhaXQgcnVuU3RlcChjdHgsIHtcbiAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzdGVwUmVwb3J0ZXIsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChzdGVwT3B0aW9ucy5jbWQpIHtcbiAgICAgICAgICAgICAgLy8gcGFyc2UgY21kXG5cbiAgICAgICAgICAgICAgc3RlcE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzdGVwT3B0aW9ucywge1xuICAgICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYy5lbnYsXG4gICAgICAgICAgICAgICAgICAgIC4uLmF3YWl0IGdldEVudigpLFxuICAgICAgICAgICAgICAgICAgICAuLi5zdGVwT3B0aW9ucy5lbnYsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICBrZXlzOiBbXCJjbWRcIl0sXG4gICAgICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgICAgICBjb25zdCBjbWRSZXN1bHQgPSBhd2FpdCBydW5DbWQoY3R4LCBzdGVwT3B0aW9ucy5jbWQgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgICAgY3R4ID0gc2V0Q21kT2tSZXN1bHQoY3R4LCBjbWRSZXN1bHQuc3Rkb3V0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY3R4LnB1YmxpYy5zdGVwc1tqXSA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuICAgICAgICAgICAgaWYgKHN0ZXAuaWQpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zdGVwc1tzdGVwLmlkXSA9IGN0eC5wdWJsaWMuc3RlcHNbal07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN0ZXBSZXBvcnRlci5kZWJ1ZyhcbiAgICAgICAgICAgICAgYEZpbmlzaCB0byBydW4gdGhpcyBzdGVwLmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbal0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcblxuICAgICAgICAgICAgaWYgKHN0ZXAuaWQpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zdGVwc1tzdGVwLmlkXSA9IGN0eC5wdWJsaWMuc3RlcHNbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3RlcC5jb250aW51ZU9uRXJyb3IpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5vayA9IHRydWU7XG4gICAgICAgICAgICAgIHN0ZXBSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIHN0ZXBgLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIud2FybmluZyhlKTtcbiAgICAgICAgICAgICAgc3RlcFJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgICAgYElnbm9yZSB0aGlzIGVycm9yLCBiZWNhdXNlIGNvbnRpbnVlT25FcnJvciBpcyB0cnVlLmAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc3RlcFJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIHN0ZXBgLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyB0aGlzIGl0ZW0gc3RlcHMgYWxsIG9rLCBhZGQgdW5pcXVlIGtleXMgdG8gdGhlIGludGVybmFsIHN0YXRlXG5cbiAgICAgICAgICAvLyBydW4gYXNzZXJ0XG4gICAgICAgICAgaWYgKHN0ZXBPcHRpb25zLmFzc2VydCkge1xuICAgICAgICAgICAgYXdhaXQgcnVuQXNzZXJ0KGN0eCwge1xuICAgICAgICAgICAgICByZXBvcnRlcjogc3RlcFJlcG9ydGVyLFxuICAgICAgICAgICAgICAuLi5zdGVwT3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChzdGVwT3B0aW9ucy5wb3N0KSB7XG4gICAgICAgICAgICBhd2FpdCBydW5Qb3N0KGN0eCwge1xuICAgICAgICAgICAgICByZXBvcnRlcjogc3RlcFJlcG9ydGVyLFxuICAgICAgICAgICAgICAuLi5zdGVwT3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdGVwUmVwb3J0ZXIuaW5mbyhcIlwiLCBcIkZpbmlzaCBydW4gc3RlcCBcIiArIGopO1xuXG4gICAgICAgICAgLy8gcGFyc2Ugc2xlZXBcbiAgICAgICAgICBzdGVwT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHN0ZXBPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgIGtleXM6IFtcInNsZWVwXCJdLFxuICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuXG4gICAgICAgICAgLy8gY2hlY2sgaXMgbmVlZCBzbGVlcFxuICAgICAgICAgIGlmIChzdGVwT3B0aW9ucy5zbGVlcCAmJiBzdGVwT3B0aW9ucy5zbGVlcCA+IDApIHtcbiAgICAgICAgICAgIHN0ZXBSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICBgJHtzdGVwT3B0aW9ucy5zbGVlcH0gc2Vjb25kc2AsXG4gICAgICAgICAgICAgIFwiU2xlZXBcIixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBhd2FpdCBkZWxheShzdGVwT3B0aW9ucy5zbGVlcCAqIDEwMDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBjaGVjayBpcyAhZm9yY2VcbiAgICAgICAgLy8gZ2V0IGl0ZW0gc291cmNlIG9wdGlvbnNcbiAgICAgICAgaWYgKGN0eC5pdGVtU291cmNlT3B0aW9ucyAmJiAhY3R4Lml0ZW1Tb3VyY2VPcHRpb25zLmZvcmNlKSB7XG4gICAgICAgICAgaWYgKCFjdHguaW50ZXJuYWxTdGF0ZSB8fCAhY3R4LmludGVybmFsU3RhdGUua2V5cykge1xuICAgICAgICAgICAgY3R4LmludGVybmFsU3RhdGUhLmtleXMgPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgY3R4LnB1YmxpYy5pdGVtS2V5ICYmXG4gICAgICAgICAgICAhY3R4LmludGVybmFsU3RhdGUhLmtleXMuaW5jbHVkZXMoY3R4LnB1YmxpYy5pdGVtS2V5ISlcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzLnVuc2hpZnQoY3R4LnB1YmxpYy5pdGVtS2V5ISk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIG9ubHkgc2F2ZSAxMDAwIGl0ZW1zIGZvciBzYXZlIG1lbW9yeVxuICAgICAgICAgIGlmIChjdHguaW50ZXJuYWxTdGF0ZSEua2V5cy5sZW5ndGggPiAxMDAwKSB7XG4gICAgICAgICAgICBjdHguaW50ZXJuYWxTdGF0ZSEua2V5cyA9IGN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzLnNsaWNlKDAsIDEwMDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAod29ya2Zsb3cuc3RlcHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGl0ZW1SZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgYGAsXG4gICAgICAgICAgICBgRmluaXNoIHJ1biBzdGVwc2AsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBydW4gcG9zdCBzdGVwXG4gICAgICBjb25zdCBwb3N0ID0gd29ya2Zsb3cucG9zdDtcbiAgICAgIGlmIChwb3N0KSB7XG4gICAgICAgIGNvbnN0IHBvc3RSZXBvcnRlciA9IGdldFJlcG9ydGVyKFxuICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBwb3N0YCxcbiAgICAgICAgICBpc0RlYnVnLFxuICAgICAgICApO1xuICAgICAgICBsZXQgcG9zdE9wdGlvbnMgPSB7IC4uLnBvc3QgfTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBwYXJzZSBlbnYgZmlyc3RcbiAgICAgICAgICBwb3N0T3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHBvc3RPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgIGtleXM6IHBhcnNlMUtleXMsXG4gICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG5cbiAgICAgICAgICAvLyBwYXJzZSBpZiBvbmx5XG4gICAgICAgICAgcG9zdE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChwb3N0T3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBwYXJzZTJLZXlzLFxuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICBpZjogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgaWYgKHBvc3RPcHRpb25zLmRlYnVnIHx8IGN0eC5wdWJsaWMub3B0aW9ucz8uZGVidWcpIHtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci5sZXZlbCA9IGxvZy5Mb2dMZXZlbHMuREVCVUc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghcG9zdE9wdGlvbnMuaWYpIHtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICBcIlNraXAgcG9zdFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBwYXJzZSBvblxuICAgICAgICAgIC8vIGluc2VydCBzdGVwIGVudlxuICAgICAgICAgIHBvc3RPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QocG9zdE9wdGlvbnMsIHtcbiAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgIHB1YmxpYzoge1xuICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLmVudixcbiAgICAgICAgICAgICAgICAuLi5hd2FpdCBnZXRFbnYoKSxcbiAgICAgICAgICAgICAgICAuLi5wb3N0T3B0aW9ucy5lbnYsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIGtleXM6IHBhcnNlM0ZvclN0ZXBLZXlzLFxuICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgIC8vIGdldCBvcHRpb25zXG4gICAgICAgICAgcG9zdE9wdGlvbnMgPSBnZXRGaW5hbFNvdXJjZU9wdGlvbnMoXG4gICAgICAgICAgICB3b3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICBjbGlXb3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICBwb3N0T3B0aW9ucyxcbiAgICAgICAgICApO1xuICAgICAgICAgIGlzRGVidWcgPSBwb3N0T3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcblxuICAgICAgICAgIHBvc3RSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgYFN0YXJ0IHJ1biBwb3N0LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnY3R4MicsY3R4KTtcblxuICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1blN0ZXAoY3R4LCB7XG4gICAgICAgICAgICAuLi5wb3N0T3B0aW9ucyxcbiAgICAgICAgICAgIHJlcG9ydGVyOiBwb3N0UmVwb3J0ZXIsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKHBvc3RPcHRpb25zLmNtZCkge1xuICAgICAgICAgICAgLy8gcGFyc2UgY21kXG4gICAgICAgICAgICBwb3N0T3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHBvc3RPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogW1wiY21kXCJdLFxuICAgICAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgICAgICBjb25zdCBjbWRSZXN1bHQgPSBhd2FpdCBydW5DbWQoY3R4LCBwb3N0T3B0aW9ucy5jbWQgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgIGN0eCA9IHNldENtZE9rUmVzdWx0KGN0eCwgY21kUmVzdWx0LnN0ZG91dCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcG9zdFJlcG9ydGVyLmRlYnVnKFxuICAgICAgICAgICAgYEZpbmlzaCB0byBydW4gcG9zdC5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAocG9zdC5jb250aW51ZU9uRXJyb3IpIHtcbiAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIHBvc3RgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci53YXJuaW5nKGUpO1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgIGBJZ25vcmUgdGhpcyBlcnJvciwgYmVjYXVzZSBjb250aW51ZU9uRXJyb3IgaXMgdHJ1ZS5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIHBvc3RgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIHRoaXMgaXRlbSBzdGVwcyBhbGwgb2ssIGFkZCB1bmlxdWUga2V5cyB0byB0aGUgaW50ZXJuYWwgc3RhdGVcblxuICAgICAgICAvLyBydW4gYXNzZXJ0XG4gICAgICAgIGlmIChwb3N0T3B0aW9ucy5hc3NlcnQpIHtcbiAgICAgICAgICBhd2FpdCBydW5Bc3NlcnQoY3R4LCB7XG4gICAgICAgICAgICByZXBvcnRlcjogcG9zdFJlcG9ydGVyLFxuICAgICAgICAgICAgLi4ucG9zdE9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zdE9wdGlvbnMucG9zdCkge1xuICAgICAgICAgIGF3YWl0IHJ1blBvc3QoY3R4LCB7XG4gICAgICAgICAgICByZXBvcnRlcjogcG9zdFJlcG9ydGVyLFxuICAgICAgICAgICAgLi4ucG9zdE9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcG9zdFJlcG9ydGVyLmluZm8oXCJcIiwgXCJGaW5pc2ggcnVuIHBvc3QgXCIpO1xuXG4gICAgICAgIC8vIHBhcnNlIHNsZWVwXG4gICAgICAgIHBvc3RPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QocG9zdE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgIGtleXM6IFtcInNsZWVwXCJdLFxuICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcbiAgICAgICAgLy8gY2hlY2sgaXMgbmVlZCBzbGVlcFxuICAgICAgICBpZiAocG9zdE9wdGlvbnMuc2xlZXAgJiYgcG9zdE9wdGlvbnMuc2xlZXAgPiAwKSB7XG4gICAgICAgICAgcG9zdFJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgJHtwb3N0T3B0aW9ucy5zbGVlcH0gc2Vjb25kc2AsXG4gICAgICAgICAgICBcIlNsZWVwXCIsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBhd2FpdCBkZWxheShwb3N0T3B0aW9ucy5zbGVlcCAqIDEwMDApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHNhdmUgc3RhdGUsIGludGVybmFsU3RhdGVcbiAgICAgIC8vIGNoZWNrIGlzIGNoYW5nZWRcbiAgICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IEpTT04uc3RyaW5naWZ5KGN0eC5wdWJsaWMuc3RhdGUpO1xuICAgICAgLy8gYWRkIHN1Y2Nlc3MgaXRlbXMgdW5pcXVlS2V5IHRvIGludGVybmFsIFN0YXRlXG5cbiAgICAgIGNvbnN0IGN1cnJlbnRJbnRlcm5hbFN0YXRlID0gSlNPTi5zdHJpbmdpZnkoY3R4LmludGVybmFsU3RhdGUpO1xuICAgICAgaWYgKGN1cnJlbnRTdGF0ZSAhPT0gY3R4LmluaXRTdGF0ZSkge1xuICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLmRlYnVnKGBTYXZlIHN0YXRlYCk7XG4gICAgICAgIGF3YWl0IGN0eC5kYiEuc2V0KFwic3RhdGVcIiwgY3R4LnB1YmxpYy5zdGF0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB3b3JrZmxvd1JlcG9ydGVyLmRlYnVnKGBTa2lwIHNhdmUgc2F0ZSwgY2F1c2Ugbm8gY2hhbmdlIGhhcHBlbmVkYCk7XG4gICAgICB9XG4gICAgICBpZiAoY3VycmVudEludGVybmFsU3RhdGUgIT09IGN0eC5pbml0SW50ZXJuYWxTdGF0ZSkge1xuICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLmRlYnVnKFxuICAgICAgICAgIGBTYXZlIGludGVybmFsIHN0YXRlYCxcbiAgICAgICAgKTtcbiAgICAgICAgYXdhaXQgY3R4LmRiIS5zZXQoXCJpbnRlcm5hbFN0YXRlXCIsIGN0eC5pbnRlcm5hbFN0YXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHdvcmtmbG93UmVwb3J0ZXIuZGVidWcoXG4gICAgICAgIC8vICAgYFNraXAgc2F2ZSBpbnRlcm5hbCBzdGF0ZSwgY2F1c2Ugbm8gY2hhbmdlIGhhcHBlbmVkYCxcbiAgICAgICAgLy8gKTtcbiAgICAgIH1cbiAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgYGAsXG4gICAgICAgIFwiRmluaXNoIHdvcmtmbG93XCIsXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHdvcmtmbG93UmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgIGBGYWlsZWQgdG8gcnVuIHRoaXMgd29ya2Zsb3dgLFxuICAgICAgKTtcblxuICAgICAgd29ya2Zsb3dSZXBvcnRlci5lcnJvcihlKTtcbiAgICAgIGlmICh2YWxpZFdvcmtmbG93cy5sZW5ndGggPiB3b3JrZmxvd0luZGV4ICsgMSkge1xuICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLmRlYnVnKFwid29ya2Zsb3dcIiwgXCJTdGFydCBuZXh0IHdvcmtmbG93XCIpO1xuICAgICAgfVxuICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICBjdHgsXG4gICAgICAgIGVycm9yOiBlLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKFwiXFxuXCIpO1xuICB9XG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHJlcG9ydC5lcnJvcihcIkVycm9yIGRldGFpbHM6XCIpO1xuICAgIGVycm9ycy5mb3JFYWNoKChlcnJvcikgPT4ge1xuICAgICAgcmVwb3J0LmVycm9yKFxuICAgICAgICBgUnVuICR7Z2V0UmVwb3J0ZXJOYW1lKGVycm9yLmN0eCl9IGZhaWxlZCwgZXJyb3I6IGAsXG4gICAgICApO1xuICAgICAgcmVwb3J0LmVycm9yKGVycm9yLmVycm9yKTtcbiAgICB9KTtcblxuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJ1biB0aGlzIHRpbWVgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRSZXBvcnRlck5hbWUoY3R4OiBDb250ZXh0KSB7XG4gIGNvbnN0IHJlbGF0aXZlUGF0aCA9IGN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gIGNvbnN0IGFic29sdXRlUGF0aCA9IGN0eC5wdWJsaWMud29ya2Zsb3dQYXRoO1xuICBpZiAocmVsYXRpdmVQYXRoLnN0YXJ0c1dpdGgoXCIuLlwiKSkge1xuICAgIHJldHVybiBhYnNvbHV0ZVBhdGg7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJlbGF0aXZlUGF0aDtcbiAgfVxufVxuIl19