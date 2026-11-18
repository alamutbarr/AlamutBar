"use client";

import { Home, Layers3, PanelsTopLeft, Search } from "lucide-react";
import Link from "@/lib/navigation";
import { usePathname } from "@/lib/navigation";

const links = [
  { href: "/", label: "خانه", icon: Home },
  { href: "/services", label: "خدمات", icon: Layers3 },
  { href: "/tracking", label: "پیگیری بار", icon: Search },
  { href: "/apps", label: "ورود به پنل‌ها", icon: PanelsTopLeft },
];

export default function PublicMobileNav() {
  const path = usePathname();
  return (
    <nav className="app-tabs" aria-label="دسترسی سریع سایت">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            path === href || path.startsWith(href + "/") ? "page" : undefined
          }
          className={href === "/apps" ? "app-tab-primary" : undefined}
        >
          <span className="app-tab-icon">
            <Icon size={22} strokeWidth={1.8} />
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
