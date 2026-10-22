const sequelize = require('../config/database');
const Owner = require('./Owner');
const Driver = require('./Driver');
const Shipment = require('./Shipment');

// owners 1---* shipments
// drivers 1---* shipments (a shipment may still be unassigned)
Owner.hasMany(Shipment, { foreignKey: 'ownerId', as: 'shipments' });
Shipment.belongsTo(Owner, { foreignKey: 'ownerId', as: 'owner' });

Driver.hasMany(Shipment, { foreignKey: 'driverId', as: 'missions' });
Shipment.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

// Create missing tables only. alter:true rewrites indexes on every boot and
// was the source of the duplicate-index failures.
const syncPromise = sequelize.sync()
  .then(() => console.log('جداول دیتابیس همگام‌سازی شدند.'))
  .catch((err) => {
    console.error('خطا در همگام‌سازی دیتابیس:', err.message || err);
    throw err;
  });

module.exports = {
  sequelize,
  Owner,
  Driver,
  Shipment,
  syncPromise,
};
