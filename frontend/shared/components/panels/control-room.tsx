"use client";
import { PanelError, usePanelRefresh } from "../panel-feedback";
import { useCallback, useEffect, useState } from "react";
import Link from "@/lib/navigation";
import { api, number, date } from "@/lib/api";
import FleetMap, { type MapPoint } from "../fleet-map";
import { Loading, Empty } from "../ui";
export type ControlData = {
  positions: (MapPoint & {
    shipment: number;
    code: string;
    driver: string;
    origin: string;
    destination: string;
    created_at: string;
    observed_at: string;
  })[];
  moving_without_location: {
    id: number;
    code: string;
    origin: string;
    destination: string;
  }[];
  pending_drivers: number;
  email_queue: number;
  email_failed: number;
  expired_drivers: number;
  pending_shipments: number;
  unassigned: number;
  open_incidents: number;
  overdue_followups: number;
  late_pickups: {
    id: number;
    code: string;
    pickup_date: string;
    status: string;
  }[];
  lead_stages: { stage: string; count: number }[];
  staff: { id: number; first_name: string; last_name: string }[];
  driver_queue: {
    id: number;
    name: string;
    status: string;
    submitted_at: string;
  }[];
};
export default function ControlRoom() {
  const [data, setData] = useState<ControlData | null>(null),
    [error, setError] = useState(""),
    [updated, setUpdated] = useState("");
  const load = useCallback(async () => {
    try {
      setData(await api("control-room/"));
      setUpdated(new Date().toLocaleTimeString("fa-IR"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  usePanelRefresh(load);
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);
  if (!data)
    return error ? (
      <PanelError error={error} retry={() => void load()} />
    ) : (
      <Loading />
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">اتاق کنترل عملیات</span>
          <h1>هر اتفاق، در یک نگاه.</h1>
          <p>به‌روزرسانی هر ۱۵ ثانیه · آخرین دریافت {updated}</p>
        </div>
        <button className="secondary-btn" onClick={() => void load()}>
          به‌روزرسانی
        </button>
      </div>
      {error && (
        <p className="error">
          ارتباط قطع شده؛ اطلاعات زیر مربوط به دریافت قبلی است. {error}
        </p>
      )}
      <div className="stats-grid">
        {[
          ["پرونده راننده منتظر بررسی", data.pending_drivers],
          ["مدارک منقضی", data.expired_drivers],
          ["رخداد باز", data.open_incidents],
          ["پیگیری عقب‌افتاده", data.overdue_followups],
        ].map(([title, value]) => (
          <article className="stat-card" key={title}>
            <span>{title}</span>
            <strong>{number(value)}</strong>
          </article>
        ))}
      </div>
      <p className="info-note">
        پیام‌های در صف: {number(data.email_queue)} · ارسال ناموفق:{" "}
        {number(data.email_failed)} · زمان آخرین موقعیت، ملاک تازگی داده است.
      </p>
      <section className="card form-card">
        <div className="card-head">
          <div>
            <h2>نقشه ناوگان در حال حمل</h2>
            <p>نشانگر زرد: آخرین موقعیت بیش از ۵ دقیقه قدمت دارد.</p>
          </div>
          <span className="badge">
            {number(data.positions.length)} موقعیت ثبت‌شده
          </span>
        </div>
        <FleetMap
          points={data.positions.map((p) => ({
            ...p,
            label: p.driver + " · " + p.code,
          }))}
          height={430}
        />
        <div className="table-wrap app-records">
          <table role="table" aria-label="آخرین موقعیت ناوگان">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">
                  محموله / راننده
                </th>
                <th role="columnheader" scope="col">
                  مسیر
                </th>
                <th role="columnheader" scope="col">
                  آخرین اندازه‌گیری
                </th>
                <th role="columnheader" scope="col">
                  دقت
                </th>
                <th role="columnheader" scope="col">
                  وضعیت موقعیت
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {data.positions.map((p) => (
                <tr role="row" key={p.shipment}>
                  <td role="cell">
                    <Link href={"/admin/shipments/" + p.shipment}>
                      {p.code}
                      <small className="block muted">{p.driver}</small>
                    </Link>
                  </td>
                  <td role="cell" data-label="مسیر" data-wide="true">
                    {p.origin} ← {p.destination}
                  </td>
                  <td role="cell" data-label="آخرین اندازه‌گیری">
                    {new Date(p.observed_at || p.created_at).toLocaleString(
                      "fa-IR",
                    )}
                  </td>
                  <td role="cell" data-label="دقت">
                    {number(p.accuracy)} متر
                  </td>
                  <td role="cell" data-label="وضعیت موقعیت">
                    <span
                      className={
                        "badge " + (p.stale ? "pending" : "in_transit")
                      }
                    >
                      {p.stale ? "قدیمی؛ نیازمند پیگیری" : "به‌روز"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="reports-grid detail-section">
        <section className="card form-card">
          <h2>هشدارهای نیازمند اقدام</h2>
          <p>
            درخواست بررسی‌نشده: {number(data.pending_shipments)} · بدون راننده:{" "}
            {number(data.unassigned)}
          </p>
          {data.moving_without_location.map((s) => (
            <Link
              className="notice"
              href={"/admin/shipments/" + s.id}
              key={s.id}
            >
              <b>{s.code}</b>
              <span>در حال حمل؛ موقعیت دریافت نشده</span>
            </Link>
          ))}
          {data.late_pickups.map((s) => (
            <Link
              className="notice"
              href={"/admin/shipments/" + s.id}
              key={s.id}
            >
              <b>{s.code}</b>
              <span>تاریخ بارگیری گذشته: {date(s.pickup_date)}</span>
            </Link>
          ))}
        </section>
        <section className="card form-card">
          <h2>صف پرونده رانندگان</h2>
          {data.driver_queue.length ? (
            data.driver_queue.map((p) => (
              <Link
                className="notice"
                href={"/admin/driver-review/" + p.id}
                key={p.id}
              >
                <b>{p.name}</b>
                <span>
                  {p.status === "submitted"
                    ? "در انتظار بررسی"
                    : "نیازمند اصلاح"}
                </span>
                <small>{date(p.submitted_at)}</small>
              </Link>
            ))
          ) : (
            <Empty title="پرونده‌ای در صف نیست" />
          )}
        </section>
      </div>
    </>
  );
}
