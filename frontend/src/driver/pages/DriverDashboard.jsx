import { MissionCard } from "@/driver/components/MissionCard";
import { GpsBadge } from "@/driver/components/GpsBadge";
import { SosButton } from "@/driver/components/SosButton";
import {
  formatWeight,
  isMissionActive,
  isOffered,
} from "@/driver/driverFormat";
import {
  Package,
  CheckCircle2,
  ChevronLeft,
  Star,
  Truck,
  Bell,
  XCircle,
  Loader2,
} from "lucide-react";

export function DriverDashboard({
  driver,
  vehicles,
  missions,
  gpsStatus,
  onNavigate,
  onMissionClick,
}) {
  // جلوگیری از کرش کردن در زمان بارگذاری (اگر missions مقداردهی نشده باشد)
  const activeMissions = missions ? missions.filter(isMissionActive) : [];
  const offeredMissions = missions ? missions.filter(isOffered) : [];
  const completedCount = missions
    ? missions.filter((m) => m.status === "Completed").length
    : 0;
  const activeVehicle = vehicles ? vehicles.find((v) => v.active) : null;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            سلام، {driver?.name?.split(" ")[0] || "راننده"}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {offeredMissions.length > 0
              ? `${new Intl.NumberFormat("fa-IR").format(offeredMissions.length)} پیشنهاد منتظر شماست`
              : "پیشنهاد جدیدی وجود ندارد"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GpsBadge status={gpsStatus} />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="مأموریت فعال"
          value={
            !missions ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            ) : activeMissions.length > 0 ? (
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            ) : (
              <XCircle className="w-7 h-7 text-rose-500" />
            )
          }
          color="blue"
        />
        <StatCard
          icon={<Bell className="w-5 h-5" />}
          label="پیشنهادها"
          value={new Intl.NumberFormat("fa-IR").format(offeredMissions.length)}
          color="amber"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="تکمیل‌شده"
          value={new Intl.NumberFormat("fa-IR").format(completedCount)}
          color="green"
        />
        <StatCard
          icon={<Star className="w-5 h-5" />}
          label="امتیاز شما"
          value={new Intl.NumberFormat("fa-IR", {
            minimumFractionDigits: 1,
          }).format(driver?.rating || 0)}
          color="violet"
        />
      </div>

      {/* Active mission summary */}
      {activeMissions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">
              مأموریت‌های فعال
            </h3>
            <button
              onClick={() => onNavigate("missions")}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              همه
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          {activeMissions.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              onClick={() => onMissionClick(m)}
            />
          ))}
        </div>
      )}

      {/* Offered missions */}
      {offeredMissions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">پیشنهادها</h3>
            <button
              onClick={() => onNavigate("missions")}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              همه
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          {offeredMissions.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              onClick={() => onMissionClick(m)}
            />
          ))}
        </div>
      )}

      {/* Vehicle & Quick info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeVehicle && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {activeVehicle.typeName}
                </h4>
                <p className="text-xs text-slate-500" dir="ltr">
                  {activeVehicle.plate}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <InfoRow
                label="ظرفیت"
                value={formatWeight(activeVehicle.capacityTons)}
              />
              <InfoRow
                label="حجم"
                value={`${new Intl.NumberFormat("fa-IR").format(activeVehicle.volumeM3)} م³`}
              />
              <InfoRow
                label="محور"
                value={`${new Intl.NumberFormat("fa-IR").format(activeVehicle.techSpec.axleCount)} محور`}
              />
              <InfoRow
                label="سال"
                value={new Intl.NumberFormat("fa-IR").format(
                  activeVehicle.techSpec.year,
                )}
              />
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-3">
            اقدامات سریع
          </h4>
          <div className="space-y-2">
            <button
              onClick={() => onNavigate("missions")}
              className="w-full flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                مشاهده مأموریت‌ها
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => onNavigate("vehicles")}
              className="w-full flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-500" />
                مدیریت خودروها
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <div className="pt-1">
              <SosButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
      <div
        className={`inline-flex items-center justify-center rounded-xl ${colors[color] || colors.blue} p-2 mb-2 self-start`}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-800 tabular-nums min-h-[32px] flex items-center">
        {value}
      </div>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}
