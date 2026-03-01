import type { DataSourceDef } from "./types.js";
export interface DataSourceRegistry {
    get(id: string): DataSourceDef | undefined;
    list(): DataSourceDef[];
}
export declare function createDataSourceRegistry(defs: DataSourceDef[]): DataSourceRegistry;
//# sourceMappingURL=registry.d.ts.map