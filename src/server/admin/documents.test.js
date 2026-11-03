const test = require('node:test');
const assert = require('node:assert/strict');
const { upsertDocument, reviewDocument } = require('./documents');

test('uploading a document stores it as pending and clears a previous rejection', () => {
  const first = upsertDocument(null, {
    group: 'personal',
    key: 'driverLicense:front',
    title: 'روی گواهینامه',
    url: '/uploads/a.jpg',
  });
  const rejected = reviewDocument(first, {
    group: 'personal',
    index: 0,
    decision: 'REJECTED',
    reason: 'تصویر ناخوانا است',
  });
  const again = upsertDocument(rejected.documents, {
    group: 'personal',
    key: 'driverLicense:front',
    title: 'روی گواهینامه',
    url: '/uploads/b.jpg',
  });
  assert.equal(again.personal[0].status, 'PENDING');
  assert.equal(again.personal[0].note, '');
  assert.equal(again.personal[0].url, '/uploads/b.jpg');
});

test('rejecting a document requires a reason and builds a driver notice', () => {
  const docs = upsertDocument(null, {
    group: 'personal',
    key: 'selfie:selfie',
    title: 'عکس شخصی با کارت',
    url: '/uploads/selfie.jpg',
  });
  assert.throws(
    () => reviewDocument(docs, { group: 'personal', index: 0, decision: 'REJECTED', reason: 'نه' }),
    /دلیل رد/,
  );
  const result = reviewDocument(docs, {
    group: 'personal',
    index: 0,
    decision: 'REJECTED',
    reason: 'چهره با کارت خوانا نیست',
  });
  assert.equal(result.verificationStatus, 'REJECTED');
  assert.equal(result.availability, 'OFFLINE');
  assert.equal(result.notice.title, 'مدرک رد شد');
  assert.match(result.notice.message, /چهره با کارت خوانا نیست/);
  assert.equal(result.documents.personal[0].status, 'REJECTED');
});

test('an approved driver document cannot be replaced', () => {
  const docs = upsertDocument(null, {
    group: 'personal',
    key: 'driverLicense:front',
    title: 'روی گواهینامه',
    url: '/uploads/a.jpg',
  });
  const approved = reviewDocument(docs, { group: 'personal', index: 0, decision: 'APPROVED' });
  assert.throws(
    () => upsertDocument(approved.documents, {
      group: 'personal',
      key: 'driverLicense:front',
      title: 'روی گواهینامه',
      url: '/uploads/b.jpg',
    }),
    /قابل تغییر نیست/,
  );
});

test('approving every document marks the driver verified', () => {
  let docs = upsertDocument(null, {
    group: 'vehicle',
    key: 'vehicleCard:front',
    title: 'روی کارت خودرو',
    url: '/uploads/card.jpg',
  });
  const result = reviewDocument(docs, { group: 'vehicle', index: 0, decision: 'APPROVED' });
  assert.equal(result.verificationStatus, 'VERIFIED');
  assert.equal(result.notice, null);
  assert.equal(result.availability, 'READY_IF_OFFLINE');
});

test('documents saved as a JSON string by the database are still readable by the operator', () => {
  const { normalizeDocuments: norm } = require('./documents');
  const stored = JSON.stringify({ personal: [{ key: 'id:front', title: 'کارت ملی', url: '/uploads/a.jpg', status: 'PENDING', note: '' }] });
  assert.equal(norm(stored).personal.length, 1);
  assert.equal(norm(JSON.stringify(stored)).personal[0].url, '/uploads/a.jpg');
});

test('a new upload keeps documents already stored as a JSON string', () => {
  const { upsertDocument: up } = require('./documents');
  const stored = JSON.stringify({ personal: [{ key: 'a', title: 'A', url: '/uploads/a.jpg', status: 'PENDING', note: '' }] });
  const next = up(stored, { group: 'vehicle', key: 'b', title: 'B', url: '/uploads/b.jpg' });
  assert.equal(next.personal.length, 1);
  assert.equal(next.vehicle.length, 1);
});
