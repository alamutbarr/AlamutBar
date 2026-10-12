const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Owner = sequelize.define('Owner', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    companyName: { type: DataTypes.STRING },
    nationalId: { type: DataTypes.STRING, unique: true },
    phoneNumber: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    avatarUrl: { type: DataTypes.STRING },
});

module.exports = Owner;