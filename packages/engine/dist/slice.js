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
const initialState = {
    formDoc: null,
    values: {},
    touchedByPath: {},
    dirtyByPath: {},
    errorsByPath: {},
    ui: initialUi(),
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
    },
});
export const { initForm, setValue, setTouched, setErrors, setUiState, resetForm, } = engineSlice.actions;
