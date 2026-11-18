"use client";
import cargoTypes from "../data/cargo-types.json";
import cities from "../data/iran-cities.json";
import LocationPicker from "./location-picker";
import PersianDate from "./persian-date";
import {
  api,
  handlingMethods,
  pickupWindows,
  trailerTypes,
  vehicles,
  type Shipment,
  type User,
} from "@/lib/api";
import { nationalIdOk } from "@/lib/national-id";
import Link from "@/lib/navigation";
import { useSearchParams } from "@/lib/navigation";
import { ArrowLeft, ArrowRight, Mic } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const windows = Object.keys(pickupWindows);
const tehranZones = [
  "مرکز، شمال و بافت متراکم",
  "غرب و شمال غرب",
  "غرب مرکزی و جنوب غرب صنعتی",
  "شرق و شمال شرق",
  "جنوب و جنوب شرق",
];
const steps = [
  "کالا",
  "مبدأ",
  "مقصد",
  "گیرنده",
  "زمان",
  "خودرو",
  "ارزش",
  "تصویر",
  "بازبینی",
];
type Draft = {
  title: string;
  cargo_type: string;
  cargo_note: string;
  packaging: string;
  package_count: string;
  weight: string;
  length_m: string;
  width_m: string;
  height_m: string;
  origin: string;
  origin_zone: string;
  origin_address: string;
  origin_lat: string;
  origin_lng: string;
  destination: string;
  destination_zone: string;
  destination_address: string;
  destination_lat: string;
  destination_lng: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_national_id: string;
  recipient_postal_code: string;
  pickup_date: string;
  urgency: string;
  pickup_windows: string[];
  loading_method: string;
  unloading_method: string;
  vehicle_type: string;
  trailer_type: string;
  price: string;
  cargo_value_rial: string;
  insurance_requested: boolean;
  requires_inspector: boolean;
  notes: string;
};
const emptyDraft = (): Draft => ({
  title: "",
  cargo_type: "",
  cargo_note: "",
  packaging: "",
  package_count: "",
  weight: "",
  length_m: "",
  width_m: "",
  height_m: "",
  origin: "",
  origin_zone: "",
  origin_address: "",
  origin_lat: "",
  origin_lng: "",
  destination: "",
  destination_zone: "",
  destination_address: "",
  destination_lat: "",
  destination_lng: "",
  recipient_name: "",
  recipient_phone: "",
  recipient_national_id: "",
  recipient_postal_code: "",
  pickup_date: "",
  urgency: "",
  pickup_windows: [],
  loading_method: "",
  unloading_method: "",
  vehicle_type: "",
  trailer_type: "",
  price: "",
  cargo_value_rial: "",
  insurance_requested: false,
  requires_inspector: false,
  notes: "",
});
const cityRows = cities as { name: string; province: string }[];

