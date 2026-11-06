const STATUS_MAP = {
  pending_review: { label: 'در انتظار بررسی', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  rejected: { label: 'رد شده', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  price_proposed: { label: 'منتظر تأیید قیمت', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  searching_driver: { label: 'در حال یافتن راننده', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  driver_assigned: { label: 'راننده تعیین شد', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  at_pickup: { label: 'راننده در مبدأ', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  in_transit: { label: 'در حال حمل', dot: 'bg-ink-500', text: 'text-ink-700', bg: 'bg-ink-50' },
  delivered: { label: 'تحویل داده شد', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  completed: { label: 'تکمیل‌شده', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  cancelled: { label: 'لغو شده', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  on_hold: { label: 'متوقف به‌خاطر بازرسی', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending_review;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
