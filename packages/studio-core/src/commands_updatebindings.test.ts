import { describe, it, expect } from "vitest";
import { applyCommand } from "./commands.js";

const docWithBindings = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["text1"],
    },
    text1: {
      id: "text1",
      type: "core.TextInput",
      bindings: { value: "form.values.oldPath" },
    },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
} as Parameters<typeof applyCommand>[0];

describe("commands UpdateBindings", () => {
  it("merges partialBindings into node.bindings", () => {
    const result = applyCommand(docWithBindings, {
      type: "UpdateBindings",
      nodeId: "text1",
      partialBindings: { value: "form.values.vendorName" },
    });
    expect(result.doc.nodes.text1?.bindings).toEqual({
      value: "form.values.vendorName",
    });
    expect(result.diagnostics).toHaveLength(0);
  });

  it("preserves other bindings when merging", () => {
    const result = applyCommand(docWithBindings, {
      type: "UpdateBindings",
      nodeId: "text1",
      partialBindings: { disabled: "form.ui.disabled" },
    });
    expect(result.doc.nodes.text1?.bindings).toEqual({
      value: "form.values.oldPath",
      disabled: "form.ui.disabled",
    });
  });

  it("returns unchanged doc when nodeId not found", () => {
    const result = applyCommand(docWithBindings, {
      type: "UpdateBindings",
      nodeId: "nonexistent",
      partialBindings: { value: "form.values.x" },
    });
    expect(result.doc).toBe(docWithBindings);
  });

  it("does not mutate input doc", () => {
    const copy = JSON.parse(JSON.stringify(docWithBindings));
    applyCommand(docWithBindings, {
      type: "UpdateBindings",
      nodeId: "text1",
      partialBindings: { value: "form.values.changed" },
    });
    expect((docWithBindings.nodes.text1 as { bindings?: { value?: string } })?.bindings?.value).toBe(
      "form.values.oldPath"
    );
  });

  it("creates bindings when node has none", () => {
    const docNoBindings = {
      ...docWithBindings,
      nodes: {
        ...docWithBindings.nodes,
        text1: {
          id: "text1",
          type: "core.TextInput",
        },
      },
    } as typeof docWithBindings;
    const result = applyCommand(docNoBindings, {
      type: "UpdateBindings",
      nodeId: "text1",
      partialBindings: { value: "form.values.vendorName" },
    });
    expect(result.doc.nodes.text1?.bindings).toEqual({
      value: "form.values.vendorName",
    });
  });
});
