import React, { useState, useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useNavigate, Link } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Snackbar from "@mui/material/Snackbar";
import { createPlatformTheme } from "@ai-low-code/theme";
import { validateFormDoc } from "@ai-low-code/schema";
import { createFormEngine } from "@ai-low-code/engine";
import { PageRenderer } from "@ai-low-code/renderer";
import { defaultRegistry } from "@ai-low-code/widgets-core";
import { createActionRunner, type ActionRunner } from "@ai-low-code/actions";
import { createDataSourceRegistry, createDataSourceClient } from "@ai-low-code/datasources";
import {
  dataRequestStarted, dataRequestSucceeded, dataRequestFailed, dataSetByKey,
  applyFieldErrors, clearFieldErrors, setFormError, setSubmitting,
} from "@ai-low-code/engine";
import { evalAst } from "@ai-low-code/expr";
import type { FormDoc } from "@ai-low-code/engine";
import { mockFetch } from "./mockFetch.js";
import { validateGovernance } from "@ai-low-code/governance";
import { migrateFormDoc } from "@ai-low-code/migrations";

import formRules from "../../../samples/form_rules.json";
import formBasic from "../../../samples/form_basic.json";
import formLookup from "../../../samples/form_lookup.json";
import formSubmit from "../../../samples/form_submit.json";

