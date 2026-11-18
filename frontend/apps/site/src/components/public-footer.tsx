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
    <footer className="bg-[#173f3c] px-[clamp(1.125rem,4vw,2rem)] text-[#f4f6ee]">
      <div className="mx-auto max-w-[1160px] pt-[clamp(2rem,5vw,3.75rem)]">
        <div className="grid grid-cols-[minmax(0,1.35fr)_repeat(2,minmax(0,1fr))] gap-[clamp(1rem,4vw,3.25rem)] max-[760px]:grid-cols-2">
          <div className="flex flex-col items-start gap-[1.125rem] max-[760px]:col-span-full">
            <Brand light className="max-[600px]:!scale-100" />
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#82a39a] px-3.5 py-1.5 text-[0.875rem] font-semibold hover:text-white hover:underline hover:underline-offset-4"
              href="/apps"
            >
              ورود به پنل‌ها و نصب برنامه <ArrowUpLeft size={17} />
            </Link>
          </div>
          {footerGroups.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h2 className="mb-1.5 text-base font-bold text-[#f4f6ee]">
                {title}
              </h2>
              <ul className="m-0 list-none p-0">
                {links.map(([href, label]) => (
                  <li key={href}>
                    <Link
                      className="inline-flex min-h-[38px] items-center py-1 text-[0.875rem] text-[#d5e4dd] hover:text-white hover:underline hover:underline-offset-4 max-[760px]:min-h-11"
                      href={href}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/25 py-3 max-[560px]:flex-col max-[560px]:items-start">
          <small className="text-[0.8125rem] text-[#d5e4dd]">
            © {new Date().toLocaleDateString("fa-IR", { year: "numeric" })}{" "}
            الموت
          </small>
          <nav
            className="flex flex-wrap gap-x-4"
            aria-label="حقوق کاربران و وضعیت سامانه"
          >
            <Link
              className="text-[0.8125rem] text-[#d5e4dd] hover:text-white hover:underline hover:underline-offset-4"
              href="/privacy"
            >
              حریم خصوصی
            </Link>
            <Link
              className="text-[0.8125rem] text-[#d5e4dd] hover:text-white hover:underline hover:underline-offset-4"
              href="/terms"
            >
              شرایط استفاده
            </Link>
            <Link
              className="text-[0.8125rem] text-[#d5e4dd] hover:text-white hover:underline hover:underline-offset-4"
              href="/security"
            >
              امنیت داده
            </Link>
            <Link
              className="text-[0.8125rem] text-[#d5e4dd] hover:text-white hover:underline hover:underline-offset-4"
              href="/status"
            >
              وضعیت سرویس
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
