const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminAuditLog = sequelize.define('AdminAuditLog', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  action: { type: DataTypes.STRING(64), allowNull: false },
  entity: { type: DataTypes.STRING(40), allowNull: false },
  entityId: { type: DataTypes.STRING(40), allowNull: true },
  performedBy: { type: DataTypes.INTEGER, allowNull: true },
  details: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'admin_audit_logs',
  underscored: true,
  updatedAt: false,
});

module.exports = AdminAuditLog;
