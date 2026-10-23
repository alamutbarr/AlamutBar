import { IRAN_CITIES } from "./iranCities";

const pairKey = (name, province) =>
  `${String(name || "").trim()}\0${String(province || "").trim()}`;

/**
 * شناسهٔ دیتابیس را فقط وقتی روی فهرست محلی می‌گذارد که نام و استان یکی باشند.
 * شهرهای هم‌نام (مثل دو «مهر») نباید یک شناسهٔ مشترک بگیرند؛ وگرنه ردیف‌های
 * فهرست در ری‌اکت قاطی می‌شوند و جستجو شهر اشتباه نشان می‌دهد.
 */
export function mergeCityCatalog(apiCities) {
  if (!Array.isArray(apiCities) || apiCities.length === 0) return IRAN_CITIES;

  const byPair = new Map();
  const byName = new Map();

  for (const city of apiCities) {
    const name = String(city?.name || "").trim();
    const pair = pairKey(name, city?.province);
    if (!byPair.has(pair)) byPair.set(pair, city);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(city);
  }

  const localNameCount = new Map();
  for (const city of IRAN_CITIES) {
    const name = String(city?.name || "").trim();
    localNameCount.set(name, (localNameCount.get(name) || 0) + 1);
  }

  return IRAN_CITIES.map((city) => {
    const name = String(city?.name || "").trim();
    const paired = byPair.get(pairKey(name, city.province));
    if (paired) return { ...city, id: paired.id };

    const sameName = byName.get(name) || [];
    if (sameName.length === 1 && localNameCount.get(name) === 1) {
      return { ...city, id: sameName[0].id };
    }

    return city;
  });
}

export function cityOptionKey(city) {
  return `${city.id}|${city.name || ""}|${city.province || ""}`;
}
