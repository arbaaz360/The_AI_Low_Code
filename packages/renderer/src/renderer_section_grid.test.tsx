import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createFormEngine } from "@ai-low-code/engine";
import { PageRenderer } from "./PageRenderer.jsx";
import { defaultRegistry } from "@ai-low-code/widgets-core";

const docWithSectionGrid = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["sec"],
    },
    sec: {
      id: "sec",
      type: "core.Section",
      children: ["f1", "f2"],
      props: { title: "Test Section" },
    },
    f1: {
      id: "f1",
      type: "core.TextInput",
      layout: { kind: "gridItem", span: { xs: 6 } },
      bindings: { value: "form.values.f1" },
    },
    f2: {
      id: "f2",
      type: "core.TextInput",
      layout: { kind: "gridItem", span: { xs: 6 } },
      bindings: { value: "form.values.f2" },
    },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
} as Parameters<typeof createFormEngine>[0];

const engine = createFormEngine(docWithSectionGrid, { initialValues: {} });

describe("renderer Section grid layout", () => {
  it("Section with gridItem children renders MUI Grid container and items", () => {
    const { container } = render(
      <PageRenderer doc={docWithSectionGrid} engine={engine} registry={defaultRegistry} mode="design" />
    );

    expect(screen.getByText("Test Section")).toBeInTheDocument();

    // Section content uses Grid when children have gridItem - MUI Grid adds these classes
    const gridContainers = container.querySelectorAll(".MuiGrid-container");
    expect(gridContainers.length).toBeGreaterThanOrEqual(1);

    const gridItems = container.querySelectorAll(".MuiGrid-item");
    expect(gridItems.length).toBeGreaterThanOrEqual(2);
  });
});
