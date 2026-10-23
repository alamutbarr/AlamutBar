const { Shipment, VehicleType, City, Zone, Rating } = require('../models');
const AppError = require('../utils/AppError');
const generateTrackingCode = require('../utils/generateTrackingCode');
const vehicleMatchService = require('./vehicleMatch.service');
const notificationService = require('./notification.service');

const shipmentIncludes = [
  { model: VehicleType, as: 'vehicleType' },
  { model: City, as: 'originCity' },
  { model: Zone, as: 'originZone' },
  { model: City, as: 'destCity' },
  { model: Zone, as: 'destZone' },
  { model: Rating, as: 'rating' },
];

async function generateUniqueTrackingCode() {
  let code;
  let exists = true;
  while (exists) {
    code = generateTrackingCode();
    exists = await Shipment.findOne({ where: { tracking_code: code } });
  }
  return code;
}

async function createShipment(ownerId, payload) {
  await validateReferences(payload);

  const tracking_code = await generateUniqueTrackingCode();

  // بررسی تناسب خودروی انتخابی با وزن/ابعاد بار (معادل موتور تطبیق هوشمند - مرحله ۹)
  const isSuitable = await vehicleMatchService.isVehicleSuitable(payload.vehicle_type_id, {
    weightKg: payload.weight_kg,
    lengthCm: payload.length_cm,
    widthCm: payload.width_cm,
    heightCm: payload.height_cm,
  });

  const shipment = await Shipment.create({
    ...payload,
    tracking_code,
    owner_id: ownerId,
    status: 'searching_driver',
    price_status: 'pending',
  });

  await notificationService.notify(ownerId, {
    title: 'درخواست بار ثبت شد',
    message: `درخواست شما با کد پیگیری ${tracking_code} ثبت شد و در پنل رانندگان دیده می‌شود.`,
    shipmentId: shipment.id,
  });

  return { shipment, needsManualReview: !isSuitable };
}

// همه‌ی مقادیر مرجع (شهر، محدوده، خودرو) را پیش از ثبت در دیتابیس بررسی می‌کند
// تا به‌جای خطای خام FK constraint، پیام دقیق و قابل‌فهم برگردانده شود
async function validateReferences(payload) {
  const originCity = await City.findByPk(payload.origin_city_id);
  if (!originCity) throw new AppError('شهر مبدأ انتخابی معتبر نیست.', 400);

  const destCity = await City.findByPk(payload.dest_city_id);
  if (!destCity) throw new AppError('شهر مقصد انتخابی معتبر نیست.', 400);

  const tehranOrigin = String(originCity.name || '').trim() === 'تهران';
  if (tehranOrigin && !payload.origin_zone_id) {
    throw new AppError('برای شهر تهران، انتخاب محدوده مبدأ الزامی است.', 400);
  }

  if (payload.origin_zone_id) {
    const originZone = await Zone.findByPk(payload.origin_zone_id);
    if (!originZone || String(originZone.city_id) !== String(payload.origin_city_id)) {
      throw new AppError('محدوده‌ی انتخابی برای مبدأ متعلق به شهر انتخاب‌شده نیست.', 400);
    }
  }

  if (payload.dest_zone_id) {
    const destZone = await Zone.findByPk(payload.dest_zone_id);
    if (!destZone || String(destZone.city_id) !== String(payload.dest_city_id)) {
      throw new AppError('محدوده‌ی انتخابی برای مقصد متعلق به شهر انتخاب‌شده نیست.', 400);
    }
  }

  const vehicle = await VehicleType.findByPk(payload.vehicle_type_id);
  if (!vehicle || !vehicle.is_active) {
    throw new AppError('نوع خودروی انتخابی معتبر نیست.', 400);
  }
  const title = (vehicle.title || '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  const variantGroups = [
    { matches: (value) => value.includes('خاور') || value.includes('911'), variants: ['روباز', 'بغل بازشو', 'مسقف', 'مسقف اتاق بزرگ', 'کمپرسی', 'یخچال‌دار'] },
    { matches: (value) => value.includes('کامیون تک'), variants: ['روباز', 'بغل بازشو', 'مسقف', 'کمپرسی', 'یخچال‌دار'] },
    { matches: (value) => value.includes('کامیون جفت'), variants: ['روباز', 'بغل بازشو', 'مسقف', 'کمپرسی', 'یخچال‌دار'] },
    { matches: (value) => value.includes('تریلی'), variants: ['کفی', 'نیم لبه', 'لبه‌دار', 'ترانزیت چادری', 'کمپرسی', 'تیغه (کانتینربر)', 'کانتینر', 'یخچال‌دار', 'کمرشکن', 'بوژی'] },
  ];
  const variantGroup = variantGroups.find((group) => group.matches(title));
  const variants = payload.vehicle_variants;
  if (!variantGroup || !Array.isArray(variants) || variants.length === 0 || variants.some((variant) => !variantGroup.variants.includes(variant))) {
    throw new AppError('نوع گاری با خودروی انتخابی سازگار نیست.', 400);
  }
}

