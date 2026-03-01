import { isEventRef } from "./types.js";
const ALLOWED_PATH_PREFIXES = ["form.values.", "ui."];
function isAllowedPath(path) {
    return ALLOWED_PATH_PREFIXES.some((p) => path.startsWith(p));
}
const SIDE_EFFECT_TYPES = new Set(["Toast", "Navigate", "ValidateForm", "CallDataSource", "SubmitForm"]);
export function createActionRunner(deps) {
    const { dispatch, getState, setValueActionCreator, validateAll, evalExpr, navigate, toast, telemetry, dataSourceClient, dataRequestStartedCreator, dataRequestSucceededCreator, dataRequestFailedCreator, dataSetByKeyCreator, applyFieldErrorsCreator, clearFieldErrorsCreator, setFormErrorCreator, setSubmittingCreator, buildSubmitRequest, } = deps;
    let requestCounter = 0;
    function makeEvalCtx() {
        const state = getState();
        return {
            get(path) {
                if (path.startsWith("form.")) {
                    return getByDotPath(state.engine.values, path);
                }
                if (path.startsWith("data.byKey.")) {
                    const key = path.slice("data.byKey.".length);
                    return state.engine.data?.byKey?.[key];
                }
                return undefined;
            },
        };
    }
    function resolveValue(value, ctx) {
        if (isEventRef(value)) {
            if (value.$event === "value")
                return ctx.eventPayload.value;
            if (value.$event === "checked")
                return ctx.eventPayload.checked;
            return undefined;
        }
        if (value != null && typeof value === "object" && "op" in value) {
            return evalExpr(value, makeEvalCtx());
        }
        return value;
    }
    function resolveStringOrExpr(val) {
        if (typeof val === "string")
            return val;
        const result = evalExpr(val, makeEvalCtx());
        return result != null ? String(result) : "";
    }
    async function runOne(action, ctx) {
        if (ctx.mode === "design" && SIDE_EFFECT_TYPES.has(action.type)) {
            return null;
        }
        telemetry?.onActionStart?.(action, ctx);
        try {
            switch (action.type) {
                case "SetValue": {
                    if (!isAllowedPath(action.path)) {
                        const err = {
                            actionType: "SetValue",
                            message: `Path "${action.path}" is not in the allowlist (${ALLOWED_PATH_PREFIXES.join(", ")})`,
                            nodeId: ctx.nodeId,
                        };
                        telemetry?.onActionError?.(action, ctx, err);
                        return err;
                    }
                    const val = resolveValue(action.value, ctx);
                    dispatch(setValueActionCreator({ path: action.path, value: val }));
                    break;
                }
                case "ValidateForm": {
                    validateAll?.();
                    break;
                }
                case "Toast": {
                    const message = resolveStringOrExpr(action.message);
                    toast?.({ message, severity: action.severity });
                    break;
                }
                case "Navigate": {
                    const to = resolveStringOrExpr(action.to);
                    navigate?.(to);
                    break;
                }
                case "Batch": {
                    const errors = await runMany(action.actions, ctx);
                    if (errors.length > 0)
                        return errors[0];
                    break;
                }
                case "If": {
                    const condResult = evalExpr(action.condition, makeEvalCtx());
                    const truthy = condResult !== undefined && condResult !== null && condResult !== false && condResult !== 0;
                    const branch = truthy ? action.then : action.else ?? [];
                    const errors = await runMany(branch, ctx);
                    if (errors.length > 0)
                        return errors[0];
                    break;
                }
                case "CallDataSource": {
                    if (!dataSourceClient) {
                        const err = {
                            actionType: "CallDataSource",
                            message: "No dataSourceClient configured",
                            nodeId: ctx.nodeId,
                        };
                        telemetry?.onActionError?.(action, ctx, err);
                        return err;
                    }
                    const requestId = action.requestKey ?? action.resultKey;
                    if (dataRequestStartedCreator) {
                        dispatch(dataRequestStartedCreator({ requestId, dataSourceId: action.dataSourceId }));
                    }
                    try {
                        const args = action.args ? evalExpr(action.args, makeEvalCtx()) : undefined;
                        const result = await dataSourceClient.execute({ dataSourceId: action.dataSourceId, args });
                        if (dataRequestSucceededCreator) {
                            dispatch(dataRequestSucceededCreator({ requestId, resultKey: action.resultKey, result }));
                        }
                    }
                    catch (e) {
                        const errorMsg = e instanceof Error ? e.message : String(e);
                        if (dataRequestFailedCreator) {
                            dispatch(dataRequestFailedCreator({ requestId, error: errorMsg }));
                        }
                        if (action.onError && action.onError.length > 0) {
                            await runMany(action.onError, ctx);
                        }
                        const err = {
                            actionType: "CallDataSource",
                            message: errorMsg,
                            nodeId: ctx.nodeId,
                            details: e,
                        };
                        telemetry?.onActionError?.(action, ctx, err);
                        return err;
                    }
                    break;
                }
                case "SubmitForm": {
                    if (!dataSourceClient || !buildSubmitRequest) {
                        const err = {
                            actionType: "SubmitForm",
                            message: "SubmitForm requires dataSourceClient and buildSubmitRequest",
                            nodeId: ctx.nodeId,
                        };
                        telemetry?.onActionError?.(action, ctx, err);
                        return err;
                    }
                    const resultKey = action.resultKey ?? "submit";
                    const requestId = action.requestKey ?? resultKey;
                    if (clearFieldErrorsCreator)
                        dispatch(clearFieldErrorsCreator());
                    if (setFormErrorCreator)
                        dispatch(setFormErrorCreator({ message: undefined }));
                    validateAll?.();
                    const stateAfterValidation = getState();
                    const errorsAfterValidation = stateAfterValidation.engine.errorsByPath;
                    const hasErrors = Object.keys(errorsAfterValidation).some((k) => errorsAfterValidation[k] && errorsAfterValidation[k].length > 0);
                    if (hasErrors) {
                        if (setFormErrorCreator)
                            dispatch(setFormErrorCreator({ message: "Please fix the errors above before submitting." }));
                        const err = {
                            actionType: "SubmitForm",
                            message: "Validation failed",
                            nodeId: ctx.nodeId,
                        };
                        telemetry?.onActionError?.(action, ctx, err);
                        return err;
                    }
                    const payload = buildSubmitRequest();
                    if (setSubmittingCreator)
                        dispatch(setSubmittingCreator(true));
                    if (dataRequestStartedCreator) {
                        dispatch(dataRequestStartedCreator({ requestId, dataSourceId: action.dataSourceId }));
                    }
                    try {
                        const result = await dataSourceClient.execute({ dataSourceId: action.dataSourceId, args: payload });
                        if (dataRequestSucceededCreator) {
                            dispatch(dataRequestSucceededCreator({ requestId, resultKey, result }));
                        }
                        if (setSubmittingCreator)
                            dispatch(setSubmittingCreator(false));
                        if (action.onSuccess && action.onSuccess.length > 0) {
                            await runMany(action.onSuccess, ctx);
                        }
                    }
                    catch (e) {
                        if (setSubmittingCreator)
                            dispatch(setSubmittingCreator(false));
                        const isDsErr = e != null && typeof e === "object" && "kind" in e;
                        const dsErr = isDsErr ? e : undefined;
                        const errorMsg = dsErr?.message ?? (e instanceof Error ? e.message : String(e));
                        if (dataRequestFailedCreator) {
                            dispatch(dataRequestFailedCreator({ requestId, error: errorMsg }));
                        }
                        if (dsErr?.kind === "validation" && dsErr.fieldErrors && applyFieldErrorsCreator) {
                            dispatch(applyFieldErrorsCreator({ fieldErrors: dsErr.fieldErrors }));
                        }
                        if (setFormErrorCreator) {
                            dispatch(setFormErrorCreator({ message: dsErr?.formError ?? errorMsg }));
                        }
                        if (action.onError && action.onError.length > 0) {
                            await runMany(action.onError, ctx);
                        }
                        const err = {
                            actionType: "SubmitForm",
                            message: errorMsg,
                            nodeId: ctx.nodeId,
                            details: e,
                        };
                        telemetry?.onActionError?.(action, ctx, err);
                        return err;
                    }
                    break;
                }
                case "SetData": {
                    if (!dataSetByKeyCreator) {
                        const err = {
                            actionType: "SetData",
                            message: "No dataSetByKeyCreator configured",
                            nodeId: ctx.nodeId,
                        };
                        telemetry?.onActionError?.(action, ctx, err);
                        return err;
                    }
                    const val = evalExpr(action.value, makeEvalCtx());
                    dispatch(dataSetByKeyCreator({ key: action.key, value: val }));
                    break;
                }
                default: {
                    const err = {
                        actionType: action.type,
                        message: `Unknown action type: ${action.type}`,
                        nodeId: ctx.nodeId,
                    };
                    telemetry?.onActionError?.(action, ctx, err);
                    return err;
                }
            }
            telemetry?.onActionEnd?.(action, ctx);
            return null;
        }
        catch (e) {
            const err = {
                actionType: action.type,
                message: e instanceof Error ? e.message : String(e),
                nodeId: ctx.nodeId,
                details: e,
            };
            telemetry?.onActionError?.(action, ctx, err);
            return err;
        }
    }
    async function runMany(actions, ctx) {
        const errors = [];
        for (const action of actions) {
            const err = await runOne(action, ctx);
            if (err)
                errors.push(err);
        }
        return errors;
    }
    return {
        async run(actions, ctx) {
            if (!actions || actions.length === 0)
                return [];
            return runMany(actions, ctx);
        },
    };
}
function getByDotPath(obj, path) {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
        if (cur == null || typeof cur !== "object")
            return undefined;
        cur = cur[p];
    }
    return cur;
}
