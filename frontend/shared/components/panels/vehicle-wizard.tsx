"use client";
import { useState } from "react";
import IranPlate from "./iran-plate";
import {
  TRAILER_TYPES,
  TRACTOR_TYPES,
  describeVehicle,
  getVehicleFields,
  tractorLabel,
  trailerLabel,
} from "@/lib/vehicle-config";

function coarseKind(tractor: string, trailer: string) {
  if (trailer === "refrigerated") return "refrigerated";
  if (tractor === "trailer") return "trailer";
  return "truck";
}

function capacityOf(tractor: string, specs: Record<string, string>) {
  const weight: Record<string, number> = { "2-3": 3, "3-5": 5, "5+": 8 };
  if (specs.weight && weight[specs.weight]) return weight[specs.weight];
  if (tractor === "trailer") return 22;
  if (tractor === "khavar") return 6;
  return 12;
}

export default function VehicleWizard({
  initial,
  onSubmit,
}: {
  initial?: {
    tractor_type?: string;
    trailer_type?: string;
    plate?: string;
    smart_card_number?: string;
    license_number?: string;
    specs?: Record<string, string>;
  };
  onSubmit: (data: {
    kind: string;
    plate: string;
    capacity: number;
    license_number: string;
    available: boolean;
    tractor_type: string;
    trailer_type: string;
    smart_card_number: string;
    specs: Record<string, string>;
  }) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [tractor, setTractor] = useState(initial?.tractor_type || "");
  const [trailer, setTrailer] = useState(initial?.trailer_type || "");
  const [plate, setPlate] = useState(initial?.plate || "");
  const [smart, setSmart] = useState(initial?.smart_card_number || "");
  const [license, setLicense] = useState(initial?.license_number || "");
  const [specs, setSpecs] = useState<Record<string, string>>(initial?.specs || {});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fields = getVehicleFields(tractor, trailer);
  const trailers =
    (TRAILER_TYPES as Record<string, { value: string; label: string }[]>)[tractor] ||
    [];

  async function save() {
    if (!/^\d{2} \S+ \d{3} ایران \d{2}$/.test(plate)) {
      setError("پلاک خودرو را کامل وارد کنید.");
      return;
    }
    if (smart && !/^\d{7}$/.test(smart)) {
      setError("شماره هوشمند باید دقیقاً ۷ رقم باشد.");
      return;
    }
    if (!/^\d{10}$/.test(license)) {
      setError("شماره گواهینامه باید دقیقاً ۱۰ رقم باشد.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit({
        kind: coarseKind(tractor, trailer),
        plate,
        capacity: capacityOf(tractor, specs),
        license_number: license,
        available: true,
        tractor_type: tractor,
        trailer_type: trailer,
        smart_card_number: smart,
        specs,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vehicle-wizard">
      <p className="muted">
        مرحله {step + 1} از ۴ · {["نوع کشنده", "نوع گاری", "مشخصات", "بازبینی"][step]}
      </p>
      {step === 0 && (
        <div className="option-grid">
          {TRACTOR_TYPES.map((item) => (
            <button
              type="button"
              key={item.value}
              className={tractor === item.value ? "btn" : "secondary-btn"}
              onClick={() => {
                setTractor(item.value);
                setTrailer("");
                setSpecs({});
                setStep(1);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {step === 1 && (
        <div className="option-grid">
          {trailers.map((item) => (
            <button
              type="button"
              key={item.value}
              className={trailer === item.value ? "btn" : "secondary-btn"}
              onClick={() => {
                setTrailer(item.value);
                setSpecs({});
                setStep(2);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {step === 2 && (
        <div className="stack">
          <label>
            پلاک
            <IranPlate value={plate} onChange={setPlate} />
          </label>
          <label>
            شماره هوشمند (۷ رقم)
            <input
              value={smart}
              inputMode="numeric"
              maxLength={7}
              dir="ltr"
              placeholder="مثال: ۴۱۲۱۳۹۴"
              onChange={(e) => setSmart(e.target.value.replace(/\D/g, "").slice(0, 7))}
            />
          </label>
          <p className="info-note">
            شماره هوشمند خودرو باید با شماره پلاک شما تطابق داشته باشد.
          </p>
          <label>
            شماره گواهینامه (۱۰ رقم)
            <input
              value={license}
              inputMode="numeric"
              maxLength={10}
              dir="ltr"
              onChange={(e) => setLicense(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </label>
          {fields.map((field) => (
            <label key={field.key}>
              {field.title}
              <select
                value={specs[field.key] || ""}
                onChange={(e) => setSpecs({ ...specs, [field.key]: e.target.value })}
              >
                <option value="">یک گزینه را انتخاب کنید</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      {step === 3 && (
        <dl className="detail-grid">
          <div>
            <dt>نوع کشنده</dt>
            <dd>{tractorLabel(tractor)}</dd>
          </div>
          <div>
            <dt>نوع گاری</dt>
            <dd>{trailerLabel(tractor, trailer)}</dd>
          </div>
          <div>
            <dt>پلاک</dt>
            <dd dir="ltr">{plate || "انتخاب نشده"}</dd>
          </div>
          <div>
            <dt>شماره هوشمند</dt>
            <dd dir="ltr">{smart || "ثبت نشده"}</dd>
          </div>
          {describeVehicle(tractor, trailer, specs).fields.map((field) => (
            <div key={field.key}>
              <dt>{field.title}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="wizard-actions">
        {step > 0 && (
          <button type="button" className="secondary-btn" onClick={() => setStep(step - 1)}>
            مرحله قبل
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (fields.some((field) => !specs[field.key])) {
                setError("همه مشخصات نمایش‌داده‌شده را انتخاب کنید.");
                return;
              }
              if (!tractor || !trailer) {
                setError("اول نوع کشنده و گاری را انتخاب کنید.");
                return;
              }
              setError("");
              setStep(3);
            }}
          >
            بازبینی
          </button>
        )}
        {step === 3 && (
          <button type="button" className="btn" disabled={busy} onClick={() => void save()}>
            {busy ? "در حال ثبت..." : "تأیید و ذخیره خودرو"}
          </button>
        )}
      </div>
    </div>
  );
}
