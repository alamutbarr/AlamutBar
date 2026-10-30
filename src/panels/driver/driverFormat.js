export const missionStatusLabels = {
  Offered: 'پیشنهاد مأموریت',
  Accepted: 'قبول‌شده',
  EnRouteToPickup: 'در حرکت به بارگیری',
  ArrivedPickup: 'رسیده به بارگیری',
  LoadingChecks: 'در حال بارگیری',
  WaybillIssued: 'بارنامه صادر شد',
  InTransit: 'در مسیر',
  NearDestination: 'نزدیک مقصد',
  POD: 'تحویل بار',
  Completed: 'تکمیل‌شده',
  Declined: 'رد‌شده',
  Cancelled: 'لغوشده',
  OnHold: 'متوقف به‌خاطر بازرسی',
};

export const flagLabels = {
  normal: 'عادی',
  sensitive: 'حساس',
  urgent: 'اضطراری',
};

export const flagStyles = {
  normal: 'bg-slate-100 text-slate-700 border-slate-300',
  sensitive: 'bg-amber-50 text-amber-700 border-amber-300',
  urgent: 'bg-red-50 text-red-700 border-red-300',
};

export const vehicleTypeLabels = {
  truck: 'کامیون',
  trailer: 'تریلی',
  khavar: 'خاور',
  other: 'سایر',
};

export function formatPrice(toman) {
  if (toman == null) return '—';
  return new Intl.NumberFormat('fa-IR').format(toman) + ' تومان';
}

export function formatWeight(tons) {
  return new Intl.NumberFormat('fa-IR').format(tons) + ' تن';
}

const RANGE_LABELS = {
  '08:00-12:00': '۸ تا ۱۲',
  '12:00-16:00': '۱۲ تا ۱۶',
  '16:00-20:00': '۱۶ تا ۲۰',
  '20:00-24:00': '۲۰ تا ۲۴',
};

export function formatDay(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(y, m - 1, d));
}

export function formatDimensions(cargo) {
  if (!cargo) return '';
  const parts = [
    ['طول', cargo.lengthCm],
    ['عرض', cargo.widthCm],
    ['ارتفاع', cargo.heightCm],
  ].filter(([, value]) => value != null && Number(value) > 0);
  if (!parts.length) return cargo.dimensions || '';
  return `${parts
    .map(([name, value]) => `${name} ${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(Number(value) / 100)}`)
    .join(' × ')} متر`;
}

export function formatTimeWindow(timeWindow) {
  if (!timeWindow) return '';
  const ranges = Array.isArray(timeWindow.ranges) ? timeWindow.ranges : [];
  if (ranges.length) return ranges.map((range) => RANGE_LABELS[range] || range).join('، ');
  return [timeWindow.pickupFrom, timeWindow.pickupTo].filter(Boolean).join(' تا ');
}

export function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatTimeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (days > 0) return `${days} روز پیش`;
  if (hours > 0) return `${hours} ساعت پیش`;
  if (minutes > 0) return `${minutes} دقیقه پیش`;
  return 'همین حالا';
}

export function getTimeRemaining(iso) {
  if (!iso) return 0;
  return Math.max(0, new Date(iso).getTime() - Date.now());
}

export function isMissionActive(m) {
  return [
    'Accepted',
    'EnRouteToPickup',
    'ArrivedPickup',
    'LoadingChecks',
    'WaybillIssued',
    'InTransit',
    'NearDestination',
    'POD',
    'OnHold',
  ].includes(m.status);
}

export function isOffered(m) {
  return m.status === 'Offered';
}

export function isHistory(m) {
  return m.status === 'Completed' || m.status === 'Cancelled' || m.status === 'Declined';
}

export const MISSION_TABS = ['offered', 'active', 'history'];

export function missionTabFromQuery(value) {
  return MISSION_TABS.includes(value) ? value : 'offered';
}

export const statusOrder = [
  'Accepted',
  'EnRouteToPickup',
  'ArrivedPickup',
  'LoadingChecks',
  'WaybillIssued',
  'InTransit',
  'NearDestination',
  'POD',
  'Completed',
];

export function getStatusIndex(status) {
  const idx = statusOrder.indexOf(status);
  return idx === -1 ? 0 : idx;
}