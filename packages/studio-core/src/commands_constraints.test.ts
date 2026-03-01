import { describe, it, expect } from "vitest";
import { applyCommand } from "./commands.js";

const baseDoc = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["section1"],
    },
    section1: {
      id: "section1",
      type: "Section",
      children: ["textInput1"],
      props: { title: "A" },
    },
    textInput1: {
      id: "textInput1",
      type: "core.TextInput",
      bindings: { value: "form.values.f1" },
    },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
} as Parameters<typeof applyCommand>[0];

describe("commands constraints", () => {
  it("MoveNode into leaf (TextInput) - doc unchanged, error diagnostic", () => {
    const result = applyCommand(baseDoc, {
      type: "MoveNode",
      nodeId: "section1",
      parentId: "textInput1",
      index: 0,
    });
    expect(result.doc).toBe(baseDoc);
    expect(result.diagnostics.some((d) => d.code === "CONSTRAINT_CANNOT_CONTAIN" && d.severity === "error")).toBe(true);
  });

  it("AddNode into leaf (TextInput) - doc unchanged, error diagnostic", () => {
    const result = applyCommand(baseDoc, {
      type: "AddNode",
      node: {
        id: "newField",
        type: "core.TextInput",
        bindings: { value: "form.values.new" },
      },
      parentId: "textInput1",
      index: 0,
    });
    expect(result.doc).toBe(baseDoc);
    expect(result.diagnostics.some((d) => d.code === "CONSTRAINT_CANNOT_CONTAIN" && d.severity === "error")).toBe(true);
  });

  it("AddNode into Section - succeeds", () => {
    const result = applyCommand(baseDoc, {
      type: "AddNode",
      node: {
        id: "newField",
        type: "core.TextInput",
        bindings: { value: "form.values.new" },
      },
      parentId: "section1",
      index: 1,
    });
    expect(result.doc).not.toBe(baseDoc);
    expect(result.doc.nodes.section1?.children).toContain("newField");
    expect(result.diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
  });
});
