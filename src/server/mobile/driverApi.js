const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const { Op } = require('sequelize');
const Driver = require('../models/Driver');
const { Shipment, City, Zone, VehicleType } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { signDriver, DRIVER_OTP, hashToken, registrationIssue } = require('../routes/driverAuth');
const { validateVehicleSelection } = require('../services/vehicleConfig');
const { applyLegacyDriverStatus } = require('./driverActions');
const { canRevealExactDestination } = require('./missionPolicy');
const { ingestDriverPing } = require('../admin/monitor');
const { getSettings } = require('../admin/settingsStore');
const { normalizePhone } = require('../admin/phone');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const includes = [
  { model: City, as: 'originCity' },
  { model: Zone, as: 'originZone' },
  { model: City, as: 'destCity' },
  { model: Zone, as: 'destZone' },
  { model: VehicleType, as: 'vehicleType' },
];

function requireDriver(req, res, next) {
  return authMiddleware(req, res, () => {
    if (req.user?.kind === 'admin' || (req.user?.role && req.user.role !== 'driver')) {
      return res.status(403).json({ success: false, message: 'این مسیر مخصوص راننده است.' });
    }
    if (req.user?.typ === 'refresh') {
      return res.status(401).json({ success: false, message: 'از توکن دسترسی استفاده کنید.' });
    }
    return next();
  });
}

function ok(res, data, message = 'موفق') {
  return res.json({ success: true, message, data });
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

function toMission(row, driverId) {
  const data = row.toJSON ? row.toJSON() : row;
  const status = driverFacingStatus(data);
  const reveal = canRevealExactDestination({
    driverStatus: status,
    legacyStatus: data.status,
    workflowStatus: data.workflow_status,
  });
  const weight = data.weight_kg != null ? Number(data.weight_kg) : null;
  return {
    id: data.id,
    trackingCode: data.tracking_code,
    status,
    workflowStatus: data.workflow_status,
    mine: data.driver_id != null && String(data.driver_id) === String(driverId),
    origin: {
      city: data.originCity?.name,
      province: data.originCity?.province,
      zone: data.originZone?.name,
      address: reveal || status !== 'Offered' ? data.origin_address : undefined,
      lat: data.origin_lat != null ? Number(data.origin_lat) : null,
      lng: data.origin_lng != null ? Number(data.origin_lng) : null,
    },
    destination: {
      city: data.destCity?.name,
      province: data.destCity?.province,
      zone: data.destZone?.name,
      address: reveal ? data.dest_address : undefined,
      lat: reveal && data.dest_lat != null ? Number(data.dest_lat) : undefined,
      lng: reveal && data.dest_lng != null ? Number(data.dest_lng) : undefined,
      exactVisible: reveal,
    },
    cargo: {
      type: data.cargo_type,
      weightKg: weight,
      value: data.cargo_value != null ? Number(data.cargo_value) : null,
      packaging: data.packaging_type,
      pieceCount: data.piece_count != null ? Number(data.piece_count) : null,
      sensitive: Boolean(data.requires_inspector),
    },
    loadingDate: data.loading_date,
    loadingWindow: { from: data.loading_time_from, to: data.loading_time_to },
    vehicle: data.vehicleType?.title,
    price: data.operator_price != null ? Number(data.operator_price) : Number(data.proposed_price),
    waybillNumber: reveal ? data.waybill_number : undefined,
    deliveryOtpRequired: Boolean(data.delivery_otp),
  };
}

router.post('/auth/request-otp', asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone || req.body.mobile);
  const driver = await Driver.findOne({ where: { phoneNumber: phone } });
  ok(res, { phone, registered: Boolean(driver), devOtpCode: DRIVER_OTP }, 'کد تأیید ارسال شد.');
}));

router.post('/auth/verify-otp', asyncHandler(async (req, res) => {
  const number = normalizePhone(req.body.phone || req.body.mobile);
  const { code } = req.body;
  if (String(code) !== DRIVER_OTP) throw new AppError('کد وارد شده اشتباه است.', 400);
  const driver = await Driver.findOne({ where: { phoneNumber: number } });
  if (!driver) throw new AppError('کاربری با این شماره یافت نشد. لطفاً ثبت‌نام کنید.', 404);
  const session = await signDriver(driver);
  ok(res, { token: session.token, refreshToken: session.refreshToken, driver: session.user });
}));

