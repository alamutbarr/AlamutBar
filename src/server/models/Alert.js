const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Alert = sequelize.define('Alert', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  type: { type: DataTypes.STRING(32), allowNull: false },
  shipmentId: { type: DataTypes.INTEGER, allowNull: true },
  driverId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  severity: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'warning' },
  message: { type: DataTypes.TEXT, allowNull: false },
  isResolved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  resolvedByAdminId: { type: DataTypes.INTEGER, allowNull: true },
  resolutionAction: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'alerts',
  underscored: true,
  indexes: [{ name: 'alerts_shipment_id_is_resolved', fields: ['shipment_id', 'is_resolved'] }],
});

module.exports = Alert;
