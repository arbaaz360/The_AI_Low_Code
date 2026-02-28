import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createFormEngine } from "@ai-low-code/engine";
import { PageRenderer } from "./PageRenderer.jsx";
import type { WidgetRegistry, WidgetProps } from "./types.js";
import React, { useRef, useEffect } from "react";

const renderCounts: Record<string, number> = {};

function CountingTextInput(props: WidgetProps) {
  const { nodeId } = props;
  const countRef = useRef(0);
  countRef.current += 1;
  useEffect(() => {
    renderCounts[nodeId] = (renderCounts[nodeId] ?? 0) + 1;
  });
  return (
    <input
      data-nodeid={nodeId}
      data-testid={`input-${nodeId}`}
      value={String(props.value ?? "")}
      onChange={(e) => props.onChange?.(e.target.value)}
      disabled={props.disabled}
    />
  );
}

const minimalDoc = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["fieldA", "fieldB"],
    },
    fieldA: {
      id: "fieldA",
      type: "core.TextInput",
      bindings: { value: "form.values.fieldA" },
    },
    fieldB: {
      id: "fieldB",
      type: "core.TextInput",
      bindings: { value: "form.values.fieldB" },
    },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: {
    submitOperation: { operationId: "test" },
    mapping: [],
  },
} as Parameters<typeof createFormEngine>[0];

const testRegistry: WidgetRegistry = {
  FormGrid: ((p) => (
    <div data-testid="grid">
      {p.children}
    </div>
  )) as React.ComponentType<WidgetProps>,
  "layout.FormGrid": ((p) => (
    <div data-testid="grid">
      {p.children}
    </div>
  )) as React.ComponentType<WidgetProps>,
  "core.TextInput": CountingTextInput,
};

describe("renderer_rerender_budget", () => {
  it("changing field A does not re-render field B widget", () => {
    Object.keys(renderCounts).forEach((k) => delete renderCounts[k]);
    const engine = createFormEngine(minimalDoc);

    render(
      <PageRenderer doc={minimalDoc} engine={engine} registry={testRegistry} />
    );

    expect(screen.getByTestId("input-fieldA")).toBeInTheDocument();
    expect(screen.getByTestId("input-fieldB")).toBeInTheDocument();

    const beforeA = renderCounts["fieldA"] ?? 0;
    const beforeB = renderCounts["fieldB"] ?? 0;

    act(() => {
      engine.store.dispatch(
        engine.actions.setValue({ path: "form.values.fieldA", value: "x" })
      );
    });

    const afterA = renderCounts["fieldA"] ?? 0;
    const afterB = renderCounts["fieldB"] ?? 0;

    expect(afterA).toBeGreaterThan(beforeA);
    expect(afterB).toBeLessThanOrEqual(beforeB + 1);
  });
});
