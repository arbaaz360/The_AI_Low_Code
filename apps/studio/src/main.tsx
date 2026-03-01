import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createPlatformTheme } from "@ai-low-code/theme";
import { validateFormDoc } from "@ai-low-code/schema";
import { StudioApp } from "./StudioApp.jsx";
import type { FormDoc } from "@ai-low-code/engine";

import formRules from "../../../samples/form_rules.json";

const doc = formRules as FormDoc;
const result = validateFormDoc(doc);

const theme = createPlatformTheme();

if (!result.ok) {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div data-testid="validation-errors" style={{ padding: 24 }}>
        <h2>Validation failed</h2>
        <ul>
          {result.errors.map((e, i) => (
            <li key={i}>
              <strong>{e.path}</strong>: {e.message}
            </li>
          ))}
        </ul>
      </div>
    </ThemeProvider>
  );
} else {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudioApp doc={doc} />
      </ThemeProvider>
    </React.StrictMode>
  );
}
