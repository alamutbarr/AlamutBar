import Link from "next/link";
import PublicShell from "@/components/public-shell";
import { panelApps } from "@/lib/panels";
import { appHref } from "@/lib/deployment-links";
export const metadata = {
  title: "ورود و نصب برنامه پنل‌ها",
  description:
    "برنامهٔ مستقل صاحب بار، راننده و متصدی را روی موبایل نصب کنید و به مدیریت الموت دسترسی داشته باشید.",
  alternates: { canonical: "/apps" },
};
export default function Apps() {
  return (
    <PublicShell>
      <main id="main" className="content-page">
        <section className="content-hero">
          <span className="eyebrow">ابزار هر نقش، همیشه در دسترس</span>
          <h1>برنامهٔ مخصوص کار شما</h1>
          <p>
            پنل خود را باز کنید، وارد شوید و از «نصب پنل» یا منوی مرورگر آن را
            به صفحه اصلی گوشی اضافه کنید.
          </p>
        </section>
        <div className="app-grid">
          {Object.entries(panelApps)
            .filter(([panel]) => panel !== "admin")
            .map(([panel, app]) => (
              <article className="card app-card" key={panel}>
                <img
                  src={"/pwa/icons/" + panel + "-192.png"}
                  width={72}
                  height={72}
                  alt={"آیکون " + app.name}
                />
                <h2>{app.name}</h2>
                <p>{app.description}</p>
                <Link className="btn" href={appHref("/" + panel + "/app")}>
                  باز کردن پنل {app.short}
                </Link>
                <Link className="text-link" href={"/help#" + app.role}>
                  راهنمای این نقش
                </Link>
              </article>
            ))}
        </div>
        <section className="card info-card">
          <h2>روش نصب روی موبایل</h2>
          <p>
            Android: در Chrome یا Edge گزینه Install app / نصب برنامه را بزنید.
            iPhone و iPad: در Safari از Share و Add to Home Screen استفاده کنید.
            امکان نمایش دکمه نصب به مرورگر، سیستم‌عامل و نصب قبلی وابسته است.
          </p>
          <p>
            نصب موبایل به آدرس عمومی HTTPS نیاز دارد. localhost روی رایانه برای
            آزمایش است و روی گوشی به همان رایانه اشاره نمی‌کند. هر پنل شناسه و
            آیکون و ورود جدا دارد. برنامه‌ها روی زیردامنه‌های مستقل باز می‌شوند.
          </p>
          <p>
            آفلاین فقط صفحه راهنمای اتصال نمایش داده می‌شود. ثبت بار، پرداخت،
            مدارک و GPS به اتصال نیاز دارند و اطلاعات خصوصی کش نمی‌شوند.
          </p>
        </section>
        <Link className="text-link" href={appHref("/register")}>
          ثبت‌نام صاحب بار یا راننده
        </Link>
        <p>
          <Link className="text-link" href={appHref("/admin/app")}>
            ورود مدیریت
          </Link>
        </p>
      </main>
    </PublicShell>
  );
}
