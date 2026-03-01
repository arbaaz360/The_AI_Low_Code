import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { StudioApp } from "./StudioApp.jsx";
import { TEST_DOMAIN_MODEL_NONE } from "./test-utils.js";
import type { FormDoc } from "@ai-low-code/engine";

const theme = createTheme();

const docWithSectionFields = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["companyFields"],
    },
    companyFields: {
      id: "companyFields",
      type: "Section",
      children: ["companyName", "taxId"],
      props: { title: "Company" },
    },
    companyName: {
      id: "companyName",
      type: "core.TextInput",
      bindings: { value: "form.values.companyName" },
    },
    taxId: {
      id: "taxId",
      type: "core.TextInput",
      bindings: { value: "form.values.taxId" },
    },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
} as FormDoc;

function getSpanXs(d: FormDoc, nodeId: string): number | undefined {
  const node = d.nodes[nodeId] as { layout?: { span?: { xs?: number } } };
  return node?.layout?.span?.xs;
}

describe("Studio layout span in Section", () => {
  it("select TextInput inside Section, edit span.xs to 6, metadata updated", async () => {
    let lastDoc: FormDoc = docWithSectionFields;
    const capture = (d: FormDoc) => {
      lastDoc = d;
    };

    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudioApp doc={docWithSectionFields} onDocChange={capture} initialDomainModel={TEST_DOMAIN_MODEL_NONE} />
      </ThemeProvider>
    );

    // Select taxId (TextInput inside companyFields Section)
    fireEvent.click(screen.getByText(/core\.TextInput \(taxId\)/));

    // Layout section should show (Section is grid container)
    const xsInput = screen.getByTestId("inspector-layout-span-xs");
    expect(xsInput).toBeInTheDocument();

    // Edit span.xs to 6
    fireEvent.change(xsInput, { target: { value: "6" } });

    await waitFor(() => {
      expect(getSpanXs(lastDoc, "taxId")).toBe(6);
    });

    // Section should now use grid (child has gridItem)
    expect(lastDoc.nodes.taxId).toBeDefined();
    const taxNode = lastDoc.nodes.taxId as { layout?: { kind?: string; span?: { xs?: number } } };
    expect(taxNode.layout?.kind).toBe("gridItem");
    expect(taxNode.layout?.span?.xs).toBe(6);
  });
});
