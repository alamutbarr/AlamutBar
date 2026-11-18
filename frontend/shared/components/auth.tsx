"use client";
import { api, panelPaths, roles, type Role, type User } from "@/lib/api";
import { siteHref } from "@/lib/deployment-links";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "@/lib/navigation";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Brand } from "./ui";
export default function Auth({
  register = false,
  fixedRole,
  onSignedIn,
}: {
  register?: boolean;
  fixedRole?: Role;
  onSignedIn?: (user: User) => void;
}) {
  const params = useSearchParams(),
    router = useRouter();
  const initial = fixedRole || (params.get("role") as Role);
  const [role, setRole] = useState<Role>(
      Object.keys(roles).includes(initial) &&
        (!register || ["owner", "driver"].includes(initial))
        ? initial
        : "owner",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    [demo, setDemo] = useState(false),
    [sms, setSms] = useState(false),
    [phone, setPhone] = useState(""),
    [otp, setOtp] = useState(""),
    [demoCode, setDemoCode] = useState("");
  const driverRegistration = register && role === "driver";
  useEffect(() => {
    api<{ demo_enabled: boolean }>("auth/csrf/")
      .then((r) => setDemo(r.demo_enabled))
      .catch(() => {});
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      if (
        driverRegistration &&
        values.password !== values.password_confirmation
      ) {
        setError("رمز عبور و تکرار آن باید یکسان باشند.");
        return;
      }
      delete values.password_confirmation;
      const user = await api<User>(
        "auth/" + (register ? "register/" : "login/"),
        "POST",
        { ...values, role },
      );
      if (onSignedIn) {
        onSignedIn(user);
        return;
      }
    router.push(
        "/" +
          panelPaths[user.role] +
          (user.role === "driver" && !user.driver_market_enabled
            ? "/onboarding"
            : ""),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      id="main"
      className={
        "auth-layout" + (fixedRole || driverRegistration ? " role-auth" : "")
      }
      data-role={role}
    >
      <div className="auth-form-side">
        <div className="auth-top">
          <Brand />
          <Link href={siteHref("/")} className="text-link">
            صفحه اصلی <ArrowLeft size={17} />
          </Link>
        </div>
        <div className="auth-box">
          <span className="eyebrow">فضای کار یکپارچه الموت</span>
          <h1>
            {register
              ? role === "driver"
                ? "ثبت‌نام راننده"
                : "شروع یک همکاری تازه"
              : fixedRole
                ? "ورود به برنامهٔ " + roles[fixedRole]
                : "خوش آمدید."}
          </h1>
          <p className="muted">
            {register
              ? role === "driver"
                ? "حساب را بسازید و پروندهٔ همکاری را تکمیل کنید. پس از بررسی اپراتور، بازار بار باز می‌شود."
                : "حساب خود را بسازید و اولین مسیر را شروع کنید."
              : fixedRole
                ? "برای ادامه، مشخصات حساب خود را وارد کنید."
                : "برای ادامه، نقش و مشخصات حساب خود را وارد کنید."}
          </p>
          {!fixedRole && (
            <div className="role-tabs" role="group" aria-label="انتخاب نقش">
              {(Object.keys(roles) as Role[])
                .filter((r) => !register || ["owner", "driver"].includes(r))
                .map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={role === r ? "active" : ""}
                    aria-pressed={role === r}
                    onClick={() => setRole(r)}
                  >
                    {roles[r]}
                  </button>
                ))}
            </div>
          )}
          {sms && role === "owner" && !register ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                void (demoCode
                  ? api<User>("auth/otp/confirm/", "POST", { phone, code: otp })
                  : api<{ detail: string; demo_code?: string }>(
                      "auth/otp/",
                      "POST",
                      { phone },
                    )
                )
                  .then((result) => {
                    if ("username" in result) {
                      if (onSignedIn) onSignedIn(result);
                      else router.push("/" + panelPaths[result.role]);
                      return;
                    }
                    setDemoCode(result.demo_code || "");
                    setError(result.demo_code ? "" : result.detail);
                  })
                  .catch((reason) => setError((reason as Error).message))
                  .finally(() => setBusy(false));
              }}
            >
              <label>
                موبایل صاحب بار
                <input
                  value={phone}
                  dir="ltr"
                  required
                  inputMode="tel"
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
              {demoCode && (
                <>
                  <p className="demo-note">
                    کد آزمایشی: <code>{demoCode}</code>
                  </p>
                  <label>
                    کد تأیید
                    <input
                      value={otp}
                      dir="ltr"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) => setOtp(event.target.value)}
                    />
                  </label>
                </>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn block" disabled={busy}>
                {demoCode ? "تأیید و ورود" : "دریافت کد"}
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setSms(false);
                  setError("");
                }}
              >
                ورود با نام کاربری
              </button>
            </form>
          ) : (
          <form onSubmit={submit}>
            {register && (
              <div className="form-grid">
                <label>
                  نام
                  <input
                    name="first_name"
                    required
                    maxLength={150}
                    autoComplete="given-name"
                  />
                </label>
                <label>
                  نام خانوادگی
                  <input
                    name="last_name"
                    required
                    maxLength={150}
                    autoComplete="family-name"
                  />
                </label>
                <label className="full">
                  شماره موبایل
                  <input
                    name="phone"
                    required
                    pattern="[0۰٠][9۹٩][0-9۰-۹٠-٩]{9}"
                    dir="ltr"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="09123456789"
                  />
                </label>
                {role === "driver" && (
                  <label className="full">
                    ایمیل بازیابی رمز (اختیاری)
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      dir="ltr"
                    />
                  </label>
                )}
                {role === "owner" && (
                  <label className="full">
                    نام شرکت (اختیاری)
                    <input name="company" maxLength={120} />
                  </label>
                )}
              </div>
            )}
            <label>
              نام کاربری
              <input
                key={"username" + role}
                name="username"
                dir="ltr"
                required
                autoComplete="username"
                placeholder={demo ? role + ".demo" : "نام کاربری"}
                maxLength={150}
              />
            </label>
            <label>
              رمز عبور
              <div className="password-input">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={register ? 8 : 1}
                  dir="ltr"
                  autoComplete={register ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>
            {driverRegistration && (
              <label>
                تکرار رمز عبور
                <input
                  name="password_confirmation"
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  dir="ltr"
                  autoComplete="new-password"
                />
              </label>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {!register && (
              <>
                <label>
                  کد دومرحله‌ای (اگر فعال کرده‌اید)
                  <input
                    name="code"
                    inputMode="numeric"
                    maxLength={6}
                    dir="ltr"
                    autoComplete="one-time-code"
                    pattern="[0-9۰-۹٠-٩]{6}"
                  />
                </label>
                <Link className="text-link small" href="/recover">
                  رمز عبور را فراموش کرده‌اید؟
                </Link>
              </>
            )}
            <button className="btn block" disabled={busy}>
              {busy
                ? "لطفاً صبر کنید…"
                : register
                  ? role === "driver"
                    ? "ساخت حساب و تکمیل پرونده"
                    : "ایجاد حساب کاربری"
                  : "ورود به پنل " + roles[role]}
              <ArrowLeft size={18} />
            </button>
          </form>
          )}
          {role === "owner" && !register && !sms && (
            <button
              type="button"
              className="secondary-btn block"
              onClick={() => {
                if (!demo) {
                  setError(
                    "ورود پیامکی در این محیط فعال نیست. با نام کاربری و رمز وارد شوید.",
                  );
                  return;
                }
                setSms(true);
                setError("");
              }}
            >
              ورود با پیامک
            </button>
          )}
          {demo && !register && !sms && (
            <div className="demo-note">
              <b>محیط آزمایشی با داده‌های نمونه</b>
              <p>
                نام کاربری: <code>{role}.demo</code>
                <br />
                رمز عبور: <code>AlamutDemo!2026</code>
              </p>
            </div>
          )}
          {(!fixedRole || ["owner", "driver"].includes(fixedRole)) && (
            <p className="auth-switch">
              {register ? "قبلاً ثبت‌نام کرده‌اید؟" : "حساب کاربری ندارید؟"}{" "}
              <Link
                href={(register ? "/login" : "/register") + "?role=" + role}
              >
                {register ? "ورود به سامانه" : "ثبت‌نام رایگان"}
              </Link>
            </p>
          )}
          <small className="muted">
            ثبت‌نام به معنی شروع همکاری است. احراز مدارک راننده توسط اپراتور
            انجام می‌شود. <Link href={siteHref("/privacy")}>حریم خصوصی</Link>
          </small>
        </div>
        <small className="auth-bottom">الموت · هر مسیر، یک تعهد است.</small>
      </div>
      <aside className="auth-photo">
        <img src="/alamut-road.jpg" alt="جاده‌ای میان کوهستان" />
        <div className="auth-photo-overlay" />
        <div>
          <ShieldCheck size={42} strokeWidth={1} />
          <h2>
            مسیر مطمئن،
            <br />
            <em>همکاری ماندگار.</em>
          </h2>
          <p>
            از اولین کیلومتر تا تحویل نهایی،
            <br />
            همه جزئیات در کنار شماست.
          </p>
        </div>
      </aside>
    </main>
  );
}
