const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DriverLocation = sequelize.define('DriverLocation', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  driverId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  shipmentId: { type: DataTypes.INTEGER, allowNull: true },
  lat: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
  lng: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
  recordedAt: { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: 'driver_locations',
  underscored: true,
  updatedAt: false,
  indexes: [{ fields: ['driver_id', 'recorded_at'] }],
});

module.exports = DriverLocation;
