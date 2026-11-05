const { getVehicleFields } = require('../services/vehicleConfig');

const TRACTOR_LABELS = {
  khavar: 'خاور/۹۱۱',
  single_truck: 'کامیون تک',
  tandem_truck: 'کامیون جفت',
  trailer: 'تریلی',
};

const TRAILER_LABELS = {
  open: 'روباز',
  side_open: 'بغل بازشو',
  covered: 'مسقف',
  covered_big: 'مسقف اتاق بزرگ',
  dump: 'کمپرسی',
  refrigerated: 'یخچال‌دار',
  flatbed: 'کفی',
  half_edge: 'نیم‌لبه',
  edged: 'لبه‌دار',
  transit_tent: 'ترانزیت چادری',
  blade_container: 'تیغه (کانتینربر)',
  container: 'کانتینر',
  lowboy: 'کمرشکن',
  bogie: 'بوژی',
};

const OPTION_LABELS = {
  '2-3': '۲ تا ۳ تن',
  '3-5': '۳ تا ۵ تن',
  '5+': '۵ تن به بالا',
  '3.5-4': '۳٫۵۰ تا ۴ متر',
  '4-4.5': '۴ تا ۴٫۵۰ متر',
  '4.5-5': '۴٫۵۰ تا ۵ متر',
  '5-5.5': '۵ تا ۵٫۵۰ متر',
  '5.5-6': '۵٫۵۰ تا ۶ متر',
  '6-6.5': '۶ تا ۶٫۵۰ متر',
  '6.5+': '۶٫۵۰ متر به بالا',
  '1.8-1.9': '۱٫۸۰ تا ۱٫۹۰ متر',
  '1.9-2': '۱٫۹۰ تا ۲ متر',
  '2-2.1': '۲ تا ۲٫۱۰ متر',
  '2.1-2.2': '۲٫۱۰ تا ۲٫۲۰ متر',
  '2.2+': '۲٫۲۰ متر به بالا',
  '2-2.2': '۲ تا ۲٫۲۰ متر',
  '2.2-2.4': '۲٫۲۰ تا ۲٫۴۰ متر',
  '2.4-2.6': '۲٫۴۰ تا ۲٫۶۰ متر',
  '2.6-2.8': '۲٫۶۰ تا ۲٫۸۰ متر',
  '2.8-3': '۲٫۸۰ تا ۳ متر',
  '20-40': '۲۰ تا ۴۰ سانتی‌متر',
  '40-60': '۴۰ تا ۶۰ سانتی‌متر',
  '60-80': '۶۰ تا ۸۰ سانتی‌متر',
  '80-100': '۸۰ تا ۱۰۰ سانتی‌متر',
  '100-120': '۱۰۰ تا ۱۲۰ سانتی‌متر',
  '120-140': '۱۲۰ تا ۱۴۰ سانتی‌متر',
  wood: 'چوبی',
  metal: 'فلزی',
  '5-5.4': '۵ تا ۵٫۴۰ متر',
  '5.4-5.8': '۵٫۴۰ تا ۵٫۸۰ متر',
  '5.8-6.2': '۵٫۸۰ تا ۶٫۲۰ متر',
  '6.2+': '۶٫۲۰ متر به بالا',
  '2.2-2.3': '۲٫۲۰ تا ۲٫۳۰ متر',
  '2.3-2.4': '۲٫۳۰ تا ۲٫۴۰ متر',
  '2.4-2.5': '۲٫۴۰ تا ۲٫۵۰ متر',
  '80-90': '۸۰ تا ۹۰ سانتی‌متر',
  '90-100': '۹۰ تا ۱۰۰ سانتی‌متر',
  '100-110': '۱۰۰ تا ۱۱۰ سانتی‌متر',
  '110-120': '۱۱۰ تا ۱۲۰ سانتی‌متر',
  '120+': '۱۲۰ سانتی‌متر به بالا',
  '120-130': '۱۲۰ تا ۱۳۰ سانتی‌متر',
  '130-140': '۱۳۰ تا ۱۴۰ سانتی‌متر',
  '140-150': '۱۴۰ تا ۱۵۰ سانتی‌متر',
  '150-160': '۱۵۰ تا ۱۶۰ سانتی‌متر',
  '160+': '۱۶۰ سانتی‌متر به بالا',
  '6-8': '۶ تا ۸ متر',
  '8-10': '۸ تا ۱۰ متر',
  '10-12': '۱۰ تا ۱۲ متر',
  '12+': '۱۲ متر به بالا',
  '2.5-3': '۲٫۵۰ تا ۳ متر',
  '3-3.5': '۳ تا ۳٫۵۰ متر',
  '3.5-4': '۳٫۵۰ تا ۴ متر',
  '4+': '۴ متر به بالا',
  '30-50': '۳۰ تا ۵۰ سانتی‌متر',
  '50-70': '۵۰ تا ۷۰ سانتی‌متر',
  '70-90': '۷۰ تا ۹۰ سانتی‌متر',
  '90-110': '۹۰ تا ۱۱۰ سانتی‌متر',
  '110-130': '۱۱۰ تا ۱۳۰ سانتی‌متر',
  '20ft': '۲۰ فوت',
  '40ft': '۴۰ فوت',
  '9m': '۹ متر',
  '11m': '۱۱ متر',
  '12.2m': '۱۲٫۲۰ متر',
  '12.6m': '۱۲٫۶۰ متر',
  '13.6m': '۱۳٫۶۰ متر',
  '60+': '۶۰ سانتی‌متر به بالا',
  '2.5-2.6': '۲٫۵۰ تا ۲٫۶۰ متر',
  '2.6+': '۲٫۶۰ متر به بالا',
  1.3: '۱٫۳۰ متر',
  1.4: '۱٫۴۰ متر',
  1.5: '۱٫۵۰ متر',
  1.6: '۱٫۶۰ متر',
  1.7: '۱٫۷۰ متر',
};

