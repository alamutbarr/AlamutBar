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

module.exports = { create, getMine };
