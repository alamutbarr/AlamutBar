import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

const site = new URL(process.env.SITE_URL || "https://alamut.bar");
const admin = new URL(process.env.ADMIN_URL || "https://admin.alamut.bar");
const roles = Object.fromEntries(
  ["driver", "owner", "inspector"].map((role) => [
    role,
    new URL(
      process.env[`${role.toUpperCase()}_URL`] || `https://${role}.alamut.bar`,
    ),
  ]),
);
const ports = new Map([
  [site.origin, 3001],
  [roles.driver.origin, 3002],
  [roles.owner.origin, 3003],
  [roles.inspector.origin, 3004],
  [admin.origin, 3005],
]);
const targetIp = process.env.ALAMUT_SMOKE_IP;
const loopback = process.env.ALAMUT_SMOKE_LOOPBACK === "1";
if (targetIp && !isIP(targetIp))
  throw new Error("ALAMUT_SMOKE_IP must be an IPv4 or IPv6 address.");
if (loopback && targetIp)
  throw new Error("Choose either ALAMUT_SMOKE_IP or ALAMUT_SMOKE_LOOPBACK.");
for (const origin of ports.keys()) {
  assert.equal(new URL(origin).protocol, "https:", origin);
}
assert.equal(ports.size, 5, "Expected five distinct origins");
const get = (origin, path, options) => {
  if (loopback || targetIp) {
    const lookup = targetIp
      ? (_host, options, callback) => {
          const family = isIP(targetIp);
          if (options.all) callback(null, [{ address: targetIp, family }]);
          else callback(null, targetIp, family);
        }
      : undefined;
    return new Promise((resolve, reject) => {
      const request = loopback ? httpRequest : httpsRequest;
      const req = request(
        {
          hostname: loopback ? "127.0.0.1" : origin.hostname,
          port: loopback ? ports.get(origin.origin) : origin.port || 443,
          path,
          method: options?.method,
          headers: {
            Host: origin.host,
            ...(loopback ? { "X-Forwarded-Proto": "https" } : {}),
          },
          lookup,
          signal: AbortSignal.timeout(15_000),
        },
        (response) => {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("error", reject);
          response.on("end", () => {
            const headers = new Headers();
            for (const [name, value] of Object.entries(response.headers)) {
              if (Array.isArray(value))
                for (const entry of value) headers.append(name, entry);
              else if (value) headers.set(name, value);
            }
            resolve(
              new Response(Buffer.concat(chunks), {
                status: response.statusCode,
                headers,
              }),
            );
          });
        },
      );
      req.on("error", reject);
      req.end();
    });
  }
  return fetch(new URL(path, origin), {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    ...options,
  });
};

for (const origin of [site, admin, ...Object.values(roles)]) {
  const health = await get(origin, "/api/health/");
  assert.equal(health.status, 200, origin.host);
  assert.equal((await health.json()).database, "mysql");
  console.log(`MySQL health confirmed through ${origin.origin}`);
}
const sitemap = await get(site, "/sitemap.xml");
assert.equal(sitemap.status, 200);
assert.match(await sitemap.text(), /\/articles\//);
const home = await get(site, "/");
assert.equal(home.status, 200);
assert.doesNotMatch(home.headers.get("x-robots-tag") || "", /noindex/i);
assert.equal((await get(site, "/api/shipments/")).status, 404);
assert.equal(
  (await get(site, "/api/auth/login/", { method: "POST" })).status,
  404,
);
const directory = await (await get(site, "/apps")).text();
for (const [role, origin] of Object.entries(roles)) {
  const app = `/${role}/app`;
  const manifest = `/pwa/${role}/manifest.webmanifest`;
  assert.ok(directory.includes(`${origin.origin}${app}`));
  const old = await get(site, app);
  assert.equal(old.status, 307);
  assert.equal(old.headers.get("location"), `${origin.origin}${app}`);
  const page = await get(origin, app);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("x-robots-tag"), /noindex/);
  const pageHtml = await page.text();
  assert.doesNotMatch(pageHtml, /\/_next\//);
  assert.ok(pageHtml.includes(`href="${manifest}"`), `${role} manifest link`);
  assert.ok(
    pageHtml.includes(
      `rel="apple-touch-icon" href="/pwa/icons/${role}-192.png"`,
    ),
    `${role} iOS home-screen icon`,
  );
  if (role === "driver") {
    assert.match(
      page.headers.get("permissions-policy") || "",
      /(?:^|,\s*)geolocation=\(self\)(?:,|$)/,
    );
  }
  assert.equal((await get(site, manifest)).status, 404);
  const manifestResponse = await get(origin, manifest);
  assert.equal(manifestResponse.status, 200);
  assert.match(
    manifestResponse.headers.get("content-type") || "",
    /manifest\+json/,
  );
  const {
    id,
    start_url: startUrl,
    scope,
    display,
    icons,
  } = await manifestResponse.json();
  assert.equal(id, `/${role}/`);
  assert.equal(scope, `/${role}/`);
  assert.equal(startUrl, app);
  assert.equal(display, "standalone");
  for (const [size, use] of [
    ["192x192", undefined],
    ["512x512", undefined],
    ["512x512", "maskable"],
  ]) {
    const icon = icons.find(
      ({ sizes, purpose }) => sizes === size && purpose === use,
    );
    assert.ok(icon, `${role} ${size} ${use || "default"} app icon`);
    const iconUrl = new URL(icon.src, origin);
    assert.equal(iconUrl.origin, origin.origin);
    const iconResponse = await get(origin, iconUrl.pathname);
    assert.equal(iconResponse.status, 200);
    assert.match(iconResponse.headers.get("content-type") || "", /image\/png/);
  }
  const worker = await get(origin, `/pwa/worker?panel=${role}`);
  assert.equal(worker.status, 200);
  assert.match(worker.headers.get("content-type") || "", /javascript/);
  assert.match(worker.headers.get("cache-control") || "", /no-store/);
  assert.equal(worker.headers.get("service-worker-allowed"), "/");
  assert.equal((await get(origin, "/django-admin/")).status, 404);
  const csrf = await get(origin, "/api/auth/csrf/");
  const cookie = csrf.headers.getSetCookie().join("\n");
  assert.match(cookie, /__Host-alamut_csrf=/);
  assert.match(cookie, /; Secure/i);
  assert.doesNotMatch(cookie, /; Domain=/i);
}
const management = await get(admin, "/django-admin/login/");
assert.equal(management.status, 200);
assert.match(management.headers.get("x-robots-tag"), /noindex/);
assert.ok(directory.includes(`${admin.origin}/django-admin/`));
console.log(
  `Five origins, MySQL, public API, PWA and secure-cookie checks passed (${loopback ? "loopback HTTP with forwarded HTTPS" : "TLS verified"}).`,
);
