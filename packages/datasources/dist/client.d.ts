import type { DataSourceRegistry } from "./registry.js";
export interface DataSourceClientDeps {
    registry: DataSourceRegistry;
    fetchImpl?: typeof globalThis.fetch;
}
export interface DataSourceClient {
    execute(opts: {
        dataSourceId: string;
        args?: Record<string, unknown>;
        signal?: AbortSignal;
    }): Promise<unknown>;
}
export declare function createDataSourceClient(deps: DataSourceClientDeps): DataSourceClient;
//# sourceMappingURL=client.d.ts.map