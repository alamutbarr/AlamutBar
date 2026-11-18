import { test, expect } from "@playwright/test";
import { api, ApiError } from "../shared/lib/api";
test.describe("API failure handling", () => {
  const original = globalThis.fetch;
  test.afterEach(() => {
    globalThis.fetch = original;
  });
  test("network failure is actionable and mutations are not retried", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      throw new TypeError("private network internals");
    };
    await expect(api("shipments/", "POST", {})).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    });
    expect(calls).toBe(1);
  });
  test("HTML error responses are safe and include a correlation ID", async () => {
    globalThis.fetch = async () =>
      new Response("<html>private traceback</html>", {
        status: 502,
        headers: { "X-Request-ID": "qa-reference" },
      });
    try {
      await api("dashboard/");
      throw Error("Expected failure");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).message).not.toContain("traceback");
      expect((e as ApiError).requestId).toBe("qa-reference");
    }
  });
  test("CSRF failure prevents a mutation from being sent", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return Response.json({ detail: "invalid csrf" }, { status: 403 });
    };
    await expect(api("shipments/", "POST", {})).rejects.toMatchObject({
      status: 403,
    });
    expect(calls).toBe(1);
  });
  test("cancellation during CSRF retrieval prevents the location POST", async () => {
    const controller = new AbortController();
    const requested: string[] = [];
    let csrfSignal: AbortSignal | null | undefined;
    globalThis.fetch = (path, options) => {
      requested.push(String(path));
      csrfSignal = options?.signal;
      return new Promise((_, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Cancelled", "AbortError")),
          { once: true },
        );
      });
    };
    const pending = api(
      "shipments/1/location/",
      "POST",
      {},
      controller.signal,
    ).catch((error: unknown) => error);
    controller.abort();
    expect(csrfSignal?.aborted).toBe(true);
    expect(await pending).toMatchObject({ status: 0 });
    expect(requested).toEqual(["/api/auth/csrf/"]);
  });
  test("successful response with malformed JSON is rejected", async () => {
    globalThis.fetch = async () => new Response("not JSON", { status: 200 });
    await expect(api("dashboard/")).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
  test("empty success and field-specific validation work", async () => {
    globalThis.fetch = async () => new Response(null, { status: 204 });
    expect(await api("addresses/1/")).toBeUndefined();
    globalThis.fetch = async () =>
      Response.json({ phone: ["شماره معتبر نیست"] }, { status: 400 });
    await expect(api("auth/me/")).rejects.toThrow("شماره موبایل");
  });
  test("authentication error remains distinguishable from denied access", async () => {
    globalThis.fetch = async () =>
      Response.json(
        { detail: "Authentication required", code: "not_authenticated" },
        { status: 403 },
      );
    await expect(api("auth/me/")).rejects.toMatchObject({
      code: "not_authenticated",
    });
    globalThis.fetch = async () =>
      Response.json(
        { detail: "No access", code: "permission_denied" },
        { status: 403 },
      );
    await expect(api("invoices/")).rejects.toMatchObject({
      code: "permission_denied",
    });
  });
});

test("Persian phone and OTP digits normalize without changing a password", async () => {
  const original = globalThis.fetch;
  let posted: Record<string, string> = {};
  globalThis.fetch = async (_input, init) => {
    if (!init?.body) return Response.json({ csrfToken: "qa-token" });
    posted = JSON.parse(String(init.body));
    return Response.json({ ok: true });
  };
  try {
    await api("auth/login/", "POST", {
      phone: "۰۹۱۲۳۴۵۶۷۸۹",
      code: "۱۲۳۴۵۶",
      password: "Keep۱۲۳!",
    });
    expect(posted.phone).toBe("09123456789");
    expect(posted.code).toBe("123456");
    expect(posted.password).toBe("Keep۱۲۳!");
  } finally {
    globalThis.fetch = original;
  }
});
