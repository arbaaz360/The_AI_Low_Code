import { describe, it, expect, vi } from "vitest";
import { createDataSourceRegistry } from "./registry.js";
import { createDataSourceClient } from "./client.js";
describe("DataSourceClient", () => {
    it("mock: returns deep-cloned response", async () => {
        const defs = [
            { id: "ds1", kind: "mock", response: [{ value: "a", label: "A" }] },
        ];
        const registry = createDataSourceRegistry(defs);
        const client = createDataSourceClient({ registry });
        const result = await client.execute({ dataSourceId: "ds1" });
        expect(result).toEqual([{ value: "a", label: "A" }]);
        expect(result).not.toBe(defs[0].response);
    });
    it("mock: respects delayMs", async () => {
        const defs = [
            { id: "ds1", kind: "mock", response: "ok", delayMs: 50 },
        ];
        const registry = createDataSourceRegistry(defs);
        const client = createDataSourceClient({ registry });
        const start = Date.now();
        await client.execute({ dataSourceId: "ds1" });
        expect(Date.now() - start).toBeGreaterThanOrEqual(40);
    });
    it("mock: failRate=1 always throws", async () => {
        const defs = [
            { id: "ds1", kind: "mock", response: "ok", failRate: 1 },
        ];
        const registry = createDataSourceRegistry(defs);
        const client = createDataSourceClient({ registry });
        await expect(client.execute({ dataSourceId: "ds1" })).rejects.toThrow("simulated failure");
    });
    it("rest: calls fetchImpl and returns json", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ items: [1, 2] }),
        });
        const defs = [
            { id: "api1", kind: "rest", method: "GET", url: "https://example.com/items" },
        ];
        const registry = createDataSourceRegistry(defs);
        const client = createDataSourceClient({ registry, fetchImpl: mockFetch });
        const result = await client.execute({ dataSourceId: "api1" });
        expect(result).toEqual({ items: [1, 2] });
        expect(mockFetch).toHaveBeenCalledWith("https://example.com/items", expect.objectContaining({ method: "GET" }));
    });
    it("rest: substitutes args into url template", async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
        const defs = [
            { id: "api1", kind: "rest", method: "GET", url: "https://example.com/items/{category}" },
        ];
        const registry = createDataSourceRegistry(defs);
        const client = createDataSourceClient({ registry, fetchImpl: mockFetch });
        await client.execute({ dataSourceId: "api1", args: { category: "books" } });
        expect(mockFetch).toHaveBeenCalledWith("https://example.com/items/books", expect.anything());
    });
    it("throws for unknown dataSourceId", async () => {
        const registry = createDataSourceRegistry([]);
        const client = createDataSourceClient({ registry });
        await expect(client.execute({ dataSourceId: "nope" })).rejects.toThrow('DataSource "nope" not found');
    });
    it("mock: supports abort signal", async () => {
        const defs = [
            { id: "ds1", kind: "mock", response: "ok", delayMs: 5000 },
        ];
        const registry = createDataSourceRegistry(defs);
        const client = createDataSourceClient({ registry });
        const controller = new AbortController();
        const promise = client.execute({ dataSourceId: "ds1", signal: controller.signal });
        setTimeout(() => controller.abort(), 10);
        await expect(promise).rejects.toThrow();
    });
});
