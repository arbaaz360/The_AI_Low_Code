export interface PublishVersionResponse {
  versionId: string;
  schemaVersion: string;
  contentHash: string;
  createdAt: string;
}

export interface PromoteReleaseResponse {
  appKey: string;
  channel: string;
  versionId: string;
  updatedAt: string;
}

export interface ReleaseResponse {
  versionId: string;
  schemaVersion: string;
  contentHash: string;
  updatedAt: string;
}

export interface VersionListItem {
  versionId: string;
  createdAt: string;
  notes?: string;
  contentHash: string;
  schemaVersion: string;
}

export interface PublishClientOptions {
  baseUrl: string;
  tenantId?: string;
  fetchImpl?: typeof fetch;
}

export interface CachedResponse<T> {
  data: T;
  etag: string | null;
  fromCache: boolean;
}

export interface ValidationError {
  error: string;
  details: string[];
}

export interface ConflictError {
  error: string;
  current: PromoteReleaseResponse;
}
