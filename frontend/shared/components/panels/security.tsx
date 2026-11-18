"use client";
import { PanelError, usePanelRefresh } from "../panel-feedback";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/api";
import { ActionForm } from "../forms";
export default function Security() {
  const [enabled, setEnabled] = useState<boolean | null>(null),
    [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null),
    [qr, setQr] = useState(""),
    [message, setMessage] = useState(""),
    [loadError, setLoadError] = useState<Error | null>(null);
  async function load() {
    setLoadError(null);
    try {
      const s = await api<{ mfa_enabled: boolean }>("security/status/");
      setEnabled(s.mfa_enabled);
    } catch (e) {
      setLoadError(e as Error);
    }
  }
  usePanelRefresh(load);
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="card form-card full">
      <h2>امنیت ورود دومرحله‌ای</h2>
      <p className="muted">
        با فعال‌سازی، علاوه بر رمز عبور به کد برنامه Authenticator نیاز دارید.
        کلید را در محل امن خود نگه دارید.
      </p>
      {enabled !== null && (
        <span className={"badge " + (enabled ? "completed" : "pending")}>
          {enabled ? "فعال" : "غیرفعال"}
        </span>
      )}
      {loadError ? (
        <PanelError error={loadError} retry={() => void load()} />
      ) : enabled === null ? (
        <p className="muted" role="status">در حال دریافت وضعیت امنیت حساب…</p>
      ) : enabled ? (
        <ActionForm
          fields={[
            {
              name: "password",
              label: "رمز فعلی",
              type: "password",
              required: true,
            },
            {
              name: "code",
              label: "کد دومرحله‌ای",
              required: true,
              maxLength: 6,
            },
          ]}
          submit="غیرفعال‌سازی ورود دومرحله‌ای"
          onSubmit={async (d) => {
            await api("security/mfa/disable/", "POST", d);
            await load();
            setMessage("ورود دومرحله‌ای غیرفعال شد.");
          }}
        />
      ) : !setup ? (
        <ActionForm
          fields={[
            {
              name: "password",
              label: "رمز فعلی برای ایجاد کلید",
              type: "password",
              required: true,
              full: true,
            },
          ]}
          submit="شروع فعال‌سازی"
          onSubmit={async (d) => {
            const data = await api<{ secret: string; uri: string }>(
              "security/mfa/setup/",
              "POST",
              d,
            );
            setSetup(data);
            setQr(await QRCode.toDataURL(data.uri, { width: 210, margin: 1 }));
          }}
        />
      ) : (
        <>
          <div className="mfa-key">
            {qr && (
              <img
                src={qr}
                width={210}
                height={210}
                alt="کد اتصال به برنامه ورود دومرحله‌ای"
              />
            )}
            <p>کلید دستی برای برنامه احراز هویت:</p>
            <code dir="ltr">{setup.secret}</code>
          </div>
          <ActionForm
            fields={[
              {
                name: "code",
                label: "کد ۶ رقمی برنامه",
                required: true,
                maxLength: 6,
                full: true,
              },
            ]}
            submit="تأیید و فعال‌سازی"
            onSubmit={async (d) => {
              await api("security/mfa/enable/", "POST", d);
              setSetup(null);
              setQr("");
              await load();
              setMessage(
                "ورود دومرحله‌ای فعال شد. کد استفاده‌شده تا پایان بازه دوباره پذیرفته نمی‌شود.",
              );
            }}
          />
        </>
      )}
      {message && (
        <p className="info-note" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
