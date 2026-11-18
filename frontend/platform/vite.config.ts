import { defineConfig, type Plugin, type Connect } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { panelApps } from "../shared/lib/panels";

const frontend = fileURLToPath(new URL("..", import.meta.url));
export function panelConfig(
  panel: "driver" | "owner" | "inspector",
  port: number,
) {
  const release = process.env.RELEASE_ID || new Date().toISOString();
  const manifest = JSON.stringify({
    id: `/${panel}/`,
    name: panelApps[panel].name,
    short_name: panelApps[panel].short,
    lang: "fa",
    dir: "rtl",
    start_url: `/${panel}/app`,
    scope: `/${panel}/`,
    display: "standalone",
    background_color: "#f3f7f5",
    theme_color: panelApps[panel].color,
    icons: [
      ...[192, 512].map((size) => ({
        src: `/pwa/icons/${panel}-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
      })),
      {
        src: `/pwa/icons/${panel}-maskable.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  });
  const worker = readFileSync(
    path.join(frontend, "shared/public/pwa/sw.js"),
    "utf8",
  )
    .replace(/const PANEL = [^;]+;/, `const PANEL = ${JSON.stringify(panel)};`)
    .replace(
      /const VERSION = [^;]+;/,
      `const VERSION = ${JSON.stringify(release)};`,
    );
  const generated: Record<string, string> = {
    [`pwa/${panel}/manifest.webmanifest`]: manifest,
    "pwa/worker": worker,
    "robots.txt": "User-agent: *\nDisallow: /\n",
  };
  const serveGenerated: Connect.NextHandleFunction = (req, res, next) => {
    const key = (req.url || "").split("?")[0].slice(1);
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(self)",
    );
    if (!Object.hasOwn(generated, key)) {
      if (/^pwa\/[^/]+\/manifest\.webmanifest$/.test(key)) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      return next();
    }
    res.setHeader(
      "Content-Type",
      key === "pwa/worker"
        ? "text/javascript"
        : key.endsWith("webmanifest")
          ? "application/manifest+json"
          : "text/plain",
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Service-Worker-Allowed", "/");
    res.end(generated[key]);
  };
  const pwa: Plugin = {
    name: "alamut-public-assets",
    generateBundle() {
      for (const [fileName, source] of Object.entries(generated))
        this.emitFile({ type: "asset", fileName, source });
    },
    configureServer(server) {
      server.middlewares.use(serveGenerated);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveGenerated);
    },
  };
  return defineConfig({
    plugins: [react(), pwa],
    envDir: false,
    publicDir: path.join(frontend, "shared/public"),
    resolve: {
      alias: [
        {
          find: "@/lib/navigation",
          replacement: path.join(frontend, "platform/navigation.tsx"),
        },
        { find: "@", replacement: path.join(frontend, "shared") },
      ],
      dedupe: ["react", "react-dom"],
    },
    define: {
      "process.env.NEXT_PUBLIC_ALAMUT_SITE_ORIGIN": JSON.stringify(
        process.env.SITE_URL || "http://127.0.0.1:3001",
      ),
      "process.env.NEXT_PUBLIC_ALAMUT_MULTI_APP": JSON.stringify("0"),
      "process.env.NEXT_PUBLIC_ALAMUT_APP_ORIGIN": JSON.stringify(""),
    },
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
      proxy: {
        "/api": {
          target: process.env.API_INTERNAL_URL || "http://127.0.0.1:8001",
          changeOrigin: false,
        },
      },
    },
    preview: {
      host: "127.0.0.1",
      port,
      strictPort: true,
      proxy: {
        "/api": {
          target: process.env.API_INTERNAL_URL || "http://127.0.0.1:8001",
          changeOrigin: false,
        },
      },
    },
    build: { sourcemap: false, emptyOutDir: true },
  });
}
