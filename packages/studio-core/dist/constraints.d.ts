/**
 * Returns true if the type is a container (can have children).
 */
export declare function isContainerType(type: string): boolean;
/**
 * Returns true if parentType can contain childType as a direct child.
 * Containers can contain any node type. Leaf widgets cannot contain children.
 */
export declare function canContain(parentType: string, childType: string): boolean;
/**
 * Returns true if the type is a grid container (supports layout.span for children).
 * Used by Inspector to show Layout section, and potentially drop rules.
 */
export declare function isGridContainerType(type: string): boolean;
//# sourceMappingURL=constraints.d.ts.map