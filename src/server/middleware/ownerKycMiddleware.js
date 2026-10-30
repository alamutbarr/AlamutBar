const { CargoOwner } = require("../models");
const ownerKyc = require("../admin/ownerKyc");

// ثبت بار فقط پس از تأیید هویت صاحب‌کالا
module.exports = async function requireOwnerKyc(req, res, next) {
  try {
    const owner = await CargoOwner.findOne({ where: { user_id: req.user.id } });
    const message = ownerKyc.shipmentGateMessage(owner?.kyc, owner?.verification_status);
    if (message) {
      return res.status(400).json({
        success: false,
        message,
        code: "KYC_REQUIRED",
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
