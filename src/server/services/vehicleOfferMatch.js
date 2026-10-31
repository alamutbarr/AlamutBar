const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function fold(value) {
  return String(value || '')
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\s\u200c]+/g, '')
    .toLowerCase();
}

const TRACTOR_ALIASES = {
  khavar: ['khavar', 'خاور', 'خاور/911', '911'],
  single_truck: ['single_truck', 'کامیونتک'],
  tandem_truck: ['tandem_truck', 'کامیونجفت'],
  trailer: ['trailer', 'تریلی'],
};

const TRAILER_ALIASES = {
  open: ['open', 'روباز'],
  side_open: ['side_open', 'بغربازشو'],
  covered: ['covered', 'مسقف'],
  covered_big: ['covered_big', 'مسقفاتاقبزرگ'],
  dump: ['dump', 'کمپرسی'],
  refrigerated: ['refrigerated', 'یخچالدار'],
  flatbed: ['flatbed', 'کفی'],
  half_edge: ['half_edge', 'نیملبه'],
  edged: ['edged', 'لبهدار'],
  transit_tent: ['transit_tent', 'ترانزیتچادری'],
  blade_container: ['blade_container', 'تیغه(کانتینربر)', 'کانتینربر'],
  container: ['container', 'کانتینر'],
  lowboy: ['lowboy', 'کمرشکن'],
  bogie: ['bogie', 'بوژی'],
};

function resolveFromAliases(value, groups) {
  const token = fold(value);
  if (!token) return null;
  for (const [canonical, aliases] of Object.entries(groups)) {
    if (aliases.some((alias) => fold(alias) === token)) return canonical;
  }
  for (const [canonical, aliases] of Object.entries(groups)) {
    if (aliases.some((alias) => token.includes(fold(alias)) && fold(alias).length >= 3)) return canonical;
  }
  return null;
}

function resolveTractor(value) {
  return resolveFromAliases(value, TRACTOR_ALIASES);
}

function resolveTrailer(value) {
  return resolveFromAliases(value, TRAILER_ALIASES);
}

function driverMatchesOffer(driver, offer = {}) {
  const offerTractor = resolveTractor(offer.vehicleTitle);
  if (!offerTractor) return true;
  const driverTractor = resolveTractor(driver?.tractorType);
  if (driverTractor !== offerTractor) return false;
  const variants = (Array.isArray(offer.variants) ? offer.variants : [])
    .map((item) => resolveTrailer(item))
    .filter(Boolean);
  if (!variants.length) return true;
  const driverTrailer = resolveTrailer(driver?.trailerType);
  return Boolean(driverTrailer && variants.includes(driverTrailer));
}

function isOfferedVisibleToDriver(row, driver, driverId) {
  if (row.driver_id && String(row.driver_id) === String(driverId)) return true;
  if (row.driver_id) return false;
  const declined = Array.isArray(row.declined_by) ? row.declined_by : [];
  if (declined.map(String).includes(String(driverId))) return false;
  return driverMatchesOffer(
    { tractorType: driver?.tractorType, trailerType: driver?.trailerType },
    {
      vehicleTitle: row.vehicleType?.title,
      variants: row.vehicle_variants,
    },
  );
}

const VEHICLE_MISMATCH =
  'این مأموریت با نوع و مدل خودروی شما جور نیست. فقط رانندگانی که همان خودرو را دارند می‌توانند آن را قبول کنند.';

module.exports = {
  fold,
  resolveTractor,
  resolveTrailer,
  driverMatchesOffer,
  isOfferedVisibleToDriver,
  VEHICLE_MISMATCH,
};
