import { describe, it, expect } from "vitest";
import { validateFormDoc } from "./validate.js";

function makeDoc(nodeOverrides?: Record<string, unknown>) {
  return {
    schemaVersion: "1.0",
    pageFamily: "Form",
    rootNodeId: "root",
    nodes: {
      root: { id: "root", type: "FormGrid", children: ["btn"], ...nodeOverrides },
      btn: {
        id: "btn",
        type: "core.Button",
        props: { label: "Save" },
        events: {
          onClick: [
            { type: "Toast", message: "Saved!", severity: "success" },
            { type: "Navigate", to: "/done" },
          ],
        },
      },
    },
    dataContext: { entity: "Test", mode: "create" },
    submission: { submitOperation: { operationId: "test.op" }, mapping: [] },
  };
}

describe("schema validation - events", () => {
  it("accepts a node with valid events (Toast + Navigate)", () => {
    const result = validateFormDoc(makeDoc());
    expect(result.ok).toBe(true);
  });

  it("accepts a node with SetValue event using $event ref", () => {
    const doc = {
      ...makeDoc(),
      nodes: {
        root: { id: "root", type: "FormGrid", children: ["t1"] },
        t1: {
          id: "t1",
          type: "core.TextInput",
          events: {
            onChange: [
              { type: "SetValue", path: "form.values.name", value: { $event: "value" } },
            ],
          },
        },
      },
    };
    const result = validateFormDoc(doc);
    expect(result.ok).toBe(true);
  });

  it("accepts a node with Batch and If actions", () => {
    const doc = {
      ...makeDoc(),
      nodes: {
        root: { id: "root", type: "FormGrid", children: ["btn"] },
        btn: {
          id: "btn",
          type: "core.Button",
          events: {
            onClick: [
              {
                type: "Batch",
                actions: [
                  { type: "ValidateForm" },
                  {
                    type: "If",
                    condition: { op: "lit", value: true },
                    then: [{ type: "Toast", message: "Yes" }],
                    else: [{ type: "Toast", message: "No" }],
                  },
                ],
              },
            ],
          },
        },
      },
    };
    const result = validateFormDoc(doc);
    expect(result.ok).toBe(true);
  });

  it("rejects events with invalid action type", () => {
    const doc = {
      ...makeDoc(),
      nodes: {
        root: { id: "root", type: "FormGrid", children: ["btn"] },
        btn: {
          id: "btn",
          type: "core.Button",
          events: {
            onClick: [{ type: "ExecuteJS", code: "alert(1)" }],
          },
        },
      },
    };
    const result = validateFormDoc(doc);
    expect(result.ok).toBe(false);
  });

  it("accepts a node with no events at all (backward compat)", () => {
    const doc = {
      ...makeDoc(),
      nodes: {
        root: { id: "root", type: "FormGrid", children: ["t1"] },
        t1: { id: "t1", type: "core.TextInput", bindings: { value: "form.values.name" } },
      },
    };
    const result = validateFormDoc(doc);
    expect(result.ok).toBe(true);
  });
});
