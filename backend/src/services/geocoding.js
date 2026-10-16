// backend/src/services/geocoding.js
//
// Reverse Geocoding واقعی برای تعیین استان راننده از روی مختصات GPS.
// وابستگی خارجی: سرویس رایگان Nominatim (OpenStreetMap) - همان سرویسی که
// از قبل در پروژه (owner-panel/frontend/src/components/common/LocationPicker.jsx)
// برای Reverse Geocoding استفاده شده است. بدون نیاز به API Key.
//
// محدودیت‌های شناخته‌شده (باید به کاربر/گزارش نهایی اعلام شود):
// - Nominatim سیاست Rate Limit دارد (حدود ۱ درخواست در ثانیه)، برای استفاده‌ی
//   سبک در یک پنل راننده مناسب است اما برای حجم بالا نیاز به کش/سرویس پولی دارد.
// - اگر سرویس خارجی در دسترس نباشد (قطعی شبکه، Timeout)، به‌عنوان fallback از
//   نزدیک‌ترین شهرِ موجود در دیتاست محلی برای تخمین استان استفاده می‌شود
//   (geoData.findNearestProvinceByCoords) - این یک تخمین مکانی واقعی بر پایه‌ی
//   فاصله‌ی جغرافیایی واقعی است، نه حدسی تصادفی؛ اما دقتش کمتر از Reverse
//   Geocoding رسمی است و باید به کاربر اعلام شود کدام روش استفاده شده.

const { findNearestProvinceByCoords, getProvinceByName } = require('./geoData');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const REQUEST_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * فراخوانی Nominatim برای گرفتن نام استان (state) از مختصات GPS.
 * در صورت خطا یا نبود state در پاسخ، null برمی‌گرداند (بدون حدس زدن).
 */
async function reverseGeocodeProvince(lat, lng) {
  const url = `${NOMINATIM_URL}?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(
    lng,
  )}&zoom=8&accept-language=fa`;

  const res = await fetchWithTimeout(url, {
    headers: {
      // Nominatim's usage policy requires a descriptive User-Agent.
      'User-Agent': 'XbarDriverPanel/1.0 (contact: support@xbar.local)',
    },
  });

  if (!res.ok) {
    throw new Error(`Nominatim reverse geocoding failed with HTTP ${res.status}`);
  }

  const data = await res.json();
  const rawProvinceName = data?.address?.state || data?.address?.province || null;
  if (!rawProvinceName) return null;

  // نام خام Nominatim ممکن است با پیشوند/پسوند استاندارد پروژه یکسان نباشد
  // (مثلاً "استان تهران" در برابر "تهران")؛ آن را به نام استانِ موجود در
  // دیتاست محلی نگاشت می‌کنیم تا بین دو منبع ناهماهنگی ایجاد نشود.
  const cleaned = rawProvinceName.replace(/^استان\s+/, '').trim();
  const matched = getProvinceByName(cleaned);
  return matched ? matched.name : cleaned;
}

/**
 * نقطه‌ی ورودی اصلی: تعیین استان راننده از مختصات GPS او.
 * خروجی شامل منبع تعیین استان است تا UI بتواند دقت/منبع را به کاربر نشان دهد.
 */
async function resolveDriverProvince(lat, lng) {
  if (lat == null || lng == null) {
    throw new Error('مختصات جغرافیایی ارسال نشده است.');
  }

  try {
    const province = await reverseGeocodeProvince(lat, lng);
    if (province) {
      return { province, source: 'nominatim', accuracy: 'administrative' };
    }
  } catch (error) {
    // شکست سرویس خارجی -> به fallback محلی می‌رویم؛ خطا را لاگ می‌کنیم اما
    // درخواست کاربر را fail نمی‌کنیم مگر اینکه fallback هم چیزی برنگرداند.
    console.warn('Nominatim reverse geocoding error:', error.message);
  }

  const fallback = findNearestProvinceByCoords(lat, lng);
  if (fallback) {
    return {
      province: fallback.province,
      source: 'nearest_city_fallback',
      accuracy: 'approximate',
      nearestCity: fallback.nearestCity,
      distanceKm: fallback.distanceKm,
    };
  }

  throw new Error('تعیین استان از روی موقعیت مکانی ممکن نشد.');
}

module.exports = { resolveDriverProvince, reverseGeocodeProvince };
