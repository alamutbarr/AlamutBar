const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inspector = sequelize.define('Inspector', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  fullName: { type: DataTypes.STRING(80), allowNull: false },
  phone: { type: DataTypes.STRING(15), allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  otpCode: { type: DataTypes.STRING(6), allowNull: true },
  otpExpiresAt: { type: DataTypes.DATE, allowNull: true },
  otpLastSentAt: { type: DataTypes.DATE, allowNull: true },
  otpAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  refreshTokenHash: { type: DataTypes.STRING(64), allowNull: true },
}, { tableName: 'inspectors', underscored: true });

module.exports = Inspector;
