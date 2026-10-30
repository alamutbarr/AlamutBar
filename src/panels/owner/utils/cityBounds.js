export const CITY_RADIUS_KM = 60;

export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const toRad = (value) => (value * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pinWithinCity(pin, city, radiusKm = CITY_RADIUS_KM) {
  if (!city || city.lat == null || city.lng == null) return true;
  if (pin?.lat == null || pin?.lng == null || pin.lat === '' || pin.lng === '') return false;
  const km = haversineKm(
    { lat: Number(pin.lat), lng: Number(pin.lng) },
    { lat: Number(city.lat), lng: Number(city.lng) },
  );
  return km != null && km <= radiusKm;
}

export function nearestCity(pin, cities, radiusKm = CITY_RADIUS_KM) {
  const ranked = [];
  for (const city of cities || []) {
    if (city?.lat == null || city?.lng == null) continue;
    const km = haversineKm(
      { lat: Number(pin.lat), lng: Number(pin.lng) },
      { lat: Number(city.lat), lng: Number(city.lng) },
    );
    if (km != null && km <= radiusKm) ranked.push({ city, km });
  }
  ranked.sort((a, b) => {
    if (Math.abs(a.km - b.km) > 0.5) return a.km - b.km;
    const aCapital = String(a.city.name || "").trim() === String(a.city.province || "").trim() ? 0 : 1;
    const bCapital = String(b.city.name || "").trim() === String(b.city.province || "").trim() ? 0 : 1;
    return aCapital - bCapital;
  });
  return ranked[0]?.city || null;
}

export function boundsAround(center, radiusKm = CITY_RADIUS_KM) {
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.cos((Number(center.lat) * Math.PI) / 180));
  return [
    [Number(center.lat) - latDelta, Number(center.lng) - lngDelta],
    [Number(center.lat) + latDelta, Number(center.lng) + lngDelta],
  ];
}
