import { hasPermissionSlient } from "./permission.ts";
import { StepType } from "./internal-interface.ts";
import { parseWorkflow } from "./parse-workflow.ts";
import { getContent } from "./utils/file.ts";
import { getFilesByFilter } from "./utils/filter.ts";
import { isObject } from "./utils/object.ts";
import { parseObject } from "./parse-object.ts";
import { isRemotePath } from "./utils/path.ts";
import { getStepResponse, runStep, setErrorResult } from "./run-step.ts";
import { filterCtxItems, getSourceItemsFromResult } from "./get-source-items-from-result.ts";
import { config, delay, dirname, join, log, relative, SqliteDb } from "../deps.ts";
import report, { getReporter } from "./report.ts";
import { Keydb } from "./adapters/json-store-adapter.ts";
import { filterSourceItems } from "./filter-source-items.ts";
import { markSourceItems } from "./mark-source-items.ts";
import { runCmd, setCmdOkResult } from "./run-cmd.ts";
import { getFinalRunOptions, getFinalSourceOptions, getFinalWorkflowOptions } from "./default-options.ts";
import { runPost } from "./run-post.ts";
import { runAssert } from "./run-assert.ts";
import { getEnv } from "./utils/env.ts";
const parse1Keys = [
    "env"
];
const parse2Keys = [
    "if",
    "debug"
];
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
    const debugEnvPermmision = {
        name: "env",
        variable: "DEBUG"
    };
    const dataPermission = {
        name: "read",
        path: "data"
    };
    let DebugEnvValue = undefined;
    if (await hasPermissionSlient(debugEnvPermmision)) {
        DebugEnvValue = Deno.env.get("DEBUG");
    }
    let isDebug = !!(DebugEnvValue !== undefined && DebugEnvValue !== "false");
    const cliWorkflowOptions = getFinalRunOptions(runOptions, isDebug);
    isDebug = cliWorkflowOptions.debug || false;
    const { files , content ,  } = cliWorkflowOptions;
    let workflowFiles = [];
    const cwd = Deno.cwd();
    if (content) {
        workflowFiles = [];
    } else {
        workflowFiles = await getFilesByFilter(cwd, files);
    }
    let env = {};
    const allEnvPermmision = {
        name: "env"
    };
    // first try to get .env
    const dotEnvFilePermmision = {
        name: "read",
        path: ".env,.env.defaults,.env.example"
    };
    if (await hasPermissionSlient(dotEnvFilePermmision)) {
        env = config();
    }
    if (await hasPermissionSlient(allEnvPermmision)) {
        env = {
            ...env,
            ...Deno.env.toObject()
        };
    }
    // get options
    let validWorkflows = [];
    // if stdin
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
                        items: []
                    },
                    itemSourceOptions: undefined,
                    sourcesOptions: [],
                    currentStepType: StepType.Source
                },
                workflow: workflow
            });
        }
    }
    const errors = [];
    for(let i = 0; i < workflowFiles.length; i++){
        const workflowRelativePath1 = workflowFiles[i];
        let fileContent = "";
        let workflowFilePath1 = "";
        if (isRemotePath(workflowRelativePath1)) {
            const netContent = await fetch(workflowRelativePath1);
            workflowFilePath1 = workflowRelativePath1;
            fileContent = await netContent.text();
        } else {
            workflowFilePath1 = join(cwd, workflowRelativePath1);
            fileContent = await getContent(workflowFilePath1);
        }
        const workflow1 = parseWorkflow(fileContent);
        if (!isObject(workflow1)) {
            continue;
        }
        validWorkflows.push({
            ctx: {
                public: {
                    env,
                    workflowPath: workflowFilePath1,
                    workflowRelativePath: workflowRelativePath1,
                    workflowCwd: dirname(workflowFilePath1),
                    cwd: cwd,
                    sources: {},
                    steps: {},
                    state: undefined,
                    items: []
                },
                itemSourceOptions: undefined,
                sourcesOptions: [],
                currentStepType: StepType.Source
            },
            workflow: workflow1
        });
    // run code
    }
    // sort by alphabet
    validWorkflows = validWorkflows.sort((a, b)=>{
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
    report.info(` ${validWorkflows.length} valid workflows:\n${validWorkflows.map((item)=>getReporterName(item.ctx)).join("\n")}\n`, "Success found");
    // run workflows step by step
    for(let workflowIndex = 0; workflowIndex < validWorkflows.length; workflowIndex++){
        let { ctx , workflow: workflow2  } = validWorkflows[workflowIndex];
        // parse root env first
        // parse env first
        const parsedWorkflowFileOptionsWithEnv = await parseObject(workflow2, ctx, {
            keys: parse1Keys
        });
        // run env
        // parse env to env
        if (parsedWorkflowFileOptionsWithEnv.env) {
            for(const key in parsedWorkflowFileOptionsWithEnv.env){
                const value = parsedWorkflowFileOptionsWithEnv.env[key];
                if (typeof value === "string") {
                    const debugEnvPermmision1 = {
                        name: "env",
                        variable: key
                    };
                    if (await hasPermissionSlient(debugEnvPermmision1)) {
                        Deno.env.set(key, value);
                    }
                }
            }
        }
        // parse general options
        const parsedWorkflowGeneralOptionsWithGeneral = await parseObject(parsedWorkflowFileOptionsWithEnv, ctx, {
            keys: parse3ForGeneralKeys,
            default: {
                if: true
            }
        });
        const workflowOptions = getFinalWorkflowOptions(parsedWorkflowGeneralOptionsWithGeneral || {}, cliWorkflowOptions);
        isDebug = workflowOptions.debug || false;
        const workflowReporter = getReporter(`${getReporterName(ctx)}`, isDebug);
        // check if need to run
        if (!workflowOptions?.if) {
            workflowReporter.info(`because if condition is false`, "Skip workflow");
            continue;
        } else {
            workflowReporter.info(``, "Start handle workflow");
        }
        // merge to get default
        ctx.public.options = workflowOptions;
        const database = workflowOptions.database;
        let db;
        if (database?.startsWith("sqlite")) {
            db = new SqliteDb(database);
        } else {
            let namespace = ctx.public.workflowRelativePath;
            if (namespace.startsWith("..")) {
                // use absolute path as namespace
                namespace = `@denoflowRoot${ctx.public.workflowPath}`;
            }
            db = new Keydb(database, {
                namespace: namespace
            });
        }
        ctx.db = db;
        // check permission
        // unique key
        let state;
        let internalState = {
            keys: []
        };
        if (await hasPermissionSlient(dataPermission)) {
            state = await db.get("state") || undefined;
            internalState = await db.get("internalState") || {
                keys: []
            };
        }
        ctx.public.state = state;
        ctx.internalState = internalState;
        ctx.initState = JSON.stringify(state);
        ctx.initInternalState = JSON.stringify(internalState);
        const sources = workflow2.sources;
        try {
            if (sources) {
                workflowReporter.info("", "Start get sources");
                for(let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++){
                    const source = sources[sourceIndex];
                    ctx.public.sourceIndex = sourceIndex;
                    const sourceReporter = getReporter(`${getReporterName(ctx)} -> source:${ctx.public.sourceIndex}`, isDebug);
                    let sourceOptions = {
                        ...source
                    };
                    try {
                        // parse env first
                        sourceOptions = await parseObject(source, ctx, {
                            keys: parse1Keys
                        });
                        // parse if only
                        sourceOptions = await parseObject(sourceOptions, ctx, {
                            keys: parse2Keys,
                            default: {
                                if: true
                            }
                        });
                        // set log level
                        if (sourceOptions?.debug || ctx.public.options?.debug) {
                            sourceReporter.level = log.LogLevels.DEBUG;
                        }
                        // check if need to run
                        if (!sourceOptions.if) {
                            sourceReporter.info(`because if condition is false`, "Skip source");
                        }
                        // parse on
                        // insert step env
                        sourceOptions = await parseObject(sourceOptions, {
                            ...ctx,
                            public: {
                                ...ctx.public,
                                env: {
                                    ...ctx.public.env,
                                    ...await getEnv(),
                                    ...sourceOptions.env
                                }
                            }
                        }, {
                            keys: parse3ForStepKeys
                        });
                        // get options
                        sourceOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, sourceOptions);
                        isDebug = sourceOptions.debug || false;
                        // check if
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
                                ctx.public.sources[sourceOptions.id] = ctx.public.sources[sourceIndex];
                            }
                            continue;
                        }
                        // run source
                        ctx = await runStep(ctx, {
                            reporter: sourceReporter,
                            ...sourceOptions
                        });
                        // parse4
                        sourceOptions = await parseObject(sourceOptions, ctx, {
                            keys: parse4ForSourceKeys
                        });
                        // get source items by itemsPath, key
                        ctx = await getSourceItemsFromResult(ctx, {
                            ...sourceOptions,
                            reporter: sourceReporter
                        });
                        // parse6
                        sourceOptions = await parseObject(sourceOptions, ctx, {
                            keys: parse6ForSourceKeys
                        });
                        // run user filter, filter from, filterItems, filterItemsFrom, only allow one.
                        ctx = await filterSourceItems(ctx, {
                            reporter: sourceReporter,
                            ...sourceOptions
                        });
                        // run cmd
                        if (sourceOptions.cmd) {
                            sourceOptions = await parseObject(sourceOptions, ctx, {
                                keys: parse7ForSourceKeys
                            });
                            const cmdResult = await runCmd(ctx, sourceOptions.cmd);
                            ctx = setCmdOkResult(ctx, cmdResult.stdout);
                        }
                        // mark source items, add unique key and source index to items
                        ctx = markSourceItems(ctx, sourceOptions);
                        ctx.public.sources[sourceIndex] = getStepResponse(ctx);
                        if (sourceOptions.id) {
                            ctx.public.sources[sourceOptions.id] = ctx.public.sources[sourceIndex];
                        }
                        // run assert
                        if (sourceOptions.assert) {
                            ctx = await runAssert(ctx, {
                                reporter: sourceReporter,
                                ...sourceOptions
                            });
                        }
                        if (ctx.public.items.length > 0) {
                            // run post
                            sourceReporter.info("", `Source ${sourceIndex} get ${ctx.public.items.length} items`);
                        }
                        if (sourceOptions.post) {
                            await runPost(ctx, {
                                reporter: sourceReporter,
                                ...sourceOptions
                            });
                        }
                        ctx.sourcesOptions.push(sourceOptions);
                    } catch (e) {
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
                        } else {
                            sourceReporter.error(`Failed run source`);
                            throw e;
                        }
                    }
                    // parse 8 sleep
                    sourceOptions = await parseObject(sourceOptions, ctx, {
                        keys: [
                            "sleep"
                        ]
                    });
                    // check is need sleep
                    if (sourceOptions.sleep && sourceOptions.sleep > 0) {
                        sourceReporter.info(`${sourceOptions.sleep} seconds`, "Sleep");
                        await delay(sourceOptions.sleep * 1000);
                    }
                }
            }
            // insert new ctx.items
            if (sources) {
                let collectCtxItems = [];
                sources.forEach((_, theSourceIndex)=>{
                    if (Array.isArray(ctx.public.sources[theSourceIndex].result)) {
                        collectCtxItems = collectCtxItems.concat(ctx.public.sources[theSourceIndex].result);
                    }
                });
                ctx.public.items = collectCtxItems;
                if (ctx.public.items.length > 0) {
                    workflowReporter.info(`Total ${ctx.public.items.length} items`, "Finish get sources");
                }
            }
            // if items >0, then continue
            if (ctx.public.items.length === 0) {
                // no need to handle steps
                workflowReporter.info(`because no any valid sources items returned`, "Skip workflow");
                continue;
            }
            // run filter
            const filter = workflow2.filter;
            if (filter) {
                ctx.currentStepType = StepType.Filter;
                const filterReporter = getReporter(`${getReporterName(ctx)} -> filter`, isDebug);
                let filterOptions = {
                    ...filter
                };
                let ifFilter = true;
                try {
                    // parse env first
                    filterOptions = await parseObject(filter, ctx, {
                        keys: parse1Keys
                    });
                    // parse if debug only
                    filterOptions = await parseObject(filterOptions, ctx, {
                        keys: parse2Keys,
                        default: {
                            if: true
                        }
                    });
                    // set log level
                    if (filterOptions?.debug || ctx.public.options?.debug) {
                        filterReporter.level = log.LogLevels.DEBUG;
                    }
                    // check if need to run
                    if (!filterOptions.if) {
                        ifFilter = false;
                        filterReporter.info(`because if condition is false`, "Skip filter");
                    } else {
                        // parse on
                        // insert step env
                        filterOptions = await parseObject(filterOptions, {
                            ...ctx,
                            public: {
                                ...ctx.public,
                                env: {
                                    ...ctx.public.env,
                                    ...await getEnv(),
                                    ...filterOptions.env
                                }
                            }
                        }, {
                            keys: parse3ForStepKeys
                        });
                        // get options
                        filterOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, filterOptions);
                        isDebug = filterOptions.debug || false;
                        if (!filterOptions.if) {
                            continue;
                        }
                        filterReporter.info("", "Start handle filter");
                        // run Filter
                        ctx = await runStep(ctx, {
                            reporter: filterReporter,
                            ...filterOptions
                        });
                        if (Array.isArray(ctx.public.result) && ctx.public.result.length === ctx.public.items.length) {
                            ctx.public.items = ctx.public.items.filter((_item, index)=>{
                                return !!ctx.public.result[index];
                            });
                            ctx.public.result = ctx.public.items;
                        } else if (filterOptions.run || filterOptions.use) {
                            // if run or use, then result must be array
                            filterReporter.error(`Failed to run filter script`);
                            // invalid result
                            throw new Error("Invalid filter step result, result must be array , boolean[], which array length must be equal to ctx.items length");
                        }
                        if (filterOptions.cmd) {
                            filterOptions = await parseObject(filterOptions, ctx, {
                                keys: [
                                    "cmd"
                                ]
                            });
                            const cmdResult1 = await runCmd(ctx, filterOptions.cmd);
                            ctx = setCmdOkResult(ctx, cmdResult1.stdout);
                        }
                        ctx.public.filter = getStepResponse(ctx);
                        // parse limit
                        filterOptions = await parseObject(filterOptions, ctx, {
                            keys: [
                                "limit"
                            ]
                        });
                        // run filter
                        ctx = filterCtxItems(ctx, {
                            ...filterOptions,
                            reporter: filterReporter
                        });
                        // run assert
                        if (filterOptions.assert) {
                            ctx = await runAssert(ctx, {
                                reporter: filterReporter,
                                ...filterOptions
                            });
                        }
                        // run post
                        if (filterOptions.post) {
                            await runPost(ctx, {
                                reporter: filterReporter,
                                ...filterOptions
                            });
                        }
                    }
                } catch (e1) {
                    ctx = setErrorResult(ctx, e1);
                    ctx.public.filter = getStepResponse(ctx);
                    if (filter.continueOnError) {
                        ctx.public.ok = true;
                        filterReporter.warning(`Failed to run filter`);
                        filterReporter.warning(e1);
                        filterReporter.warning(`Ignore this error, because continueOnError is true.`);
                        break;
                    } else {
                        filterReporter.error(`Failed to run filter`);
                        throw e1;
                    }
                }
                if (ifFilter) {
                    filterReporter.info(`Total ${ctx.public.items.length} items`, "Finish handle filter");
                    // check is need sleep
                    // parse sleep
                    filterOptions = await parseObject(filterOptions, ctx, {
                        keys: [
                            "sleep"
                        ]
                    });
                    if (filterOptions.sleep && filterOptions.sleep > 0) {
                        filterReporter.info(`${filterOptions.sleep} seconds`, "Sleep");
                        await delay(filterOptions.sleep * 1000);
                    }
                }
            }
            ctx.currentStepType = StepType.Step;
            for(let index = 0; index < ctx.public.items.length; index++){
                ctx.public.itemIndex = index;
                ctx.public.item = ctx.public.items[index];
                if (ctx.public.item && ctx.public.item["@denoflowKey"]) {
                    ctx.public.itemKey = ctx.public.item["@denoflowKey"];
                } else if (isObject(ctx.public.item)) {
                    ctx.public.itemKey = undefined;
                    workflowReporter.warning(`Can not found internal item key \`@denoflowKey\`, maybe you changed the item format. Missing this key, denoflow can not store the unique key state. Fix this, Try not change the reference item, only change the property you need to change. Try to manual adding a \`@denoflowKey\` as item unique key.`);
                } else {
                    ctx.public.itemKey = undefined;
                }
                if (ctx.public.item && ctx.public.item["@denoflowSourceIndex"] >= 0) {
                    ctx.public.itemSourceIndex = ctx.public.item["@denoflowSourceIndex"];
                    ctx.itemSourceOptions = ctx.sourcesOptions[ctx.public.itemSourceIndex];
                } else if (isObject(ctx.public.item)) {
                    ctx.itemSourceOptions = undefined;
                    workflowReporter.warning(`Can not found internal item key \`@denoflowSourceIndex\`, maybe you changed the item format. Try not change the reference item, only change the property you need to change. Try to manual adding a \`@denoflowKey\` as item unique key.`);
                } else {
                    ctx.itemSourceOptions = undefined;
                }
                const itemReporter = getReporter(`${getReporterName(ctx)} -> item:${index}`, isDebug);
                if (ctx.public.options?.debug) {
                    itemReporter.level = log.LogLevels.DEBUG;
                }
                if (!workflow2.steps) {
                    workflow2.steps = [];
                } else {
                    itemReporter.info(``, "Start run steps");
                    itemReporter.debug(`${JSON.stringify(ctx.public.item, null, 2)}`);
                }
                for(let j = 0; j < workflow2.steps.length; j++){
                    const step = workflow2.steps[j];
                    ctx.public.stepIndex = j;
                    const stepReporter = getReporter(`${getReporterName(ctx)} -> step:${ctx.public.stepIndex}`, isDebug);
                    let stepOptions = {
                        ...step
                    };
                    try {
                        // parse env first
                        stepOptions = await parseObject(stepOptions, ctx, {
                            keys: parse1Keys
                        });
                        // parse if only
                        stepOptions = await parseObject(stepOptions, ctx, {
                            keys: parse2Keys,
                            default: {
                                if: true
                            }
                        });
                        if (stepOptions.debug || ctx.public.options?.debug) {
                            stepReporter.level = log.LogLevels.DEBUG;
                        }
                        // console.log("stepOptions1", stepOptions);
                        if (!stepOptions.if) {
                            stepReporter.info(`because if condition is false`, "Skip step");
                        }
                        // parse on
                        // insert step env
                        stepOptions = await parseObject(stepOptions, {
                            ...ctx,
                            public: {
                                ...ctx.public,
                                env: {
                                    ...ctx.public.env,
                                    ...await getEnv(),
                                    ...stepOptions.env
                                }
                            }
                        }, {
                            keys: parse3ForStepKeys,
                            default: {
                                if: true
                            }
                        });
                        // console.log("stepOptions2.5", stepOptions);
                        // get options
                        stepOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, stepOptions);
                        isDebug = stepOptions.debug || false;
                        stepReporter.debug(`Start run this step.`);
                        // console.log('ctx2',ctx);
                        // console.log("stepOptions2", stepOptions);
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
                            reporter: stepReporter
                        });
                        if (stepOptions.cmd) {
                            // parse cmd
                            stepOptions = await parseObject(stepOptions, {
                                ...ctx,
                                public: {
                                    ...ctx.public,
                                    env: {
                                        ...ctx.public.env,
                                        ...await getEnv(),
                                        ...stepOptions.env
                                    }
                                }
                            }, {
                                keys: [
                                    "cmd"
                                ]
                            });
                            const cmdResult2 = await runCmd(ctx, stepOptions.cmd);
                            ctx = setCmdOkResult(ctx, cmdResult2.stdout);
                        }
                        ctx.public.steps[j] = getStepResponse(ctx);
                        if (step.id) {
                            ctx.public.steps[step.id] = ctx.public.steps[j];
                        }
                        stepReporter.debug(`Finish to run this step.`);
                    } catch (e2) {
                        ctx.public.steps[j] = getStepResponse(ctx);
                        if (step.id) {
                            ctx.public.steps[step.id] = ctx.public.steps[j];
                        }
                        if (step.continueOnError) {
                            ctx.public.ok = true;
                            stepReporter.warning(`Failed to run step`);
                            stepReporter.warning(e2);
                            stepReporter.warning(`Ignore this error, because continueOnError is true.`);
                            break;
                        } else {
                            stepReporter.error(`Failed to run step`);
                            throw e2;
                        }
                    }
                    // this item steps all ok, add unique keys to the internal state
                    // run assert
                    if (stepOptions.assert) {
                        await runAssert(ctx, {
                            reporter: stepReporter,
                            ...stepOptions
                        });
                    }
                    if (stepOptions.post) {
                        await runPost(ctx, {
                            reporter: stepReporter,
                            ...stepOptions
                        });
                    }
                    stepReporter.info("", "Finish run step " + j);
                    // parse sleep
                    stepOptions = await parseObject(stepOptions, ctx, {
                        keys: [
                            "sleep"
                        ]
                    });
                    // check is need sleep
                    if (stepOptions.sleep && stepOptions.sleep > 0) {
                        stepReporter.info(`${stepOptions.sleep} seconds`, "Sleep");
                        await delay(stepOptions.sleep * 1000);
                    }
                }
                // check is !force
                // get item source options
                if (ctx.itemSourceOptions && !ctx.itemSourceOptions.force) {
                    if (!ctx.internalState || !ctx.internalState.keys) {
                        ctx.internalState.keys = [];
                    }
                    if (ctx.public.itemKey && !ctx.internalState.keys.includes(ctx.public.itemKey)) {
                        ctx.internalState.keys.unshift(ctx.public.itemKey);
                    }
                    // only save 1000 items for save memory
                    if (ctx.internalState.keys.length > 1000) {
                        ctx.internalState.keys = ctx.internalState.keys.slice(0, 1000);
                    }
                }
                if (workflow2.steps.length > 0) {
                    itemReporter.info(``, `Finish run steps`);
                }
            }
            // run post step
            const post = workflow2.post;
            if (post) {
                const postReporter = getReporter(`${getReporterName(ctx)} -> post`, isDebug);
                let postOptions = {
                    ...post
                };
                try {
                    // parse env first
                    postOptions = await parseObject(postOptions, ctx, {
                        keys: parse1Keys
                    });
                    // parse if only
                    postOptions = await parseObject(postOptions, ctx, {
                        keys: parse2Keys,
                        default: {
                            if: true
                        }
                    });
                    if (postOptions.debug || ctx.public.options?.debug) {
                        postReporter.level = log.LogLevels.DEBUG;
                    }
                    if (!postOptions.if) {
                        postReporter.info(`because if condition is false`, "Skip post");
                        continue;
                    }
                    // parse on
                    // insert step env
                    postOptions = await parseObject(postOptions, {
                        ...ctx,
                        public: {
                            ...ctx.public,
                            env: {
                                ...ctx.public.env,
                                ...await getEnv(),
                                ...postOptions.env
                            }
                        }
                    }, {
                        keys: parse3ForStepKeys
                    });
                    // get options
                    postOptions = getFinalSourceOptions(workflowOptions, cliWorkflowOptions, postOptions);
                    isDebug = postOptions.debug || false;
                    postReporter.info(`Start run post.`);
                    // console.log('ctx2',ctx);
                    ctx = await runStep(ctx, {
                        ...postOptions,
                        reporter: postReporter
                    });
                    if (postOptions.cmd) {
                        // parse cmd
                        postOptions = await parseObject(postOptions, ctx, {
                            keys: [
                                "cmd"
                            ]
                        });
                        const cmdResult3 = await runCmd(ctx, postOptions.cmd);
                        ctx = setCmdOkResult(ctx, cmdResult3.stdout);
                    }
                    postReporter.debug(`Finish to run post.`);
                } catch (e3) {
                    if (post.continueOnError) {
                        ctx.public.ok = true;
                        postReporter.warning(`Failed to run post`);
                        postReporter.warning(e3);
                        postReporter.warning(`Ignore this error, because continueOnError is true.`);
                        break;
                    } else {
                        postReporter.error(`Failed to run post`);
                        throw e3;
                    }
                }
                // this item steps all ok, add unique keys to the internal state
                // run assert
                if (postOptions.assert) {
                    await runAssert(ctx, {
                        reporter: postReporter,
                        ...postOptions
                    });
                }
                if (postOptions.post) {
                    await runPost(ctx, {
                        reporter: postReporter,
                        ...postOptions
                    });
                }
                postReporter.info("", "Finish run post ");
                // parse sleep
                postOptions = await parseObject(postOptions, ctx, {
                    keys: [
                        "sleep"
                    ]
                });
                // check is need sleep
                if (postOptions.sleep && postOptions.sleep > 0) {
                    postReporter.info(`${postOptions.sleep} seconds`, "Sleep");
                    await delay(postOptions.sleep * 1000);
                }
            }
            // save state, internalState
            // check is changed
            const currentState = JSON.stringify(ctx.public.state);
            // add success items uniqueKey to internal State
            const currentInternalState = JSON.stringify(ctx.internalState);
            if (currentState !== ctx.initState) {
                workflowReporter.debug(`Save state`);
                await ctx.db.set("state", ctx.public.state);
            } else {
            // workflowReporter.debug(`Skip save sate, cause no change happened`);
            }
            if (currentInternalState !== ctx.initInternalState) {
                workflowReporter.debug(`Save internal state`);
                await ctx.db.set("internalState", ctx.internalState);
            } else {
            // workflowReporter.debug(
            //   `Skip save internal state, cause no change happened`,
            // );
            }
            workflowReporter.info(``, "Finish workflow");
        } catch (e4) {
            workflowReporter.error(`Failed to run this workflow`);
            workflowReporter.error(e4);
            if (validWorkflows.length > workflowIndex + 1) {
                workflowReporter.debug("workflow", "Start next workflow");
            }
            errors.push({
                ctx,
                error: e4
            });
        }
        console.log("\n");
    }
    if (errors.length > 0) {
        report.error("Error details:");
        errors.forEach((error)=>{
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
    } else {
        return relativePath;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvcnVuLXdvcmtmbG93cy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBGaWx0ZXJPcHRpb25zLFxuICBSdW5Xb3JrZmxvd09wdGlvbnMsXG4gIFNvdXJjZU9wdGlvbnMsXG4gIFN0ZXBPcHRpb25zLFxuICBXb3JrZmxvd09wdGlvbnMsXG59IGZyb20gXCIuL2ludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgaGFzUGVybWlzc2lvblNsaWVudCB9IGZyb20gXCIuL3Blcm1pc3Npb24udHNcIjtcbmltcG9ydCB7IENvbnRleHQsIFN0ZXBUeXBlIH0gZnJvbSBcIi4vaW50ZXJuYWwtaW50ZXJmYWNlLnRzXCI7XG5pbXBvcnQgeyBwYXJzZVdvcmtmbG93IH0gZnJvbSBcIi4vcGFyc2Utd29ya2Zsb3cudHNcIjtcbmltcG9ydCB7IGdldENvbnRlbnQgfSBmcm9tIFwiLi91dGlscy9maWxlLnRzXCI7XG5pbXBvcnQgeyBnZXRGaWxlc0J5RmlsdGVyIH0gZnJvbSBcIi4vdXRpbHMvZmlsdGVyLnRzXCI7XG5pbXBvcnQgeyBpc09iamVjdCB9IGZyb20gXCIuL3V0aWxzL29iamVjdC50c1wiO1xuaW1wb3J0IHsgcGFyc2VPYmplY3QgfSBmcm9tIFwiLi9wYXJzZS1vYmplY3QudHNcIjtcbmltcG9ydCB7IGlzUmVtb3RlUGF0aCB9IGZyb20gXCIuL3V0aWxzL3BhdGgudHNcIjtcbmltcG9ydCB7IGdldFN0ZXBSZXNwb25zZSwgcnVuU3RlcCwgc2V0RXJyb3JSZXN1bHQgfSBmcm9tIFwiLi9ydW4tc3RlcC50c1wiO1xuaW1wb3J0IHtcbiAgZmlsdGVyQ3R4SXRlbXMsXG4gIGdldFNvdXJjZUl0ZW1zRnJvbVJlc3VsdCxcbn0gZnJvbSBcIi4vZ2V0LXNvdXJjZS1pdGVtcy1mcm9tLXJlc3VsdC50c1wiO1xuaW1wb3J0IHtcbiAgY29uZmlnLFxuICBkZWxheSxcbiAgZGlybmFtZSxcbiAgam9pbixcbiAgbG9nLFxuICByZWxhdGl2ZSxcbiAgU3FsaXRlRGIsXG59IGZyb20gXCIuLi9kZXBzLnRzXCI7XG5pbXBvcnQgcmVwb3J0LCB7IGdldFJlcG9ydGVyIH0gZnJvbSBcIi4vcmVwb3J0LnRzXCI7XG5pbXBvcnQgeyBLZXlkYiB9IGZyb20gXCIuL2FkYXB0ZXJzL2pzb24tc3RvcmUtYWRhcHRlci50c1wiO1xuaW1wb3J0IHsgZmlsdGVyU291cmNlSXRlbXMgfSBmcm9tIFwiLi9maWx0ZXItc291cmNlLWl0ZW1zLnRzXCI7XG5pbXBvcnQgeyBtYXJrU291cmNlSXRlbXMgfSBmcm9tIFwiLi9tYXJrLXNvdXJjZS1pdGVtcy50c1wiO1xuaW1wb3J0IHsgcnVuQ21kLCBzZXRDbWRPa1Jlc3VsdCB9IGZyb20gXCIuL3J1bi1jbWQudHNcIjtcbmltcG9ydCB7XG4gIGdldEZpbmFsUnVuT3B0aW9ucyxcbiAgZ2V0RmluYWxTb3VyY2VPcHRpb25zLFxuICBnZXRGaW5hbFdvcmtmbG93T3B0aW9ucyxcbn0gZnJvbSBcIi4vZGVmYXVsdC1vcHRpb25zLnRzXCI7XG5pbXBvcnQgeyBydW5Qb3N0IH0gZnJvbSBcIi4vcnVuLXBvc3QudHNcIjtcbmltcG9ydCB7IHJ1bkFzc2VydCB9IGZyb20gXCIuL3J1bi1hc3NlcnQudHNcIjtcbmltcG9ydCB7IGdldEVudiB9IGZyb20gXCIuL3V0aWxzL2Vudi50c1wiO1xuXG5pbnRlcmZhY2UgVmFsaWRXb3JrZmxvdyB7XG4gIGN0eDogQ29udGV4dDtcbiAgd29ya2Zsb3c6IFdvcmtmbG93T3B0aW9ucztcbn1cblxuY29uc3QgcGFyc2UxS2V5cyA9IFtcImVudlwiXTtcbmNvbnN0IHBhcnNlMktleXMgPSBbXCJpZlwiLCBcImRlYnVnXCJdO1xuY29uc3QgcGFyc2UzRm9yR2VuZXJhbEtleXMgPSBbXG4gIFwiaWZcIixcbiAgXCJkZWJ1Z1wiLFxuICBcImRhdGFiYXNlXCIsXG4gIFwic2xlZXBcIixcbiAgXCJsaW1pdFwiLFxuICBcImZvcmNlXCIsXG5dO1xuY29uc3QgcGFyc2UzRm9yU3RlcEtleXMgPSBbXG4gIFwiaWRcIixcbiAgXCJmcm9tXCIsXG4gIFwidXNlXCIsXG4gIFwiYXJnc1wiLFxuXTtcbmNvbnN0IHBhcnNlNEZvclNvdXJjZUtleXMgPSBbXG4gIFwiZm9yY2VcIixcbiAgXCJpdGVtc1BhdGhcIixcbiAgXCJrZXlcIixcbiAgXCJsaW1pdFwiLFxuICBcInJldmVyc2VcIixcbl07XG5cbmNvbnN0IHBhcnNlNkZvclNvdXJjZUtleXMgPSBbXG4gIFwiZmlsdGVyRnJvbVwiLFxuICBcImZpbHRlckl0ZW1zRnJvbVwiLFxuXTtcbmNvbnN0IHBhcnNlN0ZvclNvdXJjZUtleXMgPSBbXG4gIFwiY21kXCIsXG5dO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuKHJ1bk9wdGlvbnM6IFJ1bldvcmtmbG93T3B0aW9ucykge1xuICBjb25zdCBkZWJ1Z0VudlBlcm1taXNpb24gPSB7IG5hbWU6IFwiZW52XCIsIHZhcmlhYmxlOiBcIkRFQlVHXCIgfSBhcyBjb25zdDtcbiAgY29uc3QgZGF0YVBlcm1pc3Npb24gPSB7IG5hbWU6IFwicmVhZFwiLCBwYXRoOiBcImRhdGFcIiB9IGFzIGNvbnN0O1xuICBsZXQgRGVidWdFbnZWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoZGVidWdFbnZQZXJtbWlzaW9uKSkge1xuICAgIERlYnVnRW52VmFsdWUgPSBEZW5vLmVudi5nZXQoXCJERUJVR1wiKTtcbiAgfVxuICBsZXQgaXNEZWJ1ZyA9ICEhKERlYnVnRW52VmFsdWUgIT09IHVuZGVmaW5lZCAmJiBEZWJ1Z0VudlZhbHVlICE9PSBcImZhbHNlXCIpO1xuXG4gIGNvbnN0IGNsaVdvcmtmbG93T3B0aW9ucyA9IGdldEZpbmFsUnVuT3B0aW9ucyhydW5PcHRpb25zLCBpc0RlYnVnKTtcbiAgaXNEZWJ1ZyA9IGNsaVdvcmtmbG93T3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcbiAgY29uc3Qge1xuICAgIGZpbGVzLFxuICAgIGNvbnRlbnQsXG4gIH0gPSBjbGlXb3JrZmxvd09wdGlvbnM7XG4gIGxldCB3b3JrZmxvd0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBjd2QgPSBEZW5vLmN3ZCgpO1xuICBpZiAoY29udGVudCkge1xuICAgIHdvcmtmbG93RmlsZXMgPSBbXTtcbiAgfSBlbHNlIHtcbiAgICB3b3JrZmxvd0ZpbGVzID0gYXdhaXQgZ2V0RmlsZXNCeUZpbHRlcihjd2QsIGZpbGVzKTtcbiAgfVxuXG4gIGxldCBlbnYgPSB7fTtcblxuICBjb25zdCBhbGxFbnZQZXJtbWlzaW9uID0geyBuYW1lOiBcImVudlwiIH0gYXMgY29uc3Q7XG5cbiAgLy8gZmlyc3QgdHJ5IHRvIGdldCAuZW52XG4gIGNvbnN0IGRvdEVudkZpbGVQZXJtbWlzaW9uID0ge1xuICAgIG5hbWU6IFwicmVhZFwiLFxuICAgIHBhdGg6IFwiLmVudiwuZW52LmRlZmF1bHRzLC5lbnYuZXhhbXBsZVwiLFxuICB9IGFzIGNvbnN0O1xuXG4gIGlmIChhd2FpdCBoYXNQZXJtaXNzaW9uU2xpZW50KGRvdEVudkZpbGVQZXJtbWlzaW9uKSkge1xuICAgIGVudiA9IGNvbmZpZygpO1xuICB9XG5cbiAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoYWxsRW52UGVybW1pc2lvbikpIHtcbiAgICBlbnYgPSB7XG4gICAgICAuLi5lbnYsXG4gICAgICAuLi5EZW5vLmVudi50b09iamVjdCgpLFxuICAgIH07XG4gIH1cblxuICAvLyBnZXQgb3B0aW9uc1xuICBsZXQgdmFsaWRXb3JrZmxvd3M6IFZhbGlkV29ya2Zsb3dbXSA9IFtdO1xuXG4gIC8vIGlmIHN0ZGluXG5cbiAgaWYgKGNvbnRlbnQpIHtcbiAgICBjb25zdCB3b3JrZmxvdyA9IHBhcnNlV29ya2Zsb3coY29udGVudCk7XG5cbiAgICBpZiAoaXNPYmplY3Qod29ya2Zsb3cpKSB7XG4gICAgICBjb25zdCB3b3JrZmxvd0ZpbGVQYXRoID0gXCIvdG1wL2Rlbm9mbG93L3RtcC13b3JrZmxvdy55bWxcIjtcbiAgICAgIGNvbnN0IHdvcmtmbG93UmVsYXRpdmVQYXRoID0gcmVsYXRpdmUoY3dkLCB3b3JrZmxvd0ZpbGVQYXRoKTtcbiAgICAgIHZhbGlkV29ya2Zsb3dzLnB1c2goe1xuICAgICAgICBjdHg6IHtcbiAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgIGVudixcbiAgICAgICAgICAgIHdvcmtmbG93UGF0aDogd29ya2Zsb3dGaWxlUGF0aCxcbiAgICAgICAgICAgIHdvcmtmbG93UmVsYXRpdmVQYXRoLFxuICAgICAgICAgICAgd29ya2Zsb3dDd2Q6IGRpcm5hbWUod29ya2Zsb3dGaWxlUGF0aCksXG4gICAgICAgICAgICBjd2Q6IGN3ZCxcbiAgICAgICAgICAgIHNvdXJjZXM6IHt9LFxuICAgICAgICAgICAgc3RlcHM6IHt9LFxuICAgICAgICAgICAgc3RhdGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGl0ZW1Tb3VyY2VPcHRpb25zOiB1bmRlZmluZWQsXG4gICAgICAgICAgc291cmNlc09wdGlvbnM6IFtdLFxuICAgICAgICAgIGN1cnJlbnRTdGVwVHlwZTogU3RlcFR5cGUuU291cmNlLFxuICAgICAgICB9LFxuICAgICAgICB3b3JrZmxvdzogd29ya2Zsb3csXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3JrZmxvd0ZpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgd29ya2Zsb3dSZWxhdGl2ZVBhdGggPSB3b3JrZmxvd0ZpbGVzW2ldO1xuICAgIGxldCBmaWxlQ29udGVudCA9IFwiXCI7XG4gICAgbGV0IHdvcmtmbG93RmlsZVBhdGggPSBcIlwiO1xuICAgIGlmIChpc1JlbW90ZVBhdGgod29ya2Zsb3dSZWxhdGl2ZVBhdGgpKSB7XG4gICAgICBjb25zdCBuZXRDb250ZW50ID0gYXdhaXQgZmV0Y2god29ya2Zsb3dSZWxhdGl2ZVBhdGgpO1xuICAgICAgd29ya2Zsb3dGaWxlUGF0aCA9IHdvcmtmbG93UmVsYXRpdmVQYXRoO1xuICAgICAgZmlsZUNvbnRlbnQgPSBhd2FpdCBuZXRDb250ZW50LnRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd29ya2Zsb3dGaWxlUGF0aCA9IGpvaW4oY3dkLCB3b3JrZmxvd1JlbGF0aXZlUGF0aCk7XG4gICAgICBmaWxlQ29udGVudCA9IGF3YWl0IGdldENvbnRlbnQod29ya2Zsb3dGaWxlUGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBwYXJzZVdvcmtmbG93KGZpbGVDb250ZW50KTtcbiAgICBpZiAoIWlzT2JqZWN0KHdvcmtmbG93KSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFsaWRXb3JrZmxvd3MucHVzaCh7XG4gICAgICBjdHg6IHtcbiAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgZW52LFxuICAgICAgICAgIHdvcmtmbG93UGF0aDogd29ya2Zsb3dGaWxlUGF0aCxcbiAgICAgICAgICB3b3JrZmxvd1JlbGF0aXZlUGF0aDogd29ya2Zsb3dSZWxhdGl2ZVBhdGgsXG4gICAgICAgICAgd29ya2Zsb3dDd2Q6IGRpcm5hbWUod29ya2Zsb3dGaWxlUGF0aCksXG4gICAgICAgICAgY3dkOiBjd2QsXG4gICAgICAgICAgc291cmNlczoge30sXG4gICAgICAgICAgc3RlcHM6IHt9LFxuICAgICAgICAgIHN0YXRlOiB1bmRlZmluZWQsXG4gICAgICAgICAgaXRlbXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBpdGVtU291cmNlT3B0aW9uczogdW5kZWZpbmVkLFxuICAgICAgICBzb3VyY2VzT3B0aW9uczogW10sXG4gICAgICAgIGN1cnJlbnRTdGVwVHlwZTogU3RlcFR5cGUuU291cmNlLFxuICAgICAgfSxcbiAgICAgIHdvcmtmbG93OiB3b3JrZmxvdyxcbiAgICB9KTtcbiAgICAvLyBydW4gY29kZVxuICB9XG4gIC8vIHNvcnQgYnkgYWxwaGFiZXRcbiAgdmFsaWRXb3JrZmxvd3MgPSB2YWxpZFdvcmtmbG93cy5zb3J0KChhLCBiKSA9PiB7XG4gICAgY29uc3QgYVBhdGggPSBhLmN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgY29uc3QgYlBhdGggPSBiLmN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgaWYgKGFQYXRoIDwgYlBhdGgpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgaWYgKGFQYXRoID4gYlBhdGgpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSk7XG4gIHJlcG9ydC5pbmZvKFxuICAgIGAgJHt2YWxpZFdvcmtmbG93cy5sZW5ndGh9IHZhbGlkIHdvcmtmbG93czpcXG4ke1xuICAgICAgdmFsaWRXb3JrZmxvd3MubWFwKChpdGVtKSA9PiBnZXRSZXBvcnRlck5hbWUoaXRlbS5jdHgpKS5qb2luKFxuICAgICAgICBcIlxcblwiLFxuICAgICAgKVxuICAgIH1cXG5gLFxuICAgIFwiU3VjY2VzcyBmb3VuZFwiLFxuICApO1xuICAvLyBydW4gd29ya2Zsb3dzIHN0ZXAgYnkgc3RlcFxuICBmb3IgKFxuICAgIGxldCB3b3JrZmxvd0luZGV4ID0gMDtcbiAgICB3b3JrZmxvd0luZGV4IDwgdmFsaWRXb3JrZmxvd3MubGVuZ3RoO1xuICAgIHdvcmtmbG93SW5kZXgrK1xuICApIHtcbiAgICBsZXQgeyBjdHgsIHdvcmtmbG93IH0gPSB2YWxpZFdvcmtmbG93c1t3b3JrZmxvd0luZGV4XTtcbiAgICAvLyBwYXJzZSByb290IGVudiBmaXJzdFxuICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgIGNvbnN0IHBhcnNlZFdvcmtmbG93RmlsZU9wdGlvbnNXaXRoRW52ID0gYXdhaXQgcGFyc2VPYmplY3Qod29ya2Zsb3csIGN0eCwge1xuICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICB9KSBhcyBXb3JrZmxvd09wdGlvbnM7XG4gICAgLy8gcnVuIGVudlxuICAgIC8vIHBhcnNlIGVudiB0byBlbnZcbiAgICBpZiAocGFyc2VkV29ya2Zsb3dGaWxlT3B0aW9uc1dpdGhFbnYuZW52KSB7XG4gICAgICBmb3IgKGNvbnN0IGtleSBpbiBwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudi5lbnYpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudi5lbnZba2V5XTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIGNvbnN0IGRlYnVnRW52UGVybW1pc2lvbiA9IHsgbmFtZTogXCJlbnZcIiwgdmFyaWFibGU6IGtleSB9IGFzIGNvbnN0O1xuICAgICAgICAgIGlmIChhd2FpdCBoYXNQZXJtaXNzaW9uU2xpZW50KGRlYnVnRW52UGVybW1pc2lvbikpIHtcbiAgICAgICAgICAgIERlbm8uZW52LnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBwYXJzZSBnZW5lcmFsIG9wdGlvbnNcblxuICAgIGNvbnN0IHBhcnNlZFdvcmtmbG93R2VuZXJhbE9wdGlvbnNXaXRoR2VuZXJhbCA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgcGFyc2VkV29ya2Zsb3dGaWxlT3B0aW9uc1dpdGhFbnYsXG4gICAgICBjdHgsXG4gICAgICB7XG4gICAgICAgIGtleXM6IHBhcnNlM0ZvckdlbmVyYWxLZXlzLFxuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgaWY6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICkgYXMgV29ya2Zsb3dPcHRpb25zO1xuXG4gICAgY29uc3Qgd29ya2Zsb3dPcHRpb25zID0gZ2V0RmluYWxXb3JrZmxvd09wdGlvbnMoXG4gICAgICBwYXJzZWRXb3JrZmxvd0dlbmVyYWxPcHRpb25zV2l0aEdlbmVyYWwgfHxcbiAgICAgICAge30sXG4gICAgICBjbGlXb3JrZmxvd09wdGlvbnMsXG4gICAgKTtcbiAgICBpc0RlYnVnID0gd29ya2Zsb3dPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuXG4gICAgY29uc3Qgd29ya2Zsb3dSZXBvcnRlciA9IGdldFJlcG9ydGVyKFxuICAgICAgYCR7Z2V0UmVwb3J0ZXJOYW1lKGN0eCl9YCxcbiAgICAgIGlzRGVidWcsXG4gICAgKTtcblxuICAgIC8vIGNoZWNrIGlmIG5lZWQgdG8gcnVuXG4gICAgaWYgKCF3b3JrZmxvd09wdGlvbnM/LmlmKSB7XG4gICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXG4gICAgICAgIGBiZWNhdXNlIGlmIGNvbmRpdGlvbiBpcyBmYWxzZWAsXG4gICAgICAgIFwiU2tpcCB3b3JrZmxvd1wiLFxuICAgICAgKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXG4gICAgICAgIGBgLFxuICAgICAgICBcIlN0YXJ0IGhhbmRsZSB3b3JrZmxvd1wiLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBtZXJnZSB0byBnZXQgZGVmYXVsdFxuICAgIGN0eC5wdWJsaWMub3B0aW9ucyA9IHdvcmtmbG93T3B0aW9ucztcblxuICAgIGNvbnN0IGRhdGFiYXNlID0gd29ya2Zsb3dPcHRpb25zLmRhdGFiYXNlIGFzIHN0cmluZztcbiAgICBsZXQgZGI7XG5cbiAgICBpZiAoZGF0YWJhc2U/LnN0YXJ0c1dpdGgoXCJzcWxpdGVcIikpIHtcbiAgICAgIGRiID0gbmV3IFNxbGl0ZURiKGRhdGFiYXNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IG5hbWVzcGFjZSA9IGN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgICBpZiAobmFtZXNwYWNlLnN0YXJ0c1dpdGgoXCIuLlwiKSkge1xuICAgICAgICAvLyB1c2UgYWJzb2x1dGUgcGF0aCBhcyBuYW1lc3BhY2VcbiAgICAgICAgbmFtZXNwYWNlID0gYEBkZW5vZmxvd1Jvb3Qke2N0eC5wdWJsaWMud29ya2Zsb3dQYXRofWA7XG4gICAgICB9XG5cbiAgICAgIGRiID0gbmV3IEtleWRiKGRhdGFiYXNlLCB7XG4gICAgICAgIG5hbWVzcGFjZTogbmFtZXNwYWNlLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGN0eC5kYiA9IGRiO1xuICAgIC8vIGNoZWNrIHBlcm1pc3Npb25cbiAgICAvLyB1bmlxdWUga2V5XG4gICAgbGV0IHN0YXRlO1xuICAgIGxldCBpbnRlcm5hbFN0YXRlID0ge1xuICAgICAga2V5czogW10sXG4gICAgfTtcbiAgICBpZiAoYXdhaXQgaGFzUGVybWlzc2lvblNsaWVudChkYXRhUGVybWlzc2lvbikpIHtcbiAgICAgIHN0YXRlID0gYXdhaXQgZGIuZ2V0KFwic3RhdGVcIikgfHwgdW5kZWZpbmVkO1xuICAgICAgaW50ZXJuYWxTdGF0ZSA9IGF3YWl0IGRiLmdldChcImludGVybmFsU3RhdGVcIikgfHwge1xuICAgICAgICBrZXlzOiBbXSxcbiAgICAgIH07XG4gICAgfVxuICAgIGN0eC5wdWJsaWMuc3RhdGUgPSBzdGF0ZTtcbiAgICBjdHguaW50ZXJuYWxTdGF0ZSA9IGludGVybmFsU3RhdGU7XG4gICAgY3R4LmluaXRTdGF0ZSA9IEpTT04uc3RyaW5naWZ5KHN0YXRlKTtcbiAgICBjdHguaW5pdEludGVybmFsU3RhdGUgPSBKU09OLnN0cmluZ2lmeShpbnRlcm5hbFN0YXRlKTtcblxuICAgIGNvbnN0IHNvdXJjZXMgPSB3b3JrZmxvdy5zb3VyY2VzO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmIChzb3VyY2VzKSB7XG4gICAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcIlwiLCBcIlN0YXJ0IGdldCBzb3VyY2VzXCIpO1xuICAgICAgICBmb3IgKGxldCBzb3VyY2VJbmRleCA9IDA7IHNvdXJjZUluZGV4IDwgc291cmNlcy5sZW5ndGg7IHNvdXJjZUluZGV4KyspIHtcbiAgICAgICAgICBjb25zdCBzb3VyY2UgPSBzb3VyY2VzW3NvdXJjZUluZGV4XTtcbiAgICAgICAgICBjdHgucHVibGljLnNvdXJjZUluZGV4ID0gc291cmNlSW5kZXg7XG4gICAgICAgICAgY29uc3Qgc291cmNlUmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBzb3VyY2U6JHtjdHgucHVibGljLnNvdXJjZUluZGV4fWAsXG4gICAgICAgICAgICBpc0RlYnVnLFxuICAgICAgICAgICk7XG4gICAgICAgICAgbGV0IHNvdXJjZU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAuLi5zb3VyY2UsXG4gICAgICAgICAgfTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICAgICAgICAgIH0pIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIHBhcnNlIGlmIG9ubHlcbiAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChcbiAgICAgICAgICAgICAgc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgY3R4LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5czogcGFyc2UyS2V5cyxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgICBpZjogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgKSBhcyBTb3VyY2VPcHRpb25zO1xuXG4gICAgICAgICAgICAvLyBzZXQgbG9nIGxldmVsXG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucz8uZGVidWcgfHwgY3R4LnB1YmxpYy5vcHRpb25zPy5kZWJ1Zykge1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci5sZXZlbCA9IGxvZy5Mb2dMZXZlbHMuREVCVUc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIG5lZWQgdG8gcnVuXG4gICAgICAgICAgICBpZiAoIXNvdXJjZU9wdGlvbnMuaWYpIHtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICAgIFwiU2tpcCBzb3VyY2VcIixcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcGFyc2Ugb25cbiAgICAgICAgICAgIC8vIGluc2VydCBzdGVwIGVudlxuICAgICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgICAgICAgICBzb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgICAgIHB1YmxpYzoge1xuICAgICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgICAgIGVudjoge1xuICAgICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLmVudixcbiAgICAgICAgICAgICAgICAgICAgLi4uYXdhaXQgZ2V0RW52KCksXG4gICAgICAgICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMuZW52LFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5czogcGFyc2UzRm9yU3RlcEtleXMsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICApIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIGdldCBvcHRpb25zXG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gZ2V0RmluYWxTb3VyY2VPcHRpb25zKFxuICAgICAgICAgICAgICB3b3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICAgIGNsaVdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlzRGVidWcgPSBzb3VyY2VPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBjaGVjayBpZlxuICAgICAgICAgICAgaWYgKCFzb3VyY2VPcHRpb25zLmlmKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMucmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5lcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRSZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuY21kQ29kZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRPayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuaXNSZWFsT2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLmlkKSB7XG4gICAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZU9wdGlvbnMuaWRdID1cbiAgICAgICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBydW4gc291cmNlXG4gICAgICAgICAgICBjdHggPSBhd2FpdCBydW5TdGVwKGN0eCwge1xuICAgICAgICAgICAgICByZXBvcnRlcjogc291cmNlUmVwb3J0ZXIsXG4gICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gcGFyc2U0XG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlNEZvclNvdXJjZUtleXMsXG4gICAgICAgICAgICB9KSBhcyBTb3VyY2VPcHRpb25zO1xuXG4gICAgICAgICAgICAvLyBnZXQgc291cmNlIGl0ZW1zIGJ5IGl0ZW1zUGF0aCwga2V5XG4gICAgICAgICAgICBjdHggPSBhd2FpdCBnZXRTb3VyY2VJdGVtc0Zyb21SZXN1bHQoY3R4LCB7XG4gICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBwYXJzZTZcblxuICAgICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHNvdXJjZU9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICBrZXlzOiBwYXJzZTZGb3JTb3VyY2VLZXlzLFxuICAgICAgICAgICAgfSkgYXMgU291cmNlT3B0aW9ucztcbiAgICAgICAgICAgIC8vIHJ1biB1c2VyIGZpbHRlciwgZmlsdGVyIGZyb20sIGZpbHRlckl0ZW1zLCBmaWx0ZXJJdGVtc0Zyb20sIG9ubHkgYWxsb3cgb25lLlxuICAgICAgICAgICAgY3R4ID0gYXdhaXQgZmlsdGVyU291cmNlSXRlbXMoY3R4LCB7XG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBydW4gY21kXG5cbiAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLmNtZCkge1xuICAgICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgICAga2V5czogcGFyc2U3Rm9yU291cmNlS2V5cyxcbiAgICAgICAgICAgICAgfSkgYXMgU291cmNlT3B0aW9ucztcbiAgICAgICAgICAgICAgY29uc3QgY21kUmVzdWx0ID0gYXdhaXQgcnVuQ21kKGN0eCwgc291cmNlT3B0aW9ucy5jbWQgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgICAgY3R4ID0gc2V0Q21kT2tSZXN1bHQoY3R4LCBjbWRSZXN1bHQuc3Rkb3V0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gbWFyayBzb3VyY2UgaXRlbXMsIGFkZCB1bmlxdWUga2V5IGFuZCBzb3VyY2UgaW5kZXggdG8gaXRlbXNcbiAgICAgICAgICAgIGN0eCA9IG1hcmtTb3VyY2VJdGVtcyhjdHgsIHNvdXJjZU9wdGlvbnMpO1xuICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XSA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuaWQpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZU9wdGlvbnMuaWRdID1cbiAgICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBydW4gYXNzZXJ0XG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5hc3NlcnQpIHtcbiAgICAgICAgICAgICAgY3R4ID0gYXdhaXQgcnVuQXNzZXJ0KGN0eCwge1xuICAgICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgICAgICAuLi5zb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjdHgucHVibGljLml0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgLy8gcnVuIHBvc3RcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBcIlwiLFxuICAgICAgICAgICAgICAgIGBTb3VyY2UgJHtzb3VyY2VJbmRleH0gZ2V0ICR7Y3R4LnB1YmxpYy5pdGVtcy5sZW5ndGh9IGl0ZW1zYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMucG9zdCkge1xuICAgICAgICAgICAgICBhd2FpdCBydW5Qb3N0KGN0eCwge1xuICAgICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgICAgICAuLi5zb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN0eC5zb3VyY2VzT3B0aW9ucy5wdXNoKHNvdXJjZU9wdGlvbnMpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGN0eCA9IHNldEVycm9yUmVzdWx0KGN0eCwgZSk7XG4gICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICBpZiAoc291cmNlLmlkKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2UuaWRdID0gY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzb3VyY2UuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICAgIGBGYWlsZWQgcnVuIHNvdXJjZWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLndhcm5pbmcoZSk7XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgICAgYElnbm9yZSB0aGlzIGVycm9yLCBiZWNhdXNlIGNvbnRpbnVlT25FcnJvciBpcyB0cnVlLmAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYEZhaWxlZCBydW4gc291cmNlYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcGFyc2UgOCBzbGVlcFxuICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzb3VyY2VPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgIGtleXM6IFtcInNsZWVwXCJdLFxuICAgICAgICAgIH0pIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAvLyBjaGVjayBpcyBuZWVkIHNsZWVwXG4gICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuc2xlZXAgJiYgc291cmNlT3B0aW9ucy5zbGVlcCA+IDApIHtcbiAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgIGAke3NvdXJjZU9wdGlvbnMuc2xlZXB9IHNlY29uZHNgLFxuICAgICAgICAgICAgICBcIlNsZWVwXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYXdhaXQgZGVsYXkoc291cmNlT3B0aW9ucy5zbGVlcCAqIDEwMDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBpbnNlcnQgbmV3IGN0eC5pdGVtc1xuICAgICAgaWYgKHNvdXJjZXMpIHtcbiAgICAgICAgbGV0IGNvbGxlY3RDdHhJdGVtczogdW5rbm93bltdID0gW107XG4gICAgICAgIHNvdXJjZXMuZm9yRWFjaCgoXywgdGhlU291cmNlSW5kZXgpID0+IHtcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjdHgucHVibGljLnNvdXJjZXNbdGhlU291cmNlSW5kZXhdLnJlc3VsdCkpIHtcbiAgICAgICAgICAgIGNvbGxlY3RDdHhJdGVtcyA9IGNvbGxlY3RDdHhJdGVtcy5jb25jYXQoXG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1t0aGVTb3VyY2VJbmRleF0ucmVzdWx0LFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjdHgucHVibGljLml0ZW1zID0gY29sbGVjdEN0eEl0ZW1zO1xuICAgICAgICBpZiAoY3R4LnB1YmxpYy5pdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgYFRvdGFsICR7Y3R4LnB1YmxpYy5pdGVtcy5sZW5ndGh9IGl0ZW1zYCxcbiAgICAgICAgICAgIFwiRmluaXNoIGdldCBzb3VyY2VzXCIsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBpZiBpdGVtcyA+MCwgdGhlbiBjb250aW51ZVxuICAgICAgaWYgKChjdHgucHVibGljLml0ZW1zIGFzIHVua25vd25bXSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIG5vIG5lZWQgdG8gaGFuZGxlIHN0ZXBzXG4gICAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICBgYmVjYXVzZSBubyBhbnkgdmFsaWQgc291cmNlcyBpdGVtcyByZXR1cm5lZGAsXG4gICAgICAgICAgXCJTa2lwIHdvcmtmbG93XCIsXG4gICAgICAgICk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBydW4gZmlsdGVyXG4gICAgICBjb25zdCBmaWx0ZXIgPSB3b3JrZmxvdy5maWx0ZXI7XG4gICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgIGN0eC5jdXJyZW50U3RlcFR5cGUgPSBTdGVwVHlwZS5GaWx0ZXI7XG4gICAgICAgIGNvbnN0IGZpbHRlclJlcG9ydGVyID0gZ2V0UmVwb3J0ZXIoXG4gICAgICAgICAgYCR7Z2V0UmVwb3J0ZXJOYW1lKGN0eCl9IC0+IGZpbHRlcmAsXG4gICAgICAgICAgaXNEZWJ1ZyxcbiAgICAgICAgKTtcbiAgICAgICAgbGV0IGZpbHRlck9wdGlvbnMgPSB7IC4uLmZpbHRlciB9O1xuICAgICAgICBsZXQgaWZGaWx0ZXIgPSB0cnVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChmaWx0ZXIsIGN0eCwge1xuICAgICAgICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICAgICAgICB9KSBhcyBGaWx0ZXJPcHRpb25zO1xuXG4gICAgICAgICAgLy8gcGFyc2UgaWYgZGVidWcgb25seVxuICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChcbiAgICAgICAgICAgIGZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICBjdHgsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlMktleXMsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICBpZjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgKSBhcyBGaWx0ZXJPcHRpb25zO1xuXG4gICAgICAgICAgLy8gc2V0IGxvZyBsZXZlbFxuICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zPy5kZWJ1ZyB8fCBjdHgucHVibGljLm9wdGlvbnM/LmRlYnVnKSB7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5sZXZlbCA9IGxvZy5Mb2dMZXZlbHMuREVCVUc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gY2hlY2sgaWYgbmVlZCB0byBydW5cbiAgICAgICAgICBpZiAoIWZpbHRlck9wdGlvbnMuaWYpIHtcbiAgICAgICAgICAgIGlmRmlsdGVyID0gZmFsc2U7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICBcIlNraXAgZmlsdGVyXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBwYXJzZSBvblxuICAgICAgICAgICAgLy8gaW5zZXJ0IHN0ZXAgZW52XG4gICAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoXG4gICAgICAgICAgICAgIGZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgICAgICAuLi5hd2FpdCBnZXRFbnYoKSxcbiAgICAgICAgICAgICAgICAgICAgLi4uZmlsdGVyT3B0aW9ucy5lbnYsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXlzOiBwYXJzZTNGb3JTdGVwS2V5cyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICkgYXMgRmlsdGVyT3B0aW9ucztcblxuICAgICAgICAgICAgLy8gZ2V0IG9wdGlvbnNcbiAgICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBnZXRGaW5hbFNvdXJjZU9wdGlvbnMoXG4gICAgICAgICAgICAgIHdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgY2xpV29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgICBmaWx0ZXJPcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlzRGVidWcgPSBmaWx0ZXJPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuICAgICAgICAgICAgaWYgKCFmaWx0ZXJPcHRpb25zLmlmKSB7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIuaW5mbyhcIlwiLCBcIlN0YXJ0IGhhbmRsZSBmaWx0ZXJcIik7XG4gICAgICAgICAgICAvLyBydW4gRmlsdGVyXG4gICAgICAgICAgICBjdHggPSBhd2FpdCBydW5TdGVwKGN0eCwge1xuICAgICAgICAgICAgICByZXBvcnRlcjogZmlsdGVyUmVwb3J0ZXIsXG4gICAgICAgICAgICAgIC4uLmZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgQXJyYXkuaXNBcnJheShjdHgucHVibGljLnJlc3VsdCkgJiZcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5yZXN1bHQubGVuZ3RoID09PSBjdHgucHVibGljLml0ZW1zLmxlbmd0aFxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbXMgPSBjdHgucHVibGljLml0ZW1zLmZpbHRlcigoX2l0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICEhKChjdHgucHVibGljLnJlc3VsdCBhcyBib29sZWFuW10pW2luZGV4XSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBjdHgucHVibGljLnJlc3VsdCA9IGN0eC5wdWJsaWMuaXRlbXM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZpbHRlck9wdGlvbnMucnVuIHx8IGZpbHRlck9wdGlvbnMudXNlKSB7XG4gICAgICAgICAgICAgIC8vIGlmIHJ1biBvciB1c2UsIHRoZW4gcmVzdWx0IG11c3QgYmUgYXJyYXlcbiAgICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyIHNjcmlwdGAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIC8vIGludmFsaWQgcmVzdWx0XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBcIkludmFsaWQgZmlsdGVyIHN0ZXAgcmVzdWx0LCByZXN1bHQgbXVzdCBiZSBhcnJheSAsIGJvb2xlYW5bXSwgd2hpY2ggYXJyYXkgbGVuZ3RoIG11c3QgYmUgZXF1YWwgdG8gY3R4Lml0ZW1zIGxlbmd0aFwiLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZmlsdGVyT3B0aW9ucy5jbWQpIHtcbiAgICAgICAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KGZpbHRlck9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICAgIGtleXM6IFtcImNtZFwiXSxcbiAgICAgICAgICAgICAgfSkgYXMgRmlsdGVyT3B0aW9ucztcbiAgICAgICAgICAgICAgY29uc3QgY21kUmVzdWx0ID0gYXdhaXQgcnVuQ21kKGN0eCwgZmlsdGVyT3B0aW9ucy5jbWQgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgICAgY3R4ID0gc2V0Q21kT2tSZXN1bHQoY3R4LCBjbWRSZXN1bHQuc3Rkb3V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN0eC5wdWJsaWMuZmlsdGVyID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICAvLyBwYXJzZSBsaW1pdFxuICAgICAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KGZpbHRlck9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICBrZXlzOiBbXCJsaW1pdFwiXSxcbiAgICAgICAgICAgIH0pIGFzIEZpbHRlck9wdGlvbnM7XG4gICAgICAgICAgICAvLyBydW4gZmlsdGVyXG4gICAgICAgICAgICBjdHggPSBmaWx0ZXJDdHhJdGVtcyhjdHgsIHtcbiAgICAgICAgICAgICAgLi4uZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIHJ1biBhc3NlcnRcbiAgICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLmFzc2VydCkge1xuICAgICAgICAgICAgICBjdHggPSBhd2FpdCBydW5Bc3NlcnQoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgICAgICAgIC4uLmZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBydW4gcG9zdFxuXG4gICAgICAgICAgICBpZiAoZmlsdGVyT3B0aW9ucy5wb3N0KSB7XG4gICAgICAgICAgICAgIGF3YWl0IHJ1blBvc3QoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgICAgICAgIC4uLmZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGN0eCA9IHNldEVycm9yUmVzdWx0KGN0eCwgZSk7XG4gICAgICAgICAgY3R4LnB1YmxpYy5maWx0ZXIgPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcblxuICAgICAgICAgIGlmIChmaWx0ZXIuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIGZpbHRlcmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIud2FybmluZyhlKTtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgIGBJZ25vcmUgdGhpcyBlcnJvciwgYmVjYXVzZSBjb250aW51ZU9uRXJyb3IgaXMgdHJ1ZS5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpZkZpbHRlcikge1xuICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgVG90YWwgJHtjdHgucHVibGljLml0ZW1zLmxlbmd0aH0gaXRlbXNgLFxuICAgICAgICAgICAgXCJGaW5pc2ggaGFuZGxlIGZpbHRlclwiLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICAvLyBjaGVjayBpcyBuZWVkIHNsZWVwXG4gICAgICAgICAgLy8gcGFyc2Ugc2xlZXBcbiAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoZmlsdGVyT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBbXCJzbGVlcFwiXSxcbiAgICAgICAgICB9KSBhcyBGaWx0ZXJPcHRpb25zO1xuICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLnNsZWVwICYmIGZpbHRlck9wdGlvbnMuc2xlZXAgPiAwKSB7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICBgJHtmaWx0ZXJPcHRpb25zLnNsZWVwfSBzZWNvbmRzYCxcbiAgICAgICAgICAgICAgXCJTbGVlcFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGF3YWl0IGRlbGF5KGZpbHRlck9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY3R4LmN1cnJlbnRTdGVwVHlwZSA9IFN0ZXBUeXBlLlN0ZXA7XG5cbiAgICAgIGZvciAoXG4gICAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICAgIGluZGV4IDwgKGN0eC5wdWJsaWMuaXRlbXMgYXMgdW5rbm93bltdKS5sZW5ndGg7XG4gICAgICAgIGluZGV4KytcbiAgICAgICkge1xuICAgICAgICBjdHgucHVibGljLml0ZW1JbmRleCA9IGluZGV4O1xuICAgICAgICBjdHgucHVibGljLml0ZW0gPSAoY3R4LnB1YmxpYy5pdGVtcyBhcyB1bmtub3duW10pW2luZGV4XTtcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KSAmJlxuICAgICAgICAgIChjdHgucHVibGljLml0ZW0gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbXCJAZGVub2Zsb3dLZXlcIl1cbiAgICAgICAgKSB7XG4gICAgICAgICAgY3R4LnB1YmxpYy5pdGVtS2V5ID1cbiAgICAgICAgICAgIChjdHgucHVibGljLml0ZW0gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbXCJAZGVub2Zsb3dLZXlcIl07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoY3R4LnB1YmxpYy5pdGVtKSkge1xuICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbUtleSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICBgQ2FuIG5vdCBmb3VuZCBpbnRlcm5hbCBpdGVtIGtleSBcXGBAZGVub2Zsb3dLZXlcXGAsIG1heWJlIHlvdSBjaGFuZ2VkIHRoZSBpdGVtIGZvcm1hdC4gTWlzc2luZyB0aGlzIGtleSwgZGVub2Zsb3cgY2FuIG5vdCBzdG9yZSB0aGUgdW5pcXVlIGtleSBzdGF0ZS4gRml4IHRoaXMsIFRyeSBub3QgY2hhbmdlIHRoZSByZWZlcmVuY2UgaXRlbSwgb25seSBjaGFuZ2UgdGhlIHByb3BlcnR5IHlvdSBuZWVkIHRvIGNoYW5nZS4gVHJ5IHRvIG1hbnVhbCBhZGRpbmcgYSBcXGBAZGVub2Zsb3dLZXlcXGAgYXMgaXRlbSB1bmlxdWUga2V5LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjdHgucHVibGljLml0ZW1LZXkgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXG4gICAgICAgICAgKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KSAmJlxuICAgICAgICAgICgoKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KVtcbiAgICAgICAgICAgICAgXCJAZGVub2Zsb3dTb3VyY2VJbmRleFwiXG4gICAgICAgICAgICBdKSBhcyBudW1iZXIpID49IDBcbiAgICAgICAgKSB7XG4gICAgICAgICAgY3R4LnB1YmxpYy5pdGVtU291cmNlSW5kZXggPVxuICAgICAgICAgICAgKChjdHgucHVibGljLml0ZW0gYXMgUmVjb3JkPHN0cmluZywgbnVtYmVyPilbXG4gICAgICAgICAgICAgIFwiQGRlbm9mbG93U291cmNlSW5kZXhcIlxuICAgICAgICAgICAgXSkgYXMgbnVtYmVyO1xuICAgICAgICAgIGN0eC5pdGVtU291cmNlT3B0aW9ucyA9XG4gICAgICAgICAgICBjdHguc291cmNlc09wdGlvbnNbY3R4LnB1YmxpYy5pdGVtU291cmNlSW5kZXhdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGN0eC5wdWJsaWMuaXRlbSkpIHtcbiAgICAgICAgICBjdHguaXRlbVNvdXJjZU9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgd29ya2Zsb3dSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgYENhbiBub3QgZm91bmQgaW50ZXJuYWwgaXRlbSBrZXkgXFxgQGRlbm9mbG93U291cmNlSW5kZXhcXGAsIG1heWJlIHlvdSBjaGFuZ2VkIHRoZSBpdGVtIGZvcm1hdC4gVHJ5IG5vdCBjaGFuZ2UgdGhlIHJlZmVyZW5jZSBpdGVtLCBvbmx5IGNoYW5nZSB0aGUgcHJvcGVydHkgeW91IG5lZWQgdG8gY2hhbmdlLiBUcnkgdG8gbWFudWFsIGFkZGluZyBhIFxcYEBkZW5vZmxvd0tleVxcYCBhcyBpdGVtIHVuaXF1ZSBrZXkuYCxcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN0eC5pdGVtU291cmNlT3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGl0ZW1SZXBvcnRlciA9IGdldFJlcG9ydGVyKFxuICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBpdGVtOiR7aW5kZXh9YCxcbiAgICAgICAgICBpc0RlYnVnLFxuICAgICAgICApO1xuICAgICAgICBpZiAoY3R4LnB1YmxpYy5vcHRpb25zPy5kZWJ1Zykge1xuICAgICAgICAgIGl0ZW1SZXBvcnRlci5sZXZlbCA9IGxvZy5Mb2dMZXZlbHMuREVCVUc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXdvcmtmbG93LnN0ZXBzKSB7XG4gICAgICAgICAgd29ya2Zsb3cuc3RlcHMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGBgLFxuICAgICAgICAgICAgXCJTdGFydCBydW4gc3RlcHNcIixcbiAgICAgICAgICApO1xuICAgICAgICAgIGl0ZW1SZXBvcnRlci5kZWJ1ZyhgJHtKU09OLnN0cmluZ2lmeShjdHgucHVibGljLml0ZW0sIG51bGwsIDIpfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB3b3JrZmxvdy5zdGVwcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGNvbnN0IHN0ZXAgPSB3b3JrZmxvdy5zdGVwc1tqXTtcbiAgICAgICAgICBjdHgucHVibGljLnN0ZXBJbmRleCA9IGo7XG4gICAgICAgICAgY29uc3Qgc3RlcFJlcG9ydGVyID0gZ2V0UmVwb3J0ZXIoXG4gICAgICAgICAgICBgJHtnZXRSZXBvcnRlck5hbWUoY3R4KX0gLT4gc3RlcDoke2N0eC5wdWJsaWMuc3RlcEluZGV4fWAsXG4gICAgICAgICAgICBpc0RlYnVnLFxuICAgICAgICAgICk7XG4gICAgICAgICAgbGV0IHN0ZXBPcHRpb25zID0geyAuLi5zdGVwIH07XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgICAgICAgICAgc3RlcE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzdGVwT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlMUtleXMsXG4gICAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcblxuICAgICAgICAgICAgLy8gcGFyc2UgaWYgb25seVxuICAgICAgICAgICAgc3RlcE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzdGVwT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlMktleXMsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICBpZjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgICAgaWYgKHN0ZXBPcHRpb25zLmRlYnVnIHx8IGN0eC5wdWJsaWMub3B0aW9ucz8uZGVidWcpIHtcbiAgICAgICAgICAgICAgc3RlcFJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwic3RlcE9wdGlvbnMxXCIsIHN0ZXBPcHRpb25zKTtcblxuICAgICAgICAgICAgaWYgKCFzdGVwT3B0aW9ucy5pZikge1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICAgIFwiU2tpcCBzdGVwXCIsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBwYXJzZSBvblxuICAgICAgICAgICAgLy8gaW5zZXJ0IHN0ZXAgZW52XG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHN0ZXBPcHRpb25zLCB7XG4gICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgICAgLi4uYXdhaXQgZ2V0RW52KCksXG4gICAgICAgICAgICAgICAgICAuLi5zdGVwT3B0aW9ucy5lbnYsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2UzRm9yU3RlcEtleXMsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICBpZjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJzdGVwT3B0aW9uczIuNVwiLCBzdGVwT3B0aW9ucyk7XG5cbiAgICAgICAgICAgIC8vIGdldCBvcHRpb25zXG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGdldEZpbmFsU291cmNlT3B0aW9ucyhcbiAgICAgICAgICAgICAgd29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgICBjbGlXb3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICAgIHN0ZXBPcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlzRGVidWcgPSBzdGVwT3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcblxuICAgICAgICAgICAgc3RlcFJlcG9ydGVyLmRlYnVnKFxuICAgICAgICAgICAgICBgU3RhcnQgcnVuIHRoaXMgc3RlcC5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdjdHgyJyxjdHgpO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJzdGVwT3B0aW9uczJcIiwgc3RlcE9wdGlvbnMpO1xuXG4gICAgICAgICAgICBpZiAoIXN0ZXBPcHRpb25zLmlmKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMucmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5lcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRSZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuY21kQ29kZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRPayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuaXNSZWFsT2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW2pdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICAgIGlmIChzdGVwLmlkKSB7XG4gICAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zdGVwc1tzdGVwLmlkXSA9IGN0eC5wdWJsaWMuc3RlcHNbal07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1blN0ZXAoY3R4LCB7XG4gICAgICAgICAgICAgIC4uLnN0ZXBPcHRpb25zLFxuICAgICAgICAgICAgICByZXBvcnRlcjogc3RlcFJlcG9ydGVyLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMuY21kKSB7XG4gICAgICAgICAgICAgIC8vIHBhcnNlIGNtZFxuXG4gICAgICAgICAgICAgIHN0ZXBPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc3RlcE9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgICAgICAuLi5hd2FpdCBnZXRFbnYoKSxcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMuZW52LFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAga2V5czogW1wiY21kXCJdLFxuICAgICAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcbiAgICAgICAgICAgICAgY29uc3QgY21kUmVzdWx0ID0gYXdhaXQgcnVuQ21kKGN0eCwgc3RlcE9wdGlvbnMuY21kIGFzIHN0cmluZyk7XG4gICAgICAgICAgICAgIGN0eCA9IHNldENtZE9rUmVzdWx0KGN0eCwgY21kUmVzdWx0LnN0ZG91dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbal0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgIGlmIChzdGVwLmlkKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbc3RlcC5pZF0gPSBjdHgucHVibGljLnN0ZXBzW2pdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdGVwUmVwb3J0ZXIuZGVidWcoXG4gICAgICAgICAgICAgIGBGaW5pc2ggdG8gcnVuIHRoaXMgc3RlcC5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW2pdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG5cbiAgICAgICAgICAgIGlmIChzdGVwLmlkKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbc3RlcC5pZF0gPSBjdHgucHVibGljLnN0ZXBzW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0ZXAuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBzdGVwYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgc3RlcFJlcG9ydGVyLndhcm5pbmcoZSk7XG4gICAgICAgICAgICAgIHN0ZXBSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICAgIGBJZ25vcmUgdGhpcyBlcnJvciwgYmVjYXVzZSBjb250aW51ZU9uRXJyb3IgaXMgdHJ1ZS5gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHN0ZXBSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBzdGVwYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gdGhpcyBpdGVtIHN0ZXBzIGFsbCBvaywgYWRkIHVuaXF1ZSBrZXlzIHRvIHRoZSBpbnRlcm5hbCBzdGF0ZVxuXG4gICAgICAgICAgLy8gcnVuIGFzc2VydFxuICAgICAgICAgIGlmIChzdGVwT3B0aW9ucy5hc3NlcnQpIHtcbiAgICAgICAgICAgIGF3YWl0IHJ1bkFzc2VydChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHN0ZXBSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMucG9zdCkge1xuICAgICAgICAgICAgYXdhaXQgcnVuUG9zdChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHN0ZXBSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RlcFJlcG9ydGVyLmluZm8oXCJcIiwgXCJGaW5pc2ggcnVuIHN0ZXAgXCIgKyBqKTtcblxuICAgICAgICAgIC8vIHBhcnNlIHNsZWVwXG4gICAgICAgICAgc3RlcE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzdGVwT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBbXCJzbGVlcFwiXSxcbiAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcblxuICAgICAgICAgIC8vIGNoZWNrIGlzIG5lZWQgc2xlZXBcbiAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMuc2xlZXAgJiYgc3RlcE9wdGlvbnMuc2xlZXAgPiAwKSB7XG4gICAgICAgICAgICBzdGVwUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgYCR7c3RlcE9wdGlvbnMuc2xlZXB9IHNlY29uZHNgLFxuICAgICAgICAgICAgICBcIlNsZWVwXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYXdhaXQgZGVsYXkoc3RlcE9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2hlY2sgaXMgIWZvcmNlXG4gICAgICAgIC8vIGdldCBpdGVtIHNvdXJjZSBvcHRpb25zXG4gICAgICAgIGlmIChjdHguaXRlbVNvdXJjZU9wdGlvbnMgJiYgIWN0eC5pdGVtU291cmNlT3B0aW9ucy5mb3JjZSkge1xuICAgICAgICAgIGlmICghY3R4LmludGVybmFsU3RhdGUgfHwgIWN0eC5pbnRlcm5hbFN0YXRlLmtleXMpIHtcbiAgICAgICAgICAgIGN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbUtleSAmJlxuICAgICAgICAgICAgIWN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzLmluY2x1ZGVzKGN0eC5wdWJsaWMuaXRlbUtleSEpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBjdHguaW50ZXJuYWxTdGF0ZSEua2V5cy51bnNoaWZ0KGN0eC5wdWJsaWMuaXRlbUtleSEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBvbmx5IHNhdmUgMTAwMCBpdGVtcyBmb3Igc2F2ZSBtZW1vcnlcbiAgICAgICAgICBpZiAoY3R4LmludGVybmFsU3RhdGUhLmtleXMubGVuZ3RoID4gMTAwMCkge1xuICAgICAgICAgICAgY3R4LmludGVybmFsU3RhdGUhLmtleXMgPSBjdHguaW50ZXJuYWxTdGF0ZSEua2V5cy5zbGljZSgwLCAxMDAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdvcmtmbG93LnN0ZXBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBpdGVtUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGBgLFxuICAgICAgICAgICAgYEZpbmlzaCBydW4gc3RlcHNgLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gcnVuIHBvc3Qgc3RlcFxuICAgICAgY29uc3QgcG9zdCA9IHdvcmtmbG93LnBvc3Q7XG4gICAgICBpZiAocG9zdCkge1xuICAgICAgICBjb25zdCBwb3N0UmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICBgJHtnZXRSZXBvcnRlck5hbWUoY3R4KX0gLT4gcG9zdGAsXG4gICAgICAgICAgaXNEZWJ1ZyxcbiAgICAgICAgKTtcbiAgICAgICAgbGV0IHBvc3RPcHRpb25zID0geyAuLi5wb3N0IH07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgcG9zdE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChwb3N0T3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBwYXJzZTFLZXlzLFxuICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuXG4gICAgICAgICAgLy8gcGFyc2UgaWYgb25seVxuICAgICAgICAgIHBvc3RPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QocG9zdE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAga2V5czogcGFyc2UyS2V5cyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgaWY6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgIGlmIChwb3N0T3B0aW9ucy5kZWJ1ZyB8fCBjdHgucHVibGljLm9wdGlvbnM/LmRlYnVnKSB7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIubGV2ZWwgPSBsb2cuTG9nTGV2ZWxzLkRFQlVHO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIXBvc3RPcHRpb25zLmlmKSB7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgYGJlY2F1c2UgaWYgY29uZGl0aW9uIGlzIGZhbHNlYCxcbiAgICAgICAgICAgICAgXCJTa2lwIHBvc3RcIixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcGFyc2Ugb25cbiAgICAgICAgICAvLyBpbnNlcnQgc3RlcCBlbnZcbiAgICAgICAgICBwb3N0T3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHBvc3RPcHRpb25zLCB7XG4gICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYy5lbnYsXG4gICAgICAgICAgICAgICAgLi4uYXdhaXQgZ2V0RW52KCksXG4gICAgICAgICAgICAgICAgLi4ucG9zdE9wdGlvbnMuZW52LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBrZXlzOiBwYXJzZTNGb3JTdGVwS2V5cyxcbiAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcbiAgICAgICAgICAvLyBnZXQgb3B0aW9uc1xuICAgICAgICAgIHBvc3RPcHRpb25zID0gZ2V0RmluYWxTb3VyY2VPcHRpb25zKFxuICAgICAgICAgICAgd29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgY2xpV29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgcG9zdE9wdGlvbnMsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBpc0RlYnVnID0gcG9zdE9wdGlvbnMuZGVidWcgfHwgZmFsc2U7XG5cbiAgICAgICAgICBwb3N0UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGBTdGFydCBydW4gcG9zdC5gLFxuICAgICAgICAgICk7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJ2N0eDInLGN0eCk7XG5cbiAgICAgICAgICBjdHggPSBhd2FpdCBydW5TdGVwKGN0eCwge1xuICAgICAgICAgICAgLi4ucG9zdE9wdGlvbnMsXG4gICAgICAgICAgICByZXBvcnRlcjogcG9zdFJlcG9ydGVyLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChwb3N0T3B0aW9ucy5jbWQpIHtcbiAgICAgICAgICAgIC8vIHBhcnNlIGNtZFxuICAgICAgICAgICAgcG9zdE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChwb3N0T3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IFtcImNtZFwiXSxcbiAgICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgICAgY29uc3QgY21kUmVzdWx0ID0gYXdhaXQgcnVuQ21kKGN0eCwgcG9zdE9wdGlvbnMuY21kIGFzIHN0cmluZyk7XG4gICAgICAgICAgICBjdHggPSBzZXRDbWRPa1Jlc3VsdChjdHgsIGNtZFJlc3VsdC5zdGRvdXQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHBvc3RSZXBvcnRlci5kZWJ1ZyhcbiAgICAgICAgICAgIGBGaW5pc2ggdG8gcnVuIHBvc3QuYCxcbiAgICAgICAgICApO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKHBvc3QuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBwb3N0YCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIud2FybmluZyhlKTtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICBgSWdub3JlIHRoaXMgZXJyb3IsIGJlY2F1c2UgY29udGludWVPbkVycm9yIGlzIHRydWUuYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBwb3N0YCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyB0aGlzIGl0ZW0gc3RlcHMgYWxsIG9rLCBhZGQgdW5pcXVlIGtleXMgdG8gdGhlIGludGVybmFsIHN0YXRlXG5cbiAgICAgICAgLy8gcnVuIGFzc2VydFxuICAgICAgICBpZiAocG9zdE9wdGlvbnMuYXNzZXJ0KSB7XG4gICAgICAgICAgYXdhaXQgcnVuQXNzZXJ0KGN0eCwge1xuICAgICAgICAgICAgcmVwb3J0ZXI6IHBvc3RSZXBvcnRlcixcbiAgICAgICAgICAgIC4uLnBvc3RPcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc3RPcHRpb25zLnBvc3QpIHtcbiAgICAgICAgICBhd2FpdCBydW5Qb3N0KGN0eCwge1xuICAgICAgICAgICAgcmVwb3J0ZXI6IHBvc3RSZXBvcnRlcixcbiAgICAgICAgICAgIC4uLnBvc3RPcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHBvc3RSZXBvcnRlci5pbmZvKFwiXCIsIFwiRmluaXNoIHJ1biBwb3N0IFwiKTtcblxuICAgICAgICAvLyBwYXJzZSBzbGVlcFxuICAgICAgICBwb3N0T3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHBvc3RPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICBrZXlzOiBbXCJzbGVlcFwiXSxcbiAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgIC8vIGNoZWNrIGlzIG5lZWQgc2xlZXBcbiAgICAgICAgaWYgKHBvc3RPcHRpb25zLnNsZWVwICYmIHBvc3RPcHRpb25zLnNsZWVwID4gMCkge1xuICAgICAgICAgIHBvc3RSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgYCR7cG9zdE9wdGlvbnMuc2xlZXB9IHNlY29uZHNgLFxuICAgICAgICAgICAgXCJTbGVlcFwiLFxuICAgICAgICAgICk7XG4gICAgICAgICAgYXdhaXQgZGVsYXkocG9zdE9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBzYXZlIHN0YXRlLCBpbnRlcm5hbFN0YXRlXG4gICAgICAvLyBjaGVjayBpcyBjaGFuZ2VkXG4gICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBKU09OLnN0cmluZ2lmeShjdHgucHVibGljLnN0YXRlKTtcbiAgICAgIC8vIGFkZCBzdWNjZXNzIGl0ZW1zIHVuaXF1ZUtleSB0byBpbnRlcm5hbCBTdGF0ZVxuXG4gICAgICBjb25zdCBjdXJyZW50SW50ZXJuYWxTdGF0ZSA9IEpTT04uc3RyaW5naWZ5KGN0eC5pbnRlcm5hbFN0YXRlKTtcbiAgICAgIGlmIChjdXJyZW50U3RhdGUgIT09IGN0eC5pbml0U3RhdGUpIHtcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhgU2F2ZSBzdGF0ZWApO1xuICAgICAgICBhd2FpdCBjdHguZGIhLnNldChcInN0YXRlXCIsIGN0eC5wdWJsaWMuc3RhdGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhgU2tpcCBzYXZlIHNhdGUsIGNhdXNlIG5vIGNoYW5nZSBoYXBwZW5lZGApO1xuICAgICAgfVxuICAgICAgaWYgKGN1cnJlbnRJbnRlcm5hbFN0YXRlICE9PSBjdHguaW5pdEludGVybmFsU3RhdGUpIHtcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhcbiAgICAgICAgICBgU2F2ZSBpbnRlcm5hbCBzdGF0ZWAsXG4gICAgICAgICk7XG4gICAgICAgIGF3YWl0IGN0eC5kYiEuc2V0KFwiaW50ZXJuYWxTdGF0ZVwiLCBjdHguaW50ZXJuYWxTdGF0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB3b3JrZmxvd1JlcG9ydGVyLmRlYnVnKFxuICAgICAgICAvLyAgIGBTa2lwIHNhdmUgaW50ZXJuYWwgc3RhdGUsIGNhdXNlIG5vIGNoYW5nZSBoYXBwZW5lZGAsXG4gICAgICAgIC8vICk7XG4gICAgICB9XG4gICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXG4gICAgICAgIGBgLFxuICAgICAgICBcIkZpbmlzaCB3b3JrZmxvd1wiLFxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB3b3JrZmxvd1JlcG9ydGVyLmVycm9yKFxuICAgICAgICBgRmFpbGVkIHRvIHJ1biB0aGlzIHdvcmtmbG93YCxcbiAgICAgICk7XG5cbiAgICAgIHdvcmtmbG93UmVwb3J0ZXIuZXJyb3IoZSk7XG4gICAgICBpZiAodmFsaWRXb3JrZmxvd3MubGVuZ3RoID4gd29ya2Zsb3dJbmRleCArIDEpIHtcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhcIndvcmtmbG93XCIsIFwiU3RhcnQgbmV4dCB3b3JrZmxvd1wiKTtcbiAgICAgIH1cbiAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgY3R4LFxuICAgICAgICBlcnJvcjogZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIlxcblwiKTtcbiAgfVxuICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICByZXBvcnQuZXJyb3IoXCJFcnJvciBkZXRhaWxzOlwiKTtcbiAgICBlcnJvcnMuZm9yRWFjaCgoZXJyb3IpID0+IHtcbiAgICAgIHJlcG9ydC5lcnJvcihcbiAgICAgICAgYFJ1biAke2dldFJlcG9ydGVyTmFtZShlcnJvci5jdHgpfSBmYWlsZWQsIGVycm9yOiBgLFxuICAgICAgKTtcbiAgICAgIHJlcG9ydC5lcnJvcihlcnJvci5lcnJvcik7XG4gICAgfSk7XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBydW4gdGhpcyB0aW1lYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UmVwb3J0ZXJOYW1lKGN0eDogQ29udGV4dCkge1xuICBjb25zdCByZWxhdGl2ZVBhdGggPSBjdHgucHVibGljLndvcmtmbG93UmVsYXRpdmVQYXRoO1xuICBjb25zdCBhYnNvbHV0ZVBhdGggPSBjdHgucHVibGljLndvcmtmbG93UGF0aDtcbiAgaWYgKHJlbGF0aXZlUGF0aC5zdGFydHNXaXRoKFwiLi5cIikpIHtcbiAgICByZXR1cm4gYWJzb2x1dGVQYXRoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZWxhdGl2ZVBhdGg7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFPQSxTQUFTLG1CQUFtQixRQUFRLGlCQUFpQixDQUFDO0FBQ3RELFNBQWtCLFFBQVEsUUFBUSx5QkFBeUIsQ0FBQztBQUM1RCxTQUFTLGFBQWEsUUFBUSxxQkFBcUIsQ0FBQztBQUNwRCxTQUFTLFVBQVUsUUFBUSxpQkFBaUIsQ0FBQztBQUM3QyxTQUFTLGdCQUFnQixRQUFRLG1CQUFtQixDQUFDO0FBQ3JELFNBQVMsUUFBUSxRQUFRLG1CQUFtQixDQUFDO0FBQzdDLFNBQVMsV0FBVyxRQUFRLG1CQUFtQixDQUFDO0FBQ2hELFNBQVMsWUFBWSxRQUFRLGlCQUFpQixDQUFDO0FBQy9DLFNBQVMsZUFBZSxFQUFFLE9BQU8sRUFBRSxjQUFjLFFBQVEsZUFBZSxDQUFDO0FBQ3pFLFNBQ0UsY0FBYyxFQUNkLHdCQUF3QixRQUNuQixtQ0FBbUMsQ0FBQztBQUMzQyxTQUNFLE1BQU0sRUFDTixLQUFLLEVBQ0wsT0FBTyxFQUNQLElBQUksRUFDSixHQUFHLEVBQ0gsUUFBUSxFQUNSLFFBQVEsUUFDSCxZQUFZLENBQUM7QUFDcEIsT0FBTyxNQUFNLElBQUksV0FBVyxRQUFRLGFBQWEsQ0FBQztBQUNsRCxTQUFTLEtBQUssUUFBUSxrQ0FBa0MsQ0FBQztBQUN6RCxTQUFTLGlCQUFpQixRQUFRLDBCQUEwQixDQUFDO0FBQzdELFNBQVMsZUFBZSxRQUFRLHdCQUF3QixDQUFDO0FBQ3pELFNBQVMsTUFBTSxFQUFFLGNBQWMsUUFBUSxjQUFjLENBQUM7QUFDdEQsU0FDRSxrQkFBa0IsRUFDbEIscUJBQXFCLEVBQ3JCLHVCQUF1QixRQUNsQixzQkFBc0IsQ0FBQztBQUM5QixTQUFTLE9BQU8sUUFBUSxl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