router.post('/auth/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken;
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch {
    throw new AppError('نشست تمدید منقضی شده است.', 401);
  }
  if (decoded.kind !== 'driver' || decoded.typ !== 'refresh') throw new AppError('نشست نامعتبر است.', 401);
  const driver = await Driver.findByPk(decoded.id);
  if (!driver || driver.refreshTokenHash !== hashToken(refreshToken)) {
    throw new AppError('نشست نامعتبر است.', 401);
  }
  const session = await signDriver(driver);
  ok(res, { token: session.token, refreshToken: session.refreshToken, driver: session.user });
}));

router.post('/auth/register', asyncHandler(async (req, res) => {
  const {
    phone, mobile, code, name, nationalCode, licenseNumber,
    tractorType, trailerType, smartCardNumber, plate, vehicleSpecs,
  } = req.body;
  const number = normalizePhone(phone || mobile);
  if (!code || !name || !nationalCode || !licenseNumber) {
    throw new AppError('لطفاً تمامی فیلدها را پر کنید.', 400);
  }
  if (String(code) !== DRIVER_OTP) throw new AppError('کد نامعتبر است.', 400);
  const issue = registrationIssue({ plate, smartCardNumber, nationalCode });
  if (issue) throw new AppError(issue, 400);
  const existing = await Driver.findOne({ where: { phoneNumber: number } });
  if (existing) throw new AppError('این شماره قبلاً در سیستم ثبت شده است.', 400);
  const vehicle = validateVehicleSelection(tractorType, trailerType, vehicleSpecs);
  if (!vehicle.valid) throw new AppError(vehicle.error, 400);
  const nameParts = String(name).trim().split(/\s+/);
  const driver = await Driver.create({
    phoneNumber: number,
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' ') || ' ',
    nationalId: nationalCode,
    licenseNumber,
    smartCardNumber: smartCardNumber ? String(smartCardNumber) : null,
    tractorType,
    trailerType,
    plate,
    vehicleSpecs: vehicle.sanitizedSpecs,
    profileStep: 4,
    verificationStatus: 'PENDING_VERIFICATION',
    availability: 'OFFLINE',
  });
  const session = await signDriver(driver);
  ok(res, { token: session.token, refreshToken: session.refreshToken, driver: session.user }, 'ثبت‌نام انجام شد.');
}));

router.get('/me', requireDriver, asyncHandler(async (req, res) => {
  const driver = await Driver.findByPk(req.user.id);
  if (!driver) throw new AppError('راننده پیدا نشد.', 401);
  ok(res, {
    id: driver.id,
    fullName: `${driver.firstName || ''} ${driver.lastName || ''}`.trim(),
    phone: driver.phoneNumber,
    verificationStatus: driver.verificationStatus,
    availability: driver.availability,
    plate: driver.plate,
    tractorType: driver.tractorType,
    trailerType: driver.trailerType,
    documents: driver.documents || { personal: [], vehicle: [], insurance: [] },
    push: { registered: Boolean(driver.expoPushToken), stub: driver.expoPushToken === 'stub' },
  });
}));

router.post('/push-token', requireDriver, asyncHandler(async (req, res) => {
  const driver = await Driver.findByPk(req.user.id);
  if (!driver) throw new AppError('راننده پیدا نشد.', 401);
  const token = req.body.token ? String(req.body.token).slice(0, 255) : (req.body.stub ? 'stub' : null);
  driver.expoPushToken = token;
  driver.pushPlatform = req.body.platform ? String(req.body.platform).slice(0, 16) : null;
  await driver.save();
  ok(res, { registered: Boolean(token), stub: token === 'stub' }, 'نشانی اعلان ثبت شد.');
}));

router.get('/missions', requireDriver, asyncHandler(async (req, res) => {
  const scope = req.query.scope || 'open';
  const where = scope === 'mine'
    ? { driver_id: req.user.id }
    : {
      [Op.or]: [
        { driver_id: null, status: { [Op.in]: ['searching_driver', 'pending_review'] } },
        { driver_id: req.user.id },
      ],
    };
  const rows = await Shipment.findAll({ where, include: includes, order: [['createdAt', 'DESC']] });
  const missions = rows.filter((row) => {
    if (row.driver_id) return true;
    const declined = Array.isArray(row.declined_by) ? row.declined_by : [];
    return !declined.map(String).includes(String(req.user.id));
  }).map((row) => toMission(row, req.user.id));
  ok(res, { missions });
}));

router.get('/missions/:id', requireDriver, asyncHandler(async (req, res) => {
  const row = await Shipment.findByPk(req.params.id, { include: includes });
  if (!row) throw new AppError('مأموریت پیدا نشد.', 404);
  ok(res, toMission(row, req.user.id));
}));

