const express = require('express');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const {
  Admin, Driver, CargoOwner, User, Shipment, Alert, Inspector, InspectionReport,
  Complaint, AdminAuditLog, SystemSetting, City, DriverNotice,
} = require('../models');
const { requireAdmin, requirePermission } = require('./guard');
const authService = require('./authService');
const { assertRoles } = require('./authService');
const { audit, pageOf } = require('./audit');
const { can, parseRoles } = require('./permissions');
const orderOps = require('./orderOps');
const { getSettings, listSettings, clearSettingsCache, SETTING_DEFAULTS } = require('./settingsStore');
const { mapSnapshot } = require('./monitor');
const { WORKFLOW_STATUSES, WORKFLOW_LABELS, ACTIVE_TRIP } = require('./workflow');
const { renderDossier, sendPdf } = require('./dossier');
const ownerKyc = require('./ownerKyc');
const notificationService = require('../services/notification.service');
const { reviewDocument } = require('./documents');
const chat = require('../chat/service');
const { buildWorkbook } = require('./reports');
const { normalizePhone } = require('./phone');
const { logEvent } = require('./audit');

const router = express.Router();

router.post('/auth/login', asyncHandler(async (req, res) => {
  const data = await authService.loginWithPassword(req.body.username, req.body.password);
  success(res, { message: 'ورود انجام شد.', data });
}));

router.post('/auth/refresh', asyncHandler(async (req, res) => {
  const data = await authService.refresh(req.body.refreshToken);
  success(res, { message: 'نشست تمدید شد.', data });
}));

router.use(requireAdmin);

router.post('/auth/logout', asyncHandler(async (req, res) => {
  await authService.logout(req.admin);
  success(res, { message: 'خارج شدید.' });
}));

router.get('/auth/me', asyncHandler(async (req, res) => {
  const openAlerts = await Alert.count({ where: { isResolved: false } });
  success(res, { data: { ...authService.presentAdmin(req.admin), openAlerts } });
}));

router.get('/dashboard', requirePermission('dashboard'), asyncHandler(async (req, res) => {
  const [shipments, alerts, readyDrivers, busyDrivers] = await Promise.all([
    Shipment.findAll({ attributes: ['id', 'workflow_status', 'createdAt', 'proposed_price', 'operator_price', 'final_price', 'penalty_amount'] }),
    Alert.findAll({ where: { isResolved: false } }),
    Driver.count({ where: { verificationStatus: 'VERIFIED', availability: 'READY' } }),
    Driver.count({ where: { availability: 'BUSY' } }),
  ]);
  const byStatus = {};
  for (const status of WORKFLOW_STATUSES) byStatus[status] = 0;
  let freight = 0;
  let penalties = 0;
  const days = {};
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    days[day.toISOString().slice(0, 10)] = 0;
  }
  for (const row of shipments) {
    const status = row.workflow_status || 'REQUEST_REGISTERED';
    byStatus[status] = (byStatus[status] || 0) + 1;
    freight += Number(row.final_price || row.operator_price || row.proposed_price || 0);
    penalties += Number(row.penalty_amount || 0);
    const key = new Date(row.createdAt).toISOString().slice(0, 10);
    if (key in days) days[key] += 1;
  }
  const active = ACTIVE_TRIP.reduce((sum, status) => sum + (byStatus[status] || 0), 0);
  success(res, {
    data: {
      cards: {
        orders: shipments.length,
        active,
        openAlerts: alerts.length,
        criticalAlerts: alerts.filter((item) => item.severity === 'critical').length,
        readyDrivers,
        busyDrivers,
        freight: can(req.admin.roles, 'reports.financial') ? freight : null,
        penalties: can(req.admin.roles, 'reports.financial') ? penalties : null,
      },
      byStatus: WORKFLOW_STATUSES.map((status) => ({
        status,
        label: WORKFLOW_LABELS[status],
        count: byStatus[status] || 0,
      })),
      trend: Object.entries(days).map(([date, count]) => ({ date, count })),
      alertTypes: ['GPS_CUT', 'ROUTE_DEVIATION', 'DELAY', 'INSPECTOR_ABSENT', 'OTHER'].map((type) => ({
        type,
        count: alerts.filter((item) => item.type === type).length,
      })),
    },
  });
}));

