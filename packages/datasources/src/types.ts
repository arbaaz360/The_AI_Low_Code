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

export interface DataSourceError {
  kind: "network" | "server" | "validation" | "abort";
  message: string;
  fieldErrors?: Record<string, string>;
  formError?: string;
  status?: number;
}

export function isDataSourceError(e: unknown): e is DataSourceError {
  return e != null && typeof e === "object" && "kind" in (e as Record<string, unknown>);
}
