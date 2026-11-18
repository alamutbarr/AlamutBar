import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/lib/articles";
import PublicShell from "@/components/public-shell";
export const metadata: Metadata = {
  title: "مقالات و راهنمای حمل‌ونقل",
  description:
    "راهنمای درخواست بار، مدارک راننده، بازرسی و پیگیری محموله در الموت.",
  alternates: { canonical: "/articles" },
};
export default async function Articles({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const query = await searchParams,
    q = String(query.q || "").slice(0, 100),
    page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  let data = null,
    failed = false;
  try {
    data = await articles(page, q);
  } catch {
    failed = true;
  }
  return (
    <PublicShell>
      <main id="main" className="content-page">
        <section className="content-hero">
          <span className="eyebrow">دانستن، بخشی از مسیر است</span>
          <h1>مقالات و راهنماها</h1>
          <p>
            نکته‌های کاربردی برای ثبت بار، همکاری راننده، بازرسی و پیگیری شفاف.
          </p>
        </section>
        <form className="article-search" action="/articles">
          <label>
            جست‌وجوی مقاله
            <input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={100}
              placeholder="مدارک، موقعیت، تحویل…"
            />
          </label>
          <button className="btn">جست‌وجو</button>
        </form>
        {failed ? (
          <section className="card info-card" role="alert">
            <h2>دریافت مقالات انجام نشد.</h2>
            <p>سرویس محتوا موقتاً در دسترس نیست؛ کمی بعد دوباره تلاش کنید.</p>
            <Link className="btn" href="/articles">
              تلاش مجدد
            </Link>
          </section>
        ) : (
          <>
            <div className="article-grid">
              {data?.results.map((a) => (
                <article className="card article-card" key={a.id}>
                  <span className="eyebrow">{a.category}</span>
                  <h2>
                    <Link href={"/articles/" + a.slug}>{a.title}</Link>
                  </h2>
                  <p>{a.summary}</p>
                  <div>
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
                  <Link className="text-link" href={"/articles/" + a.slug}>
                    خواندن راهنما ←
                  </Link>
                </article>
              ))}
            </div>
            {!data?.results.length && (
              <section className="card info-card">
                <h2>مقاله‌ای پیدا نشد.</h2>
                <p>عبارت دیگری جست‌وجو کنید یا به صفحه نخست مقالات برگردید.</p>
                <Link href="/articles">همه مقالات</Link>
              </section>
            )}
            <nav className="pagination" aria-label="صفحه‌های مقالات">
              {page > 1 && (
                <Link
                  className="secondary-btn"
                  href={
                    "/articles?page=" +
                    (page - 1) +
                    "&q=" +
                    encodeURIComponent(q)
                  }
                >
                  صفحه قبل
                </Link>
              )}
              {data?.next && (
                <Link
                  className="secondary-btn"
                  href={
                    "/articles?page=" +
                    (page + 1) +
                    "&q=" +
                    encodeURIComponent(q)
                  }
                >
                  صفحه بعد
                </Link>
              )}
            </nav>
          </>
        )}
      </main>
    </PublicShell>
  );
}
