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
      <header className="relative mx-auto flex max-w-[1320px] items-center gap-7 border-b border-line px-8 pt-[max(20px,env(safe-area-inset-top))] pb-6 max-[1100px]:gap-[18px] max-[1100px]:px-6 max-[850px]:justify-between max-[760px]:px-[var(--app-start,1rem)]">
        <Brand />
        <nav
          className="flex flex-1 items-center justify-center gap-[22px] max-[1100px]:gap-3 max-[850px]:hidden"
          aria-label="صفحات عمومی"
        >
          {publicLinks.map(([href, label]) => (
            <Link
              className="text-sm hover:text-teal max-[1100px]:text-xs"
              key={href}
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link className="secondary-btn max-[850px]:hidden" href="/apps">
          پنل‌ها و نصب برنامه
        </Link>
        <details className="hidden max-[850px]:block">
          <summary className="cursor-pointer rounded-lg border border-line px-3.5 py-2.5 text-[0.875rem]">
            منوی سایت
          </summary>
          <nav
            className="absolute inset-x-5 top-[90px] z-50 grid max-h-[67dvh] gap-3.5 overflow-auto rounded-xl border border-line bg-white p-5 shadow-[0_16px_40px_#183e461a] max-[760px]:gap-0.5"
            aria-label="منوی موبایل سایت"
          >
            {publicLinks.map(([href, label]) => (
              <Link
                className="flex min-h-11 items-center"
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
            <Link className="flex min-h-11 items-center" href="/apps">
              نصب پنل‌ها
            </Link>
          </nav>
        </details>
      </header>
      {children}
      <PublicFooter />
      <PublicMobileNav />
    </div>
  );
}
