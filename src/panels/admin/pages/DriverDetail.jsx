import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { api } from "../api";
import { useAdmin } from "../auth";
import { DRIVER_STATUS_LABELS, WORKFLOW_LABELS, money, when } from "../format";
import { describeVehicle } from "../../driver/vehicleConfig";
import OwnerDocuments from "../components/OwnerDocuments";

const VERIFY_LABELS = {
  VERIFIED: "تأیید شده",
  PENDING_VERIFICATION: "در انتظار تأیید",
  REJECTED: "رد شده",
};

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
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">احراز هویت راننده</h2>
          <p className="text-xs text-slate-500 mt-1">
            همان مدارکی که راننده در پنل خود بارگذاری کرده است. یکی از دو مدرک کافی است: شناسنامه یا کارت ملی.
          </p>
        </div>
        <div className="p-6">
          <OwnerDocuments
            owner={{ id: driver.id, kyc: driver.kyc }}
            canReview={can("drivers.documents")}
            reviewUrl={`/drivers/${id}/documents/review`}
            emptyWithType="مدرکی برای این راننده ثبت نشده است."
            emptyWithoutType="راننده هنوز نوع مدرک شناسایی (شناسنامه یا کارت ملی) را انتخاب نکرده است."
            lockedLabel="این تصویر تأیید شده و دیگر از پنل راننده قابل تغییر نیست."
            onReviewed={() => load().catch((err) => setError(err.message))}
          />
        </div>
      </div>
    </div>
  );
}
