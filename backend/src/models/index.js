const sequelize = require('../config/database');
const Owner = require('./Owner');
const Driver = require('./Driver');
const Vehicle = require('./Vehicle');
const Shipment = require('./Shipment');

// تعریف روابط بین جداول (Foreign Keys)
Owner.hasMany(Shipment, { foreignKey: 'ownerId', as: 'shipments' });
Shipment.belongsTo(Owner, { foreignKey: 'ownerId', as: 'owner' });

Driver.hasMany(Vehicle, { foreignKey: 'driverId', as: 'vehicles' });
Vehicle.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

Driver.hasMany(Shipment, { foreignKey: 'driverId', as: 'missions' });
Shipment.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

// همگام‌سازی و اعمال در دیتابیس
sequelize.sync({ alter: true })
    .then(() => console.log("✅ Database tables successfully synced!"))
    .catch((err) => console.error("❌ Database sync error:", err));

module.exports = {
    sequelize,
    Owner,
    Driver,
    Vehicle,
    Shipment
};