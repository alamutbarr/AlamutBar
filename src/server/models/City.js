const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// فهرست شهرها - مبنای انتخاب ساختاریافته مبدأ/مقصد
const City = sequelize.define(
  "City",
  {
    id: {
      // BIGINT: شناسه‌های مرجع شهرهای ایران در iranCities.json بزرگ‌تر از محدوده‌ی INT هستند
      // (مثلاً 1180001001517) و با INT به‌صورت خاموش truncate می‌شدند و باعث حذف نامرئی شهرها می‌شدند.
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    province: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "",
    },
  },
  {
    tableName: "cities",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["name", "province"],
      },
    ],
  },
);

module.exports = City;
