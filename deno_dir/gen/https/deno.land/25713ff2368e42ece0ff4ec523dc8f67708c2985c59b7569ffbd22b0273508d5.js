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
    "force"
];
const parse3ForStepKeys = [
    "id",
    "from",
    "use",
    "args"
];
const parse4ForSourceKeys = [
    "force",
    "itemsPath",
    "key",
    "limit",
    "reverse"
];
const parse6ForSourceKeys = [
    "filterFrom",
    "filterItemsFrom"
];
const parse7ForSourceKeys = [
    "cmd"
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
    const { files , content  } = cliWorkflowOptions;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvcnVuLXdvcmtmbG93cy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBGaWx0ZXJPcHRpb25zLFxuICBSdW5Xb3JrZmxvd09wdGlvbnMsXG4gIFNvdXJjZU9wdGlvbnMsXG4gIFN0ZXBPcHRpb25zLFxuICBXb3JrZmxvd09wdGlvbnMsXG59IGZyb20gXCIuL2ludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgaGFzUGVybWlzc2lvblNsaWVudCB9IGZyb20gXCIuL3Blcm1pc3Npb24udHNcIjtcbmltcG9ydCB7IENvbnRleHQsIFN0ZXBUeXBlIH0gZnJvbSBcIi4vaW50ZXJuYWwtaW50ZXJmYWNlLnRzXCI7XG5pbXBvcnQgeyBwYXJzZVdvcmtmbG93IH0gZnJvbSBcIi4vcGFyc2Utd29ya2Zsb3cudHNcIjtcbmltcG9ydCB7IGdldENvbnRlbnQgfSBmcm9tIFwiLi91dGlscy9maWxlLnRzXCI7XG5pbXBvcnQgeyBnZXRGaWxlc0J5RmlsdGVyIH0gZnJvbSBcIi4vdXRpbHMvZmlsdGVyLnRzXCI7XG5pbXBvcnQgeyBpc09iamVjdCB9IGZyb20gXCIuL3V0aWxzL29iamVjdC50c1wiO1xuaW1wb3J0IHsgcGFyc2VPYmplY3QgfSBmcm9tIFwiLi9wYXJzZS1vYmplY3QudHNcIjtcbmltcG9ydCB7IGlzUmVtb3RlUGF0aCB9IGZyb20gXCIuL3V0aWxzL3BhdGgudHNcIjtcbmltcG9ydCB7IGdldFN0ZXBSZXNwb25zZSwgcnVuU3RlcCwgc2V0RXJyb3JSZXN1bHQgfSBmcm9tIFwiLi9ydW4tc3RlcC50c1wiO1xuaW1wb3J0IHtcbiAgZmlsdGVyQ3R4SXRlbXMsXG4gIGdldFNvdXJjZUl0ZW1zRnJvbVJlc3VsdCxcbn0gZnJvbSBcIi4vZ2V0LXNvdXJjZS1pdGVtcy1mcm9tLXJlc3VsdC50c1wiO1xuaW1wb3J0IHtcbiAgY29uZmlnLFxuICBkZWxheSxcbiAgZGlybmFtZSxcbiAgam9pbixcbiAgbG9nLFxuICByZWxhdGl2ZSxcbiAgU3FsaXRlRGIsXG59IGZyb20gXCIuLi9kZXBzLnRzXCI7XG5pbXBvcnQgcmVwb3J0LCB7IGdldFJlcG9ydGVyIH0gZnJvbSBcIi4vcmVwb3J0LnRzXCI7XG5pbXBvcnQgeyBLZXlkYiB9IGZyb20gXCIuL2FkYXB0ZXJzL2pzb24tc3RvcmUtYWRhcHRlci50c1wiO1xuaW1wb3J0IHsgZmlsdGVyU291cmNlSXRlbXMgfSBmcm9tIFwiLi9maWx0ZXItc291cmNlLWl0ZW1zLnRzXCI7XG5pbXBvcnQgeyBtYXJrU291cmNlSXRlbXMgfSBmcm9tIFwiLi9tYXJrLXNvdXJjZS1pdGVtcy50c1wiO1xuaW1wb3J0IHsgcnVuQ21kLCBzZXRDbWRPa1Jlc3VsdCB9IGZyb20gXCIuL3J1bi1jbWQudHNcIjtcbmltcG9ydCB7XG4gIGdldEZpbmFsUnVuT3B0aW9ucyxcbiAgZ2V0RmluYWxTb3VyY2VPcHRpb25zLFxuICBnZXRGaW5hbFdvcmtmbG93T3B0aW9ucyxcbn0gZnJvbSBcIi4vZGVmYXVsdC1vcHRpb25zLnRzXCI7XG5pbXBvcnQgeyBydW5Qb3N0IH0gZnJvbSBcIi4vcnVuLXBvc3QudHNcIjtcbmltcG9ydCB7IHJ1bkFzc2VydCB9IGZyb20gXCIuL3J1bi1hc3NlcnQudHNcIjtcbmltcG9ydCB7IGdldEVudiB9IGZyb20gXCIuL3V0aWxzL2Vudi50c1wiO1xuXG5pbnRlcmZhY2UgVmFsaWRXb3JrZmxvdyB7XG4gIGN0eDogQ29udGV4dDtcbiAgd29ya2Zsb3c6IFdvcmtmbG93T3B0aW9ucztcbn1cblxuY29uc3QgcGFyc2UxS2V5cyA9IFtcImVudlwiXTtcbmNvbnN0IHBhcnNlMktleXMgPSBbXCJpZlwiLCBcImRlYnVnXCJdO1xuY29uc3QgcGFyc2UzRm9yR2VuZXJhbEtleXMgPSBbXG4gIFwiaWZcIixcbiAgXCJkZWJ1Z1wiLFxuICBcImRhdGFiYXNlXCIsXG4gIFwic2xlZXBcIixcbiAgXCJsaW1pdFwiLFxuICBcImZvcmNlXCIsXG5dO1xuY29uc3QgcGFyc2UzRm9yU3RlcEtleXMgPSBbXG4gIFwiaWRcIixcbiAgXCJmcm9tXCIsXG4gIFwidXNlXCIsXG4gIFwiYXJnc1wiLFxuXTtcbmNvbnN0IHBhcnNlNEZvclNvdXJjZUtleXMgPSBbXG4gIFwiZm9yY2VcIixcbiAgXCJpdGVtc1BhdGhcIixcbiAgXCJrZXlcIixcbiAgXCJsaW1pdFwiLFxuICBcInJldmVyc2VcIixcbl07XG5cbmNvbnN0IHBhcnNlNkZvclNvdXJjZUtleXMgPSBbXG4gIFwiZmlsdGVyRnJvbVwiLFxuICBcImZpbHRlckl0ZW1zRnJvbVwiLFxuXTtcbmNvbnN0IHBhcnNlN0ZvclNvdXJjZUtleXMgPSBbXG4gIFwiY21kXCIsXG5dO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuKHJ1bk9wdGlvbnM6IFJ1bldvcmtmbG93T3B0aW9ucykge1xuICBjb25zdCBkZWJ1Z0VudlBlcm1taXNpb24gPSB7IG5hbWU6IFwiZW52XCIsIHZhcmlhYmxlOiBcIkRFQlVHXCIgfSBhcyBjb25zdDtcbiAgY29uc3QgZGF0YVBlcm1pc3Npb24gPSB7IG5hbWU6IFwicmVhZFwiLCBwYXRoOiBcImRhdGFcIiB9IGFzIGNvbnN0O1xuICBsZXQgRGVidWdFbnZWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoZGVidWdFbnZQZXJtbWlzaW9uKSkge1xuICAgIERlYnVnRW52VmFsdWUgPSBEZW5vLmVudi5nZXQoXCJERUJVR1wiKTtcbiAgfVxuICBsZXQgaXNEZWJ1ZyA9ICEhKERlYnVnRW52VmFsdWUgIT09IHVuZGVmaW5lZCAmJiBEZWJ1Z0VudlZhbHVlICE9PSBcImZhbHNlXCIpO1xuXG4gIGNvbnN0IGNsaVdvcmtmbG93T3B0aW9ucyA9IGdldEZpbmFsUnVuT3B0aW9ucyhydW5PcHRpb25zLCBpc0RlYnVnKTtcbiAgaXNEZWJ1ZyA9IGNsaVdvcmtmbG93T3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcbiAgY29uc3Qge1xuICAgIGZpbGVzLFxuICAgIGNvbnRlbnQsXG4gIH0gPSBjbGlXb3JrZmxvd09wdGlvbnM7XG4gIGxldCB3b3JrZmxvd0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBjd2QgPSBEZW5vLmN3ZCgpO1xuICBpZiAoY29udGVudCkge1xuICAgIHdvcmtmbG93RmlsZXMgPSBbXTtcbiAgfSBlbHNlIHtcbiAgICB3b3JrZmxvd0ZpbGVzID0gYXdhaXQgZ2V0RmlsZXNCeUZpbHRlcihjd2QsIGZpbGVzKTtcbiAgfVxuXG4gIGxldCBlbnYgPSB7fTtcblxuICBjb25zdCBhbGxFbnZQZXJtbWlzaW9uID0geyBuYW1lOiBcImVudlwiIH0gYXMgY29uc3Q7XG5cbiAgLy8gZmlyc3QgdHJ5IHRvIGdldCAuZW52XG4gIGNvbnN0IGRvdEVudkZpbGVQZXJtbWlzaW9uID0ge1xuICAgIG5hbWU6IFwicmVhZFwiLFxuICAgIHBhdGg6IFwiLmVudiwuZW52LmRlZmF1bHRzLC5lbnYuZXhhbXBsZVwiLFxuICB9IGFzIGNvbnN0O1xuXG4gIGlmIChhd2FpdCBoYXNQZXJtaXNzaW9uU2xpZW50KGRvdEVudkZpbGVQZXJtbWlzaW9uKSkge1xuICAgIGVudiA9IGNvbmZpZygpO1xuICB9XG5cbiAgaWYgKGF3YWl0IGhhc1Blcm1pc3Npb25TbGllbnQoYWxsRW52UGVybW1pc2lvbikpIHtcbiAgICBlbnYgPSB7XG4gICAgICAuLi5lbnYsXG4gICAgICAuLi5EZW5vLmVudi50b09iamVjdCgpLFxuICAgIH07XG4gIH1cblxuICAvLyBnZXQgb3B0aW9uc1xuICBsZXQgdmFsaWRXb3JrZmxvd3M6IFZhbGlkV29ya2Zsb3dbXSA9IFtdO1xuXG4gIC8vIGlmIHN0ZGluXG5cbiAgaWYgKGNvbnRlbnQpIHtcbiAgICBjb25zdCB3b3JrZmxvdyA9IHBhcnNlV29ya2Zsb3coY29udGVudCk7XG5cbiAgICBpZiAoaXNPYmplY3Qod29ya2Zsb3cpKSB7XG4gICAgICBjb25zdCB3b3JrZmxvd0ZpbGVQYXRoID0gXCIvdG1wL2Rlbm9mbG93L3RtcC13b3JrZmxvdy55bWxcIjtcbiAgICAgIGNvbnN0IHdvcmtmbG93UmVsYXRpdmVQYXRoID0gcmVsYXRpdmUoY3dkLCB3b3JrZmxvd0ZpbGVQYXRoKTtcbiAgICAgIHZhbGlkV29ya2Zsb3dzLnB1c2goe1xuICAgICAgICBjdHg6IHtcbiAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgIGVudixcbiAgICAgICAgICAgIHdvcmtmbG93UGF0aDogd29ya2Zsb3dGaWxlUGF0aCxcbiAgICAgICAgICAgIHdvcmtmbG93UmVsYXRpdmVQYXRoLFxuICAgICAgICAgICAgd29ya2Zsb3dDd2Q6IGRpcm5hbWUod29ya2Zsb3dGaWxlUGF0aCksXG4gICAgICAgICAgICBjd2Q6IGN3ZCxcbiAgICAgICAgICAgIHNvdXJjZXM6IHt9LFxuICAgICAgICAgICAgc3RlcHM6IHt9LFxuICAgICAgICAgICAgc3RhdGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGl0ZW1Tb3VyY2VPcHRpb25zOiB1bmRlZmluZWQsXG4gICAgICAgICAgc291cmNlc09wdGlvbnM6IFtdLFxuICAgICAgICAgIGN1cnJlbnRTdGVwVHlwZTogU3RlcFR5cGUuU291cmNlLFxuICAgICAgICB9LFxuICAgICAgICB3b3JrZmxvdzogd29ya2Zsb3csXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3JrZmxvd0ZpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgd29ya2Zsb3dSZWxhdGl2ZVBhdGggPSB3b3JrZmxvd0ZpbGVzW2ldO1xuICAgIGxldCBmaWxlQ29udGVudCA9IFwiXCI7XG4gICAgbGV0IHdvcmtmbG93RmlsZVBhdGggPSBcIlwiO1xuICAgIGlmIChpc1JlbW90ZVBhdGgod29ya2Zsb3dSZWxhdGl2ZVBhdGgpKSB7XG4gICAgICBjb25zdCBuZXRDb250ZW50ID0gYXdhaXQgZmV0Y2god29ya2Zsb3dSZWxhdGl2ZVBhdGgpO1xuICAgICAgd29ya2Zsb3dGaWxlUGF0aCA9IHdvcmtmbG93UmVsYXRpdmVQYXRoO1xuICAgICAgZmlsZUNvbnRlbnQgPSBhd2FpdCBuZXRDb250ZW50LnRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd29ya2Zsb3dGaWxlUGF0aCA9IGpvaW4oY3dkLCB3b3JrZmxvd1JlbGF0aXZlUGF0aCk7XG4gICAgICBmaWxlQ29udGVudCA9IGF3YWl0IGdldENvbnRlbnQod29ya2Zsb3dGaWxlUGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBwYXJzZVdvcmtmbG93KGZpbGVDb250ZW50KTtcbiAgICBpZiAoIWlzT2JqZWN0KHdvcmtmbG93KSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFsaWRXb3JrZmxvd3MucHVzaCh7XG4gICAgICBjdHg6IHtcbiAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgZW52LFxuICAgICAgICAgIHdvcmtmbG93UGF0aDogd29ya2Zsb3dGaWxlUGF0aCxcbiAgICAgICAgICB3b3JrZmxvd1JlbGF0aXZlUGF0aDogd29ya2Zsb3dSZWxhdGl2ZVBhdGgsXG4gICAgICAgICAgd29ya2Zsb3dDd2Q6IGRpcm5hbWUod29ya2Zsb3dGaWxlUGF0aCksXG4gICAgICAgICAgY3dkOiBjd2QsXG4gICAgICAgICAgc291cmNlczoge30sXG4gICAgICAgICAgc3RlcHM6IHt9LFxuICAgICAgICAgIHN0YXRlOiB1bmRlZmluZWQsXG4gICAgICAgICAgaXRlbXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBpdGVtU291cmNlT3B0aW9uczogdW5kZWZpbmVkLFxuICAgICAgICBzb3VyY2VzT3B0aW9uczogW10sXG4gICAgICAgIGN1cnJlbnRTdGVwVHlwZTogU3RlcFR5cGUuU291cmNlLFxuICAgICAgfSxcbiAgICAgIHdvcmtmbG93OiB3b3JrZmxvdyxcbiAgICB9KTtcbiAgICAvLyBydW4gY29kZVxuICB9XG4gIC8vIHNvcnQgYnkgYWxwaGFiZXRcbiAgdmFsaWRXb3JrZmxvd3MgPSB2YWxpZFdvcmtmbG93cy5zb3J0KChhLCBiKSA9PiB7XG4gICAgY29uc3QgYVBhdGggPSBhLmN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgY29uc3QgYlBhdGggPSBiLmN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgaWYgKGFQYXRoIDwgYlBhdGgpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgaWYgKGFQYXRoID4gYlBhdGgpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSk7XG4gIHJlcG9ydC5pbmZvKFxuICAgIGAgJHt2YWxpZFdvcmtmbG93cy5sZW5ndGh9IHZhbGlkIHdvcmtmbG93czpcXG4ke1xuICAgICAgdmFsaWRXb3JrZmxvd3MubWFwKChpdGVtKSA9PiBnZXRSZXBvcnRlck5hbWUoaXRlbS5jdHgpKS5qb2luKFxuICAgICAgICBcIlxcblwiLFxuICAgICAgKVxuICAgIH1cXG5gLFxuICAgIFwiU3VjY2VzcyBmb3VuZFwiLFxuICApO1xuICAvLyBydW4gd29ya2Zsb3dzIHN0ZXAgYnkgc3RlcFxuICBmb3IgKFxuICAgIGxldCB3b3JrZmxvd0luZGV4ID0gMDtcbiAgICB3b3JrZmxvd0luZGV4IDwgdmFsaWRXb3JrZmxvd3MubGVuZ3RoO1xuICAgIHdvcmtmbG93SW5kZXgrK1xuICApIHtcbiAgICBsZXQgeyBjdHgsIHdvcmtmbG93IH0gPSB2YWxpZFdvcmtmbG93c1t3b3JrZmxvd0luZGV4XTtcbiAgICAvLyBwYXJzZSByb290IGVudiBmaXJzdFxuICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgIGNvbnN0IHBhcnNlZFdvcmtmbG93RmlsZU9wdGlvbnNXaXRoRW52ID0gYXdhaXQgcGFyc2VPYmplY3Qod29ya2Zsb3csIGN0eCwge1xuICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICB9KSBhcyBXb3JrZmxvd09wdGlvbnM7XG4gICAgLy8gcnVuIGVudlxuICAgIC8vIHBhcnNlIGVudiB0byBlbnZcbiAgICBpZiAocGFyc2VkV29ya2Zsb3dGaWxlT3B0aW9uc1dpdGhFbnYuZW52KSB7XG4gICAgICBmb3IgKGNvbnN0IGtleSBpbiBwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudi5lbnYpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJzZWRXb3JrZmxvd0ZpbGVPcHRpb25zV2l0aEVudi5lbnZba2V5XTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIGNvbnN0IGRlYnVnRW52UGVybW1pc2lvbiA9IHsgbmFtZTogXCJlbnZcIiwgdmFyaWFibGU6IGtleSB9IGFzIGNvbnN0O1xuICAgICAgICAgIGlmIChhd2FpdCBoYXNQZXJtaXNzaW9uU2xpZW50KGRlYnVnRW52UGVybW1pc2lvbikpIHtcbiAgICAgICAgICAgIERlbm8uZW52LnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBwYXJzZSBnZW5lcmFsIG9wdGlvbnNcblxuICAgIGNvbnN0IHBhcnNlZFdvcmtmbG93R2VuZXJhbE9wdGlvbnNXaXRoR2VuZXJhbCA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgcGFyc2VkV29ya2Zsb3dGaWxlT3B0aW9uc1dpdGhFbnYsXG4gICAgICBjdHgsXG4gICAgICB7XG4gICAgICAgIGtleXM6IHBhcnNlM0ZvckdlbmVyYWxLZXlzLFxuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgaWY6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICkgYXMgV29ya2Zsb3dPcHRpb25zO1xuXG4gICAgY29uc3Qgd29ya2Zsb3dPcHRpb25zID0gZ2V0RmluYWxXb3JrZmxvd09wdGlvbnMoXG4gICAgICBwYXJzZWRXb3JrZmxvd0dlbmVyYWxPcHRpb25zV2l0aEdlbmVyYWwgfHxcbiAgICAgICAge30sXG4gICAgICBjbGlXb3JrZmxvd09wdGlvbnMsXG4gICAgKTtcbiAgICBpc0RlYnVnID0gd29ya2Zsb3dPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuXG4gICAgY29uc3Qgd29ya2Zsb3dSZXBvcnRlciA9IGdldFJlcG9ydGVyKFxuICAgICAgYCR7Z2V0UmVwb3J0ZXJOYW1lKGN0eCl9YCxcbiAgICAgIGlzRGVidWcsXG4gICAgKTtcblxuICAgIC8vIGNoZWNrIGlmIG5lZWQgdG8gcnVuXG4gICAgaWYgKCF3b3JrZmxvd09wdGlvbnM/LmlmKSB7XG4gICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXG4gICAgICAgIGBiZWNhdXNlIGlmIGNvbmRpdGlvbiBpcyBmYWxzZWAsXG4gICAgICAgIFwiU2tpcCB3b3JrZmxvd1wiLFxuICAgICAgKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXG4gICAgICAgIGBgLFxuICAgICAgICBcIlN0YXJ0IGhhbmRsZSB3b3JrZmxvd1wiLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBtZXJnZSB0byBnZXQgZGVmYXVsdFxuICAgIGN0eC5wdWJsaWMub3B0aW9ucyA9IHdvcmtmbG93T3B0aW9ucztcblxuICAgIGNvbnN0IGRhdGFiYXNlID0gd29ya2Zsb3dPcHRpb25zLmRhdGFiYXNlIGFzIHN0cmluZztcbiAgICBsZXQgZGI7XG5cbiAgICBpZiAoZGF0YWJhc2U/LnN0YXJ0c1dpdGgoXCJzcWxpdGVcIikpIHtcbiAgICAgIGRiID0gbmV3IFNxbGl0ZURiKGRhdGFiYXNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IG5hbWVzcGFjZSA9IGN0eC5wdWJsaWMud29ya2Zsb3dSZWxhdGl2ZVBhdGg7XG4gICAgICBpZiAobmFtZXNwYWNlLnN0YXJ0c1dpdGgoXCIuLlwiKSkge1xuICAgICAgICAvLyB1c2UgYWJzb2x1dGUgcGF0aCBhcyBuYW1lc3BhY2VcbiAgICAgICAgbmFtZXNwYWNlID0gYEBkZW5vZmxvd1Jvb3Qke2N0eC5wdWJsaWMud29ya2Zsb3dQYXRofWA7XG4gICAgICB9XG5cbiAgICAgIGRiID0gbmV3IEtleWRiKGRhdGFiYXNlLCB7XG4gICAgICAgIG5hbWVzcGFjZTogbmFtZXNwYWNlLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGN0eC5kYiA9IGRiO1xuICAgIC8vIGNoZWNrIHBlcm1pc3Npb25cbiAgICAvLyB1bmlxdWUga2V5XG4gICAgbGV0IHN0YXRlO1xuICAgIGxldCBpbnRlcm5hbFN0YXRlID0ge1xuICAgICAga2V5czogW10sXG4gICAgfTtcbiAgICBpZiAoYXdhaXQgaGFzUGVybWlzc2lvblNsaWVudChkYXRhUGVybWlzc2lvbikpIHtcbiAgICAgIHN0YXRlID0gYXdhaXQgZGIuZ2V0KFwic3RhdGVcIikgfHwgdW5kZWZpbmVkO1xuICAgICAgaW50ZXJuYWxTdGF0ZSA9IGF3YWl0IGRiLmdldChcImludGVybmFsU3RhdGVcIikgfHwge1xuICAgICAgICBrZXlzOiBbXSxcbiAgICAgIH07XG4gICAgfVxuICAgIGN0eC5wdWJsaWMuc3RhdGUgPSBzdGF0ZTtcbiAgICBjdHguaW50ZXJuYWxTdGF0ZSA9IGludGVybmFsU3RhdGU7XG4gICAgY3R4LmluaXRTdGF0ZSA9IEpTT04uc3RyaW5naWZ5KHN0YXRlKTtcbiAgICBjdHguaW5pdEludGVybmFsU3RhdGUgPSBKU09OLnN0cmluZ2lmeShpbnRlcm5hbFN0YXRlKTtcblxuICAgIGNvbnN0IHNvdXJjZXMgPSB3b3JrZmxvdy5zb3VyY2VzO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmIChzb3VyY2VzKSB7XG4gICAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcIlwiLCBcIlN0YXJ0IGdldCBzb3VyY2VzXCIpO1xuICAgICAgICBmb3IgKGxldCBzb3VyY2VJbmRleCA9IDA7IHNvdXJjZUluZGV4IDwgc291cmNlcy5sZW5ndGg7IHNvdXJjZUluZGV4KyspIHtcbiAgICAgICAgICBjb25zdCBzb3VyY2UgPSBzb3VyY2VzW3NvdXJjZUluZGV4XTtcbiAgICAgICAgICBjdHgucHVibGljLnNvdXJjZUluZGV4ID0gc291cmNlSW5kZXg7XG4gICAgICAgICAgY29uc3Qgc291cmNlUmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBzb3VyY2U6JHtjdHgucHVibGljLnNvdXJjZUluZGV4fWAsXG4gICAgICAgICAgICBpc0RlYnVnLFxuICAgICAgICAgICk7XG4gICAgICAgICAgbGV0IHNvdXJjZU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAuLi5zb3VyY2UsXG4gICAgICAgICAgfTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlLCBjdHgsIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICAgICAgICAgIH0pIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIHBhcnNlIGlmIG9ubHlcbiAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChcbiAgICAgICAgICAgICAgc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgY3R4LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5czogcGFyc2UyS2V5cyxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgICAgICBpZjogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgKSBhcyBTb3VyY2VPcHRpb25zO1xuXG4gICAgICAgICAgICAvLyBzZXQgbG9nIGxldmVsXG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucz8uZGVidWcgfHwgY3R4LnB1YmxpYy5vcHRpb25zPy5kZWJ1Zykge1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci5sZXZlbCA9IGxvZy5Mb2dMZXZlbHMuREVCVUc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIG5lZWQgdG8gcnVuXG4gICAgICAgICAgICBpZiAoIXNvdXJjZU9wdGlvbnMuaWYpIHtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICAgIFwiU2tpcCBzb3VyY2VcIixcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcGFyc2Ugb25cbiAgICAgICAgICAgIC8vIGluc2VydCBzdGVwIGVudlxuICAgICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KFxuICAgICAgICAgICAgICBzb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgICAgIHB1YmxpYzoge1xuICAgICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgICAgIGVudjoge1xuICAgICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLmVudixcbiAgICAgICAgICAgICAgICAgICAgLi4uYXdhaXQgZ2V0RW52KCksXG4gICAgICAgICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMuZW52LFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAga2V5czogcGFyc2UzRm9yU3RlcEtleXMsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICApIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAgIC8vIGdldCBvcHRpb25zXG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gZ2V0RmluYWxTb3VyY2VPcHRpb25zKFxuICAgICAgICAgICAgICB3b3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICAgIGNsaVdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlzRGVidWcgPSBzb3VyY2VPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBjaGVjayBpZlxuICAgICAgICAgICAgaWYgKCFzb3VyY2VPcHRpb25zLmlmKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMucmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5lcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRSZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuY21kQ29kZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRPayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuaXNSZWFsT2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLmlkKSB7XG4gICAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZU9wdGlvbnMuaWRdID1cbiAgICAgICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2VJbmRleF07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBydW4gc291cmNlXG4gICAgICAgICAgICBjdHggPSBhd2FpdCBydW5TdGVwKGN0eCwge1xuICAgICAgICAgICAgICByZXBvcnRlcjogc291cmNlUmVwb3J0ZXIsXG4gICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gcGFyc2U0XG4gICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlNEZvclNvdXJjZUtleXMsXG4gICAgICAgICAgICB9KSBhcyBTb3VyY2VPcHRpb25zO1xuXG4gICAgICAgICAgICAvLyBnZXQgc291cmNlIGl0ZW1zIGJ5IGl0ZW1zUGF0aCwga2V5XG4gICAgICAgICAgICBjdHggPSBhd2FpdCBnZXRTb3VyY2VJdGVtc0Zyb21SZXN1bHQoY3R4LCB7XG4gICAgICAgICAgICAgIC4uLnNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBwYXJzZTZcblxuICAgICAgICAgICAgc291cmNlT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHNvdXJjZU9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICBrZXlzOiBwYXJzZTZGb3JTb3VyY2VLZXlzLFxuICAgICAgICAgICAgfSkgYXMgU291cmNlT3B0aW9ucztcbiAgICAgICAgICAgIC8vIHJ1biB1c2VyIGZpbHRlciwgZmlsdGVyIGZyb20sIGZpbHRlckl0ZW1zLCBmaWx0ZXJJdGVtc0Zyb20sIG9ubHkgYWxsb3cgb25lLlxuICAgICAgICAgICAgY3R4ID0gYXdhaXQgZmlsdGVyU291cmNlSXRlbXMoY3R4LCB7XG4gICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc291cmNlT3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBydW4gY21kXG5cbiAgICAgICAgICAgIGlmIChzb3VyY2VPcHRpb25zLmNtZCkge1xuICAgICAgICAgICAgICBzb3VyY2VPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc291cmNlT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgICAga2V5czogcGFyc2U3Rm9yU291cmNlS2V5cyxcbiAgICAgICAgICAgICAgfSkgYXMgU291cmNlT3B0aW9ucztcbiAgICAgICAgICAgICAgY29uc3QgY21kUmVzdWx0ID0gYXdhaXQgcnVuQ21kKGN0eCwgc291cmNlT3B0aW9ucy5jbWQgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgICAgY3R4ID0gc2V0Q21kT2tSZXN1bHQoY3R4LCBjbWRSZXN1bHQuc3Rkb3V0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gbWFyayBzb3VyY2UgaXRlbXMsIGFkZCB1bmlxdWUga2V5IGFuZCBzb3VyY2UgaW5kZXggdG8gaXRlbXNcbiAgICAgICAgICAgIGN0eCA9IG1hcmtTb3VyY2VJdGVtcyhjdHgsIHNvdXJjZU9wdGlvbnMpO1xuICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XSA9IGdldFN0ZXBSZXNwb25zZShjdHgpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuaWQpIHtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZU9wdGlvbnMuaWRdID1cbiAgICAgICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBydW4gYXNzZXJ0XG4gICAgICAgICAgICBpZiAoc291cmNlT3B0aW9ucy5hc3NlcnQpIHtcbiAgICAgICAgICAgICAgY3R4ID0gYXdhaXQgcnVuQXNzZXJ0KGN0eCwge1xuICAgICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgICAgICAuLi5zb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjdHgucHVibGljLml0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgLy8gcnVuIHBvc3RcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBcIlwiLFxuICAgICAgICAgICAgICAgIGBTb3VyY2UgJHtzb3VyY2VJbmRleH0gZ2V0ICR7Y3R4LnB1YmxpYy5pdGVtcy5sZW5ndGh9IGl0ZW1zYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMucG9zdCkge1xuICAgICAgICAgICAgICBhd2FpdCBydW5Qb3N0KGN0eCwge1xuICAgICAgICAgICAgICAgIHJlcG9ydGVyOiBzb3VyY2VSZXBvcnRlcixcbiAgICAgICAgICAgICAgICAuLi5zb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN0eC5zb3VyY2VzT3B0aW9ucy5wdXNoKHNvdXJjZU9wdGlvbnMpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGN0eCA9IHNldEVycm9yUmVzdWx0KGN0eCwgZSk7XG4gICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZXNbc291cmNlSW5kZXhdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICBpZiAoc291cmNlLmlkKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1tzb3VyY2UuaWRdID0gY3R4LnB1YmxpYy5zb3VyY2VzW3NvdXJjZUluZGV4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzb3VyY2UuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgICBzb3VyY2VSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICAgIGBGYWlsZWQgcnVuIHNvdXJjZWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLndhcm5pbmcoZSk7XG4gICAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgICAgYElnbm9yZSB0aGlzIGVycm9yLCBiZWNhdXNlIGNvbnRpbnVlT25FcnJvciBpcyB0cnVlLmAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc291cmNlUmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYEZhaWxlZCBydW4gc291cmNlYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcGFyc2UgOCBzbGVlcFxuICAgICAgICAgIHNvdXJjZU9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzb3VyY2VPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICAgIGtleXM6IFtcInNsZWVwXCJdLFxuICAgICAgICAgIH0pIGFzIFNvdXJjZU9wdGlvbnM7XG5cbiAgICAgICAgICAvLyBjaGVjayBpcyBuZWVkIHNsZWVwXG4gICAgICAgICAgaWYgKHNvdXJjZU9wdGlvbnMuc2xlZXAgJiYgc291cmNlT3B0aW9ucy5zbGVlcCA+IDApIHtcbiAgICAgICAgICAgIHNvdXJjZVJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICAgIGAke3NvdXJjZU9wdGlvbnMuc2xlZXB9IHNlY29uZHNgLFxuICAgICAgICAgICAgICBcIlNsZWVwXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYXdhaXQgZGVsYXkoc291cmNlT3B0aW9ucy5zbGVlcCAqIDEwMDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBpbnNlcnQgbmV3IGN0eC5pdGVtc1xuICAgICAgaWYgKHNvdXJjZXMpIHtcbiAgICAgICAgbGV0IGNvbGxlY3RDdHhJdGVtczogdW5rbm93bltdID0gW107XG4gICAgICAgIHNvdXJjZXMuZm9yRWFjaCgoXywgdGhlU291cmNlSW5kZXgpID0+IHtcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjdHgucHVibGljLnNvdXJjZXNbdGhlU291cmNlSW5kZXhdLnJlc3VsdCkpIHtcbiAgICAgICAgICAgIGNvbGxlY3RDdHhJdGVtcyA9IGNvbGxlY3RDdHhJdGVtcy5jb25jYXQoXG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlc1t0aGVTb3VyY2VJbmRleF0ucmVzdWx0LFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjdHgucHVibGljLml0ZW1zID0gY29sbGVjdEN0eEl0ZW1zO1xuICAgICAgICBpZiAoY3R4LnB1YmxpYy5pdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgYFRvdGFsICR7Y3R4LnB1YmxpYy5pdGVtcy5sZW5ndGh9IGl0ZW1zYCxcbiAgICAgICAgICAgIFwiRmluaXNoIGdldCBzb3VyY2VzXCIsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBpZiBpdGVtcyA+MCwgdGhlbiBjb250aW51ZVxuICAgICAgaWYgKChjdHgucHVibGljLml0ZW1zIGFzIHVua25vd25bXSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIG5vIG5lZWQgdG8gaGFuZGxlIHN0ZXBzXG4gICAgICAgIHdvcmtmbG93UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICBgYmVjYXVzZSBubyBhbnkgdmFsaWQgc291cmNlcyBpdGVtcyByZXR1cm5lZGAsXG4gICAgICAgICAgXCJTa2lwIHdvcmtmbG93XCIsXG4gICAgICAgICk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBydW4gZmlsdGVyXG4gICAgICBjb25zdCBmaWx0ZXIgPSB3b3JrZmxvdy5maWx0ZXI7XG4gICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgIGN0eC5jdXJyZW50U3RlcFR5cGUgPSBTdGVwVHlwZS5GaWx0ZXI7XG4gICAgICAgIGNvbnN0IGZpbHRlclJlcG9ydGVyID0gZ2V0UmVwb3J0ZXIoXG4gICAgICAgICAgYCR7Z2V0UmVwb3J0ZXJOYW1lKGN0eCl9IC0+IGZpbHRlcmAsXG4gICAgICAgICAgaXNEZWJ1ZyxcbiAgICAgICAgKTtcbiAgICAgICAgbGV0IGZpbHRlck9wdGlvbnMgPSB7IC4uLmZpbHRlciB9O1xuICAgICAgICBsZXQgaWZGaWx0ZXIgPSB0cnVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChmaWx0ZXIsIGN0eCwge1xuICAgICAgICAgICAga2V5czogcGFyc2UxS2V5cyxcbiAgICAgICAgICB9KSBhcyBGaWx0ZXJPcHRpb25zO1xuXG4gICAgICAgICAgLy8gcGFyc2UgaWYgZGVidWcgb25seVxuICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChcbiAgICAgICAgICAgIGZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICBjdHgsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlMktleXMsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICBpZjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgKSBhcyBGaWx0ZXJPcHRpb25zO1xuXG4gICAgICAgICAgLy8gc2V0IGxvZyBsZXZlbFxuICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zPy5kZWJ1ZyB8fCBjdHgucHVibGljLm9wdGlvbnM/LmRlYnVnKSB7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5sZXZlbCA9IGxvZy5Mb2dMZXZlbHMuREVCVUc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gY2hlY2sgaWYgbmVlZCB0byBydW5cbiAgICAgICAgICBpZiAoIWZpbHRlck9wdGlvbnMuaWYpIHtcbiAgICAgICAgICAgIGlmRmlsdGVyID0gZmFsc2U7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICBcIlNraXAgZmlsdGVyXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBwYXJzZSBvblxuICAgICAgICAgICAgLy8gaW5zZXJ0IHN0ZXAgZW52XG4gICAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoXG4gICAgICAgICAgICAgIGZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgICAgICAuLi5hd2FpdCBnZXRFbnYoKSxcbiAgICAgICAgICAgICAgICAgICAgLi4uZmlsdGVyT3B0aW9ucy5lbnYsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXlzOiBwYXJzZTNGb3JTdGVwS2V5cyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICkgYXMgRmlsdGVyT3B0aW9ucztcblxuICAgICAgICAgICAgLy8gZ2V0IG9wdGlvbnNcbiAgICAgICAgICAgIGZpbHRlck9wdGlvbnMgPSBnZXRGaW5hbFNvdXJjZU9wdGlvbnMoXG4gICAgICAgICAgICAgIHdvcmtmbG93T3B0aW9ucyxcbiAgICAgICAgICAgICAgY2xpV29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgICBmaWx0ZXJPcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlzRGVidWcgPSBmaWx0ZXJPcHRpb25zLmRlYnVnIHx8IGZhbHNlO1xuICAgICAgICAgICAgaWYgKCFmaWx0ZXJPcHRpb25zLmlmKSB7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIuaW5mbyhcIlwiLCBcIlN0YXJ0IGhhbmRsZSBmaWx0ZXJcIik7XG4gICAgICAgICAgICAvLyBydW4gRmlsdGVyXG4gICAgICAgICAgICBjdHggPSBhd2FpdCBydW5TdGVwKGN0eCwge1xuICAgICAgICAgICAgICByZXBvcnRlcjogZmlsdGVyUmVwb3J0ZXIsXG4gICAgICAgICAgICAgIC4uLmZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgQXJyYXkuaXNBcnJheShjdHgucHVibGljLnJlc3VsdCkgJiZcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5yZXN1bHQubGVuZ3RoID09PSBjdHgucHVibGljLml0ZW1zLmxlbmd0aFxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbXMgPSBjdHgucHVibGljLml0ZW1zLmZpbHRlcigoX2l0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICEhKChjdHgucHVibGljLnJlc3VsdCBhcyBib29sZWFuW10pW2luZGV4XSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBjdHgucHVibGljLnJlc3VsdCA9IGN0eC5wdWJsaWMuaXRlbXM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZpbHRlck9wdGlvbnMucnVuIHx8IGZpbHRlck9wdGlvbnMudXNlKSB7XG4gICAgICAgICAgICAgIC8vIGlmIHJ1biBvciB1c2UsIHRoZW4gcmVzdWx0IG11c3QgYmUgYXJyYXlcbiAgICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyIHNjcmlwdGAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIC8vIGludmFsaWQgcmVzdWx0XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBcIkludmFsaWQgZmlsdGVyIHN0ZXAgcmVzdWx0LCByZXN1bHQgbXVzdCBiZSBhcnJheSAsIGJvb2xlYW5bXSwgd2hpY2ggYXJyYXkgbGVuZ3RoIG11c3QgYmUgZXF1YWwgdG8gY3R4Lml0ZW1zIGxlbmd0aFwiLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZmlsdGVyT3B0aW9ucy5jbWQpIHtcbiAgICAgICAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KGZpbHRlck9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICAgIGtleXM6IFtcImNtZFwiXSxcbiAgICAgICAgICAgICAgfSkgYXMgRmlsdGVyT3B0aW9ucztcbiAgICAgICAgICAgICAgY29uc3QgY21kUmVzdWx0ID0gYXdhaXQgcnVuQ21kKGN0eCwgZmlsdGVyT3B0aW9ucy5jbWQgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgICAgY3R4ID0gc2V0Q21kT2tSZXN1bHQoY3R4LCBjbWRSZXN1bHQuc3Rkb3V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN0eC5wdWJsaWMuZmlsdGVyID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICAvLyBwYXJzZSBsaW1pdFxuICAgICAgICAgICAgZmlsdGVyT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KGZpbHRlck9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAgICBrZXlzOiBbXCJsaW1pdFwiXSxcbiAgICAgICAgICAgIH0pIGFzIEZpbHRlck9wdGlvbnM7XG4gICAgICAgICAgICAvLyBydW4gZmlsdGVyXG4gICAgICAgICAgICBjdHggPSBmaWx0ZXJDdHhJdGVtcyhjdHgsIHtcbiAgICAgICAgICAgICAgLi4uZmlsdGVyT3B0aW9ucyxcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIHJ1biBhc3NlcnRcbiAgICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLmFzc2VydCkge1xuICAgICAgICAgICAgICBjdHggPSBhd2FpdCBydW5Bc3NlcnQoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgICAgICAgIC4uLmZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBydW4gcG9zdFxuXG4gICAgICAgICAgICBpZiAoZmlsdGVyT3B0aW9ucy5wb3N0KSB7XG4gICAgICAgICAgICAgIGF3YWl0IHJ1blBvc3QoY3R4LCB7XG4gICAgICAgICAgICAgICAgcmVwb3J0ZXI6IGZpbHRlclJlcG9ydGVyLFxuICAgICAgICAgICAgICAgIC4uLmZpbHRlck9wdGlvbnMsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGN0eCA9IHNldEVycm9yUmVzdWx0KGN0eCwgZSk7XG4gICAgICAgICAgY3R4LnB1YmxpYy5maWx0ZXIgPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcblxuICAgICAgICAgIGlmIChmaWx0ZXIuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIGZpbHRlcmAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgZmlsdGVyUmVwb3J0ZXIud2FybmluZyhlKTtcbiAgICAgICAgICAgIGZpbHRlclJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICAgIGBJZ25vcmUgdGhpcyBlcnJvciwgYmVjYXVzZSBjb250aW51ZU9uRXJyb3IgaXMgdHJ1ZS5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVyYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpZkZpbHRlcikge1xuICAgICAgICAgIGZpbHRlclJlcG9ydGVyLmluZm8oXG4gICAgICAgICAgICBgVG90YWwgJHtjdHgucHVibGljLml0ZW1zLmxlbmd0aH0gaXRlbXNgLFxuICAgICAgICAgICAgXCJGaW5pc2ggaGFuZGxlIGZpbHRlclwiLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICAvLyBjaGVjayBpcyBuZWVkIHNsZWVwXG4gICAgICAgICAgLy8gcGFyc2Ugc2xlZXBcbiAgICAgICAgICBmaWx0ZXJPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QoZmlsdGVyT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBbXCJzbGVlcFwiXSxcbiAgICAgICAgICB9KSBhcyBGaWx0ZXJPcHRpb25zO1xuICAgICAgICAgIGlmIChmaWx0ZXJPcHRpb25zLnNsZWVwICYmIGZpbHRlck9wdGlvbnMuc2xlZXAgPiAwKSB7XG4gICAgICAgICAgICBmaWx0ZXJSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgICBgJHtmaWx0ZXJPcHRpb25zLnNsZWVwfSBzZWNvbmRzYCxcbiAgICAgICAgICAgICAgXCJTbGVlcFwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGF3YWl0IGRlbGF5KGZpbHRlck9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY3R4LmN1cnJlbnRTdGVwVHlwZSA9IFN0ZXBUeXBlLlN0ZXA7XG5cbiAgICAgIGZvciAoXG4gICAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICAgIGluZGV4IDwgKGN0eC5wdWJsaWMuaXRlbXMgYXMgdW5rbm93bltdKS5sZW5ndGg7XG4gICAgICAgIGluZGV4KytcbiAgICAgICkge1xuICAgICAgICBjdHgucHVibGljLml0ZW1JbmRleCA9IGluZGV4O1xuICAgICAgICBjdHgucHVibGljLml0ZW0gPSAoY3R4LnB1YmxpYy5pdGVtcyBhcyB1bmtub3duW10pW2luZGV4XTtcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KSAmJlxuICAgICAgICAgIChjdHgucHVibGljLml0ZW0gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbXCJAZGVub2Zsb3dLZXlcIl1cbiAgICAgICAgKSB7XG4gICAgICAgICAgY3R4LnB1YmxpYy5pdGVtS2V5ID1cbiAgICAgICAgICAgIChjdHgucHVibGljLml0ZW0gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbXCJAZGVub2Zsb3dLZXlcIl07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoY3R4LnB1YmxpYy5pdGVtKSkge1xuICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbUtleSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB3b3JrZmxvd1JlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgICAgICBgQ2FuIG5vdCBmb3VuZCBpbnRlcm5hbCBpdGVtIGtleSBcXGBAZGVub2Zsb3dLZXlcXGAsIG1heWJlIHlvdSBjaGFuZ2VkIHRoZSBpdGVtIGZvcm1hdC4gTWlzc2luZyB0aGlzIGtleSwgZGVub2Zsb3cgY2FuIG5vdCBzdG9yZSB0aGUgdW5pcXVlIGtleSBzdGF0ZS4gRml4IHRoaXMsIFRyeSBub3QgY2hhbmdlIHRoZSByZWZlcmVuY2UgaXRlbSwgb25seSBjaGFuZ2UgdGhlIHByb3BlcnR5IHlvdSBuZWVkIHRvIGNoYW5nZS4gVHJ5IHRvIG1hbnVhbCBhZGRpbmcgYSBcXGBAZGVub2Zsb3dLZXlcXGAgYXMgaXRlbSB1bmlxdWUga2V5LmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjdHgucHVibGljLml0ZW1LZXkgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXG4gICAgICAgICAgKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KSAmJlxuICAgICAgICAgICgoKGN0eC5wdWJsaWMuaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KVtcbiAgICAgICAgICAgICAgXCJAZGVub2Zsb3dTb3VyY2VJbmRleFwiXG4gICAgICAgICAgICBdKSBhcyBudW1iZXIpID49IDBcbiAgICAgICAgKSB7XG4gICAgICAgICAgY3R4LnB1YmxpYy5pdGVtU291cmNlSW5kZXggPVxuICAgICAgICAgICAgKChjdHgucHVibGljLml0ZW0gYXMgUmVjb3JkPHN0cmluZywgbnVtYmVyPilbXG4gICAgICAgICAgICAgIFwiQGRlbm9mbG93U291cmNlSW5kZXhcIlxuICAgICAgICAgICAgXSkgYXMgbnVtYmVyO1xuICAgICAgICAgIGN0eC5pdGVtU291cmNlT3B0aW9ucyA9XG4gICAgICAgICAgICBjdHguc291cmNlc09wdGlvbnNbY3R4LnB1YmxpYy5pdGVtU291cmNlSW5kZXhdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGN0eC5wdWJsaWMuaXRlbSkpIHtcbiAgICAgICAgICBjdHguaXRlbVNvdXJjZU9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgd29ya2Zsb3dSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgYENhbiBub3QgZm91bmQgaW50ZXJuYWwgaXRlbSBrZXkgXFxgQGRlbm9mbG93U291cmNlSW5kZXhcXGAsIG1heWJlIHlvdSBjaGFuZ2VkIHRoZSBpdGVtIGZvcm1hdC4gVHJ5IG5vdCBjaGFuZ2UgdGhlIHJlZmVyZW5jZSBpdGVtLCBvbmx5IGNoYW5nZSB0aGUgcHJvcGVydHkgeW91IG5lZWQgdG8gY2hhbmdlLiBUcnkgdG8gbWFudWFsIGFkZGluZyBhIFxcYEBkZW5vZmxvd0tleVxcYCBhcyBpdGVtIHVuaXF1ZSBrZXkuYCxcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN0eC5pdGVtU291cmNlT3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGl0ZW1SZXBvcnRlciA9IGdldFJlcG9ydGVyKFxuICAgICAgICAgIGAke2dldFJlcG9ydGVyTmFtZShjdHgpfSAtPiBpdGVtOiR7aW5kZXh9YCxcbiAgICAgICAgICBpc0RlYnVnLFxuICAgICAgICApO1xuICAgICAgICBpZiAoY3R4LnB1YmxpYy5vcHRpb25zPy5kZWJ1Zykge1xuICAgICAgICAgIGl0ZW1SZXBvcnRlci5sZXZlbCA9IGxvZy5Mb2dMZXZlbHMuREVCVUc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXdvcmtmbG93LnN0ZXBzKSB7XG4gICAgICAgICAgd29ya2Zsb3cuc3RlcHMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGBgLFxuICAgICAgICAgICAgXCJTdGFydCBydW4gc3RlcHNcIixcbiAgICAgICAgICApO1xuICAgICAgICAgIGl0ZW1SZXBvcnRlci5kZWJ1ZyhgJHtKU09OLnN0cmluZ2lmeShjdHgucHVibGljLml0ZW0sIG51bGwsIDIpfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB3b3JrZmxvdy5zdGVwcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGNvbnN0IHN0ZXAgPSB3b3JrZmxvdy5zdGVwc1tqXTtcbiAgICAgICAgICBjdHgucHVibGljLnN0ZXBJbmRleCA9IGo7XG4gICAgICAgICAgY29uc3Qgc3RlcFJlcG9ydGVyID0gZ2V0UmVwb3J0ZXIoXG4gICAgICAgICAgICBgJHtnZXRSZXBvcnRlck5hbWUoY3R4KX0gLT4gc3RlcDoke2N0eC5wdWJsaWMuc3RlcEluZGV4fWAsXG4gICAgICAgICAgICBpc0RlYnVnLFxuICAgICAgICAgICk7XG4gICAgICAgICAgbGV0IHN0ZXBPcHRpb25zID0geyAuLi5zdGVwIH07XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIHBhcnNlIGVudiBmaXJzdFxuICAgICAgICAgICAgc3RlcE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzdGVwT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlMUtleXMsXG4gICAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcblxuICAgICAgICAgICAgLy8gcGFyc2UgaWYgb25seVxuICAgICAgICAgICAgc3RlcE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzdGVwT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IHBhcnNlMktleXMsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICBpZjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgICAgaWYgKHN0ZXBPcHRpb25zLmRlYnVnIHx8IGN0eC5wdWJsaWMub3B0aW9ucz8uZGVidWcpIHtcbiAgICAgICAgICAgICAgc3RlcFJlcG9ydGVyLmxldmVsID0gbG9nLkxvZ0xldmVscy5ERUJVRztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwic3RlcE9wdGlvbnMxXCIsIHN0ZXBPcHRpb25zKTtcblxuICAgICAgICAgICAgaWYgKCFzdGVwT3B0aW9ucy5pZikge1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBgYmVjYXVzZSBpZiBjb25kaXRpb24gaXMgZmFsc2VgLFxuICAgICAgICAgICAgICAgIFwiU2tpcCBzdGVwXCIsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBwYXJzZSBvblxuICAgICAgICAgICAgLy8gaW5zZXJ0IHN0ZXAgZW52XG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHN0ZXBPcHRpb25zLCB7XG4gICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgICAgLi4uYXdhaXQgZ2V0RW52KCksXG4gICAgICAgICAgICAgICAgICAuLi5zdGVwT3B0aW9ucy5lbnYsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAga2V5czogcGFyc2UzRm9yU3RlcEtleXMsXG4gICAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICBpZjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJzdGVwT3B0aW9uczIuNVwiLCBzdGVwT3B0aW9ucyk7XG5cbiAgICAgICAgICAgIC8vIGdldCBvcHRpb25zXG4gICAgICAgICAgICBzdGVwT3B0aW9ucyA9IGdldEZpbmFsU291cmNlT3B0aW9ucyhcbiAgICAgICAgICAgICAgd29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgICBjbGlXb3JrZmxvd09wdGlvbnMsXG4gICAgICAgICAgICAgIHN0ZXBPcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlzRGVidWcgPSBzdGVwT3B0aW9ucy5kZWJ1ZyB8fCBmYWxzZTtcblxuICAgICAgICAgICAgc3RlcFJlcG9ydGVyLmRlYnVnKFxuICAgICAgICAgICAgICBgU3RhcnQgcnVuIHRoaXMgc3RlcC5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdjdHgyJyxjdHgpO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJzdGVwT3B0aW9uczJcIiwgc3RlcE9wdGlvbnMpO1xuXG4gICAgICAgICAgICBpZiAoIXN0ZXBPcHRpb25zLmlmKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMucmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5lcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRSZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuY21kQ29kZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgY3R4LnB1YmxpYy5jbWRPayA9IHRydWU7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuaXNSZWFsT2sgPSB0cnVlO1xuICAgICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW2pdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG4gICAgICAgICAgICAgIGlmIChzdGVwLmlkKSB7XG4gICAgICAgICAgICAgICAgY3R4LnB1YmxpYy5zdGVwc1tzdGVwLmlkXSA9IGN0eC5wdWJsaWMuc3RlcHNbal07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN0eCA9IGF3YWl0IHJ1blN0ZXAoY3R4LCB7XG4gICAgICAgICAgICAgIC4uLnN0ZXBPcHRpb25zLFxuICAgICAgICAgICAgICByZXBvcnRlcjogc3RlcFJlcG9ydGVyLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMuY21kKSB7XG4gICAgICAgICAgICAgIC8vIHBhcnNlIGNtZFxuXG4gICAgICAgICAgICAgIHN0ZXBPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3Qoc3RlcE9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICAgICAgcHVibGljOiB7XG4gICAgICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMuZW52LFxuICAgICAgICAgICAgICAgICAgICAuLi5hd2FpdCBnZXRFbnYoKSxcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMuZW52LFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAga2V5czogW1wiY21kXCJdLFxuICAgICAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcbiAgICAgICAgICAgICAgY29uc3QgY21kUmVzdWx0ID0gYXdhaXQgcnVuQ21kKGN0eCwgc3RlcE9wdGlvbnMuY21kIGFzIHN0cmluZyk7XG4gICAgICAgICAgICAgIGN0eCA9IHNldENtZE9rUmVzdWx0KGN0eCwgY21kUmVzdWx0LnN0ZG91dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbal0gPSBnZXRTdGVwUmVzcG9uc2UoY3R4KTtcbiAgICAgICAgICAgIGlmIChzdGVwLmlkKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbc3RlcC5pZF0gPSBjdHgucHVibGljLnN0ZXBzW2pdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdGVwUmVwb3J0ZXIuZGVidWcoXG4gICAgICAgICAgICAgIGBGaW5pc2ggdG8gcnVuIHRoaXMgc3RlcC5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjdHgucHVibGljLnN0ZXBzW2pdID0gZ2V0U3RlcFJlc3BvbnNlKGN0eCk7XG5cbiAgICAgICAgICAgIGlmIChzdGVwLmlkKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc3RlcHNbc3RlcC5pZF0gPSBjdHgucHVibGljLnN0ZXBzW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0ZXAuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMub2sgPSB0cnVlO1xuICAgICAgICAgICAgICBzdGVwUmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBzdGVwYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgc3RlcFJlcG9ydGVyLndhcm5pbmcoZSk7XG4gICAgICAgICAgICAgIHN0ZXBSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICAgIGBJZ25vcmUgdGhpcyBlcnJvciwgYmVjYXVzZSBjb250aW51ZU9uRXJyb3IgaXMgdHJ1ZS5gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHN0ZXBSZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBzdGVwYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gdGhpcyBpdGVtIHN0ZXBzIGFsbCBvaywgYWRkIHVuaXF1ZSBrZXlzIHRvIHRoZSBpbnRlcm5hbCBzdGF0ZVxuXG4gICAgICAgICAgLy8gcnVuIGFzc2VydFxuICAgICAgICAgIGlmIChzdGVwT3B0aW9ucy5hc3NlcnQpIHtcbiAgICAgICAgICAgIGF3YWl0IHJ1bkFzc2VydChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHN0ZXBSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMucG9zdCkge1xuICAgICAgICAgICAgYXdhaXQgcnVuUG9zdChjdHgsIHtcbiAgICAgICAgICAgICAgcmVwb3J0ZXI6IHN0ZXBSZXBvcnRlcixcbiAgICAgICAgICAgICAgLi4uc3RlcE9wdGlvbnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RlcFJlcG9ydGVyLmluZm8oXCJcIiwgXCJGaW5pc2ggcnVuIHN0ZXAgXCIgKyBqKTtcblxuICAgICAgICAgIC8vIHBhcnNlIHNsZWVwXG4gICAgICAgICAgc3RlcE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChzdGVwT3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBbXCJzbGVlcFwiXSxcbiAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcblxuICAgICAgICAgIC8vIGNoZWNrIGlzIG5lZWQgc2xlZXBcbiAgICAgICAgICBpZiAoc3RlcE9wdGlvbnMuc2xlZXAgJiYgc3RlcE9wdGlvbnMuc2xlZXAgPiAwKSB7XG4gICAgICAgICAgICBzdGVwUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgYCR7c3RlcE9wdGlvbnMuc2xlZXB9IHNlY29uZHNgLFxuICAgICAgICAgICAgICBcIlNsZWVwXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYXdhaXQgZGVsYXkoc3RlcE9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2hlY2sgaXMgIWZvcmNlXG4gICAgICAgIC8vIGdldCBpdGVtIHNvdXJjZSBvcHRpb25zXG4gICAgICAgIGlmIChjdHguaXRlbVNvdXJjZU9wdGlvbnMgJiYgIWN0eC5pdGVtU291cmNlT3B0aW9ucy5mb3JjZSkge1xuICAgICAgICAgIGlmICghY3R4LmludGVybmFsU3RhdGUgfHwgIWN0eC5pbnRlcm5hbFN0YXRlLmtleXMpIHtcbiAgICAgICAgICAgIGN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGN0eC5wdWJsaWMuaXRlbUtleSAmJlxuICAgICAgICAgICAgIWN0eC5pbnRlcm5hbFN0YXRlIS5rZXlzLmluY2x1ZGVzKGN0eC5wdWJsaWMuaXRlbUtleSEpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBjdHguaW50ZXJuYWxTdGF0ZSEua2V5cy51bnNoaWZ0KGN0eC5wdWJsaWMuaXRlbUtleSEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBvbmx5IHNhdmUgMTAwMCBpdGVtcyBmb3Igc2F2ZSBtZW1vcnlcbiAgICAgICAgICBpZiAoY3R4LmludGVybmFsU3RhdGUhLmtleXMubGVuZ3RoID4gMTAwMCkge1xuICAgICAgICAgICAgY3R4LmludGVybmFsU3RhdGUhLmtleXMgPSBjdHguaW50ZXJuYWxTdGF0ZSEua2V5cy5zbGljZSgwLCAxMDAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdvcmtmbG93LnN0ZXBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBpdGVtUmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGBgLFxuICAgICAgICAgICAgYEZpbmlzaCBydW4gc3RlcHNgLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gcnVuIHBvc3Qgc3RlcFxuICAgICAgY29uc3QgcG9zdCA9IHdvcmtmbG93LnBvc3Q7XG4gICAgICBpZiAocG9zdCkge1xuICAgICAgICBjb25zdCBwb3N0UmVwb3J0ZXIgPSBnZXRSZXBvcnRlcihcbiAgICAgICAgICBgJHtnZXRSZXBvcnRlck5hbWUoY3R4KX0gLT4gcG9zdGAsXG4gICAgICAgICAgaXNEZWJ1ZyxcbiAgICAgICAgKTtcbiAgICAgICAgbGV0IHBvc3RPcHRpb25zID0geyAuLi5wb3N0IH07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gcGFyc2UgZW52IGZpcnN0XG4gICAgICAgICAgcG9zdE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChwb3N0T3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICBrZXlzOiBwYXJzZTFLZXlzLFxuICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuXG4gICAgICAgICAgLy8gcGFyc2UgaWYgb25seVxuICAgICAgICAgIHBvc3RPcHRpb25zID0gYXdhaXQgcGFyc2VPYmplY3QocG9zdE9wdGlvbnMsIGN0eCwge1xuICAgICAgICAgICAga2V5czogcGFyc2UyS2V5cyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgaWY6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgIGlmIChwb3N0T3B0aW9ucy5kZWJ1ZyB8fCBjdHgucHVibGljLm9wdGlvbnM/LmRlYnVnKSB7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIubGV2ZWwgPSBsb2cuTG9nTGV2ZWxzLkRFQlVHO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIXBvc3RPcHRpb25zLmlmKSB7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgICAgYGJlY2F1c2UgaWYgY29uZGl0aW9uIGlzIGZhbHNlYCxcbiAgICAgICAgICAgICAgXCJTa2lwIHBvc3RcIixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gcGFyc2Ugb25cbiAgICAgICAgICAvLyBpbnNlcnQgc3RlcCBlbnZcbiAgICAgICAgICBwb3N0T3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHBvc3RPcHRpb25zLCB7XG4gICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYy5lbnYsXG4gICAgICAgICAgICAgICAgLi4uYXdhaXQgZ2V0RW52KCksXG4gICAgICAgICAgICAgICAgLi4ucG9zdE9wdGlvbnMuZW52LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBrZXlzOiBwYXJzZTNGb3JTdGVwS2V5cyxcbiAgICAgICAgICB9KSBhcyBTdGVwT3B0aW9ucztcbiAgICAgICAgICAvLyBnZXQgb3B0aW9uc1xuICAgICAgICAgIHBvc3RPcHRpb25zID0gZ2V0RmluYWxTb3VyY2VPcHRpb25zKFxuICAgICAgICAgICAgd29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgY2xpV29ya2Zsb3dPcHRpb25zLFxuICAgICAgICAgICAgcG9zdE9wdGlvbnMsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBpc0RlYnVnID0gcG9zdE9wdGlvbnMuZGVidWcgfHwgZmFsc2U7XG5cbiAgICAgICAgICBwb3N0UmVwb3J0ZXIuaW5mbyhcbiAgICAgICAgICAgIGBTdGFydCBydW4gcG9zdC5gLFxuICAgICAgICAgICk7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJ2N0eDInLGN0eCk7XG5cbiAgICAgICAgICBjdHggPSBhd2FpdCBydW5TdGVwKGN0eCwge1xuICAgICAgICAgICAgLi4ucG9zdE9wdGlvbnMsXG4gICAgICAgICAgICByZXBvcnRlcjogcG9zdFJlcG9ydGVyLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChwb3N0T3B0aW9ucy5jbWQpIHtcbiAgICAgICAgICAgIC8vIHBhcnNlIGNtZFxuICAgICAgICAgICAgcG9zdE9wdGlvbnMgPSBhd2FpdCBwYXJzZU9iamVjdChwb3N0T3B0aW9ucywgY3R4LCB7XG4gICAgICAgICAgICAgIGtleXM6IFtcImNtZFwiXSxcbiAgICAgICAgICAgIH0pIGFzIFN0ZXBPcHRpb25zO1xuICAgICAgICAgICAgY29uc3QgY21kUmVzdWx0ID0gYXdhaXQgcnVuQ21kKGN0eCwgcG9zdE9wdGlvbnMuY21kIGFzIHN0cmluZyk7XG4gICAgICAgICAgICBjdHggPSBzZXRDbWRPa1Jlc3VsdChjdHgsIGNtZFJlc3VsdC5zdGRvdXQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHBvc3RSZXBvcnRlci5kZWJ1ZyhcbiAgICAgICAgICAgIGBGaW5pc2ggdG8gcnVuIHBvc3QuYCxcbiAgICAgICAgICApO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKHBvc3QuY29udGludWVPbkVycm9yKSB7XG4gICAgICAgICAgICBjdHgucHVibGljLm9rID0gdHJ1ZTtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBwb3N0YCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBwb3N0UmVwb3J0ZXIud2FybmluZyhlKTtcbiAgICAgICAgICAgIHBvc3RSZXBvcnRlci53YXJuaW5nKFxuICAgICAgICAgICAgICBgSWdub3JlIHRoaXMgZXJyb3IsIGJlY2F1c2UgY29udGludWVPbkVycm9yIGlzIHRydWUuYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcG9zdFJlcG9ydGVyLmVycm9yKFxuICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBwb3N0YCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyB0aGlzIGl0ZW0gc3RlcHMgYWxsIG9rLCBhZGQgdW5pcXVlIGtleXMgdG8gdGhlIGludGVybmFsIHN0YXRlXG5cbiAgICAgICAgLy8gcnVuIGFzc2VydFxuICAgICAgICBpZiAocG9zdE9wdGlvbnMuYXNzZXJ0KSB7XG4gICAgICAgICAgYXdhaXQgcnVuQXNzZXJ0KGN0eCwge1xuICAgICAgICAgICAgcmVwb3J0ZXI6IHBvc3RSZXBvcnRlcixcbiAgICAgICAgICAgIC4uLnBvc3RPcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc3RPcHRpb25zLnBvc3QpIHtcbiAgICAgICAgICBhd2FpdCBydW5Qb3N0KGN0eCwge1xuICAgICAgICAgICAgcmVwb3J0ZXI6IHBvc3RSZXBvcnRlcixcbiAgICAgICAgICAgIC4uLnBvc3RPcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHBvc3RSZXBvcnRlci5pbmZvKFwiXCIsIFwiRmluaXNoIHJ1biBwb3N0IFwiKTtcblxuICAgICAgICAvLyBwYXJzZSBzbGVlcFxuICAgICAgICBwb3N0T3B0aW9ucyA9IGF3YWl0IHBhcnNlT2JqZWN0KHBvc3RPcHRpb25zLCBjdHgsIHtcbiAgICAgICAgICBrZXlzOiBbXCJzbGVlcFwiXSxcbiAgICAgICAgfSkgYXMgU3RlcE9wdGlvbnM7XG4gICAgICAgIC8vIGNoZWNrIGlzIG5lZWQgc2xlZXBcbiAgICAgICAgaWYgKHBvc3RPcHRpb25zLnNsZWVwICYmIHBvc3RPcHRpb25zLnNsZWVwID4gMCkge1xuICAgICAgICAgIHBvc3RSZXBvcnRlci5pbmZvKFxuICAgICAgICAgICAgYCR7cG9zdE9wdGlvbnMuc2xlZXB9IHNlY29uZHNgLFxuICAgICAgICAgICAgXCJTbGVlcFwiLFxuICAgICAgICAgICk7XG4gICAgICAgICAgYXdhaXQgZGVsYXkocG9zdE9wdGlvbnMuc2xlZXAgKiAxMDAwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBzYXZlIHN0YXRlLCBpbnRlcm5hbFN0YXRlXG4gICAgICAvLyBjaGVjayBpcyBjaGFuZ2VkXG4gICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBKU09OLnN0cmluZ2lmeShjdHgucHVibGljLnN0YXRlKTtcbiAgICAgIC8vIGFkZCBzdWNjZXNzIGl0ZW1zIHVuaXF1ZUtleSB0byBpbnRlcm5hbCBTdGF0ZVxuXG4gICAgICBjb25zdCBjdXJyZW50SW50ZXJuYWxTdGF0ZSA9IEpTT04uc3RyaW5naWZ5KGN0eC5pbnRlcm5hbFN0YXRlKTtcbiAgICAgIGlmIChjdXJyZW50U3RhdGUgIT09IGN0eC5pbml0U3RhdGUpIHtcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhgU2F2ZSBzdGF0ZWApO1xuICAgICAgICBhd2FpdCBjdHguZGIhLnNldChcInN0YXRlXCIsIGN0eC5wdWJsaWMuc3RhdGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhgU2tpcCBzYXZlIHNhdGUsIGNhdXNlIG5vIGNoYW5nZSBoYXBwZW5lZGApO1xuICAgICAgfVxuICAgICAgaWYgKGN1cnJlbnRJbnRlcm5hbFN0YXRlICE9PSBjdHguaW5pdEludGVybmFsU3RhdGUpIHtcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhcbiAgICAgICAgICBgU2F2ZSBpbnRlcm5hbCBzdGF0ZWAsXG4gICAgICAgICk7XG4gICAgICAgIGF3YWl0IGN0eC5kYiEuc2V0KFwiaW50ZXJuYWxTdGF0ZVwiLCBjdHguaW50ZXJuYWxTdGF0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB3b3JrZmxvd1JlcG9ydGVyLmRlYnVnKFxuICAgICAgICAvLyAgIGBTa2lwIHNhdmUgaW50ZXJuYWwgc3RhdGUsIGNhdXNlIG5vIGNoYW5nZSBoYXBwZW5lZGAsXG4gICAgICAgIC8vICk7XG4gICAgICB9XG4gICAgICB3b3JrZmxvd1JlcG9ydGVyLmluZm8oXG4gICAgICAgIGBgLFxuICAgICAgICBcIkZpbmlzaCB3b3JrZmxvd1wiLFxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB3b3JrZmxvd1JlcG9ydGVyLmVycm9yKFxuICAgICAgICBgRmFpbGVkIHRvIHJ1biB0aGlzIHdvcmtmbG93YCxcbiAgICAgICk7XG5cbiAgICAgIHdvcmtmbG93UmVwb3J0ZXIuZXJyb3IoZSk7XG4gICAgICBpZiAodmFsaWRXb3JrZmxvd3MubGVuZ3RoID4gd29ya2Zsb3dJbmRleCArIDEpIHtcbiAgICAgICAgd29ya2Zsb3dSZXBvcnRlci5kZWJ1ZyhcIndvcmtmbG93XCIsIFwiU3RhcnQgbmV4dCB3b3JrZmxvd1wiKTtcbiAgICAgIH1cbiAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgY3R4LFxuICAgICAgICBlcnJvcjogZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIlxcblwiKTtcbiAgfVxuICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICByZXBvcnQuZXJyb3IoXCJFcnJvciBkZXRhaWxzOlwiKTtcbiAgICBlcnJvcnMuZm9yRWFjaCgoZXJyb3IpID0+IHtcbiAgICAgIHJlcG9ydC5lcnJvcihcbiAgICAgICAgYFJ1biAke2dldFJlcG9ydGVyTmFtZShlcnJvci5jdHgpfSBmYWlsZWQsIGVycm9yOiBgLFxuICAgICAgKTtcbiAgICAgIHJlcG9ydC5lcnJvcihlcnJvci5lcnJvcik7XG4gICAgfSk7XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBydW4gdGhpcyB0aW1lYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UmVwb3J0ZXJOYW1lKGN0eDogQ29udGV4dCkge1xuICBjb25zdCByZWxhdGl2ZVBhdGggPSBjdHgucHVibGljLndvcmtmbG93UmVsYXRpdmVQYXRoO1xuICBjb25zdCBhYnNvbHV0ZVBhdGggPSBjdHgucHVibGljLndvcmtmbG93UGF0aDtcbiAgaWYgKHJlbGF0aXZlUGF0aC5zdGFydHNXaXRoKFwiLi5cIikpIHtcbiAgICByZXR1cm4gYWJzb2x1dGVQYXRoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZWxhdGl2ZVBhdGg7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFPQSxTQUFTLG1CQUFtQixRQUFRLGtCQUFrQjtBQUN0RCxTQUFrQixRQUFRLFFBQVEsMEJBQTBCO0FBQzVELFNBQVMsYUFBYSxRQUFRLHNCQUFzQjtBQUNwRCxTQUFTLFVBQVUsUUFBUSxrQkFBa0I7QUFDN0MsU0FBUyxnQkFBZ0IsUUFBUSxvQkFBb0I7QUFDckQsU0FBUyxRQUFRLFFBQVEsb0JBQW9CO0FBQzdDLFNBQVMsV0FBVyxRQUFRLG9CQUFvQjtBQUNoRCxTQUFTLFlBQVksUUFBUSxrQkFBa0I7QUFDL0MsU0FBUyxlQUFlLEVBQUUsT0FBTyxFQUFFLGNBQWMsUUFBUSxnQkFBZ0I7QUFDekUsU0FDRSxjQUFjLEVBQ2Qsd0JBQXdCLFFBQ25CLG9DQUFvQztBQUMzQyxTQUNFLE1BQU0sRUFDTixLQUFLLEVBQ0wsT0FBTyxFQUNQLElBQUksRUFDSixHQUFHLEVBQ0gsUUFBUSxFQUNSLFFBQVEsUUFDSCxhQUFhO0FBQ3BCLE9BQU8sVUFBVSxXQUFXLFFBQVEsY0FBYztBQUNsRCxTQUFTLEtBQUssUUFBUSxtQ0FBbUM7QUFDekQsU0FBUyxpQkFBaUIsUUFBUSwyQkFBMkI7QUFDN0QsU0FBUyxlQUFlLFFBQVEseUJBQXlCO0FBQ3pELFNBQVMsTUFBTSxFQUFFLGNBQWMsUUFBUSxlQUFlO0FBQ3RELFNBQ0Usa0JBQWtCLEVBQ2xCLHFCQUFxQixFQUNyQix1QkFBdUIsUUFDbEIsdUJBQXVCO0FBQzlCLFNBQVMsT0FBTyxRQUFRLGdCQUFnQjtBQUN4QyxTQUFTLFNBQVMsUUFBUSxrQkFBa0I7QUFDNUMsU0FBUyxNQUFNLFFBQVEsaUJBQWlCO0FBT3hDLE1BQU0sYUFBYTtJQUFDO0NBQU07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