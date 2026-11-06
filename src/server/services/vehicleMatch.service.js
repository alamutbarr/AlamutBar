const { VehicleType } = require('../models');
const { resolveTractor } = require('./vehicleOfferMatch');
const VEHICLE_DIMENSIONS = require('../../../shared/vehicleDimensions.json');

// گاری‌های ویژه معیار کلی دسته را تعیین نمی‌کنند (مثل پنل صاحب کالا)
const SPECIAL_TRAILERS = new Set(['lowboy', 'container', 'blade_container', 'bogie', 'dump']);

// ظرفیت ابعادی اعلام‌شده در فرم ثبت‌نام راننده برای هر دسته خودرو
function categoryCapacity(tractor) {
  const trailersAll = VEHICLE_DIMENSIONS.tractors?.[tractor]?.trailers || {};
  const standard = Object.entries(trailersAll)
    .filter(([key]) => !SPECIAL_TRAILERS.has(key))
    .map(([, capacity]) => capacity);
  const trailers = standard.length ? standard : Object.values(trailersAll);
  if (!trailers.length) return null;
  const pick = (key) => trailers.reduce((max, item) => {
    const value = item?.[key];
    if (value == null) return max;
    return max == null ? value : Math.max(max, value);
  }, null);
  return { lengthCm: pick('lengthCm'), widthCm: pick('widthCm'), heightCm: pick('heightCm') };
}

// ابعاد مجاز خودرو: اول معیار ثبت‌نام راننده، بعد مقادیر دیتابیس
function effectiveLimits(vehicle) {
  const capacity = categoryCapacity(resolveTractor(vehicle.title));
  return {
    lengthCm: capacity?.lengthCm ?? vehicle.max_length_cm ?? null,
    widthCm: capacity?.widthCm ?? vehicle.max_width_cm ?? null,
    heightCm: capacity?.heightCm ?? vehicle.max_height_cm ?? null,
  };
}

// موتور تطبیق ساده: خودروهایی که ظرفیت وزن و ابعاد کافی دارند را برمی‌گرداند
// (معادل «مرحله ۹: موتور تطبیق هوشمند» در فلوچارت)
async function findSuitableVehicles({ weightKg, lengthCm, widthCm, heightCm }) {
  const vehicles = await VehicleType.findAll({ where: { is_active: true } });

  return vehicles.filter((v) => {
    if (v.max_weight_kg < weightKg) return false;
    const limits = effectiveLimits(v);
    if (lengthCm && limits.lengthCm && limits.lengthCm < lengthCm) return false;
    if (widthCm && limits.widthCm && limits.widthCm < widthCm) return false;
    if (heightCm && limits.heightCm && limits.heightCm < heightCm) return false;
    return true;
  });
}

async function isVehicleSuitable(vehicleTypeId, params) {
  const suitable = await findSuitableVehicles(params);
  return suitable.some((v) => v.id === vehicleTypeId);
}

module.exports = { findSuitableVehicles, isVehicleSuitable, effectiveLimits, categoryCapacity };
