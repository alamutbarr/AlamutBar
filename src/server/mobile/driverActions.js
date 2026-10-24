const { Driver, Shipment } = require('../models');
const AppError = require('../utils/AppError');
const { setWorkflow, loadOrder } = require('../admin/orderOps');
const { assertDeliveryOtp } = require('./missionPolicy');
const { logEvent } = require('../admin/audit');

const DRIVER_TO_WORKFLOW = {
  Accepted: 'DRIVER_ACCEPTED',
  EnRouteToPickup: 'EN_ROUTE_TO_LOADING',
  ArrivedPickup: 'AT_LOADING_INSPECTION',
  WaybillIssued: 'WAYBILL_ISSUED',
  InTransit: 'IN_TRANSIT',
  NearDestination: 'AT_DESTINATION_UNLOADING',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
};

async function loadMine(missionId, driverId) {
  const mission = await Shipment.findByPk(missionId);
  if (!mission) throw new AppError('مأموریت پیدا نشد.', 404);
  return mission;
}

async function markBusy(driver) {
  driver.availability = 'BUSY';
  await driver.save();
}

async function markReady(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (driver && driver.verificationStatus === 'VERIFIED') {
    driver.availability = 'READY';
    await driver.save();
  }
}

async function applyLegacyDriverStatus({ missionId, driverId, status, deliveryOtp, exceptionReason }) {
  const mission = await loadMine(missionId, driverId);
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('راننده پیدا نشد.', 401);
  const mine = mission.driver_id != null && String(mission.driver_id) === String(driverId);

  if (status === 'Declined') {
    const declined = Array.isArray(mission.declined_by) ? mission.declined_by : [];
    mission.declined_by = [...new Set([...declined.map(String), String(driverId)])];
    mission.changed('declined_by', true);
    await mission.save();
    await logEvent(mission.id, {
      type: 'MISSION_DECLINED',
      description: 'راننده مأموریت را نپذیرفت.',
      metadata: { driverId },
    });
    return { driverStatus: mission.driver_status || 'Offered' };
  }

  if (status === 'Accepted') {
    if (mission.driver_id && !mine) throw new AppError('این بار را راننده دیگری قبول کرده است.', 409);
    mission.driver_id = driver.id;
    await mission.save();
    await markBusy(driver);
    await setWorkflow(mission, 'DRIVER_ACCEPTED', { reason: 'قبول مأموریت توسط راننده', driverId });
    return { driverStatus: 'Accepted' };
  }

  if (mission.driver_id && !mine) throw new AppError('این بار را راننده دیگری قبول کرده است.', 409);
  if (!mission.driver_id) mission.driver_id = driver.id;

  const workflow = DRIVER_TO_WORKFLOW[status];
  if (!workflow) throw new AppError('وضعیت نامعتبر است.', 400);

  if (workflow === 'IN_TRANSIT' && !mission.waybill_number && mission.workflow_status !== 'WAYBILL_ISSUED' && mission.driver_status !== 'WaybillIssued') {
    throw new AppError('تا صدور بارنامه، حمل شروع نمی‌شود. هماهنگی با اپراتور است.', 400);
  }

  if (workflow === 'COMPLETED') {
    const check = assertDeliveryOtp({
      expected: mission.delivery_otp,
      provided: deliveryOtp,
      exceptionReason,
    });
    if (!check.ok) throw new AppError(check.error, 400);
    mission.driver_id = driver.id;
    mission.status = 'delivered';
    mission.driver_status = 'Completed';
    mission.workflow_status = 'AT_DESTINATION_UNLOADING';
    await mission.save();
    await logEvent(mission.id, {
      type: 'DELIVERY_CONFIRMED',
      description: check.method === 'exception'
        ? `تحویل بدون کد، با دلیل: ${String(exceptionReason).trim()}`
        : 'کد تحویل تأیید شد و تخلیه ثبت شد. منتظر تأیید صاحب کالا.',
      metadata: { method: check.method, driverId },
    });
    await markReady(driver.id);
    return { driverStatus: 'Completed' };
  }

  if (workflow === 'CANCELLED') await markReady(driver.id);
  if (['DRIVER_ACCEPTED', 'EN_ROUTE_TO_LOADING', 'AT_LOADING_INSPECTION', 'WAYBILL_ISSUED', 'IN_TRANSIT', 'AT_DESTINATION_UNLOADING'].includes(workflow)) {
    await markBusy(driver);
  }

  await setWorkflow(mission, workflow, { reason: 'به‌روزرسانی از اپ راننده', driverId });
  return { driverStatus: mission.driver_status };
}

module.exports = { applyLegacyDriverStatus, DRIVER_TO_WORKFLOW };
