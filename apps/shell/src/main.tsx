import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import formRules from "../../../samples/form_rules.json";
import { validateFormDoc } from "@ai-low-code/schema";
import { createFormEngine } from "@ai-low-code/engine";
import { PageRenderer } from "@ai-low-code/renderer";
import { defaultRegistry } from "@ai-low-code/widgets-core";

const doc = formRules as Parameters<typeof createFormEngine>[0];
const result = validateFormDoc(doc);
if (!result.ok) {
  throw new Error(`Invalid form: ${JSON.stringify(result.errors)}`);
}

const engine = createFormEngine(doc, {
  env: { region: "IN" },
  initialValues: {
    form: {
      options: {
        accountTypes: [
          { value: "company", label: "Company" },
          { value: "individual", label: "Individual" },
        ],
        industries: [
          { value: "tech", label: "Technology" },
          { value: "finance", label: "Finance" },
        ],
      },
    },
  },
});

const theme = createTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ padding: 24, maxWidth: 800 }}>
        <PageRenderer doc={doc} engine={engine} registry={defaultRegistry} />
      </div>
    </ThemeProvider>
  </React.StrictMode>
);
