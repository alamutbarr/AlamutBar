const Joi = require("joi");
const commonMessages = require("../utils/joiMessages");

const phoneSchema = Joi.string()
  .pattern(/^09\d{9}$/)
  .required()
  .label("شماره موبایل")
  .messages({
    "string.pattern.base": "{{#label}} باید به‌فرم ۰۹xxxxxxxxx باشد.",
  });

// کد ملی: دقیقاً ۱۰ رقم، بدون رقم کنترل
const nationalIdSchema = Joi.string()
  .pattern(/^\d{10}$/)
  .label("کد ملی")
  .messages({
    "string.pattern.base": "{{#label}} باید دقیقاً ۱۰ رقم باشد.",
  });

const requestOtpSchema = Joi.object({
  phone_number: phoneSchema,
}).messages(commonMessages);

const verifyOtpSchema = Joi.object({
  phone_number: phoneSchema,
  otp_code: Joi.string()
    .length(5)
    .pattern(/^\d+$/)
    .required()
    .label("کد تأیید")
    .messages({ "string.pattern.base": "{{#label}} باید فقط شامل عدد باشد." }),
  // فقط برای کاربر جدید الزامی است؛ در سرویس بررسی می‌شود
  first_name: Joi.string().max(50).allow("", null).label("نام"),
  last_name: Joi.string().max(50).allow("", null).label("نام خانوادگی"),
  company_name: Joi.string().max(100).allow("", null).label("نام شرکت"),
  // کد ملی: در Joi اختیاری (برای کاربران قدیمی که هنوز ندارند)، اجبارش در auth.service.js انجام می‌شود
  national_id: nationalIdSchema.allow("", null),
}).messages(commonMessages);

// ویرایش پروفایل: فیلدهای ارسال‌شده تغییر می‌کنند (شماره موبایل قابل ویرایش نیست)
// national_id بدون .allow(""): اگر ارسال شود باید معتبر باشد و رشته‌ی خالی رد می‌شود
const updateProfileSchema = Joi.object({
  first_name: Joi.string().trim().max(50).label("نام"),
  last_name: Joi.string().trim().max(50).label("نام خانوادگی"),
  company_name: Joi.string().trim().max(100).allow("", null).label("نام شرکت"),
  national_id: nationalIdSchema,
  // فقط مسیرهایی که خودِ endpoint آپلود برگردانده؛ لینک دلخواه خارجی پذیرفته نمی‌شود
  avatar_url: Joi.string()
    .pattern(/^\/uploads\/[\w.-]+$/)
    .max(255)
    .allow("", null)
    .label("عکس پروفایل"),
}).messages(commonMessages);

module.exports = { requestOtpSchema, verifyOtpSchema, updateProfileSchema };
