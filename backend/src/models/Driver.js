// backend/src/models/Driver.js (بخش‌های مرتبط با مدل)
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// فیلدهای مدل راننده در بک‌اند
const Driver = sequelize.define('Driver', {
    phone_number: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true,
    },
    first_name: { type: DataTypes.STRING(50) },
    last_name: { type: DataTypes.STRING(50) },
    national_id: { type: DataTypes.STRING(10) },
    license_number: { type: DataTypes.STRING(10) },

    // ----- فیلدهای جدیدی که برای فرم جدید اضافه کردیم -----
    profile_step: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    smart_card_number: { type: DataTypes.STRING(7) },
    tractor_type: { type: DataTypes.STRING(50) },
    trailer_type: { type: DataTypes.STRING(50) },
    plate: { type: DataTypes.STRING(20) }
});

module.exports = Driver;