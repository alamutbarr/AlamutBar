// src/panels/admin/pages/DriverDetail.jsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

const GROUP_LABELS = {
  personal: "مدارک شخصی",
  vehicle: "مدارک خودرو",
  insurance: "بیمه‌نامه",
};

const DOC_STATUS_LABELS = {
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
  PENDING: "در انتظار بررسی",
  MISSING: "آپلود نشده",
};

const VERIFY_LABELS = {
  VERIFIED: "تأیید شده",
  PENDING_VERIFICATION: "در انتظار تأیید",
  REJECTED: "رد شده",
};

export default function DriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [driver, setDriver] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); // busy یعنی در حال ثبت عملیات

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api(`/drivers/${id}`);
      setDriver(res);
    } catch (err) {
      setError(
        err.message || "خطا در دریافت اطلاعات راننده. لطفا دوباره تلاش کنید.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReview(group, doc, decision) {
    let reason = "";
    if (decision === "REJECTED") {
      reason =
        window.prompt("دلیل رد مدرک را وارد کنید (حداقل ۳ کاراکتر):") || "";
      if (reason.trim().length < 3) {
        alert("دلیل رد باید حداقل ۳ کاراکتر باشد.");
        return;
      }
    }

    const list = driver?.documents?.[group] || [];
    const index = list.findIndex((item) => item.key === doc.key);
    if (index < 0) {
      setError("مدرک در لیست پیدا نشد. صفحه را دوباره بارگذاری کنید.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await api(`/drivers/${id}/documents/review`, {
        method: "POST",
        body: { group, index, decision, reason },
      });
      await load(); // بارگذاری مجدد مدارک بعد از ثبت
    } catch (err) {
      setError(err.message || "خطا در ثبت بررسی مدرک");
    } finally {
      setBusy(false);
    }
  }

  // 1. حالت لودینگ اولیه
  if (loading && !driver) {
    return (
      <div className="p-8 text-center text-slate-500" dir="rtl">
        در حال بارگذاری اطلاعات راننده...
      </div>
    );
  }

  // 2. حالت خطا (اگر راننده پیدا نشد یا ارور شبکه بود)
  if (error && !driver) {
    return (
      <div className="p-6" dir="rtl">
        <button
          className="text-teal-600 mb-4 hover:underline"
          onClick={() => navigate("/admin/drivers")}
        >
          &rarr; بازگشت به لیست رانندگان
        </button>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  // 3. حالت عادی
  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen" dir="rtl">
      <button
        className="mb-6 text-teal-600 hover:underline flex items-center gap-2 font-bold"
        onClick={() => navigate("/admin/drivers")}
      >
        <span>&rarr;</span> بازگشت به لیست رانندگان
      </button>

      {/* کارت اطلاعات کلی راننده */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-4">
          {driver?.fullName}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8 text-sm text-slate-600">
          <div>
            <span className="font-bold text-slate-800">تلفن همراه:</span>{" "}
            {driver?.phone}
          </div>
          <div>
            <span className="font-bold text-slate-800">پلاک خودرو:</span>{" "}
            {driver?.plate || "—"}
          </div>
          <div>
            <span className="font-bold text-slate-800">کد ملی:</span>{" "}
            {driver?.nationalId || "—"}
          </div>
          <div>
            <span className="font-bold text-slate-800">نوع کشنده:</span>{" "}
            {driver?.tractorType || "—"}
          </div>
          <div>
            <span className="font-bold text-slate-800">نوع تریلر:</span>{" "}
            {driver?.trailerType || "—"}
          </div>
          <div>
            <span className="font-bold text-slate-800">وضعیت احراز هویت:</span>{" "}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                driver?.verificationStatus === "VERIFIED"
                  ? "bg-green-100 text-green-700"
                  : driver?.verificationStatus === "REJECTED"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              {VERIFY_LABELS[driver?.verificationStatus] ||
                driver?.verificationStatus}
            </span>
          </div>
        </div>

        {driver?.rejectionReason && (
          <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
            <strong>دلیل رد کلی:</strong> {driver.rejectionReason}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* بخش نمایش و بررسی مدارک */}
      <div className="space-y-6">
        {Object.entries(GROUP_LABELS).map(([group, label]) => {
          const docs = driver?.documents?.[group] || [];
          return (
            <div
              key={group}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">{label}</h2>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">
                  {docs.length} مدرک
                </span>
              </div>

              <div className="p-6">
                {docs.length === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-4">
                    مدرکی در این بخش آپلود نشده است.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {docs.map((doc) => (
                      <div
                        key={doc.key}
                        className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between bg-slate-50 hover:bg-white transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-800 mb-2">
                            {doc.title || doc.key}
                          </div>

                          <div className="text-sm text-slate-600 mb-3 flex items-center gap-2">
                            وضعیت:
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-xs ${
                                doc.status === "APPROVED"
                                  ? "bg-green-100 text-green-700"
                                  : doc.status === "REJECTED"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {DOC_STATUS_LABELS[doc.status] || doc.status}
                            </span>
                          </div>

                          {doc.note && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-3">
                              علت رد: {doc.note}
                            </div>
                          )}

                          {doc.url ? (
                            <a
                              className="inline-block bg-slate-200 text-slate-800 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors mb-4"
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              مشاهده تصویر مدرک
                            </a>
                          ) : (
                            <div className="text-sm text-red-400 mb-4">
                              تصویری آپلود نشده
                            </div>
                          )}
                        </div>

                        {/* دکمه‌های تایید و رد */}
                        <div className="flex gap-2 mt-2">
                          <button
                            disabled={
                              busy || doc.status === "APPROVED" || !doc.url
                            }
                            className="flex-1 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            onClick={() => handleReview(group, doc, "APPROVED")}
                          >
                            {busy ? "در حال ثبت..." : "تأیید مدرک"}
                          </button>
                          <button
                            disabled={
                              busy || doc.status === "APPROVED" || !doc.url
                            }
                            className="flex-1 bg-red-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            onClick={() => handleReview(group, doc, "REJECTED")}
                          >
                            {busy ? "..." : "رد مدرک"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
