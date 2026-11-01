import test from 'node:test';
import assert from 'node:assert/strict';
import { gpsQueueKey, GpsQueue } from './gpsQueue.js';

test('gpsQueueKey namespaces points per mission so old trips are not replayed', () => {
  assert.equal(gpsQueueKey(12), 'alamut_gps_queue:12');
  assert.equal(gpsQueueKey('ADM-1'), 'alamut_gps_queue:ADM-1');
  assert.equal(gpsQueueKey(), 'alamut_gps_queue');
});

test('GpsQueue keeps the newest point as latest()', () => {
  const store = {};
  const queue = new GpsQueue(9);
  queue.storage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value;
    },
  };
  queue.points = [];
  queue.add({ lat: 35.6, lng: 51.3, ts: 1 });
  queue.add({ lat: 36.2, lng: 59.6, ts: 2 });
  assert.equal(queue.size(), 2);
  assert.deepEqual(queue.latest(), { lat: 36.2, lng: 59.6, ts: 2 });
  assert.equal(queue.getBatch(1)[0].lat, 35.6);
});