router.get('/orders', requirePermission('orders.read'), asyncHandler(async (req, res) => {
  success(res, { data: await orderOps.listOrders(req.query) });
}));

router.get('/orders/:id', requirePermission('orders.read'), asyncHandler(async (req, res) => {
  success(res, { data: await orderOps.getOrder(req.params.id) });
}));

router.post('/orders/:id/status', requirePermission('orders.update'), asyncHandler(async (req, res) => {
  success(res, { message: 'وضعیت ثبت شد.', data: await orderOps.changeStatus(req.admin, req.params.id, req.body) });
}));

router.patch('/orders/:id/price', requirePermission('orders.price'), asyncHandler(async (req, res) => {
  success(res, { message: 'قیمت اصلاح شد.', data: await orderOps.updatePrice(req.admin, req.params.id, req.body) });
}));

router.post('/orders/:id/assign-driver', requirePermission('orders.assign'), asyncHandler(async (req, res) => {
  success(res, { message: 'راننده تخصیص داده شد.', data: await orderOps.assignDriver(req.admin, req.params.id, req.body.driverId, req.body.reason) });
}));

router.post('/orders/:id/replace-driver', requirePermission('orders.assign'), asyncHandler(async (req, res) => {
  success(res, { message: 'راننده جایگزین شد.', data: await orderOps.replaceDriver(req.admin, req.params.id, req.body) });
}));

router.post('/orders/:id/notes', requirePermission('orders.notes'), asyncHandler(async (req, res) => {
  success(res, { message: 'ثبت شد.', data: await orderOps.addNote(req.admin, req.params.id, req.body) });
}));

router.patch('/orders/:id/waybill', requirePermission('orders.waybill'), asyncHandler(async (req, res) => {
  success(res, { message: 'بارنامه ثبت شد.', data: await orderOps.issueWaybill(req.admin, req.params.id, req.body) });
}));

router.post('/orders/:id/penalty', requirePermission('orders.penalty'), asyncHandler(async (req, res) => {
  const result = await orderOps.applyPenalty(req.admin, req.params.id, req.body);
  success(res, { message: 'جریمه ثبت شد.', data: result });
}));

router.get('/orders/:id/dossier', requirePermission('orders.read'), asyncHandler(async (req, res) => {
  const order = await orderOps.getOrder(req.params.id);
  const body = await renderDossier(order);
  sendPdf(res, body, `alamut-${order.trackingCode}.pdf`);
}));

router.get('/drivers/ready', requirePermission('drivers.queue'), asyncHandler(async (req, res) => {
  success(res, { data: await orderOps.listReadyDrivers() });
}));

router.get('/drivers', requirePermission('drivers.read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = pageOf(req.query);
  const where = {};
  if (req.query.verification) where.verificationStatus = req.query.verification;
  if (req.query.availability) where.availability = req.query.availability;
  if (req.query.q) {
    const q = `%${String(req.query.q).trim()}%`;
    where[Op.or] = [
      { firstName: { [Op.like]: q } },
      { lastName: { [Op.like]: q } },
      { phoneNumber: { [Op.like]: q } },
      { plate: { [Op.like]: q } },
    ];
  }
  const { rows, count } = await Driver.findAndCountAll({ where, order: [['updatedAt', 'DESC']], limit, offset });
  success(res, { data: { items: rows.map(orderOps.presentDriver), total: count, page, limit } });
}));

