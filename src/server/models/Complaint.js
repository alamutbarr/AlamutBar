const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ثبت شکایت / گزارش تخلف توسط صاحب کالا
const Complaint = sequelize.define('Complaint', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  owner_id: { type: DataTypes.INTEGER, allowNull: false },
  shipment_id: { type: DataTypes.INTEGER, allowNull: true },
  type: {
    type: DataTypes.ENUM('driver', 'dispatcher', 'cargo', 'delay', 'other'),
    allowNull: false,
  },
  description: { type: DataTypes.TEXT, allowNull: false },
  evidence_url: { type: DataTypes.STRING(255), allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'reviewed', 'resolved', 'rejected'),
    defaultValue: 'pending',
  },
  admin_response: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'complaints',
  timestamps: true,
});

module.exports = Complaint;
