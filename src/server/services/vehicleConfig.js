// backend/src/services/vehicleConfig.js
//
// آینه‌ی frontend/src/driver/vehicleConfig.js — فقط مقادیر فنی برای اعتبارسنجی.
// این فایل باید با فایل فرانت هماهنگ بماند تا اعتبارسنجی Frontend و Backend
// یکسان باشد. برای «تیغه (کانتینربر)» و «بوژی» هیچ فیلد اختصاصی وجود ندارد.

const TRACTOR_VALUES = ['khavar', 'single_truck', 'tandem_truck', 'trailer'];

const TRAILER_VALUES = {
  khavar: ['open', 'side_open', 'covered', 'covered_big', 'dump', 'refrigerated'],
  single_truck: ['open', 'side_open', 'covered', 'dump', 'refrigerated'],
  tandem_truck: ['open', 'side_open', 'covered', 'dump', 'refrigerated'],
  trailer: [
    'flatbed', 'half_edge', 'edged', 'transit_tent', 'dump',
    'blade_container', 'container', 'refrigerated', 'lowboy', 'bogie',
  ],
};

// مقادیر مجاز هر فیلد (همان technical values در فرانت)
const WEIGHT = ['2-3', '3-5', '5+'];
const KHAVAR_LENGTH = ['3.5-4', '4-4.5', '4.5-5', '5-5.5', '5.5-6', '6-6.5', '6.5+'];
const KHAVAR_WIDTH = ['1.8-1.9', '1.9-2', '2-2.1', '2.1-2.2', '2.2+'];
const ROOM_HEIGHT = ['2-2.2', '2.2-2.4', '2.4-2.6', '2.6-2.8', '2.8-3'];
const KHAVAR_EDGE_SIDE_OPEN = ['20-40', '40-60', '60-80', '80-100', '100-120'];
const KHAVAR_EDGE_OPEN_DUMP = ['40-60', '60-80', '80-100', '100-120', '120-140'];
const FLOOR_WOOD = ['wood', 'metal'];
const FLOOR_METAL = ['metal', 'wood'];
const SINGLE_LENGTH = ['5-5.4', '5.4-5.8', '5.8-6.2', '6.2+'];
const TANDEM_LENGTH = ['6-6.5', '6.5-7', '7-7.5', '7.5+'];
const TRUCK_WIDTH = ['2-2.1', '2.1-2.2', '2.2-2.3', '2.3-2.4', '2.4-2.5'];
const EDGE_LOW = ['80-90', '90-100', '100-110', '110-120', '120+'];
const EDGE_DUMP = ['120-130', '130-140', '140-150', '150-160', '160+'];
const LOWBOY_LENGTH = ['6-8', '8-10', '10-12', '12+'];
const LOWBOY_WIDTH = ['2.5-3', '3-3.5', '3.5-4', '4+'];
const LOWBOY_GROUND = ['30-50', '50-70', '70-90', '90-110', '110-130'];
const CONTAINER_FEATURE = ['20ft', '40ft'];
const TRAILER_LENGTH = ['9m', '11m', '12.2m', '12.6m', '13.6m'];
const HALF_EDGE_HEIGHT = ['20-40', '40-60', '60+'];
const EDGED_HEIGHT = ['40-60', '60-80', '80-100', '100-120', '120+'];
const TRAILER_ROOM_HEIGHT = ['2.4-2.6', '2.6-2.8', '2.8-3'];
const TRAILER_WIDTH = ['2.3-2.4', '2.4-2.5', '2.5-2.6', '2.6+'];
const TRAILER_GROUND = ['1.3', '1.4', '1.5', '1.6', '1.7'];

