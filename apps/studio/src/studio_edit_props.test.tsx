import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { validateFormDoc } from "@ai-low-code/schema";
import { StudioApp } from "./StudioApp.jsx";
import { TEST_DOMAIN_MODEL_NONE } from "./test-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(
  readFileSync(resolve(__dirname, "../../../samples/form_rules.json"), "utf-8")
);

const result = validateFormDoc(doc);
if (!result.ok) throw new Error(JSON.stringify(result.errors));

const theme = createTheme();

describe("StudioApp edit props", () => {
  it("selects a Section node via Outline, changes title via Inspector, asserts new title appears in Canvas", () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudioApp doc={doc} initialDomainModel={TEST_DOMAIN_MODEL_NONE} />
      </ThemeProvider>
    );

    // Click "Section (companyFields)" in the Outline
    const sectionEntry = screen.getByText(/Section \(companyFields\)/);
    fireEvent.click(sectionEntry);

    // Inspector should show; find the title input and change it
    const titleInput = screen.getByTestId("inspector-prop-title");
    expect(titleInput).toBeInTheDocument();
    fireEvent.change(titleInput, { target: { value: "Company Details" } });

    // The new title should appear in the Canvas (Section renders it)
    expect(screen.getByText("Company Details")).toBeInTheDocument();
  });
});
