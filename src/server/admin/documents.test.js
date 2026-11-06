const test = require('node:test');
const assert = require('node:assert/strict');
const {
  upsertDocument,
  reviewDocument,
  present,
  setIdType,
  overallStatus,
  flatDocuments,
} = require('./documents');

test('choosing birth certificate only asks for selfie and the document photo', () => {
  const stored = setIdType(null, 'shenasnameh');
  const view = present(stored);
  assert.equal(view.idType, 'shenasnameh');
  assert.deepEqual(view.documents.map((item) => item.key), ['shenasnameh:selfie', 'shenasnameh:front']);
});

test('national card slots are selfie plus the card photo', () => {
  const stored = setIdType(null, 'national_card');
  const view = present(stored);
  assert.deepEqual(view.documents.map((item) => item.title), ['سلفی با کارت ملی', 'کارت ملی']);
});

test('uploading a photo stores it as pending and it is still there after present()', () => {
  const first = upsertDocument({ idType: 'shenasnameh' }, {
    key: 'shenasnameh:front',
    url: '/uploads/a.jpg',
  });
  const view = present(first);
  const front = view.documents.find((item) => item.key === 'shenasnameh:front');
  assert.equal(front.url, '/uploads/a.jpg');
  assert.equal(front.status, 'PENDING');
  assert.equal(overallStatus(first), 'PENDING_VERIFICATION');
});

test('approving both photos of the chosen type verifies the driver', () => {
  let docs = upsertDocument({ idType: 'national_card' }, {
    key: 'national_card:selfie',
    url: '/uploads/s.jpg',
  });
  docs = upsertDocument(docs, { key: 'national_card:front', url: '/uploads/c.jpg' });
  const selfie = reviewDocument(docs, { key: 'national_card:selfie', decision: 'APPROVED' });
  const card = reviewDocument(selfie.documents, { key: 'national_card:front', decision: 'APPROVED' });
  assert.equal(card.verificationStatus, 'VERIFIED');
  assert.equal(card.availability, 'READY_IF_OFFLINE');
});

test('legacy grouped driver documents alias onto the national card slots', () => {
  const list = flatDocuments({
    personal: [
      { key: 'selfie:selfie', title: 'سلفی', status: 'PENDING', url: '/uploads/s.jpg' },
      { key: 'nationalCard:front', title: 'کارت ملی', status: 'PENDING', url: '/uploads/c.jpg' },
    ],
    vehicle: [],
    insurance: [],
  });
  const byKey = Object.fromEntries(list.map((item) => [item.key, item]));
  assert.equal(byKey['national_card:selfie'].url, '/uploads/s.jpg');
  assert.equal(byKey['national_card:front'].url, '/uploads/c.jpg');
});

test('an approved driver document cannot be replaced', () => {
  const docs = upsertDocument({ idType: 'shenasnameh' }, {
    key: 'shenasnameh:front',
    url: '/uploads/a.jpg',
  });
  const approved = reviewDocument(docs, { key: 'shenasnameh:front', decision: 'APPROVED' });
  assert.throws(
    () => upsertDocument(approved.documents, {
      key: 'shenasnameh:front',
      url: '/uploads/b.jpg',
    }),
    /قابل تغییر نیست/,
  );
});

test('saved JSON still shows the uploaded photo after a reload-style parse', () => {
  const saved = upsertDocument({ idType: 'shenasnameh' }, {
    key: 'shenasnameh:selfie',
    url: '/uploads/x.jpg',
  });
  const reloaded = JSON.parse(JSON.stringify(saved));
  const view = present(reloaded);
  assert.equal(view.documents.find((item) => item.key === 'shenasnameh:selfie').url, '/uploads/x.jpg');
  assert.equal(view.documents.find((item) => item.key === 'shenasnameh:selfie').status, 'PENDING');
});

test('only the chosen identity type is shown; extras like license back are dropped', () => {
  const view = present({
    idType: 'shenasnameh',
    documents: {
      'shenasnameh:selfie': { url: '/uploads/a.jpg', status: 'PENDING' },
      'shenasnameh:front': { url: '/uploads/b.jpg', status: 'PENDING' },
      'national_card:selfie': { url: '/uploads/c.jpg', status: 'PENDING' },
      'driverLicense:front': { url: '/uploads/d.jpg', status: 'PENDING' },
    },
  });
  assert.deepEqual(view.documents.map((item) => item.key), ['shenasnameh:selfie', 'shenasnameh:front']);
});

test('verified identity cannot switch from birth certificate to national card', () => {
  let docs = setIdType(null, 'national_card');
  docs = upsertDocument(docs, { key: 'national_card:selfie', url: '/uploads/s.jpg' });
  docs = upsertDocument(docs, { key: 'national_card:front', url: '/uploads/c.jpg' });
  const first = reviewDocument(docs, { key: 'national_card:selfie', decision: 'APPROVED' });
  const both = reviewDocument(first.documents, { key: 'national_card:front', decision: 'APPROVED' });
  assert.equal(both.verificationStatus, 'VERIFIED');
  assert.throws(() => setIdType(both.documents, 'shenasnameh'), /قابل تغییر نیست/);
});

test('rejecting a document requires a reason and builds a driver notice', () => {
  const docs = upsertDocument({ idType: 'shenasnameh' }, {
    key: 'shenasnameh:selfie',
    url: '/uploads/selfie.jpg',
  });
  assert.throws(
    () => reviewDocument(docs, { key: 'shenasnameh:selfie', decision: 'REJECTED', reason: 'نه' }),
    /دلیل رد/,
  );
  const result = reviewDocument(docs, {
    key: 'shenasnameh:selfie',
    decision: 'REJECTED',
    note: 'چهره با شناسنامه خوانا نیست',
  });
  assert.equal(result.verificationStatus, 'REJECTED');
  assert.equal(result.availability, 'OFFLINE');
  assert.equal(result.notice.title, 'مدرک رد شد');
  assert.match(result.notice.message, /چهره با شناسنامه خوانا نیست/);
});
