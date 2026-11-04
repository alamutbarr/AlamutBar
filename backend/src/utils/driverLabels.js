// backend/src/utils/driverLabels.js
//
// برچسب‌های فارسی مشترک برای پنل اپراتور. این فایل باید با
// frontend/src/driver/vehicleConfig.js و frontend/src/driver/verification.js
// هماهنگ بماند تا نام‌ها بین پنل راننده و پنل اپراتور «هم‌خوان» باشند.

// نوع کشنده: value -> label
const TRACTOR_LABELS = {
  khavar: 'خاور/۹۱۱',
  single_truck: 'کامیون تک',
  tandem_truck: 'کامیون جفت',
  trailer: 'تریلی',
};

// نوع گاری: value -> label
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

// بخش‌های مدارک احراز هویت — دقیقاً همان چیزی که پنل راننده آپلود می‌کند.
// «بیمه‌نامه» و موارد مشابه که راننده آپلود نمی‌کند عمداً اینجا نیستند.
const DOCUMENT_SECTIONS = [
  {
    id: 'driverLicense',
    title: 'گواهینامه رانندگی',
    mandatory: true,
    slots: [
      { id: 'front', label: 'روی گواهینامه' },
      { id: 'back', label: 'پشت گواهینامه' },
    ],
  },
  {
    id: 'selfie',
    title: 'عکس شخصی با کارت',
    mandatory: true,
    slots: [{ id: 'selfie', label: 'عکس شما + کارت' }],
  },
  {
    id: 'nationalCard',
    title: 'کارت ملی هوشمند',
    mandatory: false,
    slots: [
      { id: 'front', label: 'روی کارت ملی' },
      { id: 'back', label: 'پشت کارت ملی' },
    ],
  },
  {
    id: 'vehicleCard',
    title: 'کارت هوشمند خودرو',
    mandatory: false,
    slots: [
      { id: 'front', label: 'روی کارت خودرو' },
      { id: 'back', label: 'پشت کارت خودرو' },
    ],
  },
];

function tractorLabel(value) {
  return TRACTOR_LABELS[value] || value || '';
}

function trailerLabel(value) {
  return TRAILER_LABELS[value] || value || '';
}

// تبدیل سندهای ذخیره‌شده (ردیف‌های DriverDocument) به ساختار بخش‌بندی‌شده با
// عنوان و برچسب فارسی، تا پنل اپراتور عکس را با «اسم خودش و بخش مرتبط» ببیند.
function buildDocumentSections(rows) {
  const map = {};
  for (const row of rows) {
    map[row.section] = map[row.section] || {};
    map[row.section][row.slot] = row.imageData;
  }

  return DOCUMENT_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    mandatory: section.mandatory,
    slots: section.slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      image: (map[section.id] && map[section.id][slot.id]) || null,
    })),
  }));
}

module.exports = {
  TRACTOR_LABELS,
  TRAILER_LABELS,
  DOCUMENT_SECTIONS,
  tractorLabel,
  trailerLabel,
  buildDocumentSections,
};
