const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// پروفایل تکمیلی صاحب کالا (رابطه یک‌به‌یک با User)
const CargoOwner = sequelize.define(
  "CargoOwner",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    company_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    national_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    // مسیر عکس پروفایل (مثلاً /uploads/123.jpg)؛ اگر خالی باشد فرانت آواتار حروف اول نام را نشان می‌دهد
    avatar_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    require_inspector: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    price_ceiling: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    verification_status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    verification_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    postal_code: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    kyc: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "cargo_owners",
    timestamps: true,
  },
);

module.exports = CargoOwner;
