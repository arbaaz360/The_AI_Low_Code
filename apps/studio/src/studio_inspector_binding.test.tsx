import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { StudioApp } from "./StudioApp.jsx";
import { TEST_DOMAIN_MODEL } from "./test-utils.js";
import type { FormDoc } from "@ai-low-code/engine";

const docWithTextInput: FormDoc = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["myInput"],
    },
    myInput: {
      id: "myInput",
      type: "core.TextInput",
      bindings: { value: "form.values.other" },
    },
  },
  dataContext: { entity: "Vendor", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
};

const theme = createTheme();

describe("Studio Inspector Binding", () => {
  it("select TextInput, bind to vendorName, binding dropdown shows vendorName and undo is enabled", async () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudioApp
          doc={docWithTextInput}
          initialDomainModel={TEST_DOMAIN_MODEL}
        />
      </ThemeProvider>
    );

    // Select the TextInput node
    await act(async () => {
      fireEvent.click(screen.getByText(/core\.TextInput \(myInput\)/));
    });

    // The binding dropdown should show __none__ initially (because "other" is not a domain field)
    const selectEl = screen.getByTestId("inspector-binding-field") as HTMLSelectElement;
    expect(selectEl.value).toBe("__none__");

    // Change binding to vendorName
    await act(async () => {
      fireEvent.change(selectEl, { target: { value: "vendorName" } });
    });

    // After change, a new select is mounted (key changed) reflecting vendorName
    const selectAfter = screen.getByTestId("inspector-binding-field") as HTMLSelectElement;
    expect(selectAfter.value).toBe("vendorName");

    // Undo should be enabled (command was applied)
    const undoBtns = screen.getAllByTestId("undo-btn");
    const enabledUndo = undoBtns.find((b) => !b.hasAttribute("disabled"));
    expect(enabledUndo).toBeDefined();
  });
});
