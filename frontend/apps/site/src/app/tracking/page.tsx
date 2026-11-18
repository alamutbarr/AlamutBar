import Link from "next/link";
import PublicShell from "@/components/public-shell";
import { TrackingForm } from "@/components/public-tools";
export const metadata = {
  title: "پیگیری عمومی محموله",
  description:
    "با کد پیگیری، وضعیت و شهرهای مسیر حمل را بدون افشای اطلاعات خصوصی ببینید.",
  alternates: { canonical: "/tracking" },
};
export default function Page() {
  return (
    <PublicShell>
      <main id="main" className="content-page">
        <section className="content-hero">
          <span className="eyebrow">همراه شما در مسیر</span>
          <h1>پیگیری عمومی محموله</h1>
          <p>
            با کد پیگیری، وضعیت و شهرهای مسیر حمل را بدون افشای اطلاعات خصوصی
            ببینید.
          </p>
        </section>
        <div className="public-tool-wrap">
          <TrackingForm />
        </div>
      </main>
    </PublicShell>
  );
}
