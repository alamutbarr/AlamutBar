const { CargoOwner } = require("../models");
const { isValidNationalId } = require("../utils/nationalId");

// حساب‌های فاقد کد ملی معتبر نمی‌توانند از APIهای اصلی استفاده کنند
module.exports = async function requireNationalId(req, res, next) {
  try {
    const owner = await CargoOwner.findOne({ where: { user_id: req.user.id } });
    if (!owner || !isValidNationalId(owner.national_id)) {
      return res.status(403).json({
        success: false,
        message: "وارد کردن کد ملی معتبر برای ادامه الزامی است.",
        code: "NATIONAL_ID_REQUIRED",
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
