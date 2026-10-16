import { MissionCard } from "@/driver/components/MissionCard";
import { GpsBadge } from "@/driver/components/GpsBadge";
import { SosButton } from "@/driver/components/SosButton";
import {
  isMissionActive,
  isOffered,
} from "@/driver/driverFormat";
import {
  Package,
  CheckCircle2,
  ChevronLeft,
  Star,
  Bell,
  XCircle,
  Loader2,
} from "lucide-react";

export function DriverDashboard({
  driver,
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

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Greeting */}
      <div className="anim-text flex items-center justify-between">
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
          index={0}
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
          index={1}
          icon={<Bell className="w-5 h-5" />}
          label="پیشنهادها"
          value={new Intl.NumberFormat("fa-IR").format(offeredMissions.length)}
          color="amber"
        />
        <StatCard
          index={2}
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="تکمیل‌شده"
          value={new Intl.NumberFormat("fa-IR").format(completedCount)}
          color="green"
        />
        <StatCard
          index={3}
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
        <div className="anim-text d-2 space-y-3">
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
          {activeMissions.map((m, index) => (
            <div key={m.id} className="anim-text" style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}>
              <MissionCard mission={m} onClick={() => onMissionClick(m)} />
            </div>
          ))}
        </div>
      )}

      {/* Offered missions */}
      {offeredMissions.length > 0 && (
        <div className="anim-text d-3 space-y-3">
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
          {offeredMissions.map((m, index) => (
            <div key={m.id} className="anim-text" style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}>
              <MissionCard mission={m} onClick={() => onMissionClick(m)} />
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="glass-card anim-text d-4 rounded-2xl p-4">
        <h4 className="text-sm font-bold text-slate-800 mb-3">
          اقدامات سریع
        </h4>
        <div className="space-y-2">
          <button
            onClick={() => onNavigate("missions")}
            className="w-full flex items-center justify-between rounded-xl border border-white/60 bg-white/55 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-white/80"
          >
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              مشاهده مأموریت‌ها
            </span>
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
          <div className="pt-1">
            <SosButton />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, index = 0 }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div
      className="glass-card anim-text flex flex-col justify-between rounded-2xl p-4"
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
    >
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
