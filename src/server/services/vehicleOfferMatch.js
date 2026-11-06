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
  side_open: ['side_open', 'بغربازشو', 'بغربازشو'],
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

const HEIGHT_EXEMPT_TRAILERS = new Set(['open', 'dump', 'half_edge', 'edged', 'side_open']);

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

function asSpecs(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }
  return typeof raw === 'object' ? raw : {};
}

function parseMaxMeters(raw) {
  if (raw == null || raw === '') return null;
  const token = fold(raw).replace(/متر|m/g, '');
  if (!token) return null;
  if (token.endsWith('+')) {
    const n = Number(token.slice(0, -1).replace(',', '.'));
    return Number.isFinite(n) ? Number.POSITIVE_INFINITY : null;
  }
  if (token.includes('-')) {
    const parts = token.split('-').map((part) => Number(part.replace(',', '.')));
    const hi = parts[parts.length - 1];
    return Number.isFinite(hi) ? hi : null;
  }
  const n = Number(token.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function cmToMeters(cm) {
  if (cm == null || cm === '') return null;
  const n = Number(cm);
  return Number.isFinite(n) ? n / 100 : null;
}

function cargoFitsVehicle(driver, offer = {}) {
  const specs = asSpecs(driver?.vehicleSpecs);
  const lengthCap = parseMaxMeters(specs.length);
  const widthCap = parseMaxMeters(specs.width);
  const heightCap = parseMaxMeters(specs.roomHeight);
  const lengthM = cmToMeters(offer.lengthCm ?? offer.length_cm);
  const widthM = cmToMeters(offer.widthCm ?? offer.width_cm);
  const heightM = cmToMeters(offer.heightCm ?? offer.height_cm);
  if (lengthM != null && lengthCap != null && lengthCap < lengthM) return false;
  if (widthM != null && widthCap != null && widthCap < widthM) return false;
  const trailer = resolveTrailer(driver?.trailerType);
  if (HEIGHT_EXEMPT_TRAILERS.has(trailer)) return true;
  if (heightM != null && heightCap != null && heightCap < heightM) return false;
  return true;
}

function driverMatchesOffer(driver, offer = {}) {
  const offerTractor = resolveTractor(offer.vehicleTitle);
  if (offerTractor) {
    const driverTractor = resolveTractor(driver?.tractorType);
    if (driverTractor !== offerTractor) return false;
    const variants = (Array.isArray(offer.variants) ? offer.variants : [])
      .map((item) => resolveTrailer(item))
      .filter(Boolean);
    if (variants.length) {
      const driverTrailer = resolveTrailer(driver?.trailerType);
      if (!(driverTrailer && variants.includes(driverTrailer))) return false;
    }
  }
  return cargoFitsVehicle(driver, offer);
}

function isOfferedVisibleToDriver(row, driver, driverId) {
  if (row.driver_id && String(row.driver_id) === String(driverId)) return true;
  if (row.driver_id) return false;
  if (row.offered_driver_id) return false;
  const declined = Array.isArray(row.declined_by) ? row.declined_by : [];
  if (declined.map(String).includes(String(driverId))) return false;
  return driverMatchesOffer(
    {
      tractorType: driver?.tractorType,
      trailerType: driver?.trailerType,
      vehicleSpecs: driver?.vehicleSpecs,
    },
    {
      vehicleTitle: row.vehicleType?.title,
      variants: row.vehicle_variants,
      lengthCm: row.length_cm,
      widthCm: row.width_cm,
      heightCm: row.height_cm,
    },
  );
}

const VEHICLE_MISMATCH =
  'این مأموریت با نوع، مدل یا ابعاد خودروی شما جور نیست. فقط رانندگانی که همان خودرو و ظرفیت را دارند می‌توانند آن را قبول کنند.';

module.exports = {
  fold,
  resolveTractor,
  resolveTrailer,
  parseMaxMeters,
  cargoFitsVehicle,
  driverMatchesOffer,
  isOfferedVisibleToDriver,
  VEHICLE_MISMATCH,
  HEIGHT_EXEMPT_TRAILERS,
};
