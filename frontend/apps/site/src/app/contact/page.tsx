import Link from "next/link";
import PublicShell from "@/components/public-shell";
import { ContactForm } from "@/components/public-tools";
import { business } from "@/lib/business";
export const metadata = {
  title: "تماس با ما",
  description: "درخواست همکاری و پرسش خود را برای تیم عملیات الموت ثبت کنید.",
  alternates: { canonical: "/contact" },
};
export default function Page() {
  return (
    <PublicShell>
      <main id="main" className="content-page">
        <section className="content-hero">
          <span className="eyebrow">همراه شما در مسیر</span>
          <h1>تماس با ما</h1>
          <p>درخواست همکاری و پرسش خود را برای تیم عملیات الموت ثبت کنید.</p>
        </section>
        <div className="public-contact-grid">
          <ContactForm />
          <aside className="card info-card">
            <h2>برای محموله موجود</h2>
            <p>
              از مرکز پشتیبانی پنل خود استفاده کنید و کد محموله را بنویسید تا
              سابقه و موضوع در کنار هم قرار بگیرند.
            </p>
            {business.operator && <p>بهره‌بردار سامانه، {business.operator}</p>}
            {business.email && (
              <p>
                <a
                  className="text-link"
                  href={"mailto:" + business.email}
                  dir="ltr"
                >
                  {business.email}
                </a>
              </p>
            )}
            <Link className="secondary-btn" href="/apps">
              ورود به پنل‌ها
            </Link>
            <h2>برای همکاری تازه</h2>
            <p>
              نوع بار، مبدأ، مقصد و زمان مورد نظر را بنویسید. فرم به مرکز ارتباط
              با مشتری متصل است؛ وعده زمان تماس یا شماره تجاری تأییدنشده نمایش
              داده نمی‌شود.
            </p>
          </aside>
        </div>
      </main>
    </PublicShell>
  );
}
