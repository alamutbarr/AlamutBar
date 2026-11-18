"use client";
import PersianDate from "./persian-date";
import SavedAddressPicker from "./saved-address-picker";
import { api, vehicles, type Shipment } from "@/lib/api";
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
                maxLength={f.maxLength || 140}
                step={
                  f.type === "number"
                    ? ["weight", "capacity"].includes(f.name)
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
      name: "pickup_date",
      label: "تاریخ بارگیری",
      type: "date",
      required: true,
      value: get("pickup_date"),
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
        { title: "۱. محموله", fields: fields.slice(0, 1) },
        {
          title: "۲. مسیر حمل",
          fields: fields.slice(1, 5),
          before: <SavedAddressPicker />,
        },
        { title: "۳. خودرو، هزینه و زمان", fields: fields.slice(5, 10) },
        { title: "۴. گیرنده و توضیحات", fields: fields.slice(10) },
      ]}
      submit={shipment ? "ذخیره تغییرات" : "ثبت درخواست حمل"}
      onSubmit={async (data) => {
        const result = await api<Shipment>(
          shipment ? "shipments/" + shipment.id + "/" : "shipments/",
          shipment ? "PATCH" : "POST",
          data,
        );
        onDone(result);
      }}
    >
      <div className="info-note">
        کرایه و ارزش کالا به تومان و وزن به تن است. درخواست پس از ثبت، برای
        بررسی اپراتور ارسال می‌شود.
      </div>
    </ActionForm>
  );
}
