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

describe("Studio Inspector schema-driven", () => {
  it("select TextInput node, inspector shows fields from schema, edit placeholder, canvas reflects it", () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudioApp doc={doc} initialDomainModel={TEST_DOMAIN_MODEL_NONE} />
      </ThemeProvider>
    );

    // Select taxId (TextInput) in Outline
    const taxIdEntry = screen.getByText(/core\.TextInput \(taxId\)/);
    fireEvent.click(taxIdEntry);

    // Inspector should show label and placeholder from schema
    expect(screen.getByTestId("inspector-prop-label")).toBeInTheDocument();
    expect(screen.getByTestId("inspector-prop-placeholder")).toBeInTheDocument();

    // Edit placeholder
    const placeholderInput = screen.getByTestId("inspector-prop-placeholder");
    fireEvent.change(placeholderInput, { target: { value: "Enter Tax ID" } });

    // Canvas should reflect the placeholder (TextInput renders it)
    expect(screen.getByPlaceholderText("Enter Tax ID")).toBeInTheDocument();
  });
});
