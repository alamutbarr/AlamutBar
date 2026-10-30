const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DriverNotice = sequelize.define('DriverNotice', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  driverId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  title: { type: DataTypes.STRING(150), allowNull: false },
  message: { type: DataTypes.STRING(500), allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'driver_notices', underscored: true });

module.exports = DriverNotice;
