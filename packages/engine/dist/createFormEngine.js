import { configureStore, createListenerMiddleware, } from "@reduxjs/toolkit";
import { engineSlice, setUiState, setValue, initForm } from "./slice.js";
import { setByPath } from "./path.js";
import { buildEvalPlan } from "./plan.js";
import { extractValuePaths } from "./extract.js";
import { getByPath } from "./path.js";
import { evalAst } from "@ai-low-code/expr";
export function createFormEngine(formDoc, options = {}) {
    const { env = {}, onEvalCount, initialValues: userInitialValues } = options;
    const plan = buildEvalPlan(formDoc);
    const listenerMiddleware = createListenerMiddleware();
    const startAppListening = listenerMiddleware.startListening;
    startAppListening({
        predicate: (action) => action.type === setValue.type || action.type === initForm.type,
        effect: (action, listenerApi) => {
            const state = listenerApi.getState();
            const engineState = state.engine;
            const makeCtx = () => ({
                get: (path) => {
                    if (path.startsWith("form.values.")) {
                        return getByPath(engineState.values, path);
                    }
                    if (path.startsWith("env.")) {
                        const envPath = path.slice(4);
                        return getByPath(env, envPath);
                    }
                    return undefined;
                },
            });
            let impactedExprIds = new Set();
            if (action.type === initForm.type) {
                impactedExprIds = new Set(plan.targets.map((t) => t.exprId));
            }
            else if (action.type === setValue.type) {
                const path = action.payload.path;
                impactedExprIds = plan.depToExprIds.get(path) ?? new Set();
            }
            const visibleByNodeId = {};
            const disabledByNodeId = {};
            const ctx = makeCtx();
            for (const exprId of impactedExprIds) {
                const target = plan.exprIdToTarget.get(exprId);
                if (!target)
                    continue;
                onEvalCount?.(exprId);
                const result = evalAst(target.ast, ctx);
                const boolResult = Boolean(result !== undefined && result !== null && result !== false && result !== 0);
                if (target.kind === "visibility") {
                    const existing = visibleByNodeId[target.nodeId];
                    visibleByNodeId[target.nodeId] =
                        existing === undefined ? boolResult : existing && boolResult;
                }
                else {
                    const existing = disabledByNodeId[target.nodeId];
                    disabledByNodeId[target.nodeId] =
                        existing === undefined ? boolResult : existing || boolResult;
                }
            }
            if (Object.keys(visibleByNodeId).length > 0 || Object.keys(disabledByNodeId).length > 0) {
                listenerApi.dispatch(setUiState({ visibleByNodeId, disabledByNodeId }));
            }
        },
    });
    const store = configureStore({
        reducer: { engine: engineSlice.reducer },
        middleware: (getDefault) => getDefault().prepend(listenerMiddleware.middleware),
    });
    const paths = extractValuePaths(formDoc);
    const baseValues = {};
    for (const p of paths) {
        setByPath(baseValues, p, undefined);
    }
    const initialValues = userInitialValues
        ? mergeNested(baseValues, userInitialValues)
        : baseValues;
    store.dispatch(engineSlice.actions.initForm({
        formDoc,
        initialValues,
    }));
    function makeSelectValue(path) {
        return (state) => getByPath(state.engine.values, path);
    }
    const EMPTY_ERRORS = [];
    function makeSelectError(path) {
        return (state) => state.engine.errorsByPath[path] ?? EMPTY_ERRORS;
    }
    function makeSelectNodeVisible(nodeId) {
        return (state) => state.engine.ui.visibleByNodeId[nodeId] ?? true;
    }
    function makeSelectNodeDisabled(nodeId) {
        return (state) => state.engine.ui.disabledByNodeId[nodeId] ?? false;
    }
    function validateAll() {
        const state = store.getState().engine;
        const doc = state.formDoc;
        if (!doc)
            return;
        const errorsByPath = {};
        const ctx = {
            get: (path) => getByPath(state.values, path),
        };
        for (const node of Object.values(doc.nodes)) {
            const valuePath = node?.bindings?.value;
            if (typeof valuePath !== "string")
                continue;
            const value = getByPath(state.values, valuePath);
            const isEmpty = value === undefined ||
                value === null ||
                (typeof value === "string" && value.trim() === "");
            const nodeDisabled = state.ui.disabledByNodeId[node.id] ?? false;
            if (nodeDisabled)
                continue;
            const errs = [];
            for (const v of node.validation?.validators ?? []) {
                if (v.type === "required" && isEmpty) {
                    errs.push(v.message ?? "Required");
                }
            }
            const rules = doc.rules ?? [];
            for (const rule of rules) {
                if (rule.type !== "requiredIf" || rule.target !== valuePath)
                    continue;
                if (!rule.expr)
                    continue;
                const cond = evalAst(rule.expr, ctx);
                const whenTrue = Boolean(cond !== undefined && cond !== null && cond !== false && cond !== 0);
                if (whenTrue && isEmpty) {
                    errs.push("Required");
                }
            }
            if (errs.length > 0) {
                errorsByPath[valuePath] = errs;
            }
        }
        store.dispatch(engineSlice.actions.setErrors(errorsByPath));
    }
    function buildSubmitRequest() {
        const state = store.getState().engine;
        const doc = state.formDoc;
        if (!doc)
            return {};
        const ctx = {
            get: (path) => getByPath(state.values, path),
        };
        const result = {};
        const mapping = doc.submission?.mapping ?? [];
        for (const m of mapping) {
            if (m.policy === "transient")
                continue;
            if (m.includeIf) {
                const include = evalAst(m.includeIf, ctx);
                const shouldInclude = Boolean(include !== undefined && include !== null && include !== false && include !== 0);
                if (!shouldInclude)
                    continue;
            }
            const sourceValue = getByPath(state.values, m.sourcePath);
            setByPath(result, m.targetPath, sourceValue);
        }
        return result;
    }
    function mergeNested(base, override) {
        const result = { ...base };
        for (const k of Object.keys(override)) {
            const b = result[k];
            const o = override[k];
            if (o != null && typeof o === "object" && !Array.isArray(o) && b != null && typeof b === "object" && !Array.isArray(b)) {
                result[k] = mergeNested(b, o);
            }
            else {
                result[k] = o;
            }
        }
        return result;
    }
    return {
        store,
        actions: engineSlice.actions,
        selectors: {
            makeSelectValue,
            makeSelectError,
            makeSelectNodeVisible,
            makeSelectNodeDisabled,
        },
        validateAll,
        buildSubmitRequest,
    };
}
