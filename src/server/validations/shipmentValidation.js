const Joi = require("joi");
const { Shipment } = require("../models");
const commonMessages = require("../utils/joiMessages");
const CARGO_TYPES = require("../../../shared/cargoTypes.json");

// امروز به وقت محلی سرور، برای مقایسه با تاریخ بارگیری
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// مقایسه‌ی صرفاً سطح «روز تقویمی» (بدون در نظر گرفتن ساعت/منطقه‌ی زمانی) تا مثلاً انتخاب «امروز» همیشه معتبر باشد
function isTodayOrLater(value, helpers) {
  const today = startOfToday();
  const inputDate = new Date(value);
  const inputDay = new Date(
    inputDate.getFullYear(),
    inputDate.getMonth(),
    inputDate.getDate(),
  );
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  if (inputDay < todayDay) {
    return helpers.message("تاریخ بارگیری نمی‌تواند در گذشته باشد.");
  }
  return value;
}

const createShipmentSchema = Joi.object({
  // مبدأ
  origin_city_id: Joi.number().integer().required().label("شهر مبدأ"),
  origin_zone_id: Joi.number()
    .integer()
    .optional()
    .allow(null)
    .label("محدوده مبدأ"),
  origin_address: Joi.string()
    .min(5)
    .max(500)
    .required()
    .label("آدرس دقیق مبدأ"),
  origin_lat: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .label("عرض جغرافیایی مبدأ"),
  origin_lng: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .label("طول جغرافیایی مبدأ"),

  // مقصد
  dest_city_id: Joi.number().integer().required().label("شهر مقصد"),
  dest_zone_id: Joi.number()
    .integer()
    .optional()
    .allow(null)
    .label("محدوده مقصد"),
  dest_address: Joi.string()
    .min(5)
    .max(500)
    .optional()
    .allow("", null)
    .label("آدرس دقیق مقصد"),
  dest_lat: Joi.number()
    .min(-90)
    .max(90)
    .optional()
    .allow(null)
    .label("عرض جغرافیایی مقصد"),

  dest_lng: Joi.number()
    .min(-180)
    .max(180)
    .optional()
    .allow(null)
    .label("طول جغرافیایی مقصد"),

  // کالا
  cargo_type: Joi.string()
    .valid(...CARGO_TYPES, "other")
    .required()
    .label("نوع کالا"),
  cargo_type_other: Joi.string()
    .max(150)
    .allow("", null)
    .label("توضیح نوع کالا")
    .when("cargo_type", {
      is: "other",
      then: Joi.string().min(2).required().messages({
        "any.required": "در صورت انتخاب «سایر»، توضیح نوع کالا الزامی است.",
      }),
    }),
  packaging_type: Joi.string().max(100).allow("", null).label("نوع بسته‌بندی"),
  weight_kg: Joi.number()
    .positive()
    .max(40000)
    .required()
    .label("وزن")
    .messages({
      "number.max":
        "وزن وارد شده بیشتر از حد مجاز (۴۰ تن) است؛ لطفاً بررسی کنید.",
    }),
  length_cm: Joi.number()
    .positive()
    .max(2000)
    .optional()
    .allow(null)
    .label("طول بار"),
  width_cm: Joi.number()
    .positive()
    .max(2000)
    .optional()
    .allow(null)
    .label("عرض بار"),
  height_cm: Joi.number()
    .positive()
    .max(2000)
    .optional()
    .allow(null)
    .label("ارتفاع بار"),

  cargo_value: Joi.number()
    .positive()
    .min(100000000)
    .max(1000000000000)
    .required()
    .label("ارزش اعلامی کالا"),
  photo_urls: Joi.array()
    .items(Joi.string())
    .max(5)
    .optional()
    .label("تصاویر کالا"),
  notes: Joi.string().max(1000).allow("", null).label("توضیحات تکمیلی"),

  // زمان و فوریت
  loading_date: Joi.date()
    .custom(isTodayOrLater)
    .required()
    .label("تاریخ بارگیری"),
  loading_time_from: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .label("ساعت شروع بارگیری"),
  loading_time_to: Joi.string()
    .pattern(/^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/)
    .required()
    .label("ساعت پایان بارگیری"),
  loading_time_ranges: Joi.array()
    .items(
      Joi.string().valid(
        "08:00-12:00",
        "12:00-16:00",
        "16:00-20:00",
        "20:00-24:00",
      ),
    )
    .min(1)
    .unique()
    .required()
    .label("بازه‌های زمانی بارگیری"),
  urgency: Joi.string()
    .valid(...Shipment.URGENCY_LEVELS)
    .required()
    .label("میزان فوریت"),

  // خودرو و بارگیری/تخلیه
  vehicle_type_id: Joi.number().integer().required().label("نوع خودرو"),
  vehicle_variants: Joi.array()
    .items(
      Joi.string().valid(
        "روباز",
        "بغل بازشو",
        "مسقف",
        "مسقف اتاق بزرگ",
        "کمپرسی",
        "یخچال‌دار",
        "کفی",
        "نیم لبه",
        "لبه‌دار",
        "ترانزیت چادری",
        "تیغه (کانتینربر)",
        "کانتینر",
        "کمرشکن",
        "بوژی",
      ),
    )
    .min(1)
    .unique()
    .required()
    .label("نوع گاری"),
  loading_method: Joi.string()
    .valid(...Shipment.HANDLING_METHODS)
    .required()
    .label("نوع بارگیری"),

  // گیرنده
  receiver_name: Joi.string().min(2).max(100).required().label("نام گیرنده"),
  receiver_phone: Joi.string()
    .pattern(/^09\d{9}$/)
    .required()
    .label("شماره تماس گیرنده")
    .messages({
      "string.pattern.base": "{{#label}} باید به‌فرم ۰۹xxxxxxxxx باشد.",
    }),
  receiver_national_id: Joi.string()
    .pattern(/^\d{10}$/)
    .allow("")
    .optional()
    .label("کد ملی گیرنده")
    .messages({
      "string.pattern.base": "کد ملی گیرنده باید دقیقاً ۱۰ رقم باشد.",
    }),

  receiver_postal_code: Joi.string()
    .allow("")
    .optional()
    .custom((value, helpers) => {
      if (value === "" || isValidIranPostalCode(value)) return value;
      return helpers.error("any.invalid");
    })
    .label("کد پستی گیرنده")
    .messages({ "any.invalid": "کد پستی گیرنده معتبر نیست." }),

  receiver_postal_code: Joi.string()
    .pattern(/^\d{1,10}$/)
    .allow("")
    .optional()
    .label("کد پستی گیرنده"),

  // قیمت پیشنهادی صاحب کالا (نه قیمت نهایی)
  proposed_price: Joi.number()
    .positive()
    .min(10000)
    .required()
    .label("کرایه پیشنهادی")
    .messages({
      "number.min":
        "کرایه پیشنهادی خیلی پایین به‌نظر می‌رسد؛ لطفاً بررسی کنید.",
    }),
})
  .custom((value, helpers) => {
    if (value.loading_time_from >= value.loading_time_to) {
      return helpers.message("ساعت پایان بارگیری باید بعد از ساعت شروع باشد.");
    }
    // ساعت شروع/پایان باید با اولین شروع و آخرین پایان بازه‌های انتخابی برابر باشد
    const ranges = Array.isArray(value.loading_time_ranges)
      ? [...value.loading_time_ranges].sort()
      : [];
    if (
      ranges.length &&
      (value.loading_time_from !== ranges[0].split("-")[0] ||
        value.loading_time_to !== ranges[ranges.length - 1].split("-")[1])
    ) {
      return helpers.message(
        "بازه‌های زمانی بارگیری با ساعت شروع و پایان هم‌خوانی ندارند.",
      );
    }
    return value;
  })
  .messages(commonMessages);

const respondPriceSchema = Joi.object({
  action: Joi.string().valid("accept", "reject").required().label("نوع پاسخ"),
}).messages(commonMessages);

const cancelShipmentSchema = Joi.object({
  cancel_reason: Joi.string().min(5).max(500).required().label("دلیل لغو"),
}).messages(commonMessages);

const proposePriceSchema = Joi.object({
  operator_price: Joi.number().positive().required().label("قیمت نهایی"),
}).messages(commonMessages);

const advanceStatusSchema = Joi.object({
  status: Joi.string()
    .valid("driver_assigned", "at_pickup", "in_transit", "delivered")
    .required()
    .label("وضعیت"),
}).messages(commonMessages);

module.exports = {
  createShipmentSchema,
  respondPriceSchema,
  cancelShipmentSchema,
  proposePriceSchema,
  advanceStatusSchema,
};
