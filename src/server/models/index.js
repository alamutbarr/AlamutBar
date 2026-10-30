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
const Admin = require('./Admin');
const OrderEvent = require('./OrderEvent');
const Alert = require('./Alert');
const Inspector = require('./Inspector');
const InspectionReport = require('./InspectionReport');
const SystemSetting = require('./SystemSetting');
const AdminAuditLog = require('./AdminAuditLog');
const DriverLocation = require('./DriverLocation');
const DriverNotice = require('./DriverNotice');

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

Driver.hasMany(DriverNotice, { foreignKey: 'driverId', as: 'notices' });
DriverNotice.belongsTo(Driver, { foreignKey: 'driverId' });

Driver.hasMany(Shipment, { foreignKey: 'driver_id', as: 'missions' });
Shipment.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });

Shipment.hasMany(Message, { foreignKey: 'shipment_id', as: 'messages' });
Message.belongsTo(Shipment, { foreignKey: 'shipment_id' });

Shipment.hasMany(OrderEvent, { foreignKey: 'shipmentId', as: 'events' });
OrderEvent.belongsTo(Shipment, { foreignKey: 'shipmentId' });
Admin.hasMany(OrderEvent, { foreignKey: 'performedByAdminId', as: 'events' });
OrderEvent.belongsTo(Admin, { foreignKey: 'performedByAdminId', as: 'actor' });

Shipment.hasMany(Alert, { foreignKey: 'shipmentId', as: 'alerts' });
Alert.belongsTo(Shipment, { foreignKey: 'shipmentId' });
Driver.hasMany(Alert, { foreignKey: 'driverId', as: 'alerts' });
Alert.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

Shipment.hasMany(InspectionReport, { foreignKey: 'shipmentId', as: 'inspections' });
InspectionReport.belongsTo(Shipment, { foreignKey: 'shipmentId' });
Inspector.hasMany(InspectionReport, { foreignKey: 'inspectorId' });
InspectionReport.belongsTo(Inspector, { foreignKey: 'inspectorId', as: 'inspector' });
Shipment.belongsTo(Inspector, { foreignKey: 'assigned_inspector_id', as: 'inspector' });

Driver.hasMany(DriverLocation, { foreignKey: 'driverId', as: 'locations' });
DriverLocation.belongsTo(Driver, { foreignKey: 'driverId' });

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
  Admin,
  OrderEvent,
  Alert,
  Inspector,
  InspectionReport,
  SystemSetting,
  AdminAuditLog,
  DriverLocation,
  DriverNotice,
};
