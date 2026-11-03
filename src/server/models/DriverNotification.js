const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// اعلان‌های درون‌برنامه‌ای راننده (هم‌ساختار اعلان‌های صاحب کالا)
const DriverNotification = sequelize.define('DriverNotification', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  driverId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  shipmentId: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING(150), allowNull: false },
  message: { type: DataTypes.STRING(500), allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'driver_notifications', underscored: true });

module.exports = DriverNotification;
