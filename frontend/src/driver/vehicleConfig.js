// frontend/src/driver/vehicleConfig.js
//
// تعریف کامل و دقیق فیلدهای پویای «اطلاعات خودرو» (مرحله‌ی دوم فرم ثبت‌نام).
// این فایل باید با فایل مشابه در بک‌اند
// (backend/src/services/vehicleConfig.js) هماهنگ بماند تا اعتبارسنجی
// Frontend و Backend یکسان باشد.
//
// قاعده‌ی اصلی: هیچ فیلد یا گزینه‌ای براساس حدس اضافه نشده است. برای
// «تیغه (کانتینربر)» و «بوژی» هیچ فیلد اختصاصی تعریف نمی‌شود.

// ---------------------------- نوع کشنده ----------------------------
export const TRACTOR_TYPES = [
  { value: 'khavar', label: 'خاور/۹۱۱' },
  { value: 'single_truck', label: 'کامیون تک' },
  { value: 'tandem_truck', label: 'کامیون جفت' },
  { value: 'trailer', label: 'تریلی' },
];

// ----------------------- نوع گاری به تفکیک کشنده -----------------------
export const TRAILER_TYPES = {
  khavar: [
    { value: 'open', label: 'روباز' },
    { value: 'side_open', label: 'بغل بازشو' },
    { value: 'covered', label: 'مسقف' },
    { value: 'covered_big', label: 'مسقف اتاق بزرگ' },
    { value: 'dump', label: 'کمپرسی' },
    { value: 'refrigerated', label: 'یخچال‌دار' },
  ],
  single_truck: [
    { value: 'open', label: 'روباز' },
    { value: 'side_open', label: 'بغل بازشو' },
    { value: 'covered', label: 'مسقف' },
    { value: 'dump', label: 'کمپرسی' },
    { value: 'refrigerated', label: 'یخچال‌دار' },
  ],
  tandem_truck: [
    { value: 'open', label: 'روباز' },
    { value: 'side_open', label: 'بغل بازشو' },
    { value: 'covered', label: 'مسقف' },
    { value: 'dump', label: 'کمپرسی' },
    { value: 'refrigerated', label: 'یخچال‌دار' },
  ],
  trailer: [
    { value: 'flatbed', label: 'کفی' },
    { value: 'half_edge', label: 'نیم‌لبه' },
    { value: 'edged', label: 'لبه‌دار' },
    { value: 'transit_tent', label: 'ترانزیت چادری' },
    { value: 'dump', label: 'کمپرسی' },
    { value: 'blade_container', label: 'تیغه (کانتینربر)' },
    { value: 'container', label: 'کانتینر' },
    { value: 'refrigerated', label: 'یخچال‌دار' },
    { value: 'lowboy', label: 'کمرشکن' },
    { value: 'bogie', label: 'بوژی' },
  ],
};

// ------------------------------ گزینه‌ها ------------------------------
const WEIGHT_OPTIONS = [
  { value: '2-3', label: '۲ تا ۳ تن' },
  { value: '3-5', label: '۳ تا ۵ تن' },
  { value: '5+', label: '۵ تن به بالا' },
];

const KHAVAR_LENGTH_OPTIONS = [
  { value: '3.5-4', label: '۳٫۵۰ تا ۴ متر' },
  { value: '4-4.5', label: '۴ تا ۴٫۵۰ متر' },
  { value: '4.5-5', label: '۴٫۵۰ تا ۵ متر' },
  { value: '5-5.5', label: '۵ تا ۵٫۵۰ متر' },
  { value: '5.5-6', label: '۵٫۵۰ تا ۶ متر' },
  { value: '6-6.5', label: '۶ تا ۶٫۵۰ متر' },
  { value: '6.5+', label: '۶٫۵۰ متر به بالا' },
];

const KHAVAR_WIDTH_OPTIONS = [
  { value: '1.8-1.9', label: '۱٫۸۰ تا ۱٫۹۰ متر' },
  { value: '1.9-2', label: '۱٫۹۰ تا ۲ متر' },
  { value: '2-2.1', label: '۲ تا ۲٫۱۰ متر' },
  { value: '2.1-2.2', label: '۲٫۱۰ تا ۲٫۲۰ متر' },
  { value: '2.2+', label: '۲٫۲۰ متر به بالا' },
];

