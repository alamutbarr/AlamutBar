// backend/scripts/seedFakeShipments.js
//
// بذر (Seed) بارهای آزمایشی برای تست فاصله‌ی جغرافیایی پنل راننده.
// این بارها با مختصات واقعی (مرکز شهرستان) و شناسه‌های واقعی شهرها (iranCities.json)
// ساخته می‌شوند تا دقیقاً از همان منطق «بارهای اطراف من» و «جست‌وجوی دستی» عبور کنند.
//
// اجرا:
//   node scripts/seedFakeShipments.js            -> درج بارهای آزمایشی (status=Offered)
//   node scripts/seedFakeShipments.js --clean    -> حذف بارهای آزمایشی قبلی و درج دوباره
//
// پیش‌نیاز: دیتابیس MariaDB در 127.0.0.1:3306 در حال اجرا باشد (پیکربندی .env).

const sequelize = require('../src/config/database');
// مدل‌ها باید از models/index بارگذاری شوند تا روابط (ownerId/driverId) نیز تعریف شوند؛
// در غیر این صورت جدول Shipments بدون ستون‌های کلید خارجی ساخته می‌شود.
const { Shipment, syncPromise } = require('../src/models');
const geo = require('../src/services/geoData');

const PREFIX = 'FAKE-';

// ---- حل‌کننده‌ی شهر از روی نام (با استفاده از همان منبع geoData که بک‌اند استفاده می‌کند) ----
const norm = (s) => String(s).replace(/\u200c/g, '').replace(/\s+/g, '').toLowerCase();

function resolveCity(name) {
  const hit = geo.CITIES.find((c) => norm(c.name) === norm(name));
  if (!hit) throw new Error(`شهر پیدا نشد: ${name}`);
  if (hit.lat == null || hit.lng == null) throw new Error(`شهر بدون مختصات: ${name}`);
  return {
    id: hit.id,
    name: hit.name,
    province: hit.province,
    provinceId: hit.provinceId,
    lat: hit.lat,
    lng: hit.lng,
  };
}

// ---- بارهای آزمایشی ----
// origin/dest با «نام شهر» مشخص می‌شوند تا شناسه و مختصات به‌صورت خودکار از داده‌های
// واقعی گرفته شود. دسته‌ها طوری چیده شده‌اند که همه‌ی باندهای شعاعی و مسافت‌های
// متفاوت (نزدیک/متوسط/دور) را پوشش دهند.
const CARGO_TYPES = [
  'مواد غذایی', 'مصالح ساختمانی', 'لوازم خانگی', 'پوشاک', 'قطعات خودرو',
  'ماشین‌آلات صنعتی', 'محصولات کشاورزی', 'دارو و تجهیزات پزشکی',
  'کاغذ و مقوا', 'الکترونیک', 'لوازم آرایشی و بهداشتی', 'پلاستیک و پلیمر',
];

const ROUTES = [
  // --- خوشه‌ی نزدیک در استان تهران: مبدأهای متفاوت با فاصله‌های کم و قابل‌تشخیص ---
  // (راننده‌ای که در تهران است، این بارها را در فاصله‌های ۰ تا ۱۱۳ کیلومتری می‌بیند
  //  و باندهای شعاعی ۵۰/۱۰۰/۲۰۰ کیلومتر به‌درستی پوشش داده می‌شوند)
  { origin: 'تهران',      dest: 'ری',        weight: 6000,  price: 8000000 },
  { origin: 'ری',         dest: 'تهران',     weight: 5500,  price: 7500000 },
  { origin: 'پردیس',      dest: 'تهران',     weight: 8000,  price: 9000000 },
  { origin: 'اسلامشهر',   dest: 'شهریار',    weight: 12000, price: 9500000 },
  { origin: 'پاکدشت',     dest: 'تهران',     weight: 9000,  price: 8500000 },
  { origin: 'قدس',        dest: 'تهران',     weight: 7000,  price: 8200000 },
  { origin: 'شهریار',     dest: 'تهران',     weight: 10000, price: 8800000 },
  { origin: 'ورامین',     dest: 'تهران',     weight: 11000, price: 10000000 },
  { origin: 'ملارد',      dest: 'تهران',     weight: 8500,  price: 8700000 },
  { origin: 'دماوند',     dest: 'تهران',     weight: 9500,  price: 9800000 },
  { origin: 'فیروزکوه',   dest: 'تهران',     weight: 13000, price: 14000000 },

  // --- مسافت‌های متوسط (خروج از تهران به استان‌های هم‌جوار) ---
  { origin: 'تهران',      dest: 'کرج',       weight: 15000, price: 11000000 },
  { origin: 'تهران',      dest: 'قم',        weight: 20000, price: 18000000 },
  { origin: 'تهران',      dest: 'قزوین',     weight: 18000, price: 16000000 },
  { origin: 'تهران',      dest: 'ساری',      weight: 14000, price: 26000000 },
  { origin: 'تهران',      dest: 'رشت',       weight: 16000, price: 25000000 },
  { origin: 'تهران',      dest: 'اراک',      weight: 22000, price: 22000000 },
  { origin: 'تهران',      dest: 'زنجان',     weight: 19000, price: 24000000 },
  { origin: 'تهران',      dest: 'اصفهان',    weight: 24000, price: 32000000 },

  // --- مسافت‌های دور ---
  { origin: 'تهران',      dest: 'تبریز',     weight: 21000, price: 42000000 },
  { origin: 'تهران',      dest: 'اهواز',     weight: 24000, price: 48000000 },
  { origin: 'تهران',      dest: 'شیراز',     weight: 24000, price: 52000000 },
  { origin: 'تهران',      dest: 'مشهد',      weight: 23000, price: 55000000 },
  { origin: 'تهران',      dest: 'زاهدان',    weight: 18000, price: 90000000 },

  // --- مبدأهای پراکنده در سطح کشور (برای «جست‌وجوی دستی» و تنوع جغرافیایی) ---
  { origin: 'مشهد',       dest: 'تهران',     weight: 22000, price: 56000000 },
  { origin: 'تبریز',      dest: 'ارومیه',    weight: 12000, price: 15000000 },
  { origin: 'شیراز',      dest: 'بوشهر',     weight: 15000, price: 20000000 },
  { origin: 'اصفهان',     dest: 'یزد',       weight: 17000, price: 23000000 },
  { origin: 'اهواز',      dest: 'کرمانشاه',  weight: 20000, price: 38000000 },
  { origin: 'رشت',        dest: 'گرگان',     weight: 13000, price: 30000000 },
  { origin: 'کرمان',      dest: 'یزد',       weight: 16000, price: 27000000 },
  { origin: 'سنندج',      dest: 'همدان',     weight: 10000, price: 14000000 },
  { origin: 'شهرکرد',     dest: 'قم',        weight: 14000, price: 21000000 },
  { origin: 'گرگان',      dest: 'ساری',      weight: 9000,  price: 12000000 },
  { origin: 'قشم',        dest: 'شیراز',     weight: 18000, price: 40000000 },
];

