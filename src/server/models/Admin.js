const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Admin = sequelize.define('Admin', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  phone: { type: DataTypes.STRING(15), allowNull: false, unique: true },
  fullName: { type: DataTypes.STRING(80), allowNull: false },
  roles: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  otpCode: { type: DataTypes.STRING(6), allowNull: true },
  otpExpiresAt: { type: DataTypes.DATE, allowNull: true },
  otpLastSentAt: { type: DataTypes.DATE, allowNull: true },
  otpAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  refreshTokenHash: { type: DataTypes.STRING(64), allowNull: true },
}, { tableName: 'admins', underscored: true });

module.exports = Admin;
