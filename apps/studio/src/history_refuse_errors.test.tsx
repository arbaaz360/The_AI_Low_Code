import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDocHistory } from "./useDocHistory.js";

const validDoc = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: { id: "root", type: "FormGrid", layout: { columns: 12 }, children: ["a"] },
    a: { id: "a", type: "core.Section", children: [], props: { title: "A" } },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
} as Parameters<typeof useDocHistory>[0];

describe("history_refuse_errors", () => {
  it("apply() does not commit when MoveNode into leaf produces error", () => {
    const docWithLeaf = {
      ...validDoc,
      nodes: {
        root: { id: "root", type: "FormGrid", layout: { columns: 12 }, children: ["sec", "leaf"] },
        sec: { id: "sec", type: "core.Section", children: [], props: { title: "S" } },
        leaf: { id: "leaf", type: "core.TextInput", bindings: { value: "form.values.x" } },
      },
    } as typeof validDoc;

    const { result: r2 } = renderHook(() => useDocHistory(docWithLeaf));
    const beforeApply = r2.current.doc;

    act(() => {
      r2.current.apply({
        type: "MoveNode",
        nodeId: "sec",
        parentId: "leaf",
        index: 0,
      });
    });

    expect(r2.current.doc).toBe(beforeApply);
    expect(r2.current.lastErrors.length).toBeGreaterThan(0);
    expect(r2.current.lastErrors.some((e) => e.code === "CONSTRAINT_CANNOT_CONTAIN")).toBe(true);
  });

  it("apply() commits when legal MoveNode", () => {
    const docWithTwo = {
      ...validDoc,
      nodes: {
        root: { id: "root", type: "FormGrid", layout: { columns: 12 }, children: ["sec", "leaf"] },
        sec: { id: "sec", type: "core.Section", children: [], props: { title: "S" } },
        leaf: { id: "leaf", type: "core.TextInput", bindings: { value: "form.values.x" } },
      },
    } as typeof validDoc;

    const { result } = renderHook(() => useDocHistory(docWithTwo));

    act(() => {
      result.current.apply({
        type: "MoveNode",
        nodeId: "sec",
        parentId: "root",
        index: 1,
      });
    });

    expect(result.current.doc.nodes.root?.children).toEqual(["leaf", "sec"]);
  });

  it("apply() does not commit when RemoveNode root produces error", () => {
    const { result } = renderHook(() => useDocHistory(validDoc));

    act(() => {
      result.current.apply({
        type: "RemoveNode",
        nodeId: "root",
        deleteSubtree: true,
      });
    });

    expect(result.current.doc).toBe(validDoc);
    expect(result.current.lastErrors.some((e) => e.code === "REMOVE_NODE_ROOT")).toBe(true);
  });
});