const ROOM_HEIGHT_OPTIONS = [
  { value: '2-2.2', label: '۲ تا ۲٫۲۰ متر' },
  { value: '2.2-2.4', label: '۲٫۲۰ تا ۲٫۴۰ متر' },
  { value: '2.4-2.6', label: '۲٫۴۰ تا ۲٫۶۰ متر' },
  { value: '2.6-2.8', label: '۲٫۶۰ تا ۲٫۸۰ متر' },
  { value: '2.8-3', label: '۲٫۸۰ تا ۳ متر' },
];

const KHAVAR_EDGE_HEIGHT_SIDE_OPEN = [
  { value: '20-40', label: '۲۰ تا ۴۰ سانتی‌متر' },
  { value: '40-60', label: '۴۰ تا ۶۰ سانتی‌متر' },
  { value: '60-80', label: '۶۰ تا ۸۰ سانتی‌متر' },
  { value: '80-100', label: '۸۰ تا ۱۰۰ سانتی‌متر' },
  { value: '100-120', label: '۱۰۰ تا ۱۲۰ سانتی‌متر' },
];

const KHAVAR_EDGE_HEIGHT_OPEN_DUMP = [
  { value: '40-60', label: '۴۰ تا ۶۰ سانتی‌متر' },
  { value: '60-80', label: '۶۰ تا ۸۰ سانتی‌متر' },
  { value: '80-100', label: '۸۰ تا ۱۰۰ سانتی‌متر' },
  { value: '100-120', label: '۱۰۰ تا ۱۲۰ سانتی‌متر' },
  { value: '120-140', label: '۱۲۰ تا ۱۴۰ سانتی‌متر' },
];

const FLOOR_WOOD_FIRST = [
  { value: 'wood', label: 'چوبی' },
  { value: 'metal', label: 'فلزی' },
];

const FLOOR_METAL_FIRST = [
  { value: 'metal', label: 'فلزی' },
  { value: 'wood', label: 'چوبی' },
];

const SINGLE_LENGTH_OPTIONS = [
  { value: '5-5.4', label: '۵ تا ۵٫۴۰ متر' },
  { value: '5.4-5.8', label: '۵٫۴۰ تا ۵٫۸۰ متر' },
  { value: '5.8-6.2', label: '۵٫۸۰ تا ۶٫۲۰ متر' },
  { value: '6.2+', label: '۶٫۲۰ متر به بالا' },
];

const TANDEM_LENGTH_OPTIONS = [
  { value: '6-6.5', label: '۶ تا ۶٫۵۰ متر' },
  { value: '6.5-7', label: '۶٫۵۰ تا ۷ متر' },
  { value: '7-7.5', label: '۷ تا ۷٫۵۰ متر' },
  { value: '7.5+', label: '۷٫۵۰ متر به بالا' },
];

const TRUCK_WIDTH_OPTIONS = [
  { value: '2-2.1', label: '۲ تا ۲٫۱۰ متر' },
  { value: '2.1-2.2', label: '۲٫۱۰ تا ۲٫۲۰ متر' },
  { value: '2.2-2.3', label: '۲٫۲۰ تا ۲٫۳۰ متر' },
  { value: '2.3-2.4', label: '۲٫۳۰ تا ۲٫۴۰ متر' },
  { value: '2.4-2.5', label: '۲٫۴۰ تا ۲٫۵۰ متر' },
];

const EDGE_HEIGHT_LOW = [
  { value: '80-90', label: '۸۰ تا ۹۰ سانتی‌متر' },
  { value: '90-100', label: '۹۰ تا ۱۰۰ سانتی‌متر' },
  { value: '100-110', label: '۱۰۰ تا ۱۱۰ سانتی‌متر' },
  { value: '110-120', label: '۱۱۰ تا ۱۲۰ سانتی‌متر' },
  { value: '120+', label: '۱۲۰ سانتی‌متر به بالا' },
];

const EDGE_HEIGHT_DUMP = [
  { value: '120-130', label: '۱۲۰ تا ۱۳۰ سانتی‌متر' },
  { value: '130-140', label: '۱۳۰ تا ۱۴۰ سانتی‌متر' },
  { value: '140-150', label: '۱۴۰ تا ۱۵۰ سانتی‌متر' },
  { value: '150-160', label: '۱۵۰ تا ۱۶۰ سانتی‌متر' },
  { value: '160+', label: '۱۶۰ سانتی‌متر به بالا' },
];

const LOWBOY_LENGTH_OPTIONS = [
  { value: '6-8', label: '۶ تا ۸ متر' },
  { value: '8-10', label: '۸ تا ۱۰ متر' },
  { value: '10-12', label: '۱۰ تا ۱۲ متر' },
  { value: '12+', label: '۱۲ متر به بالا' },
];

