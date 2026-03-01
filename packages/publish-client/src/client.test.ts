import { describe, it, expect, vi } from "vitest";
import { createPublishClient, PublishClientError } from "./client.js";

function mockFetch(responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  let callIdx = 0;
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const resp = responses[callIdx] ?? responses[responses.length - 1]!;
    callIdx++;
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: async () => resp.body,
      headers: new Map(Object.entries(resp.headers ?? {})) as unknown as Headers,
    } as unknown as Response;
  });
  return { fn, calls: () => calls };
}

describe("createPublishClient", () => {
  it("uses tenant routes by default (tenantId=default)", async () => {
    const { fn, calls } = mockFetch([{
      status: 200,
      body: { versionId: "v1", schemaVersion: "1.1", contentHash: "abc", createdAt: "2026-01-01" },
    }]);
    const client = createPublishClient({ baseUrl: "http://api", fetchImpl: fn as unknown as typeof fetch });
    await client.publishVersion("myapp", { schemaVersion: "1.1" });
    expect(calls()[0]!.url).toBe("http://api/v1/tenants/default/apps/myapp/versions");
  });

  it("uses custom tenantId in routes", async () => {
    const { fn, calls } = mockFetch([{
      status: 200,
      body: { versionId: "v1", schemaVersion: "1.1", contentHash: "abc", createdAt: "2026-01-01" },
    }]);
    const client = createPublishClient({ baseUrl: "http://api", tenantId: "acme", fetchImpl: fn as unknown as typeof fetch });
    await client.publishVersion("myapp", { schemaVersion: "1.1" });
    expect(calls()[0]!.url).toBe("http://api/v1/tenants/acme/apps/myapp/versions");
  });

  it("sends X-Correlation-Id header", async () => {
    const { fn, calls } = mockFetch([{
      status: 200,
      body: { versionId: "v1", schemaVersion: "1.1", contentHash: "abc", createdAt: "2026-01-01" },
    }]);
    const client = createPublishClient({ baseUrl: "http://api", fetchImpl: fn as unknown as typeof fetch });
    await client.publishVersion("myapp", { schemaVersion: "1.1" });
    const headers = (calls()[0]!.init.headers ?? {}) as Record<string, string>;
    expect(headers["X-Correlation-Id"]).toBeTruthy();
  });

  it("publishVersion sends POST and returns response", async () => {
    const { fn } = mockFetch([{
      status: 200,
      body: { versionId: "v1", schemaVersion: "1.1", contentHash: "abc", createdAt: "2026-01-01" },
    }]);
    const client = createPublishClient({ baseUrl: "http://api", fetchImpl: fn as unknown as typeof fetch });
    const res = await client.publishVersion("myapp", { schemaVersion: "1.1" }, "test notes");
    expect(res.versionId).toBe("v1");
    expect(fn).toHaveBeenCalledOnce();
    const [, init] = fn.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ doc: { schemaVersion: "1.1" }, notes: "test notes" });
  });

  it("promoteRelease GETs current release for If-Match then PUTs", async () => {
    const { fn, calls } = mockFetch([
      {
        status: 200,
        body: { versionId: "v1", schemaVersion: "1.1", contentHash: "abc", updatedAt: "2026-01-01" },
        headers: { etag: 'W/"v1"' },
      },
      {
        status: 200,
        body: { appKey: "myapp", channel: "preview", versionId: "v2", updatedAt: "2026-01-02" },
      },
    ]);
    const client = createPublishClient({ baseUrl: "http://api", fetchImpl: fn as unknown as typeof fetch });
    const res = await client.promoteRelease("myapp", "preview", "v2");
    expect(res.versionId).toBe("v2");
    expect(fn).toHaveBeenCalledTimes(2);
    const putCall = calls()[1]!;
    expect(putCall.init.method).toBe("PUT");
    const putHeaders = (putCall.init.headers ?? {}) as Record<string, string>;
    expect(putHeaders["If-Match"]).toBe('W/"v1"');
  });

  it("promoteRelease works for first creation (no existing release)", async () => {
    const { fn, calls } = mockFetch([
      { status: 404, body: { error: "No release" } },
      {
        status: 200,
        body: { appKey: "myapp", channel: "preview", versionId: "v1", updatedAt: "2026-01-01" },
      },
    ]);
    const client = createPublishClient({ baseUrl: "http://api", fetchImpl: fn as unknown as typeof fetch });
    const res = await client.promoteRelease("myapp", "preview", "v1");
    expect(res.channel).toBe("preview");
    const putCall = calls()[1]!;
    const putHeaders = (putCall.init.headers ?? {}) as Record<string, string>;
    expect(putHeaders["If-Match"]).toBeUndefined();
  });

  it("throws PublishClientError with conflict on 409", async () => {
    const { fn } = mockFetch([
      { status: 404, body: { error: "No release" } },
      {
        status: 409,
        body: {
          error: "Conflict: release pointer has changed",
          current: { appKey: "myapp", channel: "preview", versionId: "v0", updatedAt: "2026-01-01" },
        },
      },
    ]);
    const client = createPublishClient({ baseUrl: "http://api", fetchImpl: fn as unknown as typeof fetch });
    try {
      await client.promoteRelease("myapp", "preview", "v2");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PublishClientError);
      const pce = e as PublishClientError;
      expect(pce.status).toBe(409);
      expect(pce.conflict?.current.versionId).toBe("v0");
    }
  });

  it("getRelease caches by ETag and returns 304 from cache", async () => {
    const { fn } = mockFetch([
      {
        status: 200,
        body: { versionId: "v1", schemaVersion: "1.1", contentHash: "abc", updatedAt: "2026-01-01" },
        headers: { etag: 'W/"v1"' },
      },
      { status: 304 },
    ]);
    const client = createPublishClient({ baseUrl: "http://api", fetchImpl: fn as unknown as typeof fetch });

    const res1 = await client.getRelease("myapp", "preview");
    expect(res1.fromCache).toBe(false);
    expect(res1.data.versionId).toBe("v1");

    const res2 = await client.getRelease("myapp", "preview");
    expect(res2.fromCache).toBe(true);
    expect(res2.data.versionId).toBe("v1");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws PublishClientError on 400 with validation details", async () => {
    const { fn } = mockFetch([{
      status: 400,
      body: { error: "Governance validation failed", details: ["GOV_WIDGET_UNKNOWN: bad type"] },
    }]);
    const client = createPublishClient({ baseUrl: "http://api", fetchImpl: fn as unknown as typeof fetch });

    try {
      await client.publishVersion("myapp", {});
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PublishClientError);
      const pce = e as PublishClientError;
      expect(pce.status).toBe(400);
      expect(pce.validation?.error).toBe("Governance validation failed");
      expect(pce.validation?.details).toHaveLength(1);
    }
  });

  it("listVersions returns array", async () => {
    const { fn } = mockFetch([{
      status: 200,
      body: [{ versionId: "v1", createdAt: "2026-01-01", contentHash: "abc", schemaVersion: "1.1" }],
    }]);
    const client = createPublishClient({ baseUrl: "http://api", fetchImpl: fn as unknown as typeof fetch });
    const list = await client.listVersions("myapp");
    expect(list).toHaveLength(1);
    expect(list[0]!.versionId).toBe("v1");
  });

  it("getVersion uses ETag caching", async () => {
    const { fn } = mockFetch([
      { status: 200, body: { schemaVersion: "1.1", nodes: {} }, headers: { etag: '"hash1"' } },
      { status: 304 },
    ]);
    const client = createPublishClient({ baseUrl: "http://api", fetchImpl: fn as unknown as typeof fetch });

    const res1 = await client.getVersion("myapp", "v1");
    expect(res1.fromCache).toBe(false);

    const res2 = await client.getVersion("myapp", "v1");
    expect(res2.fromCache).toBe(true);
  });
});
