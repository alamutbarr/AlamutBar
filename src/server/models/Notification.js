const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// اعلان‌های درون‌برنامه‌ای کاربر (مشاهده اعلان‌ها)
const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  shipment_id: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING(150), allowNull: false },
  message: { type: DataTypes.STRING(500), allowNull: false },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'notifications',
  timestamps: true,
});

module.exports = Notification;