function getVehicleFields(tractorType, trailerType) {
  if (!tractorType || !trailerType) return [];

  if (tractorType === 'khavar') {
    const fields = [
      { key: 'weight', title: 'وزن قابل بارگیری', values: WEIGHT },
      { key: 'length', title: 'طول اتاق', values: KHAVAR_LENGTH },
    ];
    if (['covered', 'covered_big', 'refrigerated'].includes(trailerType)) {
      fields.push({ key: 'roomHeight', title: 'ارتفاع اتاق', values: ROOM_HEIGHT });
    } else if (trailerType === 'side_open') {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه اتاق', values: KHAVAR_EDGE_SIDE_OPEN });
    } else {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه اتاق', values: KHAVAR_EDGE_OPEN_DUMP });
    }
    fields.push({ key: 'width', title: 'عرض اتاق', values: KHAVAR_WIDTH });
    return fields;
  }

  if (tractorType === 'single_truck') {
    const fields = [];
    if (['open', 'side_open', 'covered'].includes(trailerType)) {
      fields.push({ key: 'floor', title: 'کف اتاق', values: FLOOR_WOOD });
    }
    fields.push({ key: 'length', title: 'طول اتاق', values: SINGLE_LENGTH });
    fields.push({ key: 'width', title: 'عرض اتاق', values: TRUCK_WIDTH });
    if (['side_open', 'open'].includes(trailerType)) {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', values: EDGE_LOW });
    } else if (trailerType === 'dump') {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', values: EDGE_DUMP });
    } else {
      fields.push({ key: 'roomHeight', title: 'ارتفاع اتاق', values: ROOM_HEIGHT });
    }
    return fields;
  }

  if (tractorType === 'tandem_truck') {
    const fields = [];
    if (['open', 'side_open', 'covered'].includes(trailerType)) {
      fields.push({ key: 'floor', title: 'کف اتاق', values: FLOOR_METAL });
    }
    fields.push({ key: 'length', title: 'طول اتاق', values: TANDEM_LENGTH });
    fields.push({ key: 'width', title: 'عرض اتاق', values: TRUCK_WIDTH });
    if (trailerType === 'dump') {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', values: EDGE_DUMP });
    } else if (['side_open', 'open'].includes(trailerType)) {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', values: EDGE_LOW });
    } else {
      fields.push({ key: 'roomHeight', title: 'ارتفاع اتاق', values: ROOM_HEIGHT });
    }
    return fields;
  }

  if (tractorType === 'trailer') {
    if (trailerType === 'lowboy') {
      return [
        { key: 'length', title: 'طول', values: LOWBOY_LENGTH },
        { key: 'width', title: 'عرض', values: LOWBOY_WIDTH },
        { key: 'groundHeight', title: 'ارتفاع از کف زمین', values: LOWBOY_GROUND },
      ];
    }
    if (trailerType === 'container') {
      return [{ key: 'feature', title: 'ویژگی', values: CONTAINER_FEATURE }];
    }
    if (trailerType === 'blade_container' || trailerType === 'bogie') {
      return [];
    }
    if (trailerType === 'dump') {
      return [{ key: 'groundHeight', title: 'ارتفاع از کف زمین', values: TRAILER_GROUND }];
    }

    const fields = [
      { key: 'length', title: 'طول اتاق', values: TRAILER_LENGTH },
    ];
    if (trailerType === 'half_edge') {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', values: HALF_EDGE_HEIGHT });
    } else if (trailerType === 'edged') {
      fields.push({ key: 'edgeHeight', title: 'ارتفاع لبه', values: EDGED_HEIGHT });
    } else if (['transit_tent', 'refrigerated'].includes(trailerType)) {
      fields.push({ key: 'roomHeight', title: 'ارتفاع اتاق', values: TRAILER_ROOM_HEIGHT });
    }
    fields.push({ key: 'width', title: 'عرض اتاق', values: TRAILER_WIDTH });
    fields.push({ key: 'groundHeight', title: 'ارتفاع از کف زمین', values: TRAILER_GROUND });
    return fields;
  }

  return [];
}

/**
 * اعتبارسنجی انتخاب کشنده/گاری و فیلدهای پویا.
 * خروجی: { valid, error?, sanitizedSpecs } که sanitizedSpecs فقط شامل کلیدهای
 * مرتبط با انتخاب فعلی است (هیچ مقدار مخفی/نامرتبطی ذخیره نمی‌شود).
 */
function validateVehicleSelection(tractorType, trailerType, specs) {
  if (!TRACTOR_VALUES.includes(tractorType)) {
    return { valid: false, error: 'نوع کشنده معتبر نیست.' };
  }

  const trailers = TRAILER_VALUES[tractorType] || [];
  if (!trailers.includes(trailerType)) {
    return { valid: false, error: 'نوع گاری برای این کشنده معتبر نیست.' };
  }

  const fields = getVehicleFields(tractorType, trailerType);
  const allowedKeys = new Set(fields.map((f) => f.key));
  const input = (specs && typeof specs === 'object' && !Array.isArray(specs)) ? specs : {};

  // فقط کلیدهای مجاز نگه داشته می‌شوند (حذف مقادیر نامرتبط)
  const sanitizedSpecs = {};
  for (const f of fields) {
    const v = input[f.key];
    if (v === undefined || v === null || v === '') {
      return { valid: false, error: `فیلد «${f.title}» انتخاب نشده است.` };
    }
    if (!f.values.includes(String(v))) {
      return { valid: false, error: `مقدار «${f.title}» نامعتبر است.` };
    }
    sanitizedSpecs[f.key] = String(v);
  }

  return { valid: true, sanitizedSpecs };
}

module.exports = {
  TRACTOR_VALUES,
  TRAILER_VALUES,
  getVehicleFields,
  validateVehicleSelection,
};
