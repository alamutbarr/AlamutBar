import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import api from "../../api/axios.config";
import { getProfile } from "../../api/auth.api";
import { getErrorMessage } from "../../utils/errorMessage";
import { KYC_MAX_LABEL, kycFileIssue } from "../../utils/kycFile";

const STATUS = {
  MISSING: "ارسال نشده",
  PENDING: "در انتظار بررسی",
  APPROVED: "تأیید شد",
  REJECTED: "رد شد",
};

const OVERALL = {
  VERIFIED: "هویت تأیید شد",
  REJECTED: "هویت رد شده است",
  PENDING: "هویت هنوز کامل تأیید نشده",
};

const FALLBACK_DOCS = [
  { key: "selfie", title: "سلفی", status: "MISSING", url: null },
  { key: "holding", title: "سلفی به‌همراه مدرک شناسایی", status: "MISSING", url: null },
];

export default function OwnerKyc({ profile, onChange }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [slotErrors, setSlotErrors] = useState({});
  const [previews, setPreviews] = useState({});
  const previewsRef = useRef({});
  previewsRef.current = previews;
  const kyc = profile?.kyc || { idType: null, documents: [], verificationStatus: "PENDING" };
  const documents = (kyc.documents && kyc.documents.length > 0) ? kyc.documents : FALLBACK_DOCS;

  useEffect(() => () => {
    Object.values(previewsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const refresh = async () => {
    const data = await getProfile();
    onChange(data);
  };

  const chooseType = async (idType) => {
    setBusy("type");
    setError("");
    try {
      await api.patch("/auth/kyc", { idType });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "نوع مدرک ذخیره نشد."));
    } finally {
      setBusy("");
    }
  };

  const upload = async (slot, file) => {
    if (!file) return;
    const issue = kycFileIssue(file);
    if (issue) {
      setSlotErrors((current) => ({ ...current, [slot]: issue }));
      return;
    }
    setSlotErrors((current) => {
      const next = { ...current };
      delete next[slot];
      return next;
    });
    const localUrl = URL.createObjectURL(file);
    setPreviews((current) => {
      if (current[slot]) URL.revokeObjectURL(current[slot]);
      return { ...current, [slot]: localUrl };
    });
    setBusy(slot);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("slot", slot);
      if (kyc.idType) body.append("idType", kyc.idType);
      await api.post("/auth/kyc", body, {
        transformRequest: [(data, headers) => {
          delete headers["Content-Type"];
          return data;
        }],
      });
      await refresh();
    } catch (err) {
      setSlotErrors((current) => ({
        ...current,
        [slot]: getErrorMessage(err, "بارگذاری مدرک انجام نشد."),
      }));
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-ink-100 bg-white p-6 shadow-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">احراز هویت</h2>
          <p className="mt-1 text-sm text-ink-300">
            انجام یکی از دو مدرک کافی است: یا صفحهٔ اول شناسنامه یا کارت ملی. نیازی به بارگذاری هر دو نیست.
            برای هر بخش یک عکس بفرستید. پیش‌نمایش کوچک همان‌جا دیده می‌شود. سقف حجم هر عکس {KYC_MAX_LABEL} است.
          </p>
        </div>
        <span className="rounded-md bg-[#17383b] px-3 py-1 text-xs font-bold text-[#f7f6f0]">
          {OVERALL[kyc.verificationStatus] || OVERALL.PENDING}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["shenasnameh", "شناسنامه"],
          ["national_card", "کارت ملی"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={busy === "type"}
            onClick={() => chooseType(value)}
            className={`rounded-md border px-3 py-2 text-sm font-bold ${
              kyc.idType === value
                ? "border-[#087f8c] bg-[#e1f3f0] text-[#17383b]"
                : "border-ink-100 text-ink-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!kyc.idType && (
        <p className="mb-3 text-xs text-[#526d70]">
          یکی از دو گزینه را انتخاب کنید. بارگذاری شناسنامه و کارت ملی با هم لازم نیست.
        </p>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-3">
        {documents.map((doc) => {
          const preview = previews[doc.key] || doc.url;
          return (
            <article key={doc.key} className="rounded-md border border-ink-100 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-ink-100 bg-[#f7f6f0]">
                  {preview ? (
                    <img src={preview} alt={doc.title} className="h-full w-full object-cover" />
                  ) : (
                    <Camera size={22} className="text-ink-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-ink-900">{doc.title}</strong>
                    <span className="text-xs font-bold text-[#087f8c]">{STATUS[doc.status] || doc.status}</span>
                  </div>
                  {doc.status === "REJECTED" && doc.note && (
                    <p className="mt-1 text-sm text-red-600">دلیل رد: {doc.note}</p>
                  )}
                  <p className="mt-1 text-[11px] text-ink-300">JPG، PNG یا WEBP — حداکثر {KYC_MAX_LABEL}</p>
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#087f8c] px-3 py-1.5 text-xs font-bold text-[#087f8c]">
                    {busy === doc.key ? <Loader2 size={14} className="animate-spin" /> : null}
                    {doc.url || preview ? "تغییر تصویر" : "انتخاب تصویر"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      disabled={Boolean(busy)}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        upload(doc.key, file);
                      }}
                    />
                  </label>
                  {slotErrors[doc.key] && (
                    <p className="mt-2 text-sm text-red-600">{slotErrors[doc.key]}</p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
