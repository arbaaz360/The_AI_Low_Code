import React, { useRef, useEffect, useState, useCallback } from "react";
import { Provider } from "react-redux";
import Box from "@mui/material/Box";
import { PageRenderer } from "@ai-low-code/renderer";
import { defaultRegistry } from "@ai-low-code/widgets-core";
import { useDroppable } from "@dnd-kit/core";
import type { FormDoc, FormEngine, FormNode } from "@ai-low-code/engine";
import type { ActionRunner } from "@ai-low-code/actions";
import { isContainerType } from "@ai-low-code/studio-core";

interface CanvasProps {
  doc: FormDoc;
  engine: FormEngine;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  mode?: "design" | "runtime";
  actionRunner?: ActionRunner;
}

function getCanvasDropContainerIds(doc: FormDoc): string[] {
  const ids: string[] = [];
  for (const [id, node] of Object.entries(doc.nodes) as [string, FormNode][]) {
    if (!node || id === doc.rootNodeId) continue;
    if (isContainerType(node.type)) ids.push(id);
  }
  return ids;
}

function findParentId(doc: FormDoc, nodeId: string): string | null {
  for (const node of Object.values(doc.nodes) as FormNode[]) {
    if (!node || !(node.children ?? []).includes(nodeId)) continue;
    return node.id;
  }
  return null;
}

function getCanvasBeforeAfterNodeIds(doc: FormDoc): string[] {
  const ids: string[] = [];
  for (const [id, node] of Object.entries(doc.nodes) as [string, FormNode][]) {
    if (!node || id === doc.rootNodeId) continue;
    if (isContainerType(node.type)) continue;
    const parentId = findParentId(doc, id);
    if (!parentId) continue;
    const parent = doc.nodes[parentId] as FormNode | undefined;
    if (!parent || !isContainerType(parent.type)) continue;
    ids.push(id);
  }
  return ids;
}

