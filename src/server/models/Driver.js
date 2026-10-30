const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  phoneNumber: { type: DataTypes.STRING(15), allowNull: false, unique: true },
  firstName: { type: DataTypes.STRING(50), allowNull: false },
  lastName: { type: DataTypes.STRING(50), allowNull: false },
  nationalId: { type: DataTypes.STRING(10), allowNull: false },
  licenseNumber: { type: DataTypes.STRING(10), allowNull: false },
  profileStep: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  smartCardNumber: { type: DataTypes.STRING(7) },
  tractorType: { type: DataTypes.STRING(50) },
  trailerType: { type: DataTypes.STRING(50) },
  plate: { type: DataTypes.STRING(20) },
  verificationStatus: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'PENDING_VERIFICATION' },
  availability: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'OFFLINE' },
  rejectionReason: { type: DataTypes.TEXT, allowNull: true },
  documents: { type: DataTypes.JSON, allowNull: true },
  performanceStats: { type: DataTypes.JSON, allowNull: true },
  lastLat: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  lastLng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  lastLocationAt: { type: DataTypes.DATE, allowNull: true },
  isGpsActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  expoPushToken: { type: DataTypes.STRING(255), allowNull: true },
  pushPlatform: { type: DataTypes.STRING(16), allowNull: true },
  refreshTokenHash: { type: DataTypes.STRING(64), allowNull: true },
  vehicleSpecs: {
    type: DataTypes.TEXT,
    get() {
      const raw = this.getDataValue('vehicleSpecs');
      if (!raw) return null;
      try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        return null;
      }
    },
    set(value) {
      if (value == null || value === '') {
        this.setDataValue('vehicleSpecs', null);
        return;
      }
      this.setDataValue('vehicleSpecs', typeof value === 'string' ? value : JSON.stringify(value));
    },
  },
}, { tableName: 'drivers', underscored: true });

module.exports = Driver;
