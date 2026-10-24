const express = require('express');
const { Op } = require('sequelize');
const { authMiddleware } = require('../middleware/auth');
const { Shipment, Driver, City, VehicleType, Zone } = require('../models');
const { canRevealExactDestination } = require('../mobile/missionPolicy');
const { applyLegacyDriverStatus } = require('../mobile/driverActions');
const { filterNearbyMissions, filterMissionsByRoute } = require('../services/missionSearch');
const { resolveDriverProvince } = require('../services/geocoding');

const router = express.Router();

const includes = [
  { model: City, as: 'originCity' },
  { model: Zone, as: 'originZone' },
  { model: City, as: 'destCity' },
  { model: Zone, as: 'destZone' },
  { model: VehicleType, as: 'vehicleType' },
];

function toPanelDriver(row) {
  const d = row.toJSON();
  const name = [d.firstName, d.lastName].filter(Boolean).join(' ').trim();
  return {
    id: d.id,
    name: name || 'راننده',
    mobile: d.phoneNumber,
    phone_number: d.phoneNumber,
    nationalCode: d.nationalId || '',
    licenseNumber: d.licenseNumber || '',
    plate: d.plate || '',
    tractorType: d.tractorType || '',
    trailerType: d.trailerType || '',
    verifiedStatus: 'pending',
    rating: 5,
    totalMissions: 0,
    joinedDate: d.createdAt ? new Date(d.createdAt).toLocaleDateString('fa-IR') : '',
    sessionPolicy: 'persistent',
  };
}

function driverFacingStatus(row) {
  if (row.driver_status) return row.driver_status;
  if (row.status === 'cancelled') return 'Cancelled';
  if (row.status === 'completed' || row.status === 'delivered') return 'Completed';
  if (row.status === 'in_transit') return 'InTransit';
  if (row.status === 'at_pickup') return 'ArrivedPickup';
  if (row.driver_id) return 'Accepted';
  return 'Offered';
}

function toMissionDto(row) {
  const d = row.toJSON ? row.toJSON() : row;
  const status = driverFacingStatus(d);
  const weight = d.weight_kg != null ? Number(d.weight_kg) : null;
  return {
    id: d.id,
    code: d.tracking_code,
    originCity: d.originCity?.name,
    originArea: [d.originZone?.name, d.originCity?.province].filter(Boolean).join(' · '),
    originLocation: d.origin_lat != null && d.origin_lng != null
      ? { lat: Number(d.origin_lat), lng: Number(d.origin_lng) }
      : undefined,
    destCity: d.destCity?.name,
    destArea: [d.destZone?.name, d.destCity?.province].filter(Boolean).join(' · '),
    destExact: canRevealExactDestination({
      driverStatus: status,
      legacyStatus: d.status,
      workflowStatus: d.workflow_status,
    }) && d.dest_address
      ? { lat: d.dest_lat != null ? Number(d.dest_lat) : undefined, lng: d.dest_lng != null ? Number(d.dest_lng) : undefined, address: d.dest_address }
      : undefined,
    visibleDestinationExact: canRevealExactDestination({
      driverStatus: status,
      legacyStatus: d.status,
      workflowStatus: d.workflow_status,
    }),
    cargo: {
      type: d.cargo_type === 'other' ? (d.cargo_type_other || 'سایر') : d.cargo_type,
      weightTons: weight != null ? weight / 1000 : undefined,
      value: d.cargo_value != null ? Number(d.cargo_value) : undefined,
      packing: d.packaging_type || undefined,
      lengthCm: d.length_cm != null && d.length_cm !== '' ? Number(d.length_cm) : undefined,
      widthCm: d.width_cm != null && d.width_cm !== '' ? Number(d.width_cm) : undefined,
      heightCm: d.height_cm != null && d.height_cm !== '' ? Number(d.height_cm) : undefined,
      sensitive: false,
    },
    loadingDate: d.loading_date ? String(d.loading_date).slice(0, 10) : undefined,
    timeWindow: {
      pickupFrom: d.loading_time_from || undefined,
      pickupTo: d.loading_time_to || undefined,
      ranges: Array.isArray(d.loading_time_ranges) ? d.loading_time_ranges : [],
    },
    flag: d.urgency === 'urgent' ? 'urgent' : 'normal',
    status,
    vehicleTypeRequired: d.vehicleType?.title,
    vehicleLabel: [
      d.vehicleType?.title,
      ...(Array.isArray(d.vehicle_variants) ? d.vehicle_variants : []),
    ].filter(Boolean).join(' · '),
    price: d.operator_price != null ? Number(d.operator_price) : (d.proposed_price != null ? Number(d.proposed_price) : undefined),
    photosUploaded: Array.isArray(d.photo_urls) ? d.photo_urls.length : 0,
    ownerId: d.owner_id,
  };
}

