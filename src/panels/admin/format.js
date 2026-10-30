export const WORKFLOW_LABELS = {
  REQUEST_REGISTERED: 'ثبت درخواست',
  UNDER_REVIEW: 'بررسی و تطبیق',
  PRICE_ESTIMATED: 'قیمت اولیه',
  CUSTOMER_CONFIRMED: 'تأیید صاحب کالا',
  DRIVER_ASSIGNMENT: 'تأمین راننده',
  DRIVER_ACCEPTED: 'قبول مأموریت',
  EN_ROUTE_TO_LOADING: 'حرکت به بارگیری',
  AT_LOADING_INSPECTION: 'حضور و بازرسی',
  WAYBILL_ISSUED: 'صدور بارنامه',
  IN_TRANSIT: 'حمل و پیگیری',
  AT_DESTINATION_UNLOADING: 'رسیدن و تخلیه',
  COMPLETED: 'تکمیل مأموریت',
  CANCELLED: 'لغو شده',
  DRIVER_REPLACED: 'راننده جایگزین',
  ON_HOLD: 'متوقف',
};

export const DRIVER_STATUS_LABELS = {
  PENDING_VERIFICATION: 'در انتظار تأیید',
  VERIFIED: 'تأیید شده',
  REJECTED: 'رد شده',
  READY: 'آماده',
  BUSY: 'مشغول',
  OFFLINE: 'آفلاین',
};

export const ALERT_LABELS = {
  GPS_CUT: 'قطع GPS',
  ROUTE_DEVIATION: 'انحراف مسیر',
  DELAY: 'تأخیر اعزام',
  INSPECTOR_ABSENT: 'غیبت متصدی',
  OTHER: 'سایر',
};

export function toneOfStatus(status) {
  if (status === 'COMPLETED') return 'ok';
  if (status === 'CANCELLED') return 'crit';
  if (status === 'ON_HOLD' || status === 'DRIVER_REPLACED') return 'warn';
  if (['IN_TRANSIT', 'EN_ROUTE_TO_LOADING', 'AT_LOADING_INSPECTION', 'WAYBILL_ISSUED', 'AT_DESTINATION_UNLOADING', 'DRIVER_ACCEPTED'].includes(status)) return 'progress';
  return 'idle';
}

export function money(value) {
  if (value == null || value === '') return '—';
  return `${Number(value).toLocaleString('fa-IR')} تومان`;
}

export function when(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fa-IR');
}
