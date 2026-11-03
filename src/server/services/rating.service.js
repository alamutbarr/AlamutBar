const { Rating, Shipment } = require('../models');
const AppError = require('../utils/AppError');
const driverNotificationService = require('./driverNotification.service');

// امتیازدهی فقط بعد از «تأیید تحویل» توسط صاحب کالا فعال می‌شود (نه بلافاصله بعد از تحویل)
const RATEABLE_STATUSES = ['completed'];

async function rateShipment(ownerId, shipmentId, payload) {
  const shipment = await Shipment.findOne({ where: { id: shipmentId, owner_id: ownerId } });
  if (!shipment) throw new AppError('بار مورد نظر یافت نشد.', 404);

  if (!RATEABLE_STATUSES.includes(shipment.status)) {
    throw new AppError('امتیازدهی فقط پس از تأیید تحویل بار امکان‌پذیر است.', 409);
  }

  const existing = await Rating.findOne({ where: { shipment_id: shipmentId } });
  if (existing) throw new AppError('برای این بار قبلاً امتیاز ثبت شده است.', 409);

  const rating = await Rating.create({ ...payload, shipment_id: shipmentId, owner_id: ownerId });

  if (shipment.driver_id) {
    const score = payload.driver_score ?? payload.driverScore;
    await driverNotificationService.notifyDriver(shipment.driver_id, {
      title: 'امتیاز جدید ثبت شد',
      message: `صاحب کالا برای مأموریت ${shipment.tracking_code}${score ? ` امتیاز ${Number(score).toLocaleString('fa-IR')}` : ' امتیاز'} ثبت کرد.`,
      shipmentId: shipment.id,
    }).catch((error) => console.error('driver notification failed:', error.message));
  }

  return rating;
}

module.exports = { rateShipment };
