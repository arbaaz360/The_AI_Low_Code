import { type PayloadAction, type Draft } from "@reduxjs/toolkit";
import type { FormDoc } from "./types.js";
export interface DataRequest {
    requestId: string;
    dataSourceId: string;
    status: "idle" | "loading" | "success" | "error";
    startedAt: number;
    finishedAt?: number;
    error?: string;
}
export interface EngineState {
    formDoc: FormDoc | null;
    /** Nested object for form.values.* */
    values: Record<string, unknown>;
    touchedByPath: Record<string, boolean>;
    dirtyByPath: Record<string, boolean>;
    errorsByPath: Record<string, string[]>;
    ui: {
        visibleByNodeId: Record<string, boolean>;
        disabledByNodeId: Record<string, boolean>;
    };
    data: {
        byKey: Record<string, unknown>;
        requests: Record<string, DataRequest>;
    };
}
export declare const engineSlice: import("@reduxjs/toolkit").Slice<EngineState, {
    initForm: (state: Draft<EngineState>, action: PayloadAction<{
        formDoc: FormDoc;
        initialValues?: Record<string, unknown>;
    }>) => void;
    setValue: (state: Draft<EngineState>, action: PayloadAction<{
        path: string;
        value: unknown;
    }>) => void;
    setTouched: (state: Draft<EngineState>, action: PayloadAction<{
        path: string;
        touched: boolean;
    }>) => void;
    setErrors: (state: Draft<EngineState>, action: PayloadAction<Record<string, string[]>>) => void;
    setUiState: (state: Draft<EngineState>, action: PayloadAction<{
        visibleByNodeId?: Record<string, boolean>;
        disabledByNodeId?: Record<string, boolean>;
    }>) => void;
    resetForm: (state: Draft<EngineState>) => void;
    dataRequestStarted: (state: Draft<EngineState>, action: PayloadAction<{
        requestId: string;
        dataSourceId: string;
    }>) => void;
    dataRequestSucceeded: (state: Draft<EngineState>, action: PayloadAction<{
        requestId: string;
        resultKey: string;
        result: unknown;
    }>) => void;
    dataRequestFailed: (state: Draft<EngineState>, action: PayloadAction<{
        requestId: string;
        error: string;
    }>) => void;
    dataSetByKey: (state: Draft<EngineState>, action: PayloadAction<{
        key: string;
        value: unknown;
    }>) => void;
}, "engine", "engine", import("@reduxjs/toolkit").SliceSelectors<EngineState>>;
export declare const initForm: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    formDoc: FormDoc;
    initialValues?: Record<string, unknown>;
}, "engine/initForm">, setValue: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    path: string;
    value: unknown;
}, "engine/setValue">, setTouched: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    path: string;
    touched: boolean;
}, "engine/setTouched">, setErrors: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, string[]>, "engine/setErrors">, setUiState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    visibleByNodeId?: Record<string, boolean>;
    disabledByNodeId?: Record<string, boolean>;
}, "engine/setUiState">, resetForm: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"engine/resetForm">, dataRequestStarted: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    requestId: string;
    dataSourceId: string;
}, "engine/dataRequestStarted">, dataRequestSucceeded: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    requestId: string;
    resultKey: string;
    result: unknown;
}, "engine/dataRequestSucceeded">, dataRequestFailed: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    requestId: string;
    error: string;
}, "engine/dataRequestFailed">, dataSetByKey: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    key: string;
    value: unknown;
}, "engine/dataSetByKey">;
//# sourceMappingURL=slice.d.ts.map