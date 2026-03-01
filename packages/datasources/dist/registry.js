export function createDataSourceRegistry(defs) {
    const map = new Map();
    for (const d of defs)
        map.set(d.id, d);
    return {
        get: (id) => map.get(id),
        list: () => [...map.values()],
    };
}
