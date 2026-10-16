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

const MAX_RADIUS_KM = 100;

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
 * فیلتر «بارهای اطراف من»: محموله‌هایی که مبدأ (originLat/originLng) آن‌ها
 * در شعاع حداکثر ۱۰۰ کیلومتری نقطه‌ی راننده قرار دارد. اگر destProvinceName
 * داده شود، فقط محموله‌هایی که استان مقصدشان با آن یکسان است نگه داشته می‌شوند.
 * خروجی هر مورد همراه با distanceKm (فاصله‌ی واقعی تا راننده) است.
 */
function filterNearbyMissions(shipments, { driverLat, driverLng, destProvinceName, maxRadiusKm = MAX_RADIUS_KM }) {
  const results = [];

  for (const shipment of shipments) {
    if (shipment.originLat == null || shipment.originLng == null) continue; // بدون مختصات معتبر، قابل‌فیلتر نیست

    const distanceKm = haversineDistanceKm(driverLat, driverLng, shipment.originLat, shipment.originLng);
    if (distanceKm == null || distanceKm > maxRadiusKm) continue;

    if (destProvinceName) {
      const { destProvince } = resolveShipmentProvinces(shipment);
      if (!destProvince || destProvince !== destProvinceName) continue;
    }

    results.push({ shipment, distanceKm: Math.round(distanceKm * 10) / 10 });
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
  MAX_RADIUS_KM,
  resolveShipmentProvinces,
  filterNearbyMissions,
  filterMissionsByRoute,
};