router.get('/drivers/:id', requirePermission('drivers.read'), asyncHandler(async (req, res) => {
  const driver = await Driver.findByPk(req.params.id);
  if (!driver) throw new AppError('راننده پیدا نشد.', 404);
  const [missions, alerts] = await Promise.all([
    Shipment.findAll({ where: { driver_id: driver.id }, include: [{ model: City, as: 'originCity' }, { model: City, as: 'destCity' }], order: [['createdAt', 'DESC']], limit: 20 }),
    Alert.findAll({ where: { driverId: driver.id } }),
  ]);
  const performance = {
    successfulMissions: missions.filter((item) => item.workflow_status === 'COMPLETED' || item.status === 'completed').length,
    delays: alerts.filter((item) => item.type === 'DELAY').length,
    routeDeviations: alerts.filter((item) => item.type === 'ROUTE_DEVIATION').length,
    gpsCuts: alerts.filter((item) => item.type === 'GPS_CUT').length,
  };
  success(res, {
    data: {
      ...orderOps.presentDriver(driver),
      performance,
      missions: missions.map((item) => ({
        id: item.id,
        trackingCode: item.tracking_code,
        workflowStatus: item.workflow_status,
        origin: item.originCity?.name,
        destination: item.destCity?.name,
        createdAt: item.createdAt,
      })),
    },
  });
}));

router.post('/drivers/:id/documents/review', requirePermission('drivers.documents'), asyncHandler(async (req, res) => {
  const driver = await Driver.findByPk(req.params.id);
  if (!driver) throw new AppError('راننده پیدا نشد.', 404);
  let result;
  try {
    result = reviewDocument(driver.documents, {
      group: req.body.group,
      index: Number(req.body.index),
      decision: req.body.decision,
      reason: req.body.reason,
    });
  } catch (error) {
    throw new AppError(error.message, error.statusCode || 400);
  }
  driver.documents = result.documents;
  driver.changed('documents', true);
  driver.verificationStatus = result.verificationStatus;
  driver.rejectionReason = result.rejectionReason;
  if (result.availability === 'OFFLINE') driver.availability = 'OFFLINE';
  if (result.availability === 'READY_IF_OFFLINE' && driver.availability === 'OFFLINE') driver.availability = 'READY';
  await driver.save();
  if (result.notice) {
    await DriverNotice.create({
      driverId: driver.id,
      title: result.notice.title,
      message: result.notice.message,
    });
  }
  await audit(req.admin, 'driver.documents', 'driver', driver.id, {
    group: req.body.group,
    index: req.body.index,
    decision: req.body.decision,
  });
  success(res, { message: 'بررسی مدرک ثبت شد.', data: orderOps.presentDriver(driver) });
}));

router.get('/chats', requirePermission('dashboard'), asyncHandler(async (req, res) => {
  success(res, { data: await chat.inbox() });
}));

router.get('/chats/:shipmentId', requirePermission('dashboard'), asyncHandler(async (req, res) => {
  const channel = req.query.channel === 'driver_operator' ? 'driver_operator' : 'owner_operator';
  const shipment = await Shipment.findByPk(req.params.shipmentId);
  if (!shipment) throw new AppError('بار پیدا نشد.', 404);
  success(res, { data: await chat.history(shipment.id, channel) });
}));

router.post('/chats/:shipmentId', requirePermission('dashboard'), asyncHandler(async (req, res) => {
  const channel = req.body.channel === 'driver_operator' ? 'driver_operator' : 'owner_operator';
  const shipment = await Shipment.findByPk(req.params.shipmentId);
  if (!shipment) throw new AppError('بار پیدا نشد.', 404);
  const message = await chat.postMessage({
    shipment,
    channel,
    senderRole: 'operator',
    senderId: req.admin.id,
    body: req.body.body,
  });
  success(res, { message: 'پیام ارسال شد.', data: message });
}));

