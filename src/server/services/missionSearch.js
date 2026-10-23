// backend/src/services/missionSearch.js
//
// منطق فیلتر جغرافیایی بارها (مأموریت‌ها/پیشنهادها) برای دو روش جست‌وجوی
// پنل راننده: "بارهای اطراف من" (بر پایه‌ی GPS و شعاع ۱۰۰ کیلومتری) و
// "جست‌وجوی دستی" (بر پایه‌ی مبدأ/مقصد انتخابی از فهرست شهرها/استان‌ها).
//
// این فایل عمداً مستقل از Express نوشته شده تا هم در routes/driver.js و هم
// در هر مسیر دیگری (داشبورد، مأموریت‌ها، پیشنهادها) قابل استفاده‌ی مجدد باشد
// و منطق فیلتر یک‌بار نوشته و در همه‌جا یکسان اجرا شود.

const { haversineDistanceKm, getCityById } = require('./geoData');

// باندهای شعاع برای نمایش پلکانیِ «بارهای اطراف من»:
// ابتدا نزدیک‌ترین بارها (تا ۵۰ کیلومتر)، سپس ۱۰۰، ۲۰۰ و ... تا پوشش کل استان.
const RADIUS_BANDS = [50, 100, 200, 400, 800, 1600];

/**
 * کوچک‌ترین باند شعاعی که فاصله‌ی داده‌شده در آن می‌گنجد.
 * مثال: ۳۰km -> 50 ، ۶۰km -> 100 ، ۲۵۰km -> 400.
 */
function radiusBandForKm(km) {
  for (const band of RADIUS_BANDS) {
    if (km <= band) return band;
  }
  return RADIUS_BANDS[RADIUS_BANDS.length - 1];
}

/**
 * استان مبدأ/مقصد یک محموله را از روی شناسه‌ی شهر (originCityId/destCityId)
 * به‌صورت derived محاسبه می‌کند؛ ستون تکراری «استان» در دیتابیس ساخته نمی‌شود.
 */
function resolveShipmentProvinces(shipment) {
  const originCity = shipment.originCityId != null ? getCityById(shipment.originCityId) : null;
  const destCity = shipment.destCityId != null ? getCityById(shipment.destCityId) : null;
  return {
    originCity,
    destCity,
    originProvince: originCity?.province || null,
    destProvince: destCity?.province || null,
  };
}

/**
 * فیلتر «بارهای اطراف من»: تمام بارهای استانِ راننده را از نزدیک‌ترین تا
 * دورترین مرتب می‌کند (نه محدود به یک شعاع ثابت). در صورت مشخص بودن
 * driverProvince، فقط بارهایی که استان مبدأشان همان استان راننده است نگه
 * داشته می‌شوند تا در نهایت «کل استان» پوشش داده شود. فیلتر اختیاری
 * destProvinceName استان مقصد را نیز محدود می‌کند.
 * خروجی هر مورد همراه با distanceKm (فاصله تا راننده) و bandKm (باند شعاعی) است.
 */
function filterNearbyMissions(shipments, { driverLat, driverLng, destProvinceName, driverProvince }) {
  const results = [];

  for (const shipment of shipments) {
    if (shipment.originLat == null || shipment.originLng == null) continue; // بدون مختصات معتبر، قابل‌فیلتر نیست

    const distanceKm = haversineDistanceKm(driverLat, driverLng, shipment.originLat, shipment.originLng);
    if (distanceKm == null) continue;

    const { originProvince, destProvince } = resolveShipmentProvinces(shipment);

    if (driverProvince && originProvince !== driverProvince) continue;
    if (destProvinceName && (!destProvince || destProvince !== destProvinceName)) continue;

    results.push({
      shipment,
      distanceKm: Math.round(distanceKm * 10) / 10,
      bandKm: radiusBandForKm(distanceKm),
    });
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results;
}

/**
 * فیلتر «جست‌وجوی دستی»: تطبیق محموله‌ها با مبدأ/مقصد انتخابی کاربر.
 * - اگر originCityId داده شود: باید دقیقاً با originCityId محموله یکسان باشد (شهر+استان).
 * - اگر فقط originProvinceId داده شود (بدون شهر): استان مبدأ محموله باید یکسان باشد.
 * - همین قاعده برای مقصد (destCityId / destProvinceId) تکرار می‌شود.
 * - مبدأ و مقصد هرگز جابه‌جا بررسی نمی‌شوند (مسیر معکوس معادل در نظر گرفته نمی‌شود).
 */
function filterMissionsByRoute(shipments, { originCityId, originProvinceId, destCityId, destProvinceId }) {
  const results = [];

  for (const shipment of shipments) {
    const { originProvince, destProvince } = resolveShipmentProvinces(shipment);

    if (originCityId != null) {
      if (String(shipment.originCityId) !== String(originCityId)) continue;
    } else if (originProvinceId != null) {
      const originCityRecord = shipment.originCityId != null ? getCityById(shipment.originCityId) : null;
      if (!originCityRecord || String(originCityRecord.provinceId) !== String(originProvinceId)) continue;
    }

    if (destCityId != null) {
      if (String(shipment.destCityId) !== String(destCityId)) continue;
    } else if (destProvinceId != null) {
      const destCityRecord = shipment.destCityId != null ? getCityById(shipment.destCityId) : null;
      if (!destCityRecord || String(destCityRecord.provinceId) !== String(destProvinceId)) continue;
    }

    results.push({ shipment, originProvince, destProvince });
  }

  return results;
}

module.exports = {
  RADIUS_BANDS,
  radiusBandForKm,
  resolveShipmentProvinces,
  filterNearbyMissions,
  filterMissionsByRoute,
};
