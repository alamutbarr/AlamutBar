const { Complaint, ComplaintMessage, Shipment } = require('../models');
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
    messages: (Array.isArray(data.messages) ? data.messages : []).map((item) => ({
      id: item.id,
      sender_role: item.sender_role,
      body: item.body,
      createdAt: item.createdAt,
    })),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

const messageInclude = [{
  model: ComplaintMessage,
  as: 'messages',
  separate: true,
  order: [['createdAt', 'ASC']],
}];

async function addComplaintMessage(complaint, { role, body }) {
  const text = String(body || '').trim();
  if (!text) throw new AppError('متن پیام خالی است.', 400);
  if (!['owner', 'operator'].includes(role)) throw new AppError('فرستندهٔ پیام معتبر نیست.', 400);
  return ComplaintMessage.create({
    complaint_id: complaint.id,
    sender_role: role,
    body: text.slice(0, 2000),
  });
}

async function reloadComplaint(id) {
  return Complaint.findByPk(id, { include: messageInclude });
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
  const rows = await Complaint.findAll({
    where: { owner_id: ownerId },
    include: messageInclude,
    order: [['createdAt', 'DESC']],
  });
  return rows.map(presentComplaint);
}

async function addOwnerMessage(ownerId, complaintId, body) {
  const complaint = await Complaint.findOne({ where: { id: complaintId, owner_id: ownerId } });
  if (!complaint) throw new AppError('شکایت پیدا نشد.', 404);
  await addComplaintMessage(complaint, { role: 'owner', body });
  return presentComplaint(await reloadComplaint(complaint.id));
}

function presentAdminComplaint(row) {
  const view = presentComplaint(row);
  const data = row?.toJSON ? row.toJSON() : (row || {});
  return {
    id: view.id,
    type: view.type,
    description: view.description,
    status: view.status,
    adminResponse: view.admin_response,
    trackingCode: data.Shipment?.tracking_code || null,
    ownerPhone: data.User?.phone_number || null,
    evidenceUrls: view.evidence_urls,
    messages: view.messages,
    createdAt: view.createdAt,
  };
}

module.exports = {
  createComplaint,
  listMyComplaints,
  presentComplaint,
  addComplaintMessage,
  addOwnerMessage,
  presentAdminComplaint,
  messageInclude,
};
