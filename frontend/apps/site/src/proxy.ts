import { NextResponse, type NextRequest } from "next/server";
import { deploymentOrigins } from "./lib/origins";
import { panelRole } from "@/lib/panels";

const { site, app } = deploymentOrigins();
const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
const authPages = new Set(["login", "register", "recover"]);

function reject(status: number, detail: string) {
  return NextResponse.json({ detail }, { status, headers: privateHeaders });
}

function redirect(origin: URL, pathname: string, search: string) {
  const target = new URL(origin.origin);
  target.pathname = pathname;
  target.search = search;
  return NextResponse.redirect(target, { headers: privateHeaders });
}

export function proxy(request: NextRequest) {
  if (process.env.MULTI_APP !== "0") {
    const host = request.headers.get("host");
    if (
      host !== site.host &&
      !(
        request.nextUrl.pathname === "/api/health/" &&
        /^127\.0\.0\.1(?::\d+)?$/.test(host || "")
      )
    )
      return reject(421, "میزبان درخواست معتبر نیست.");
    const part = request.nextUrl.pathname.split("/")[1];
    const destinations: Record<string, string | undefined> = {
      owner: process.env.OWNER_URL || "http://owner.localhost:3003",
      driver: process.env.DRIVER_URL || "http://driver.localhost:3002",
      inspector: process.env.INSPECTOR_URL || "http://inspector.localhost:3004",
      admin: process.env.ADMIN_URL || "http://admin.localhost:8001",
      operator: process.env.ADMIN_URL || "http://admin.localhost:8001",
    };
    const requestedRole = request.nextUrl.searchParams.get("role") || "owner";
    const role = Object.hasOwn(destinations, part)
      ? part
      : authPages.has(part) && Object.hasOwn(destinations, requestedRole)
        ? requestedRole
        : null;
    if (role && destinations[role]) {
      if (!["GET", "HEAD"].includes(request.method))
        return reject(404, "مسیر در دسترس نیست.");
      const path = ["admin", "operator"].includes(role)
        ? "/django-admin/"
        : request.nextUrl.pathname;
      return redirect(
        new URL(destinations[role]!),
        path,
        request.nextUrl.search,
      );
    }
    if (authPages.has(part))
      return reject(404, "برنامهٔ درخواستی در دسترس نیست.");
    if (
      request.nextUrl.pathname.startsWith("/pwa/") &&
      !request.nextUrl.pathname.startsWith("/pwa/icons/")
    )
      return reject(404, "برنامه از نشانی پنل در دسترس است.");
    return NextResponse.next();
  }
  if (!app) return NextResponse.next();
  // The public edge sets Host from its validated virtual host.
  const host = request.headers.get("host")?.toLowerCase();
  const { pathname, search } = request.nextUrl;
  const path = pathname.replace(/\/$/, "");
  const segment = (path.split("/")[1] || "").toLowerCase();
  const read = request.method === "GET" || request.method === "HEAD";
  const isApp =
    host === app.host || (app.port === "" && host === app.host + ":443");
  const isSite =
    host === site.host || (site.port === "" && host === site.host + ":443");
  if (!isApp && !isSite) {
    if (
      read &&
      path === "/api/health" &&
      /^127\.0\.0\.1(?::\d+)?$/.test(host || "")
    )
      return NextResponse.next();
    return reject(421, "میزبان درخواست معتبر نیست.");
  }

  if (segment === "api") {
    if (!isApp) {
      const publicRead =
        ["/api/health", "/api/auth/csrf", "/api/tracking"].includes(path) ||
        /^\/api\/articles(?:\/[\w-]+)?$/.test(path);
      if (
        !(read && publicRead) &&
        !(request.method === "POST" && path === "/api/contact")
      )
        return reject(404, "این مسیر در دسترس نیست.");
    }
    const origin = request.headers.get("origin");
    if (!read && origin && origin !== (isApp ? app.origin : site.origin))
      return reject(403, "مبدأ درخواست معتبر نیست.");
    return NextResponse.next();
  }

  const panelPage = Boolean(panelRole(segment)) || authPages.has(segment);
  const pwaEndpoint =
    path.toLowerCase() === "/pwa/worker" ||
    /^\/pwa\/[^/]+\/manifest\.webmanifest$/i.test(path);
  if (isSite) {
    if (panelPage)
      return read
        ? redirect(app, pathname, search)
        : reject(404, "این مسیر در دسترس نیست.");
    if (pwaEndpoint) return reject(404, "برنامه از نشانی پنل در دسترس است.");
    return NextResponse.next();
  }

  if (path === "/robots.txt") {
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      headers: {
        ...privateHeaders,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
  if (panelPage || segment === "pwa")
    return NextResponse.next({ headers: privateHeaders });
  if (
    segment === "fonts" ||
    path === "/favicon.svg" ||
    path === "/alamut-road.jpg"
  )
    return NextResponse.next();
  if (!read || path === "/sitemap.xml")
    return reject(404, "این مسیر در دسترس نیست.");
  return redirect(site, path ? pathname : "/apps", search);
}

export const config = { matcher: ["/((?!_next/static/|_next/image$).*)"] };
