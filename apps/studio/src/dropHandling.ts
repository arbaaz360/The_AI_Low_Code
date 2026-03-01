import type { FormDoc, FormNode } from "@ai-low-code/engine";
import {
  resolveDrop,
  parseCanvasInsideOverId,
  parseCanvasBeforeOverId,
  parseCanvasAfterOverId,
  resolveCanvasBeforeAfter,
  findParentMap,
  canContain,
} from "@ai-low-code/studio-core";
import type { DragEndEvent } from "@dnd-kit/core";

export interface DropHandlerOptions {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
}

export type ApplyFn = (cmd: { type: "MoveNode"; nodeId: string; parentId: string; index: number }) => void;

/**
 * Processes a drag-end event: outline drops (before-/after-/inside-) and canvas drops (canvas-inside-).
 * Call from DndContext onDragEnd.
 */
export function processDragEnd(
  doc: FormDoc,
  event: DragEndEvent,
  apply: ApplyFn,
  options: DropHandlerOptions
): void {
  const { active, over } = event;
  if (!over) return;
  const activeIdStr = String(active.id);
  const overIdStr = String(over.id);
  const { selectedNodeId, setSelectedNodeId } = options;

  if (activeIdStr === doc.rootNodeId) return;

  // Canvas drop: canvas-inside-{containerId}
  const containerId = parseCanvasInsideOverId(overIdStr);
  if (containerId !== null) {
    const containerNode = doc.nodes[containerId] as FormNode | undefined;
    const movingNode = doc.nodes[activeIdStr] as FormNode | undefined;
    if (!containerNode || !movingNode) return;
    if (!canContain(containerNode.type, movingNode.type)) return;
    const toIndex = (containerNode.children ?? []).length;
    const wasSelected = selectedNodeId === activeIdStr;
    apply({ type: "MoveNode", nodeId: activeIdStr, parentId: containerId, index: toIndex });
    if (wasSelected) setSelectedNodeId(activeIdStr);
    return;
  }

  // Canvas drop: canvas-before-{nodeId} | canvas-after-{nodeId}
  const beforeNodeId = parseCanvasBeforeOverId(overIdStr);
  const afterNodeId = parseCanvasAfterOverId(overIdStr);
  if (beforeNodeId !== null || afterNodeId !== null) {
    const resolved = resolveCanvasBeforeAfter(doc, overIdStr);
    if (!resolved) return;
    const parentNode = doc.nodes[resolved.toParentId] as FormNode | undefined;
    const movingNode = doc.nodes[activeIdStr] as FormNode | undefined;
    if (!parentNode || !movingNode) return;
    if (!canContain(parentNode.type, movingNode.type)) return;

    const parentMap = findParentMap(doc);
    const activeParent = parentMap.get(activeIdStr);
    let toIndex = resolved.toIndex;

    // Same-parent index correction: if fromParentId === toParentId and fromIndex < toIndex, toIndex -= 1
    if (activeParent && activeParent.parentId === resolved.toParentId && activeParent.index < toIndex) {
      toIndex -= 1;
    }

    const wasSelected = selectedNodeId === activeIdStr;
    apply({ type: "MoveNode", nodeId: activeIdStr, parentId: resolved.toParentId, index: toIndex });
    if (wasSelected) setSelectedNodeId(activeIdStr);
    return;
  }

  // Outline drop: before-{id}, after-{id}, inside-{id}
  if (overIdStr.startsWith("inside-") || overIdStr.startsWith("before-") || overIdStr.startsWith("after-")) {
    const placement = overIdStr.startsWith("inside-") ? "inside" : overIdStr.startsWith("before-") ? "before" : "after";
    const resolved = resolveDrop(doc, activeIdStr, overIdStr, placement);
    if (!resolved) return;
    const wasSelected = selectedNodeId === activeIdStr;
    apply({ type: "MoveNode", nodeId: activeIdStr, parentId: resolved.toParentId, index: resolved.toIndex });
    if (wasSelected) setSelectedNodeId(activeIdStr);
  }
}
