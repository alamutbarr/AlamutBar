const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Shipment = sequelize.define('Shipment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    trackingCode: { type: DataTypes.STRING, unique: true, allowNull: false },

    // مبدأ
    // BIGINT: شناسه‌های شهرهای ایران در منبع iranCities.json بزرگ‌تر از محدوده‌ی
    // INT هستند (مثلاً 1000001001101) و با INTEGER به‌صورت خاموش truncate می‌شدند.
    originCityId: { type: DataTypes.BIGINT },
    originZoneId: { type: DataTypes.INTEGER },
    originCity: { type: DataTypes.STRING },
    originArea: { type: DataTypes.STRING },
    originLat: { type: DataTypes.FLOAT },
    originLng: { type: DataTypes.FLOAT },
    originAddress: { type: DataTypes.TEXT },

    // مقصد
    destCityId: { type: DataTypes.BIGINT },
    destZoneId: { type: DataTypes.INTEGER },
    destCity: { type: DataTypes.STRING },
    destArea: { type: DataTypes.STRING },
    destLat: { type: DataTypes.FLOAT },
    destLng: { type: DataTypes.FLOAT },
    destAddress: { type: DataTypes.TEXT },
    visibleDestinationExact: { type: DataTypes.BOOLEAN, defaultValue: false },

    // کالا
    cargoType: { type: DataTypes.STRING },
    cargoDetails: { type: DataTypes.TEXT },
    weightKg: { type: DataTypes.FLOAT },
    lengthCm: { type: DataTypes.FLOAT },
    widthCm: { type: DataTypes.FLOAT },
    heightCm: { type: DataTypes.FLOAT },
    cargoValue: { type: DataTypes.FLOAT },
    cargoPacking: { type: DataTypes.STRING },
    cargoSensitive: { type: DataTypes.BOOLEAN, defaultValue: false },

    // ناوگان و زمان
    loadingDate: { type: DataTypes.DATE },
    pickupFrom: { type: DataTypes.STRING },
    pickupTo: { type: DataTypes.STRING },
    vehicleTypeRequired: { type: DataTypes.STRING },
    vehicleVariants: { type: DataTypes.JSON },
    loadingMethod: { type: DataTypes.STRING },

    // گیرنده
    receiverName: { type: DataTypes.STRING },
    receiverPhone: { type: DataTypes.STRING },
    receiverNationalId: { type: DataTypes.STRING },
    receiverPostalCode: { type: DataTypes.STRING },

    // مالی
    proposedPrice: { type: DataTypes.FLOAT },
    operatorPrice: { type: DataTypes.FLOAT },
    price: { type: DataTypes.FLOAT },

    // وضعیت و فرآیند
    flag: { type: DataTypes.STRING, defaultValue: 'normal' },
    status: { type: DataTypes.STRING, defaultValue: 'pending_review' },

    offerExpiresAt: { type: DataTypes.DATE },
    distanceKm: { type: DataTypes.FLOAT },
    estimatedHours: { type: DataTypes.FLOAT },
    driverConfirmedAt: { type: DataTypes.DATE },
    waybillIssuedAt: { type: DataTypes.DATE },
    moveStartedAt: { type: DataTypes.DATE },
    pickupEta: { type: DataTypes.DATE },
    completedAt: { type: DataTypes.DATE },
    cancelledAt: { type: DataTypes.DATE },
    cancelReason: { type: DataTypes.TEXT },

    // POD (اسناد تحویل)
    otpState: { type: DataTypes.STRING, defaultValue: 'not_requested' },
    photosUploaded: { type: DataTypes.INTEGER, defaultValue: 0 },
    podPhotos: { type: DataTypes.JSON },
    cargoPhotoUrls: { type: DataTypes.JSON },
    notes: { type: DataTypes.TEXT },
    podExceptionReason: { type: DataTypes.TEXT },
    deliveredAt: { type: DataTypes.DATE }
});

module.exports = Shipment;