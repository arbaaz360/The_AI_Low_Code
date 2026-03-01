import { createSlice, } from "@reduxjs/toolkit";
import { setByPath } from "./path.js";
import { extractValuePaths } from "./extract.js";
const initialUi = () => ({
    visibleByNodeId: {},
    disabledByNodeId: {},
});
function buildInitialValues(paths) {
    const values = {};
    for (const path of paths) {
        setByPath(values, path, undefined);
    }
    return values;
}
const initialData = () => ({
    byKey: {},
    requests: {},
});
const initialState = {
    formDoc: null,
    values: {},
    touchedByPath: {},
    dirtyByPath: {},
    errorsByPath: {},
    ui: initialUi(),
    data: initialData(),
};
export const engineSlice = createSlice({
    name: "engine",
    initialState,
    reducers: {
        initForm: (state, action) => {
            const { formDoc, initialValues } = action.payload;
            state.formDoc = formDoc;
            const paths = extractValuePaths(formDoc);
            state.values = initialValues
                ? { ...buildInitialValues(paths), ...initialValues }
                : buildInitialValues(paths);
            state.touchedByPath = {};
            state.dirtyByPath = {};
            state.errorsByPath = {};
            state.ui = initialUi();
            state.data = initialData();
        },
        setValue: (state, action) => {
            const { path, value } = action.payload;
            setByPath(state.values, path, value);
            state.dirtyByPath[path] = true;
        },
        setTouched: (state, action) => {
            const { path, touched } = action.payload;
            state.touchedByPath[path] = touched;
        },
        setErrors: (state, action) => {
            state.errorsByPath = action.payload;
        },
        setUiState: (state, action) => {
            const { visibleByNodeId, disabledByNodeId } = action.payload;
            if (visibleByNodeId) {
                state.ui.visibleByNodeId = { ...state.ui.visibleByNodeId, ...visibleByNodeId };
            }
            if (disabledByNodeId) {
                state.ui.disabledByNodeId = { ...state.ui.disabledByNodeId, ...disabledByNodeId };
            }
        },
        resetForm: (state) => {
            const formDoc = state.formDoc;
            if (formDoc) {
                const paths = extractValuePaths(formDoc);
                state.values = buildInitialValues(paths);
            }
            else {
                state.values = {};
            }
            state.touchedByPath = {};
            state.dirtyByPath = {};
            state.errorsByPath = {};
            state.ui = initialUi();
        },
        dataRequestStarted: (state, action) => {
            const { requestId, dataSourceId } = action.payload;
            state.data.requests[requestId] = {
                requestId,
                dataSourceId,
                status: "loading",
                startedAt: Date.now(),
            };
        },
        dataRequestSucceeded: (state, action) => {
            const { requestId, resultKey, result } = action.payload;
            const req = state.data.requests[requestId];
            if (req) {
                req.status = "success";
                req.finishedAt = Date.now();
            }
            state.data.byKey[resultKey] = result;
        },
        dataRequestFailed: (state, action) => {
            const { requestId, error } = action.payload;
            const req = state.data.requests[requestId];
            if (req) {
                req.status = "error";
                req.finishedAt = Date.now();
                req.error = error;
            }
        },
        dataSetByKey: (state, action) => {
            state.data.byKey[action.payload.key] = action.payload.value;
        },
    },
});
export const { initForm, setValue, setTouched, setErrors, setUiState, resetForm, dataRequestStarted, dataRequestSucceeded, dataRequestFailed, dataSetByKey, } = engineSlice.actions;
