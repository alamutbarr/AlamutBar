import type { Role } from "./api";
export const panelApps = {
  owner: {
    role: "owner",
    name: "الموت · صاحب بار",
    short: "صاحب بار",
    description: "ثبت درخواست، پیگیری محموله و امور مالی",
    color: "#087f8c",
  },
  driver: {
    role: "driver",
    name: "الموت · راننده",
    short: "راننده",
    description: "پرونده همکاری، بازار بار و مدیریت سفر",
    color: "#265e45",
  },
  admin: {
    role: "operator",
    name: "الموت · اپراتور",
    short: "اپراتور",
    description: "اتاق کنترل، CRM، ناوگان و مدیریت محتوا",
    color: "#183e46",
  },
  inspector: {
    role: "inspector",
    name: "الموت · متصدی",
    short: "متصدی",
    description: "بازرسی مبدأ و مقصد و ثبت گزارش تحویل",
    color: "#805d35",
  },
} as const;
export type PanelKey = keyof typeof panelApps;
export function panelRole(panel: string): Role | undefined {
  return Object.hasOwn(panelApps, panel)
    ? panelApps[panel as PanelKey].role
    : undefined;
}
export function validPanelRoute(
  panel: string,
  segments: string[] = [],
): boolean {
  const role = panelRole(panel);
  if (!role || segments.length > 2) return false;
  const [section = "dashboard", detail] = segments;
  const allowed: Record<Role, string[]> = {
    owner: [
      "app",
      "dashboard",
      "shipments",
      "invoices",
      "reports",
      "tickets",
      "notifications",
      "settings",
      "incidents",
      "addresses",
      "complaints",
    ],
    driver: [
      "app",
      "dashboard",
      "shipments",
      "market",
      "invoices",
      "reports",
      "tickets",
      "notifications",
      "settings",
      "incidents",
      "onboarding",
    ],
    operator: [
      "app",
      "dashboard",
      "shipments",
      "team",
      "inspections",
      "invoices",
      "reports",
      "tickets",
      "notifications",
      "settings",
      "control",
      "crm",
      "incidents",
      "operations",
      "driver-review",
      "articles",
      "complaints",
      "owner-kyc",
    ],
    inspector: [
      "app",
      "dashboard",
      "shipments",
      "inspections",
      "reports",
      "tickets",
      "notifications",
      "settings",
      "incidents",
    ],
  };
  if (!allowed[role].includes(section)) return false;
  if (!detail) return section !== "driver-review";
  if (
    !["shipments", "market", "inspections", "driver-review"].includes(section)
  )
    return false;
  if (detail === "new")
    return section === "shipments" && ["owner", "operator"].includes(role);
  return /^[1-9]\d{0,9}$/.test(detail);
}