router.patch('/drivers/:id/availability', requirePermission('drivers.queue'), asyncHandler(async (req, res) => {
  const driver = await Driver.findByPk(req.params.id);
  if (!driver) throw new AppError('راننده پیدا نشد.', 404);
  if (!['READY', 'OFFLINE'].includes(req.body.availability)) throw new AppError('وضعیت صف نامعتبر است.', 400);
  if (req.body.availability === 'READY' && driver.verificationStatus !== 'VERIFIED') {
    throw new AppError('راننده هنوز تأیید نشده است.', 400);
  }
  driver.availability = req.body.availability;
  await driver.save();
  await audit(req.admin, 'driver.queue', 'driver', driver.id, { availability: driver.availability });
  success(res, { message: 'صف به‌روز شد.', data: orderOps.presentDriver(driver) });
}));

router.get('/alerts', requirePermission('alerts.read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = pageOf(req.query);
  const where = {};
  if (req.query.resolved === 'true') where.isResolved = true;
  if (req.query.resolved === 'false') where.isResolved = false;
  if (req.query.type) where.type = req.query.type;
  if (req.query.severity) where.severity = req.query.severity;
  const { rows, count } = await Alert.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    include: [{ model: Shipment, attributes: ['id', 'tracking_code', 'workflow_status'] }, { model: Driver, as: 'driver' }],
  });
  success(res, {
    data: {
      items: rows.map((row) => ({
        ...orderOps.presentAlert(row),
        trackingCode: row.Shipment?.tracking_code,
        workflowStatus: row.Shipment?.workflow_status,
        driverName: orderOps.driverName(row.driver),
      })),
      total: count,
      page,
      limit,
    },
  });
}));

router.post('/alerts/:id/resolve', requirePermission('alerts.resolve'), asyncHandler(async (req, res) => {
  const alert = await Alert.findByPk(req.params.id);
  if (!alert) throw new AppError('هشدار پیدا نشد.', 404);
  const action = String(req.body.action || '').trim();
  if (action.length < 3) throw new AppError('اقدام انجام‌شده را بنویسید.', 400);
  alert.isResolved = true;
  alert.resolvedByAdminId = req.admin.id;
  alert.resolutionAction = action;
  await alert.save();
  if (alert.shipmentId) {
    const shipment = await Shipment.findByPk(alert.shipmentId);
    if (shipment) await orderOps.refreshPriority(shipment);
    await logEvent(alert.shipmentId, {
      type: 'ALERT_RESOLVED',
      description: `هشدار رسیدگی شد: ${action}`,
      adminId: req.admin.id,
      metadata: { alertId: alert.id },
    });
  }
  await audit(req.admin, 'alert.resolve', 'alert', alert.id, { action });
  const { publish } = require('./realtime');
  publish({ type: 'alert-resolved', alertId: alert.id });
  success(res, { message: 'هشدار رسیدگی‌شده علامت خورد.', data: orderOps.presentAlert(alert) });
}));

router.get('/map', requirePermission('map'), asyncHandler(async (req, res) => {
  success(res, { data: await mapSnapshot() });
}));

