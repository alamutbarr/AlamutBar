import { notFound } from "next/navigation";
import Link from "next/link";
import { appHref } from "@/lib/deployment-links";
import { servicePages, siteUrl } from "@/lib/seo";
export function generateStaticParams() {
  return Object.keys(servicePages).map((slug) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = Object.hasOwn(servicePages, slug)
    ? servicePages[slug as keyof typeof servicePages]
    : undefined;
  if (!data) return {};
  return {
    title: data.title,
    description: data.description,
    alternates: { canonical: "/services/" + slug },
    openGraph: {
      title: data.title,
      description: data.description,
      url: "/services/" + slug,
    },
  };
}
export default async function Service({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = Object.hasOwn(servicePages, slug)
    ? servicePages[slug as keyof typeof servicePages]
    : undefined;
  if (!data) notFound();
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  return (
    <main id="main" className="service-page section-wrap">
      <nav className="breadcrumbs">
        <Link href="/">خانه</Link>
        <span> / {data.title}</span>
      </nav>
      <h1>{data.title}</h1>
      <p>{data.body}</p>
      <section className="card form-card">
        <h2>مراحل همکاری</h2>
        <ol>
          {data.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>
      <section className="service-faq">
        <h2>پرسش‌های متداول</h2>
        {data.faq.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <Link
        className="btn"
        href={appHref(
          slug === "driver-cooperation"
            ? "/register?role=driver"
            : "/register?role=owner",
        )}
      >
        شروع همکاری
      </Link>
      <Link className="text-link" href="/#contact">
        گفت‌وگو با تیم عملیات
      </Link>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "خانه",
                item: siteUrl + "/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: data.title,
                item: siteUrl + "/services/" + slug,
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}
