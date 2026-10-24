const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// وضعیت‌های واقعی چرخه‌ی یک محموله، منطبق با فلوچارت اصلی پروژه
const SHIPMENT_STATUSES = [
  "pending_review", // در انتظار بررسی اپراتور
  "rejected", // رد شده توسط اپراتور
  "price_proposed", // اپراتور قیمت نهایی را پیشنهاد داده - منتظر پاسخ صاحب کالا
  "searching_driver", // در حال ارسال به رانندگان مناسب
  "driver_assigned", // راننده تأیید شد
  "at_pickup", // راننده/متصدی به محل بارگیری رسیدند
  "in_transit", // در حال حمل
  "delivered", // بار تحویل داده شد - منتظر تأیید صاحب کالا
  "completed", // صاحب کالا تحویل را تأیید کرد - مأموریت پایان یافت
  "cancelled", // لغو شده
];

const URGENCY_LEVELS = ["urgent", "today", "tomorrow", "scheduled"];
const HANDLING_METHODS = ["forklift", "crane", "manual", "ramp", "other"];

const Shipment = sequelize.define(
  "Shipment",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tracking_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },

    // مرحله ۱: مبدأ
    origin_city_id: { type: DataTypes.BIGINT, allowNull: false },
    origin_zone_id: { type: DataTypes.INTEGER, allowNull: true },
    origin_address: { type: DataTypes.TEXT, allowNull: false }, // تا تأیید راننده مخفی می‌ماند
    origin_lat: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
    origin_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: false },

    // مرحله ۲: مقصد
    dest_city_id: { type: DataTypes.BIGINT, allowNull: false },
    dest_zone_id: { type: DataTypes.INTEGER, allowNull: true },
    dest_address: { type: DataTypes.TEXT, allowNull: true }, // فقط بعد از صدور بارنامه نمایش داده می‌شود
    dest_lat: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
    dest_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },

    // مرحله ۳: مشخصات کالا
    cargo_type: { type: DataTypes.STRING(50), allowNull: false },
    cargo_type_other: { type: DataTypes.STRING(100), allowNull: true },
    packaging_type: { type: DataTypes.STRING(50), allowNull: true },
    weight_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    length_cm: { type: DataTypes.INTEGER, allowNull: true },
    width_cm: { type: DataTypes.INTEGER, allowNull: true },
    height_cm: { type: DataTypes.INTEGER, allowNull: true },

    // مرحله ۴: ارزش کالا (بیمه)
    cargo_value: { type: DataTypes.BIGINT, allowNull: false },

    // مرحله ۵: عکس (حداکثر ۵ عدد، اختیاری)
    photo_urls: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

    // مرحله ۶: توضیحات تکمیلی (اختیاری)
    notes: { type: DataTypes.TEXT, allowNull: true },

    // مرحله ۷: زمان و فوریت
    loading_date: { type: DataTypes.DATEONLY, allowNull: false },
    loading_time_from: { type: DataTypes.STRING(5), allowNull: false }, // "08:00"
    loading_time_to: { type: DataTypes.STRING(5), allowNull: false }, // "18:00"
    // همه‌ی بازه‌های انتخابی کاربر، مثلاً ["08:00-12:00", "16:00-20:00"]
    loading_time_ranges: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    urgency: {
      type: DataTypes.ENUM(...URGENCY_LEVELS),
      allowNull: false,
      defaultValue: "scheduled",
    },

    // مرحله ۸: نوع خودرو
    vehicle_type_id: { type: DataTypes.INTEGER, allowNull: false },
    vehicle_variant: { type: DataTypes.STRING(50), allowNull: true }, // legacy single selection
    vehicle_variants: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

    // مرحله ۱۰ و ۱۱: نوع بارگیری/تخلیه
    loading_method: {
      type: DataTypes.ENUM(...HANDLING_METHODS),
      allowNull: false,
    },
    unloading_method: {
      type: DataTypes.ENUM(...HANDLING_METHODS),
      allowNull: true,
    },

    // اطلاعات گیرنده
    // اطلاعات گیرنده
    receiver_name: { type: DataTypes.STRING(100), allowNull: false },
    receiver_phone: { type: DataTypes.STRING(15), allowNull: false },
    receiver_national_id: { type: DataTypes.STRING(10), allowNull: true },
    receiver_postal_code: { type: DataTypes.STRING(10), allowNull: true },

    // قیمت‌گذاری: صاحب کالا فقط پیشنهاد می‌دهد؛ قیمت نهایی را اپراتور تعیین می‌کند
    proposed_price: { type: DataTypes.BIGINT, allowNull: false },
    operator_price: { type: DataTypes.BIGINT, allowNull: true },
    price_status: {
      type: DataTypes.ENUM("pending", "proposed", "accepted", "rejected"),
      defaultValue: "pending",
    },

    status: {
      type: DataTypes.ENUM(...SHIPMENT_STATUSES),
      defaultValue: "pending_review",
    },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    cancel_reason: { type: DataTypes.TEXT, allowNull: true },
    cancelled_by: {
      type: DataTypes.ENUM("owner", "operator"),
      allowNull: true,
    },

    // برای جلوگیری از ارسال تکراری یادآوری «۲۴ ساعت قبل از بارگیری»
    reminder_sent_at: { type: DataTypes.DATE, allowNull: true },

    owner_id: { type: DataTypes.INTEGER, allowNull: false },
    driver_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // وضعیت ریز پنل راننده (Accepted، InTransit، ...). وضعیت صاحب کالا در status می‌ماند.
    driver_status: { type: DataTypes.STRING(40), allowNull: true },
    declined_by: { type: DataTypes.JSON, allowNull: true },

    // چرخه دوازده‌مرحله‌ای پنل ادمین. status برای پنل صاحب کالا دست نمی‌خورد.
    workflow_status: { type: DataTypes.STRING(40), allowNull: true },
    eta: { type: DataTypes.DATE, allowNull: true },
    assigned_inspector_id: { type: DataTypes.INTEGER, allowNull: true },
    waybill_number: { type: DataTypes.STRING(40), allowNull: true },
    delivery_otp: { type: DataTypes.STRING(8), allowNull: true },
    final_price: { type: DataTypes.BIGINT, allowNull: true },
    penalty_amount: { type: DataTypes.BIGINT, allowNull: true },
    delay_minutes: { type: DataTypes.INTEGER, allowNull: true },
    force_majeure: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    force_majeure_reason: { type: DataTypes.TEXT, allowNull: true },
    deviation_since: { type: DataTypes.DATE, allowNull: true },
    origin_arrived_at: { type: DataTypes.DATE, allowNull: true },
    dest_arrived_at: { type: DataTypes.DATE, allowNull: true },
    priority_score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    requires_inspector: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    replaced_from_driver_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "shipments",
    timestamps: true,
  },
);

Shipment.STATUSES = SHIPMENT_STATUSES;
Shipment.URGENCY_LEVELS = URGENCY_LEVELS;
Shipment.HANDLING_METHODS = HANDLING_METHODS;

module.exports = Shipment;
