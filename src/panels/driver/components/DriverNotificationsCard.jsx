import { Bell, BellRing, ChevronLeft } from "lucide-react";

export function notificationTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "همین الان";
  if (mins < 60) return `${mins.toLocaleString("fa-IR")} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  return new Intl.DateTimeFormat("fa-IR").format(new Date(dateStr));
}

// بخش اعلان داشبورد راننده؛ هم‌ساختار با اعلان‌های پنل صاحب کالا
export function DriverNotificationsCard({
  notifications = [],
  loading = false,
  unread = 0,
  onOpenAll,
  onNotificationClick,
  onMarkAllRead,
}) {
  const latest = notifications.slice(0, 5);

  return (
    <section className="anim-text d-1 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {new Intl.NumberFormat("fa-IR").format(unread)}
              </span>
            )}
          </span>
          اعلان‌ها
        </h3>
        <div className="flex items-center gap-3">
          {unread > 0 && onMarkAllRead && (
            <button type="button" onClick={onMarkAllRead} className="text-xs font-medium text-slate-500 hover:text-[#087f8c]">
              خواندن همه
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAll}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            همه
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        {loading && latest.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">در حال دریافت اعلان‌ها...</p>
        ) : latest.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Bell size={18} />
            </span>
            <p className="text-sm font-medium text-slate-600">فعلاً اعلانی نداری</p>
            <p className="text-xs text-slate-400">هر تغییری در مأموریت‌ها و مدارک اینجا نمایش داده می‌شود.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {latest.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNotificationClick?.(item)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-right transition-colors hover:bg-slate-50 ${
                    item.isRead ? "" : "bg-amber-50/50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      item.isRead ? "bg-slate-100 text-slate-400" : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {item.isRead ? <Bell size={15} /> : <BellRing size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${item.isRead ? "text-slate-600" : "font-bold text-slate-800"}`}>{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-6 text-slate-500">{item.message}</p>
                    <p className="tabular mt-1 text-[11px] text-slate-400">{notificationTimeAgo(item.createdAt)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