router.post('/missions/:id/accept', requireDriver, asyncHandler(async (req, res) => {
  const result = await applyLegacyDriverStatus({ missionId: req.params.id, driverId: req.user.id, status: 'Accepted' });
  ok(res, result, 'مأموریت پذیرفته شد.');
}));

router.post('/missions/:id/decline', requireDriver, asyncHandler(async (req, res) => {
  const result = await applyLegacyDriverStatus({ missionId: req.params.id, driverId: req.user.id, status: 'Declined' });
  ok(res, result, 'مأموریت رد شد.');
}));

router.post('/missions/:id/status', requireDriver, asyncHandler(async (req, res) => {
  const result = await applyLegacyDriverStatus({
    missionId: req.params.id,
    driverId: req.user.id,
    status: req.body.status,
    deliveryOtp: req.body.deliveryOtp,
    exceptionReason: req.body.exceptionReason,
  });
  ok(res, result, 'وضعیت ثبت شد.');
}));

router.post('/missions/:id/delivery/verify', requireDriver, asyncHandler(async (req, res) => {
  const result = await applyLegacyDriverStatus({
    missionId: req.params.id,
    driverId: req.user.id,
    status: 'Completed',
    deliveryOtp: req.body.otp || req.body.deliveryOtp,
    exceptionReason: req.body.exceptionReason,
  });
  ok(res, result, 'تحویل ثبت شد.');
}));

router.post('/location', requireDriver, asyncHandler(async (req, res) => {
  const driver = await Driver.findByPk(req.user.id);
  if (!driver) throw new AppError('راننده پیدا نشد.', 401);
  const data = await ingestDriverPing({
    driver,
    missionId: req.body.missionId,
    points: Array.isArray(req.body.points) ? req.body.points : (req.body.lat != null ? [req.body] : []),
    active: req.body.active,
  });
  ok(res, data, 'موقعیت ثبت شد.');
}));

function imageUpload(limitBytes) {
  return multer({
    storage: multer.diskStorage({
      destination: path.join(__dirname, '..', '..', 'uploads'),
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname || '') || '.jpg'}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        cb(new AppError('فقط تصاویر JPG، PNG و WEBP مجاز هستند.', 400));
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: limitBytes },
  });
}

router.post('/documents', requireDriver, asyncHandler(async (req, res, next) => {
  const settings = await getSettings();
  const upload = imageUpload((Number(settings.image_max_kb) || 300) * 1024);
  upload.single('file')(req, res, (error) => {
    if (error) return next(error);
    return next();
  });
}), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('تصویر مدرک را انتخاب کنید.', 400);
  const group = ['personal', 'vehicle', 'insurance'].includes(req.body.group) ? req.body.group : 'personal';
  const driver = await Driver.findByPk(req.user.id);
  const documents = driver.documents || { personal: [], vehicle: [], insurance: [] };
  documents[group] = documents[group] || [];
  documents[group].push({
    key: req.body.key || `doc-${Date.now()}`,
    title: req.body.title || 'مدرک',
    url: `/uploads/${req.file.filename}`,
    status: 'PENDING',
    note: '',
  });
  driver.documents = documents;
  driver.changed('documents', true);
  if (driver.verificationStatus === 'REJECTED') driver.verificationStatus = 'PENDING_VERIFICATION';
  await driver.save();
  ok(res, { documents }, 'مدرک ثبت شد و در صف بررسی است.');
}));

router.post('/missions/:id/photos', requireDriver, asyncHandler(async (req, res, next) => {
  const settings = await getSettings();
  const upload = imageUpload((Number(settings.image_max_kb) || 300) * 1024);
  upload.single('file')(req, res, (error) => (error ? next(error) : next()));
}), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('عکس را انتخاب کنید.', 400);
  const mission = await Shipment.findByPk(req.params.id);
  if (!mission || String(mission.driver_id) !== String(req.user.id)) {
    throw new AppError('به این مأموریت دسترسی ندارید.', 403);
  }
  const photos = Array.isArray(mission.photo_urls) ? mission.photo_urls : [];
  photos.push(`/uploads/${req.file.filename}`);
  mission.photo_urls = photos;
  mission.changed('photo_urls', true);
  await mission.save();
  ok(res, { url: `/uploads/${req.file.filename}`, count: photos.length }, 'عکس ثبت شد.');
}));

module.exports = router;
