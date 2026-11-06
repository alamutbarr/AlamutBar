const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ComplaintMessage = sequelize.define('ComplaintMessage', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  complaint_id: { type: DataTypes.INTEGER, allowNull: false },
  sender_role: { type: DataTypes.STRING(20), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'complaint_messages',
  underscored: true,
});

module.exports = ComplaintMessage;
