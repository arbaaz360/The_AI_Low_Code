export class PublishClientError extends Error {
    status;
    validation;
    conflict;
    constructor(message, status, validation, conflict) {
        super(message);
        this.status = status;
        this.validation = validation;
        this.conflict = conflict;
        this.name = "PublishClientError";
    }
}
function generateCorrelationId() {
    return (Date.now().toString(36) +
        Math.random().toString(36).slice(2, 10));
}
export function createPublishClient(options) {
    const { baseUrl } = options;
    const tenantId = options.tenantId ?? "default";
    const fetchFn = options.fetchImpl ?? globalThis.fetch;
    const etagCache = new Map();
    function basePath(appKey) {
        return `/v1/tenants/${tenantId}/apps/${appKey}`;
    }
    async function request(method, path, body, useEtag = false, extraHeaders) {
        const url = `${baseUrl}${path}`;
        const headers = {
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
                return { data: cached.data, etag: cached.etag, fromCache: true };
            }
        }
        if (res.status === 409) {
            let conflict;
            try {
                conflict = (await res.json());
            }
            catch {
                // ignore
            }
            throw new PublishClientError(conflict?.error ?? "Conflict", 409, undefined, conflict);
        }
        if (!res.ok) {
            let validation;
            try {
                const errorBody = await res.json();
                if (errorBody.error && errorBody.details) {
                    validation = errorBody;
                }
            }
            catch {
                // ignore parse errors
            }
            throw new PublishClientError(validation?.error ?? `HTTP ${res.status}`, res.status, validation);
        }
        const data = (await res.json());
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
        async publishVersion(appKey, doc, notes) {
            const res = await request("POST", `${basePath(appKey)}/versions`, { doc, notes });
            return res.data;
        },
        async promoteRelease(appKey, channel, versionId) {
            let ifMatch;
            try {
                const current = await this.getRelease(appKey, channel);
                ifMatch = current.etag ?? undefined;
            }
            catch {
                // No existing release — first creation, no If-Match needed
            }
            const extra = {};
            if (ifMatch)
                extra["If-Match"] = ifMatch;
            const res = await request("PUT", `${basePath(appKey)}/releases/${channel}`, { versionId }, false, extra);
            return res.data;
        },
        async getRelease(appKey, channel) {
            return request("GET", `${basePath(appKey)}/releases/${channel}`, undefined, true);
        },
        async getVersion(appKey, versionId) {
            return request("GET", `${basePath(appKey)}/versions/${versionId}`, undefined, true);
        },
        async listVersions(appKey, limit = 50) {
            const res = await request("GET", `${basePath(appKey)}/versions?limit=${limit}`);
            return res.data;
        },
        clearCache() {
            etagCache.clear();
        },
    };
}
