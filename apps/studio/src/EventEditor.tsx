import React, { useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import type { Action, NodeEventName } from "@ai-low-code/actions";

const EVENT_NAMES_BY_WIDGET: Record<string, NodeEventName[]> = {
  "core.TextInput": ["onChange", "onBlur"],
  "core.TextArea": ["onChange", "onBlur"],
  "core.NumberInput": ["onChange", "onBlur"],
  "core.DateInput": ["onChange", "onBlur"],
  "core.Select": ["onChange"],
  "core.Checkbox": ["onChange"],
  "core.Switch": ["onChange"],
  "core.RadioGroup": ["onChange"],
  "core.Button": ["onClick"],
};

const ADDABLE_ACTION_TYPES: { type: string; label: string }[] = [
  { type: "SetValue", label: "Set Value" },
  { type: "Toast", label: "Toast" },
  { type: "Navigate", label: "Navigate" },
  { type: "ValidateForm", label: "Validate Form" },
];

function defaultAction(type: string): Action {
  switch (type) {
    case "SetValue":
      return { type: "SetValue", path: "form.values.", value: { $event: "value" } };
    case "Toast":
      return { type: "Toast", message: "", severity: "success" };
    case "Navigate":
      return { type: "Navigate", to: "/" };
    case "ValidateForm":
      return { type: "ValidateForm" };
    default:
      return { type: "ValidateForm" };
  }
}

function ActionEditor({
  action,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  action: Action;
  index: number;
  total: number;
  onChange: (updated: Action) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1, mb: 0.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>
          {action.type}
        </Typography>
        <IconButton size="small" onClick={onMoveUp} disabled={index === 0} sx={{ p: 0.25, fontSize: "0.7rem" }}>▲</IconButton>
        <IconButton size="small" onClick={onMoveDown} disabled={index === total - 1} sx={{ p: 0.25, fontSize: "0.7rem" }}>▼</IconButton>
        <IconButton size="small" onClick={onDelete} sx={{ p: 0.25, fontSize: "0.7rem", color: "error.main" }}>✕</IconButton>
      </Box>

      {action.type === "SetValue" && (
        <>
          <TextField
            label="Path"
            size="small"
            fullWidth
            value={action.path}
            onChange={(e) => onChange({ ...action, path: e.target.value })}
            sx={{ mb: 0.5 }}
          />
          <FormControl size="small" fullWidth sx={{ mb: 0.5 }}>
            <InputLabel>Value source</InputLabel>
            <Select
              label="Value source"
              value={
                action.value && typeof action.value === "object" && "$event" in (action.value as Record<string, unknown>)
                  ? (action.value as { $event: string }).$event
                  : "__literal__"
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__literal__") {
                  onChange({ ...action, value: "" });
                } else {
                  onChange({ ...action, value: { $event: v as "value" | "checked" } });
                }
              }}
            >
              <MenuItem value="value">Event value</MenuItem>
              <MenuItem value="checked">Event checked</MenuItem>
              <MenuItem value="__literal__">Literal</MenuItem>
            </Select>
          </FormControl>
          {action.value != null &&
            typeof action.value !== "object" && (
              <TextField
                label="Literal value"
                size="small"
                fullWidth
                value={String(action.value)}
                onChange={(e) => onChange({ ...action, value: e.target.value })}
              />
            )}
        </>
      )}

      {action.type === "Toast" && (
        <>
          <TextField
            label="Message"
            size="small"
            fullWidth
            value={typeof action.message === "string" ? action.message : ""}
            onChange={(e) => onChange({ ...action, message: e.target.value })}
            sx={{ mb: 0.5 }}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Severity</InputLabel>
            <Select
              label="Severity"
              value={action.severity ?? "info"}
              onChange={(e) => onChange({ ...action, severity: e.target.value as "success" | "info" | "warning" | "error" })}
            >
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="error">Error</MenuItem>
            </Select>
          </FormControl>
        </>
      )}

      {action.type === "Navigate" && (
        <TextField
          label="Navigate to"
          size="small"
          fullWidth
          value={typeof action.to === "string" ? action.to : ""}
          onChange={(e) => onChange({ ...action, to: e.target.value })}
        />
      )}

      {action.type === "ValidateForm" && (
        <Typography variant="caption" color="text.secondary">
          Triggers form validation
        </Typography>
      )}
    </Paper>
  );
}

interface EventEditorProps {
  nodeType: string;
  events: Record<string, unknown[]> | undefined;
  onUpdateEvents: (events: Record<string, unknown[]>) => void;
}

export function EventEditor({ nodeType, events, onUpdateEvents }: EventEditorProps) {
  const supportedEvents = EVENT_NAMES_BY_WIDGET[nodeType] ?? [];

  const getActions = useCallback(
    (eventName: string): Action[] => {
      return (events?.[eventName] as Action[] | undefined) ?? [];
    },
    [events]
  );

  const setActions = useCallback(
    (eventName: string, actions: Action[]) => {
      onUpdateEvents({ ...events, [eventName]: actions });
    },
    [events, onUpdateEvents]
  );

  if (supportedEvents.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
        Events
      </Typography>
      {supportedEvents.map((eventName) => {
        const actions = getActions(eventName);
        return (
          <Box key={eventName} sx={{ mb: 1.5 }} data-testid={`event-${eventName}`}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>
                {eventName}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select
                  displayEmpty
                  value=""
                  onChange={(e) => {
                    const type = e.target.value;
                    if (!type) return;
                    setActions(eventName, [...actions, defaultAction(type)]);
                  }}
                  renderValue={() => "+ Action"}
                  sx={{ fontSize: "0.7rem", height: 24 }}
                  data-testid={`event-${eventName}-add`}
                >
                  {ADDABLE_ACTION_TYPES.map((at) => (
                    <MenuItem key={at.type} value={at.type}>{at.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {actions.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                No actions configured
              </Typography>
            )}

            {actions.map((action, i) => (
              <ActionEditor
                key={i}
                action={action}
                index={i}
                total={actions.length}
                onChange={(updated) => {
                  const next = [...actions];
                  next[i] = updated;
                  setActions(eventName, next);
                }}
                onDelete={() => {
                  const next = actions.filter((_, j) => j !== i);
                  setActions(eventName, next);
                }}
                onMoveUp={() => {
                  if (i === 0) return;
                  const next = [...actions];
                  [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                  setActions(eventName, next);
                }}
                onMoveDown={() => {
                  if (i === actions.length - 1) return;
                  const next = [...actions];
                  [next[i], next[i + 1]] = [next[i + 1]!, next[i]!];
                  setActions(eventName, next);
                }}
              />
            ))}
            <Divider sx={{ mt: 0.5 }} />
          </Box>
        );
      })}
    </Box>
  );
}
