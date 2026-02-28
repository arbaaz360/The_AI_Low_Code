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
      children: ["a", "b"],
    },
    a: { id: "a", type: "Section", children: ["a1"], props: { title: "A" } },
    a1: { id: "a1", type: "core.TextInput", bindings: { value: "form.values.a1" } },
    b: { id: "b", type: "Section", children: [], props: { title: "B" } },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
} as Parameters<typeof applyCommand>[0];

describe("commands AddNode", () => {
  it("adds node at index and inserts into parent.children", () => {
    const result = applyCommand(baseDoc, {
      type: "AddNode",
      node: {
        id: "newSection",
        type: "Section",
        children: [],
        props: { title: "New" },
      },
      parentId: "root",
      index: 1,
    });
    expect(result.doc.nodes.root?.children).toEqual(["a", "newSection", "b"]);
    expect(result.doc.nodes.newSection).toBeDefined();
    expect(result.doc.nodes.newSection?.type).toBe("Section");
  });

  it("adds at end when index >= children.length", () => {
    const result = applyCommand(baseDoc, {
      type: "AddNode",
      node: { id: "tail", type: "Section", children: [] },
      parentId: "root",
      index: 999,
    });
    expect(result.doc.nodes.root?.children).toContain("tail");
    expect(result.doc.nodes.root?.children?.indexOf("tail")).toBe(2);
  });
});

describe("commands RemoveNode", () => {
  it("removes node and subtree from parent.children and nodes", () => {
    const result = applyCommand(baseDoc, {
      type: "RemoveNode",
      nodeId: "a",
      deleteSubtree: true,
    });
    expect(result.doc.nodes.root?.children).toEqual(["b"]);
    expect(result.doc.nodes.a).toBeUndefined();
    expect(result.doc.nodes.a1).toBeUndefined();
  });

  it("refuses to remove root", () => {
    const result = applyCommand(baseDoc, {
      type: "RemoveNode",
      nodeId: "root",
      deleteSubtree: true,
    });
    expect(result.doc).toBe(baseDoc);
    expect(result.diagnostics.some((d) => d.code === "REMOVE_NODE_ROOT")).toBe(true);
  });
});

describe("commands MoveNode", () => {
  it("moves node from old parent to new parent at index", () => {
    const result = applyCommand(baseDoc, {
      type: "MoveNode",
      nodeId: "a",
      parentId: "root",
      index: 1,
    });
    expect(result.doc.nodes.root?.children).toEqual(["b", "a"]);
  });

  it("moves node into different parent", () => {
    const result = applyCommand(baseDoc, {
      type: "MoveNode",
      nodeId: "a1",
      parentId: "b",
      index: 0,
    });
    expect(result.doc.nodes.a?.children).toEqual([]);
    expect(result.doc.nodes.b?.children).toEqual(["a1"]);
  });
});
