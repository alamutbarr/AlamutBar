"use client";
import { api, type Shipment } from "@/lib/api";
import { useState } from "react";

const CHECKLIST = [
  { key: "vehicle_present", label: "خودرو در محل بارگیری حاضر است" },
  { key: "vehicle_match", label: "خودرو با مأموریت می‌خواند" },
  { key: "cargo_identity", label: "هویت محموله با درخواست یکی است" },
  { key: "cargo_info", label: "اطلاعات ثبت‌شده بار درست است" },
  { key: "seal", label: "پلمب سالم است" },
  { key: "lashing", label: "مهار بار درست است" },
];

const KINDS = [
  ["seal", "عکس پلمب"],
  ["lashing", "عکس مهار"],
  ["cargo", "عکس کالا"],
  ["weighbridge_empty", "باسکول خالی"],
  ["weighbridge_full", "باسکول پر"],
] as const;

type Item = { key: string; label: string; checked: boolean; note: string };

export default function InspectorVisit({
  shipment,
  onSaved,
}: {
  shipment: Shipment;
  onSaved: () => Promise<void> | void;
}) {
  const stage = ["near_destination", "delivered"].includes(shipment.status)
    ? "delivery"
    : "loading";
  const existing = shipment.inspections?.find((item) => item.stage === stage);
  const [items, setItems] = useState<Item[]>(() =>
    CHECKLIST.map((row) => {
      const saved = existing?.checklist?.find((item) => item.key === row.key);
      return {
        key: row.key,
        label: row.label,
        checked: Boolean(saved?.checked),
        note: saved?.note || "",
      };
    }),
  );
  const [photos, setPhotos] = useState(existing?.photos || []);
  const [seal, setSeal] = useState(existing?.seal_number || "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(kind: string, file: File) {
    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);
    setBusy(true);
    setError("");
    try {
      const saved = await api<NonNullable<Shipment["inspections"]>[number]>(
        "shipments/" + shipment.id + "/inspection-photos/",
        "POST",
        body,
      );
      setPhotos(saved.photos || []);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(finalize: boolean) {
    setBusy(true);
    setError("");
    try {
      await api("shipments/" + shipment.id + "/inspection-report/", "POST", {
        stage,
        checklist: items,
        seal_number: seal,
        notes: note,
        finalize,
      });
      await onSaved();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card detail-section">
      <h2>چک‌لیست بازرسی {stage === "loading" ? "بارگیری" : "تحویل"}</h2>
      <p className="muted">
        بارگذاری عکس چک‌لیست را پاک نمی‌کند. توقف بار فقط پس از تصمیم مرکز عملیات است.
      </p>
      {items.map((item) => (
        <label className="check-line" key={item.key}>
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(event) =>
              setItems((current) =>
                current.map((row) =>
                  row.key === item.key ? { ...row, checked: event.target.checked } : row,
                ),
              )
            }
          />
          {item.label}
        </label>
      ))}
      <label>
        شماره پلمب
        <input value={seal} onChange={(event) => setSeal(event.target.value)} />
      </label>
      <div className="wizard-actions">
        {KINDS.map(([kind, label]) => (
          <label className="secondary-btn upload-btn" key={kind}>
            {label}
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(kind, file);
                event.target.value = "";
              }}
            />
          </label>
        ))}
      </div>
      {photos.length > 0 && (
        <p className="muted">{photos.length} عکس بازرسی ذخیره شده است.</p>
      )}
      <label>
        یادداشت
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="wizard-actions">
        <button className="secondary-btn" type="button" disabled={busy} onClick={() => void submit(false)}>
          ذخیره پیش‌نویس
        </button>
        <button className="btn" type="button" disabled={busy} onClick={() => void submit(true)}>
          ارسال به مرکز عملیات
        </button>
      </div>
    </section>
  );
}
