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

describe("engine_submit_mapping", () => {
  it("includeIf and transient excluded, writeOnly included", () => {
    const formDoc = loadFormRules() as Parameters<typeof createFormEngine>[0];
    const engine = createFormEngine(formDoc);

    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.accountType", value: "individual" })
    );
    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.ssn", value: "123-45-6789" })
    );
    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.companyName", value: "Acme" })
    );
    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.taxId", value: "tax123" })
    );

    const req = engine.buildSubmitRequest();

    expect(req.body).toBeTruthy();
    const body = req.body as Record<string, unknown>;
    expect(body.accountType).toBe("individual");
    expect(body.ssn).toBe("123-45-6789");

    expect(body.companyName).toBeUndefined();
    expect(body.taxId).toBeUndefined();
  });

  it("includeIf: company fields when accountType=company", () => {
    const formDoc = loadFormRules() as Parameters<typeof createFormEngine>[0];
    const engine = createFormEngine(formDoc);

    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.accountType", value: "company" })
    );
    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.companyName", value: "Acme" })
    );
    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.taxId", value: "tax123" })
    );

    const req = engine.buildSubmitRequest();

    const body = req.body as Record<string, unknown>;
    expect(body.accountType).toBe("company");
    expect(body.companyName).toBe("Acme");
    expect(body.taxId).toBeUndefined();
  });
});
