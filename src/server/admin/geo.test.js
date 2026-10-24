const test = require('node:test');
const assert = require('node:assert/strict');
const { haversineKm, distanceToSegmentKm } = require('./geo');

test('distance to the route segment is zero on the line endpoints', () => {
  const tehran = { lat: 35.72, lng: 51.33 };
  const neyshabur = { lat: 36.21, lng: 58.8 };
  assert.ok(haversineKm(tehran, neyshabur) > 500);
  assert.ok(distanceToSegmentKm(tehran, tehran, neyshabur) < 0.01);
});

test('a point well off the corridor is beyond the 10km threshold', () => {
  const start = { lat: 35.7, lng: 51.4 };
  const end = { lat: 32.65, lng: 51.67 };
  const off = { lat: 34.2, lng: 51.9 };
  const distance = distanceToSegmentKm(off, start, end);
  assert.ok(distance > 10);
});
