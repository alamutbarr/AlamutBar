const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  shipment_id: { type: DataTypes.INTEGER, allowNull: false },
  channel: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'owner_operator' },
  sender_role: { type: DataTypes.STRING(20), allowNull: false },
  sender_id: { type: DataTypes.INTEGER, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'messages', underscored: true });

module.exports = Message;
