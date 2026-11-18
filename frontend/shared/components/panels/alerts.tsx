"use client";
import { PanelError, usePanelRefresh } from "../panel-feedback";
import { useCallback, useEffect, useState } from "react";
import Link from "@/lib/navigation";
import { api, date } from "@/lib/api";
import { Empty, Loading } from "../ui";

type AlertRow = {
  id: number;
  kind: string;
  severity: string;
  message: string;
  shipment: number;
  code: string;
  created_at: string;
};

const KINDS: Record<string, string> = {
  gps_cut: "قطع GPS",
  route_deviation: "انحراف از مسیر",
  delay: "تأخیر اعزام",
  inspector_absent: "غیبت متصدی",
  other: "سایر",
};

export default function Alerts() {
  const [rows, setRows] = useState<AlertRow[] | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState<Record<number, string>>({});
  const load = useCallback(() => {
    api<AlertRow[]>("alerts/")
      .then((data) => {
        setRows(data);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  usePanelRefresh(load);
  if (!rows) return error ? <PanelError error={error} retry={load} /> : <Loading />;
  return (
    <section className="stack">
      <h1>هشدارهای عملیات</h1>
      <p>قطع GPS، انحراف از مسیر، تأخیر اعزام و غیبت متصدی تا وقتی بسته نشوند اینجا می‌مانند.</p>
      {rows.length === 0 && <Empty title="هشدار بازی نیست" text="ناوگان در مسیر، موقعیت تازه دارد." />}
      {rows.map((row) => (
        <article className="card detail-section" key={row.id}>
          <b>{KINDS[row.kind] || row.kind}</b>
          <span> {row.severity === "critical" ? "بحرانی" : "هشدار"}</span>
          <p>{row.message}</p>
          <p>
            <Link href={"/admin/shipments/" + row.shipment}>{row.code}</Link>
            {" · "}
            {date(row.created_at)}
          </p>
          <form
            className="rating-form"
            onSubmit={(event) => {
              event.preventDefault();
              api("alerts/" + row.id + "/resolve/", "POST", {
                resolution: note[row.id] || "",
              })
                .then(load)
                .catch((err: Error) => setError(err.message));
            }}
          >
            <label>
              شرح اقدام
              <input
                value={note[row.id] || ""}
                onChange={(event) => setNote({ ...note, [row.id]: event.target.value })}
                required
              />
            </label>
            <button className="btn" type="submit">بستن هشدار</button>
          </form>
        </article>
      ))}
    </section>
  );
}
