import type { FormDoc, FormNode } from "@ai-low-code/engine";
import type { Command, ApplyResult, Diagnostic } from "./types.js";
import { validateInvariants } from "./invariants.js";

/**
 * Applies a command to the doc. Returns new doc and any diagnostics.
 * Does not mutate the input doc.
 */
export function applyCommand(doc: FormDoc, command: Command): ApplyResult {
  let newDoc: FormDoc;
  const diagnostics: Diagnostic[] = [];

  switch (command.type) {
    case "UpdateProps":
      newDoc = applyUpdateProps(doc, command.nodeId, command.partialProps);
      break;
    case "AddNode":
      newDoc = applyAddNode(doc, command.node, command.parentId, command.index);
      if (!doc.nodes[command.parentId]) {
        diagnostics.push({
          code: "ADD_NODE_PARENT_MISSING",
          message: `Parent "${command.parentId}" does not exist`,
          nodeId: command.node.id,
          path: `nodes.${command.parentId}`,
        });
      }
      break;
    case "RemoveNode":
      newDoc = applyRemoveNode(doc, command.nodeId, command.deleteSubtree ?? true);
      if (command.nodeId === doc.rootNodeId) {
        diagnostics.push({
          code: "REMOVE_NODE_ROOT",
          message: "Cannot remove root node",
          nodeId: command.nodeId,
        });
        return { doc: doc, diagnostics };
      }
      break;
    case "MoveNode":
      newDoc = applyMoveNode(doc, command.nodeId, command.parentId, command.index);
      break;
    default: {
      const _: never = command;
      return { doc, diagnostics: [] };
    }
  }

  const invariantDiag = validateInvariants(newDoc);
  return {
    doc: newDoc,
    diagnostics: [...diagnostics, ...invariantDiag],
  };
}

function applyUpdateProps(
  doc: FormDoc,
  nodeId: string,
  partialProps: Record<string, unknown>
): FormDoc {
  const node = doc.nodes[nodeId];
  if (!node) return doc;

  const mergedProps = { ...(node.props ?? {}), ...partialProps };
  const newNode: FormNode = { ...node, props: mergedProps };
  const newNodes = { ...doc.nodes, [nodeId]: newNode };
  return { ...doc, nodes: newNodes };
}

function applyAddNode(doc: FormDoc, node: FormNode, parentId: string, index: number): FormDoc {
  const parent = doc.nodes[parentId];
  if (!parent) return doc;

  const children = [...(parent.children ?? [])];
  const safeIndex = Math.max(0, Math.min(index, children.length));
  children.splice(safeIndex, 0, node.id);

  const newParent: FormNode = { ...parent, children };
  const newNodes = {
    ...doc.nodes,
    [parentId]: newParent,
    [node.id]: node,
  };
  return { ...doc, nodes: newNodes };
}

function collectSubtreeIds(doc: FormDoc, nodeId: string): Set<string> {
  const result = new Set<string>([nodeId]);
  const node = doc.nodes[nodeId];
  if (!node) return result;
  for (const cid of node.children ?? []) {
    for (const id of collectSubtreeIds(doc, cid)) {
      result.add(id);
    }
  }
  return result;
}

function applyRemoveNode(doc: FormDoc, nodeId: string, deleteSubtree: boolean): FormDoc {
  if (nodeId === doc.rootNodeId) return doc;

  const toRemove = deleteSubtree ? collectSubtreeIds(doc, nodeId) : new Set([nodeId]);
  const parent = findParentNode(doc, nodeId);
  if (!parent) return doc;

  const newNodes = { ...doc.nodes };
  for (const id of toRemove) {
    delete newNodes[id];
  }

  const newParent = { ...parent };
  newParent.children = (parent.children ?? []).filter((cid) => !toRemove.has(cid));
  newNodes[parent.id] = newParent;

  return { ...doc, nodes: newNodes };
}

function findParentNode(doc: FormDoc, nodeId: string): FormNode | null {
  for (const node of Object.values(doc.nodes) as FormNode[]) {
    if (!node) continue;
    if ((node.children ?? []).includes(nodeId)) return node;
  }
  return null;
}

function applyMoveNode(doc: FormDoc, nodeId: string, parentId: string, index: number): FormDoc {
  const oldParent = findParentNode(doc, nodeId);
  if (!oldParent) return doc;

  const newParent = doc.nodes[parentId] as FormNode | undefined;
  if (!newParent) return doc;

  // Remove from old parent
  const oldChildren = [...(oldParent.children ?? [])];
  const oldIdx = oldChildren.indexOf(nodeId);
  if (oldIdx === -1) return doc;
  oldChildren.splice(oldIdx, 1);

  const newNodes = { ...doc.nodes };
  newNodes[oldParent.id] = { ...oldParent, children: oldChildren };

  // Insert into new parent - use already-modified children when same parent
  const baseChildren =
    oldParent.id === parentId ? newNodes[parentId]!.children ?? [] : newParent.children ?? [];
  const newChildren = [...baseChildren];
  const safeIndex = Math.max(0, Math.min(index, newChildren.length));
  newChildren.splice(safeIndex, 0, nodeId);

  newNodes[parentId] = { ...newNodes[parentId] ?? newParent, children: newChildren };

  return { ...doc, nodes: newNodes };
}
