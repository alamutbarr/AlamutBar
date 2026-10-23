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
// Sync must not start at import time: legacy columns have to be renamed or
// added first, otherwise addIndex looks for driver_id and MySQL rejects the boot.
function syncModels() {
  return sequelize.sync()
    .then((result) => {
      console.log('جداول دیتابیس همگام‌سازی شدند.');
      return result;
    })
    .catch((err) => {
      console.error('خطا در همگام‌سازی دیتابیس:', err.message || err);
      throw err;
    });
}

module.exports = {
  sequelize,
  Owner,
  Driver,
  Shipment,
  syncModels,
};
