import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { FormDoc, FormNode } from "@ai-low-code/engine";

interface InspectorProps {
  doc: FormDoc;
  selectedNodeId: string | null;
  onUpdateProps: (nodeId: string, partialProps: Record<string, unknown>) => void;
}

const SECTION_TYPES = ["core.Section", "Section"];
const TEXT_INPUT_TYPES = ["core.TextInput"];
const LABEL_EDIT_TYPES = ["core.TextInput", "core.Checkbox", "core.Select"];

export function Inspector({ doc, selectedNodeId, onUpdateProps }: InspectorProps) {
  const node = selectedNodeId ? (doc.nodes[selectedNodeId] as FormNode | undefined) : null;
  const [titleValue, setTitleValue] = useState("");
  const [labelValue, setLabelValue] = useState("");

  useEffect(() => {
    if (node) {
      setTitleValue((node.props?.title as string) ?? "");
      setLabelValue((node.props?.label as string) ?? "");
    }
  }, [node]);

  if (!selectedNodeId || !node) {
    return (
      <Box data-testid="inspector" sx={{ p: 2 }}>
        <Typography color="text.secondary">Select a node</Typography>
      </Box>
    );
  }

  const handleTitleChange = (v: string) => {
    setTitleValue(v);
    onUpdateProps(selectedNodeId, { title: v });
  };

  const handleLabelChange = (v: string) => {
    setLabelValue(v);
    onUpdateProps(selectedNodeId, { label: v });
  };

  const canEditTitle = SECTION_TYPES.includes(node.type);
  const canEditLabel = LABEL_EDIT_TYPES.some((t) => node.type === t);

  return (
    <Box data-testid="inspector" sx={{ p: 2, minWidth: 220 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Node ID
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {node.id}
      </Typography>
      <Typography variant="subtitle2" color="text.secondary">
        Type
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {node.type}
      </Typography>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
        props (read-only)
      </Typography>
      <Box
        component="pre"
        sx={{
          fontSize: 11,
          p: 1,
          bgcolor: "action.hover",
          borderRadius: 1,
          overflow: "auto",
          mb: 2,
        }}
      >
        {JSON.stringify(node.props ?? {}, null, 2)}
      </Box>
      {canEditTitle && (
        <TextField
          label="props.title"
          size="small"
          fullWidth
          value={titleValue}
          onChange={(e) => handleTitleChange(e.target.value)}
          inputProps={{ "data-testid": "inspector-prop-title" }}
          sx={{ mb: 1 }}
        />
      )}
      {canEditLabel && (
        <TextField
          label="props.label"
          size="small"
          fullWidth
          value={labelValue}
          onChange={(e) => handleLabelChange(e.target.value)}
          inputProps={{ "data-testid": "inspector-prop-label" }}
        />
      )}
    </Box>
  );
}
