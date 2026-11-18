import { readFile } from "node:fs/promises";
import path from "node:path";
export const dynamic = "force-dynamic";
export async function GET() {
  const template = await readFile(
    path.join(process.cwd(), "public/pwa/sw.js"),
    "utf8",
  );
  const release = process.env.NEXT_PUBLIC_RELEASE_ID || "development";
  return new Response(
    template.replace(
      /const VERSION = ["'][^"']*["'];/,
      "const VERSION = " + JSON.stringify(release) + ";",
    ),
    {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Service-Worker-Allowed": "/",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
