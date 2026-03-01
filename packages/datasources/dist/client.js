function deepClone(val) {
    return JSON.parse(JSON.stringify(val));
}
function delay(ms, signal) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
        });
    });
}
async function executeMock(def, signal) {
    if (def.delayMs && def.delayMs > 0) {
        await delay(def.delayMs, signal);
    }
    if (def.failRate != null && def.failRate > 0 && Math.random() < def.failRate) {
        throw new Error(`Mock datasource "${def.id}" simulated failure`);
    }
    return deepClone(def.response);
}
async function executeRest(def, fetchImpl, args, signal) {
    let url = def.url;
    if (args) {
        for (const [k, v] of Object.entries(args)) {
            url = url.replace(`{${k}}`, encodeURIComponent(String(v)));
        }
    }
    const res = await fetchImpl(url, {
        method: def.method,
        signal,
        headers: def.method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: def.method === "POST" && args ? JSON.stringify(args) : undefined,
    });
    if (!res.ok)
        throw new Error(`REST datasource "${def.id}" failed: ${res.status}`);
    return res.json();
}
export function createDataSourceClient(deps) {
    const { registry, fetchImpl = globalThis.fetch } = deps;
    return {
        async execute({ dataSourceId, args, signal }) {
            const def = registry.get(dataSourceId);
            if (!def)
                throw new Error(`DataSource "${dataSourceId}" not found`);
            switch (def.kind) {
                case "mock":
                    return executeMock(def, signal);
                case "rest":
                    return executeRest(def, fetchImpl, args, signal);
                default:
                    throw new Error(`Unknown datasource kind: ${def.kind}`);
            }
        },
    };
}
