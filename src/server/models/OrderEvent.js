const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderEvent = sequelize.define('OrderEvent', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  shipmentId: { type: DataTypes.INTEGER, allowNull: false },
  eventType: { type: DataTypes.STRING(40), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  performedByAdminId: { type: DataTypes.INTEGER, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
  lat: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
}, {
  tableName: 'order_events',
  underscored: true,
  updatedAt: false,
  indexes: [{ fields: ['shipment_id', 'created_at'] }],
});

module.exports = OrderEvent;
