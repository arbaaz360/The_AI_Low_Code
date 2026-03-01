import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import {
  engineSlice,
  initForm,
  dataRequestStarted,
  dataRequestSucceeded,
  dataRequestFailed,
  dataSetByKey,
  applyFieldErrors,
  clearFieldErrors,
  setFormError,
  setSubmitting,
} from "./slice.js";
import type { FormDoc } from "./types.js";

const minDoc: FormDoc = {
  schemaVersion: "1",
  pageFamily: "test",
  rootNodeId: "root",
  nodes: {
    root: { id: "root", type: "layout.Section", children: [] },
  },
  rules: [],
  dataContext: { entity: "test", mode: "create" },
  submission: { submitOperation: { operationId: "op1" }, mapping: [] },
};

function makeStore() {
  const store = configureStore({ reducer: { engine: engineSlice.reducer } });
  store.dispatch(initForm({ formDoc: minDoc }));
  return store;
}

describe("Engine data slice", () => {
  it("initializes with empty data", () => {
    const store = makeStore();
    const state = store.getState().engine;
    expect(state.data.byKey).toEqual({});
    expect(state.data.requests).toEqual({});
  });

  it("dataRequestStarted creates loading request", () => {
    const store = makeStore();
    store.dispatch(dataRequestStarted({ requestId: "r1", dataSourceId: "ds1" }));
    const req = store.getState().engine.data.requests.r1;
    expect(req).toBeDefined();
    expect(req!.status).toBe("loading");
    expect(req!.dataSourceId).toBe("ds1");
    expect(req!.startedAt).toBeGreaterThan(0);
  });

  it("dataRequestSucceeded stores result and marks success", () => {
    const store = makeStore();
    store.dispatch(dataRequestStarted({ requestId: "r1", dataSourceId: "ds1" }));
    store.dispatch(dataRequestSucceeded({ requestId: "r1", resultKey: "countries", result: [{ value: "US" }] }));
    const req = store.getState().engine.data.requests.r1;
    expect(req!.status).toBe("success");
    expect(req!.finishedAt).toBeGreaterThan(0);
    expect(store.getState().engine.data.byKey.countries).toEqual([{ value: "US" }]);
  });

  it("dataRequestFailed marks error", () => {
    const store = makeStore();
    store.dispatch(dataRequestStarted({ requestId: "r1", dataSourceId: "ds1" }));
    store.dispatch(dataRequestFailed({ requestId: "r1", error: "Network error" }));
    const req = store.getState().engine.data.requests.r1;
    expect(req!.status).toBe("error");
    expect(req!.error).toBe("Network error");
  });

  it("dataSetByKey stores arbitrary data", () => {
    const store = makeStore();
    store.dispatch(dataSetByKey({ key: "myList", value: [1, 2, 3] }));
    expect(store.getState().engine.data.byKey.myList).toEqual([1, 2, 3]);
  });

  it("initForm resets data", () => {
    const store = makeStore();
    store.dispatch(dataSetByKey({ key: "myList", value: [1] }));
    store.dispatch(initForm({ formDoc: minDoc }));
    expect(store.getState().engine.data.byKey).toEqual({});
  });

  it("applyFieldErrors merges into errorsByPath", () => {
    const store = makeStore();
    store.dispatch(applyFieldErrors({ fieldErrors: { "form.values.amount": "Must be > 0" } }));
    expect(store.getState().engine.errorsByPath["form.values.amount"]).toEqual(["Must be > 0"]);
  });

  it("clearFieldErrors resets errorsByPath and formError", () => {
    const store = makeStore();
    store.dispatch(applyFieldErrors({ fieldErrors: { "form.values.x": "err" } }));
    store.dispatch(setFormError({ message: "bad" }));
    store.dispatch(clearFieldErrors());
    expect(store.getState().engine.errorsByPath).toEqual({});
    expect(store.getState().engine.formError).toBeUndefined();
  });

  it("setFormError sets and clears formError", () => {
    const store = makeStore();
    store.dispatch(setFormError({ message: "Server error" }));
    expect(store.getState().engine.formError).toBe("Server error");
    store.dispatch(setFormError({ message: undefined }));
    expect(store.getState().engine.formError).toBeUndefined();
  });

  it("setSubmitting toggles submitting", () => {
    const store = makeStore();
    expect(store.getState().engine.submitting).toBe(false);
    store.dispatch(setSubmitting(true));
    expect(store.getState().engine.submitting).toBe(true);
    store.dispatch(setSubmitting(false));
    expect(store.getState().engine.submitting).toBe(false);
  });
});
