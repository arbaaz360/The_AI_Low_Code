import { describe, it, expect } from "vitest";
import { applyCommand } from "./commands.js";

const minimalDoc = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["f1", "f2"],
    },
    f1: {
      id: "f1",
      type: "core.TextInput",
      bindings: { value: "form.values.f1" },
    },
    f2: {
      id: "f2",
      type: "core.TextInput",
      bindings: { value: "form.values.f2" },
    },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
} as Parameters<typeof applyCommand>[0];

describe("commands UpdateLayout", () => {
  it("sets layout.span.xs and layout.kind", () => {
    const result = applyCommand(minimalDoc, {
      type: "UpdateLayout",
      nodeId: "f1",
      partialLayout: { span: { xs: 6 } },
    });
    const node = result.doc.nodes.f1 as { layout?: { kind?: string; span?: { xs?: number } } };
    expect(node.layout?.kind).toBe("gridItem");
    expect(node.layout?.span?.xs).toBe(6);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("clamps out-of-range values", () => {
    const result = applyCommand(minimalDoc, {
      type: "UpdateLayout",
      nodeId: "f1",
      partialLayout: { span: { xs: 99, md: 0 } },
    });
    const node = result.doc.nodes.f1 as { layout?: { span?: { xs?: number; md?: number } } };
    expect(node.layout?.span?.xs).toBe(12);
    expect(node.layout?.span?.md).toBe(1);
  });

  it("clears md when passed null", () => {
    const docWithLayout = {
      ...minimalDoc,
      nodes: {
        ...minimalDoc.nodes,
        f1: {
          ...minimalDoc.nodes.f1,
          layout: { kind: "gridItem", span: { xs: 12, md: 6 } },
        },
      },
    } as typeof minimalDoc;
    const result = applyCommand(docWithLayout, {
      type: "UpdateLayout",
      nodeId: "f1",
      partialLayout: { span: { md: null } },
    });
    const node = result.doc.nodes.f1 as { layout?: { span?: { md?: number } } };
    expect(node.layout?.span?.md).toBeUndefined();
  });
});