router.get('/inspections', requirePermission('inspections'), asyncHandler(async (req, res) => {
  const rows = await InspectionReport.findAll({
    include: [
      { model: Inspector, as: 'inspector' },
      { model: Shipment, attributes: ['id', 'tracking_code', 'workflow_status'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: 80,
  });
  success(res, {
    data: rows.map((row) => ({
      id: row.id,
      shipmentId: row.shipmentId,
      trackingCode: row.Shipment?.tracking_code,
      workflowStatus: row.Shipment?.workflow_status,
      inspectorName: row.inspector?.fullName,
      weightNet: row.weightNet != null ? Number(row.weightNet) : null,
      discrepancies: row.discrepancies || [],
      recordedCargoValue: row.recordedCargoValue != null ? Number(row.recordedCargoValue) : null,
      decision: row.decision,
      decisionNote: row.decisionNote,
      createdAt: row.createdAt,
    })),
  });
}));

router.get('/inspectors', requirePermission('inspections'), asyncHandler(async (req, res) => {
  const rows = await Inspector.findAll({ order: [['fullName', 'ASC']] });
  success(res, { data: rows });
}));

router.post('/inspectors', requirePermission('inspectors.manage'), asyncHandler(async (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  const phone = normalizePhone(req.body.phone);
  if (fullName.length < 3) throw new AppError('نام متصدی را وارد کنید.', 400);
  const inspector = await Inspector.create({ fullName, phone, notes: req.body.notes || null });
  await audit(req.admin, 'inspector.create', 'inspector', inspector.id, { fullName });
  success(res, { message: 'متصدی ثبت شد.', data: inspector });
}));

router.post('/orders/:id/inspector', requirePermission('inspections'), asyncHandler(async (req, res) => {
  const shipment = await orderOps.loadOrder(req.params.id);
  const inspector = await Inspector.findByPk(req.body.inspectorId);
  if (!inspector || !inspector.isActive) throw new AppError('متصدی فعال پیدا نشد.', 404);
  shipment.assigned_inspector_id = inspector.id;
  shipment.requires_inspector = true;
  await shipment.save();
  await logEvent(shipment.id, {
    type: 'INSPECTION_ASSIGNED',
    description: `متصدی ${inspector.fullName} به مأموریت اختصاص یافت.`,
    adminId: req.admin.id,
    metadata: { inspectorId: inspector.id },
  });
  await audit(req.admin, 'inspection.assign', 'shipment', shipment.id, { inspectorId: inspector.id });
  success(res, { message: 'متصدی تخصیص داده شد.', data: await orderOps.getOrder(shipment.id) });
}));

router.post('/orders/:id/inspection', requirePermission('inspections'), asyncHandler(async (req, res) => {
  const shipment = await orderOps.loadOrder(req.params.id);
  const empty = req.body.weightEmpty != null ? Number(req.body.weightEmpty) : null;
  const full = req.body.weightFull != null ? Number(req.body.weightFull) : null;
  let net = req.body.weightNet != null ? Number(req.body.weightNet) : null;
  if (empty != null && full != null) {
    const computed = Math.round((full - empty) * 100) / 100;
    if (net == null) net = computed;
    else if (Math.abs(net - computed) > 1) throw new AppError('وزن خالص با اختلاف باسکول خالی و پر نمی‌خواند.', 400);
  }
  const report = await InspectionReport.create({
    shipmentId: shipment.id,
    inspectorId: req.body.inspectorId || shipment.assigned_inspector_id,
    assignedByAdminId: req.admin.id,
    checklist: req.body.checklist || [],
    photos: req.body.photos || [],
    weightEmpty: empty,
    weightFull: full,
    weightNet: net,
    discrepancies: req.body.discrepancies || [],
    decision: 'PENDING',
  });
  await logEvent(shipment.id, {
    type: 'INSPECTION_REPORT',
    description: 'گزارش بازرسی، عکس مهار و برگه باسکول ثبت شد.',
    adminId: req.admin.id,
    metadata: { reportId: report.id, weightNet: net },
  });
  await audit(req.admin, 'inspection.report', 'shipment', shipment.id, { reportId: report.id });
  success(res, { message: 'گزارش بازرسی ثبت شد.', data: await orderOps.getOrder(shipment.id) });
}));

router.post('/inspections/:id/decision', requirePermission('inspections'), asyncHandler(async (req, res) => {
  const report = await InspectionReport.findByPk(req.params.id);
  if (!report) throw new AppError('گزارش پیدا نشد.', 404);
  const decision = req.body.decision;
  if (!['APPROVED', 'CORRECTED', 'STOPPED'].includes(decision)) throw new AppError('تصمیم نامعتبر است.', 400);
  const note = String(req.body.note || '').trim();
  if (note.length < 3) throw new AppError('توضیح تصمیم را بنویسید.', 400);
  report.decision = decision;
  report.decisionNote = note;
  await report.save();
  const shipment = await orderOps.loadOrder(report.shipmentId);
  if (decision === 'STOPPED') await orderOps.setWorkflow(shipment, 'ON_HOLD', { admin: req.admin, reason: `توقف به‌خاطر مغایرت: ${note}` });
  await logEvent(shipment.id, {
    type: 'INSPECTION_DECISION',
    description: `تصمیم بازرسی: ${decision}. ${note}`,
    adminId: req.admin.id,
    metadata: { decision, reportId: report.id },
  });
  await audit(req.admin, 'inspection.decision', 'inspection', report.id, { decision, note });
  success(res, { message: 'تصمیم ثبت شد.', data: await orderOps.getOrder(shipment.id) });
}));

router.get('/customers', requirePermission('owners.read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = pageOf(req.query);
  const where = {};
  if (req.query.q) {
    const q = `%${String(req.query.q).trim()}%`;
    where[Op.or] = [
      { first_name: { [Op.like]: q } },
      { last_name: { [Op.like]: q } },
      { company_name: { [Op.like]: q } },
    ];
  }
  const { rows, count } = await CargoOwner.findAndCountAll({
    where,
    include: [{ model: User }],
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });
  success(res, {
    data: {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        fullName: `${row.first_name} ${row.last_name}`.trim(),
        companyName: row.company_name,
        phone: row.User?.phone_number,
        nationalId: row.national_id,
        requireInspector: row.require_inspector,
        priceCeiling: row.price_ceiling != null ? Number(row.price_ceiling) : null,
        postalCode: row.postal_code || null,
        verificationStatus: row.verification_status,
        verificationNote: row.verification_note,
        kyc: ownerKyc.present(row.kyc),
      })),
      total: count,
      page,
      limit,
    },
  });
}));

