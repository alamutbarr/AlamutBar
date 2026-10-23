const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// انواع خودرو - قابل مدیریت از پنل مدیریت (مرحله ۸ فرم ثبت بار)
const VehicleType = sequelize.define('VehicleType', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  max_weight_kg: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  max_length_cm: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  max_width_cm: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  max_height_cm: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  base_price: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'vehicle_types',
  timestamps: false,
});

module.exports = VehicleType;
