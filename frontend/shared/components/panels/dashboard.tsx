"use client";
import { number, type Role, type Shipment, type User } from "@/lib/api";
import type { Dash } from "@/lib/workspace-types";
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  Package,
  Truck,
  Wallet,
} from "lucide-react";
import Link from "@/lib/navigation";
import type { ReactNode } from "react";
import type { WorkspaceLink } from "../mobile-navigation";
const actionDescription: Record<string, string> = {
  new: "مشخصات بار و مسیر را ثبت کنید.",
  market: "بارهای آماده را بررسی کنید و پیشنهاد بدهید.",
  onboarding: "اطلاعات و مدارک را برای بررسی اپراتور تکمیل کنید.",
  control: "موقعیت ناوگان و موارد نیازمند پیگیری را ببینید.",
  inspections: "مأموریت‌های بازرسی و چک‌لیست‌ها را باز کنید.",
};
export default function Overview({
  dash,
  user,
  role,
  base,
  shipmentTable,
  mobileAction,
}: {
  dash: Dash;
  user: User | null;
  role: Role;
  base: string;
  shipmentTable: (rows: Shipment[]) => ReactNode;
  mobileAction?: WorkspaceLink;
}) {
  const canDispatch =
    role !== "operator" || Boolean(user?.capabilities.includes("dispatch"));
  const driverAction = user?.driver_market_enabled
    ? {
        href: "/market",
        label: "مشاهده بازار بار",
        detail: actionDescription.market,
      }
    : {
        href: "/onboarding",
        label: "تکمیل پرونده راننده",
        detail: actionDescription.onboarding,
      };
  const nextSection = canDispatch
    ? "shipments"
    : user?.capabilities.includes("crm")
      ? "crm"
      : user?.capabilities.includes("monitoring")
        ? "control"
        : user?.capabilities.includes("verification")
          ? "team"
          : user?.capabilities.includes("finance")
            ? "invoices"
            : user?.capabilities.includes("content")
              ? "articles"
              : "settings";
  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">هر مسیر، یک تعهد است</span>
          <h1>
            {user?.first_name} عزیز، روزتان بخیر
            <span className="welcome-dot">.</span>
          </h1>
          <p>اینجا، تصویر روشنی از مسیرهای پیش روی شماست.</p>
        </div>
        <div className="today">
          <span>امروز</span>
          <b>
            {new Date().toLocaleDateString("fa-IR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </b>
          <small>
            مرکز هماهنگی الموت <i />
          </small>
        </div>
      </div>
      {role === "owner" && user && !/^\d{10}$/.test(user.postal_code || "") && (
        <p className="info-note">
          برای ثبت بار، کد پستی ۱۰ رقمی را در{" "}
          <Link href={base + "/settings"}>حساب کاربری</Link> ذخیره کنید.
        </p>
      )}
      {role === "owner" &&
        user &&
        user.kyc_status &&
        user.kyc_status !== "approved" &&
        user.kyc_status !== "missing" && (
          <p className="info-note">
            احراز هویت شما {user.kyc_status === "rejected" ? "رد شده" : "در انتظار بررسی"} است.
            تا تأیید اپراتور، ثبت بار بسته می‌ماند.
          </p>
        )}
      {mobileAction && (
        <Link className="app-dashboard-action" href={mobileAction.href}>
          <span className="app-action-icon">
            <mobileAction.icon size={24} strokeWidth={1.7} />
          </span>
          <span>
            <strong>{mobileAction.label}</strong>
            <small>
              {actionDescription[mobileAction.key] ||
                "ورود مستقیم به بخش کاری شما"}
            </small>
          </span>
          <ArrowLeft size={20} />
        </Link>
      )}
      <div className="stats-grid">
        {[
          {
            t: "کل محموله‌ها",
            v: dash.total,
            i: Package,
            s: "از شروع همکاری",
          },
          {
            t: "حمل‌های فعال",
            v: dash.active,
            i: Truck,
            s: "در چرخه عملیات",
            active: true,
          },
          {
            t: "تحویل‌های موفق",
            v: dash.delivered,
            i: CheckCircle2,
            s: "رسیده به مقصد",
          },
          {
            t: role === "inspector" ? "نیازمند پیگیری" : "مانده صورتحساب",
            v: role === "inspector" ? dash.open_tickets : dash.unpaid,
            i: role === "inspector" ? MessageSquare : Wallet,
            s: role === "inspector" ? "تیکت باز" : "تومان",
          },
        ].map((x) => (
          <article
            className={"stat-card " + (x.active ? "featured" : "")}
            key={x.t}
          >
            <div>
              <span>{x.t}</span>
              <x.i size={21} strokeWidth={1.5} />
            </div>
            <strong>{number(x.v)}</strong>
            <small>{x.s}</small>
          </article>
        ))}
      </div>
      <div className="dashboard-middle">
        <section className="card route-card">
          <div className="card-head">
            <div>
              <h2>مسیرها در جریان‌اند</h2>
              <p>وضعیت عملیاتی محموله‌های شما</p>
            </div>
            <span className="live-label">
              <i /> ثبت مرحله‌ای
            </span>
          </div>
          <div className="route-visual">
            <svg
              viewBox="0 0 700 220"
              role="img"
              aria-label="نمای شماتیک مراحل حمل"
            >
              <defs>
                <pattern
                  id="grid"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="#dbe5e0"
                    strokeWidth=".65"
                  />
                </pattern>
              </defs>
              <rect width="700" height="220" fill="url(#grid)" />
              <path
                d="M60 145C150 140 130 55 235 75S350 185 440 120 530 65 635 80"
                fill="none"
                stroke="#d6e3de"
                strokeWidth="22"
              />
              <path
                d="M60 145C150 140 130 55 235 75S350 185 440 120 530 65 635 80"
                fill="none"
                stroke="#087f8c"
                strokeWidth="2"
                strokeDasharray="6 6"
              />
              {[
                [60, 145],
                [235, 75],
                [440, 120],
                [635, 80],
              ].map(([cx, cy], i) => (
                <g key={i}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="12"
                    fill="#f8faf7"
                    stroke="#087f8c"
                    strokeWidth="2"
                  />
                  <circle cx={cx} cy={cy} r="4" fill="#087f8c" />
                </g>
              ))}
            </svg>
            <div className="route-labels">
              <span>ثبت درخواست</span>
              <span>تخصیص و بارگیری</span>
              <span>در مسیر</span>
              <span>تحویل نهایی</span>
            </div>
          </div>
          <div className="route-summary">
            <span>
              <i className="teal-dot" />
              {number(dash.active)} محموله فعال
            </span>
            <span>
              <i className="gold-dot" />
              {number(dash.pending)} منتظر بررسی
            </span>
            <Link href={base + "/" + nextSection}>
              مشاهده مسیرها
              <ArrowLeft size={14} />
            </Link>
          </div>
        </section>
        <section className="card attention-card">
          <span className="eyebrow">قدم بعدی شما</span>
          <h2>
            جزئیات کوچک،
            <br />
            <em>مسیرهای بهتر.</em>
          </h2>
          <p>
            {role === "owner"
              ? "درخواست حمل را با مشخصات دقیق ثبت کنید؛ هماهنگی مسیر از همین‌جا شروع می‌شود."
              : role === "driver"
                ? driverAction.detail
                : role === "inspector"
                  ? "محموله‌های تخصیص‌یافته و چک‌لیست‌های بازرسی در انتظار شما هستند."
                  : "درخواست‌های تازه را بررسی و مناسب‌ترین راننده و متصدی را هماهنگ کنید."}
          </p>
          <Link
            className="btn"
            href={
              base +
              (role === "owner"
                ? "/shipments/new"
                : role === "driver"
                  ? driverAction.href
                  : "/" + nextSection)
            }
          >
            {role === "owner"
              ? "ثبت درخواست حمل"
              : role === "driver"
                ? driverAction.label
                : canDispatch
                  ? "بررسی محموله‌ها"
                  : "ورود به بخش کاری"}
            <ArrowLeft size={17} />
          </Link>
          <MountainMark />
        </section>
      </div>
      {canDispatch && (
        <section className="card">
          <div className="card-head">
            <div>
              <h2>آخرین محموله‌ها</h2>
              <p>جزئیات هر سفر، همیشه در دسترس</p>
            </div>
            <Link className="text-link" href={base + "/" + nextSection}>
              همه محموله‌ها
              <ArrowLeft size={15} />
            </Link>
          </div>
          {shipmentTable(dash.recent)}
        </section>
      )}
    </>
  );
}

function MountainMark() {
  return (
    <svg className="mountain-mark" viewBox="0 0 160 90" aria-hidden="true">
      <path
        d="M5 85 55 10l48 75H5Zm58 0 42-60 47 60H63Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
