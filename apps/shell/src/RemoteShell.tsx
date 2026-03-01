import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import { createFormEngine } from "@ai-low-code/engine";
import { PageRenderer } from "@ai-low-code/renderer";
import { defaultRegistry } from "@ai-low-code/widgets-core";
import { createActionRunner } from "@ai-low-code/actions";
import { createDataSourceRegistry, createDataSourceClient } from "@ai-low-code/datasources";
import {
  dataRequestStarted, dataRequestSucceeded, dataRequestFailed, dataSetByKey,
  applyFieldErrors, clearFieldErrors, setFormError, setSubmitting,
} from "@ai-low-code/engine";
import { evalAst } from "@ai-low-code/expr";
import { validateFormDoc } from "@ai-low-code/schema";
import { validateGovernance } from "@ai-low-code/governance";
import { migrateFormDoc } from "@ai-low-code/migrations";
import { createPublishClient, type VersionListItem } from "@ai-low-code/publish-client";
import type { FormDoc } from "@ai-low-code/engine";

export function RemoteShell() {
  const [searchParams] = useSearchParams();
  const routerNavigate = useNavigate();

  const appKey = searchParams.get("appKey") ?? "default";
  const channel = (searchParams.get("channel") ?? "preview") as "preview" | "prod";
  const apiBaseUrl = searchParams.get("apiBaseUrl") ?? "http://localhost:5016";
  const tenantId = searchParams.get("tenantId") ?? "default";

  const [doc, setDoc] = useState<FormDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [cacheHit, setCacheHit] = useState(false);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionListItem[]>([]);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastSeverity, setToastSeverity] = useState<"success" | "info" | "warning" | "error">("info");

  const publishClient = useMemo(() => createPublishClient({ baseUrl: apiBaseUrl, tenantId }), [apiBaseUrl, tenantId]);

  const loadRemote = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    setDoc(null);
    setCacheHit(false);

    try {
      const releaseRes = await publishClient.getRelease(appKey, channel);
      if (releaseRes.fromCache) {
        console.log("[RemoteShell] Release pointer: 304 cache hit");
        setCacheHit(true);
      }
      const vid = releaseRes.data.versionId;
      setVersionId(vid);

      const versionRes = await publishClient.getVersion(appKey, vid);
      if (versionRes.fromCache) {
        console.log("[RemoteShell] Version doc: 304 cache hit");
        setCacheHit(true);
      }

      const rawDoc = versionRes.data;
      const migrated = migrateFormDoc(rawDoc);
      const schemaResult = validateFormDoc(migrated.doc);
      if (!schemaResult.ok) {
        setErrors(schemaResult.errors.map((e) => `${e.path}: ${e.message}`));
        setLoading(false);
        return;
      }
      const govResult = validateGovernance(migrated.doc);
      if (!govResult.ok) {
        setErrors(govResult.errors.map((e) => `[${e.code}] ${e.message}`));
        setLoading(false);
        return;
      }
      setDoc(migrated.doc as FormDoc);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
    } finally {
      setLoading(false);
    }
  }, [publishClient, appKey, channel]);

  useEffect(() => { loadRemote(); }, [loadRemote]);

  useEffect(() => {
    publishClient.listVersions(appKey).then(setVersions).catch(() => {});
  }, [publishClient, appKey, doc]);

  const engine = useMemo(() => {
    if (!doc) return null;
    return createFormEngine(doc, { env: { region: "IN" }, initialValues: {} });
  }, [doc]);

  const dsClient = useMemo(() => {
    const docDs = doc?.dataSources ?? [];
    const defs = docDs.map((d) => {
      if (d.kind === "rest")
        return { id: d.id, kind: "rest" as const, name: d.name, method: (d.method ?? "GET") as "GET" | "POST", url: d.url ?? "" };
      return { id: d.id, kind: "mock" as const, name: d.name, response: d.response, delayMs: d.delayMs, failRate: d.failRate };
    });
    return createDataSourceClient({ registry: createDataSourceRegistry(defs) });
  }, [doc]);

  const actionRunner = useMemo(() => {
    if (!engine) return undefined;
    return createActionRunner({
      dispatch: engine.store.dispatch,
      getState: engine.store.getState as () => { engine: ReturnType<typeof engine.store.getState>["engine"] },
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
      navigate: (to) => routerNavigate(to),
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

  const handlePromoteVersion = useCallback(async (vid: string) => {
    try {
      await publishClient.promoteRelease(appKey, channel, vid);
      publishClient.clearCache();
      setToastMsg(`Promoted ${vid.slice(0, 12)}… to ${channel}`);
      setToastSeverity("success");
      setToastOpen(true);
      await loadRemote();
    } catch (e) {
      setToastMsg(e instanceof Error ? e.message : String(e));
      setToastSeverity("error");
      setToastOpen(true);
    }
  }, [publishClient, appKey, channel, loadRemote]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "0.9rem" }}>
            Runtime Shell — Remote: {tenantId}/{appKey}/{channel}
          </Typography>
          <Button color="inherit" size="small" onClick={loadRemote}>Refresh</Button>
          <Button color="inherit" size="small" href="/">Local Mode</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 900, mx: "auto", p: 3 }}>
        {loading && (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Loading from API…</Typography>
          </Box>
        )}

        {cacheHit && <Alert severity="info" sx={{ mb: 1 }}>Served from cache (304)</Alert>}

        {errors.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" color="error" gutterBottom>Errors</Typography>
            {errors.map((err, i) => <Alert key={i} severity="error" sx={{ mb: 0.5 }}>{err}</Alert>)}
          </Paper>
        )}

        {doc && engine && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <PageRenderer
              doc={doc}
              engine={engine}
              registry={defaultRegistry}
              mode="runtime"
              actionRunner={actionRunner}
            />
          </Paper>
        )}

        {versions.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Version History (rollback)</Typography>
            {versions.slice(0, 10).map((v) => (
              <Box key={v.versionId} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.5, borderBottom: 1, borderColor: "divider" }}>
                <Box>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {v.versionId.slice(0, 16)}…
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(v.createdAt).toLocaleString()}{v.notes ? ` — ${v.notes}` : ""}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant={v.versionId === versionId ? "contained" : "outlined"}
                  disabled={v.versionId === versionId}
                  onClick={() => handlePromoteVersion(v.versionId)}
                >
                  {v.versionId === versionId ? "Current" : `Promote to ${channel}`}
                </Button>
              </Box>
            ))}
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
