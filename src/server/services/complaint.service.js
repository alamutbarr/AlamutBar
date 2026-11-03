const { Complaint, Shipment } = require('../models');
const AppError = require('../utils/AppError');
const driverNotificationService = require('./driverNotification.service');

async function createComplaint(ownerId, payload) {
  let shipment = null;
  if (payload.shipment_id) {
    shipment = await Shipment.findOne({ where: { id: payload.shipment_id, owner_id: ownerId } });
    if (!shipment) throw new AppError('بار انتخاب‌شده متعلق به شما نیست.', 403);
  }
  const complaint = await Complaint.create({ ...payload, owner_id: ownerId });

  if (shipment?.driver_id && payload.type === 'driver') {
    await driverNotificationService.notifyDriver(shipment.driver_id, {
      title: 'شکایت جدید برای مأموریت شما',
      message: `صاحب کالا برای بار ${shipment.tracking_code} شکایتی ثبت کرد. اپراتور موضوع را بررسی می‌کند.`,
      shipmentId: shipment.id,
    }).catch((error) => console.error('driver notification failed:', error.message));
  }

  return complaint;
}

async function listMyComplaints(ownerId) {
  return Complaint.findAll({ where: { owner_id: ownerId }, order: [['createdAt', 'DESC']] });
}

module.exports = { createComplaint, listMyComplaints };
