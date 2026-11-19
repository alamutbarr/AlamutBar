"use client";
import { api, type Shipment } from "@/lib/api";
import { CheckCircle2, Phone } from "lucide-react";
import { useState } from "react";
import type { Mutate } from "@/lib/workspace-types";

const STEPS = [
  ["assigned", "قبول‌شده"],
  ["en_route_pickup", "در حرکت به بارگیری"],
  ["arrived_pickup", "رسیده به بارگیری"],
  ["loading", "تأیید متصدی"],
  ["waybill", "بارنامه صادر شد"],
  ["in_transit", "در مسیر"],
  ["near_destination", "نزدیک مقصد"],
  ["delivered", "تحویل بار"],
  ["completed", "تکمیل‌شده"],
] as const;

export function SosLink({ phone }: { phone?: string }) {
  const dial = (phone || "02112345678").replace(/\D/g, "");
  return (
    <a className="danger-btn" href={"tel:" + dial}>
      <Phone size={16} /> تماس با اپراتور
    </a>
  );
}

export default function DriverTrip({
  shipment,
  busy,
  mutate,
  supportPhone,
}: {
  shipment: Shipment;
  busy: boolean;
  mutate: Mutate;
  supportPhone?: string;
}) {
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState(shipment.pod?.photo_count || 0);
  const index = STEPS.findIndex((step) => step[0] === shipment.status);
  const inspection = shipment.inspections?.find((item) => item.stage === "loading");
  const next: Record<string, [string, string]> = {
    assigned: ["en_route_pickup", "شروع حرکت به بارگیری"],
    en_route_pickup: ["arrived_pickup", "رسیدم به محل بارگیری"],
    in_transit: ["near_destination", "به مقصد رسیدم"],
  };
  const move = next[shipment.status];
  const waybill = shipment.waybill;

  async function uploadPhoto(file: File) {
    const body = new FormData();
    body.set("file", file);
    const saved = await api<{ count: number }>(
      "shipments/" + shipment.id + "/delivery-photos/",
      "POST",
      body,
    );
    setPhotos(saved.count);
  }

  return (
    <section className="card detail-section driver-trip">
      <h2>مراحل مأموریت</h2>
      {shipment.sensitive && (
        <p className="info-note">این بار حساس است. اولویت بالاتر و متصدی اجباری.</p>
      )}
      {shipment.status === "on_hold" && (
        <p className="error">متوقف به‌خاطر بازرسی. تا اعلام اپراتور منتظر بمانید.</p>
      )}
      <ol className="trip-steps">
        {STEPS.map(([key, label], step) => (
          <li key={key} className={step < index ? "done" : step === index ? "current" : ""}>
            {label}
            {step === index && key !== "completed" ? <small>در حال انجام...</small> : null}
          </li>
        ))}
      </ol>
      {inspection && (
        <p className="info-note">
          بازرسی: {inspection.passed ? "تأیید شد" : "نیازمند اصلاح"}
          {inspection.notes ? " — " + inspection.notes : ""}
        </p>
      )}
      {shipment.status === "arrived_pickup" && !inspection?.passed && (
        <p className="muted">در انتظار تأیید متصدی...</p>
      )}
      {((["loading", "waybill"].includes(shipment.status) || waybill) &&
        ["loading", "waybill", "in_transit", "near_destination", "delivered", "completed"].includes(
          shipment.status,
        )) && (
        <div className="waybill-box">
          <h3>بارنامه</h3>
          {!waybill?.sms_sent && ["loading", "waybill"].includes(shipment.status) && (
            <p>در انتظار صدور بارنامه و ارسال کد توسط اپراتور...</p>
          )}
          {waybill?.sms_sent && !waybill.code_verified && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void mutate("shipments/" + shipment.id + "/waybill-verify/", { code });
              }}
            >
              <label>
                کد پیامک‌شده را وارد کنید
                <input
                  value={code}
                  inputMode="numeric"
                  maxLength={4}
                  dir="ltr"
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </label>
              <button className="btn" disabled={busy || code.length < 4}>
                تأیید کد
              </button>
            </form>
          )}
          {waybill?.code_verified && !waybill.photo_url && (
            <p>کد تأیید شد. در انتظار بارگذاری عکس بارنامه توسط اپراتور...</p>
          )}
          {waybill?.photo_url && (
            <a href={waybill.photo_url} target="_blank" rel="noreferrer">
              عکس بارنامه صادرشده
            </a>
          )}
          {shipment.destination_locked && (
            <p className="muted">آدرس دقیق پس از صدور بارنامه نمایش داده می‌شود.</p>
          )}
        </div>
      )}
      {move && (
        <button
          className="btn"
          disabled={busy || (move[0] === "in_transit" && (!waybill?.photo_url || !waybill.code_verified))}
          onClick={() =>
            void mutate("shipments/" + shipment.id + "/transition/", { status: move[0] })
          }
        >
          {move[1]}
        </button>
      )}
      {shipment.status === "waybill" && waybill?.photo_url && waybill.code_verified && (
        <button
          className="btn"
          disabled={busy}
          onClick={() =>
            void mutate("shipments/" + shipment.id + "/transition/", { status: "in_transit" })
          }
        >
          شروع حرکت
        </button>
      )}
      {shipment.status === "near_destination" && (
        <div className="pod-box">
          <h3>تحویل بار</h3>
          <p>حداقل ۳ عکس از پلمب و بار، سپس کد چهار رقمی گیرنده.</p>
          <label className="secondary-btn upload-btn">
            افزودن عکس ({photos} از ۳)
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadPhoto(file).catch(() => undefined);
                e.target.value = "";
              }}
            />
          </label>
          <button
            className="secondary-btn"
            type="button"
            disabled={busy}
            onClick={() => void mutate("shipments/" + shipment.id + "/delivery-code/", {})}
          >
            درخواست کد تحویل
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void mutate("shipments/" + shipment.id + "/pod/", { code, reason: "" });
            }}
          >
            <label>
              کد تحویل
              <input
                value={code}
                inputMode="numeric"
                maxLength={4}
                dir="ltr"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </label>
            <button className="btn" disabled={busy || photos < 3 || code.length < 4}>
              تأیید و ثبت تخلیه
            </button>
          </form>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void mutate("shipments/" + shipment.id + "/pod/", { code: "", reason });
            }}
          >
            <label>
              دلیل تحویل بدون کد
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: تحویل‌گیرنده کد را دریافت نکرد و اپراتور تأیید کرد"
              />
            </label>
            <button className="secondary-btn" disabled={busy || photos < 3 || reason.trim().length < 5}>
              ثبت تحویل بدون کد
            </button>
          </form>
        </div>
      )}
      {["delivered", "completed", "cancelled"].includes(shipment.status) && (
        <p>
          <CheckCircle2 size={16} />{" "}
          {shipment.status === "cancelled" ? "مأموریت لغو شد" : "مأموریت به پایان این مرحله رسید"}
          {shipment.pod?.photo_count
            ? " · " + shipment.pod.photo_count + " عکس ثبت شد"
            : ""}
        </p>
      )}
      {(shipment.route_km || shipment.eta_hours) && (
        <p className="muted">
          {shipment.route_km ? shipment.route_km + " کیلومتر" : ""}
          {shipment.eta_hours ? " · حدود " + shipment.eta_hours + " ساعت" : ""}
        </p>
      )}
      <SosLink phone={supportPhone} />
    </section>
  );
}
