"use client";
import { PanelError, usePanelRefresh } from "../panel-feedback";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/lib/navigation";
import { api, vehicles, number, type User } from "@/lib/api";
import { ActionForm, type Field } from "../forms";
import VehicleWizard from "./vehicle-wizard";
import { describeVehicle } from "@/lib/vehicle-config";
import { Loading } from "../ui";
type Credential = {
  id: number;
  kind: string;
  label: string;
  status: string;
  name: string;
  url: string;
  note: string;
};
type Profile = {
  national_id: string;
  birth_date: string;
  license_expiry: string;
  insurance_expiry: string;
  emergency_name: string;
  emergency_phone: string;
  address: string;
  status: string;
  review_note: string;
};
type Vehicle = {
  kind: string;
  plate: string;
  capacity: number;
  license_number: string;
  available: boolean;
  tractor_type?: string;
  trailer_type?: string;
  smart_card_number?: string;
  specs?: Record<string, string>;
};
type RecordData = {
  user: User;
  profile: Profile;
  documents: Credential[];
  vehicle: Vehicle | null;
  required_documents: string[];
};
const labels: Record<string, string> = {
  draft: "تکمیل اطلاعات",
  submitted: "در انتظار بررسی اپراتور",
  approved: "پرونده تأیید شده",
  rejected: "نیازمند اصلاح",
  pending: "در انتظار بررسی",
};
const kinds: Record<string, string> = {
  national_card: "روی کارت ملی",
  national_card_selfie: "سلفی با کارت ملی",
  shenasnameh: "روی شناسنامه",
  shenasnameh_selfie: "سلفی با شناسنامه",
  license: "گواهینامه رانندگی",
  vehicle_card: "کارت خودرو",
  insurance: "بیمه‌نامه معتبر",
  smart_card: "کارت هوشمند",
  health: "کارت سلامت",
  identity: "یکی از مدارک هویتی همراه سلفی",
};
const identityKinds = [
  "national_card",
  "national_card_selfie",
  "shenasnameh",
  "shenasnameh_selfie",
];
const steps = ["هویت و تماس", "خودرو", "مدارک", "بازبینی و ارسال"];
export default function Onboarding({
  driverId,
  onUserChange,
}: {
  driverId?: string;
  onUserChange?: (user: User) => void;
}) {
  const review = Boolean(driverId),
    [data, setData] = useState<RecordData | null>(null),
    [selectedStep, setStep] = useState<number | null>(null),
    [editing, setEditing] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [decisions, setDecisions] = useState<
      Record<number, { status: string; note: string }>
    >({});
  const path = review ? "drivers/" + driverId + "/profile/" : "onboarding/";
  const loadVersion = useRef(0);
  const load = useCallback(
    async (silent = false) => {
      const version = ++loadVersion.current;
      try {
        const record = await api<RecordData>(path);
        if (version !== loadVersion.current) return;
        setData(record);
        onUserChange?.(record.user);
        setError("");
      } catch (e) {
        if (!silent && version === loadVersion.current)
          setError((e as Error).message);
      }
    },
    [path, onUserChange],
  );
  usePanelRefresh(() => load());
  useEffect(() => {
    void load();
    return () => {
      loadVersion.current++;
    };
  }, [load]);
  const status = data?.profile.status;
  useEffect(() => {
    if (review || status !== "submitted" || editing) return;
    const timer = setInterval(() => void load(true), 15000);
    return () => clearInterval(timer);
  }, [review, status, editing, load]);
  async function upload(kind: string, file: File) {
    setBusy(true);
    setMessage("");
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      await api("onboarding/documents/", "POST", body);
      await load();
      setMessage("مدرک ذخیره شد. پس از تکمیل، پرونده را ارسال کنید.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error) return <PanelError error={error} retry={() => void load()} />;
  if (!data) return <Loading />;
  const p = data.profile;
  const fields: Field[] = [
    {
      name: "national_id",
      label: "کد ملی (۱۰ رقم)",
      value: p.national_id,
      required: true,
      maxLength: 10,
    },
    {
      name: "birth_date",
      label: "تاریخ تولد",
      type: "date",
      value: p.birth_date,
      required: true,
    },
    {
      name: "license_expiry",
      label: "اعتبار گواهینامه",
      type: "date",
      value: p.license_expiry,
      required: true,
    },
    {
      name: "insurance_expiry",
      label: "اعتبار بیمه‌نامه",
      type: "date",
      value: p.insurance_expiry,
      required: true,
    },
    {
      name: "emergency_name",
      label: "نام مخاطب اضطراری",
      value: p.emergency_name,
      required: true,
    },
    {
      name: "emergency_phone",
      label: "موبایل مخاطب اضطراری",
      type: "tel",
      value: p.emergency_phone,
      required: true,
    },
    {
      name: "address",
      label: "نشانی محل سکونت",
      type: "textarea",
      value: p.address,
      full: true,
      required: true,
    },
  ];
  const identityDone = fields.every((field) => field.value);
  const hasDoc = (kind: string) =>
    data.documents.some((doc) => doc.kind === kind && doc.status !== "rejected");
  const identityReady =
    (hasDoc("national_card") && hasDoc("national_card_selfie")) ||
    (hasDoc("shenasnameh") && hasDoc("shenasnameh_selfie"));
  const missing = [
    ...data.required_documents.filter((kind) => !hasDoc(kind)),
    ...(identityReady ? [] : ["identity"]),
  ];
  const savedStep = !identityDone
    ? 0
    : !data.vehicle
      ? 1
      : missing.length
        ? 2
        : 3;
  const reviewState = p.status === "submitted" || p.status === "approved";
  const editable = !review && (!reviewState || editing);
  const step = selectedStep ?? (reviewState ? 3 : savedStep);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">پرونده همکاری راننده</span>
          <h1>
            {review ? "بررسی مدارک " + data.user.name : "تکمیل ثبت‌نام راننده"}
          </h1>
          <p>
            {review
              ? "مدارک و مشخصات را پیش از اعلام نتیجه بررسی کنید."
              : "هر مرحله پس از ذخیره در پروندهٔ شما می‌ماند."}
          </p>
        </div>
        <span className="badge">{labels[p.status]}</span>
      </div>
      {p.review_note && (
        <p className="info-note">آخرین نظر اپراتور، {p.review_note}</p>
      )}
      {!review && (
        <>
          <div className="onboarding-progress">
            <div>
              <b>
                {editable
                  ? "مرحلهٔ " + number(step + 1) + " از ۴"
                  : labels[p.status]}
              </b>
              <span role="status">
                {data.user.driver_market_enabled
                  ? "دسترسی بازار بار فعال است."
                  : p.status === "approved"
                    ? "برای فعال شدن بازار، وضعیت احراز و اعتبار مدارک را بررسی کنید."
                    : "بازار بار پس از تأیید پرونده و اعتبار مدارک باز می‌شود."}
              </span>
            </div>
            <progress
              aria-label="پیشرفت پرونده"
              max={4}
              value={reviewState ? 4 : savedStep}
            />
            {data.user.driver_market_enabled && !editing && (
              <Link href="/driver/market" className="btn">
                ورود به بازار بار
              </Link>
            )}
            {reviewState && !editing && (
              <button
                className="secondary-btn"
                onClick={() => {
                  setEditing(true);
                  setStep(0);
                }}
              >
                ویرایش پرونده
              </button>
            )}
          </div>
          <div className="onboarding-steps">
            {steps.map((title, i) => (
              <button
                key={title}
                onClick={() => setStep(i)}
                className={step === i ? "active" : ""}
                aria-current={step === i ? "step" : undefined}
                disabled={editable ? !reviewState && i > savedStep : i < 2}
              >
                <b>{number(i + 1)}</b>
                {title}
              </button>
            ))}
          </div>
        </>
      )}
      {editable && step === 0 && (
        <section className="card form-card">
          <h2>اطلاعات هویتی و اعتبار مدارک</h2>
          {!review && (
            <div className="profile-summary">
              {data.user.avatar_url ? (
                <img className="avatar large" src={data.user.avatar_url} alt="" />
              ) : (
                <span className="avatar large">{data.user.first_name?.[0] || "ر"}</span>
              )}
              <div>
                <label className="secondary-btn upload-btn">
                  انتخاب عکس پروفایل
                  <input
                    className="sr-only"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const body = new FormData();
                      body.set("file", file);
                      await api("onboarding/avatar/", "POST", body);
                      await load();
                      e.target.value = "";
                    }}
                  />
                </label>
                {data.user.avatar_url && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={async () => {
                      await api("onboarding/avatar/", "DELETE");
                      await load();
                    }}
                  >
                    حذف عکس
                  </button>
                )}
              </div>
            </div>
          )}
          <ActionForm
            fields={fields}
            submit="ذخیره و ادامه"
            onSubmit={async (d) => {
              await api("onboarding/", "PATCH", d);
              await load();
              setStep(1);
            }}
          />
        </section>
      )}
      {editable && step === 1 && (
        <section className="card form-card">
          <h2>خودرو، پلاک و شماره هوشمند</h2>
          <p className="muted">
            شماره کارت هوشمند باید با پلاک همین خودرو یکی باشد. تطبیق خودکار با
            سامانه دولتی انجام نمی‌شود.
          </p>
          <VehicleWizard
            initial={data.vehicle || undefined}
            onSubmit={async (payload) => {
              await api("vehicle/", "PUT", payload);
              await load();
              setStep(2);
            }}
          />
        </section>
      )}
      {(review || step === 2) && (
        <section className="card form-card">
          <h2>مدارک راننده و خودرو</h2>
          <p className="muted">
            گواهینامه، کارت خودرو و بیمه‌نامه الزامی‌اند. برای هویت، یا کارت ملی
            (رو و سلفی) یا شناسنامه (رو و سلفی) کافی است. کارت هوشمند و کارت
            سلامت اختیاری‌اند. مدرک تأییدشده تا زمان ویرایش پرونده قفل است.
          </p>
          <div className="credential-grid">
            {Object.entries(kinds)
              .filter(([kind]) => kind !== "identity")
              .map(([kind, label]) => {
              const doc = data.documents.find((d) => d.kind === kind);
              return (
                <article className="credential" key={kind}>
                  <div>
                    <h3>{label}</h3>
                    <small>
                      {identityKinds.includes(kind)
                        ? "هویت: یکی از دو مجموعه"
                        : data.required_documents.includes(kind)
                          ? "الزامی"
                          : "اختیاری"}
                    </small>
                  </div>
                  {doc ? (
                    <>
                      <a className="text-link" href={doc.url}>
                        دریافت {doc.name}
                      </a>
                      <p className="muted">
                        {labels[doc.status] || doc.status}
                      </p>
                      {doc.note && <p className="error">{doc.note}</p>}
                      {editable && !(doc.status === "approved" && !editing) && (
                        <label className="secondary-btn upload-btn">
                          جایگزینی مدرک
                          <input
                            className="sr-only"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            disabled={busy}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void upload(kind, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </>
                  ) : (
                    <p className="muted">هنوز بارگذاری نشده</p>
                  )}
                  {review && doc && p.status === "submitted" ? (
                    <>
                      <label>
                        نتیجه بررسی
                        <select
                          value={decisions[doc.id]?.status || doc.status}
                          onChange={(e) =>
                            setDecisions({
                              ...decisions,
                              [doc.id]: {
                                status: e.target.value,
                                note: decisions[doc.id]?.note || "",
                              },
                            })
                          }
                        >
                          <option value="pending">بررسی نشده</option>
                          <option value="approved">تأیید</option>
                          <option value="rejected">رد</option>
                        </select>
                      </label>
                      <label>
                        دلیل رد / یادداشت
                        <input
                          value={decisions[doc.id]?.note || ""}
                          onChange={(e) =>
                            setDecisions({
                              ...decisions,
                              [doc.id]: {
                                status: decisions[doc.id]?.status || doc.status,
                                note: e.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    </>
                  ) : (
                    editable && (
                      <label className="secondary-btn upload-btn">
                        {doc ? "جایگزینی مدرک" : "انتخاب و بارگذاری"}
                        <input
                          className="sr-only"
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          disabled={busy}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void upload(kind, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )
                  )}
                </article>
              );
            })}
          </div>
          {editable && (
            <>
              {missing.length > 0 && (
                <p className="info-note">
                  برای ادامه،{" "}
                  {missing.map((kind) => kinds[kind] || kind).join("، ")} را
                  بارگذاری یا جایگزین کنید.
                </p>
              )}
              <button
                className="btn"
                disabled={busy || missing.length > 0}
                onClick={() => setStep(3)}
              >
                بازبینی و ارسال پرونده
              </button>
            </>
          )}
        </section>
      )}
      {(review || step === 3) && (
        <section className="card form-card onboarding-summary">
          <h2>بازبینی پرونده</h2>
          <dl className="detail-grid">
            {fields.map((f) => (
              <div key={f.name}>
                <dt>{f.label}</dt>
                <dd>
                  {f.type === "date" && p[f.name as keyof Profile]
                    ? new Date(
                        String(p[f.name as keyof Profile]) + "T12:00:00Z",
                      ).toLocaleDateString("fa-IR")
                    : String(p[f.name as keyof Profile] || "تکمیل نشده")}
                </dd>
              </div>
            ))}
            <div>
              <dt>خودرو</dt>
              <dd>
                {data.vehicle
                  ? (data.vehicle.tractor_type
                      ? describeVehicle(
                          data.vehicle.tractor_type,
                          data.vehicle.trailer_type || "",
                          data.vehicle.specs || {},
                        ).summary
                      : vehicles[data.vehicle.kind]) +
                    " · " +
                    data.vehicle.plate +
                    " · " +
                    number(data.vehicle.capacity) +
                    " تن" +
                    (data.vehicle.smart_card_number
                      ? " · هوشمند " + data.vehicle.smart_card_number
                      : "")
                  : "ثبت نشده"}
              </dd>
            </div>
          </dl>
          {review ? (
            p.status !== "submitted" ? (
              <p className="info-note">
                پرونده در انتظار بررسی نیست؛ نتیجه ثبت‌شده در بالای صفحه نمایش
                داده می‌شود.
              </p>
            ) : (
              <ActionForm
                fields={[
                  {
                    name: "status",
                    label: "نتیجه نهایی پرونده",
                    required: true,
                    full: true,
                    options: [
                      { value: "approved", label: "تأیید همکاری" },
                      { value: "rejected", label: "برگشت برای اصلاح" },
                    ],
                  },
                  {
                    name: "note",
                    label: "توضیح نتیجه بررسی",
                    type: "textarea",
                    full: true,
                  },
                ]}
                submit="ثبت نتیجه بررسی"
                onSubmit={async (d) => {
                  await api("drivers/" + driverId + "/review/", "POST", {
                    ...d,
                    documents: data.documents
                      .map((doc) => ({
                        id: doc.id,
                        status: decisions[doc.id]?.status || doc.status,
                        note: decisions[doc.id]?.note || "",
                      }))
                      .filter((doc) => doc.status !== "pending"),
                  });
                  await load();
                  setMessage("نتیجه بررسی ثبت شد.");
                }}
              />
            )
          ) : (
            <>
              {editable && missing.length > 0 && (
                <p className="info-note">
                  مدارک موردنیاز برای ارسال پرونده،{" "}
                  {missing.map((kind) => kinds[kind] || kind).join("، ")}
                </p>
              )}
              <p className="info-note">
                تغییر مشخصات یا جایگزینی مدارک، تأیید قبلی را لغو می‌کند و به
                بررسی مجدد نیاز دارد. تأیید اپراتور، استعلام دولتی نیست.
              </p>
              {editable && (
                <button
                  className="btn"
                  disabled={
                    busy ||
                    !identityDone ||
                    !data.vehicle ||
                    missing.length > 0 ||
                    reviewState
                  }
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api("onboarding/submit/", "POST", {});
                      await load();
                      setEditing(false);
                      setStep(3);
                      setMessage("پرونده برای بررسی ارسال شد.");
                    } catch (e) {
                      setMessage((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  ارسال پرونده برای بررسی
                </button>
              )}
            </>
          )}
        </section>
      )}
      {message && (
        <p className="info-note" role="status">
          {message}
        </p>
      )}
    </>
  );
}
