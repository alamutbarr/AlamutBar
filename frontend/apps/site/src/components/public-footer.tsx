import { ArrowUpLeft } from "lucide-react";
import { Brand } from "@/components/ui";
import Link from "@/lib/navigation";

const footerGroups = [
  {
    title: "آشنایی با الموت",
    links: [
      ["/services", "خدمات حمل‌ونقل"],
      ["/how-it-works", "روش همکاری"],
      ["/about", "درباره ما"],
      ["/articles", "مقالات"],
    ],
  },
  {
    title: "پیگیری و پشتیبانی",
    links: [
      ["/tracking", "پیگیری بار"],
      ["/help", "راهنمای پنل‌ها"],
      ["/faq", "پرسش‌های متداول"],
      ["/contact", "تماس با ما"],
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <Brand light />
            <Link className="site-footer-entry" href="/apps">
              ورود به پنل‌ها و نصب برنامه <ArrowUpLeft size={17} />
            </Link>
          </div>
          {footerGroups.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h2>{title}</h2>
              <ul>
                {links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="site-footer-bottom">
          <small>
            © {new Date().toLocaleDateString("fa-IR", { year: "numeric" })}{" "}
            الموت
          </small>
          <nav aria-label="حقوق کاربران و وضعیت سامانه">
            <Link href="/privacy">حریم خصوصی</Link>
            <Link href="/terms">شرایط استفاده</Link>
            <Link href="/security">امنیت داده</Link>
            <Link href="/status">وضعیت سرویس</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
