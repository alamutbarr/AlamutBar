"use client";
import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, WifiOff } from "lucide-react";
import { panelApps, type PanelKey } from "@/lib/panels";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const installPrompts: Partial<Record<PanelKey, InstallEvent>> = {};
export default function PWA({ panel }: { panel: PanelKey }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [installed, setInstalled] = useState(false),
    [online, setOnline] = useState(true),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [help, setHelp] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [session, setSession] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const updating = useRef(false),
    reg = useRef<ServiceWorkerRegistration | null>(null);
  const app = panelApps[panel];
  useEffect(() => {
    let cancelled = false;
    const standalone = window.matchMedia("(display-mode: standalone)");
    setInstalled(
      standalone.matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    );
    setOnline(navigator.onLine);
    setPrompt(installPrompts[panel] || null);
    const network = () => setOnline(navigator.onLine),
      onInstall = (e: Event) => {
        e.preventDefault();
        installPrompts[panel] = e as InstallEvent;
        setPrompt(e as InstallEvent);
      },
      done = () => {
        setInstalled(true);
        delete installPrompts[panel];
        setPrompt(null);
      },
      expired = () => setSession(true),
      change = () => {
        if (updating.current) location.reload();
      };
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", done);
    window.addEventListener("alamut:session-expired", expired);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.addEventListener("controllerchange", change);
      navigator.serviceWorker
        .register("/pwa/worker?panel=" + panel, {
          scope: "/" + panel + "/",
          updateViaCache: "none",
        })
        .then((r) => {
          if (cancelled) return;
          reg.current = r;
          void navigator.serviceWorker.ready.then((ready) => {
            if (!cancelled && ready.scope.endsWith("/" + panel + "/"))
              setPrepared(true);
          });
          if (r.waiting) setWaiting(r.waiting);
          r.addEventListener("updatefound", () => {
            const worker = r.installing;
            worker?.addEventListener("statechange", () => {
              if (!cancelled && worker.state === "installed" && r.active)
                setWaiting(worker);
            });
          });
        })
        .catch(() => {
          if (!cancelled)
            setError(
              "آماده‌سازی آفلاین انجام نشد؛ اتصال امن و مجوزهای مرورگر را بررسی کنید.",
            );
        });
    }
    return () => {
      cancelled = true;
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", done);
      window.removeEventListener("alamut:session-expired", expired);
      if ("serviceWorker" in navigator)
        navigator.serviceWorker.removeEventListener("controllerchange", change);
    };
  }, [panel]);
  async function install() {
    if (!prompt) {
      setHelp(!help);
      return;
    }
    setBusy(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
      delete installPrompts[panel];
      setPrompt(null);
    } catch {
      setError(
        "نصب انجام نشد؛ از منوی مرورگر، نصب برنامه یا افزودن به صفحه اصلی را انتخاب کنید.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="pwa-tools">
      <div className="pwa-toolbar">
        <span>
          {installed ? "برنامه " + app.short : "برنامه موبایل " + app.short}
        </span>
        {prepared && (
          <small className="pwa-ready" role="status">
            صفحه آفلاین آماده است
          </small>
        )}
        {!installed && (
          <button
            className="text-link"
            disabled={busy}
            onClick={() => void install()}
          >
            <Download size={16} />
            نصب پنل {app.short}
          </button>
        )}
        <button
          className="text-link"
          onClick={() => {
            void reg.current
              ?.update()
              .catch(() => setError("بررسی نسخه جدید انجام نشد."));
            setHelp(!help);
          }}
        >
          راهنمای نصب
        </button>
      </div>
      {!online && (
        <p className="connection-banner" role="status">
          <WifiOff size={18} />
          اتصال دستگاه قطع است. اطلاعات خصوصی آفلاین ذخیره نمی‌شوند؛ پیش از
          تکرار عملیات، وضعیت آن را بررسی کنید.
        </p>
      )}
      {session && (
        <p className="connection-banner" role="alert">
          نشست شما پایان یافته است.{" "}
          <a href={"/" + panel + "/app"}>ورود دوباره به همین پنل</a>
        </p>
      )}
      {waiting && (
        <div className="update-banner" role="status">
          <p>
            نسخهٔ جدید آماده است. پیش از بارگیری دوباره، تغییرات فرم را ذخیره
            کنید.
          </p>
          <button
            className="secondary-btn"
            onClick={() => {
              updating.current = true;
              waiting.postMessage({ type: "SKIP_WAITING" });
            }}
          >
            <RefreshCw size={16} />
            به‌روزرسانی و بارگیری دوباره
          </button>
        </div>
      )}
      {help && (
        <div className="info-note">
          <b>نصب مستقل {app.name}</b>
          <p>
            Android و دسکتاپ: از گزینه «نصب برنامه» در منوی Chrome یا Edge
            استفاده کنید. iPhone و iPad: در Safari، Share و سپس Add to Home
            Screen را بزنید.
          </p>
          <p>
            هر پنل آیکون و حساب مربوط به خودش را دارد. رصد GPS با بسته‌شدن برنامه
            ادامه پیدا نمی‌کند.
          </p>
          {typeof window !== "undefined" && !window.isSecureContext && (
            <p>
              برای نصب و آفلاین در موبایل باید سایت روی دامنه HTTPS باز شود؛
              آدرس محلی رایانه روی گوشی قابل استفاده نیست.
            </p>
          )}
        </div>
      )}
      {error && (
        <p className="info-note" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
