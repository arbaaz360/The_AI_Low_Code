const MOCK_ROUTES: Record<string, (body: unknown) => Response> = {
  "/__mock__/expense/create": (body) => {
    const data = body as Record<string, unknown> | undefined;
    const amount = Number(data?.amount ?? data?.Amount ?? 0);
    if (amount <= 0) {
      return new Response(
        JSON.stringify({
          message: "Validation failed",
          formError: "The expense could not be created.",
          fieldErrors: {
            "form.values.amount": "Must be greater than 0",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ id: "exp_" + Date.now(), status: "created" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  },
};

export async function mockFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const pathname = url.startsWith("http") ? new URL(url).pathname : url;

  const handler = MOCK_ROUTES[pathname];
  if (handler) {
    let body: unknown = undefined;
    if (init?.body) {
      try { body = JSON.parse(init.body as string); } catch { body = undefined; }
    }
    await new Promise((r) => setTimeout(r, 300));
    return handler(body);
  }

  return globalThis.fetch(input, init);
}
