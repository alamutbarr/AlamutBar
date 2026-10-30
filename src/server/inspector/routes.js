const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  Inspector, InspectionReport, Shipment, City, Driver, VehicleType,
} = require('../models');
const { getSettings } = require('../admin/settingsStore');
const { logEvent } = require('../admin/audit');
const { WORKFLOW_LABELS } = require('../admin/workflow');
const authService = require('./authService');
const policy = require('./policy');
const { jsonList, photoList } = require('../utils/jsonList');

const router = express.Router();

const includes = [
  { model: City, as: 'originCity' },
  { model: City, as: 'destCity' },
  { model: Driver, as: 'driver' },
  { model: VehicleType, as: 'vehicleType' },
  { model: Inspector, as: 'inspector' },
  { model: InspectionReport, as: 'inspections' },
];

function requireInspector(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ success: false, message: 'لطفاً وارد شوید.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.kind !== 'inspector' || decoded.typ !== 'access') {
      return res.status(401).json({ success: false, message: 'نشست نامعتبر است.' });
    }
    return Inspector.findByPk(decoded.id).then((inspector) => {
      if (!inspector || !inspector.isActive) {
        return res.status(403).json({ success: false, message: 'حساب متصدی غیرفعال است.' });
      }
      req.inspector = inspector;
      return next();
    }).catch(() => res.status(401).json({ success: false, message: 'نشست نامعتبر است.' }));
  } catch {
    return res.status(401).json({ success: false, message: 'نشست منقضی شده است. دوباره وارد شوید.' });
  }
}

function ok(res, data, message = 'موفق') {
  return res.json({ success: true, message, data });
}

