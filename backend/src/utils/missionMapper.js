// backend/src/utils/missionMapper.js
//
// تبدیل یک ردیف واقعی Shipment (دیتابیس) به شکلی که پنل راننده (React) انتظار
// دارد. این مپینگ از driver/driverFormat.js و کامپوننت‌های MissionCard/
// DriverMissionDetail در فرانت‌اند پیروی می‌کند. فقط فیلدهایی که واقعاً مقدار
// دارند ساخته می‌شوند؛ فیلد موجود-نبودن => undefined (نه مقدار ساختگی).

function buildDimensions(d) {
  if (d.lengthCm == null || d.widthCm == null || d.heightCm == null) return undefined;
  const toMeters = (cm) => (Number(cm) / 100).toFixed(1).replace(/\.0$/, '');
  return `${toMeters(d.lengthCm)}×${toMeters(d.widthCm)}×${toMeters(d.heightCm)} متر`;
}

function toMissionDto(row) {
  const d = row.toJSON ? row.toJSON() : row;

  return {
    id: d.id,
    code: d.trackingCode,
    originCity: d.originCity || undefined,
    originArea: d.originArea || undefined,
    originLocation:
      d.originLat != null && d.originLng != null ? { lat: d.originLat, lng: d.originLng } : undefined,
    destCity: d.destCity || undefined,
    destArea: d.destArea || undefined,
    destExact: d.visibleDestinationExact
      ? { lat: d.destLat, lng: d.destLng, address: d.destAddress || undefined }
      : undefined,
    visibleDestinationExact: !!d.visibleDestinationExact,
    cargo: {
      type: d.cargoType || undefined,
      weightTons: d.weightKg != null ? Number(d.weightKg) / 1000 : undefined,
      dimensions: buildDimensions(d),
      value: d.cargoValue != null ? Number(d.cargoValue) : undefined,
      packing: d.cargoPacking || undefined,
      sensitive: !!d.cargoSensitive,
    },
    timeWindow: {
      pickupFrom: d.pickupFrom || undefined,
      pickupTo: d.pickupTo || undefined,
    },
    flag: d.flag || 'normal',
    status: d.status,
    vehicleTypeRequired: d.vehicleTypeRequired || undefined,
    price: d.price != null ? Number(d.price) : d.operatorPrice != null ? Number(d.operatorPrice) : undefined,
    offerExpiresAt: d.offerExpiresAt ? new Date(d.offerExpiresAt).toISOString() : undefined,
    routePlanned:
      d.distanceKm != null || d.estimatedHours != null
        ? { distanceKm: d.distanceKm != null ? Number(d.distanceKm) : undefined, estimatedHours: d.estimatedHours != null ? Number(d.estimatedHours) : undefined }
        : undefined,
    photosUploaded: d.photosUploaded ?? 0,
  };
}

module.exports = { toMissionDto };
