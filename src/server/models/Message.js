const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  shipment_id: { type: DataTypes.INTEGER, allowNull: false },
  sender_role: { type: DataTypes.ENUM('owner', 'driver'), allowNull: false },
  sender_id: { type: DataTypes.INTEGER, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'messages', underscored: true });

module.exports = Message;