function num(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function latestReport(shipment) {
  const rows = shipment.inspections || [];
  return rows.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

function presentMission(shipment, inspector, settings) {
  const report = latestReport(shipment);
  const template = policy.checklistTemplate(settings);
  const required = policy.requiredItems(settings);
  const checklist = policy.mergeChecklist(template, report?.checklist || []);
  const photos = photoList(report?.photos);
  const cargoValue = report?.recordedCargoValue != null ? num(report.recordedCargoValue) : null;
  const status = policy.completeness({
    required,
    photos,
    weightEmpty: num(report?.weightEmpty),
    weightFull: num(report?.weightFull),
    cargoValue,
  });
  const discrepancies = jsonList(report?.discrepancies);
  return {
    id: shipment.id,
    trackingCode: shipment.tracking_code,
    workflowStatus: shipment.workflow_status,
    workflowLabel: WORKFLOW_LABELS[shipment.workflow_status] || shipment.workflow_status,
    visit: {
      city: shipment.originCity?.name,
      province: shipment.originCity?.province,
      address: shipment.origin_address,
      lat: num(shipment.origin_lat),
      lng: num(shipment.origin_lng),
      date: shipment.loading_date,
      from: shipment.loading_time_from,
      to: shipment.loading_time_to,
    },
    destinationCity: shipment.destCity?.name,
    cargo: {
      type: shipment.cargo_type,
      weightKg: num(shipment.weight_kg),
      declaredValue: num(shipment.cargo_value),
      packaging: shipment.packaging_type,
    },
    vehicle: {
      title: shipment.vehicleType?.title,
      variants: shipment.vehicle_variants || [],
      plate: shipment.driver?.plate || null,
      driverName: shipment.driver ? `${shipment.driver.firstName || ''} ${shipment.driver.lastName || ''}`.trim() : null,
    },
    assignedToMe: shipment.assigned_inspector_id != null && String(shipment.assigned_inspector_id) === String(inspector.id),
    inspectorName: shipment.inspector?.fullName || null,
    payer: settings.inspector_dispatch_payer || 'alamut',
    payerNote: policy.PAYER_LABELS[settings.inspector_dispatch_payer] || policy.PAYER_LABELS.alamut,
    reportId: report?.id || null,
    checklist,
    photos,
    weights: {
      empty: num(report?.weightEmpty),
      full: num(report?.weightFull),
      net: num(report?.weightNet),
    },
    recordedCargoValue: cargoValue,
    actualCargoType: report?.actualCargoType || '',
    discrepancies,
    decision: report?.decision || null,
    decisionNote: report?.decisionNote || null,
    completeness: status,
    canEdit: !report || report.decision === 'PENDING',
  };
}

async function loadVisible(id, inspector, settings) {
  const shipment = await Shipment.findByPk(id, { include: includes });
  if (!shipment) throw new AppError('مأموریت پیدا نشد.', 404);
  const needs = policy.needsInspector(shipment, settings);
  const visible = policy.missionVisible({
    workflowStatus: shipment.workflow_status,
    assignedInspectorId: shipment.assigned_inspector_id,
    inspectorId: inspector.id,
    needs,
  });
  if (!visible) throw new AppError('این مراجعه برای شما نیست.', 403);
  return shipment;
}

async function claim(shipment, inspector) {
  if (shipment.assigned_inspector_id && String(shipment.assigned_inspector_id) !== String(inspector.id)) {
    throw new AppError('این مراجعه به متصدی دیگری سپرده شده است.', 409);
  }
  if (!shipment.assigned_inspector_id) {
    shipment.assigned_inspector_id = inspector.id;
    shipment.requires_inspector = true;
    await shipment.save();
    await logEvent(shipment.id, {
      type: 'INSPECTION_ASSIGNED',
      description: `متصدی ${inspector.fullName} مراجعه را پذیرفت.`,
      metadata: { inspectorId: inspector.id },
    });
  }
}

async function openReport(shipment, inspector) {
  const existing = (shipment.inspections || []).find((item) => item.decision === 'PENDING' && String(item.inspectorId) === String(inspector.id))
    || (shipment.inspections || []).find((item) => item.decision === 'PENDING');
  if (existing) {
    if (existing.inspectorId && String(existing.inspectorId) !== String(inspector.id)) {
      throw new AppError('گزارش باز این مأموریت برای متصدی دیگری است.', 409);
    }
    existing.inspectorId = inspector.id;
    return existing;
  }
  const decided = (shipment.inspections || []).find((item) => item.decision !== 'PENDING');
  if (decided) throw new AppError('تصمیم این بازرسی ثبت شده و از پنل متصدی قابل تغییر نیست.', 409);
  return InspectionReport.create({
    shipmentId: shipment.id,
    inspectorId: inspector.id,
    checklist: [],
    photos: [],
    discrepancies: [],
    decision: 'PENDING',
  });
}

router.post('/auth/request-otp', asyncHandler(async (req, res) => {
  const data = await authService.requestOtp(req.body.phone || req.body.mobile);
  ok(res, data, 'اگر شماره مجاز باشد، کد تأیید ارسال شد.');
}));

router.post('/auth/verify-otp', asyncHandler(async (req, res) => {
  const data = await authService.verifyOtp(req.body.phone || req.body.mobile, req.body.code);
  ok(res, data, 'ورود انجام شد.');
}));

router.post('/auth/refresh', asyncHandler(async (req, res) => {
  const data = await authService.refresh(req.body.refreshToken);
  ok(res, data, 'نشست تمدید شد.');
}));

router.use(requireInspector);

router.post('/auth/logout', asyncHandler(async (req, res) => {
  await authService.logout(req.inspector);
  ok(res, null, 'خارج شدید.');
}));

router.get('/me', asyncHandler(async (req, res) => {
  ok(res, authService.presentInspector(req.inspector));
}));

router.get('/missions', asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const scope = req.query.scope === 'done' ? 'done' : 'open';
  const rows = await Shipment.findAll({
    where: {
      workflow_status: { [Op.notIn]: ['CANCELLED', 'COMPLETED', 'DRIVER_REPLACED'] },
    },
    include: includes,
    order: [['loading_date', 'ASC'], ['id', 'DESC']],
    limit: 100,
  });
  const missions = rows.filter((row) => policy.missionVisible({
    workflowStatus: row.workflow_status,
    assignedInspectorId: row.assigned_inspector_id,
    inspectorId: req.inspector.id,
    needs: policy.needsInspector(row, settings),
  })).map((row) => presentMission(row, req.inspector, settings)).filter((mission) => {
    const closed = ['APPROVED', 'CORRECTED', 'STOPPED'].includes(mission.decision);
    return scope === 'done' ? closed : !closed;
  });
  ok(res, { missions, payerNote: policy.PAYER_LABELS[settings.inspector_dispatch_payer] || policy.PAYER_LABELS.alamut });
}));

router.get('/missions/:id', asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const shipment = await loadVisible(req.params.id, req.inspector, settings);
  ok(res, presentMission(shipment, req.inspector, settings));
}));

router.post('/missions/:id/claim', asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const shipment = await loadVisible(req.params.id, req.inspector, settings);
  await claim(shipment, req.inspector);
  const fresh = await loadVisible(shipment.id, req.inspector, settings);
  ok(res, presentMission(fresh, req.inspector, settings), 'مراجعه برای شما ثبت شد.');
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

router.post('/missions/:id/photos', asyncHandler(async (req, res, next) => {
  const settings = await getSettings();
  const upload = imageUpload((Number(settings.image_max_kb) || 300) * 1024);
  upload.single('file')(req, res, (error) => (error ? next(error) : next()));
}), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('عکس را انتخاب کنید.', 400);
  const kind = ['seal', 'lashing', 'weighbridge_empty', 'weighbridge_full', 'cargo', 'other'].includes(req.body.kind)
    ? req.body.kind
    : 'other';
  const settings = await getSettings();
  const shipment = await loadVisible(req.params.id, req.inspector, settings);
  await claim(shipment, req.inspector);
  const report = await openReport(shipment, req.inspector);
  const photos = photoList(report.photos);
  photos.push({ kind, url: `/uploads/${req.file.filename}`, takenAt: new Date().toISOString() });
  report.photos = photos;
  report.changed('photos', true);
  await report.save();
  await logEvent(shipment.id, {
    type: 'INSPECTION_PHOTO',
    description: `متصدی ${req.inspector.fullName} عکس ${kind} را ثبت کرد.`,
    metadata: { inspectorId: req.inspector.id, reportId: report.id, kind },
  });
  const fresh = await loadVisible(shipment.id, req.inspector, settings);
  ok(res, presentMission(fresh, req.inspector, settings), 'عکس ثبت شد.');
}));