const LOWBOY_WIDTH_OPTIONS = [
  { value: '2.5-3', label: '۲٫۵۰ تا ۳ متر' },
  { value: '3-3.5', label: '۳ تا ۳٫۵۰ متر' },
  { value: '3.5-4', label: '۳٫۵۰ تا ۴ متر' },
  { value: '4+', label: '۴ متر به بالا' },
];

const LOWBOY_GROUND_OPTIONS = [
  { value: '30-50', label: '۳۰ تا ۵۰ سانتی‌متر' },
  { value: '50-70', label: '۵۰ تا ۷۰ سانتی‌متر' },
  { value: '70-90', label: '۷۰ تا ۹۰ سانتی‌متر' },
  { value: '90-110', label: '۹۰ تا ۱۱۰ سانتی‌متر' },
  { value: '110-130', label: '۱۱۰ تا ۱۳۰ سانتی‌متر' },
];

const CONTAINER_FEATURE_OPTIONS = [
  { value: '20ft', label: '۲۰ فوت' },
  { value: '40ft', label: '۴۰ فوت' },
];

const TRAILER_LENGTH_OPTIONS = [
  { value: '9m', label: '۹ متری' },
  { value: '11m', label: '۱۱ متری' },
  { value: '12.2m', label: '۱۲٫۲۰ متری' },
  { value: '12.6m', label: '۱۲٫۶۰ متری' },
  { value: '13.6m', label: '۱۳٫۶۰ متری' },
];

const HALF_EDGE_HEIGHT_OPTIONS = [
  { value: '20-40', label: '۲۰ تا ۴۰ سانتی‌متر' },
  { value: '40-60', label: '۴۰ تا ۶۰ سانتی‌متر' },
  { value: '60+', label: '۶۰ سانتی‌متر به بالا' },
];

const EDGED_HEIGHT_OPTIONS = [
  { value: '40-60', label: '۴۰ تا ۶۰ سانتی‌متر' },
  { value: '60-80', label: '۶۰ تا ۸۰ سانتی‌متر' },
  { value: '80-100', label: '۸۰ تا ۱۰۰ سانتی‌متر' },
  { value: '100-120', label: '۱۰۰ تا ۱۲۰ سانتی‌متر' },
  { value: '120+', label: '۱۲۰ سانتی‌متر به بالا' },
];

const TRAILER_ROOM_HEIGHT_OPTIONS = [
  { value: '2.4-2.6', label: '۲٫۴۰ تا ۲٫۶۰ متر' },
  { value: '2.6-2.8', label: '۲٫۶۰ تا ۲٫۸۰ متر' },
  { value: '2.8-3', label: '۲٫۸۰ تا ۳ متر' },
];

const TRAILER_WIDTH_OPTIONS = [
  { value: '2.3-2.4', label: '۲٫۳۰ تا ۲٫۴۰ متر' },
  { value: '2.4-2.5', label: '۲٫۴۰ تا ۲٫۵۰ متر' },
  { value: '2.5-2.6', label: '۲٫۵۰ تا ۲٫۶۰ متر' },
  { value: '2.6+', label: '۲٫۶۰ متر به بالا' },
];

const TRAILER_GROUND_OPTIONS = [
  { value: '1.3', label: '۱٫۳۰ متر' },
  { value: '1.4', label: '۱٫۴۰ متر' },
  { value: '1.5', label: '۱٫۵۰ متر' },
  { value: '1.6', label: '۱٫۶۰ متر' },
  { value: '1.7', label: '۱٫۷۰ متر' },
];

