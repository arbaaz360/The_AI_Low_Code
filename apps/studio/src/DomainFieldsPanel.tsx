import React from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import type { DomainField } from "./domainModel.js";

interface DomainFieldsPanelProps {
  fields: DomainField[];
  entityName: string;
  boundFieldNames: Set<string>;
  onAddField: (field: DomainField) => void;
}

export function DomainFieldsPanel({ fields, entityName, boundFieldNames, onAddField }: DomainFieldsPanelProps) {
  if (!entityName) {
    return (
      <Box sx={{ p: 2 }} data-testid="domain-fields-panel">
        <Typography color="text.secondary" variant="body2">
          Set doc.dataContext.entity to load fields
        </Typography>
      </Box>
    );
  }

  if (fields.length === 0) {
    return (
      <Box sx={{ p: 2 }} data-testid="domain-fields-panel">
        <Typography color="text.secondary" variant="body2">
          No fields for entity &quot;{entityName}&quot;
        </Typography>
      </Box>
    );
  }

  return (
    <List dense component="nav" data-testid="domain-fields-panel">
      {fields.map((field) => {
        const alreadyBound = boundFieldNames.has(field.name);
        return (
          <ListItemButton
            key={field.name}
            onClick={() => onAddField(field)}
            data-testid={`domain-field-${field.name}`}
          >
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span>{field.displayName ?? field.name}</span>
                  {alreadyBound && (
                    <Chip label="Bound" size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                  )}
                </Box>
              }
              secondary={`${field.name} · ${field.type}${field.required ? " · required" : ""}`}
              primaryTypographyProps={{ variant: "body2", component: "div" }}
              secondaryTypographyProps={{ variant: "caption" }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
