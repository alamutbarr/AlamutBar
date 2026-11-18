import { test, expect } from "@playwright/test";
import { multiApp } from "./targets";
test("public pages provide canonical, social metadata and structured content", async ({
  request,
}) => {
  const home = await request.get("/");
  expect(home.ok()).toBeTruthy();
  const html = await home.text();
  expect(html).toContain('rel="canonical"');
  expect(html).toContain('property="og:locale" content="fa_IR"');
  expect(html).toContain("application/ld+json");
  for (const slug of [
    "freight-management",
    "driver-cooperation",
    "tracking-inspection",
  ]) {
    const r = await request.get("/services/" + slug);
    expect(r.status()).toBe(200);
    const page = await r.text();
    expect(page).toContain("FAQPage");
    expect(page).toContain("BreadcrumbList");
    expect(page).toContain("/services/" + slug);
    expect((page.match(/<h1[ >]/g) || []).length).toBe(1);
  }
});
test("private pages and API responses cannot be indexed or cached", async ({
  request,
}) => {
  for (const path of [
    "/login",
    "/register",
    "/recover",
    "/owner",
    "/admin/control",
  ]) {
    const r = await request.get(path, { maxRedirects: multiApp ? 0 : 20 });
    expect(r.status()).toBe(multiApp ? 307 : 200);
    if (multiApp) expect(r.headers()["x-robots-tag"]).toContain("noindex");
    else
      expect(await r.text()).toMatch(
        /name="robots" content="noindex, nofollow"/,
      );
  }
  const csrf = await request.get("/api/auth/csrf/");
  expect(csrf.headers()["cache-control"]).toContain("no-store");
  expect(csrf.headers()["x-robots-tag"]).toContain("noindex");
});
test("sitemap and downloaded WOFF2 fonts are available", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("/services/driver-cooperation");
  expect(xml).not.toContain("/admin");
  for (const name of ["Regular", "Medium", "Bold"]) {
    const r = await request.get("/fonts/Vazirmatn-" + name + ".woff2");
    expect(r.status()).toBe(200);
    expect((await r.body()).byteLength).toBeGreaterThan(10000);
  }
});
