const { Op } = require('sequelize');
const {
  Shipment, City, Zone, VehicleType, Driver, User, CargoOwner,
  Alert, OrderEvent, InspectionReport, Inspector, Complaint,
} = require('../models');
const AppError = require('../utils/AppError');
const { audit, logEvent, pageOf } = require('./audit');
const { deriveWorkflow, legacyPatch, isKnownStatus, WORKFLOW_LABELS, ACTIVE_TRIP } = require('./workflow');
const { calculatePenalty } = require('./penalty');
const { getSettings } = require('./settingsStore');
const { needsInspector } = require('../inspector/policy');
const { publish } = require('./realtime');
const { parseRoles } = require('./permissions');
const { jsonList, photoList } = require('../utils/jsonList');

const includes = [
  { model: City, as: 'originCity' },
  { model: City, as: 'destCity' },
  { model: Zone, as: 'originZone' },
  { model: Zone, as: 'destZone' },
  { model: VehicleType, as: 'vehicleType' },
  { model: Driver, as: 'driver' },
  { model: User, as: 'owner', include: [CargoOwner] },
  { model: Inspector, as: 'inspector' },
];

function num(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function driverName(driver) {
  if (!driver) return null;
  const name = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim();
  return name || 'راننده';
}

function combinedDriverStatus(driver) {
  if (!driver) return null;
  if (driver.verificationStatus === 'REJECTED') return 'REJECTED';
  if (driver.verificationStatus !== 'VERIFIED') return 'PENDING_VERIFICATION';
  if (driver.availability === 'BUSY') return 'BUSY';
  if (driver.availability === 'READY') return 'READY';
  return 'OFFLINE';
}

function presentDriver(driver) {
  if (!driver) return null;
  const row = driver.toJSON ? driver.toJSON() : driver;
  return {
    id: row.id,
    fullName: driverName(row),
    phone: row.phoneNumber,
    status: combinedDriverStatus(row),
    verificationStatus: row.verificationStatus,
    availability: row.availability,
    plate: row.plate,
    tractorType: row.tractorType,
    trailerType: row.trailerType,
    nationalId: row.nationalId,
    licenseNumber: row.licenseNumber,
    smartCardNumber: row.smartCardNumber,
    vehicleSpecs: row.vehicleSpecs,
    documents: row.documents || { personal: [], vehicle: [], insurance: [] },
    rejectionReason: row.rejectionReason,
    lastLocation: row.lastLat != null ? { lat: num(row.lastLat), lng: num(row.lastLng) } : null,
    lastLocationAt: row.lastLocationAt,
    isGpsActive: Boolean(row.isGpsActive),
    createdAt: row.createdAt,
  };
}

function presentOwner(user) {
  if (!user) return null;
  const profile = user.CargoOwner || user.cargoOwner;
  return {
    id: user.id,
    phone: user.phone_number,
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    companyName: profile?.company_name || '',
    nationalId: profile?.national_id || '',
    requireInspector: Boolean(profile?.require_inspector),
    priceCeiling: num(profile?.price_ceiling),
    verificationStatus: profile?.verification_status || 'PENDING',
    verificationNote: profile?.verification_note || '',
    cargoOwnerId: profile?.id || null,
  };
}

function presentOrder(row, extra = {}) {
  const data = row.toJSON ? row.toJSON() : row;
  const workflowStatus = deriveWorkflow(data);
  const estimated = data.operator_price != null ? num(data.operator_price) : num(data.proposed_price);
  return {
    id: data.id,
    trackingCode: data.tracking_code,
    workflowStatus,
    workflowLabel: WORKFLOW_LABELS[workflowStatus] || workflowStatus,
    legacyStatus: data.status,
    driverStatus: data.driver_status,
    proposedPrice: num(data.proposed_price),
    estimatedPrice: estimated,
    finalPrice: num(data.final_price),
    penaltyAmount: num(data.penalty_amount),
    delayMinutes: data.delay_minutes,
    forceMajeure: Boolean(data.force_majeure),
    forceMajeureReason: data.force_majeure_reason,
    vehicleType: data.vehicleType?.title || null,
    vehicleVariants: data.vehicle_variants || [],
    cargo: {
      type: data.cargo_type === 'other' ? (data.cargo_type_other || 'سایر') : data.cargo_type,
      weightKg: num(data.weight_kg),
      pieceCount: data.piece_count != null ? Number(data.piece_count) : null,
      value: num(data.cargo_value),
      packaging: data.packaging_type,
      lengthCm: data.length_cm,
      widthCm: data.width_cm,
      heightCm: data.height_cm,
      photos: data.photo_urls || [],
      notes: data.notes,
    },
    loading: {
      city: data.originCity?.name || '',
      province: data.originCity?.province || '',
      zone: data.originZone?.name || '',
      address: data.origin_address,
      lat: num(data.origin_lat),
      lng: num(data.origin_lng),
      date: data.loading_date,
      from: data.loading_time_from,
      to: data.loading_time_to,
    },
    unloading: {
      city: data.destCity?.name || '',
      province: data.destCity?.province || '',
      zone: data.destZone?.name || '',
      address: data.dest_address,
      lat: num(data.dest_lat),
      lng: num(data.dest_lng),
      receiverName: data.receiver_name,
      receiverPhone: data.receiver_phone,
    },
    eta: data.eta,
    owner: presentOwner(data.owner),
    driver: presentDriver(data.driver),
    inspector: data.inspector ? {
      id: data.inspector.id,
      fullName: data.inspector.fullName,
      phone: data.inspector.phone,
    } : null,
    waybillNumber: data.waybill_number,
    deliveryOtp: data.delivery_otp,
    requiresInspector: Boolean(data.requires_inspector),
    priority: data.priority_score || 0,
    urgency: data.urgency,
    openAlerts: extra.openAlerts || 0,
    alertItems: extra.alertItems,
    events: extra.events,
    inspections: extra.inspections,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function requireReason(value) {
  const text = String(value || '').trim();
  if (text.length < 3) throw new AppError('دلیل را حداقل در سه نویسه بنویسید.', 400);
  return text;
}

function money(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new AppError(`${label} نامعتبر است.`, 400);
  return Math.round(parsed);
}

async function loadOrder(id) {
  const row = await Shipment.findByPk(id, { include: includes });
  if (!row) throw new AppError('سفارش پیدا نشد.', 404);
  if (!row.workflow_status) {
    row.workflow_status = deriveWorkflow(row);
    await row.save();
  }
  return row;
}

async function setWorkflow(shipment, workflowStatus, { admin, reason, metadata, driverId }) {
  if (!isKnownStatus(workflowStatus)) throw new AppError('وضعیت نامعتبر است.', 400);
  const patch = legacyPatch(workflowStatus);
  const previous = deriveWorkflow(shipment);
  shipment.workflow_status = workflowStatus;
  if (patch.status) shipment.status = patch.status;
  if (workflowStatus !== 'ON_HOLD' && patch.driver_status !== undefined) {
    shipment.driver_status = patch.driver_status;
  }
  if (patch.price_status) shipment.price_status = patch.price_status;
  if (workflowStatus === 'CANCELLED') {
    shipment.cancel_reason = reason || shipment.cancel_reason;
    shipment.cancelled_by = 'operator';
  }
  if (workflowStatus === 'COMPLETED' && shipment.final_price == null) {
    shipment.final_price = shipment.operator_price || shipment.proposed_price;
  }
  await shipment.save();
  await logEvent(shipment.id, {
    type: 'STATUS_CHANGED',
    description: `وضعیت از «${WORKFLOW_LABELS[previous] || previous}» به «${WORKFLOW_LABELS[workflowStatus]}» تغییر کرد.${reason ? ` دلیل: ${reason}` : ''}`,
    adminId: admin?.id,
    metadata: { from: previous, to: workflowStatus, driverId: driverId || shipment.driver_id, ...(metadata || {}) },
  });
  publish({ type: 'order', orderId: shipment.id, workflowStatus });
  return shipment;
}

async function refreshPriority(shipment) {
  const open = await Alert.findAll({ where: { shipmentId: shipment.id, isResolved: false } });
  let score = 0;
  if (open.some((item) => item.severity === 'critical')) score += 100;
  else if (open.length) score += 40;
  if (shipment.urgency === 'urgent') score += 30;
  if (shipment.workflow_status === 'ON_HOLD') score += 20;
  if (ACTIVE_TRIP.includes(shipment.workflow_status)) score += 10;
  shipment.priority_score = score;
  await shipment.save();
  return score;
}

async function listOrders(query) {
  const { page, limit, offset } = pageOf(query);
  const where = {};
  if (query.status && isKnownStatus(query.status)) where.workflow_status = query.status;
  if (query.driverId) where.driver_id = query.driverId;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt[Op.gte] = new Date(query.from);
    if (query.to) where.createdAt[Op.lte] = new Date(`${query.to}T23:59:59`);
  }
  if (query.q) {
    const q = `%${String(query.q).trim()}%`;
    where[Op.or] = [
      { tracking_code: { [Op.like]: q } },
      { waybill_number: { [Op.like]: q } },
      { receiver_name: { [Op.like]: q } },
    ];
  }
  if (String(query.hasAlert) === 'true') {
    const open = await Alert.findAll({ where: { isResolved: false }, attributes: ['shipmentId'] });
    const ids = [...new Set(open.map((item) => item.shipmentId).filter(Boolean))];
    where.id = { [Op.in]: ids.length ? ids : [0] };
  }
  const cityInclude = { model: City, as: 'originCity' };
  if (query.city) {
    cityInclude.where = { name: { [Op.like]: `%${String(query.city).trim()}%` } };
    cityInclude.required = true;
  }
  const order = query.sort === 'newest'
    ? [['createdAt', 'DESC']]
    : [['priority_score', 'DESC'], ['createdAt', 'ASC']];
  const { rows, count } = await Shipment.findAndCountAll({
    where,
    include: includes.map((item) => (item.as === 'originCity' ? cityInclude : item)),
    order,
    limit,
    offset,
    distinct: true,
  });
  const ids = rows.map((row) => row.id);
  const open = ids.length
    ? await Alert.findAll({ where: { shipmentId: { [Op.in]: ids }, isResolved: false } })
    : [];
  const counts = {};
  for (const alert of open) counts[alert.shipmentId] = (counts[alert.shipmentId] || 0) + 1;
  return {
    items: rows.map((row) => presentOrder(row, { openAlerts: counts[row.id] || 0 })),
    total: count,
    page,
    limit,
  };
}

async function getOrder(id) {
  const row = await loadOrder(id);
  const [events, alerts, inspections] = await Promise.all([
    OrderEvent.findAll({
      where: { shipmentId: row.id },
      include: [{ model: require('../models').Admin, as: 'actor' }],
      order: [['createdAt', 'ASC']],
    }),
    Alert.findAll({ where: { shipmentId: row.id }, order: [['createdAt', 'DESC']] }),
    InspectionReport.findAll({
      where: { shipmentId: row.id },
      include: [{ model: Inspector, as: 'inspector' }],
      order: [['createdAt', 'DESC']],
    }),
  ]);
  return presentOrder(row, {
    openAlerts: alerts.filter((item) => !item.isResolved).length,
    alertItems: alerts.map(presentAlert),
    events: events.map((event) => ({
      id: event.id,
      type: event.eventType,
      description: event.description,
      at: event.createdAt,
      actor: event.actor ? event.actor.fullName : (event.metadata?.driverId ? 'راننده' : 'سامانه'),
      metadata: event.metadata,
      location: event.lat != null ? { lat: num(event.lat), lng: num(event.lng) } : null,
    })),
    inspections: inspections.map(presentInspection),
  });
}

function presentAlert(alert) {
  const row = alert.toJSON ? alert.toJSON() : alert;
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    message: row.message,
    isResolved: row.isResolved,
    resolutionAction: row.resolutionAction,
    shipmentId: row.shipmentId,
    driverId: row.driverId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function presentInspection(report) {
  const row = report.toJSON ? report.toJSON() : report;
  return {
    id: row.id,
    inspector: row.inspector ? { id: row.inspector.id, fullName: row.inspector.fullName, phone: row.inspector.phone } : null,
    checklist: jsonList(row.checklist),
    photos: photoList(row.photos).filter((photo) => photo.url),
    weightEmpty: num(row.weightEmpty),
    weightFull: num(row.weightFull),
    weightNet: num(row.weightNet),
    discrepancies: jsonList(row.discrepancies),
    decision: row.decision,
    decisionNote: row.decisionNote,
    createdAt: row.createdAt,
  };
}

async function changeStatus(admin, id, body) {
  const reason = requireReason(body.reason);
  const shipment = await loadOrder(id);
  const next = body.workflowStatus;
  if (!isKnownStatus(next)) throw new AppError('وضعیت نامعتبر است.', 400);
  if (['DRIVER_ACCEPTED', 'EN_ROUTE_TO_LOADING', 'AT_LOADING_INSPECTION'].includes(next) && !shipment.driver_id) {
    throw new AppError('اول راننده را تخصیص دهید.', 400);
  }
  const pastWaybill = ['WAYBILL_ISSUED', 'IN_TRANSIT', 'AT_DESTINATION_UNLOADING', 'COMPLETED'];
  if (['IN_TRANSIT', 'AT_DESTINATION_UNLOADING', 'COMPLETED'].includes(next) && !shipment.waybill_number && !pastWaybill.includes(shipment.workflow_status)) {
    throw new AppError('تا ثبت شماره بارنامه، حمل شروع نمی‌شود.', 400);
  }
  if (next === 'WAYBILL_ISSUED' || (['IN_TRANSIT', 'COMPLETED'].includes(next) && !shipment.waybill_number)) {
    await assertInspectionClear(shipment);
  }
  await setWorkflow(shipment, next, { admin, reason });
  await refreshPriority(shipment);
  await audit(admin, 'order.status', 'shipment', shipment.id, { workflowStatus: next, reason });
  return getOrder(shipment.id);
}

async function assertInspectionClear(shipment) {
  const settings = await getSettings();
  if (!needsInspector(shipment, settings)) return;
  const report = await InspectionReport.findOne({
    where: { shipmentId: shipment.id, decision: { [Op.in]: ['APPROVED', 'CORRECTED'] } },
  });
  if (!report) throw new AppError('برای این بار، تأیید بازرسی متصدی لازم است.', 400);
}

async function updatePrice(admin, id, body) {
  const reason = requireReason(body.reason);
  const shipment = await loadOrder(id);
  const before = { estimated: num(shipment.operator_price), final: num(shipment.final_price) };
  if (body.estimatedPrice != null) {
    const price = money(body.estimatedPrice, 'قیمت تخمینی');
    const ceiling = shipment.owner?.CargoOwner?.price_ceiling;
    const roles = parseRoles(admin.roles);
    if (ceiling && price > Number(ceiling) && !roles.includes('SUPER_ADMIN')) {
      throw new AppError('قیمت از سقف توافق‌شده با این مشتری بیشتر است.', 400);
    }
    shipment.operator_price = price;
    shipment.price_status = 'proposed';
  }
  if (body.finalPrice != null) shipment.final_price = money(body.finalPrice, 'قیمت نهایی');
  await shipment.save();
  await logEvent(shipment.id, {
    type: 'PRICE_UPDATED',
    description: `قیمت اصلاح شد. دلیل: ${reason}`,
    adminId: admin.id,
    metadata: { before, estimated: num(shipment.operator_price), final: num(shipment.final_price) },
  });
  await audit(admin, 'order.price', 'shipment', shipment.id, { reason, estimated: num(shipment.operator_price) });
  return getOrder(shipment.id);
}

async function assignDriver(admin, id, driverId, reasonText) {
  const reason = requireReason(reasonText);
  const shipment = await loadOrder(id);
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('راننده پیدا نشد.', 404);
  if (driver.verificationStatus !== 'VERIFIED' || driver.availability !== 'READY') {
    throw new AppError('فقط راننده تأییدشده و آماده را می‌توان تخصیص داد.', 400);
  }
  shipment.driver_id = driver.id;
  driver.availability = 'BUSY';
  await driver.save();
  await shipment.save();
  await setWorkflow(shipment, 'DRIVER_ACCEPTED', { admin, reason, driverId: driver.id });
  await logEvent(shipment.id, {
    type: 'DRIVER_ASSIGNED',
    description: `راننده ${driverName(driver)} تخصیص داده شد. دلیل: ${reason}`,
    adminId: admin.id,
    metadata: { driverId: driver.id },
  });
  await audit(admin, 'order.assign_driver', 'shipment', shipment.id, { driverId: driver.id, reason });
  publish({ type: 'order', orderId: shipment.id, workflowStatus: 'DRIVER_ACCEPTED' });
  return getOrder(shipment.id);
}

async function replaceDriver(admin, id, body) {
  const reason = requireReason(body.reason);
  const shipment = await loadOrder(id);
  const previousId = shipment.driver_id;
  if (previousId) {
    const previous = await Driver.findByPk(previousId);
    if (previous && previous.verificationStatus === 'VERIFIED') {
      previous.availability = 'READY';
      await previous.save();
    }
  }
  shipment.replaced_from_driver_id = previousId;
  let nextDriver = null;
  if (body.driverId) {
    nextDriver = await Driver.findByPk(body.driverId);
    if (!nextDriver || nextDriver.verificationStatus !== 'VERIFIED' || nextDriver.availability !== 'READY') {
      throw new AppError('راننده جایگزین باید تأییدشده و آماده باشد.', 400);
    }
    shipment.driver_id = nextDriver.id;
    nextDriver.availability = 'BUSY';
    await nextDriver.save();
  } else {
    shipment.driver_id = null;
  }
  await shipment.save();
  await logEvent(shipment.id, {
    type: 'DRIVER_REPLACED',
    description: `راننده جایگزین شد. دلیل: ${reason}`,
    adminId: admin.id,
    metadata: { fromDriverId: previousId, toDriverId: nextDriver?.id || null },
  });
  await setWorkflow(shipment, nextDriver ? 'DRIVER_ACCEPTED' : 'DRIVER_ASSIGNMENT', { admin, reason: `جایگزینی راننده: ${reason}` });
  await audit(admin, 'order.replace_driver', 'shipment', shipment.id, { from: previousId, to: nextDriver?.id || null, reason });
  return getOrder(shipment.id);
}

async function addNote(admin, id, body) {
  const text = requireReason(body.body);
  const kind = body.kind === 'phone_call' ? 'PHONE_CALL' : 'NOTE';
  const shipment = await loadOrder(id);
  await logEvent(shipment.id, {
    type: kind,
    description: kind === 'PHONE_CALL' ? `تماس تلفنی: ${text}` : text,
    adminId: admin.id,
  });
  await audit(admin, kind === 'PHONE_CALL' ? 'order.call' : 'order.note', 'shipment', shipment.id, { text });
  return getOrder(shipment.id);
}

async function issueWaybill(admin, id, body) {
  const shipment = await loadOrder(id);
  const waybillNumber = String(body.waybillNumber || '').trim();
  if (waybillNumber.length < 3) throw new AppError('شماره بارنامه را وارد کنید.', 400);
  await assertInspectionClear(shipment);
  shipment.waybill_number = waybillNumber;
  shipment.delivery_otp = String(body.deliveryOtp || '').trim() || String(Math.floor(1000 + Math.random() * 9000));
  await shipment.save();
  if (['AT_LOADING_INSPECTION', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_LOADING', 'DRIVER_ASSIGNMENT'].includes(shipment.workflow_status)) {
    await setWorkflow(shipment, 'WAYBILL_ISSUED', { admin, reason: 'صدور بارنامه' });
  }
  await logEvent(shipment.id, {
    type: 'WAYBILL',
    description: `بارنامه ${waybillNumber} ثبت شد. کد تحویل برای گیرنده صادر شد.`,
    adminId: admin.id,
    metadata: { waybillNumber, deliveryOtp: shipment.delivery_otp },
  });
  await audit(admin, 'order.waybill', 'shipment', shipment.id, { waybillNumber });
  return getOrder(shipment.id);
}

async function applyPenalty(admin, id, body) {
  const shipment = await loadOrder(id);
  const settings = await getSettings();
  const freight = num(shipment.final_price) || num(shipment.operator_price) || num(shipment.proposed_price) || 0;
  const result = calculatePenalty({
    delayMinutes: body.delayMinutes,
    stepMinutes: settings.penalty_step_minutes,
    perStep: settings.penalty_per_step,
    capRatio: settings.penalty_cap_ratio,
    freight,
    forceMajeure: Boolean(body.forceMajeure),
  });
  if (body.forceMajeure) requireReason(body.reason);
  shipment.delay_minutes = Math.max(0, parseInt(body.delayMinutes, 10) || 0);
  shipment.force_majeure = Boolean(body.forceMajeure);
  shipment.force_majeure_reason = body.forceMajeure ? String(body.reason).trim() : null;
  shipment.penalty_amount = result.amount;
  await shipment.save();
  await logEvent(shipment.id, {
    type: 'PENALTY',
    description: body.forceMajeure
      ? `جریمه به‌خاطر فورس‌ماژور صفر شد. دلیل: ${shipment.force_majeure_reason}`
      : `جریمه تأخیر ${result.amount.toLocaleString('fa-IR')} تومان برای ${shipment.delay_minutes} دقیقه ثبت شد.`,
    adminId: admin.id,
    metadata: result,
  });
  await audit(admin, 'order.penalty', 'shipment', shipment.id, { ...result, delayMinutes: shipment.delay_minutes });
  return { order: await getOrder(shipment.id), penalty: result };
}

async function listReadyDrivers() {
  const rows = await Driver.findAll({
    where: { verificationStatus: 'VERIFIED', availability: 'READY' },
    order: [['updatedAt', 'DESC']],
  });
  return rows.map(presentDriver);
}

module.exports = {
  includes,
  presentOrder,
  presentDriver,
  presentAlert,
  presentInspection,
  combinedDriverStatus,
  driverName,
  loadOrder,
  setWorkflow,
  refreshPriority,
  listOrders,
  getOrder,
  changeStatus,
  updatePrice,
  assignDriver,
  replaceDriver,
  addNote,
  issueWaybill,
  applyPenalty,
  listReadyDrivers,
  num,
};
