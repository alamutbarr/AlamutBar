import { test, expect } from "@playwright/test";
import vm from "node:vm";
import fs from "node:fs/promises";
import { validPanelRoute } from "../shared/lib/panels";
async function worker(panel = "owner") {
  const listeners: Record<string, (e: any) => void> = {},
    stores = new Map<string, Map<string, Response>>();
  let online = true,
    skip = 0,
    claim = 0;
  const key = (v: any) =>
    typeof v === "string" ? new URL(v, "https://alamut.test").href : v.url;
  const cache = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      addAll: async (urls: string[]) => {
        urls.forEach((url) =>
          store.set(key(url), new Response("offline help")),
        );
      },
      match: async (r: any) => store.get(key(r))?.clone(),
      put: async (r: any, v: Response) => {
        store.set(key(r), v);
      },
      keys: async () => [...store.keys()].map((url) => new Request(url)),
      delete: async (r: any) => store.delete(key(r)),
    };
  };
  const context = {
    URL,
    Response,
    Request,
    fetch: async () => {
      if (!online) throw new TypeError("offline");
      return new Response("private live response");
    },
    caches: {
      open: async (name: string) => cache(name),
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
      match: async (r: any) => {
        for (const store of stores.values()) {
          const found = store.get(key(r));
          if (found) return found.clone();
        }
        return undefined;
      },
    },
    self: {
      location: {
        href: "https://alamut.test/pwa/worker?panel=" + panel,
        origin: "https://alamut.test",
      },
      addEventListener: (name: string, listener: any) => {
        listeners[name] = listener;
      },
      skipWaiting: () => {
        skip++;
      },
      clients: {
        claim: async () => {
          claim++;
        },
      },
    },
  };
  vm.runInNewContext(await fs.readFile("shared/public/pwa/sw.js", "utf8"), context);
  async function lifecycle(name: string) {
    let promise: Promise<unknown> | undefined;
    listeners[name]({
      waitUntil: (p: Promise<unknown>) => {
        promise = p;
      },
    });
    await promise;
  }
  async function request(
    path: string,
    options: { navigate?: boolean; rsc?: boolean; method?: string } = {},
  ) {
    let response: Promise<Response> | undefined;
    listeners.fetch({
      request: {
        url: new URL(path, "https://alamut.test").href,
        method: options.method || "GET",
        mode: options.navigate ? "navigate" : "cors",
        headers: new Headers(options.rsc ? { RSC: "1" } : {}),
      },
      respondWith: (p: Promise<Response>) => {
        response = p;
      },
    });
    return response ? await response : null;
  }
  return {
    lifecycle,
    request,
    stores,
    listeners,
    offline: () => {
      online = false;
    },
    get skip() {
      return skip;
    },
    get claim() {
      return claim;
    },
  };
}
test("private APIs, RSC and mutations never enter worker caches", async () => {
  const w = await worker();
  await w.lifecycle("install");
  for (const path of [
    "/api/auth/me/",
    "/api/shipments/1/",
    "/api/credentials/1/download/",
  ]) {
    expect(await w.request(path)).toBeNull();
    expect(await w.request(path, { method: "POST" })).toBeNull();
  }
  expect(await w.request("/owner/app?_rsc=private", { rsc: true })).toBeNull();
  expect(await w.request("https://tiles.example.org/tile.png")).toBeNull();
  const keys = [...w.stores.values()].flatMap((s) => [...s.keys()]);
  expect(
    keys.every((k) => !k.includes("/api/") && !k.includes("/owner/app")),
  ).toBeTruthy();
});
test("authenticated documents stay network-only and offline falls back to generic help", async () => {
  const w = await worker();
  await w.lifecycle("install");
  expect(
    await (await w.request("/owner/shipments/1", { navigate: true }))!.text(),
  ).toBe("private live response");
  w.offline();
  expect(
    await (await w.request("/owner/shipments/1", { navigate: true }))!.text(),
  ).toBe("offline help");
  expect(
    [...w.stores.values()].every(
      (s) => ![...s.keys()].some((k) => k.includes("/shipments/")),
    ),
  ).toBeTruthy();
});
test("activation preserves other roles and update activation requires an explicit message", async () => {
  const w = await worker("driver");
  w.stores.set("alamut-public-owner-older", new Map());
  await w.lifecycle("install");
  await w.lifecycle("activate");
  expect(w.claim).toBe(1);
  expect(w.stores.has("alamut-public-owner-older")).toBeTruthy();
  expect(w.skip).toBe(0);
  w.listeners.message({ data: { type: "SKIP_WAITING" } });
  expect(w.skip).toBe(1);
});
test("invalid role and invalid panel routes cannot produce a usable app", async () => {
  const w = await worker("invalid");
  await w.lifecycle("install");
  expect(w.stores.size).toBe(0);
  for (const [role, route] of [
    ["owner", ["anything"]],
    ["driver", ["shipments", "new"]],
    ["inspector", ["invoices"]],
    ["admin", ["shipments", "1", "extra"]],
    ["admin", ["driver-review"]],
  ] as const)
    expect(validPanelRoute(role, [...route])).toBeFalsy();
  for (const panel of ["owner", "driver", "admin", "inspector"])
    expect(validPanelRoute(panel, ["app"])).toBeTruthy();
});

test("development chunks with stable URLs are not retained across edits", async () => {
  const w = await worker();
  await w.lifecycle("install");
  await w.request("/_next/static/development.css");
  expect(
    [...w.stores.values()].every(
      (store) =>
        ![...store.keys()].some((key) => key.includes("development.css")),
    ),
  ).toBeTruthy();
});
