const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionReport = sequelize.define('InspectionReport', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  shipmentId: { type: DataTypes.INTEGER, allowNull: false },
  inspectorId: { type: DataTypes.INTEGER, allowNull: true },
  assignedByAdminId: { type: DataTypes.INTEGER, allowNull: true },
  checklist: { type: DataTypes.JSON, allowNull: true },
  photos: { type: DataTypes.JSON, allowNull: true },
  weightEmpty: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  weightFull: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  weightNet: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  discrepancies: { type: DataTypes.JSON, allowNull: true },
  decision: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PENDING' },
  decisionNote: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'inspection_reports', underscored: true });

module.exports = InspectionReport;
