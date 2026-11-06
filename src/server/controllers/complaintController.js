const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const complaintService = require('../services/complaint.service');

const create = asyncHandler(async (req, res) => {
  const complaint = await complaintService.createComplaint(req.user.id, req.body);
  success(res, { statusCode: 201, message: 'شکایت شما ثبت شد و بررسی خواهد شد.', data: complaint });
});

const getMine = asyncHandler(async (req, res) => {
  const complaints = await complaintService.listMyComplaints(req.user.id);
  success(res, { data: complaints });
});

const addMessage = asyncHandler(async (req, res) => {
  const complaint = await complaintService.addOwnerMessage(req.user.id, req.params.id, req.body.body);
  success(res, { message: 'پیام ثبت شد.', data: complaint });
});

module.exports = { create, getMine, addMessage };
