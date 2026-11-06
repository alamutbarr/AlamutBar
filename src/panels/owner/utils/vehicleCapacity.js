// ظرفیت ابعادی خودروها برای «ثبت بار جدید» در پنل صاحب کالا.
// منبع داده: shared/vehicleDimensions.json که خودش آینه‌ی بازه‌های فرم
// ثبت‌نام راننده (src/panels/driver/vehicleConfig.js) است؛ پس معیار ابعاد در
// پنل صاحب کالا و پنل راننده یکی است (مثلاً طول تریلی تا ۱۳٫۶۰ متر).
import VEHICLE_DIMENSIONS from '../../../../shared/vehicleDimensions.json';

// دسته‌های خودرو در مرحله ۹ فرم ثبت بار → کشنده‌ی معادل در ثبت‌نام راننده
const TRACTOR_BY_CATEGORY = {
  khavar911: 'khavar',
  single: 'single_truck',
  double: 'tandem_truck',
  flatbed: 'trailer',
};

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function foldLabel(value) {
  return String(value || '')
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\s\u200c\u200f\u200e]+/g, '')
    .trim();
}

// نام گزینه‌های مرحله «انتخاب نوع گاری» → کلید فنی همان گاری در ثبت‌نام راننده
const TRAILER_BY_LABEL = {
  روباز: 'open',
  بغلبازشو: 'side_open',
  مسقف: 'covered',
  مسقفاتاقبزرگ: 'covered_big',
  کمپرسی: 'dump',
  یخچالدار: 'refrigerated',
  کفی: 'flatbed',
  نیملبه: 'half_edge',
  لبهدار: 'edged',
  ترانزیتچادری: 'transit_tent',
  'تیغه(کانتینربر)': 'blade_container',
  کانتینربر: 'blade_container',
  کانتینر: 'container',
  کمرشکن: 'lowboy',
  بوژی: 'bogie',
};

function tractorsOf(tractor) {
  return VEHICLE_DIMENSIONS.tractors?.[tractor]?.trailers || {};
}

// گاری‌های ویژه (کمرشکن، کانتینر، تیغه، بوژی، کمپرسی) ابعاد غیرمعمول یا
// ثبت‌نشده دارند و معیار کلی دستهٔ «تریلی» را تعیین نمی‌کنند.
const SPECIAL_TRAILERS = new Set(['lowboy', 'container', 'blade_container', 'bogie', 'dump']);

function mergeCapacity(list) {
  const pick = (key) => list.reduce((max, item) => {
    const value = item?.[key];
    if (value == null) return max;
    return max == null ? value : Math.max(max, value);
  }, null);
  return { lengthCm: pick('lengthCm'), widthCm: pick('widthCm'), heightCm: pick('heightCm') };
}

/** بیشترین ظرفیت ابعادی یک دستهٔ خودرو (خاور/تک/جفت/تریلی) */
export function categoryCapacity(category) {
  const tractor = TRACTOR_BY_CATEGORY[category];
  if (!tractor) return null;
  const trailers = tractorsOf(tractor);
  const standard = Object.entries(trailers)
    .filter(([key]) => !SPECIAL_TRAILERS.has(key))
    .map(([, capacity]) => capacity);
  const list = standard.length ? standard : Object.values(trailers);
  if (!list.length) return null;
  return mergeCapacity(list);
}

/** ظرفیت ابعادی یک گاری مشخص؛ اگر شناسایی نشود، ظرفیت کل دسته برگردانده می‌شود */
export function variantCapacity(category, variantLabel) {
  const tractor = TRACTOR_BY_CATEGORY[category];
  if (!tractor) return null;
  const trailer = TRAILER_BY_LABEL[foldLabel(variantLabel)];
  const capacity = trailer ? tractorsOf(tractor)[trailer] : null;
  return capacity || categoryCapacity(category);
}

/** آیا ابعاد بار در ظرفیت اعلام‌شدهٔ خودرو جا می‌شود؟ (ابعاد بار به سانتی‌متر) */
export function cargoFitsCapacity(capacity, cargo = {}) {
  if (!capacity) return true;
  const checks = [
    ['lengthCm', cargo.length_cm],
    ['widthCm', cargo.width_cm],
    ['heightCm', cargo.height_cm],
  ];
  return checks.every(([key, raw]) => {
    const limit = capacity[key];
    if (limit == null) return true;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return true;
    return value <= limit;
  });
}

export function formatMeters(cm) {
  if (cm == null) return null;
  const meters = (cm / 100).toFixed(2).replace('.', '٫');
  return meters.replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

/** توضیح خوانا از ظرفیت ابعادی خودرو، برای نمایش کنار هر گزینه */
export function describeCapacity(capacity) {
  if (!capacity) return '';
  const parts = [];
  if (capacity.lengthCm != null) parts.push(`طول تا ${formatMeters(capacity.lengthCm)} متر`);
  if (capacity.widthCm != null) parts.push(`عرض تا ${formatMeters(capacity.widthCm)} متر`);
  if (capacity.heightCm != null) parts.push(`ارتفاع تا ${formatMeters(capacity.heightCm)} متر`);
  return parts.join(' · ');
}

export { VEHICLE_DIMENSIONS };