function lookupKey(labels, value) {
  if (!value) return '';
  if (labels[value]) return value;
  const found = Object.entries(labels).find(([, label]) => label === value || label.startsWith(String(value)));
  return found ? found[0] : String(value);
}

function tractorLabel(value) {
  const key = lookupKey(TRACTOR_LABELS, value);
  return TRACTOR_LABELS[key] || String(value || '');
}

function trailerLabel(value) {
  const key = lookupKey(TRAILER_LABELS, value);
  return TRAILER_LABELS[key] || String(value || '');
}

function optionLabel(value) {
  if (value == null || value === '') return '';
  return OPTION_LABELS[value] || OPTION_LABELS[String(value)] || String(value);
}

function vehicleSummary(tractorType, trailerType) {
  return [tractorLabel(tractorType), trailerLabel(trailerType)].filter(Boolean).join(' / ');
}

function parseSpecs(specs) {
  if (!specs) return {};
  if (typeof specs === 'string') {
    try {
      const parsed = JSON.parse(specs);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof specs === 'object' && !Array.isArray(specs) ? specs : {};
}

function vehicleSpecLines(tractorType, trailerType, specs) {
  const input = parseSpecs(specs);
  return getVehicleFields(tractorType, trailerType).map((field) => ({
    key: field.key,
    title: field.title,
    value: optionLabel(input[field.key]),
  }));
}

function describeVehicle(tractorType, trailerType, specs) {
  const tractorKey = lookupKey(TRACTOR_LABELS, tractorType);
  const trailerKey = lookupKey(TRAILER_LABELS, trailerType);
  const fields = vehicleSpecLines(tractorKey, trailerKey, specs);
  return {
    tractorType: tractorType || '',
    trailerType: trailerType || '',
    tractorLabel: tractorLabel(tractorType),
    trailerLabel: trailerLabel(trailerType),
    summary: vehicleSummary(tractorType, trailerType) || '—',
    fields,
  };
}

module.exports = {
  TRACTOR_LABELS,
  TRAILER_LABELS,
  tractorLabel,
  trailerLabel,
  optionLabel,
  vehicleSummary,
  vehicleSpecLines,
  describeVehicle,
};