const SAMPLES: Record<string, { doc: unknown; label: string; initialValues?: Record<string, unknown> }> = {
  form_rules: {
    doc: formRules,
    label: "Form Rules (conditional)",
    initialValues: {
      form: {
        values: { accountType: "company" },
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
  },
  form_basic: {
    doc: formBasic,
    label: "Form Basic (20 fields)",
    initialValues: {
      form: {
        options: {
          gender: [
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
          ],
        },
      },
    },
  },
  form_lookup: {
    doc: formLookup,
    label: "Form Lookup (dynamic options)",
  },
  form_submit: {
    doc: formSubmit,
    label: "Form Submit (validation + submit)",
  },
};

const theme = createPlatformTheme();

function ShellApp() {
  const routerNavigate = useNavigate();
  const [selectedSample, setSelectedSample] = useState("form_rules");
  const [customDoc, setCustomDoc] = useState<FormDoc | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [migrationBanner, setMigrationBanner] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastSeverity, setToastSeverity] = useState<"success" | "info" | "warning" | "error">("info");
  const [lastRoute, setLastRoute] = useState<string | null>(null);

  const activeDoc = customDoc ?? (SAMPLES[selectedSample]?.doc as FormDoc);
  const activeValues = customDoc ? {} : SAMPLES[selectedSample]?.initialValues ?? {};
  const validation = validateFormDoc(activeDoc);
  const govResult = useMemo(() => validation.ok ? validateGovernance(activeDoc) : null, [activeDoc, validation.ok]);
  const canRender = validation.ok && (govResult?.ok ?? false);

  const engine = useMemo(() => {
    if (!canRender) return null;
    return createFormEngine(activeDoc, { env: { region: "IN" }, initialValues: activeValues });
  }, [activeDoc, canRender]);

  const dsClient = useMemo(() => {
    const docDs = (activeDoc as FormDoc)?.dataSources ?? [];
    const defs = docDs.map((d) => {
      if (d.kind === "rest") {
        return { id: d.id, kind: "rest" as const, name: d.name, method: (d.method ?? "GET") as "GET" | "POST", url: d.url ?? "" };
      }
      return { id: d.id, kind: "mock" as const, name: d.name, response: d.response, delayMs: d.delayMs, failRate: d.failRate };
    });
    const registry = createDataSourceRegistry(defs);
    return createDataSourceClient({ registry, fetchImpl: mockFetch });
  }, [activeDoc]);

  const actionRunner: ActionRunner | undefined = useMemo(() => {
    if (!engine) return undefined;
    return createActionRunner({
      dispatch: (a) => engine.store.dispatch(a),
      getState: () => engine.store.getState() as { engine: { values: Record<string, unknown>; errorsByPath: Record<string, string[]>; data: { byKey: Record<string, unknown> } } },
      setValueActionCreator: (p) => engine.actions.setValue(p),
      dataRequestStartedCreator: (p) => dataRequestStarted(p),
      dataRequestSucceededCreator: (p) => dataRequestSucceeded(p),
      dataRequestFailedCreator: (p) => dataRequestFailed(p),
      dataSetByKeyCreator: (p) => dataSetByKey(p),
      applyFieldErrorsCreator: (p) => applyFieldErrors(p),
      clearFieldErrorsCreator: () => clearFieldErrors(),
      setFormErrorCreator: (p) => setFormError(p),
      setSubmittingCreator: (p) => setSubmitting(p),
      dataSourceClient: dsClient,
      validateAll: () => engine.validateAll(),
      buildSubmitRequest: () => engine.buildSubmitRequest(),
      evalExpr: (ast, ctx) => evalAst(ast, ctx),
      navigate: (to) => {
        setLastRoute(to);
        routerNavigate(to);
      },
      toast: (opts) => {
        setToastMsg(opts.message);
        setToastSeverity((opts.severity as "success" | "info" | "warning" | "error") ?? "info");
        setToastOpen(true);
      },
      telemetry: {
        onActionStart: (action, ctx) => console.log(`[Action] ${action.type} start`, { nodeId: ctx.nodeId }),
        onActionEnd: (action) => console.log(`[Action] ${action.type} end`),
        onActionError: (action, ctx, err) => console.error(`[Action] ${action.type} error`, { nodeId: ctx.nodeId, err }),
      },
    });
  }, [engine, dsClient]);

  const handleSampleChange = useCallback((key: string) => {
    setSelectedSample(key);
    setCustomDoc(null);
    setErrors([]);
    setLastRoute(null);
    setMigrationBanner(null);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const migrated = migrateFormDoc(parsed);
        if (migrated.migrated) {
          setMigrationBanner(`Migrated from v${migrated.from} to v${migrated.to}: ${migrated.warnings.join("; ")}`);
        } else {
          setMigrationBanner(null);
        }
        const migratedDoc = migrated.doc;
        const result = validateFormDoc(migratedDoc);
        if (!result.ok) {
          setErrors(result.errors.map((err) => `${err.path}: ${err.message}`));
          setCustomDoc(null);
          return;
        }
        const gov = validateGovernance(migratedDoc);
        if (!gov.ok) {
          setErrors(gov.errors.map((err) => `[${err.code}] ${err.message}${err.nodeId ? ` (node: ${err.nodeId})` : ""}`));
          setCustomDoc(null);
          return;
        }
        setCustomDoc(migratedDoc as FormDoc);
        setErrors([]);
      } catch (err) {
        setErrors([`JSON parse error: ${err instanceof Error ? err.message : String(err)}`]);
        setCustomDoc(null);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "0.9rem" }}>
            Runtime Shell
          </Typography>
          {lastRoute && (
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
              Route: {lastRoute}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 900, mx: "auto", p: 3 }}>
        <Paper sx={{ p: 2, mb: 3, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Sample</InputLabel>
            <Select
              value={customDoc ? "__custom__" : selectedSample}
              label="Sample"
              onChange={(e) => {
                if (e.target.value !== "__custom__") handleSampleChange(e.target.value);
              }}
            >
              {Object.entries(SAMPLES).map(([key, val]) => (
                <MenuItem key={key} value={key}>{val.label}</MenuItem>
              ))}
              {customDoc && <MenuItem value="__custom__">Uploaded JSON</MenuItem>}
            </Select>
          </FormControl>

          <Button variant="outlined" size="small" component="label">
            Upload JSON
            <input type="file" accept=".json,application/json" hidden onChange={handleFileUpload} />
          </Button>

          {customDoc && (
            <Button variant="text" size="small" color="secondary" onClick={() => { setCustomDoc(null); setErrors([]); }}>
              Clear upload
            </Button>
          )}
        </Paper>

        {errors.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" color="error" gutterBottom>Validation Errors</Typography>
            {errors.map((err, i) => (
              <Alert key={i} severity="error" sx={{ mb: 0.5 }}>{err}</Alert>
            ))}
          </Paper>
        )}

        {!validation.ok && errors.length === 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" color="error" gutterBottom>Schema Validation Failed</Typography>
            {validation.errors.map((err, i) => (
              <Alert key={i} severity="error" sx={{ mb: 0.5 }}>{err.path}: {err.message}</Alert>
            ))}
          </Paper>
        )}

        {validation.ok && govResult && !govResult.ok && errors.length === 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" color="error" gutterBottom>Governance Errors</Typography>
            {govResult.errors.map((err, i) => (
              <Alert key={i} severity="error" sx={{ mb: 0.5 }}>[{err.code}] {err.message}{err.nodeId ? ` (node: ${err.nodeId})` : ""}</Alert>
            ))}
          </Paper>
        )}

        {migrationBanner && (
          <Alert severity="info" sx={{ mb: 2 }}>{migrationBanner}</Alert>
        )}

        {canRender && engine && (
          <Paper sx={{ p: 3 }}>
            <PageRenderer
              doc={activeDoc}
              engine={engine}
              registry={defaultRegistry}
              mode="runtime"
              actionRunner={actionRunner}
            />
          </Paper>
        )}
      </Box>

      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toastSeverity} onClose={() => setToastOpen(false)} variant="filled" sx={{ width: "100%" }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function DonePage() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "0.9rem" }}>
            Runtime Shell
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ maxWidth: 600, mx: "auto", p: 4, textAlign: "center" }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>Done!</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your form has been submitted successfully.
          </Typography>
          <Button component={Link} to="/" variant="contained">
            Back to Forms
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ShellApp />} />
          <Route path="/done" element={<DonePage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
