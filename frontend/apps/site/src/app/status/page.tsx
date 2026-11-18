import Link from "next/link";
import PublicShell from "@/components/public-shell";
import { ServiceStatus } from "@/components/public-tools";
export const metadata = {
  title: "وضعیت اتصال سرویس",
  description: "بررسی لحظه‌ای ارتباط با سامانه الموت.",
  alternates: { canonical: "/status" },
};
export default function Page() {
  return (
    <PublicShell>
      <main id="main" className="content-page">
        <section className="content-hero">
          <span className="eyebrow">همراه شما در مسیر</span>
          <h1>وضعیت اتصال سرویس</h1>
          <p>بررسی لحظه‌ای ارتباط با سامانه الموت.</p>
        </section>
        <div className="public-tool-wrap">
          <ServiceStatus />
        </div>
      </main>
    </PublicShell>
  );
}