async function getMyShipments(ownerId, { status } = {}) {
  const where = { owner_id: ownerId };
  if (status) where.status = status;

  return Shipment.findAll({
    where,
    include: shipmentIncludes,
    order: [['createdAt', 'DESC']],
  });
}

async function getShipmentForOwner(ownerId, shipmentId) {
  const shipment = await Shipment.findOne({
    where: { id: shipmentId, owner_id: ownerId },
    include: shipmentIncludes,
  });
  if (!shipment) throw new AppError('بار مورد نظر یافت نشد.', 404);
  return shipment;
}

const EDITABLE_STATUSES = ['pending_review', 'price_proposed', 'searching_driver'];

const EDITABLE_FIELDS = [
  'origin_city_id',
  'origin_zone_id',
  'origin_address',
  'origin_lat',
  'origin_lng',
  'dest_city_id',
  'dest_zone_id',
  'dest_address',
  'dest_lat',
  'dest_lng',
  'cargo_type',
  'cargo_type_other',
  'packaging_type',
  'weight_kg',
  'length_cm',
  'width_cm',
  'height_cm',
  'cargo_value',
  'photo_urls',
  'notes',
  'loading_date',
  'loading_time_from',
  'loading_time_to',
  'loading_time_ranges',
  'urgency',
  'vehicle_type_id',
  'vehicle_variants',
  'loading_method',
  'receiver_name',
  'receiver_phone',
  'receiver_national_id',
  'receiver_postal_code',
  'proposed_price',
];

async function updateShipment(ownerId, shipmentId, payload) {
  const shipment = await getShipmentForOwner(ownerId, shipmentId);
  if (shipment.driver_id || !EDITABLE_STATUSES.includes(shipment.status)) {
    throw new AppError('بعد از سپردن بار به راننده، ویرایش مشخصات ممکن نیست.', 400);
  }

  await validateReferences(payload);

  for (const key of EDITABLE_FIELDS) {
    if (payload[key] !== undefined) shipment[key] = payload[key];
  }
  shipment.changed('vehicle_variants', true);
  shipment.changed('loading_time_ranges', true);
  shipment.changed('photo_urls', true);
  await shipment.save();
  return getShipmentForOwner(ownerId, shipmentId);
}

async function respondToPrice(ownerId, shipmentId, action) {
  const shipment = await getShipmentForOwner(ownerId, shipmentId);

  if (shipment.price_status !== 'proposed') {
    throw new AppError('در حال حاضر قیمتی برای پاسخ‌دهی وجود ندارد.', 409);
  }

  if (action === 'accept') {
    shipment.price_status = 'accepted';
    shipment.status = 'searching_driver';
    await notificationService.notify(ownerId, {
      title: 'قیمت تأیید شد',
      message: `قیمت پیشنهادی برای بار ${shipment.tracking_code} تأیید شد. در حال جستجوی راننده هستیم.`,
      shipmentId: shipment.id,
    });
  } else {
    shipment.price_status = 'rejected';
    shipment.status = 'cancelled';
    shipment.cancelled_by = 'owner';
    shipment.cancel_reason = 'صاحب کالا با قیمت پیشنهادی اپراتور موافقت نکرد.';
    await notificationService.notify(ownerId, {
      title: 'درخواست لغو شد',
      message: `به‌دلیل عدم توافق روی قیمت، بار ${shipment.tracking_code} لغو شد.`,
      shipmentId: shipment.id,
    });
  }

  await shipment.save();
  return shipment;
}

