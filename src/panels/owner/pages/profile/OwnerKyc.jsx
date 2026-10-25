import { useState } from "react";
import { Loader2 } from "lucide-react";
import api from "../../api/axios.config";
import { getProfile } from "../../api/auth.api";
import { getErrorMessage } from "../../utils/errorMessage";

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

export default function OwnerKyc({ profile, onChange }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const kyc = profile?.kyc || { idType: null, documents: [], verificationStatus: "PENDING" };

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
      setError(getErrorMessage(err, "بارگذاری مدرک انجام نشد."));
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
            سلفی، مدرک شناسایی (شناسنامه یا کارت ملی) و سلفی به‌همراه همان مدرک. هر کدام جدا بررسی می‌شود.
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

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-3">
        {(kyc.documents || []).map((doc) => (
          <article key={doc.key} className="rounded-md border border-ink-100 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm text-ink-900">{doc.title}</strong>
              <span className="text-xs font-bold text-[#087f8c]">{STATUS[doc.status] || doc.status}</span>
            </div>
            {doc.url && (
              <img src={doc.url} alt={doc.title} className="mt-2 max-h-40 rounded-md border border-ink-100 object-contain" />
            )}
            {doc.status === "REJECTED" && doc.note && (
              <p className="mt-2 text-sm text-red-600">دلیل رد: {doc.note}</p>
            )}
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[#087f8c]">
              {busy === doc.key ? <Loader2 size={14} className="animate-spin" /> : null}
              {doc.url ? "بارگذاری دوباره" : "انتخاب تصویر"}
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
          </article>
        ))}
      </div>
    </section>
  );
}