router.patch('/customers/:id', requirePermission('owners.documents'), asyncHandler(async (req, res) => {
  const owner = await CargoOwner.findByPk(req.params.id, { include: [User] });
  if (!owner) throw new AppError('مشتری پیدا نشد.', 404);
  if (req.body.requireInspector != null) owner.require_inspector = Boolean(req.body.requireInspector);
  if (req.body.priceCeiling !== undefined) {
    owner.price_ceiling = req.body.priceCeiling === null || req.body.priceCeiling === '' ? null : Number(req.body.priceCeiling);
  }
  if (req.body.verificationStatus) {
    throw new AppError('هویت صاحب کالا مدرک‌به‌مدرک بررسی می‌شود.', 400);
  }
  await owner.save();
  await audit(req.admin, 'owner.update', 'cargo_owner', owner.id, req.body);
  success(res, { message: 'پرونده مشتری به‌روز شد.' });
}));

router.post('/customers/:id/kyc/review', requirePermission('owners.documents'), asyncHandler(async (req, res) => {
  const owner = await CargoOwner.findByPk(req.params.id);
  if (!owner) throw new AppError('مشتری پیدا نشد.', 404);
  const result = ownerKyc.reviewDocument(owner.kyc, {
    key: req.body.key,
    decision: req.body.decision,
    reason: req.body.note,
  });
  owner.kyc = result.kyc;
  owner.changed('kyc', true);
  owner.verification_status = result.verificationStatus;
  owner.verification_note = result.verificationNote;
  await owner.save();
  if (result.notice && owner.user_id) {
    await notificationService.notify(owner.user_id, result.notice);
  }
  await audit(req.admin, 'owner.kyc.review', 'cargo_owner', owner.id, {
    key: req.body.key,
    decision: req.body.decision,
    note: result.kyc.documents[req.body.key]?.note || null,
  });
  success(res, {
    message: result.notice ? 'دلیل رد برای صاحب کالا ارسال شد.' : 'مدرک تأیید شد.',
    data: ownerKyc.present(owner.kyc),
  });
}));

