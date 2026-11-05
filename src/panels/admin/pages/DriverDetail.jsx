import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { api } from "../api";
import { useAdmin } from "../auth";
import { DRIVER_STATUS_LABELS, WORKFLOW_LABELS, money, when } from "../format";
import { VERIFICATION_SECTIONS } from "../../driver/verification";
import { describeVehicle } from "../../driver/vehicleConfig";

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

function docsByKey(driver) {
  const map = new Map();
  (driver.documentList || []).forEach((doc) => map.set(doc.key, doc));
  ["personal", "vehicle", "insurance"].forEach((group) => {
    (driver.documents?.[group] || []).forEach((doc) => {
      if (!map.has(doc.key)) map.set(doc.key, { ...doc, group });
    });
  });
  return map;
}

function dim(value, label) {
  if (value == null || value === "") return null;
  return `${label} ${Number(value).toLocaleString("fa-IR")} سانتی‌متر`;
}

export default function DriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAdmin();

  const [driver, setDriver] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");

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

  async function handleReview(doc, decision, note = "") {
    if (decision === "REJECTED" && String(note).trim().length < 3) {
      setError("دلیل رد باید حداقل ۳ کاراکتر باشد.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/drivers/${id}/documents/review`, {
        method: "POST",
        body: { key: doc.key, group: doc.group, decision, reason: note },
      });
      setRejecting(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err.message || "خطا در ثبت بررسی مدرک");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !driver) {
    return (
      <div className="p-8 text-center text-slate-500" dir="rtl">
        در حال بارگذاری اطلاعات راننده...
      </div>
    );
  }

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

  const vehicle = describeVehicle(driver.tractorType, driver.trailerType, driver.vehicleSpecs);
  const fields = driver.vehicleFields?.length ? driver.vehicleFields : vehicle.fields;
  const byKey = docsByKey(driver);
  const activeCargo = (driver.missions || []).find((mission) => mission.isActive);

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen" dir="rtl">
      <button
        className="mb-6 text-teal-600 hover:underline flex items-center gap-2 font-bold"
        onClick={() => navigate("/admin/drivers")}
      >
        <span>&rarr;</span> بازگشت به لیست رانندگان
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-4">
          {driver?.fullName}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8 text-sm text-slate-600">
          <div>
            <span className="font-bold text-slate-800">تلفن همراه:</span> {driver?.phone}
          </div>
          <div>
            <span className="font-bold text-slate-800">پلاک خودرو:</span> {driver?.plate || "—"}
          </div>
          <div>
            <span className="font-bold text-slate-800">کد ملی:</span> {driver?.nationalId || "—"}
          </div>
          <div>
            <span className="font-bold text-slate-800">گواهینامه:</span> {driver?.licenseNumber || "—"}
          </div>
          <div>
            <span className="font-bold text-slate-800">کارت هوشمند:</span> {driver?.smartCardNumber || "—"}
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
                DRIVER_STATUS_LABELS[driver?.verificationStatus] ||
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-4">مشخصات ماشین</h2>
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-bold text-slate-800">نوع کشنده:</span>{" "}
              {driver?.tractorLabel || vehicle.tractor || "—"}
            </p>
            <p>
              <span className="font-bold text-slate-800">نوع گاری:</span>{" "}
              {driver?.trailerLabel || vehicle.trailer || "—"}
            </p>
            {fields.map((field) => (
              <p key={field.key}>
                <span className="font-bold text-slate-800">{field.title}:</span> {field.value || "—"}
              </p>
            ))}
          </div>
        </div>

        {activeCargo ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 mb-4">بار قبول‌شده</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                {activeCargo.trackingCode} — {activeCargo.workflowLabel || WORKFLOW_LABELS[activeCargo.workflowStatus]}
              </p>
              <p>
                {activeCargo.origin || "—"} ← {activeCargo.destination || "—"}
              </p>
              <p>نوع بار: {activeCargo.cargo?.type || "—"}</p>
              <p>
                وزن:{" "}
                {activeCargo.cargo?.weightKg != null
                  ? `${Number(activeCargo.cargo.weightKg).toLocaleString("fa-IR")} کیلوگرم`
                  : "—"}
              </p>
              <p>
                {[
                  dim(activeCargo.cargo?.lengthCm, "طول"),
                  dim(activeCargo.cargo?.widthCm, "عرض"),
                  dim(activeCargo.cargo?.heightCm, "ارتفاع"),
                ]
                  .filter(Boolean)
                  .join("، ") || "ابعاد ثبت نشده"}
              </p>
              {activeCargo.cargo?.value != null && <p>ارزش: {money(activeCargo.cargo.value)}</p>}
            </div>
            <button
              type="button"
              className="mt-4 text-sm border border-teal-600 text-teal-700 rounded-lg px-4 py-1.5 hover:bg-teal-50"
              onClick={() => navigate(`/admin/orders/${activeCargo.id}`)}
            >
              مشاهده سفارش
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 mb-2">بار قبول‌شده</h2>
            <p className="text-sm text-slate-500">الان بار فعالی برای این راننده ثبت نشده است.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-2">موقعیت GPS</h2>
          <p className="text-sm text-slate-600 mb-3">
            آخرین اتصال: {when(driver.lastLocationAt)} {driver.isGpsActive ? "(فعال)" : "(قطع)"}
          </p>
          {driver.lastLocation ? (
            <div className="map-shell driver-gps">
              <MapContainer center={[driver.lastLocation.lat, driver.lastLocation.lng]} zoom={12}>
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <CircleMarker
                  center={[driver.lastLocation.lat, driver.lastLocation.lng]}
                  radius={10}
                  pathOptions={{ color: "#087f8c", fillColor: "#d7b56d", fillOpacity: 0.9 }}
                >
                  <Popup>{driver.fullName}</Popup>
                </CircleMarker>
              </MapContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              هنوز موقعیت GPS برای این راننده ثبت نشده است. بعد از اتصال دستگاه، اینجا نمایش داده می‌شود.
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-4">مأموریت‌های اخیر</h2>
          <div className="space-y-2">
            {(driver.missions || []).map((mission) => (
              <button
                key={mission.id}
                type="button"
                className="block w-full text-right text-sm text-teal-700 hover:underline"
                onClick={() => navigate(`/admin/orders/${mission.id}`)}
              >
                {mission.trackingCode} — {mission.workflowLabel || WORKFLOW_LABELS[mission.workflowStatus] || mission.workflowStatus}
                {mission.origin ? ` — ${mission.origin} ← ${mission.destination || "—"}` : ""}
              </button>
            ))}
            {!(driver.missions || []).length && (
              <p className="text-sm text-slate-500">مأموریتی ثبت نشده.</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-slate-800">احراز هویت راننده</h2>
            <p className="text-xs text-slate-500 mt-1">همان مدارکی که راننده در پنل خود بارگذاری و ارسال کرده است.</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {VERIFICATION_SECTIONS.flatMap((section) =>
            section.slots.map((slot) => {
              const key = `${section.id}:${slot.id}`;
              const doc = byKey.get(key);
              const open = rejecting === key;
              return (
                <div
                  key={key}
                  className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between bg-slate-50"
                >
                  <div>
                    <div className="font-bold text-slate-800 mb-1">{slot.label}</div>
                    <div className="text-xs text-slate-500 mb-3">
                      {section.title}
                      {section.mandatory ? " — اجباری" : " — اختیاری"}
                    </div>
                    <div className="text-sm text-slate-600 mb-3">
                      وضعیت:{" "}
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-xs ${
                          doc?.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : doc?.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {DOC_STATUS_LABELS[doc?.status || "MISSING"]}
                      </span>
                    </div>
                    {doc?.note && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-3">
                        علت رد: {doc.note}
                      </div>
                    )}
                    {doc?.url ? (
                      <a href={doc.url} target="_blank" rel="noreferrer">
                        <img
                          src={doc.url}
                          alt={slot.label}
                          className="mb-4 max-h-40 rounded-lg border border-slate-200 object-contain bg-white"
                        />
                      </a>
                    ) : (
                      <div className="text-sm text-red-400 mb-4">تصویری آپلود نشده</div>
                    )}
                  </div>
                  {can("drivers.documents") && doc?.url && doc.status === "PENDING" && (
                    <div className="flex gap-2 mt-2">
                      <button
                        disabled={busy}
                        className="flex-1 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-40"
                        onClick={() => handleReview(doc, "APPROVED")}
                      >
                        {busy ? "در حال ثبت..." : "تأیید مدرک"}
                      </button>
                      <button
                        disabled={busy}
                        className="flex-1 bg-red-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-40"
                        onClick={() => {
                          setRejecting(open ? null : key);
                          setReason("");
                        }}
                      >
                        رد مدرک
                      </button>
                    </div>
                  )}
                  {open && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="دلیل رد مدرک (حداقل سه نویسه)"
                      />
                      <button
                        type="button"
                        className="w-full bg-red-600 text-white rounded-lg px-3 py-2 text-sm"
                        onClick={() => handleReview(doc, "REJECTED", reason)}
                      >
                        ارسال دلیل رد
                      </button>
                    </div>
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
