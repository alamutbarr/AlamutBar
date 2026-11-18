import Link from "next/link";
import { servicePages } from "@/lib/seo";
export const metadata = {
  title: "خدمات حمل و لجستیک",
  description: "مدیریت حمل، همکاری راننده و بازرسی و پیگیری محموله در الموت.",
  alternates: { canonical: "/services" },
};
export default function Services() {
  return (
    <main id="main" className="content-page">
      <section className="content-hero">
        <span className="eyebrow">راه درست رسیدن</span>
        <h1>خدمات الموت</h1>
        <p>از درخواست و تأمین ناوگان تا بازرسی، پیگیری و تحویل.</p>
      </section>
      <div className="article-grid">
        {Object.entries(servicePages).map(([slug, page]) => (
          <article key={slug} className="card article-card">
            <h2>{page.title}</h2>
            <p>{page.description}</p>
            <Link className="text-link" href={"/services/" + slug}>
              جزئیات خدمت ←
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