router.get('/complaints', requirePermission('complaints'), asyncHandler(async (req, res) => {
  const rows = await Complaint.findAll({
    include: [{ model: User }, { model: Shipment }],
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  success(res, {
    data: rows.map((row) => ({
      id: row.id,
      type: row.type,
      description: row.description,
      status: row.status,
      adminResponse: row.admin_response,
      trackingCode: row.Shipment?.tracking_code,
      ownerPhone: row.User?.phone_number,
      createdAt: row.createdAt,
    })),
  });
}));

router.patch('/complaints/:id', requirePermission('complaints'), asyncHandler(async (req, res) => {
  const complaint = await Complaint.findByPk(req.params.id);
  if (!complaint) throw new AppError('تیکت پیدا نشد.', 404);
  if (req.body.status) complaint.status = req.body.status;
  if (req.body.adminResponse !== undefined) complaint.admin_response = req.body.adminResponse;
  await complaint.save();
  await audit(req.admin, 'complaint.update', 'complaint', complaint.id, req.body);
  success(res, { message: 'تیکت به‌روز شد.' });
}));

router.get('/settings', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  success(res, { data: await listSettings() });
}));

router.patch('/settings/:key', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  if (!SETTING_DEFAULTS[req.params.key]) throw new AppError('این تنظیم شناخته‌شده نیست.', 404);
  const row = await SystemSetting.findOne({ where: { key: req.params.key } });
  if (!row) throw new AppError('تنظیم پیدا نشد.', 404);
  const previous = row.value;
  row.value = JSON.stringify(req.body.value);
  row.updatedBy = req.admin.id;
  await row.save();
  clearSettingsCache();
  await audit(req.admin, 'settings.update', 'system_setting', req.params.key, { previous, value: req.body.value });
  success(res, { message: 'تنظیم ذخیره شد.', data: await listSettings() });
}));

router.get('/settings/history', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  const rows = await AdminAuditLog.findAll({
    where: { entity: 'system_setting' },
    order: [['createdAt', 'DESC']],
    limit: 50,
  });
  success(res, { data: rows });
}));

router.get('/reports/operations', requirePermission('reports.operations'), asyncHandler(async (req, res) => {
  success(res, { data: await buildReport(req.query, false) });
}));

router.get('/reports/financial', requirePermission('reports.financial'), asyncHandler(async (req, res) => {
  success(res, { data: await buildReport(req.query, true) });
}));

