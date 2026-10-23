const { VehicleType } = require('../models');

// موتور تطبیق ساده: خودروهایی که ظرفیت وزن و ابعاد کافی دارند را برمی‌گرداند
// (معادل «مرحله ۹: موتور تطبیق هوشمند» در فلوچارت)
async function findSuitableVehicles({ weightKg, lengthCm, widthCm, heightCm }) {
  const vehicles = await VehicleType.findAll({ where: { is_active: true } });

  return vehicles.filter((v) => {
    if (v.max_weight_kg < weightKg) return false;
    if (lengthCm && v.max_length_cm && v.max_length_cm < lengthCm) return false;
    if (widthCm && v.max_width_cm && v.max_width_cm < widthCm) return false;
    if (heightCm && v.max_height_cm && v.max_height_cm < heightCm) return false;
    return true;
  });
}

async function isVehicleSuitable(vehicleTypeId, params) {
  const suitable = await findSuitableVehicles(params);
  return suitable.some((v) => v.id === vehicleTypeId);
}

module.exports = { findSuitableVehicles, isVehicleSuitable };
