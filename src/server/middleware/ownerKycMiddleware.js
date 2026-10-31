const { CargoOwner } = require("../models");
const ownerKyc = require("../admin/ownerKyc");

// ثبت بار فقط پس از تأیید هویت صاحب‌کالا
module.exports = async function requireOwnerKyc(req, res, next) {
  try {
    const owner = await CargoOwner.findOne({ where: { user_id: req.user.id } });
    const kycMessage = ownerKyc.shipmentGateMessage(owner?.kyc, owner?.verification_status);
    if (kycMessage) {
      return res.status(400).json({
        success: false,
        message: kycMessage,
        code: "KYC_REQUIRED",
      });
    }
    const postalMessage = ownerKyc.postalCodeGateMessage(owner?.postal_code);
    if (postalMessage) {
      return res.status(400).json({
        success: false,
        message: postalMessage,
        code: "POSTAL_CODE_REQUIRED",
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
