const { Complaint, Shipment } = require('../models');
const AppError = require('../utils/AppError');

async function createComplaint(ownerId, payload) {
  if (payload.shipment_id) {
    const shipment = await Shipment.findOne({ where: { id: payload.shipment_id, owner_id: ownerId } });
    if (!shipment) throw new AppError('بار انتخاب‌شده متعلق به شما نیست.', 403);
  }
  return Complaint.create({ ...payload, owner_id: ownerId });
}

async function listMyComplaints(ownerId) {
  return Complaint.findAll({ where: { owner_id: ownerId }, order: [['createdAt', 'DESC']] });
}

module.exports = { createComplaint, listMyComplaints };
