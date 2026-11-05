// src/panels/admin/pages/Drivers.jsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

// تبدیل وضعیت‌ها به فارسی
const VERIFY_LABELS = {
  VERIFIED: "تأیید شده",
  PENDING_VERIFICATION: "در انتظار تأیید",
  PENDING: "در انتظار",
  REJECTED: "رد شده",
};

const AVAILABILITY_LABELS = {
  READY: "آماده به کار",
  BUSY: "مشغول",
  OFFLINE: "آفلاین",
};

export default function Drivers() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], total: 0 });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (q.trim()) params.set("q", q.trim());
      const res = await api(`/drivers?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err.message || "خطا در دریافت لیست رانندگان");
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">مدیریت رانندگان</h1>
        <input
          className="border border-slate-300 rounded-lg px-4 py-2 w-full md:w-80 focus:outline-none focus:border-teal-500"
          placeholder="جستجو: نام، تلفن، پلاک..."
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="p-4 text-right font-medium">نام راننده</th>
              <th className="p-4 text-right font-medium">تلفن</th>
              <th className="p-4 text-right font-medium">پلاک</th>
              <th className="p-4 text-right font-medium">ناوگان</th>
              <th className="p-4 text-right font-medium">وضعیت تأیید</th>
              <th className="p-4 text-right font-medium">وضعیت</th>
              <th className="p-4 text-right font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading && data.items.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500">
                  در حال بارگذاری...
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500">
                  راننده‌ای یافت نشد.
                </td>
              </tr>
            ) : (
              data.items.map((driver) => (
                <tr
                  key={driver.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="p-4">
                    <button
                      className="text-teal-700 font-bold hover:underline"
                      onClick={() => navigate(`/admin/drivers/${driver.id}`)}
                    >
                      {driver.fullName || "بدون نام"}
                    </button>
                  </td>
                  <td className="p-4 font-mono">{driver.phone}</td>
                  <td className="p-4 font-mono">{driver.plate || "—"}</td>
                  <td className="p-4">
                    {driver.vehicleSummary ||
                      [driver.tractorLabel, driver.trailerLabel].filter(Boolean).join(" / ") ||
                      "—"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        driver.verificationStatus === "VERIFIED"
                          ? "bg-green-100 text-green-700"
                          : driver.verificationStatus === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {VERIFY_LABELS[driver.verificationStatus] ||
                        driver.verificationStatus}
                    </span>
                  </td>
                  <td className="p-4">
                    {AVAILABILITY_LABELS[driver.availability] ||
                      driver.availability}
                  </td>
                  <td className="p-4">
                    <button
                      className="text-sm border border-teal-600 text-teal-700 rounded-lg px-4 py-1.5 hover:bg-teal-50 transition-colors"
                      onClick={() => navigate(`/admin/drivers/${driver.id}`)}
                    >
                      مشاهده و بررسی مدارک
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          قبلی
        </button>
        <span className="text-sm text-slate-600">صفحه {page}</span>
        <button
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
          disabled={page * 20 >= data.total}
          onClick={() => setPage((p) => p + 1)}
        >
          بعدی
        </button>
      </div>
    </div>
  );
}
