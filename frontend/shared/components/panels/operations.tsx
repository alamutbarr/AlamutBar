"use client";
import { date } from "@/lib/api";
import type { Ops } from "@/lib/workspace-types";
import { Empty } from "../ui";
import { PageTitle } from "./shared";
export default function Operations({ ops }: { ops: Ops }) {
  return (
    <>
      <PageTitle
        title="مرکز رویدادها"
        text="درخواست‌های وب‌سایت و سابقه قابل پیگیری عملیات"
      />
      <section className="card detail-section">
        <h2>درخواست‌های تماس</h2>
        {ops.contacts.length ? (
          ops.contacts.map((c) => (
            <div className="list-row" key={c.id}>
              <div>
                <b>{c.name}</b>
                <p>{c.message}</p>
                <small>{date(c.created_at)}</small>
              </div>
              <a href={"tel:" + c.phone} dir="ltr">
                {c.phone}
              </a>
            </div>
          ))
        ) : (
          <Empty title="درخواست تازه‌ای نیست" />
        )}
      </section>
      <section className="card">
        <div className="card-head">
          <h2>ردپای عملیات</h2>
          <span className="muted small">۱۰۰ رویداد آخر</span>
        </div>
        <div className="table-wrap app-records">
          <table role="table" aria-label="رویدادهای عملیات">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">
                  عملیات
                </th>
                <th role="columnheader" scope="col">
                  کاربر
                </th>
                <th role="columnheader" scope="col">
                  شناسه رکورد
                </th>
                <th role="columnheader" scope="col">
                  تاریخ
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {ops.audit.map((a) => (
                <tr role="row" key={a.id}>
                  <td role="cell">
                    <code>{a.action}</code>
                  </td>
                  <td role="cell" data-label="کاربر">
                    {a.actor__first_name}
                  </td>
                  <td role="cell" data-label="شناسه رکورد">
                    {a.object_id}
                  </td>
                  <td role="cell" data-label="تاریخ">
                    {date(a.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
