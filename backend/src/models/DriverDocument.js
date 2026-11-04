const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// یک ردیف به‌ازای هر عکس مدرک احراز هویت راننده (گواهینامه، عکس شخصی، کارت ملی،
// کارت خودرو و ...). عکس به‌صورت Data URL فشرده‌شده ذخیره می‌شود تا پنل اپراتور
// بتواند مدارک را از سمت سرور بخواند (برخلاف نسخه‌ی قبلی که فقط در localStorage
// مرورگر راننده نگه‌داری می‌شد و اپراتور هیچ مدرکی نمی‌دید).
const DriverDocument = sequelize.define('DriverDocument', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  driverId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  // شناسه‌ی بخش مدرک: driverLicense | selfie | nationalCard | vehicleCard
  section: {
    type: DataTypes.STRING(40),
    allowNull: false,
  },
  // شناسه‌ی جایگاه درون بخش: front | back | selfie
  slot: {
    type: DataTypes.STRING(40),
    allowNull: false,
  },
  mimeType: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'image/jpeg',
  },
  // تصویر فشرده‌شده به شکل data:image/jpeg;base64,...
  imageData: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
}, {
  tableName: 'driver_documents',
  indexes: [
    { unique: true, fields: ['driver_id', 'section', 'slot'] },
    { fields: ['driver_id'] },
  ],
});

module.exports = DriverDocument;
