const { Op } = require('sequelize');
const { Shipment, Driver, DriverLocation, Alert, City, InspectionReport } = require('../models');
const { needsInspector, inspectorNoShow } = require('../inspector/policy');
const { evaluateMonitor } = require('./alertRules');
const { ACTIVE_TRIP } = require('./workflow');
const { getSettings } = require('./settingsStore');
const { logEvent } = require('./audit');
const { publish } = require('./realtime');
const { refreshPriority, driverName, num } = require('./orderOps');

const orderIncludes = [
  { model: City, as: 'originCity' },
  { model: City, as: 'destCity' },
  { model: Driver, as: 'driver' },
];

function pointOf(row, latKey, lngKey) {
  if (row[latKey] == null || row[lngKey] == null) return null;
  return { lat: Number(row[latKey]), lng: Number(row[lngKey]) };
}

async function openAlert(shipment, driver, draft) {
  const existing = await Alert.findOne({
    where: { shipmentId: shipment.id, type: draft.type, isResolved: false },
  });
  if (existing) return existing;
  const alert = await Alert.create({
    type: draft.type,
    shipmentId: shipment.id,
    driverId: driver?.id || shipment.driver_id,
    severity: draft.severity,
    message: draft.message,
  });
  await logEvent(shipment.id, {
    type: draft.type,
    description: draft.message,
    metadata: { alertId: alert.id, severity: draft.severity },
  });
  await refreshPriority(shipment);
  const payload = {
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    shipmentId: shipment.id,
    trackingCode: shipment.tracking_code,
    driverId: driver?.id || null,
    driverName: driverName(driver),
    createdAt: alert.createdAt,
  };
  publish({ type: 'alert', alert: payload });
  return alert;
}

async function evaluateShipment(shipment, driver, settings) {
  const result = evaluateMonitor({
    workflowStatus: shipment.workflow_status,
    origin: pointOf(shipment, 'origin_lat', 'origin_lng'),
    destination: pointOf(shipment, 'dest_lat', 'dest_lng'),
    eta: shipment.eta,
    driver: driver ? {
      lastLat: driver.lastLat,
      lastLng: driver.lastLng,
      lastLocationAt: driver.lastLocationAt,
      isGpsActive: driver.isGpsActive,
    } : null,
    deviationSince: shipment.deviation_since,
    originArrivedAt: shipment.origin_arrived_at,
    destArrivedAt: shipment.dest_arrived_at,
    settings,
  });
  shipment.deviation_since = result.deviationSince;
  if (result.originArrivedAt && !shipment.origin_arrived_at) {
    shipment.origin_arrived_at = result.originArrivedAt;
    await logEvent(shipment.id, { type: 'GEOFENCE', description: 'خودرو وارد محدوده بارگیری شد و حداقل زمان حضور ثبت شد.' });
  }
  if (result.destArrivedAt && !shipment.dest_arrived_at) {
    shipment.dest_arrived_at = result.destArrivedAt;
    await logEvent(shipment.id, { type: 'GEOFENCE', description: 'خودرو وارد محدوده مقصد شد و حداقل زمان حضور ثبت شد.' });
  }
  await shipment.save();
  for (const draft of result.alerts) await openAlert(shipment, driver, draft);
  const report = await InspectionReport.findOne({
    where: { shipmentId: shipment.id },
    order: [['createdAt', 'DESC']],
  });
  const absence = inspectorNoShow({
    needs: needsInspector(shipment, settings),
    workflowStatus: shipment.workflow_status,
    loadingDate: shipment.loading_date,
    loadingTimeTo: shipment.loading_time_to,
    graceMinutes: settings.inspector_grace_minutes,
    report,
  });
  if (absence) await openAlert(shipment, driver, absence);
}

async function ingestDriverPing({ driver, missionId, points = [], active = true }) {
  const settings = await getSettings();
  const cap = Number(settings.gps_offline_points) || 5000;
  const clean = points
    .map((point) => ({
      lat: Number(point.lat),
      lng: Number(point.lng),
      ts: point.ts ? new Date(point.ts) : new Date(),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .slice(-cap);
  if (clean.length) {
    const last = clean[clean.length - 1];
    driver.lastLat = last.lat;
    driver.lastLng = last.lng;
    driver.lastLocationAt = last.ts;
    await DriverLocation.bulkCreate(clean.map((point) => ({
      driverId: driver.id,
      shipmentId: missionId || null,
      lat: point.lat,
      lng: point.lng,
      recordedAt: point.ts,
    })));
  }
  driver.isGpsActive = active !== false && active !== 'false';
  await driver.save();
  let shipment = null;
  if (missionId) shipment = await Shipment.findByPk(missionId, { include: orderIncludes });
  if (!shipment) {
    shipment = await Shipment.findOne({
      where: { driver_id: driver.id, workflow_status: { [Op.in]: ACTIVE_TRIP } },
      include: orderIncludes,
    });
  }
  if (shipment) await evaluateShipment(shipment, driver, settings);
  publish({
    type: 'location',
    vehicle: vehicleOf(driver, shipment),
  });
  return { stored: clean.length, active: driver.isGpsActive };
}

function vehicleOf(driver, shipment) {
  return {
    id: driver.id,
    fullName: driverName(driver),
    phone: driver.phoneNumber,
    plate: driver.plate,
    availability: driver.availability,
    isGpsActive: Boolean(driver.isGpsActive),
    lastLocation: driver.lastLat != null ? { lat: num(driver.lastLat), lng: num(driver.lastLng) } : null,
    lastLocationAt: driver.lastLocationAt,
    shipment: shipment ? {
      id: shipment.id,
      trackingCode: shipment.tracking_code,
      workflowStatus: shipment.workflow_status,
      origin: shipment.originCity?.name,
      destination: shipment.destCity?.name,
    } : null,
  };
}

async function scanOnce() {
  const settings = await getSettings();
  const rows = await Shipment.findAll({
    where: { workflow_status: { [Op.in]: [...ACTIVE_TRIP, 'DRIVER_ACCEPTED', 'DRIVER_ASSIGNMENT', 'CUSTOMER_CONFIRMED'] } },
    include: orderIncludes,
  });
  for (const shipment of rows) {
    await evaluateShipment(shipment, shipment.driver, settings);
  }
}

function startMonitor() {
  const timer = setInterval(() => {
    scanOnce().catch((error) => console.error('پایش هشدارها:', error.message));
  }, 60 * 1000);
  if (timer.unref) timer.unref();
}

async function mapSnapshot() {
  const rows = await Shipment.findAll({
    where: { workflow_status: { [Op.in]: ACTIVE_TRIP } },
    include: orderIncludes,
  });
  const open = await Alert.findAll({ where: { isResolved: false, shipmentId: { [Op.ne]: null } } });
  const byShipment = {};
  for (const alert of open) {
    byShipment[alert.shipmentId] = byShipment[alert.shipmentId] || [];
    byShipment[alert.shipmentId].push(alert.severity);
  }
  return rows.filter((row) => row.driver).map((row) => {
    const severities = byShipment[row.id] || [];
    let tone = 'progress';
    if (!row.driver.isGpsActive || severities.includes('critical')) tone = 'crit';
    else if (severities.includes('warning')) tone = 'warn';
    else if (row.workflow_status === 'IN_TRANSIT') tone = 'progress';
    else tone = 'ok';
    return { ...vehicleOf(row.driver, row), tone, openAlerts: severities.length };
  });
}

module.exports = {
  ingestDriverPing,
  scanOnce,
  startMonitor,
  mapSnapshot,
  vehicleOf,
};
