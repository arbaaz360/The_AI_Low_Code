import type { DataSourceDef } from "./types.js";

export interface DataSourceRegistry {
  get(id: string): DataSourceDef | undefined;
  list(): DataSourceDef[];
}

export function createDataSourceRegistry(defs: DataSourceDef[]): DataSourceRegistry {
  const map = new Map<string, DataSourceDef>();
  for (const d of defs) map.set(d.id, d);
  return {
    get: (id) => map.get(id),
    list: () => [...map.values()],
  };
}
