const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const ratingService = require('../services/rating.service');

const create = asyncHandler(async (req, res) => {
  const rating = await ratingService.rateShipment(req.user.id, req.params.shipmentId, req.body);
  success(res, { statusCode: 201, message: 'امتیاز شما ثبت شد. سپاس‌گزاریم!', data: rating });
});

module.exports = { create };
