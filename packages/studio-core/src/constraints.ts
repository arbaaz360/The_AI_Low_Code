/** Container types that can have children. Leaf widgets cannot. */
const CONTAINER_TYPES = new Set([
  "layout.FormGrid",
  "FormGrid",
  "core.Section",
  "Section",
  "layout.Stack",
  "Stack",
]);

/** Leaf widget types that cannot contain children. */
const LEAF_TYPES = new Set([
  "core.TextInput",
  "core.Checkbox",
  "core.Select",
  "core.RadioGroup",
]);

/**
 * Returns true if the type is a container (can have children).
 */
export function isContainerType(type: string): boolean {
  return CONTAINER_TYPES.has(type);
}

/**
 * Returns true if parentType can contain childType as a direct child.
 * Containers can contain any node type. Leaf widgets cannot contain children.
 */
export function canContain(parentType: string, childType: string): boolean {
  if (LEAF_TYPES.has(parentType)) return false;
  if (CONTAINER_TYPES.has(parentType)) return true;
  // Unknown types: treat as non-container (conservative)
  return false;
}

/** Types that support grid layout (12-col) for child span editing. */
const GRID_CONTAINER_TYPES = new Set([
  "layout.FormGrid",
  "FormGrid",
  "core.Section",
  "Section",
]);

/**
 * Returns true if the type is a grid container (supports layout.span for children).
 * Used by Inspector to show Layout section, and potentially drop rules.
 */
export function isGridContainerType(type: string): boolean {
  return GRID_CONTAINER_TYPES.has(type);
}
