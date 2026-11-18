"use client";
import { number, statuses } from "@/lib/api";
import type { Dash } from "@/lib/workspace-types";
import { Download } from "lucide-react";
import { Empty } from "../ui";
import { PageTitle } from "./shared";
export default function Reports({
  dash,
  canExport = true,
}: {
  dash: Dash;
  canExport?: boolean;
}) {
  return (
    <>
      <PageTitle
        title="تصویر روشن عملکرد"
        text="گزارش از داده‌های واقعی قابل مشاهده برای نقش شما"
      />
      <div className="reports-grid">
        <section className="card report-card">
          <h2>توزیع وضعیت محموله‌ها</h2>
          {dash.by_status.length ? (
            dash.by_status.map((s) => (
              <div className="bar-row" key={s.status}>
                <div>
                  <span>{statuses[s.status]}</span>
                  <b>{number(s.count)}</b>
                </div>
                <div className="bar-track">
                  <i
                    style={{
                      width: (s.count / Math.max(dash.total, 1)) * 100 + "%",
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </section>
        <section className="card report-card">
          <h2>شاخص‌های عملیات</h2>
          <div className="report-metric">
            <span>نرخ تحویل از کل درخواست‌ها</span>
            <strong>
              {number(
                dash.total
                  ? Math.round((dash.delivered / dash.total) * 100)
                  : 0,
              )}
              ٪
            </strong>
          </div>
          <div className="report-metric">
            <span>محموله‌های در جریان</span>
            <strong>{number(dash.active)}</strong>
          </div>
          <div className="report-metric">
            <span>درخواست‌های پشتیبانی باز</span>
            <strong>{number(dash.open_tickets)}</strong>
          </div>
          {canExport && (
            <a href="/api/shipments/export/" className="secondary-btn">
              <Download size={17} />
              دریافت داده‌های محموله‌ها
            </a>
          )}
        </section>
      </div>
    </>
  );
}
