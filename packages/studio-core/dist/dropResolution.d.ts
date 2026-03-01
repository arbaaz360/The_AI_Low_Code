import type { FormDoc } from "@ai-low-code/engine";
export interface ParentInfo {
    parentId: string;
    index: number;
}
/**
 * Builds a map of nodeId -> { parentId, index } for all nodes except root.
 */
export declare function findParentMap(doc: FormDoc): Map<string, ParentInfo>;
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
export declare function resolveDrop(doc: FormDoc, activeId: string, overId: string, placement: DropPlacement): ResolvedDrop | null;
/**
 * Parses canvas inside droppable id to container node id.
 * "canvas-inside-abc" => "abc"
 * Returns null if not a canvas-inside id.
 */
export declare function parseCanvasInsideOverId(overId: string): string | null;
/**
 * Parses canvas-before droppable id to node id.
 * "canvas-before-abc" => "abc"
 */
export declare function parseCanvasBeforeOverId(overId: string): string | null;
/**
 * Parses canvas-after droppable id to node id.
 * "canvas-after-abc" => "abc"
 */
export declare function parseCanvasAfterOverId(overId: string): string | null;
/**
 * Resolves canvas before/after drop to target parent and index.
 * Uses findParentMap for ref node. Returns null if ref node missing or is root.
 */
export declare function resolveCanvasBeforeAfter(doc: FormDoc, overId: string): ResolvedDrop | null;
/**
 * Returns true if candidateId is a descendant of ancestorId (or equal).
 * Used to prevent moving a node into its own subtree: if targetParent is a descendant
 * of movingNode, we would create a cycle.
 */
export declare function isDescendant(doc: FormDoc, ancestorId: string, candidateId: string): boolean;
//# sourceMappingURL=dropResolution.d.ts.map