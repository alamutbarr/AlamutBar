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
