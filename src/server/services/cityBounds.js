const AppError = require('../utils/AppError');
const { haversineKm } = require('../admin/geo');
const { CITIES } = require('./geoData');

const CITY_RADIUS_KM = 60;

const byPair = new Map();
const byName = new Map();
for (const city of CITIES) {
  if (city.lat == null || city.lng == null) continue;
  byPair.set(`${city.name}\0${city.province || ''}`, city);
  if (!byName.has(city.name)) byName.set(city.name, city);
}

function centerOf(cityRow) {
  if (!cityRow) return null;
  const name = String(cityRow.name || '').trim();
  const province = String(cityRow.province || '').trim();
  return byPair.get(`${name}\0${province}`) || byName.get(name) || null;
}

function assertPinInCity(pin, cityRow, label) {
  if (!pin || pin.lat == null || pin.lng == null || pin.lat === '' || pin.lng === '') return;
  const center = centerOf(cityRow);
  if (!center) return;
  const km = haversineKm(
    { lat: Number(pin.lat), lng: Number(pin.lng) },
    { lat: Number(center.lat), lng: Number(center.lng) },
  );
  if (km == null || km > CITY_RADIUS_KM) {
    throw new AppError(`موقعیت ${label} با شهر «${cityRow.name}» هم‌خوان نیست.`, 400);
  }
}

module.exports = { CITY_RADIUS_KM, centerOf, assertPinInCity };
