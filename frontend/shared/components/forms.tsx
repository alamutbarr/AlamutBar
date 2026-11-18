"use client";
import PersianDate from "./persian-date";
import SavedAddressPicker from "./saved-address-picker";
import cargoTypes from "../data/cargo-types.json";
import {
  api,
  handlingMethods,
  pickupWindows,
  urgencies,
  vehicles,
  type Shipment,
} from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  value?: string | number;
  min?: number;
  max?: number;
  maxLength?: number;
  full?: boolean;
  placeholder?: string;
  suggestions?: string[];
};
export function Fields({ fields }: { fields: Field[] }) {
  return (
    <div className="form-grid">
      {fields.map((f) =>
        f.type === "date" ? (
          <PersianDate
            key={f.name}
            name={f.name}
            label={f.label}
            value={f.value}
            required={f.required}
          />
        ) : (
          <label className={f.full ? "full" : ""} key={f.name}>
            {f.label}
            {f.required && <span className="required"> *</span>}
            {f.type === "textarea" ? (
              <textarea
                name={f.name}
                defaultValue={f.value}
                required={f.required}
                maxLength={f.maxLength || 2000}
                rows={3}
              />
            ) : f.options ? (
              <select
                name={f.name}
                defaultValue={f.value}
                required={f.required}
              >
                <option value="">انتخاب کنید</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={f.name}
                type={f.type || "text"}
                defaultValue={f.value}
                required={f.required}
                min={f.min}
                max={f.max}
                list={f.suggestions ? f.name + "-list" : undefined}
                maxLength={f.maxLength || 140}
                step={
                  f.type === "number"
                    ? ["weight", "capacity", "length_m", "width_m", "height_m"].includes(
                        f.name,
                      )
                      ? "0.01"
                      : "1"
                    : undefined
                }
                placeholder={f.placeholder}
                dir={
                  ["tel", "number", "date", "password"].includes(f.type || "")
                    ? "ltr"
                    : undefined
                }
                pattern={
                  f.type === "tel" ? "[0۰٠][9۹٩][0-9۰-۹٠-٩]{9}" : undefined
                }
              />
            )}
            {f.suggestions && (
              <datalist id={f.name + "-list"}>
                {f.suggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            )}
          </label>
        ),
      )}
    </div>
  );
}
export function ActionForm({
  fields,
  onSubmit,
  submit = "ثبت اطلاعات",
  children,
  fieldGroups,
}: (
  | { fields: Field[]; fieldGroups?: never }
  | {
      fields?: never;
      fieldGroups: {
        title: string;
        fields: Field[];
        before?: React.ReactNode;
      }[];
    }
) & {
  onSubmit: (data: Record<string, string>) => Promise<void>;
  submit?: string;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(
        Object.fromEntries(new FormData(e.currentTarget)) as Record<
          string,
          string
        >,
      );
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={send} onChange={() => setDirty(true)} aria-busy={busy}>
      {fields && <Fields fields={fields} />}
      {fieldGroups?.map((group) => (
        <fieldset className="form-section" key={group.title}>
          <legend>{group.title}</legend>
          {group.before}
          <Fields fields={group.fields} />
        </fieldset>
      ))}
      {children}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="btn" disabled={busy}>
          {busy ? "در حال ثبت…" : submit}
          <ArrowLeft size={17} />
        </button>
      </div>
    </form>
  );
}
export function ShipmentForm({
  shipment,
  onDone,
}: {
  shipment?: Shipment;
  onDone: (s: Shipment) => void;
}) {
  const get = (key: keyof Shipment) =>
    shipment?.[key] as string | number | undefined;
  const options = (items: Record<string, string>) =>
    Object.entries(items).map(([value, label]) => ({ value, label }));
  const fields: Field[] = [
    {
      name: "title",
      label: "عنوان محموله",
      required: true,
      full: true,
      value: get("title"),
      placeholder: "مثلاً: ورق فولادی بسته‌بندی شده",
    },
    {
      name: "cargo_type",
      label: "نوع کالا",
      required: true,
      value: get("cargo_type"),
      maxLength: 80,
      placeholder: "جستجو یا نوشتن نوع کالا",
      suggestions: cargoTypes.filter((name) => name !== "سایر"),
    },
    {
      name: "packaging",
      label: "نوع بسته‌بندی",
      value: get("packaging"),
      maxLength: 80,
      placeholder: "اختیاری، مثلاً پالت یا کارتن",
    },
    {
      name: "origin",
      label: "شهر مبدأ",
      required: true,
      value: get("origin"),
      maxLength: 80,
    },
    {
      name: "destination",
      label: "شهر مقصد",
      required: true,
      value: get("destination"),
      maxLength: 80,
    },
    {
      name: "origin_address",
      label: "نشانی دقیق بارگیری",
      required: true,
      type: "textarea",
      value: get("origin_address"),
    },
    {
      name: "destination_address",
      label: "نشانی دقیق تخلیه",
      required: true,
      type: "textarea",
      value: get("destination_address"),
    },
    {
      name: "weight",
      label: "وزن (تن)",
      type: "number",
      min: 0.01,
      max: 99999,
      required: true,
      value: get("weight"),
    },
    {
      name: "package_count",
      label: "تعداد بسته",
      type: "number",
      min: 1,
      value: get("package_count") ?? undefined,
    },
    {
      name: "length_m",
      label: "طول (متر)",
      type: "number",
      min: 0.01,
      value: get("length_m") ?? undefined,
    },
    {
      name: "width_m",
      label: "عرض (متر)",
      type: "number",
      min: 0.01,
      value: get("width_m") ?? undefined,
    },
    {
      name: "height_m",
      label: "ارتفاع (متر)",
      type: "number",
      min: 0.01,
      value: get("height_m") ?? undefined,
    },
    {
      name: "vehicle_type",
      label: "نوع خودرو",
      required: true,
      options: Object.entries(vehicles).map(([value, label]) => ({
        value,
        label,
      })),
      value: get("vehicle_type"),
    },
    {
      name: "price",
      label: "کرایه پیشنهادی (تومان)",
      type: "number",
      min: 1000,
      required: true,
      value: get("price"),
    },
    {
      name: "cargo_value",
      label: "ارزش کالا (تومان)",
      type: "number",
      min: 0,
      required: true,
      value: get("cargo_value") || 0,
    },
    {
      name: "insurance_requested",
      label: "بیمه بار",
      options: [
        { value: "false", label: "بدون درخواست بیمه" },
        { value: "true", label: "بیمه می‌خواهم" },
      ],
      value: shipment?.insurance_requested ? "true" : "false",
    },
    {
      name: "pickup_date",
      label: "تاریخ بارگیری",
      type: "date",
      required: true,
      value: get("pickup_date"),
    },
    {
      name: "urgency",
      label: "فوریت",
      options: options(urgencies),
      value: get("urgency"),
    },
    {
      name: "pickup_window",
      label: "بازه بارگیری",
      options: options(pickupWindows),
      value: get("pickup_window"),
    },
    {
      name: "loading_method",
      label: "روش بارگیری",
      options: options(handlingMethods),
      value: get("loading_method"),
    },
    {
      name: "unloading_method",
      label: "روش تخلیه",
      options: options(handlingMethods),
      value: get("unloading_method"),
    },
    {
      name: "recipient_name",
      label: "نام گیرنده",
      required: true,
      value: get("recipient_name"),
      maxLength: 100,
    },
    {
      name: "recipient_phone",
      label: "موبایل گیرنده",
      required: true,
      type: "tel",
      value: get("recipient_phone"),
    },
    {
      name: "recipient_national_id",
      label: "کد ملی گیرنده",
      value: get("recipient_national_id"),
      maxLength: 10,
    },
    {
      name: "recipient_postal_code",
      label: "کد پستی گیرنده",
      value: get("recipient_postal_code"),
      maxLength: 10,
    },
    {
      name: "notes",
      label: "توضیحات و شرایط حمل",
      type: "textarea",
      full: true,
      value: get("notes"),
    },
  ];
  return (
    <ActionForm
      fieldGroups={[
        { title: "۱. محموله", fields: fields.slice(0, 3) },
        {
          title: "۲. مسیر حمل",
          fields: fields.slice(3, 7),
          before: <SavedAddressPicker />,
        },
        { title: "۳. وزن، ابعاد و خودرو", fields: fields.slice(7, 16) },
        { title: "۴. زمان و روش جابه‌جایی", fields: fields.slice(16, 21) },
        { title: "۵. گیرنده و توضیحات", fields: fields.slice(21) },
      ]}
      submit={shipment ? "ذخیره تغییرات" : "ثبت درخواست حمل"}
      onSubmit={async (data) => {
        const body: Record<string, string | null> = { ...data };
        for (const key of ["package_count", "length_m", "width_m", "height_m"]) {
          if (body[key] === "") body[key] = null;
        }
        const result = await api<Shipment>(
          shipment ? "shipments/" + shipment.id + "/" : "shipments/",
          shipment ? "PATCH" : "POST",
          body,
        );
        onDone(result);
      }}
    >
      <div className="info-note">
        کرایه و ارزش کالا به تومان و وزن به تن است. برای وزن بالای ۲۰ تن تریلی،
        بین ۵ تا ۲۰ تن کامیون و زیر ۵ تن وانت مناسب‌تر است. درخواست پس از ثبت،
        برای بررسی اپراتور ارسال می‌شود.
      </div>
    </ActionForm>
  );
}
