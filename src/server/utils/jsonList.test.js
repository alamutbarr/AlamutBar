const test = require('node:test');
const assert = require('node:assert/strict');
const { jsonList, photoList } = require('./jsonList');

test('a JSON text column still becomes a photo list', () => {
  const stored = JSON.stringify([{ kind: 'seal', url: '/uploads/seal.png' }]);
  assert.deepEqual(photoList(stored), [{ kind: 'seal', url: '/uploads/seal.png' }]);
  assert.deepEqual(photoList(JSON.stringify(stored)), [{ kind: 'seal', url: '/uploads/seal.png' }]);
});

test('an object or a bare url does not throw when the inspections page lists photos', () => {
  assert.deepEqual(photoList({ kind: 'lashing', url: '/uploads/lash.png' }), [{ kind: 'lashing', url: '/uploads/lash.png' }]);
  assert.deepEqual(photoList({ seal: '/uploads/seal.png' }), [{ kind: 'other', url: '/uploads/seal.png' }]);
  assert.deepEqual(photoList('/uploads/plain.png'), [{ kind: 'other', url: '/uploads/plain.png' }]);
  assert.deepEqual(photoList(null), []);
  assert.deepEqual(jsonList('[{"field":"vehicle"}]'), [{ field: 'vehicle' }]);
});
