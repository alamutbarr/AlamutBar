// backend/src/services/geoData.js
//
// منبع اصلی و تنها منبع اطلاعات شهرها/استان‌های ایران برای کل بک‌اند.
// داده‌ها از فایل‌های backend/src/data/iran*.json خوانده می‌شوند (بدون هیچ هاردکد
// یا داده‌ی نمونه). این فایل‌ها از مخزن رسمی sajaddp/list-of-cities-in-Iran گرفته
// شده‌اند: iranCities.json (1672 شهر)، iranProvinces.json (31 استان) و
// iranCountyCenters.json (مختصات جغرافیایی مرکز هر شهرستان - منبع geonames).
//
// نکته‌ی مهم درباره‌ی دقت مکانی:
// این مجموعه داده مختصات دقیق هر شهر را ندارد؛ تنها مختصات "مرکز شهرستان"
// (county center) موجود است. بنابراین مختصاتی که اینجا به هر شهر نسبت داده
// می‌شود، مختصات تقریبیِ مرکز شهرستانِ آن شهر است، نه مختصات دقیق خود شهر.
// این تقریب برای شهرهای بزرگ (مرکز شهرستان) دقیق و برای شهرهای کوچک‌تر در
// همان شهرستان با خطای چند تا چند-ده کیلومتر همراه است. در گزارش نهایی این
// محدودیت باید به‌صراحت ذکر شود.

const path = require('path');

const citiesRaw = require(path.join(__dirname, '../geo/iranCities.json'));
const provincesRaw = require(path.join(__dirname, '../geo/iranProvinces.json'));
const countyCentersRaw = require(path.join(__dirname, '../geo/iranCountyCenters.json'));

// نگاشت province_id -> نام استان
const provinceNameById = new Map(provincesRaw.map((p) => [p.id, p.name]));

// نگاشت county_id -> {lat, lng} (مرکز شهرستان)
const countyCenterById = new Map(
  countyCentersRaw.map((c) => [c.county_id, { lat: c.latitude, lng: c.longitude }]),
);

// ---- نرمال‌سازی نام شهرها ----
// ۱) تبدیل ارقام فارسی/عربی به انگلیسی، ۲) حذف نیم‌فاصله، ۳) یکسان‌سازی فاصله‌ها،
// ۴) حذف عدد انتهایی که نشان‌دهنده‌ی «منطقه‌ی شهرداری» است (مثلاً «تبریز 1» → «تبریز»).
// هدف: حذف ورودی‌های تکراریِ مناطق شهری از فهرست شهرها.

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function toEnglishDigits(str) {
  return String(str)
    .split('')
    .map((ch) => {
      const i = FA_DIGITS.indexOf(ch);
      if (i >= 0) return String(i);
      const j = AR_DIGITS.indexOf(ch);
      if (j >= 0) return String(j);
      return ch;
    })
    .join('');
}

function cleanCityName(raw) {
  if (!raw) return '';
  return toEnglishDigits(raw)
    .replace(/\u200c/g, '') // نیم‌فاصله («اسلام‌شهر» → «اسلامشهر»)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*\d+\s*$/, '') // حذف عدد انتهایی («تبریز 1» → «تبریز»)
    .trim();
}

// حذف ورودی‌های تکراری: کلید یکتا = نام تمیز‌شده (بدون فاصله) + استان.
// اگر ورودیِ پایه (بدون عدد) وجود داشته باشد، همان حفظ می‌شود و ورودی‌های
// شماره‌دارِ همان شهر («تبریز 1» تا «تبریز 10») حذف می‌شوند. در نبودِ ورودیِ
// پایه، اولین ورودی نگه داشته می‌شود تا هیچ شهری از فهرست حذف نشود.
const dedupedCities = new Map();
for (const c of citiesRaw) {
  const name = cleanCityName(c.name);
  if (!name) continue;
  const key = `${name.replace(/\s+/g, '')}||${c.province_id}`;
  const isBase = !/\d/.test(toEnglishDigits(c.name)); // نام بدون عدد انتهایی
  const existing = dedupedCities.get(key);
  if (!existing) {
    dedupedCities.set(key, { record: c, name, isBase });
  } else if (isBase && !existing.isBase) {
    dedupedCities.set(key, { record: c, name, isBase });
  }
}

// شمارش تکرار نام تمیز‌شده در کل کشور، برای تشخیص شهرهای هم‌نام (در استان‌های متفاوت)
const nameCounts = new Map();
for (const { name } of dedupedCities.values()) {
  nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
}

// فهرست نهایی و غنی‌شده‌ی شهرها: هر رکورد شامل مختصات تقریبی (از مرکز شهرستان)
// و نام استان (از province_id) است. اطلاعات اصلی فایل منبع (id, name, slug,
// province_id, county_id, district_id) حفظ می‌شود؛ فقط ورودی‌های تکراریِ مناطق
// شهری شماره‌دار حذف می‌شوند.
const CITIES = [...dedupedCities.values()].map(({ record: c, name }) => {
  const center = countyCenterById.get(c.county_id) || null;
  const province = provinceNameById.get(c.province_id) || null;
  return {
    id: c.id,
    name,
    slug: name.replace(/\s+/g, '-'),
    provinceId: c.province_id,
    province,
    countyId: c.county_id,
    districtId: c.district_id,
    // مختصات تقریبی گرفته‌شده از مرکز شهرستان (county center) - نه مختصات دقیق شهر
    lat: center ? center.lat : null,
    lng: center ? center.lng : null,
    isDuplicateName: (nameCounts.get(name) || 0) > 1,
  };
});

