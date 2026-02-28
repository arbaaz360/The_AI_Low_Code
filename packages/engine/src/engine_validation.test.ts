import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createFormEngine } from "./createFormEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = resolve(__dirname, "../../../samples");

function loadFormRules(): unknown {
  return JSON.parse(readFileSync(resolve(SAMPLES_DIR, "form_rules.json"), "utf-8"));
}

describe("engine_validation", () => {
  it("requiredIf: ssn required when accountType=individual", () => {
    const formDoc = loadFormRules() as Parameters<typeof createFormEngine>[0];
    const engine = createFormEngine(formDoc);

    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.accountType", value: "individual" })
    );
    engine.validateAll();

    const selectError = engine.selectors.makeSelectError("form.values.ssn");
    const errors = selectError(engine.store.getState());
    expect(errors.length).toBeGreaterThan(0);
  });

  it("requiredIf: ssn not required when accountType=company", () => {
    const formDoc = loadFormRules() as Parameters<typeof createFormEngine>[0];
    const engine = createFormEngine(formDoc);

    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.accountType", value: "company" })
    );
    engine.validateAll();

    const selectError = engine.selectors.makeSelectError("form.values.ssn");
    const errors = selectError(engine.store.getState());
    expect(errors.length).toBe(0);
  });

  it("requiredIf: ssn valid when filled", () => {
    const formDoc = loadFormRules() as Parameters<typeof createFormEngine>[0];
    const engine = createFormEngine(formDoc);

    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.accountType", value: "individual" })
    );
    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.ssn", value: "123-45-6789" })
    );
    engine.validateAll();

    const selectError = engine.selectors.makeSelectError("form.values.ssn");
    const errors = selectError(engine.store.getState());
    expect(errors.length).toBe(0);
  });

  it("errorsByPath is stable", () => {
    const formDoc = loadFormRules() as Parameters<typeof createFormEngine>[0];
    const engine = createFormEngine(formDoc);

    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.accountType", value: "individual" })
    );
    engine.validateAll();

    const err1 = engine.store.getState().engine.errorsByPath;
    engine.validateAll();
    const err2 = engine.store.getState().engine.errorsByPath;

    expect(err2).toEqual(err1);
  });
});
