const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { urlList } = require('../utils/jsonList');

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
  evidence_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      return urlList(this.getDataValue('evidence_url'));
    },
    set(value) {
      const urls = urlList(value);
      this.setDataValue('evidence_url', urls.length ? JSON.stringify(urls) : null);
    },
  },
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
