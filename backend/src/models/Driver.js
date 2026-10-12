const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Driver = sequelize.define('Driver', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true, // <--- این خط مشکل را حل می‌کند
    },
    phone_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    first_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    company_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    national_id: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    license_number: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
}, {
    tableName: 'drivers',
    timestamps: true,
});

module.exports = Driver;
