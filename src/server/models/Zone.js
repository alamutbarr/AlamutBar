const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// محدوده/منطقه داخل هر شهر
const Zone = sequelize.define('Zone', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
}, {
  tableName: 'zones',
  timestamps: false,
});

module.exports = Zone;