const DIRECTLY_CANCELLABLE_STATUSES = ['pending_review', 'price_proposed', 'searching_driver'];

async function cancelShipment(ownerId, shipmentId, cancelReason) {
  const shipment = await getShipmentForOwner(ownerId, shipmentId);

  if (!DIRECTLY_CANCELLABLE_STATUSES.includes(shipment.status)) {
    throw new AppError(
      'در این مرحله لغو مستقیم امکان‌پذیر نیست و نیاز به بررسی اپراتور دارد.',
      409
    );
  }

  shipment.status = 'cancelled';
  shipment.cancelled_by = 'owner';
  shipment.cancel_reason = cancelReason;
  await shipment.save();

  await notificationService.notify(ownerId, {
    title: 'بار لغو شد',
    message: `بار ${shipment.tracking_code} با موفقیت لغو شد.`,
    shipmentId: shipment.id,
  });

  return shipment;
}

// این متد بخشی از پنل اپراتور (خارج از دامنه‌ی این نسخه) است؛ فعلاً برای تست کامل چرخه‌ی
// «پیشنهاد قیمت» از سمت اپراتور در دسترس قرار گرفته است.
async function proposePriceByOperator(shipmentId, operatorPrice) {
  const shipment = await Shipment.findByPk(shipmentId);
  if (!shipment) throw new AppError('بار مورد نظر یافت نشد.', 404);
  if (shipment.status !== 'pending_review') {
    throw new AppError('فقط بارهای در انتظار بررسی قابل قیمت‌گذاری هستند.', 409);
  }

  shipment.operator_price = operatorPrice;
  shipment.price_status = 'proposed';
  shipment.status = 'price_proposed';
  await shipment.save();

  await notificationService.notify(shipment.owner_id, {
    title: 'قیمت پیشنهادی آماده است',
    message: `اپراتور برای بار ${shipment.tracking_code} قیمت نهایی تعیین کرد. لطفاً بررسی و تأیید کنید.`,
    shipmentId: shipment.id,
  });

  return shipment;
}

// طبق فلوچارت: تحویل بار → «درخواست تأیید تحویل از صاحب کالا» یک اکشن مجزاست،
// و فقط بعد از تأیید صریح، سیستم امتیازدهی فعال می‌شود.
async function confirmDelivery(ownerId, shipmentId) {
  const shipment = await getShipmentForOwner(ownerId, shipmentId);

  if (shipment.status !== 'delivered') {
    throw new AppError('این بار در وضعیتی نیست که بتوان تحویل آن را تأیید کرد.', 409);
  }

  shipment.status = 'completed';
  await shipment.save();

  await notificationService.notify(ownerId, {
    title: 'مأموریت با موفقیت پایان یافت',
    message: `تحویل بار ${shipment.tracking_code} توسط شما تأیید شد. خوشحال می‌شویم به راننده و متصدی امتیاز بدهید.`,
    shipmentId: shipment.id,
  });

  return shipment;
}

// صرفاً برای تست سرتاسری (چون پنل راننده/متصدی هنوز ساخته نشده) - وضعیت را دستی جلو می‌برد
const ADVANCEABLE_STATUSES = ['driver_assigned', 'at_pickup', 'in_transit', 'delivered'];

async function advanceStatusForTesting(shipmentId, nextStatus) {
  if (!ADVANCEABLE_STATUSES.includes(nextStatus)) {
    throw new AppError('این وضعیت از طریق این مسیر آزمایشی قابل تنظیم نیست.', 400);
  }
  const shipment = await Shipment.findByPk(shipmentId);
  if (!shipment) throw new AppError('بار مورد نظر یافت نشد.', 404);

  shipment.status = nextStatus;
  await shipment.save();

  if (nextStatus === 'delivered') {
    await notificationService.notify(shipment.owner_id, {
      title: 'بار تحویل داده شد',
      message: `بار ${shipment.tracking_code} به مقصد رسید. لطفاً تحویل را تأیید کنید.`,
      shipmentId: shipment.id,
    });
  }

  return shipment;
}

module.exports = {
  createShipment,
  getMyShipments,
  getShipmentForOwner,
  updateShipment,
  respondToPrice,
  cancelShipment,
  confirmDelivery,
  proposePriceByOperator,
  advanceStatusForTesting,
  shipmentIncludes,
};
