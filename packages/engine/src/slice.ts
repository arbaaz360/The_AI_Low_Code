import {
  createSlice,
  type PayloadAction,
  type Draft,
} from "@reduxjs/toolkit";
import { getByPath, setByPath } from "./path.js";
import type { FormDoc } from "./types.js";
import { extractValuePaths } from "./extract.js";

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

const initialState: EngineState = {
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
  },
});

export const {
  initForm,
  setValue,
  setTouched,
  setErrors,
  setUiState,
  resetForm,
} = engineSlice.actions;
