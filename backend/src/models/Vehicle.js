const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    type: { type: DataTypes.STRING },
    typeName: { type: DataTypes.STRING },
    plate: { type: DataTypes.STRING },
    capacityTons: { type: DataTypes.FLOAT },
    volumeM3: { type: DataTypes.FLOAT },
    verifiedStatus: { type: DataTypes.STRING, defaultValue: 'pending' },
    active: { type: DataTypes.BOOLEAN, defaultValue: false },
    axleCount: { type: DataTypes.INTEGER },
    fuelType: { type: DataTypes.STRING },
    year: { type: DataTypes.INTEGER },
    insuranceExpiry: { type: DataTypes.STRING }
});

module.exports = Vehicle;