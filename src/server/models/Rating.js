const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// امتیازدهی صاحب کالا به راننده/متصدی پس از پایان مأموریت
const Rating = sequelize.define('Rating', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  shipment_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  owner_id: { type: DataTypes.INTEGER, allowNull: false },
  driver_score: { type: DataTypes.INTEGER, allowNull: true }, // 1 تا 5
  dispatcher_score: { type: DataTypes.INTEGER, allowNull: true },
  comment: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'ratings',
  timestamps: true,
});

module.exports = Rating;