router.post('/missions/:id/report', asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const shipment = await loadVisible(req.params.id, req.inspector, settings);
  await claim(shipment, req.inspector);
  const report = await openReport(shipment, req.inspector);
  const template = policy.checklistTemplate(settings);
  const submitted = Array.isArray(req.body.checklist) ? req.body.checklist : [];
  const checklist = policy.mergeChecklist(template, submitted);
  const empty = req.body.weightEmpty != null && req.body.weightEmpty !== '' ? Number(req.body.weightEmpty) : num(report.weightEmpty);
  const full = req.body.weightFull != null && req.body.weightFull !== '' ? Number(req.body.weightFull) : num(report.weightFull);
  let net = req.body.weightNet != null && req.body.weightNet !== '' ? Number(req.body.weightNet) : null;
  if (empty != null && full != null) {
    const computed = Math.round((full - empty) * 100) / 100;
    if (computed < 0) throw new AppError('وزن پر نمی‌تواند از وزن خالی کمتر باشد.', 400);
    if (net == null) net = computed;
    else if (Math.abs(net - computed) > 1) throw new AppError('وزن خالص با اختلاف باسکول خالی و پر نمی‌خواند.', 400);
  }
  const cargoValue = req.body.cargoValue != null && req.body.cargoValue !== '' ? Number(req.body.cargoValue) : num(report.recordedCargoValue);
  const actualCargo = req.body.actualCargoType != null ? String(req.body.actualCargoType).trim() : (report.actualCargoType || '');
  const discrepancies = policy.buildDiscrepancies({
    declaredWeight: num(shipment.weight_kg),
    actualNet: net,
    weightToleranceKg: settings.weight_discrepancy_kg,
    declaredValue: num(shipment.cargo_value),
    actualValue: cargoValue,
    valueRatio: settings.value_discrepancy_ratio,
    declaredCargo: shipment.cargo_type,
    actualCargo,
    declaredVehicle: shipment.vehicleType?.title,
    actualVehicle: req.body.actualVehicle,
    checklist,
    manual: Array.isArray(req.body.discrepancies) ? req.body.discrepancies : [],
  });
  const status = policy.completeness({
    required: policy.requiredItems(settings),
    photos: photoList(report.photos),
    weightEmpty: empty,
    weightFull: full,
    cargoValue,
  });
  const finalize = Boolean(req.body.finalize);
  if (finalize && !status.complete) {
    throw new AppError(`برای ادامه، این موارد لازم است: ${status.missing.map((item) => item.label).join('، ')}`, 400);
  }
  report.checklist = checklist;
  report.weightEmpty = empty;
  report.weightFull = full;
  report.weightNet = net;
  report.recordedCargoValue = cargoValue;
  report.actualCargoType = actualCargo || null;
  report.discrepancies = discrepancies;
  report.decision = finalize
    ? policy.approvalDecision({
      finalApproval: settings.inspector_final_approval,
      complete: status.complete,
      discrepancies,
    })
    : 'PENDING';
  report.changed('checklist', true);
  report.changed('discrepancies', true);
  await report.save();
  if (finalize) {
    await logEvent(shipment.id, {
      type: 'INSPECTION_REPORT',
      description: `متصدی ${req.inspector.fullName} گزارش بازرسی را ثبت کرد.${discrepancies.length ? ` ${discrepancies.length.toLocaleString('fa-IR')} مغایرت دارد.` : ''}`,
      metadata: { inspectorId: req.inspector.id, reportId: report.id, decision: report.decision },
    });
    if (discrepancies.length) {
      await logEvent(shipment.id, {
        type: 'INSPECTION_DISCREPANCY',
        description: `مغایرت ثبت شد: ${discrepancies.map((item) => item.note).filter(Boolean).join(' ')}`,
        metadata: { inspectorId: req.inspector.id, reportId: report.id, discrepancies },
      });
    }
  }
  const fresh = await loadVisible(shipment.id, req.inspector, settings);
  ok(res, presentMission(fresh, req.inspector, settings), finalize ? 'گزارش برای مرکز عملیات ارسال شد.' : 'پیش‌نویس ذخیره شد.');
}));

module.exports = router;
