const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const shipmentService = require('../services/shipment.service');

// این کنترلر جزئی از پنل کامل اپراتور نیست؛ فقط برای تست سرتاسری چرخه‌ی
// «پیشنهاد قیمت» تا زمان ساخته‌شدن پنل مستقل اپراتور قرار داده شده است.
const proposePrice = asyncHandler(async (req, res) => {
  const shipment = await shipmentService.proposePriceByOperator(req.params.id, req.body.operator_price);
  success(res, { message: 'قیمت پیشنهادی ثبت شد.', data: shipment });
});

const advanceStatus = asyncHandler(async (req, res) => {
  const shipment = await shipmentService.advanceStatusForTesting(req.params.id, req.body.status);
  success(res, { message: 'وضعیت به‌روزرسانی شد.', data: shipment });
});

module.exports = { proposePrice, advanceStatus };
