const { sequelize } = require('../config/database');
const User = require('./User');
const CargoOwner = require('./CargoOwner');
const City = require('./City');
const Zone = require('./Zone');
const VehicleType = require('./VehicleType');
const Shipment = require('./Shipment');
const Notification = require('./Notification');
const Complaint = require('./Complaint');
const Rating = require('./Rating');
const Driver = require('./Driver');
const Message = require('./Message');

// User <-> CargoOwner (۱ به ۱)
User.hasOne(CargoOwner, { foreignKey: 'user_id', onDelete: 'CASCADE' });
CargoOwner.belongsTo(User, { foreignKey: 'user_id' });

// City <-> Zone (۱ به چند)
City.hasMany(Zone, { foreignKey: 'city_id', as: 'zones', onDelete: 'CASCADE' });
Zone.belongsTo(City, { foreignKey: 'city_id' });

// User <-> Shipment (۱ به چند - صاحب کالا)
User.hasMany(Shipment, { foreignKey: 'owner_id', as: 'shipments' });
Shipment.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// VehicleType <-> Shipment
VehicleType.hasMany(Shipment, { foreignKey: 'vehicle_type_id' });
Shipment.belongsTo(VehicleType, { foreignKey: 'vehicle_type_id', as: 'vehicleType' });

// City/Zone <-> Shipment (مبدأ و مقصد)
Shipment.belongsTo(City, { foreignKey: 'origin_city_id', as: 'originCity' });
Shipment.belongsTo(Zone, { foreignKey: 'origin_zone_id', as: 'originZone' });
Shipment.belongsTo(City, { foreignKey: 'dest_city_id', as: 'destCity' });
Shipment.belongsTo(Zone, { foreignKey: 'dest_zone_id', as: 'destZone' });

// Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id' });
Shipment.hasMany(Notification, { foreignKey: 'shipment_id' });
Notification.belongsTo(Shipment, { foreignKey: 'shipment_id' });

// Complaint
User.hasMany(Complaint, { foreignKey: 'owner_id', as: 'complaints' });
Complaint.belongsTo(User, { foreignKey: 'owner_id' });
Shipment.hasMany(Complaint, { foreignKey: 'shipment_id' });
Complaint.belongsTo(Shipment, { foreignKey: 'shipment_id' });

// Rating
Shipment.hasOne(Rating, { foreignKey: 'shipment_id', as: 'rating' });
Rating.belongsTo(Shipment, { foreignKey: 'shipment_id' });
User.hasMany(Rating, { foreignKey: 'owner_id' });
Rating.belongsTo(User, { foreignKey: 'owner_id' });

Driver.hasMany(Shipment, { foreignKey: 'driver_id', as: 'missions' });
Shipment.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });

Shipment.hasMany(Message, { foreignKey: 'shipment_id', as: 'messages' });
Message.belongsTo(Shipment, { foreignKey: 'shipment_id' });

module.exports = {
  sequelize,
  User,
  CargoOwner,
  City,
  Zone,
  VehicleType,
  Shipment,
  Notification,
  Complaint,
  Rating,
  Driver,
  Message,
};