function asSearchable(row) {
  const d = row.toJSON ? row.toJSON() : row;
  return {
    row,
    originCityId: d.origin_city_id,
    destCityId: d.dest_city_id,
    originLat: d.origin_lat != null ? Number(d.origin_lat) : null,
    originLng: d.origin_lng != null ? Number(d.origin_lng) : null,
  };
}

async function openShipments(driverId) {
  const rows = await Shipment.findAll({
    where: {
      [Op.or]: [
        { driver_id: null, status: { [Op.in]: ['searching_driver', 'pending_review'] } },
        { driver_id: driverId },
      ],
    },
    include: includes,
    order: [['createdAt', 'DESC']],
  });
  return rows.filter((row) => {
    if (row.driver_id) return true;
    const declined = Array.isArray(row.declined_by) ? row.declined_by : [];
    return !declined.map(String).includes(String(driverId));
  });
}

router.get('/profile', authMiddleware, async (req, res) => {
  const driver = await Driver.findByPk(req.user.id);
  if (!driver) return res.status(401).json({ message: 'کاربر یافت نشد' });
  return res.json({ driver: toPanelDriver(driver) });
});

router.get('/missions', authMiddleware, async (req, res) => {
  const rows = await openShipments(req.user.id);
  return res.json({ missions: rows.map(toMissionDto) });
});

router.post('/missions/:id/change-status', authMiddleware, async (req, res) => {
  try {
    const result = await applyLegacyDriverStatus({
      missionId: req.params.id,
      driverId: req.user.id,
      status: req.body.status,
      deliveryOtp: req.body.deliveryOtp,
      exceptionReason: req.body.exceptionReason,
    });
    return res.json({ message: 'وضعیت بروزرسانی شد', status: result.driverStatus });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message || 'به‌روزرسانی وضعیت ناموفق بود.' });
  }
});

router.get('/missions/nearby', authMiddleware, async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'مختصات جغرافیایی نامعتبر است.' });
  }
  const rows = (await openShipments(req.user.id)).filter((row) => !row.driver_id);
  let driverProvince;
  try {
    const resolved = await resolveDriverProvince(lat, lng);
    driverProvince = resolved?.province;
  } catch {
    driverProvince = undefined;
  }
  const matches = filterNearbyMissions(rows.map(asSearchable), {
    driverLat: lat,
    driverLng: lng,
    destProvinceName: req.query.destProvince || undefined,
    driverProvince,
  });
  return res.json({
    driverProvince,
    bands: [50, 100, 200, 400, 800, 1600],
    missions: matches.map(({ shipment, distanceKm, bandKm }) => ({
      ...toMissionDto(shipment.row),
      distanceKm,
      bandKm,
    })),
  });
});

router.get('/missions/search', authMiddleware, async (req, res) => {
  const { originCityId, originProvinceId, destCityId, destProvinceId } = req.query;
  if (!originCityId && !originProvinceId && !destCityId && !destProvinceId) {
    return res.status(400).json({ error: 'حداقل یک فیلتر مبدأ یا مقصد باید انتخاب شود.' });
  }
  const rows = (await openShipments(req.user.id)).filter((row) => !row.driver_id);
  const matches = filterMissionsByRoute(rows.map(asSearchable), {
    originCityId, originProvinceId, destCityId, destProvinceId,
  });
  return res.json({ missions: matches.map(({ shipment }) => toMissionDto(shipment.row)) });
});

module.exports = router;
