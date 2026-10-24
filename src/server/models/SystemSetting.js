const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemSetting = sequelize.define('SystemSetting', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  key: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  value: { type: DataTypes.TEXT, allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: true },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'system_settings', underscored: true });

module.exports = SystemSetting;
