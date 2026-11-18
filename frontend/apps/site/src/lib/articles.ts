import { cache } from "react";
import { siteUrl } from "./seo";
import { publicUpstream } from "./public-upstream";
export type PublicArticle = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  published_at: string;
  updated_at: string;
};
type ArticlePage = {
  count: number;
  next: string | null;
  results: PublicArticle[];
};
async function read<T>(path: string): Promise<T | null> {
  const headers = new Headers();
  if (process.env.MULTI_APP !== "0") headers.set("Host", new URL(siteUrl).host);
  if (siteUrl.startsWith("https://")) headers.set("X-Forwarded-Proto", "https");
  const r = await publicUpstream("/api/" + path, { headers, timeout: 8000 });
  if (!r.ok) {
    await r.body?.cancel();
    if (r.status === 404) return null;
    throw new Error("Public content unavailable");
  }
  return (await r.json()) as T;
}
export const article = cache((slug: string) =>
  read<PublicArticle>("articles/" + encodeURIComponent(slug) + "/"),
);
export const articles = cache((page = 1, q = "") =>
  read<ArticlePage>("articles/?page=" + page + "&q=" + encodeURIComponent(q)),
);
