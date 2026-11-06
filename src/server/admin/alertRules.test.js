const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateMonitor } = require('./alertRules');

const origin = { lat: 35.72, lng: 51.33 };
const destination = { lat: 32.65, lng: 51.67 };
const now = new Date('2026-10-24T12:00:00Z');

test('gps cut uses the last valid fix', () => {
  const result = evaluateMonitor({
    workflowStatus: 'IN_TRANSIT',
    origin,
    destination,
    driver: {
      isGpsActive: false,
      lastLat: 34.2,
      lastLng: 51.5,
      lastLocationAt: new Date('2026-10-24T11:20:00Z'),
    },
    settings: { gps_stale_minutes: 10, deviation_km: 10, deviation_minutes: 15 },
    now,
  });
  assert.ok(result.alerts.some((alert) => alert.type === 'GPS_CUT' && alert.severity === 'critical'));
});

test('route deviation waits 15 minutes and 10 kilometres', () => {
  const fresh = evaluateMonitor({
    workflowStatus: 'IN_TRANSIT',
    origin,
    destination,
    driver: { isGpsActive: true, lastLat: 34.2, lastLng: 52.05, lastLocationAt: now },
    deviationSince: new Date('2026-10-24T11:50:00Z'),
    settings: { deviation_km: 10, deviation_minutes: 15, gps_stale_minutes: 10 },
    now,
  });
  assert.equal(fresh.alerts.some((alert) => alert.type === 'ROUTE_DEVIATION'), false);

  const held = evaluateMonitor({
    workflowStatus: 'IN_TRANSIT',
    origin,
    destination,
    driver: { isGpsActive: true, lastLat: 34.2, lastLng: 52.05, lastLocationAt: now },
    deviationSince: new Date('2026-10-24T11:30:00Z'),
    settings: { deviation_km: 10, deviation_minutes: 15, gps_stale_minutes: 10 },
    now,
  });
  assert.ok(held.alerts.some((alert) => alert.type === 'ROUTE_DEVIATION'));
});

test('dispatch delay fires 45 minutes after ETA', () => {
  const result = evaluateMonitor({
    workflowStatus: 'DRIVER_ACCEPTED',
    eta: new Date('2026-10-24T10:00:00Z'),
    driver: { isGpsActive: true, lastLocationAt: now },
    settings: { dispatch_delay_minutes: 45 },
    now,
  });
  assert.ok(result.alerts.some((alert) => alert.type === 'DELAY'));
});
