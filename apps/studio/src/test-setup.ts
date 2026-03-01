import "@testing-library/jest-dom/vitest";

if (typeof ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

/** Mock fetch for domain model URL so tests never hit network. Prevents Vitest timeouts. */
const realFetch = globalThis.fetch;
globalThis.fetch = function (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("domain_model") || url.endsWith("domain_model_vendor.json")) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          version: "1",
          entities: {},
        }),
    } as Response);
  }
  return realFetch.call(this, input, init);
};
