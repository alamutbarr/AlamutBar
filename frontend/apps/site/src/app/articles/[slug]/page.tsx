import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { article } from "@/lib/articles";
import { siteUrl } from "@/lib/seo";
import PublicShell from "@/components/public-shell";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const a = await article(slug);
    if (!a)
      return {
        title: "مقاله پیدا نشد",
        robots: { index: false, follow: false },
      };
    return {
      title: a.title,
      description: a.summary,
      alternates: { canonical: "/articles/" + a.slug },
      openGraph: {
        type: "article",
        title: a.title,
        description: a.summary,
        url: "/articles/" + a.slug,
        publishedTime: a.published_at,
        modifiedTime: a.updated_at,
        images: [{ url: "/alamut-road.jpg", alt: "راهنمای حمل‌ونقل الموت" }],
      },
    };
  } catch {
    return { title: "مقالات الموت", robots: { index: false, follow: false } };
  }
}
export default async function Article({ params }: Props) {
  const { slug } = await params;
  let a;
  try {
    a = await article(slug);
  } catch {
    return (
      <PublicShell>
        <main id="main" className="content-page">
          <h1>دریافت مقاله انجام نشد.</h1>
          <p>ارتباط با سرویس محتوا برقرار نیست. دوباره تلاش کنید.</p>
          <Link className="btn" href={"/articles/" + encodeURIComponent(slug)}>
            تلاش مجدد
          </Link>
        </main>
      </PublicShell>
    );
  }
  if (!a) notFound();
  const blocks = a.body.split(/\n\s*\n/);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.summary,
    datePublished: a.published_at,
    dateModified: a.updated_at,
    author: { "@type": "Organization", name: "تحریریه الموت" },
    publisher: { "@type": "Organization", name: "الموت" },
    image: siteUrl + "/alamut-road.jpg",
    mainEntityOfPage: siteUrl + "/articles/" + a.slug,
    inLanguage: "fa-IR",
  };
  return (
    <PublicShell>
      <main id="main" className="content-page article-detail">
        <nav className="breadcrumbs">
          <Link href="/">خانه</Link>
          <Link href="/articles"> / مقالات</Link>
          <span> / {a.category}</span>
        </nav>
        <header className="content-hero">
          <span className="eyebrow">{a.category}</span>
          <h1>{a.title}</h1>
          <p>{a.summary}</p>
          <div className="article-meta">
            <span>تحریریه الموت</span>
            <time dateTime={a.published_at}>
              {new Date(a.published_at).toLocaleDateString("fa-IR")}
            </time>
            <span>
              {Math.max(
                1,
                Math.ceil(a.body.split(/\s+/).length / 180),
              ).toLocaleString("fa-IR")}{" "}
              دقیقه مطالعه
            </span>
          </div>
        </header>
        <article className="article-body">
          {blocks.map((block, i) => {
            const lines = block.split("\n");
            return (
              <section key={i}>
                {lines[0].startsWith("## ") ? (
                  <>
                    <h2>{lines[0].slice(3)}</h2>
                    <p>{lines.slice(1).join("\n")}</p>
                  </>
                ) : (
                  <p>{block}</p>
                )}
              </section>
            );
          })}
        </article>
        <aside className="content-cta">
          <h2>قدم بعدی شما</h2>
          <Link className="btn" href="/apps">
            ورود به پنل مناسب
          </Link>
          <Link className="secondary-btn" href="/articles">
            راهنماهای دیگر
          </Link>
        </aside>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
      </main>
    </PublicShell>
  );
}
