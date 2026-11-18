"use client";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, statuses, date } from "@/lib/api";
import { faqs } from "@/lib/public-content";
export function FAQ() {
  const [q, setQ] = useState(""),
    [role, setRole] = useState("همه");
  const rows = faqs.filter(
    (f) => (role === "همه" || f.role === role) && (f.q + f.a).includes(q),
  );
  return (
    <>
      <div className="faq-filter">
        <label>
          جست‌وجوی پرسش
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="مدارک، نصب، پیگیری…"
          />
        </label>
        <label>
          موضوع
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {["همه", "عمومی", "صاحب بار", "راننده", "متصدی", "اپراتور"].map(
              (r) => (
                <option key={r}>{r}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="service-faq">
        {rows.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
        {!rows.length && (
          <p role="status">
            پرسشی با این عبارت پیدا نشد. از فرم تماس یا پشتیبانی حساب کمک
            بگیرید.
          </p>
        )}
      </div>
    </>
  );
}
export function ContactForm() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        "contact/",
        "POST",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <div className="card info-card" role="status">
        <h2>درخواست شما ثبت شد.</h2>
        <p>
          درخواست در مرکز ارتباط با مشتری قرار گرفت. برای موارد مربوط به محموله
          موجود، پشتیبانی حساب و کد محموله را استفاده کنید.
        </p>
        <button className="secondary-btn" onClick={() => setSent(false)}>
          ثبت موضوع دیگر
        </button>
      </div>
    );
  return (
    <form className="card public-contact" onSubmit={submit}>
      <h2>شروع یک گفت‌وگو</h2>
      <label>
        نام و نام خانوادگی
        <input name="name" required maxLength={100} autoComplete="name" />
      </label>
      <label>
        شماره موبایل
        <input
          name="phone"
          type="tel"
          required
          pattern="[0۰٠][9۹٩][0-9۰-۹٠-٩]{9}"
          maxLength={11}
          autoComplete="tel"
          dir="ltr"
        />
      </label>
      <label>
        موضوع همکاری یا پرسش
        <textarea
          name="message"
          required
          rows={6}
          minLength={10}
          maxLength={2000}
        />
      </label>
      <p className="muted">
        رمز عبور، کد احراز و مدارک هویتی را در این فرم نفرستید.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn" disabled={busy}>
        {busy ? "در حال ثبت…" : "ارسال درخواست"}
      </button>
    </form>
  );
}
type Tracking = {
  code: string;
  origin: string;
  destination: string;
  status: string;
  updated_at: string;
};
export function TrackingForm() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<Tracking | null>(null);
  return (
    <form
      className="card public-contact"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setResult(null);
        const code = String(new FormData(e.currentTarget).get("code") || "")
          .trim()
          .toUpperCase();
        try {
          setResult(
            await api<Tracking>("tracking/?code=" + encodeURIComponent(code)),
          );
        } catch (e) {
          setError(
            e instanceof ApiError && e.status === 404
              ? "محموله‌ای با این کد پیدا نشد. کد را دوباره بررسی کنید."
              : (e as Error).message,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        کد پیگیری محموله
        <input
          name="code"
          required
          maxLength={30}
          dir="ltr"
          placeholder="AL-XXXXXXXXXX"
          autoCapitalize="characters"
        />
      </label>
      <button className="btn" disabled={busy}>
        {busy ? "در حال پیگیری…" : "پیگیری محموله"}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && (
        <section role="status" className="tracking-result">
          <h2>
            {result.origin} ← {result.destination}
          </h2>
          <b>{statuses[result.status] || result.status}</b>
          <p>آخرین تغییر: {date(result.updated_at)}</p>
          <small dir="ltr">{result.code}</small>
          <p>جزئیات بیشتر در حساب افراد مرتبط با سفر قابل مشاهده است.</p>
        </section>
      )}
    </form>
  );
}
export function ServiceStatus() {
  const [state, setState] = useState("در حال بررسی…"),
    [busy, setBusy] = useState(false),
    [time, setTime] = useState("");
  async function check() {
    setBusy(true);
    try {
      const r = await api<{ status: string }>("health/");
      setState(
        r.status === "ok"
          ? "اتصال به سرویس و دیتابیس برقرار است."
          : "سرویس نیاز به بررسی دارد.",
      );
    } catch {
      setState(
        "ارتباط با سرویس برقرار نشد. ممکن است اتصال دستگاه یا سرویس دچار اختلال باشد.",
      );
    } finally {
      setBusy(false);
      setTime(new Date().toLocaleString("fa-IR"));
    }
  }
  useEffect(() => {
    void check();
  }, []);
  return (
    <section className="card info-card">
      <h2>وضعیت فعلی اتصال</h2>
      <p role="status">{state}</p>
      <small>آخرین بررسی: {time || "—"}</small>
      <p>این بررسی لحظه‌ای است؛ تاریخچه تضمین دسترس‌پذیری یا SLA نیست.</p>
      <button
        className="secondary-btn"
        disabled={busy}
        onClick={() => void check()}
      >
        بررسی دوباره
      </button>
    </section>
  );
}
