import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { StudioApp } from "./StudioApp.jsx";
import { TEST_DOMAIN_MODEL } from "./test-utils.js";
import type { FormDoc } from "@ai-low-code/engine";

const docWithVendorSection: FormDoc = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["vendorSection"],
    },
    vendorSection: {
      id: "vendorSection",
      type: "Section",
      children: [],
      props: { title: "Vendor Details" },
    },
  },
  dataContext: { entity: "Vendor", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
};

const theme = createTheme();

describe("Studio Domain Fields", () => {
  it("Domain Fields tab shows Vendor entity fields when initialDomainModel provided", () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudioApp doc={docWithVendorSection} initialDomainModel={TEST_DOMAIN_MODEL} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByTestId("tab-domain-fields"));
    expect(screen.getByTestId("domain-field-vendorName")).toBeInTheDocument();
  });

  it("clicking Vendor Name in Domain Fields adds TextInput under selected Section and it appears in Outline", async () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudioApp
          doc={docWithVendorSection}
          initialDomainModel={TEST_DOMAIN_MODEL}
        />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText(/Section \(vendorSection\)/));
    });
    await act(async () => {
      fireEvent.click(screen.getAllByTestId("tab-domain-fields")[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("domain-field-vendorName"));
    });

    // Switch to Outline and verify the added node appears
    await act(async () => {
      fireEvent.click(screen.getAllByTestId("tab-outline")[0]);
    });

    const outlines = screen.getAllByTestId("outline");
    expect(outlines[0].textContent).toContain("vendorName");
    expect(outlines[0].textContent).toContain("core.TextInput");

    // Undo button should be enabled (use getAllBy to handle duplicate elements)
    const undoBtns = screen.getAllByTestId("undo-btn");
    const enabledUndo = undoBtns.find((b) => !b.hasAttribute("disabled"));
    expect(enabledUndo).toBeDefined();

    // After adding vendorName, switching back to Domain Fields should show "Bound" indicator
    await act(async () => {
      fireEvent.click(screen.getAllByTestId("tab-domain-fields")[0]);
    });
    const vendorNameBtn = screen.getByTestId("domain-field-vendorName");
    expect(vendorNameBtn).not.toHaveAttribute("aria-disabled", "true");
    expect(vendorNameBtn.textContent).toContain("Bound");
  });
});
