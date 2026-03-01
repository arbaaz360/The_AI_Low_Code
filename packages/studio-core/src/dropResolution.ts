import type { FormDoc, FormNode } from "@ai-low-code/engine";
import { isContainerType } from "./constraints.js";

export interface ParentInfo {
  parentId: string;
  index: number;
}

/**
 * Builds a map of nodeId -> { parentId, index } for all nodes except root.
 */
export function findParentMap(doc: FormDoc): Map<string, ParentInfo> {
  const map = new Map<string, ParentInfo>();
  for (const node of Object.values(doc.nodes) as FormNode[]) {
    if (!node) continue;
    const children = node.children ?? [];
    children.forEach((cid, i) => {
      map.set(cid, { parentId: node.id, index: i });
    });
  }
  return map;
}

export type DropPlacement = "before" | "after" | "inside";

export interface ResolvedDrop {
  toParentId: string;
  toIndex: number;
}

/**
 * Resolves a drop (activeId onto overId with placement) to target parent and index.
 * overId format: "before-{nodeId}" | "after-{nodeId}" | "inside-{nodeId}"
 * Returns null if drop is invalid (e.g. overId malformed, active is root).
 */
export function resolveDrop(
  doc: FormDoc,
  activeId: string,
  overId: string,
  placement: DropPlacement
): ResolvedDrop | null {
  if (activeId === doc.rootNodeId) return null;

  const parentMap = findParentMap(doc);
  const activeParent = parentMap.get(activeId);
  if (!activeParent && activeId !== doc.rootNodeId) return null;

  // overId is the raw droppable id: "before-X", "after-X", "inside-X"
  let refId: string;
  let actualPlacement: DropPlacement;
  if (overId.startsWith("before-")) {
    refId = overId.slice(7);
    actualPlacement = "before";
  } else if (overId.startsWith("after-")) {
    refId = overId.slice(6);
    actualPlacement = "after";
  } else if (overId.startsWith("inside-")) {
    refId = overId.slice(7);
    actualPlacement = "inside";
  } else {
    // Legacy: overId might be plain nodeId, treat as "inside" for containers, "after" for leaves
    refId = overId;
    actualPlacement = placement;
  }

  const refNode = doc.nodes[refId] as FormNode | undefined;
  if (!refNode) return null;

  if (actualPlacement === "inside") {
    if (!isContainerType(refNode.type)) return null;
    const children = refNode.children ?? [];
    return { toParentId: refId, toIndex: children.length };
  }

  const refParent = parentMap.get(refId);
  let toParentId: string;
  let refIndex: number;

  if (refId === doc.rootNodeId) {
    toParentId = doc.rootNodeId;
    const rootChildren = (doc.nodes[doc.rootNodeId] as FormNode)?.children ?? [];
    refIndex = actualPlacement === "before" ? 0 : rootChildren.length;
  } else if (refParent) {
    toParentId = refParent.parentId;
    const refParentNode = doc.nodes[refParent.parentId] as FormNode | undefined;
    if (!refParentNode) return null;
    refIndex = (refParentNode.children ?? []).indexOf(refId);
    if (refIndex === -1) return null;
  } else {
    return null;
  }

  if (actualPlacement === "before") {
    return { toParentId, toIndex: refIndex };
  }
  if (refId === doc.rootNodeId) {
    return { toParentId, toIndex: refIndex };
  }
  return { toParentId, toIndex: refIndex + 1 };
}

const CANVAS_INSIDE_PREFIX = "canvas-inside-";
const CANVAS_BEFORE_PREFIX = "canvas-before-";
const CANVAS_AFTER_PREFIX = "canvas-after-";

/**
 * Parses canvas inside droppable id to container node id.
 * "canvas-inside-abc" => "abc"
 * Returns null if not a canvas-inside id.
 */
export function parseCanvasInsideOverId(overId: string): string | null {
  if (typeof overId !== "string" || !overId.startsWith(CANVAS_INSIDE_PREFIX)) return null;
  return overId.slice(CANVAS_INSIDE_PREFIX.length);
}

/**
 * Parses canvas-before droppable id to node id.
 * "canvas-before-abc" => "abc"
 */
export function parseCanvasBeforeOverId(overId: string): string | null {
  if (typeof overId !== "string" || !overId.startsWith(CANVAS_BEFORE_PREFIX)) return null;
  return overId.slice(CANVAS_BEFORE_PREFIX.length);
}

/**
 * Parses canvas-after droppable id to node id.
 * "canvas-after-abc" => "abc"
 */
export function parseCanvasAfterOverId(overId: string): string | null {
  if (typeof overId !== "string" || !overId.startsWith(CANVAS_AFTER_PREFIX)) return null;
  return overId.slice(CANVAS_AFTER_PREFIX.length);
}

/**
 * Resolves canvas before/after drop to target parent and index.
 * Uses findParentMap for ref node. Returns null if ref node missing or is root.
 */
export function resolveCanvasBeforeAfter(
  doc: FormDoc,
  overId: string
): ResolvedDrop | null {
  let refId: string;
  let toIndex: number;

  if (overId.startsWith(CANVAS_BEFORE_PREFIX)) {
    refId = overId.slice(CANVAS_BEFORE_PREFIX.length);
    toIndex = 0; // placeholder, computed below
  } else if (overId.startsWith(CANVAS_AFTER_PREFIX)) {
    refId = overId.slice(CANVAS_AFTER_PREFIX.length);
    toIndex = 1; // placeholder
  } else {
    return null;
  }

  const refNode = doc.nodes[refId] as FormNode | undefined;
  if (!refNode) return null;

  const parentMap = findParentMap(doc);
  const refParent = parentMap.get(refId);
  if (!refParent) return null; // ref is root, no before/after

  const parentNode = doc.nodes[refParent.parentId] as FormNode | undefined;
  if (!parentNode) return null;
  const refIndex = (parentNode.children ?? []).indexOf(refId);
  if (refIndex === -1) return null;

  toIndex = overId.startsWith(CANVAS_BEFORE_PREFIX) ? refIndex : refIndex + 1;

  return { toParentId: refParent.parentId, toIndex };
}

/**
 * Returns true if candidateId is a descendant of ancestorId (or equal).
 * Used to prevent moving a node into its own subtree: if targetParent is a descendant
 * of movingNode, we would create a cycle.
 */
export function isDescendant(doc: FormDoc, ancestorId: string, candidateId: string): boolean {
  if (candidateId === ancestorId) return true;
  const parentMap = findParentMap(doc);
  let current: string | undefined = candidateId;
  while (current) {
    const info = parentMap.get(current);
    if (!info) break;
    if (info.parentId === ancestorId) return true;
    current = info.parentId;
  }
  return false;
}
