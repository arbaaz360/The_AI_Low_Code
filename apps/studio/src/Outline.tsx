import React from "react";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { FormDoc, FormNode } from "@ai-low-code/engine";
import { isContainerType } from "@ai-low-code/studio-core";

interface OutlineProps {
  doc: FormDoc;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

function shortId(id: string): string {
  return id.length > 16 ? id.slice(0, 14) + "…" : id;
}

function OutlineRow({
  doc,
  nodeId,
  selectedNodeId,
  onSelect,
  depth,
  isRoot,
}: {
  doc: FormDoc;
  nodeId: string;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
  depth: number;
  isRoot: boolean;
}) {
  const node = doc.nodes[nodeId] as FormNode | undefined;
  if (!node) return null;

  const children = node.children ?? [];
  const isSelected = selectedNodeId === nodeId;
  const isContainer = isContainerType(node.type);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: nodeId,
    data: { nodeId },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `inside-${nodeId}`,
    data: { nodeId },
  });

  const mergeRefs = (el: HTMLElement | null) => {
    setDragRef(el);
    if (isContainer) setDropRef(el);
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "stretch",
          opacity: isDragging ? 0.5 : 1,
        }}
      >
        {/* Before drop zone */}
        <DropZone
          id={`before-${nodeId}`}
          isBefore
          sx={{ minHeight: 24, flex: "0 0 8px" }}
        />
        {/* Row content - draggable, and droppable "inside" when container */}
        <ListItemButton
          ref={mergeRefs}
          selected={isSelected}
          onClick={() => onSelect(nodeId)}
          sx={{
            pl: 2 + depth * 2,
            flex: 1,
            py: 0.25,
            bgcolor: isOver && isContainer ? "action.selected" : undefined,
          }}
        >
          {!isRoot && (
            <Box
              component="span"
              {...listeners}
              {...attributes}
              sx={{
                cursor: "grab",
                mr: 1,
                touchAction: "none",
                "&:active": { cursor: "grabbing" },
              }}
              data-testid={`outline-drag-handle-${nodeId}`}
            >
              ⋮⋮
            </Box>
          )}
          <ListItemText
            primary={`${node.type} (${shortId(nodeId)})`}
            primaryTypographyProps={{ variant: "body2" }}
          />
        </ListItemButton>
        {/* After drop zone */}
        <DropZone
          id={`after-${nodeId}`}
          isAfter
          sx={{ minHeight: 24, flex: "0 0 8px" }}
        />
      </Box>
      {children.map((cid) => (
        <OutlineRow
          key={cid}
          doc={doc}
          nodeId={cid}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          depth={depth + 1}
          isRoot={false}
        />
      ))}
    </Box>
  );
}

function DropZone({
  id,
  sx,
  isBefore,
  isAfter,
}: {
  id: string;
  sx?: React.CSSProperties;
  isBefore?: boolean;
  isAfter?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        ...sx,
        position: "relative",
        bgcolor: isOver && !isBefore && !isAfter ? "action.selected" : "transparent",
        transition: "background-color 0.15s",
        "&::after": isOver && (isBefore || isAfter)
          ? {
              content: '""',
              position: "absolute",
              left: 0,
              right: 0,
              [isBefore ? "top" : "bottom"]: 0,
              height: 2,
              bgcolor: "primary.main",
            }
          : undefined,
      }}
      data-droppable={id}
    />
  );
}

export function Outline({ doc, selectedNodeId, onSelect }: OutlineProps) {
  return (
    <List dense component="nav" data-testid="outline">
      <OutlineRow
        doc={doc}
        nodeId={doc.rootNodeId}
        selectedNodeId={selectedNodeId}
        onSelect={onSelect}
        depth={0}
        isRoot={true}
      />
    </List>
  );
}
