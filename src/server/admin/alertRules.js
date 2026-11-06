const { distanceToSegmentKm, haversineKm } = require('./geo');
const { ACTIVE_TRIP, PRE_DEPARTURE } = require('./workflow');

function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function evaluateMonitor({
  workflowStatus,
  origin,
  destination,
  eta,
  driver,
  deviationSince,
  originArrivedAt,
  destArrivedAt,
  settings = {},
  now = new Date(),
}) {
  const alerts = [];
  const deviationKm = num(settings.deviation_km, 10);
  const deviationMinutes = num(settings.deviation_minutes, 15);
  const delayMinutes = num(settings.dispatch_delay_minutes, 45);
  const staleMinutes = num(settings.gps_stale_minutes, 10);
  const fenceM = num(settings.geofence_loading_m, 500);
  const destFenceM = num(settings.geofence_dest_m, 500);
  const dwellSec = num(settings.geofence_dwell_seconds, 90);
  const point = driver && driver.lastLat != null
    ? { lat: Number(driver.lastLat), lng: Number(driver.lastLng) }
    : null;
  const onTrip = ACTIVE_TRIP.includes(workflowStatus);

  let nextDeviation = deviationSince ? new Date(deviationSince) : null;
  let nextOrigin = originArrivedAt ? new Date(originArrivedAt) : null;
  let nextDest = destArrivedAt ? new Date(destArrivedAt) : null;
  const geofenceEvents = [];

  if (onTrip && driver) {
    const lastAt = driver.lastLocationAt ? new Date(driver.lastLocationAt) : null;
    const ageMin = lastAt ? (now.getTime() - lastAt.getTime()) / 60000 : Infinity;
    const gpsDead = driver.isGpsActive === false || !lastAt || ageMin > staleMinutes;
    if (gpsDead) {
      alerts.push({
        type: 'GPS_CUT',
        severity: 'critical',
        message: lastAt
          ? `قطع GPS. آخرین موقعیت معتبر ${Math.round(ageMin)} دقیقه پیش است.`
          : 'قطع GPS. هیچ موقعیت معتبری ثبت نشده است.',
      });
    }
  }

  if (onTrip && point && origin && destination) {
    const offKm = distanceToSegmentKm(point, origin, destination);
    if (offKm != null && offKm > deviationKm) {
      if (!nextDeviation) nextDeviation = now;
      const lasted = (now.getTime() - nextDeviation.getTime()) / 60000;
      if (lasted >= deviationMinutes) {
        alerts.push({
          type: 'ROUTE_DEVIATION',
          severity: offKm > deviationKm * 2.5 ? 'critical' : 'warning',
          message: `انحراف ${offKm.toFixed(1)} کیلومتر از مسیر، به مدت ${Math.floor(lasted)} دقیقه.`,
        });
      }
    } else {
      nextDeviation = null;
    }
  }

  if (PRE_DEPARTURE.includes(workflowStatus) && eta) {
    const due = new Date(eta);
    const late = (now.getTime() - due.getTime()) / 60000;
    if (late > delayMinutes) {
      alerts.push({
        type: 'DELAY',
        severity: 'warning',
        message: `تأخیر اعزام ${Math.round(late)} دقیقه نسبت به ETA.`,
      });
    }
  }

  if (point && origin && !nextOrigin) {
    const meters = (haversineKm(point, origin) || 0) * 1000;
    if (meters <= fenceM) {
      const since = driver?.insideOriginSince ? new Date(driver.insideOriginSince) : now;
      if ((now.getTime() - since.getTime()) / 1000 >= dwellSec) {
        nextOrigin = now;
        geofenceEvents.push('وارد محدوده بارگیری شد');
      }
    }
  }
  if (point && destination && !nextDest && ['IN_TRANSIT', 'WAYBILL_ISSUED', 'AT_DESTINATION_UNLOADING'].includes(workflowStatus)) {
    const meters = (haversineKm(point, destination) || 0) * 1000;
    if (meters <= destFenceM) {
      const since = driver?.insideDestSince ? new Date(driver.insideDestSince) : now;
      if ((now.getTime() - since.getTime()) / 1000 >= dwellSec) {
        nextDest = now;
        geofenceEvents.push('وارد محدوده مقصد شد');
      }
    }
  }

  return {
    alerts,
    deviationSince: nextDeviation,
    originArrivedAt: nextOrigin,
    destArrivedAt: nextDest,
    geofenceEvents,
  };
}

module.exports = { evaluateMonitor };
