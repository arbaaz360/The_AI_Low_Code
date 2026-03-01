import type {
  PublishVersionResponse,
  PromoteReleaseResponse,
  ReleaseResponse,
  VersionListItem,
  PublishClientOptions,
  CachedResponse,
  ValidationError,
  ConflictError,
} from "./types.js";

export class PublishClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public validation?: ValidationError,
    public conflict?: ConflictError,
  ) {
    super(message);
    this.name = "PublishClientError";
  }
}

function generateCorrelationId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

export function createPublishClient(options: PublishClientOptions) {
  const { baseUrl } = options;
  const tenantId = options.tenantId ?? "default";
  const fetchFn = options.fetchImpl ?? globalThis.fetch;

  const etagCache = new Map<string, { etag: string; data: unknown }>();

  function basePath(appKey: string): string {
    return `/v1/tenants/${tenantId}/apps/${appKey}`;
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    useEtag = false,
    extraHeaders?: Record<string, string>,
  ): Promise<CachedResponse<T>> {
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      "X-Correlation-Id": generateCorrelationId(),
      ...extraHeaders,
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (useEtag) {
      const cached = etagCache.get(url);
      if (cached) {
        headers["If-None-Match"] = cached.etag;
      }
    }

    const res = await fetchFn(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 304) {
      const cached = etagCache.get(url);
      if (cached) {
        return { data: cached.data as T, etag: cached.etag, fromCache: true };
      }
    }

    if (res.status === 409) {
      let conflict: ConflictError | undefined;
      try {
        conflict = (await res.json()) as ConflictError;
      } catch {
        // ignore
      }
      throw new PublishClientError(
        conflict?.error ?? "Conflict",
        409,
        undefined,
        conflict,
      );
    }

    if (!res.ok) {
      let validation: ValidationError | undefined;
      try {
        const errorBody = await res.json();
        if (errorBody.error && errorBody.details) {
          validation = errorBody as ValidationError;
        }
      } catch {
        // ignore parse errors
      }
      throw new PublishClientError(
        validation?.error ?? `HTTP ${res.status}`,
        res.status,
        validation,
      );
    }

    const data = (await res.json()) as T;
    const etag = res.headers.get("etag");

    if (useEtag && etag) {
      etagCache.set(url, { etag, data });
    }

    return { data, etag, fromCache: false };
  }

  return {
    get tenantId() {
      return tenantId;
    },

    async publishVersion(
      appKey: string,
      doc: unknown,
      notes?: string,
    ): Promise<PublishVersionResponse> {
      const res = await request<PublishVersionResponse>(
        "POST",
        `${basePath(appKey)}/versions`,
        { doc, notes },
      );
      return res.data;
    },

    async promoteRelease(
      appKey: string,
      channel: string,
      versionId: string,
    ): Promise<PromoteReleaseResponse> {
      let ifMatch: string | undefined;
      try {
        const current = await this.getRelease(appKey, channel);
        ifMatch = current.etag ?? undefined;
      } catch {
        // No existing release — first creation, no If-Match needed
      }

      const extra: Record<string, string> = {};
      if (ifMatch) extra["If-Match"] = ifMatch;

      const res = await request<PromoteReleaseResponse>(
        "PUT",
        `${basePath(appKey)}/releases/${channel}`,
        { versionId },
        false,
        extra,
      );
      return res.data;
    },

    async getRelease(
      appKey: string,
      channel: string,
    ): Promise<CachedResponse<ReleaseResponse>> {
      return request<ReleaseResponse>(
        "GET",
        `${basePath(appKey)}/releases/${channel}`,
        undefined,
        true,
      );
    },

    async getVersion(
      appKey: string,
      versionId: string,
    ): Promise<CachedResponse<unknown>> {
      return request<unknown>(
        "GET",
        `${basePath(appKey)}/versions/${versionId}`,
        undefined,
        true,
      );
    },

    async listVersions(
      appKey: string,
      limit = 50,
    ): Promise<VersionListItem[]> {
      const res = await request<VersionListItem[]>(
        "GET",
        `${basePath(appKey)}/versions?limit=${limit}`,
      );
      return res.data;
    },

    clearCache() {
      etagCache.clear();
    },
  };
}

export type PublishClient = ReturnType<typeof createPublishClient>;
