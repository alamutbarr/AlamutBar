import Link from "@/lib/navigation";
import { Brand } from "@/components/ui";
import PublicFooter from "./public-footer";
import PublicMobileNav from "./public-mobile-nav";
import type { ReactNode } from "react";
export const publicLinks = [
  ["/about", "درباره ما"],
  ["/services", "خدمات"],
  ["/how-it-works", "روش همکاری"],
  ["/articles", "مقالات"],
  ["/faq", "پرسش‌ها"],
  ["/tracking", "پیگیری بار"],
  ["/contact", "تماس با ما"],
];
export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-site mobile-public">
      <header className="site-header">
        <Brand />
        <nav aria-label="صفحات عمومی">
          {publicLinks.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <Link className="secondary-btn" href="/apps">
          پنل‌ها و نصب برنامه
        </Link>
        <details className="site-mobile-menu">
          <summary>منوی سایت</summary>
          <nav aria-label="منوی موبایل سایت">
            {publicLinks.map(([href, label]) => (
              <Link href={href} key={href}>
                {label}
              </Link>
            ))}
            <Link href="/apps">نصب پنل‌ها</Link>
          </nav>
        </details>
      </header>
      {children}
      <PublicFooter />
      <PublicMobileNav />
    </div>
  );
}
