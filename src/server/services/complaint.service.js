const { Complaint, Shipment } = require('../models');
const AppError = require('../utils/AppError');
const { urlList } = require('../utils/jsonList');
const driverNotificationService = require('./driverNotification.service');

function presentComplaint(row) {
  const data = row?.toJSON ? row.toJSON() : (row || {});
  const evidence_urls = urlList(data.evidence_url ?? data.evidence_urls);
  return {
    id: data.id,
    owner_id: data.owner_id,
    shipment_id: data.shipment_id,
    type: data.type,
    description: data.description,
    status: data.status,
    admin_response: data.admin_response,
    evidence_urls,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

async function createComplaint(ownerId, payload) {
  let shipment = null;
  if (payload.shipment_id) {
    shipment = await Shipment.findOne({ where: { id: payload.shipment_id, owner_id: ownerId } });
    if (!shipment) throw new AppError('بار انتخاب‌شده متعلق به شما نیست.', 403);
  }
  const complaint = await Complaint.create({
    owner_id: ownerId,
    shipment_id: payload.shipment_id || null,
    type: payload.type,
    description: payload.description,
    evidence_url: urlList(payload.evidence_urls ?? payload.evidence_url),
  });

  if (shipment?.driver_id && payload.type === 'driver') {
    await driverNotificationService.notifyDriver(shipment.driver_id, {
      title: 'شکایت جدید برای مأموریت شما',
      message: `صاحب کالا برای بار ${shipment.tracking_code} شکایتی ثبت کرد. اپراتور موضوع را بررسی می‌کند.`,
      shipmentId: shipment.id,
    }).catch((error) => console.error('driver notification failed:', error.message));
  }

  return presentComplaint(complaint);
}

async function listMyComplaints(ownerId) {
  const rows = await Complaint.findAll({ where: { owner_id: ownerId }, order: [['createdAt', 'DESC']] });
  return rows.map(presentComplaint);
}

module.exports = { createComplaint, listMyComplaints, presentComplaint };