const CITY_BY_ID = new Map(CITIES.map((c) => [c.id, c]));

const PROVINCES = provincesRaw
  .map((p) => ({ id: p.id, name: p.name, slug: p.slug }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fa'));

const PROVINCE_NAMES = PROVINCES.map((p) => p.name);

/**
 * نرمال‌سازی رشته‌ی فارسی برای جست‌وجو: یکسان‌سازی برخی اشکال نویسه‌ای رایج
 * (ی/ي، ک/ك، فاصله‌ی نیم‌فاصله) بدون ادغام کلمات متفاوت یا تغییر معنای آن‌ها.
 */
function normalizePersian(str) {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .replace(/\u200c/g, '') // نیم‌فاصله -> حذف (فقط برای جست‌وجو)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, '') // حذف فاصله‌ها: جست‌وجوی بی‌حساسیت به فاصله («بندرعباس» = «بندر عباس»)
    .toLowerCase();
}

/**
 * جست‌وجوی ترکیبی روی استان‌ها و شهرها بر اساس یک عبارت متنی.
 * - اگر query خالی باشد: فقط فهرست استان‌ها برگردانده می‌شود (رفتار اولیه‌ی Dropdown).
 * - اگر query داشته باشد: استان‌ها و شهرهای منطبق (startsWith/includes) برگردانده می‌شوند.
 * خروجی به دو گروه provinces/cities تفکیک می‌شود تا UI بتواند تفاوت را واضح نشان دهد.
 */
function searchLocations(query, { limit = 30 } = {}) {
  const q = normalizePersian(query);

  if (!q) {
    // در حالت بدون تایپ، کل فهرست استان‌ها (۳۱ مورد) نمایش داده می‌شود؛
    // Dropdown با ارتفاع محدود و اسکرول داخلی در UI این موضوع را مدیریت می‌کند.
    return {
      provinces: PROVINCES,
      cities: [],
    };
  }

  const matchedProvinces = PROVINCES.filter((p) => normalizePersian(p.name).includes(q)).slice(
    0,
    limit,
  );

  const matchedCities = CITIES.filter((c) => normalizePersian(c.name).includes(q))
    .sort((a, b) => {
      // اول نام‌هایی که با عبارت شروع می‌شوند، و بین آن‌ها نام کوتاه‌تر
      // (با تایپ «مش» شهر «مشهد» بالای «مشراگه» می‌آید)
      const an = normalizePersian(a.name);
      const bn = normalizePersian(b.name);
      const aStarts = an.startsWith(q) ? 0 : 1;
      const bStarts = bn.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      if (an.length !== bn.length) return an.length - bn.length;
      return an.localeCompare(bn, 'fa');
    })
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      name: c.name,
      province: c.province,
      provinceId: c.provinceId,
      isDuplicateName: c.isDuplicateName,
      displayName: `${c.name} — استان ${c.province}`,
    }));

  return { provinces: matchedProvinces, cities: matchedCities };
}

function getProvinces() {
  return PROVINCES;
}

function getCityById(cityId) {
  return CITY_BY_ID.get(Number(cityId)) || null;
}

function getProvinceByName(name) {
  if (!name) return null;
  const n = normalizePersian(name);
  return PROVINCES.find((p) => normalizePersian(p.name) === n) || null;
}

/**
 * فاصله‌ی ژئودزیک (کیلومتر) بین دو نقطه با فرمول Haversine.
 */
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null || Number.isNaN(Number(v)))) {
    return null;
  }
  const R = 6371; // شعاع متوسط زمین به کیلومتر
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * بر اساس مختصات GPS، نزدیک‌ترین شهر (و در نتیجه استانِ آن) را پیدا می‌کند.
 * این تابع صرفاً برای "تعیین استان فعلی راننده از روی GPS بدون نیاز به
 * Reverse Geocoding خارجی" استفاده می‌شود؛ دقتش به چگالی شهرهای اطراف نقطه
 * بستگی دارد (در شهرهای پرتراکم دقت بالا، در مناطق کم‌تراکم دقت کمتر).
 */
function findNearestProvinceByCoords(lat, lng) {
  if (lat == null || lng == null) return null;
  let best = null;
  let bestDist = Infinity;
  for (const c of CITIES) {
    if (c.lat == null || c.lng == null) continue;
    const d = haversineDistanceKm(lat, lng, c.lat, c.lng);
    if (d != null && d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  if (!best) return null;
  return {
    province: best.province,
    provinceId: best.provinceId,
    nearestCity: best.name,
    distanceKm: Math.round(bestDist * 10) / 10,
  };
}

module.exports = {
  CITIES,
  PROVINCES,
  PROVINCE_NAMES,
  normalizePersian,
  searchLocations,
  getProvinces,
  getCityById,
  getProvinceByName,
  haversineDistanceKm,
  findNearestProvinceByCoords,
};