// ----------------------------------------------------------------------
// ساخت فیلدهای وابسته بر اساس نوع کشنده و نوع گاری.
// خروجی: آرایه‌ای از { key, title, options } که فقط شامل فیلدهای مرتبط است.
// ----------------------------------------------------------------------
export function getVehicleFields(tractorType, trailerType) {
  if (!tractorType || !trailerType) return [];

  // شاخه A: خاور/۹۱۱
  if (tractorType === 'khavar') {
    const fields = [
      { key: 'weight', title: 'وزن قابل بارگیری', options: WEIGHT_OPTIONS },
      { key: 'length', title: 'طول اتاق', options: KHAVAR_LENGTH_OPTIONS },
    ];

    if (['covered', 'covered_big', 'refrigerated'].includes(trailerType)) {
      fields.push({ key: 'roomHeight', title: 'ارتفاع اتاق', options: ROOM_HEIGHT_OPTIONS });
    } else if (trailerType === 'side_open') {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه اتاق', options: KHAVAR_EDGE_HEIGHT_SIDE_OPEN });
    } else {
      // روباز / کمپرسی
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه اتاق', options: KHAVAR_EDGE_HEIGHT_OPEN_DUMP });
    }

    fields.push({ key: 'width', title: 'عرض اتاق', options: KHAVAR_WIDTH_OPTIONS });
    return fields;
  }

  // شاخه B: کامیون تک
  if (tractorType === 'single_truck') {
    const fields = [];

    if (['open', 'side_open', 'covered'].includes(trailerType)) {
      fields.push({ key: 'floor', title: 'کف اتاق', options: FLOOR_WOOD_FIRST });
    }

    fields.push({ key: 'length', title: 'طول اتاق', options: SINGLE_LENGTH_OPTIONS });
    fields.push({ key: 'width', title: 'عرض اتاق', options: TRUCK_WIDTH_OPTIONS });

    if (['side_open', 'open'].includes(trailerType)) {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', options: EDGE_HEIGHT_LOW });
    } else if (trailerType === 'dump') {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', options: EDGE_HEIGHT_DUMP });
    } else {
      // مسقف / یخچال‌دار
      fields.push({ key: 'roomHeight', title: 'ارتفاع اتاق', options: ROOM_HEIGHT_OPTIONS });
    }

    return fields;
  }

  // شاخه C: کامیون جفت
  if (tractorType === 'tandem_truck') {
    const fields = [];

    if (['open', 'side_open', 'covered'].includes(trailerType)) {
      fields.push({ key: 'floor', title: 'کف اتاق', options: FLOOR_METAL_FIRST });
    }

    fields.push({ key: 'length', title: 'طول اتاق', options: TANDEM_LENGTH_OPTIONS });
    fields.push({ key: 'width', title: 'عرض اتاق', options: TRUCK_WIDTH_OPTIONS });

    if (trailerType === 'dump') {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', options: EDGE_HEIGHT_DUMP });
    } else if (['side_open', 'open'].includes(trailerType)) {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', options: EDGE_HEIGHT_LOW });
    } else {
      // مسقف / یخچال‌دار
      fields.push({ key: 'roomHeight', title: 'ارتفاع اتاق', options: ROOM_HEIGHT_OPTIONS });
    }

    return fields;
  }

  // شاخه D: تریلی
  if (tractorType === 'trailer') {
    // D1: کمرشکن
    if (trailerType === 'lowboy') {
      return [
        { key: 'length', title: 'طول', options: LOWBOY_LENGTH_OPTIONS },
        { key: 'width', title: 'عرض', options: LOWBOY_WIDTH_OPTIONS },
        { key: 'groundHeight', title: 'ارتفاع از کف زمین', options: LOWBOY_GROUND_OPTIONS },
      ];
    }

    // D2: کانتینر (فقط «ویژگی»)
    if (trailerType === 'container') {
      return [
        { key: 'feature', title: 'ویژگی', options: CONTAINER_FEATURE_OPTIONS },
      ];
    }

    // D4: تیغه (کانتینربر) و بوژی — بدون هیچ فیلد اختصاصی
    if (trailerType === 'blade_container' || trailerType === 'bogie') {
      return [];
    }

    // کمپرسی در تریلی: فقط «ارتفاع از کف زمین» (بدون طول/عرض/ارتفاع لبه)
    if (trailerType === 'dump') {
      return [
        { key: 'groundHeight', title: 'ارتفاع از کف زمین', options: TRAILER_GROUND_OPTIONS },
      ];
    }

    // D3: کفی، نیم‌لبه، لبه‌دار، ترانزیت چادری، یخچال‌دار
    const fields = [
      { key: 'length', title: 'طول اتاق', options: TRAILER_LENGTH_OPTIONS },
    ];

    if (trailerType === 'half_edge') {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', options: HALF_EDGE_HEIGHT_OPTIONS });
    } else if (trailerType === 'edged') {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', options: EDGED_HEIGHT_OPTIONS });
    } else if (['transit_tent', 'refrigerated'].includes(trailerType)) {
      fields.push({ key: 'roomHeight', title: 'ارتفاع اتاق', options: TRAILER_ROOM_HEIGHT_OPTIONS });
    }
    // کفی (flatbed) فیلد ارتفاع ندارد.

    fields.push({ key: 'width', title: 'عرض اتاق', options: TRAILER_WIDTH_OPTIONS });
    fields.push({ key: 'groundHeight', title: 'ارتفاع از کف زمین', options: TRAILER_GROUND_OPTIONS });
    return fields;
  }

  return [];
}