function digits(value: string) {
  return value
    .replace(/[۰-۹]/g, (char) => String(char.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (char) => String(char.charCodeAt(0) - 1632));
}
function suggestVehicle(weight: number, trailer: string) {
  if (trailer.includes("یخچال")) return "refrigerated";
  if (weight <= 2) return "pickup";
  if (weight <= 15) return "truck";
  return "trailer";
}
function fromShipment(shipment: Shipment): Draft {
  const draft = emptyDraft();
  draft.title = shipment.title;
  draft.cargo_type = shipment.cargo_type || "";
  draft.cargo_note = shipment.cargo_note || "";
  draft.packaging = shipment.packaging || "";
  draft.package_count = shipment.package_count ? String(shipment.package_count) : "";
  draft.weight = String(shipment.weight || "");
  draft.length_m = shipment.length_m || "";
  draft.width_m = shipment.width_m || "";
  draft.height_m = shipment.height_m || "";
  draft.origin = shipment.origin;
  draft.origin_zone = shipment.origin_zone || "";
  draft.origin_address = shipment.origin_address || "";
  draft.origin_lat = shipment.origin_lat || "";
  draft.origin_lng = shipment.origin_lng || "";
  draft.destination = shipment.destination;
  draft.destination_zone = shipment.destination_zone || "";
  draft.destination_address = shipment.destination_address || "";
  draft.destination_lat = shipment.destination_lat || "";
  draft.destination_lng = shipment.destination_lng || "";
  draft.recipient_name = shipment.recipient_name;
  draft.recipient_phone = shipment.recipient_phone;
  draft.recipient_national_id = shipment.recipient_national_id || "";
  draft.recipient_postal_code = shipment.recipient_postal_code || "";
  draft.pickup_date = shipment.pickup_date;
  draft.urgency = shipment.urgency || "";
  draft.pickup_windows = (shipment.pickup_window || "")
    .split(",")
    .filter((item) => windows.includes(item));
  draft.loading_method = shipment.loading_method || "";
  draft.unloading_method = shipment.unloading_method || "";
  draft.vehicle_type = shipment.vehicle_type;
  draft.trailer_type = shipment.trailer_type || "";
  draft.price = String(shipment.price || "");
  draft.cargo_value_rial = String((shipment.cargo_value || 0) * 10);
  draft.insurance_requested = Boolean(shipment.insurance_requested);
  draft.requires_inspector = Boolean(shipment.requires_inspector);
  draft.notes = shipment.notes || "";
  return draft;
}

export default function OwnerShipmentWizard({
  user,
  demo,
  base,
  onDone,
}: {
  user: User;
  demo: boolean;
  base: string;
  onDone: (shipment: Shipment) => void;
}) {
  const params = useSearchParams();
  const repeat = params.get("repeat");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [created, setCreated] = useState<Shipment | null>(null);
  const postalOk = /^\d{10}$/.test(digits(user.postal_code || ""));
  const kycOk =
    user.kyc_status === "approved" ||
    (demo && (user.kyc_status === "missing" || !user.kyc_status));
  const weight = Number(digits(draft.weight).replace(/[^\d.]/g, "")) || 0;
  const suggested = suggestVehicle(weight, draft.trailer_type);
  const cargoMatches = useMemo(
    () =>
      draft.cargo_type.trim().length < 1
        ? []
        : (cargoTypes as string[])
            .filter(
              (name) =>
                name !== "سایر" && name.includes(draft.cargo_type.trim()),
            )
            .slice(0, 8),
    [draft.cargo_type],
  );

  useEffect(() => {
    let alive = true;
    async function restore() {
      if (repeat && /^[1-9]\d{0,9}$/.test(repeat)) {
        try {
          const shipment = await api<Shipment>("shipments/" + repeat + "/");
          if (alive) setDraft(fromShipment(shipment));
        } catch {
          if (alive) setError("بار قبلی برای تکرار پیدا نشد.");
        }
      } else {
        const saved = localStorage.getItem("owner-shipment-draft");
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as Partial<Draft>;
            if (alive) setDraft({ ...emptyDraft(), ...parsed });
          } catch {
            localStorage.removeItem("owner-shipment-draft");
          }
        }
      }
      if (alive) setReady(true);
    }
    void restore();
    return () => {
      alive = false;
    };
  }, [repeat]);
  useEffect(() => {
    if (!ready || repeat) return;
    localStorage.setItem("owner-shipment-draft", JSON.stringify(draft));
  }, [draft, ready, repeat]);

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }
  function problem(index: number) {
    if (index === 0) {
      if (!draft.title.trim() || !draft.cargo_type.trim())
        return "عنوان و نوع کالا را بنویسید.";
      if (draft.cargo_type.trim() === "سایر" && !draft.cargo_note.trim())
        return "برای کالای سایر، توضیح نوع کالا لازم است.";
      if (!(weight > 0)) return "وزن را به تن وارد کنید.";
    }
    if (index === 1) {
      if (!draft.origin.trim() || !draft.origin_lat)
        return "شهر مبدأ را انتخاب کنید و نقطه را روی نقشه بگذارید.";
      if (draft.origin.trim() === "تهران" && !draft.origin_zone)
        return "محدوده تهران را برای مبدأ انتخاب کنید.";
      if (!draft.origin_address.trim())
        return "نشانی دقیق بارگیری را بنویسید یا از نقشه پر کنید.";
    }
    if (index === 2) {
      if (!draft.destination.trim() || !draft.destination_lat)
        return "شهر مقصد را انتخاب کنید و نقطه را روی نقشه بگذارید.";
      if (draft.destination.trim() === "تهران" && !draft.destination_zone)
        return "محدوده تهران را برای مقصد انتخاب کنید.";
    }
    if (index === 3) {
      if (!draft.recipient_name.trim() || !/^09\d{9}$/.test(digits(draft.recipient_phone)))
        return "نام و موبایل گیرنده را کامل کنید.";
      if (
        draft.recipient_national_id &&
        !nationalIdOk(draft.recipient_national_id)
      )
        return "کد ملی گیرنده معتبر نیست.";
      if (
        draft.recipient_postal_code &&
        !/^\d{10}$/.test(digits(draft.recipient_postal_code))
      )
        return "کد پستی گیرنده باید ۱۰ رقم باشد.";
    }
    if (index === 4 && !draft.pickup_date) return "تاریخ بارگیری را انتخاب کنید.";
    if (index === 5 && !draft.vehicle_type) return "نوع خودرو را انتخاب کنید.";
    if (index === 6) {
      const rial = Number(digits(draft.cargo_value_rial).replace(/\D/g, ""));
      const fare = Number(digits(draft.price).replace(/\D/g, ""));
      if (fare < 1000) return "کرایه پیشنهادی را به تومان وارد کنید.";
      if (rial < 100000000) return "ارزش کالا حداقل ۱۰۰٬۰۰۰٬۰۰۰ ریال است.";
    }
    return "";
  }
  function go(next: number) {
    const message = problem(step);
    if (next > step && message) {
      setError(message);
      return;
    }
    setError("");
    setStep(next);
  }
  async function submit() {
    for (let index = 0; index < steps.length - 1; index += 1) {
      const message = problem(index);
      if (message) {
        setStep(index);
        setError(message);
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      const rial = Number(digits(draft.cargo_value_rial).replace(/\D/g, ""));
      const shipment = await api<Shipment>("shipments/", "POST", {
        title: draft.title.trim(),
        cargo_type: draft.cargo_type.trim(),
        cargo_note: draft.cargo_note.trim(),
        packaging: draft.packaging.trim(),
        package_count: draft.package_count ? Number(digits(draft.package_count)) : null,
        weight: digits(draft.weight),
        length_m: draft.length_m || null,
        width_m: draft.width_m || null,
        height_m: draft.height_m || null,
        origin: draft.origin.trim(),
        destination: draft.destination.trim(),
        origin_address: draft.origin_address.trim(),
        destination_address: draft.destination_address.trim(),
        origin_zone: draft.origin_zone,
        destination_zone: draft.destination_zone,
        origin_lat: draft.origin_lat,
        origin_lng: draft.origin_lng,
        destination_lat: draft.destination_lat,
        destination_lng: draft.destination_lng,
        recipient_name: draft.recipient_name.trim(),
        recipient_phone: digits(draft.recipient_phone),
        recipient_national_id: digits(draft.recipient_national_id),
        recipient_postal_code: digits(draft.recipient_postal_code),
        pickup_date: draft.pickup_date,
        urgency: draft.urgency,
        pickup_window: draft.pickup_windows.join(","),
        loading_method: draft.loading_method,
        unloading_method: draft.unloading_method,
        vehicle_type: draft.vehicle_type,
        trailer_type: draft.trailer_type,
        price: Number(digits(draft.price).replace(/\D/g, "")),
        cargo_value: Math.floor(rial / 10),
        insurance_requested: draft.insurance_requested,
        requires_inspector: draft.requires_inspector,
        notes: draft.notes.trim(),
      });
      for (const photo of photos) {
        const data = new FormData();
        data.set("file", photo);
        await api("shipments/" + shipment.id + "/documents/", "POST", data);
      }
      localStorage.removeItem("owner-shipment-draft");
      setCreated(shipment);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!nationalIdOk(user.national_id) || !postalOk || !kycOk) {
    return (
      <section className="card form-card">
        <h1>ثبت بار هنوز باز نیست</h1>
        <p>
          {!postalOk
            ? "کد پستی ۱۰ رقمی حساب را در تنظیمات ذخیره کنید."
            : "احراز هویت باید تأیید شده باشد. مدرک و سلفی را بارگذاری کنید و منتظر بررسی اپراتور بمانید."}
        </p>
        <Link className="btn" href={base + "/settings"}>
          رفتن به حساب کاربری
        </Link>
      </section>
    );
  }
  if (!ready) return <p className="muted">در حال آماده‌سازی فرم…</p>;
  if (created) {
    return (
      <section className="card form-card wizard-done">
        <span className="eyebrow">درخواست ثبت شد</span>
        <h1>{created.title}</h1>
        <p>
          کد پیگیری <bdi>{created.code}</bdi> است. می‌توانید وضعیت را از جزئیات
          بار دنبال کنید.
        </p>
        <button className="btn" onClick={() => onDone(created)}>
          مشاهده بار
          <ArrowLeft size={17} />
        </button>
      </section>
    );
  }

  return (
    <div className="wizard">
      <ol className="wizard-steps">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? "active" : ""}>
            <button type="button" onClick={() => go(index)}>
              {label}
            </button>
          </li>
        ))}
      </ol>
      {step === 0 && (
        <div className="form-grid">
          <label className="full">
            عنوان محموله *
            <input
              value={draft.title}
              maxLength={140}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </label>
          <label className="full">
            نوع کالا *
            <input
              value={draft.cargo_type}
              maxLength={80}
              list="cargo-type-list"
              onChange={(event) => patch({ cargo_type: event.target.value })}
            />
            <datalist id="cargo-type-list">
              {cargoMatches.map((name) => (
                <option value={name} key={name} />
              ))}
              <option value="سایر" />
            </datalist>
          </label>
          {draft.cargo_type.trim() === "سایر" && (
            <label className="full">
              توضیح نوع کالا *
              <input
                value={draft.cargo_note}
                maxLength={200}
                onChange={(event) => patch({ cargo_note: event.target.value })}
              />
            </label>
          )}
          <label>
            بسته‌بندی
            <input
              value={draft.packaging}
              maxLength={80}
              onChange={(event) => patch({ packaging: event.target.value })}
            />
          </label>
          <label>
            تعداد بسته
            <input
              inputMode="numeric"
              value={draft.package_count}
              onChange={(event) => patch({ package_count: event.target.value })}
            />
          </label>
          <label>
            وزن (تن) *
            <input
              inputMode="decimal"
              value={draft.weight}
              onChange={(event) => patch({ weight: event.target.value })}
            />
          </label>
          <p className="muted">
            {weight
              ? Math.round(weight * 1000).toLocaleString("fa-IR") + " کیلوگرم"
              : "وزن هم به تن ذخیره می‌شود و هم به کیلوگرم نمایش داده می‌شود."}
            <button
              type="button"
              className="text-link"
              onClick={() => {
                const host = window as Window & {
                  webkitSpeechRecognition?: new () => {
                    lang: string;
                    start: () => void;
                    onresult: ((event: {
                      results: { 0: { 0: { transcript: string } } };
                    }) => void) | null;
                  };
                };
                const Recognition = host.webkitSpeechRecognition;
                if (!Recognition) {
                  setError("مرورگر شما گفتار را به متن تبدیل نمی‌کند.");
                  return;
                }
                const recognition = new Recognition();
                recognition.lang = "fa-IR";
                recognition.onresult = (event) => {
                  const heard = event.results[0][0].transcript;
                  const found = heard.match(/[0-9۰-۹.]+/);
                  if (found) patch({ weight: digits(found[0]) });
                  else setError("وزنی در جمله شنیده نشد: " + heard);
                };
                recognition.start();
              }}
            >
              <Mic size={14} /> گفتن وزن
            </button>
          </p>
          {(["length_m", "width_m", "height_m"] as const).map((key) => (
            <label key={key}>
              {key === "length_m" ? "طول" : key === "width_m" ? "عرض" : "ارتفاع"}{" "}
              (متر)
              <input
                inputMode="decimal"
                value={draft[key]}
                onChange={(event) => patch({ [key]: event.target.value })}
              />
            </label>
          ))}
        </div>
      )}
      {step === 1 && (
        <PlaceFields
          label="مبدأ"
          city={draft.origin}
          zone={draft.origin_zone}
          address={draft.origin_address}
          lat={draft.origin_lat}
          lng={draft.origin_lng}
          addressRequired
          onChange={(place) =>
            patch({
              origin: place.city,
              origin_zone: place.zone,
              origin_address: place.address,
              origin_lat: place.lat,
              origin_lng: place.lng,
            })
          }
        />
      )}
      {step === 2 && (
        <PlaceFields
          label="مقصد"
          city={draft.destination}
          zone={draft.destination_zone}
          address={draft.destination_address}
          lat={draft.destination_lat}
          lng={draft.destination_lng}
          onChange={(place) =>
            patch({
              destination: place.city,
              destination_zone: place.zone,
              destination_address: place.address,
              destination_lat: place.lat,
              destination_lng: place.lng,
            })
          }
        />
      )}
      {step === 3 && (
        <div className="form-grid">
          <label>
            نام گیرنده *
            <input
              value={draft.recipient_name}
              maxLength={100}
              onChange={(event) => patch({ recipient_name: event.target.value })}
            />
          </label>
          <label>
            موبایل گیرنده *
            <input
              dir="ltr"
              value={draft.recipient_phone}
              onChange={(event) =>
                patch({ recipient_phone: event.target.value })
              }
            />
          </label>
          <label>
            کد ملی گیرنده
            <input
              dir="ltr"
              maxLength={10}
              value={draft.recipient_national_id}
              onChange={(event) =>
                patch({ recipient_national_id: event.target.value })
              }
            />
          </label>
          <label>
            کد پستی گیرنده
            <input
              dir="ltr"
              maxLength={10}
              value={draft.recipient_postal_code}
              onChange={(event) =>
                patch({ recipient_postal_code: event.target.value })
              }
            />
          </label>
        </div>
      )}
      {step === 4 && (
        <div className="form-grid">
          <PersianDate
            key="pickup-date"
            name="pickup_date"
            label="تاریخ بارگیری"
            value={draft.pickup_date}
            required
            onChange={(value) => patch({ pickup_date: value })}
          />
          <label>
            فوریت
            <select
              value={draft.urgency}
              onChange={(event) => patch({ urgency: event.target.value })}
            >
              <option value="">انتخاب کنید</option>
              <option value="urgent">فوری</option>
              <option value="scheduled">با فرصت</option>
            </select>
          </label>
          <fieldset className="full">
            <legend>بازه‌های بارگیری</legend>
            {windows.map((item) => (
              <label key={item} className="check-line">
                <input
                  type="checkbox"
                  checked={draft.pickup_windows.includes(item)}
                  onChange={(event) =>
                    patch({
                      pickup_windows: event.target.checked
                        ? [...draft.pickup_windows, item]
                        : draft.pickup_windows.filter((value) => value !== item),
                    })
                  }
                />
                {pickupWindows[item]}
              </label>
            ))}
          </fieldset>
          <label>
            روش بارگیری
            <select
              value={draft.loading_method}
              onChange={(event) => patch({ loading_method: event.target.value })}
            >
              <option value="">انتخاب کنید</option>
              {Object.entries(handlingMethods).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            روش تخلیه
            <select
              value={draft.unloading_method}
              onChange={(event) =>
                patch({ unloading_method: event.target.value })
              }
            >
              <option value="">انتخاب کنید</option>
              {Object.entries(handlingMethods).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {step === 5 && (
        <div className="form-grid">
          <p className="info-note full">
            دسته‌های قدیمی خاور، تک و جفت در این سامانه کامیون هستند و بار سنگین
            تریلی است. پیشنهاد بر اساس وزن: {vehicles[suggested]}. اگر بار سرد
            است، نوع گاری یخچال‌دار را انتخاب کنید.
          </p>
          <label>
            نوع خودرو *
            <select
              value={draft.vehicle_type}
              onChange={(event) => patch({ vehicle_type: event.target.value })}
            >
              <option value="">انتخاب کنید</option>
              {Object.entries(vehicles).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => patch({ vehicle_type: suggested })}
          >
            استفاده از پیشنهاد
          </button>
          <label className="full">
            نوع گاری
            <select
              value={draft.trailer_type}
              onChange={(event) => patch({ trailer_type: event.target.value })}
            >
              <option value="">انتخاب کنید</option>
              {Object.keys(trailerTypes).map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {step === 6 && (
        <div className="form-grid">
          <label>
            کرایه پیشنهادی (تومان) *
            <input
              inputMode="numeric"
              value={draft.price}
              onChange={(event) => patch({ price: event.target.value })}
            />
          </label>
          <label>
            ارزش کالا (ریال) *
            <input
              inputMode="numeric"
              value={draft.cargo_value_rial}
              onChange={(event) =>
                patch({ cargo_value_rial: event.target.value })
              }
            />
          </label>
          <p className="muted full">
            ارزش در سامانه به تومان ذخیره می‌شود. حداقل ۱۰۰ میلیون ریال است.
          </p>
          <label className="check-line">
            <input
              type="checkbox"
              checked={draft.insurance_requested}
              onChange={(event) =>
                patch({ insurance_requested: event.target.checked })
              }
            />
            بیمه بار می‌خواهم
          </label>
          <label className="check-line full">
            <input
              type="checkbox"
              checked={draft.requires_inspector}
              onChange={(event) =>
                patch({ requires_inspector: event.target.checked })
              }
            />
            این بار حساس است و متصدی باید در محل بارگیری حاضر شود
          </label>
        </div>
      )}
      {step === 7 && (
        <div className="form-grid">
          <label className="full">
            تصویر کالا (JPG یا PNG، حداکثر ۱۰ فایل)
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              multiple
              onChange={(event) =>
                setPhotos(Array.from(event.target.files || []).slice(0, 10))
              }
            />
          </label>
          {photos.length > 0 && (
            <ul className="full">
              {photos.map((file) => (
                <li key={file.name + file.size}>{file.name}</li>
              ))}
            </ul>
          )}
          <label className="full">
            توضیحات حمل
            <textarea
              rows={4}
              maxLength={2000}
              value={draft.notes}
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </label>
        </div>
      )}
      {step === 8 && (
        <dl className="detail-grid">
          {[
            ["عنوان", draft.title],
            ["کالا", draft.cargo_type],
            ["مبدأ", draft.origin + (draft.origin_zone ? " · " + draft.origin_zone : "")],
            [
              "مقصد",
              draft.destination +
                (draft.destination_zone ? " · " + draft.destination_zone : ""),
            ],
            ["وزن", weight + " تن"],
            ["خودرو", vehicles[draft.vehicle_type] || ""],
            ["گاری", draft.trailer_type],
            ["بازه", draft.pickup_windows.map((item) => pickupWindows[item]).join("، ")],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        {step > 0 && (
          <button type="button" className="secondary-btn" onClick={() => go(step - 1)}>
            <ArrowRight size={16} />
            مرحله قبل
          </button>
        )}
        {step < steps.length - 1 ? (
          <button type="button" className="btn" onClick={() => go(step + 1)}>
            مرحله بعد
            <ArrowLeft size={16} />
          </button>
        ) : (
          <button type="button" className="btn" disabled={busy} onClick={() => void submit()}>
            {busy ? "در حال ثبت…" : "ثبت درخواست حمل"}
          </button>
        )}
      </div>
    </div>
  );
}

function PlaceFields({
  label,
  city,
  zone,
  address,
  lat,
  lng,
  addressRequired,
  onChange,
}: {
  label: string;
  city: string;
  zone: string;
  address: string;
  lat: string;
  lng: string;
  addressRequired?: boolean;
  onChange: (place: {
    city: string;
    zone: string;
    address: string;
    lat: string;
    lng: string;
  }) => void;
}) {
  const [query, setQuery] = useState(city);
  const matches =
    query.trim().length < 1
      ? []
      : cityRows
          .filter(
            (item) =>
              item.name.includes(query.trim()) ||
              item.province.includes(query.trim()),
          )
          .slice(0, 8);
  return (
    <div className="form-grid">
      <label className="full">
        شهر {label} *
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange({
              city: event.target.value,
              zone: event.target.value.trim() === "تهران" ? zone : "",
              address,
              lat,
              lng,
            });
          }}
        />
      </label>
      {matches.length > 0 && query.trim() !== city.trim() && (
        <ul className="map-results full">
          {matches.map((item) => (
            <li key={item.name + item.province}>
              <button
                type="button"
                onClick={() => {
                  setQuery(item.name);
                  onChange({
                    city: item.name,
                    zone: item.name === "تهران" ? zone : "",
                    address,
                    lat: "",
                    lng: "",
                  });
                }}
              >
                {item.name} · {item.province}
              </button>
            </li>
          ))}
        </ul>
      )}
      {city.trim() === "تهران" && (
        <label className="full">
          محدوده تهران *
          <select
            value={zone}
            onChange={(event) =>
              onChange({ city, zone: event.target.value, address, lat, lng })
            }
          >
            <option value="">انتخاب کنید</option>
            {tehranZones.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="full">
        نشانی دقیق {label}
        {addressRequired ? " *" : " (اختیاری)"}
        <textarea
          rows={3}
          value={address}
          onChange={(event) =>
            onChange({ city, zone, address: event.target.value, lat, lng })
          }
        />
      </label>
      <div className="full">
        <LocationPicker
          key={label}
          lat={lat}
          lng={lng}
          focus={city}
          placeholder={"جستجوی نشانی " + label}
          onPick={(nextLat, nextLng, found) =>
            onChange({
              city,
              zone,
              address: found || address,
              lat: nextLat.toFixed(6),
              lng: nextLng.toFixed(6),
            })
          }
        />
      </div>
    </div>
  );
}
