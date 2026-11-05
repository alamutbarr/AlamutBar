const test = require('node:test');
const assert = require('node:assert/strict');
const { upsertDocument, reviewDocument, normalizeDocuments, flatDocuments } = require('./documents');

test('legacy document keys alias onto driver panel slots', () => {
  const list = flatDocuments({
    personal: [{ key: 'license', title: 'گواهینامه', status: 'APPROVED', url: '/uploads/a.jpg' }],
    vehicle: [{ key: 'vehicle_card', title: 'کارت خودرو', status: 'PENDING', url: '/uploads/b.jpg' }],
    insurance: [],
  });
  const byKey = Object.fromEntries(list.map((item) => [item.key, item]));
  assert.equal(byKey['driverLicense:front'].url, '/uploads/a.jpg');
  assert.equal(byKey['vehicleCard:front'].status, 'PENDING');
});

test('flat documents stay readable whether stored grouped or as an array', () => {
  const grouped = upsertDocument(null, {
    group: 'personal',
    key: 'driverLicense:front',
    title: 'روی گواهینامه',
    url: '/uploads/a.jpg',
  });
  const fromArray = normalizeDocuments([{ key: 'selfie:selfie', title: 'عکس شخصی با کارت', url: '/uploads/s.jpg', group: 'personal' }]);
  assert.equal(flatDocuments(grouped)[0].key, 'driverLicense:front');
  assert.equal(fromArray.personal[0].key, 'selfie:selfie');
});

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

test('reviewing by document key finds the slot even if groups differ', () => {
  const docs = upsertDocument(null, {
    group: 'personal',
    key: 'nationalCard:front',
    title: 'روی کارت ملی',
    url: '/uploads/card.jpg',
  });
  const result = reviewDocument(docs, { key: 'nationalCard:front', decision: 'APPROVED' });
  assert.equal(result.documents.personal[0].status, 'APPROVED');
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
