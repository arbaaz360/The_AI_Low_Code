import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { validateFormDoc } from "@ai-low-code/schema";
import { createFormEngine } from "@ai-low-code/engine";
import { PageRenderer } from "./PageRenderer.jsx";
import { defaultRegistry } from "@ai-low-code/widgets-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(
  readFileSync(resolve(__dirname, "../../../samples/form_rules.json"), "utf-8")
);

const result = validateFormDoc(doc);
if (!result.ok) throw new Error(JSON.stringify(result.errors));

describe("renderer_visibility", () => {
  it("section becomes visible when setValue toggles rule-dependent field", () => {
    const engine = createFormEngine(doc, {
      initialValues: {
        form: {
          options: {
            accountTypes: [
              { value: "company", label: "Company" },
              { value: "individual", label: "Individual" },
            ],
          },
        },
      },
    });

    render(
      <PageRenderer doc={doc} engine={engine} registry={defaultRegistry} />
    );

    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);

    act(() => {
      engine.store.dispatch(
        engine.actions.setValue({ path: "form.values.accountType", value: "company" })
      );
    });

    expect(screen.queryAllByRole("textbox")).toHaveLength(2);
  });
});
