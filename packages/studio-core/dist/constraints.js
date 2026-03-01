/** Container types that can have children. Leaf widgets cannot. */
const CONTAINER_TYPES = new Set([
    "layout.FormGrid",
    "FormGrid",
    "layout.Section",
    "core.Section",
    "Section",
    "layout.Stack",
    "Stack",
]);
/** Leaf widget types that cannot contain children. */
const LEAF_TYPES = new Set([
    "core.TextInput",
    "core.TextArea",
    "core.NumberInput",
    "core.DateInput",
    "core.Checkbox",
    "core.Switch",
    "core.Select",
    "core.RadioGroup",
    "core.Button",
]);
/**
 * Returns true if the type is a container (can have children).
 */
export function isContainerType(type) {
    return CONTAINER_TYPES.has(type);
}
/**
 * Returns true if parentType can contain childType as a direct child.
 * Containers can contain any node type. Leaf widgets cannot contain children.
 */
export function canContain(parentType, childType) {
    if (LEAF_TYPES.has(parentType))
        return false;
    if (CONTAINER_TYPES.has(parentType))
        return true;
    return false;
}
/** Types that support grid layout (12-col) for child span editing. */
const GRID_CONTAINER_TYPES = new Set([
    "layout.FormGrid",
    "FormGrid",
    "layout.Section",
    "core.Section",
    "Section",
]);
/**
 * Returns true if the type is a grid container (supports layout.span for children).
 */
export function isGridContainerType(type) {
    return GRID_CONTAINER_TYPES.has(type);
}
