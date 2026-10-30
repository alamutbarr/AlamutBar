import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing } from 'lucide-react';
import { getMyNotifications, markNotificationAsRead } from '../../api/notification.api';
import { notificationPath } from '../../utils/notificationPath';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'همین الان';
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  return new Intl.DateTimeFormat('fa-IR').format(new Date(dateStr));
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getMyNotifications().then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleClick = async (n) => {
    if (!n.is_read) {
      await markNotificationAsRead(n.id).catch(() => {});
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, is_read: true } : i)));
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900">اعلان‌ها</h1>
        <p className="mt-1 text-sm text-ink-300">تازه‌ترین به‌روزرسانی‌های مربوط به بارهای شما</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-panel">
        {loading ? (
          <p className="px-5 py-14 text-center text-sm text-ink-300">در حال بارگذاری...</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-300">
              <Bell size={22} />
            </span>
            <p className="text-sm font-medium text-ink-700">فعلاً اعلانی نداری</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-50">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  to={notificationPath(n)}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 px-5 py-4 transition-colors hover:bg-ink-50/40 ${
                    !n.is_read ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <NotificationRow n={n} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NotificationRow({ n }) {
  return (
    <>
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        n.is_read ? 'bg-ink-50 text-ink-300' : 'bg-amber-50 text-amber-600'
      }`}>
        {n.is_read ? <Bell size={15} /> : <BellRing size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${n.is_read ? 'text-ink-700' : 'font-bold text-ink-900'}`}>{n.title}</p>
        <p className="mt-0.5 text-xs text-ink-400">{n.message}</p>
        <p className="tabular mt-1 text-[11px] text-ink-200">{timeAgo(n.createdAt)}</p>
      </div>
      {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
    </>
  );
}
