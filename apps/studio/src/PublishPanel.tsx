import React, { useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { createPublishClient, PublishClientError } from "@ai-low-code/publish-client";
import { validateFormDoc } from "@ai-low-code/schema";
import { validateGovernance } from "@ai-low-code/governance";
import { migrateFormDoc } from "@ai-low-code/migrations";

interface PublishPanelProps {
  doc: unknown;
  appKey?: string;
  apiBaseUrl?: string;
  tenantId?: string;
}

const DEFAULT_API_BASE = "http://localhost:5016";
const DEFAULT_APP_KEY = "default";

export function PublishPanel({ doc, appKey, apiBaseUrl, tenantId }: PublishPanelProps) {
  const [channel, setChannel] = useState<"preview" | "prod">("preview");
  const [notes, setNotes] = useState("");
  const [tenant, setTenant] = useState(tenantId ?? "default");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ versionId: string; contentHash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);

  const effectiveAppKey = appKey ?? DEFAULT_APP_KEY;
  const effectiveBase = apiBaseUrl ?? DEFAULT_API_BASE;

  const handlePublish = useCallback(async () => {
    setError(null);
    setDetails([]);
    setResult(null);

    const migrated = migrateFormDoc(doc);
    const schemaResult = validateFormDoc(migrated.doc);
    if (!schemaResult.ok) {
      setError("Schema validation failed");
      setDetails(schemaResult.errors.map((e) => `${e.path}: ${e.message}`));
      return;
    }
    const govResult = validateGovernance(migrated.doc);
    if (!govResult.ok) {
      setError("Governance validation failed");
      setDetails(govResult.errors.map((e) => `[${e.code}] ${e.message}`));
      return;
    }

    setPublishing(true);
    try {
      const client = createPublishClient({ baseUrl: effectiveBase, tenantId: tenant });
      const pubResult = await client.publishVersion(effectiveAppKey, migrated.doc, notes || undefined);
      await client.promoteRelease(effectiveAppKey, channel, pubResult.versionId);
      setResult({ versionId: pubResult.versionId, contentHash: pubResult.contentHash });
    } catch (e) {
      if (e instanceof PublishClientError) {
        if (e.conflict) {
          setError(`Conflict: release moved to ${e.conflict.current.versionId.slice(0, 12)}… — refresh and retry`);
        } else {
          setError(e.validation?.error ?? e.message);
          setDetails(e.validation?.details ?? []);
        }
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setPublishing(false);
    }
  }, [doc, effectiveAppKey, effectiveBase, channel, notes, tenant]);

  return (
    <Box sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Publish</Typography>

      <TextField
        size="small" fullWidth label="Tenant ID" value={tenant}
        onChange={(e) => setTenant(e.target.value)}
        sx={{ mb: 1 }}
      />

      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <InputLabel>Channel</InputLabel>
        <Select value={channel} label="Channel" onChange={(e) => setChannel(e.target.value as "preview" | "prod")}>
          <MenuItem value="preview">Preview</MenuItem>
          <MenuItem value="prod">Production</MenuItem>
        </Select>
      </FormControl>

      <TextField
        size="small" fullWidth label="Notes" value={notes}
        onChange={(e) => setNotes(e.target.value)}
        sx={{ mb: 1 }}
      />

      <Button
        variant="contained" size="small" fullWidth
        onClick={handlePublish} disabled={publishing}
        startIcon={publishing ? <CircularProgress size={16} /> : undefined}
      >
        {publishing ? "Publishing…" : `Publish to ${channel}`}
      </Button>

      {result && (
        <Alert severity="success" sx={{ mt: 1, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>
          Published! Version: {result.versionId.slice(0, 12)}… Hash: {result.contentHash.slice(0, 12)}…
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>
          {error}
          {details.length > 0 && (
            <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
              {details.slice(0, 5).map((d, i) => <li key={i}>{d}</li>)}
              {details.length > 5 && <li>…and {details.length - 5} more</li>}
            </Box>
          )}
        </Alert>
      )}
    </Box>
  );
}
