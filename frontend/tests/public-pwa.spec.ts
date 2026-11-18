import { multiApp, roleOrigin, apiTarget } from "./targets";
import { test, expect, type APIRequestContext } from "@playwright/test";
test("public contact API keeps CSRF and forwards contact records", async ({
  request,
  baseURL,
}) => {
  const csrf = await request.get("/api/auth/csrf/");
  expect(csrf.ok()).toBeTruthy();
  const { csrfToken } = await csrf.json();
  const payload = {
    name: "آزمایش تماس",
    phone: "09120000898",
    message: "این درخواست فقط دادهٔ ساختگی آزمون است.",
  };
  const invalid = await request.post("/api/contact/", {
    data: payload,
    headers: { Origin: roleOrigin("driver") },
  });
  expect(invalid.status()).toBe(403);
  const missingToken = await request.post("/api/contact/", {
    data: payload,
    headers: { Origin: baseURL! },
  });
  expect(missingToken.status()).toBe(403);
  const result = await request.post("/api/contact/", {
    data: payload,
    headers: { Origin: baseURL!, "X-CSRFToken": csrfToken },
  });
  expect(result.status(), await result.text()).toBe(201);
});
test("public pages are connected, Persian and have unique canonical metadata", async ({
  request,
}) => {
  for (const path of [
    "about",
    "services",
    "how-it-works",
    "articles",
    "faq",
    "contact",
    "tracking",
    "help",
    "apps",
    "security",
    "terms",
    "status",
  ]) {
    const r = await request.get("/" + path);
    expect(r.status(), path).toBe(200);
    const html = await r.text();
    expect(html).toContain('lang="fa"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('rel="canonical"');
    expect((html.match(/<h1[ >]/g) || []).length, path).toBe(1);
  }
  const list = await request.get("/api/articles/");
  expect(list.ok()).toBeTruthy();
  const json = await list.json();
  expect(json.count).toBeGreaterThanOrEqual(4);
  const a = json.results[0];
  const detail = await request.get("/articles/" + a.slug);
  expect(detail.status()).toBe(200);
  expect(await detail.text()).toContain('"@type":"Article"');
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("/articles/" + a.slug);
});
test("apps have distinct identities, scoped starts and actual PNG icons", async ({
  request,
  playwright,
}) => {
  const ids = new Set();
  for (const panel of multiApp
    ? ["owner", "driver", "inspector"]
    : ["owner", "driver", "admin", "inspector"]) {
    const appRequest = await playwright.request.newContext(apiTarget(panel));
    const r = await appRequest.get("/pwa/" + panel + "/manifest.webmanifest");
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("application/manifest+json");
    const m = await r.json();
    ids.add(m.id);
    expect(m.scope).toBe("/" + panel + "/");
    expect(m.start_url).toBe("/" + panel + "/app");
    expect(m.display).toBe("standalone");
    expect(m.dir).toBe("rtl");
    for (const icon of m.icons) {
      const result = await appRequest.get(icon.src);
      expect(result.status()).toBe(200);
      const png = await result.body();
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    }
    const app = await appRequest.get(m.start_url);
    expect(app.status()).toBe(200);
    expect(await app.text()).toContain(
      "/pwa/" + panel + "/manifest.webmanifest",
    );
    await appRequest.dispose();
  }
  expect(ids.size).toBe(multiApp ? 3 : 4);
  const workerRequest = await playwright.request.newContext(
    apiTarget("driver"),
  );
  const sw = await workerRequest.get("/pwa/worker?panel=driver");
  expect(sw.status()).toBe(200);
  expect(sw.headers()["service-worker-allowed"]).toBe("/");
  expect(sw.headers()["cache-control"]).toContain("no-store");
  expect(await sw.text()).not.toContain('const VERSION = "v3-20261109"');
  expect(
    (await workerRequest.get("/pwa/unknown/manifest.webmanifest")).status(),
  ).toBe(404);
  expect(
    (await workerRequest.get("/pwa/constructor/manifest.webmanifest")).status(),
  ).toBe(404);
  await workerRequest.dispose();
});
test("invalid role routes and unknown articles produce not-found pages", async ({
  request,
}) => {
  for (const path of [
    "/owner/not-a-section",
    "/driver/shipments/new",
    "/inspector/invoices",
    "/admin/shipments/1/extra",
    "/articles/no-such-published-guide",
    "/services/toString",
    "/services/not-a-service",
  ]) {
    if (multiApp && /^\/(owner|driver|inspector|admin)\//.test(path)) continue;
    const r = await request.get(path);
    expect(r.status(), path).toBe(404);
    expect(await r.text()).toContain("این مسیر پیدا نشد");
  }
  const r = await request.get("/api/not-a-real-route/");
  expect(r.status()).toBe(404);
  expect(r.headers()["content-type"]).toContain("application/json");
  expect((await r.json()).request_id).toBe(r.headers()["x-request-id"]);
});
test("editorial draft/publish/unpublish works through Next and text cannot inject HTML", async ({
  playwright,
  request,
}) => {
  const op = await playwright.request.newContext(apiTarget("operator"));
  let id: number | undefined;
  const slug = "qa-editorial-" + Date.now();
  async function mutate(
    context: APIRequestContext,
    path: string,
    data: unknown,
    method = "POST",
  ) {
    const csrf = await (await context.get("/api/auth/csrf/")).json();
    return context.fetch(path, {
      method,
      data,
      headers: {
        "X-CSRFToken": csrf.csrfToken,
        Origin: roleOrigin("operator"),
      },
    });
  }
  try {
    expect(
      (
        await mutate(op, "/api/auth/login/", {
          username: "operator.demo",
          password: "AlamutDemo!2026",
          role: "operator",
        })
      ).ok(),
    ).toBeTruthy();
    const created = await mutate(op, "/api/editorial/articles/", {
      title: "آزمایش یکپارچه مدیریت مقالات",
      slug,
      summary: "این مقاله فقط برای آزمون محلی ایجاد شده است.",
      body:
        "## بخش آزمایشی\n" +
        "متن ساختگی آزمون محلی. ".repeat(20) +
        "<script>alert('test-only')</script>",
    });
    expect(created.status()).toBe(201);
    id = (await created.json()).id;
    expect((await op.get("/api/articles/" + slug + "/")).status()).toBe(404);
    expect(
      (
        await mutate(
          op,
          "/api/editorial/articles/" + id + "/",
          { status: "published" },
          "PATCH",
        )
      ).status(),
    ).toBe(200);
    const page = await request.get("/articles/" + slug);
    expect(page.status()).toBe(200);
    const html = await page.text();
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert('test-only')</script>");
  } finally {
    if (id)
      await mutate(
        op,
        "/api/editorial/articles/" + id + "/",
        { status: "draft" },
        "PATCH",
      );
    await op.dispose();
  }
});
