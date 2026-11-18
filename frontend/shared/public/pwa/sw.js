/* Public assets only. Never cache API, authenticated HTML, RSC or uploaded files. */
const PANEL = new URL(self.location.href).searchParams.get("panel");
const VALID = ["owner", "driver", "admin", "inspector"].includes(PANEL);
const VERSION = "v3-20261109";
const PREFIX = `alamut-public-${PANEL}-`;
const CACHE = PREFIX + VERSION;
const OFFLINE = "/pwa/offline.html";
const ASSETS = [
  OFFLINE,
  `/pwa/icons/${PANEL}-192.png`,
  "/fonts/Vazirmatn-Regular.woff2",
];
self.addEventListener("install", (event) => {
  if (VALID)
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("activate", (event) => {
  if (!VALID) return;
  event.waitUntil(
    (async () => {
      const previous = (await caches.keys()).filter(
        (key) => key.startsWith(PREFIX) && key !== CACHE,
      );
      await Promise.all(previous.slice(0, -1).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (VALID && event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (!VALID || url.origin !== self.location.origin || request.method !== "GET")
    return;
  if (
    url.pathname.startsWith("/api/") ||
    request.headers.get("RSC") ||
    url.searchParams.has("_rsc")
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match(OFFLINE)) ||
          new Response("اتصال برقرار نیست. دوباره تلاش کنید.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
      ),
    );
    return;
  }
  const isPublic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/pwa/icons/");
  if (!isPublic) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      const frameworkAsset = url.pathname.startsWith("/_next/static/");
      if (cached && !frameworkAsset) return cached;
      try {
        const response = await fetch(request);
        const immutable =
          !frameworkAsset ||
          (response.headers.get("Cache-Control") || "").includes("immutable");
        if (
          response.ok &&
          response.type !== "opaque" &&
          !response.headers.get("Content-Type")?.includes("text/html") &&
          immutable
        ) {
          await cache.put(request, response.clone());
          const keys = await cache.keys();
          const removable = keys.filter(
            (key) => !ASSETS.includes(new URL(key.url).pathname),
          );
          await Promise.all(
            removable
              .slice(0, Math.max(0, keys.length - 80))
              .map((key) => cache.delete(key)),
          );
        } else if (frameworkAsset && !immutable) {
          // Development chunks keep stable URLs: never persist them across edits.
          await cache.delete(request);
        }
        return response;
      } catch (error) {
        if (cached) return cached;
        const previous = await caches.match(request);
        if (previous) return previous;
        throw error;
      }
    })(),
  );
});
