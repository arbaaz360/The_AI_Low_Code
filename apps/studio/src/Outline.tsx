import React from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import type { FormDoc } from "@ai-low-code/engine";

interface OutlineProps {
  doc: FormDoc;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

function shortId(id: string): string {
  return id.length > 16 ? id.slice(0, 14) + "…" : id;
}

function OutlineNode({
  doc,
  nodeId,
  selectedNodeId,
  onSelect,
  depth,
}: {
  doc: FormDoc;
  nodeId: string;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const node = doc.nodes[nodeId];
  if (!node) return null;

  const children = (node as { children?: string[] }).children ?? [];
  const isSelected = selectedNodeId === nodeId;

  return (
    <>
      <ListItemButton
        selected={isSelected}
        onClick={() => onSelect(nodeId)}
        sx={{ pl: 2 + depth * 2 }}
      >
        <ListItemText
          primary={`${node.type} (${shortId(nodeId)})`}
          primaryTypographyProps={{ variant: "body2" }}
        />
      </ListItemButton>
      {children.map((cid) => (
        <OutlineNode
          key={cid}
          doc={doc}
          nodeId={cid}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

export function Outline({ doc, selectedNodeId, onSelect }: OutlineProps) {
  return (
    <List dense component="nav" data-testid="outline">
      <OutlineNode
        doc={doc}
        nodeId={doc.rootNodeId}
        selectedNodeId={selectedNodeId}
        onSelect={onSelect}
        depth={0}
      />
    </List>
  );
}
