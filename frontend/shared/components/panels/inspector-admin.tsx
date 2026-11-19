"use client";
import { api } from "@/lib/api";
import { useEffect, useState, type FormEvent } from "react";

type InspectorRow = {
  id: number;
  full_name: string;
  phone: string;
  notes: string;
  is_active: boolean;
  unassigned?: number;
};

export default function InspectorAdmin() {
  const [rows, setRows] = useState<InspectorRow[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    setRows(await api<InspectorRow[]>("inspectors/"));
  }

  useEffect(() => {
    void load().catch((reason) => setError((reason as Error).message));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    try {
      await api("inspectors/", "POST", {
        full_name: String(data.get("full_name") || ""),
        phone: String(data.get("phone") || ""),
        notes: String(data.get("notes") || ""),
      });
      event.currentTarget.reset();
      setToast("متصدی جدید تعریف شد. ورود از مسیر پنل متصدی با همین موبایل است.");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function toggle(row: InspectorRow) {
    const saved = await api<InspectorRow>("inspectors/" + row.id + "/", "PATCH", {
      is_active: !row.is_active,
    });
    setToast(
      saved.is_active
        ? "متصدی فعال شد."
        : "متصدی غیرفعال شد" +
            (saved.unassigned ? " و از " + saved.unassigned + " مأموریت باز کنار رفت." : "."),
    );
    await load();
  }

  return (
    <section className="card detail-section">
      <h2>بازرسی و کیفیت</h2>
      <p className="muted">تعریف متصدی جدید و فعال یا غیرفعال کردن متصدی‌های میدان.</p>
      <form className="form-grid" onSubmit={(event) => void create(event)}>
        <label>
          نام متصدی
          <input name="full_name" required placeholder="تعریف متصدی جدید" />
        </label>
        <label>
          موبایل
          <input name="phone" required dir="ltr" inputMode="tel" placeholder="0912xxxxxxx" />
        </label>
        <label>
          یادداشت
          <input name="notes" placeholder="شیفت یا پایانه" />
        </label>
        <button className="btn" type="submit">
          تعریف متصدی جدید
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {toast && <p className="info-note">{toast}</p>}
      <div className="stack">
        {rows.map((row) => (
          <div className="list-row" key={row.id}>
            <div>
              <b>{row.full_name}</b>
              <p dir="ltr">{row.phone}</p>
              {row.notes && <small>{row.notes}</small>}
            </div>
            <button className="secondary-btn" type="button" onClick={() => void toggle(row)}>
              {row.is_active ? "غیرفعال کردن" : "فعال کردن"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
