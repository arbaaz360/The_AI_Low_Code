/**
 * Extract all value binding paths from FormDoc.
 */
export function extractValuePaths(formDoc) {
    const paths = new Set();
    for (const node of Object.values(formDoc.nodes)) {
        const valueBinding = node?.bindings?.value;
        if (typeof valueBinding === "string") {
            paths.add(valueBinding);
        }
    }
    return Array.from(paths);
}
