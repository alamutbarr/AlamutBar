import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { publicUpstream } from "@/lib/public-upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function failure(status: number, detail: string) {
  const request_id = randomUUID();
  return Response.json(
    { detail, request_id },
    {
      status,
      headers: {
        "X-Request-ID": request_id,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}

async function forward(request: NextRequest) {
  const site = new URL(process.env.SITE_URL || "http://127.0.0.1:3001");
  const pathname = request.nextUrl.pathname.replace(/\/$/, "");
  const read = request.method === "GET" || request.method === "HEAD";
  // This is deliberately a public API facade, even if Django's host policy is misconfigured.
  const allowed =
    (read &&
      (["/api/health", "/api/auth/csrf", "/api/tracking"].includes(pathname) ||
        /^\/api\/articles(?:\/[^/]+)?$/.test(pathname))) ||
    (request.method === "POST" && pathname === "/api/contact");
  if (!allowed) return failure(404, "مسیر در دسترس نیست.");
  const origin = request.headers.get("origin");
  if (!read && origin && origin !== site.origin)
    return failure(403, "مبدأ درخواست معتبر نیست.");
  const headers = new Headers({ Host: site.host });
  for (const name of ["content-type", "cookie", "x-csrftoken", "origin"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (site.protocol === "https:") {
    headers.set("X-Forwarded-Proto", "https");
    // The public nginx edge overwrites the incoming forwarded address.
    const client = request.headers.get("x-forwarded-for");
    if (client && isIP(client)) headers.set("X-Forwarded-For", client);
  }
  try {
    const body = read ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > 65536)
      return failure(413, "درخواست بیش از حد بزرگ است.");
    if (body) headers.set("Content-Length", String(body.byteLength));
    const response = await publicUpstream(
      pathname + "/" + request.nextUrl.search,
      { method: request.method, body, headers },
    );
    const output = new Headers({ "Cache-Control": "private, no-store" });
    for (const name of [
      "content-type",
      "x-request-id",
      "retry-after",
      "x-robots-tag",
    ]) {
      const value = response.headers.get(name);
      if (value) output.set(name, value);
    }
    for (const cookie of response.headers.getSetCookie())
      output.append("set-cookie", cookie);
    return new Response(response.body, {
      status: response.status,
      headers: output,
    });
  } catch {
    return failure(503, "ارتباط با سامانه برقرار نشد؛ دوباره تلاش کنید.");
  }
}

export {
  forward as GET,
  forward as HEAD,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
};
