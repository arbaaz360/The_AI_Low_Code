import React, { useRef, useEffect, useState, useCallback } from "react";
import { Provider } from "react-redux";
import Box from "@mui/material/Box";
import { PageRenderer } from "@ai-low-code/renderer";
import { defaultRegistry } from "@ai-low-code/widgets-core";
import type { FormDoc, FormEngine } from "@ai-low-code/engine";

interface CanvasProps {
  doc: FormDoc;
  engine: FormEngine;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

export function Canvas({ doc, engine, selectedNodeId, onSelect }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({ display: "none" });

  const updateOverlay = useCallback(() => {
    if (!selectedNodeId || !containerRef.current) {
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
  }, [selectedNodeId]);

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
      }}
      onClick={handleCanvasClick}
    >
      <Provider store={engine.store}>
        <PageRenderer doc={doc} engine={engine} registry={defaultRegistry} mode="design" />
      </Provider>
      <div
        data-testid="selection-overlay"
        style={overlayStyle}
        aria-hidden
      />
    </Box>
  );
}