router.get('/reports/export', asyncHandler(async (req, res) => {
  const financial = req.query.kind === 'financial';
  if (financial && !can(req.admin.roles, 'reports.financial')) {
    throw new AppError('گزارش مالی فقط برای مدیر سامانه است.', 403);
  }
  if (!financial && !can(req.admin.roles, 'reports.operations') && !can(req.admin.roles, 'reports.financial')) {
    throw new AppError('به گزارش دسترسی ندارید.', 403);
  }
  const report = await buildReport(req.query, financial);
  const buffer = await buildWorkbook(report, financial);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="alamut-${financial ? 'financial' : 'operations'}.xlsx"`);
  res.send(Buffer.from(buffer));
}));

router.get('/admins', requirePermission('admins.manage'), asyncHandler(async (req, res) => {
  const rows = await Admin.findAll({ order: [['createdAt', 'DESC']] });
  success(res, { data: rows.map(authService.presentAdmin) });
}));

router.post('/admins', requirePermission('admins.manage'), asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const username = authService.normalizeUsername(req.body.username);
  const password = String(req.body.password || '');
  if (password.length < 8) throw new AppError('رمز عبور باید حداقل ۸ نویسه باشد.', 400);
  const fullName = String(req.body.fullName || '').trim();
  if (fullName.length < 3) throw new AppError('نام اپراتور را وارد کنید.', 400);
  const roles = assertRoles(req.body.roles);
  const existing = await Admin.findOne({ where: { phone } });
  if (existing) throw new AppError('این شماره قبلاً ثبت شده است.', 409);
  const taken = await Admin.findOne({ where: { username } });
  if (taken) throw new AppError('این نام کاربری قبلاً ثبت شده است.', 409);
  const admin = await Admin.create({
    phone,
    username,
    passwordHash: await authService.hashPassword(password),
    fullName,
    roles,
    isActive: true,
  });
  await audit(req.admin, 'admin.create', 'admin', admin.id, { phone, username, roles });
  success(res, { message: 'اپراتور ساخته شد.', data: authService.presentAdmin(admin) });
}));

router.patch('/admins/:id', requirePermission('admins.manage'), asyncHandler(async (req, res) => {
  const admin = await Admin.findByPk(req.params.id);
  if (!admin) throw new AppError('اپراتور پیدا نشد.', 404);
  if (req.body.fullName) admin.fullName = String(req.body.fullName).trim();
  if (req.body.roles) admin.roles = assertRoles(req.body.roles);
  if (req.body.isActive != null) {
    if (Number(admin.id) === Number(req.admin.id) && req.body.isActive === false) {
      throw new AppError('نمی‌توانید حساب خودتان را غیرفعال کنید.', 400);
    }
    admin.isActive = Boolean(req.body.isActive);
    if (!admin.isActive) admin.refreshTokenHash = null;
  }
  const supers = await Admin.findAll({ where: { isActive: true } });
  const still = supers.filter((item) => {
    const roles = item.id === admin.id ? parseRoles(admin.roles) : parseRoles(item.roles);
    const active = item.id === admin.id ? admin.isActive : item.isActive;
    return active && roles.includes('SUPER_ADMIN');
  });
  if (!still.length) throw new AppError('حداقل یک مدیر سامانه فعال باید بماند.', 400);
  admin.changed('roles', true);
  await admin.save();
  await audit(req.admin, 'admin.update', 'admin', admin.id, { roles: admin.roles, isActive: admin.isActive });
  success(res, { message: 'اپراتور به‌روز شد.', data: authService.presentAdmin(admin) });
}));

router.get('/audit', requirePermission('audit.read'), asyncHandler(async (req, res) => {
  const { page, limit, offset } = pageOf(req.query);
  const { rows, count } = await AdminAuditLog.findAndCountAll({ order: [['createdAt', 'DESC']], limit, offset });
  success(res, { data: { items: rows, total: count, page, limit } });
}));

async function buildReport(query, financial) {
  const where = {};
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt[Op.gte] = new Date(query.from);
    if (query.to) where.createdAt[Op.lte] = new Date(`${query.to}T23:59:59`);
  }
  const rows = await Shipment.findAll({
    where,
    include: [{ model: City, as: 'originCity' }, { model: City, as: 'destCity' }, { model: Driver, as: 'driver' }],
    order: [['createdAt', 'DESC']],
    limit: 1000,
  });
  const items = rows.map((row) => {
    const base = {
      trackingCode: row.tracking_code,
      status: WORKFLOW_LABELS[row.workflow_status] || row.workflow_status,
      origin: row.originCity?.name,
      destination: row.destCity?.name,
      driver: orderOps.driverName(row.driver),
      createdAt: row.createdAt,
    };
    if (!financial) return base;
    return {
      ...base,
      proposedPrice: Number(row.proposed_price || 0),
      estimatedPrice: Number(row.operator_price || 0),
      finalPrice: Number(row.final_price || 0),
      penalty: Number(row.penalty_amount || 0),
      waybillNumber: row.waybill_number || '',
    };
  });
  const summary = financial ? {
    freight: items.reduce((sum, item) => sum + (item.finalPrice || item.estimatedPrice || 0), 0),
    penalties: items.reduce((sum, item) => sum + item.penalty, 0),
    count: items.length,
  } : { count: items.length, completed: rows.filter((row) => row.workflow_status === 'COMPLETED').length };
  return { items, summary, financial };
}

module.exports = router;
