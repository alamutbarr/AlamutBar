import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  const local = ["localhost", "127.0.0.1"].includes(new URL(siteUrl).hostname);
  return {
    rules: {
      userAgent: "*",
      allow: local ? undefined : "/",
      disallow: local
        ? "/"
        : [
            "/owner",
            "/driver",
            "/admin",
            "/inspector",
            "/login",
            "/register",
            "/recover",
            "/api/",
          ],
    },
    sitemap: siteUrl + "/sitemap.xml",
  };
}
