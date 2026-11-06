import { Bell, BellRing, CheckCheck } from "lucide-react";
import { LoadOfferActions, notificationTimeAgo } from "@/components/DriverNotificationsCard";

export function DriverNotifications({
  notifications = [],
  loading = false,
  onNotificationClick,
  onMarkAllRead,
  onAcceptOffer,
  onDeclineOffer,
  offerBusyId,
  unread = 0,
}) {
  return (
    <div className="w-full space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="panel-kicker">اعلان‌ها</p>
          <h1 className="text-xl font-bold text-slate-800">اعلان‌ها</h1>
          <p className="mt-1 text-sm text-slate-500">تازه‌ترین اتفاقات مأموریت‌ها، مدارک و حساب شما</p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-[#087f8c] hover:text-[#087f8c]"
          >
            <CheckCheck className="h-4 w-4" />
            خواندن همه ({new Intl.NumberFormat("fa-IR").format(unread)})
          </button>
        )}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        {loading && notifications.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-slate-400">در حال بارگذاری...</p>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Bell size={22} />
            </span>
            <p className="text-sm font-medium text-slate-600">فعلاً اعلانی نداری</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((item) => (
              <li key={item.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onNotificationClick?.(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onNotificationClick?.(item);
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-4 text-right transition-colors hover:bg-slate-50 ${
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
                    <p className="mt-0.5 text-xs leading-6 text-slate-500">{item.message}</p>
                    <p className="tabular mt-1 text-[11px] text-slate-400">{notificationTimeAgo(item.createdAt)}</p>
                    <LoadOfferActions
                      item={item}
                      busy={offerBusyId === item.id}
                      onAccept={onAcceptOffer}
                      onDecline={onDeclineOffer}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