function buildShipment(route, i) {
  const o = resolveCity(route.origin);
  const d = resolveCity(route.dest);

  const distanceKm = Math.round(geo.haversineDistanceKm(o.lat, o.lng, d.lat, d.lng) * 10) / 10;
  const estimatedHours = Math.round((distanceKm / 70) * 10) / 10; // میانگین ۷۰ کیلومتر بر ساعت

  const cargoType = CARGO_TYPES[i % CARGO_TYPES.length];
  const weightKg = route.weight;
  const now = new Date();
  const loadingDate = new Date(now.getTime() + (i + 1) * 12 * 3600_000); // هر بار ۱۲ ساعت بعدتر
  const offerExpiresAt = new Date(now.getTime() + 48 * 3600_000);

  return {
    trackingCode: `${PREFIX}${String(i + 1).padStart(3, '0')}`,
    originCityId: o.id,
    originCity: o.name,
    originArea: `${o.name} - ناحیه صنعتی`,
    originLat: o.lat,
    originLng: o.lng,
    originAddress: `${o.name}، ورودی شهرک صنعتی، سوله شماره ${(i % 9) + 1}`,
    destCityId: d.id,
    destCity: d.name,
    destArea: `${d.name} - مرکز شهر`,
    destLat: d.lat,
    destLng: d.lng,
    destAddress: `${d.name}، خیابان اصلی، انبار مرکزی ${(i % 7) + 1}`,
    visibleDestinationExact: false,
    cargoType,
    cargoDetails: `${cargoType} - محموله آزمایشی شماره ${i + 1}`,
    weightKg,
    lengthCm: 600 + (i % 5) * 150,
    widthCm: 240,
    heightCm: 280,
    cargoValue: weightKg * 150000, // ارزش تقریبی
    cargoPacking: i % 3 === 0 ? 'پالت' : i % 3 === 1 ? 'بسته‌بندی کارتنی' : 'فله',
    cargoSensitive: i % 5 === 0,
    loadingDate,
    pickupFrom: '08:00',
    pickupTo: '18:00',
    vehicleTypeRequired: ['trailer', 'truck', 'khavar'][i % 3],
    vehicleVariants: null,
    loadingMethod: 'جرثقیل و لیفتراک',
    proposedPrice: route.price,
    operatorPrice: route.price,
    price: route.price,
    flag: i % 7 === 0 ? 'urgent' : i % 5 === 0 ? 'sensitive' : 'normal',
    status: 'Offered',
    offerExpiresAt,
    distanceKm,
    estimatedHours,
    photosUploaded: 0,
  };
}

async function main() {
  await sequelize.authenticate();
  // منتظر تکمیل همگام‌سازی مدل‌ها بمان (نه یک sync دوم که باعث race و خطای FK می‌شود)
  await syncPromise;

  // حذف بارهای آزمایشی قبلی برای درج تمیز (و جلوگیری از تکرار کد رهگیری)
  const deleted = await Shipment.destroy({ where: { trackingCode: { [require('sequelize').Op.startsWith]: PREFIX } } });
  if (deleted > 0) console.log(`🗑  ${deleted} بار آزمایشی قبلی حذف شد.`);

  const rows = ROUTES.map(buildShipment);
  await Shipment.bulkCreate(rows);
  await sequelize.close();

  console.log(`\n✅ ${rows.length} بار آزمایشی با موفقیت درج شد (status=Offered):\n`);
  console.log('ردیف | کد رهگیری | مبدأ (استان) → مقصد (استان) | مسافت مسیر');
  console.log('-----|-----------|------------------------------|-----------');
  rows.forEach((r, idx) => {
    const o = geo.getCityById(r.originCityId);
    const d = geo.getCityById(r.destCityId);
    console.log(
      `${String(idx + 1).padStart(4)} | ${r.trackingCode} | ` +
      `${o.name}(${o.province}) → ${d.name}(${d.province}) | ${r.distanceKm} km`,
    );
  });
}

// هشدار: شناسه‌های عددی شهرها از جنس BIGINT هستند و نباید به Number ساده تبدیل شوند؛
// در بدنه‌ی رکوردها originCityId/destCityId همان شناسه‌ی خام (string/number بزرگ) حفظ می‌شود.

main().catch((err) => {
  console.error('❌ خطا در ساخت بارهای آزمایشی:', err.message || err);
  process.exit(1);
});
