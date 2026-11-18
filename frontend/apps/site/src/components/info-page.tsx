import Link from "@/lib/navigation";
import PublicShell from "./public-shell";
import { infoPages } from "@/lib/public-content";
import { business } from "@/lib/business";
export default function InfoPage({ slug }: { slug: keyof typeof infoPages }) {
  const data = infoPages[slug];
  return (
    <PublicShell>
      <main id="main" className="content-page">
        <nav className="breadcrumbs">
          <Link href="/">خانه</Link>
          <span> / {data.title}</span>
        </nav>
        <section className="content-hero">
          <span className="eyebrow">{data.eyebrow}</span>
          <h1>{data.title}</h1>
          <h2>{data.lead}</h2>
          <p>{data.intro}</p>
        </section>
        {slug === "about" && (
          <img
            className="about-road"
            src="/alamut-road.jpg"
            alt="مسیر کوهستانی حمل بار"
            width={1200}
            height={600}
          />
        )}
        <div className="information-grid">
          {slug === "terms" && business.terms && (
            <section className="card info-card">
              <h2>شرایط بهره‌بردار</h2>
              <p>{business.terms}</p>
            </section>
          )}
          {data.sections.map((section, i) => (
            <section className="card info-card" key={section.title}>
              <span className="section-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </section>
          ))}
        </div>
        <section className="content-cta">
          <h2>قدم بعدی را با هم روشن کنیم.</h2>
          <Link className="btn" href="/contact">
            گفت‌وگو درباره همکاری
          </Link>
          <Link className="secondary-btn" href="/help">
            راهنمای پنل‌ها
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
