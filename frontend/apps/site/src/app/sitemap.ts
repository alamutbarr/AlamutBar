import type { MetadataRoute } from "next";
import { siteUrl, servicePages } from "@/lib/seo";
import { articles } from "@/lib/articles";
// The build has no database service. Read published articles when crawlers request the sitemap.
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = [
    "/",
    "/about",
    "/services",
    "/how-it-works",
    "/articles",
    "/faq",
    "/contact",
    "/tracking",
    "/help",
    "/apps",
    "/security",
    "/terms",
    "/privacy",
    "/status",
    ...Object.keys(servicePages).map((slug) => "/services/" + slug),
  ];
  const items: MetadataRoute.Sitemap = paths.map((path) => ({
    url: siteUrl + (path === "/" ? "/" : path),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
  try {
    let page = 1;
    do {
      const data = await articles(page);
      if (!data) break;
      for (const a of data.results)
        items.push({
          url: siteUrl + "/articles/" + a.slug,
          lastModified: a.updated_at,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      if (!data.next) break;
      page++;
    } while (page <= 100);
  } catch {}
  return items;
}
