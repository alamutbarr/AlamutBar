"use client";
import { number, roles, vehicles, type User } from "@/lib/api";
import type { Mutate } from "@/lib/workspace-types";
import Link from "@/lib/navigation";
import { ShieldCheck } from "lucide-react";
import { PageTitle } from "./shared";
import { useState } from "react";
export default function Team({
  team,
  busy,
  mutate,
  canVerify = true,
}: {
  team: User[];
  busy: boolean;
  mutate: Mutate;
  canVerify?: boolean;
}) {
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("");
  const rows = team.filter(
    (u) =>
      (!filter || u.role === filter) &&
      (
        u.name +
        u.username +
        u.phone +
        (u.vehicle?.plate || "") +
        u.company
      ).includes(q),
  );
  return (
    <>
      <PageTitle
        title="آدم‌های این مسیر"
        text="احراز حساب‌ها و دسترسی به اطلاعات همکاری"
      />
      <section className="card">
        <div className="list-toolbar">
          <label>
            جست‌وجوی کاربر و ناوگان
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="نام، موبایل، نام کاربری یا پلاک"
            />
          </label>
          <label>
            نقش
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">همه نقش‌ها</option>
              {["owner", "driver", "inspector"].map((role) => (
                <option key={role} value={role}>
                  {roles[role as keyof typeof roles]}
                </option>
              ))}
            </select>
          </label>
          <span>{number(rows.length)} کاربر</span>
        </div>
        <div className="table-wrap app-records">
          <table role="table" aria-label="کاربران و ناوگان">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">
                  نام
                </th>
                <th role="columnheader" scope="col">
                  نقش
                </th>
                <th role="columnheader" scope="col">
                  شماره تماس
                </th>
                <th role="columnheader" scope="col">
                  خودرو / شرکت
                </th>
                <th role="columnheader" scope="col">
                  احراز حساب
                </th>
                <th role="columnheader" scope="col">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {rows.map((u) => (
                <tr role="row" key={u.id}>
                  <td role="cell">
                    <b>{u.name || u.username}</b>
                    <small className="block muted">{u.username}</small>
                  </td>
                  <td role="cell" data-label="نقش">
                    {roles[u.role]}
                  </td>
                  <td role="cell" data-label="شماره تماس">
                    <bdi>{u.phone}</bdi>
                  </td>
                  <td role="cell" data-label="خودرو / شرکت">
                    {u.vehicle ? (
                      <>
                        <b>{u.vehicle.plate}</b>
                        <small className="block muted">
                          {vehicles[u.vehicle.kind]} ·{" "}
                          {number(u.vehicle.capacity)} تن ·{" "}
                          {u.vehicle.available ? "آماده حمل" : "خارج از دسترس"}
                        </small>
                      </>
                    ) : (
                      u.company || "—"
                    )}
                  </td>
                  <td role="cell" data-label="احراز حساب">
                    {u.verified ? (
                      <span className="verified">
                        <ShieldCheck size={16} />
                        احراز شده
                      </span>
                    ) : (
                      <span className="muted">در انتظار بررسی</span>
                    )}
                  </td>
                  <td role="cell" data-actions="true">
                    {!canVerify ? (
                      <span className="muted">نمایش اطلاعات</span>
                    ) : u.role === "driver" ? (
                      <Link
                        className="secondary-btn"
                        href={"/admin/driver-review/" + u.id}
                      >
                        پرونده و مدارک
                      </Link>
                    ) : (
                      <button
                        className="secondary-btn"
                        disabled={busy}
                        onClick={() =>
                          mutate("team/" + u.id + "/verify/", {
                            verified: !u.verified,
                          })
                        }
                      >
                        {u.verified ? "لغو تأیید" : "تأیید مدارک"}
                      </button>
                    )}
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
