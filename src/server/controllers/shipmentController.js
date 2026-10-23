const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const shipmentService = require('../services/shipment.service');

const create = asyncHandler(async (req, res) => {
  const { shipment, needsManualReview } = await shipmentService.createShipment(req.user.id, req.body);
  success(res, {
    statusCode: 201,
    message: 'بار با موفقیت ثبت شد و در انتظار بررسی است.',
    data: { shipment, needsManualReview },
  });
});

const getMine = asyncHandler(async (req, res) => {
  const shipments = await shipmentService.getMyShipments(req.user.id, { status: req.query.status });
  success(res, { data: shipments });
});

const getOne = asyncHandler(async (req, res) => {
  const shipment = await shipmentService.getShipmentForOwner(req.user.id, req.params.id);
  success(res, { data: shipment });
});

const respondToPrice = asyncHandler(async (req, res) => {
  const shipment = await shipmentService.respondToPrice(req.user.id, req.params.id, req.body.action);
  success(res, { message: 'پاسخ شما ثبت شد.', data: shipment });
});

const cancel = asyncHandler(async (req, res) => {
  const shipment = await shipmentService.cancelShipment(req.user.id, req.params.id, req.body.cancel_reason);
  success(res, { message: 'بار لغو شد.', data: shipment });
});

const confirmDelivery = asyncHandler(async (req, res) => {
  const shipment = await shipmentService.confirmDelivery(req.user.id, req.params.id);
  success(res, { message: 'تحویل بار تأیید شد.', data: shipment });
});

module.exports = { create, getMine, getOne, respondToPrice, cancel, confirmDelivery };
