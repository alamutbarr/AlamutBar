const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// کاربر پایه سیستم - احراز هویت صرفاً با شماره موبایل و کد پیامکی (بدون رمز عبور)
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  phone_number: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
  },
  role: {
    type: DataTypes.ENUM('cargo_owner', 'driver', 'dispatcher', 'operator', 'security', 'admin'),
    allowNull: false,
    defaultValue: 'cargo_owner',
  },
  otp_code: {
    type: DataTypes.STRING(6),
    allowNull: true,
  },
  otp_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  otp_last_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  otp_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_phone_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  rating_avg: {
    type: DataTypes.DECIMAL(2, 1),
    defaultValue: 0,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