function CanvasDropOverlay({
  containerId,
  containerRef,
  doc,
}: {
  containerId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  doc: FormDoc;
}) {
  const id = `canvas-inside-${containerId}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-nodeid="${containerId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const cr = containerRef.current.getBoundingClientRect();
    setRect(
      new DOMRect(
        r.left - cr.left + containerRef.current.scrollLeft,
        r.top - cr.top + containerRef.current.scrollTop,
        r.width,
        r.height
      )
    );
  // doc triggers recalculation when layout changes
  }, [containerId, containerRef, doc]);

  useEffect(() => {
    updateRect();
  }, [updateRect]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateRect);
    ro.observe(el);
    el.addEventListener("scroll", updateRect, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateRect);
    };
  }, [updateRect, containerRef]);

  if (!rect) return null;

  return (
    <div
      ref={setNodeRef}
      data-droppable={id}
      data-testid={`canvas-drop-${containerId}`}
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        pointerEvents: "none",
        boxSizing: "border-box",
        border: isOver ? "2px solid #1976d2" : "none",
        backgroundColor: isOver ? "rgba(25, 118, 210, 0.08)" : "transparent",
        transition: "border 0.15s, background-color 0.15s",
      }}
      aria-hidden
    />
  );
}

const ZONE_HEIGHT = 6;

function CanvasBeforeAfterOverlay({
  nodeId,
  containerRef,
  doc,
}: {
  nodeId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  doc: FormDoc;
}) {
  const beforeId = `canvas-before-${nodeId}`;
  const afterId = `canvas-after-${nodeId}`;
  const { setNodeRef: setBeforeRef, isOver: isOverBefore } = useDroppable({ id: beforeId });
  const { setNodeRef: setAfterRef, isOver: isOverAfter } = useDroppable({ id: afterId });
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-nodeid="${nodeId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const cr = containerRef.current.getBoundingClientRect();
    setRect(
      new DOMRect(
        r.left - cr.left + containerRef.current.scrollLeft,
        r.top - cr.top + containerRef.current.scrollTop,
        r.width,
        r.height
      )
    );
  // doc triggers recalculation when layout changes
  }, [nodeId, containerRef, doc]);

  useEffect(() => {
    updateRect();
  }, [updateRect]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateRect);
    ro.observe(el);
    el.addEventListener("scroll", updateRect, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateRect);
    };
  }, [updateRect, containerRef]);

  if (!rect) return null;

  const highlight = (isOver: boolean) =>
    isOver
      ? {
          border: "2px solid #1976d2",
          backgroundColor: "rgba(25, 118, 210, 0.12)",
        }
      : {};

  return (
    <>
      <div
        ref={setBeforeRef}
        data-droppable={beforeId}
        data-testid={`canvas-drop-before-${nodeId}`}
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y - ZONE_HEIGHT,
          width: rect.width,
          height: ZONE_HEIGHT,
          pointerEvents: "none",
          boxSizing: "border-box",
          transition: "border 0.15s, background-color 0.15s",
          ...highlight(isOverBefore),
        }}
        aria-hidden
      />
      <div
        ref={setAfterRef}
        data-droppable={afterId}
        data-testid={`canvas-drop-after-${nodeId}`}
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y + rect.height,
          width: rect.width,
          height: ZONE_HEIGHT,
          pointerEvents: "none",
          boxSizing: "border-box",
          transition: "border 0.15s, background-color 0.15s",
          ...highlight(isOverAfter),
        }}
        aria-hidden
      />
    </>
  );
}

export function Canvas({ doc, engine, selectedNodeId, onSelect, mode = "design", actionRunner }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({ display: "none" });
  const containerIds = React.useMemo(() => getCanvasDropContainerIds(doc), [doc]);
  const beforeAfterNodeIds = React.useMemo(() => getCanvasBeforeAfterNodeIds(doc), [doc]);
  const isDesign = mode === "design";

  const updateOverlay = useCallback(() => {
    if (!isDesign || !selectedNodeId || !containerRef.current) {
      setOverlayStyle({ display: "none" });
      return;
    }
    const el = containerRef.current.querySelector(`[data-nodeid="${selectedNodeId}"]`);
    if (!el) {
      setOverlayStyle({ display: "none" });
      return;
    }
    const rect = el.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setOverlayStyle({
      position: "absolute",
      left: rect.left - containerRect.left + containerRef.current.scrollLeft,
      top: rect.top - containerRect.top + containerRef.current.scrollTop,
      width: rect.width,
      height: rect.height,
      border: "2px solid #1976d2",
      pointerEvents: "none",
      boxSizing: "border-box",
    });
  }, [selectedNodeId, doc, isDesign]);

  useEffect(() => {
    updateOverlay();
  }, [updateOverlay]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateOverlay);
    ro.observe(el);
    el.addEventListener("scroll", updateOverlay, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateOverlay);
    };
  }, [updateOverlay]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!isDesign) return;
    const target = (e.target as HTMLElement).closest("[data-nodeid]");
    if (target) {
      const nodeId = target.getAttribute("data-nodeid");
      if (nodeId) onSelect(nodeId);
    }
  };

  return (
    <Box
      ref={containerRef}
      data-testid="canvas"
      sx={{
        flex: 1,
        overflow: "auto",
        position: "relative",
        p: 2,
        bgcolor: isDesign ? "#f8f9fa" : "background.paper",
      }}
      onClick={handleCanvasClick}
    >
      <Box sx={isDesign ? {} : { maxWidth: 800, mx: "auto" }}>
        <Provider store={engine.store}>
          <PageRenderer doc={doc} engine={engine} registry={defaultRegistry} mode={mode} actionRunner={actionRunner} />
        </Provider>
      </Box>
      {isDesign && (
        <>
          <div data-testid="selection-overlay" style={overlayStyle} aria-hidden />
          {containerIds.map((cid) => (
            <CanvasDropOverlay key={`inside-${cid}`} containerId={cid} containerRef={containerRef} doc={doc} />
          ))}
          {beforeAfterNodeIds.map((nid) => (
            <CanvasBeforeAfterOverlay key={`ba-${nid}`} nodeId={nid} containerRef={containerRef} doc={doc} />
          ))}
        </>
      )}
    </Box>
  );
}
