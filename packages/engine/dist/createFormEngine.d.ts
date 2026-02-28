import { configureStore } from "@reduxjs/toolkit";
import type { RootState } from "./store.types.js";
import { engineSlice } from "./slice.js";
import type { FormDoc } from "./types.js";
export interface CreateFormEngineOptions {
    env?: Record<string, unknown>;
    onEvalCount?: (exprId: string) => void;
    initialValues?: Record<string, unknown>;
}
export interface FormEngine {
    store: ReturnType<typeof configureStore>;
    actions: typeof engineSlice.actions;
    selectors: {
        makeSelectValue: (path: string) => (state: RootState) => unknown;
        makeSelectError: (path: string) => (state: RootState) => string[];
        makeSelectNodeVisible: (nodeId: string) => (state: RootState) => boolean;
        makeSelectNodeDisabled: (nodeId: string) => (state: RootState) => boolean;
    };
    validateAll: () => void;
    buildSubmitRequest: () => Record<string, unknown>;
}
export declare function createFormEngine(formDoc: FormDoc, options?: CreateFormEngineOptions): FormEngine;
//# sourceMappingURL=createFormEngine.d.ts.map