import { panelApps, type PanelKey } from "@/lib/panels";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ panel: string }> },
) {
  const { panel } = await params;
  const app = Object.hasOwn(panelApps, panel)
    ? panelApps[panel as PanelKey]
    : undefined;
  if (!app) return new Response(null, { status: 404 });
  return Response.json(
    {
      id: "/" + panel + "/",
      name: app.name,
      short_name: app.short,
      description: app.description,
      lang: "fa",
      dir: "rtl",
      start_url: "/" + panel + "/app",
      scope: "/" + panel + "/",
      display: "standalone",
      orientation: "any",
      background_color: "#f6f7f2",
      theme_color: app.color,
      categories: ["business", "productivity"],
      icons: [
        {
          src: "/pwa/icons/" + panel + "-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/pwa/icons/" + panel + "-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/pwa/icons/" + panel + "-maskable.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      shortcuts: [
        { name: "پشتیبانی", url: "/" + panel + "/tickets" },
        {
          name: panel === "driver" ? "پرونده و مدارک" : "محموله‌ها",
          url:
            "/" + panel + (panel === "driver" ? "/onboarding" : "/shipments"),
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
