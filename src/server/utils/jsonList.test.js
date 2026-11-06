const test = require('node:test');
const assert = require('node:assert/strict');
const { jsonList, photoList, urlList } = require('./jsonList');

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

test('complaint evidence keeps a legacy single url and a list of four photos', () => {
  assert.deepEqual(urlList('/uploads/one.jpg'), ['/uploads/one.jpg']);
  assert.deepEqual(urlList(JSON.stringify(['/uploads/a.jpg', '/uploads/b.jpg'])), ['/uploads/a.jpg', '/uploads/b.jpg']);
  assert.deepEqual(urlList(['/uploads/1.jpg', '/uploads/2.jpg', '/uploads/3.jpg', '/uploads/4.jpg', '/uploads/5.jpg']), [
    '/uploads/1.jpg',
    '/uploads/2.jpg',
    '/uploads/3.jpg',
    '/uploads/4.jpg',
  ]);
});
