import Link from "next/link";
import PublicShell from "@/components/public-shell";
import { appHref } from "@/lib/deployment-links";
export const metadata = {
  title: "راهنمای پنل‌ها",
  description:
    "راهنمای عملی استفاده از پنل صاحب بار، راننده، اپراتور و متصدی الموت.",
  alternates: { canonical: "/help" },
};
const guides = [
  {
    id: "owner",
    name: "صاحب بار",
    steps: [
      "درخواست حمل را با مشخصات بار، زمان، مبدأ، مقصد و گیرنده ثبت کنید. نشانی پرتکرار را از دفترچه انتخاب کنید.",
      "تخصیص، پیشنهادها، بازرسی‌ها، اسناد و آخرین موقعیت دریافتی را در همان پرونده ببینید.",
      "پس از تحویل و بازرسی موفق مقصد، تأیید نهایی را ثبت و صورتحساب و پرداخت‌ها را بررسی کنید.",
    ],
    panel: "owner",
  },
  {
    id: "driver",
    name: "راننده",
    steps: [
      "اطلاعات، خودرو و چهار مدرک الزامی را در پرونده همکاری تکمیل و برای بررسی ارسال کنید.",
      "پس از تأیید و اعتبار مدارک، در بازار بار پیشنهاد بدهید؛ سفر تخصیص‌یافته را از محموله‌ها باز کنید.",
      "بارگیری، حرکت و رسیدن را در مرحله مجاز ثبت کنید. در مسیر، با اجازه خودتان رصد را شروع یا متوقف کنید.",
    ],
    panel: "driver",
  },
  {
    id: "operator",
    name: "اپراتور",
    steps: [
      "اتاق کنترل را برای درخواست بی‌بررسی، سفر بی‌موقعیت، مدارک منقضی و رخداد باز بررسی کنید.",
      "پرونده راننده و درخواست بار را بررسی و راننده و متصدی مناسب را تخصیص دهید.",
      "CRM و سررسیدها، رخدادها، پشتیبانی، پرداخت‌ها و مقالات را مطابق سطح دسترسی خود مدیریت کنید.",
    ],
    panel: "admin",
  },
  {
    id: "inspector",
    name: "متصدی",
    steps: [
      "فقط مأموریت‌های تخصیص‌یافته به خود را باز کنید و اطلاعات همان محموله را بررسی کنید.",
      "در مبدأ، بسته‌بندی، وزن، خودرو و پلمب را ثبت کنید. گزارش ناموفق پس از اصلاح با گزارش جدید پیگیری می‌شود.",
      "پس از رسیدن، بازرسی مقصد را ثبت و رسیدها را در اسناد محموله قرار دهید. آخرین گزارش ملاک است.",
    ],
    panel: "inspector",
  },
];
export default function Help() {
  return (
    <PublicShell>
      <main id="main" className="content-page">
        <section className="content-hero">
          <span className="eyebrow">از اینجا شروع کنید</span>
          <h1>راهنمای فضای کار شما</h1>
          <p>
            واحد مبالغ تومان، وزن تن و تاریخ فرم‌ها شمسی است. پیش از ثبت،
            اطلاعات و نقش حساب را بررسی کنید.
          </p>
        </section>
        <nav className="help-tabs">
          {guides.map((g) => (
            <a className="secondary-btn" key={g.id} href={"#" + g.id}>
              {g.name}
            </a>
          ))}
        </nav>
        <div className="information-grid">
          {guides.map((g) => (
            <section id={g.id} className="card info-card" key={g.id}>
              <h2>پنل {g.name}</h2>
              <ol>
                {g.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <Link
                className="text-link"
                href={appHref("/" + g.panel + "/app")}
              >
                باز کردن پنل {g.name} ←
              </Link>
            </section>
          ))}
        </div>
        <section className="card info-card">
          <h2>اگر با خطا مواجه شدید</h2>
          <p>
            اتصال و نشست را بررسی کنید. برای خطای فرم، فیلد مشخص‌شده را اصلاح
            کنید. در پایان زمان پاسخ، ابتدا وضعیت عملیات قبلی را ببینید و سپس
            دوباره ثبت کنید. برای پیگیری، کد خطای نمایش‌داده‌شده و کد محموله را
            در تیکت بفرستید.
          </p>
          <Link href="/faq">پرسش‌های متداول</Link> ·{" "}
          <Link href="/apps">راهنمای نصب</Link> ·{" "}
          <Link href="/status">بررسی سرویس</Link>
        </section>
      </main>
    </PublicShell>
  );
}
