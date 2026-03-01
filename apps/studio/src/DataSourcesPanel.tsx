import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import type { FormDoc } from "@ai-low-code/engine";

type DataSourceDefMeta = NonNullable<FormDoc["dataSources"]>[number];

interface DataSourcesPanelProps {
  dataSources: DataSourceDefMeta[];
  onUpdate: (dataSources: DataSourceDefMeta[]) => void;
}

function DataSourceEditor({
  ds,
  onChange,
  onDelete,
}: {
  ds: DataSourceDefMeta;
  onChange: (updated: DataSourceDefMeta) => void;
  onDelete: () => void;
}) {
  const [responseText, setResponseText] = useState(() =>
    JSON.stringify(ds.response ?? "", null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2">{ds.name || ds.id}</Typography>
        <IconButton size="small" onClick={onDelete} aria-label="Delete datasource">✕</IconButton>
      </Box>
      <TextField
        label="ID"
        size="small"
        fullWidth
        value={ds.id}
        onChange={(e) => onChange({ ...ds, id: e.target.value })}
        sx={{ mb: 1 }}
      />
      <TextField
        label="Name"
        size="small"
        fullWidth
        value={ds.name ?? ""}
        onChange={(e) => onChange({ ...ds, name: e.target.value || undefined })}
        sx={{ mb: 1 }}
      />
      <TextField
        label="Delay (ms)"
        size="small"
        fullWidth
        type="number"
        value={ds.delayMs ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ ...ds, delayMs: v === "" ? undefined : Number(v) });
        }}
        sx={{ mb: 1 }}
      />
      <TextField
        label="Fail Rate (0-1)"
        size="small"
        fullWidth
        type="number"
        inputProps={{ step: 0.1, min: 0, max: 1 }}
        value={ds.failRate ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ ...ds, failRate: v === "" ? undefined : Number(v) });
        }}
        sx={{ mb: 1 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
        Response JSON
      </Typography>
      <TextField
        multiline
        minRows={3}
        maxRows={8}
        size="small"
        fullWidth
        value={responseText}
        onChange={(e) => {
          setResponseText(e.target.value);
          try {
            const parsed = JSON.parse(e.target.value);
            setParseError(null);
            onChange({ ...ds, response: parsed });
          } catch {
            setParseError("Invalid JSON");
          }
        }}
        error={!!parseError}
        helperText={parseError}
        sx={{ mb: 1, fontFamily: "monospace", fontSize: "0.75rem" }}
      />
    </Paper>
  );
}

export function DataSourcesPanel({ dataSources, onUpdate }: DataSourcesPanelProps) {
  const handleAdd = () => {
    const id = `ds_${Date.now()}`;
    const newDs: DataSourceDefMeta = {
      id,
      kind: "mock",
      name: "New DataSource",
      response: [{ value: "opt1", label: "Option 1" }],
      delayMs: 200,
    };
    onUpdate([...dataSources, newDs]);
  };

  const handleChange = (index: number, updated: DataSourceDefMeta) => {
    const next = [...dataSources];
    next[index] = updated;
    onUpdate(next);
  };

  const handleDelete = (index: number) => {
    const next = dataSources.filter((_, i) => i !== index);
    onUpdate(next);
  };

  return (
    <Box sx={{ p: 1.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          DataSources
        </Typography>
        <Button size="small" onClick={handleAdd}>
          + Add Mock
        </Button>
      </Box>
      {dataSources.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No data sources. Click "+ Add Mock" to create one.
        </Typography>
      )}
      {dataSources.map((ds, i) => (
        <DataSourceEditor
          key={ds.id}
          ds={ds}
          onChange={(updated) => handleChange(i, updated)}
          onDelete={() => handleDelete(i)}
        />
      ))}
    </Box>
  );
}
