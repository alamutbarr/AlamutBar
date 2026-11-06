const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePoint, pickLatestPoint } = require('./locationPoint');

test('normalizePoint drops swapped or non-numeric coordinates', () => {
  assert.equal(normalizePoint(null), null);
  assert.equal(normalizePoint({ lat: 'x', lng: 51.4 }), null);
  assert.deepEqual(normalizePoint({ lat: '35.7', lng: '51.4', ts: '2026-01-01T00:00:00.000Z' }), {
    lat: 35.7,
    lng: 51.4,
    ts: new Date('2026-01-01T00:00:00.000Z'),
  });
});

test('pickLatestPoint uses the newest timestamp, not array order', () => {
  const older = { lat: 35.6, lng: 51.3, ts: new Date('2026-01-01T10:00:00Z') };
  const newer = { lat: 36.2, lng: 59.6, ts: new Date('2026-01-01T10:05:00Z') };
  assert.deepEqual(pickLatestPoint([newer, older]), newer);
  assert.deepEqual(pickLatestPoint([older, newer]), newer);
  assert.equal(pickLatestPoint([]), null);
});
