import Home from "@/components/home";
import { siteUrl } from "@/lib/seo";
export const metadata = { alternates: { canonical: "/" } };
export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "الموت",
            url: siteUrl,
            inLanguage: "fa-IR",
          }).replace(/</g, "\\u003c"),
        }}
      />
      <Home />
    </>
  );
}
