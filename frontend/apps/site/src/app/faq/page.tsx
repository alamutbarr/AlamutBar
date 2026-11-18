import Link from "next/link";
import PublicShell from "@/components/public-shell";
import { FAQ } from "@/components/public-tools";
export const metadata = {
  title: "پرسش‌های متداول",
  description:
    "پاسخ پرسش‌های ثبت بار، مدارک، بازرسی، نصب برنامه و پیگیری در الموت.",
  alternates: { canonical: "/faq" },
};
export default function Page() {
  return (
    <PublicShell>
      <main id="main" className="content-page">
        <section className="content-hero">
          <span className="eyebrow">همراه شما در مسیر</span>
          <h1>پرسش‌های متداول</h1>
          <p>
            پاسخ پرسش‌های ثبت بار، مدارک، بازرسی، نصب برنامه و پیگیری در الموت.
          </p>
        </section>
        <div className="public-tool-wrap">
          <FAQ />
        </div>
      </main>
    </PublicShell>
  );
}
