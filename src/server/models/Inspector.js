const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inspector = sequelize.define('Inspector', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  fullName: { type: DataTypes.STRING(80), allowNull: false },
  phone: { type: DataTypes.STRING(15), allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'inspectors', underscored: true });

module.exports = Inspector;
