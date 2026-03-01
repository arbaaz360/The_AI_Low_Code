import {
  createSlice,
  type PayloadAction,
  type Draft,
} from "@reduxjs/toolkit";
import { getByPath, setByPath } from "./path.js";
import type { FormDoc } from "./types.js";
import { extractValuePaths } from "./extract.js";

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

const initialUi = (): EngineState["ui"] => ({
  visibleByNodeId: {},
  disabledByNodeId: {},
});

function buildInitialValues(paths: string[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const path of paths) {
    setByPath(values as Record<string, unknown>, path, undefined);
  }
  return values;
}

const initialData = (): EngineState["data"] => ({
  byKey: {},
  requests: {},
});

const initialState: EngineState = {
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
    initForm: (
      state: Draft<EngineState>,
      action: PayloadAction<{ formDoc: FormDoc; initialValues?: Record<string, unknown> }>
    ) => {
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
    setValue: (
      state: Draft<EngineState>,
      action: PayloadAction<{ path: string; value: unknown }>
    ) => {
      const { path, value } = action.payload;
      setByPath(state.values as Record<string, unknown>, path, value);
      state.dirtyByPath[path] = true;
    },
    setTouched: (
      state: Draft<EngineState>,
      action: PayloadAction<{ path: string; touched: boolean }>
    ) => {
      const { path, touched } = action.payload;
      state.touchedByPath[path] = touched;
    },
    setErrors: (
      state: Draft<EngineState>,
      action: PayloadAction<Record<string, string[]>>
    ) => {
      state.errorsByPath = action.payload;
    },
    setUiState: (
      state: Draft<EngineState>,
      action: PayloadAction<{
        visibleByNodeId?: Record<string, boolean>;
        disabledByNodeId?: Record<string, boolean>;
      }>
    ) => {
      const { visibleByNodeId, disabledByNodeId } = action.payload;
      if (visibleByNodeId) {
        state.ui.visibleByNodeId = { ...state.ui.visibleByNodeId, ...visibleByNodeId };
      }
      if (disabledByNodeId) {
        state.ui.disabledByNodeId = { ...state.ui.disabledByNodeId, ...disabledByNodeId };
      }
    },
    resetForm: (state: Draft<EngineState>) => {
      const formDoc = state.formDoc;
      if (formDoc) {
        const paths = extractValuePaths(formDoc);
        state.values = buildInitialValues(paths);
      } else {
        state.values = {};
      }
      state.touchedByPath = {};
      state.dirtyByPath = {};
      state.errorsByPath = {};
      state.ui = initialUi();
    },
    dataRequestStarted: (
      state: Draft<EngineState>,
      action: PayloadAction<{ requestId: string; dataSourceId: string }>
    ) => {
      const { requestId, dataSourceId } = action.payload;
      state.data.requests[requestId] = {
        requestId,
        dataSourceId,
        status: "loading",
        startedAt: Date.now(),
      };
    },
    dataRequestSucceeded: (
      state: Draft<EngineState>,
      action: PayloadAction<{ requestId: string; resultKey: string; result: unknown }>
    ) => {
      const { requestId, resultKey, result } = action.payload;
      const req = state.data.requests[requestId];
      if (req) {
        req.status = "success";
        req.finishedAt = Date.now();
      }
      state.data.byKey[resultKey] = result as Draft<unknown>;
    },
    dataRequestFailed: (
      state: Draft<EngineState>,
      action: PayloadAction<{ requestId: string; error: string }>
    ) => {
      const { requestId, error } = action.payload;
      const req = state.data.requests[requestId];
      if (req) {
        req.status = "error";
        req.finishedAt = Date.now();
        req.error = error;
      }
    },
    dataSetByKey: (
      state: Draft<EngineState>,
      action: PayloadAction<{ key: string; value: unknown }>
    ) => {
      state.data.byKey[action.payload.key] = action.payload.value as Draft<unknown>;
    },
  },
});

export const {
  initForm,
  setValue,
  setTouched,
  setErrors,
  setUiState,
  resetForm,
  dataRequestStarted,
  dataRequestSucceeded,
  dataRequestFailed,
  dataSetByKey,
} = engineSlice.actions;
