"use client";

import {
  ChevronLeft,
  Ellipsis,
  LifeBuoy,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import Link from "@/lib/navigation";
import { useEffect, useState } from "react";
import { Modal } from "./ui";

export type WorkspaceLink = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  active: boolean;
  shortLabel?: string;
  primary?: boolean;
};

export default function MobileNavigation({
  tabs,
  links,
  help,
  onLogout,
}: {
  tabs: WorkspaceLink[];
  links: WorkspaceLink[];
  help: string;
  onLogout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const mobile = window.matchMedia(
      "(max-width: 760px), (max-width: 950px) and (max-height: 500px) and (pointer: coarse)",
    );
    const resize = () => {
      if (!mobile.matches) setOpen(false);
    };
    mobile.addEventListener("change", resize);
    resize();
    return () => mobile.removeEventListener("change", resize);
  }, [open]);
  const inMore = !tabs.some((tab) => tab.active);
  return (
    <>
      <nav className="app-tabs" aria-label="ناوبری برنامه">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={tab.primary ? "app-tab-primary" : undefined}
            aria-current={tab.active ? "page" : undefined}
          >
            <span className="app-tab-icon">
              <tab.icon size={22} strokeWidth={1.8} />
            </span>
            <span>{tab.shortLabel || tab.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className={inMore ? "app-tab-selected" : undefined}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="app-tab-icon">
            <Ellipsis size={22} />
          </span>
          <span>بیشتر</span>
        </button>
      </nav>
      {open && (
        <Modal
          title="همه بخش‌های برنامه"
          className="app-menu"
          onClose={() => setOpen(false)}
        >
          <nav className="app-menu-links" aria-label="همه بخش‌های پنل">
            {links.map((item) => (
              <Link
                href={item.href}
                key={item.key}
                aria-current={item.active ? "page" : undefined}
                onNavigate={() => setOpen(false)}
              >
                <span className="app-menu-icon">
                  <item.icon size={20} strokeWidth={1.8} />
                </span>
                <span>{item.label}</span>
                <ChevronLeft size={16} />
              </Link>
            ))}
            <Link href={help} onNavigate={() => setOpen(false)}>
              <span className="app-menu-icon">
                <LifeBuoy size={20} strokeWidth={1.8} />
              </span>
              <span>راهنمای پنل</span>
              <ChevronLeft size={16} />
            </Link>
            <button
              type="button"
              className="app-menu-logout"
              onClick={() => {
                setOpen(false);
                void onLogout();
              }}
            >
              <span className="app-menu-icon">
                <LogOut size={20} strokeWidth={1.8} />
              </span>
              <span>خروج از حساب</span>
            </button>
          </nav>
        </Modal>
      )}
    </>
  );
}
