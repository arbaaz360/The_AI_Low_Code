export interface MockDataSourceDef {
    id: string;
    kind: "mock";
    name?: string;
    response: unknown;
    delayMs?: number;
    failRate?: number;
}
export interface RestDataSourceDef {
    id: string;
    kind: "rest";
    name?: string;
    method: "GET" | "POST";
    url: string;
}
export type DataSourceDef = MockDataSourceDef | RestDataSourceDef;
export interface DataSourceRequest {
    requestId: string;
    dataSourceId: string;
    status: "idle" | "loading" | "success" | "error";
    startedAt: number;
    finishedAt?: number;
    error?: string;
}
export interface DataStore {
    byKey: Record<string, unknown>;
    requests: Record<string, DataSourceRequest>;
}
//# sourceMappingURL=types.d.ts.map