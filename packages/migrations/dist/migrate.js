export const CURRENT_SCHEMA_VERSION = "1.1";
const LEGACY_WIDGET_MAP = {
    FormGrid: "layout.FormGrid",
    Section: "layout.Section",
    "core.Section": "layout.Section",
    Stack: "layout.Stack",
};
function migrate_1_0_to_1_1(doc, warnings) {
    const nodes = doc.nodes;
    if (!nodes)
        return;
    for (const [nodeId, node] of Object.entries(nodes)) {
        if (!node || typeof node !== "object")
            continue;
        const canonical = LEGACY_WIDGET_MAP[node.type];
        if (canonical) {
            warnings.push(`Node "${nodeId}": migrated widget type "${node.type}" → "${canonical}"`);
            node.type = canonical;
        }
    }
    doc.schemaVersion = "1.1";
}
const MIGRATIONS = [
    { from: "1.0", to: "1.1", fn: migrate_1_0_to_1_1 },
];
export function migrateFormDoc(doc) {
    if (!doc || typeof doc !== "object") {
        return { doc: doc, from: "unknown", to: "unknown", warnings: [], migrated: false };
    }
    const d = structuredClone(doc);
    const originalVersion = typeof d.schemaVersion === "string" ? d.schemaVersion : "1.0";
    const warnings = [];
    let currentVersion = originalVersion;
    let didMigrate = false;
    for (const m of MIGRATIONS) {
        if (currentVersion === m.from) {
            m.fn(d, warnings);
            currentVersion = m.to;
            didMigrate = true;
        }
    }
    if (!d.schemaVersion) {
        d.schemaVersion = CURRENT_SCHEMA_VERSION;
    }
    return {
        doc: d,
        from: originalVersion,
        to: currentVersion,
        warnings,
        migrated: didMigrate,
    };
}
