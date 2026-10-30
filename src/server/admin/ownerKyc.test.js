const test = require('node:test');
const assert = require('node:assert/strict');
const {
  setIdType, uploadDocument, reviewDocument, overallStatus, present,
  shipmentGateMessage, KYC_SHIPMENT_MISSING, KYC_SHIPMENT_PENDING, KYC_SHIPMENT_REJECTED,
} = require('./ownerKyc');

function pack(idType) {
  let state = setIdType(null, idType);
  const prefix = idType === 'shenasnameh' ? 'shenasnameh' : 'national_card';
  const slots = ['selfie', 'holding', `${prefix}:front`];
  for (const key of slots) state = uploadDocument(state, { key, url: `/uploads/${key}.jpg` });
  return state;
}

test('each document is reviewed on its own and one rejection blocks verification', () => {
  const state = pack('shenasnameh');
  assert.equal(overallStatus(state), 'PENDING');
  assert.throws(
    () => reviewDocument(state, { key: 'selfie', decision: 'REJECTED', reason: 'نه' }),
    /دلیل رد/,
  );
  const rejected = reviewDocument(state, { key: 'selfie', decision: 'REJECTED', reason: 'تصویر تار است' });
  assert.equal(rejected.kyc.documents.selfie.status, 'REJECTED');
  assert.equal(rejected.kyc.documents.selfie.note, 'تصویر تار است');
  assert.equal(rejected.kyc.documents.holding.status, 'PENDING');
  assert.equal(rejected.verificationStatus, 'REJECTED');
  assert.equal(rejected.verificationNote, 'سلفی: تصویر تار است');
  assert.match(rejected.notice.message, /سلفی: تصویر تار است/);

  let approved = rejected.kyc;
  for (const key of ['holding', 'shenasnameh:front']) {
    approved = reviewDocument(approved, { key, decision: 'APPROVED' }).kyc;
  }
  assert.equal(overallStatus(approved), 'REJECTED');
});

test('re-upload clears the rejection and verification needs every required document', () => {
  const rejected = reviewDocument(pack('national_card'), {
    key: 'national_card:front',
    decision: 'REJECTED',
    reason: 'کارت خوانا نیست',
  });
  const again = uploadDocument(rejected.kyc, { key: 'national_card:front', url: '/uploads/front-2.jpg' });
  assert.equal(again.documents['national_card:front'].status, 'PENDING');
  assert.equal(again.documents['national_card:front'].note, null);
  assert.equal(again.documents['national_card:front'].url, '/uploads/front-2.jpg');
  assert.equal(overallStatus(again), 'PENDING');

  let state = again;
  for (const key of ['selfie', 'holding', 'national_card:front']) {
    const result = reviewDocument(state, { key, decision: 'APPROVED' });
    assert.equal(result.notice, null);
    state = result.kyc;
  }
  assert.equal(overallStatus(state), 'VERIFIED');
  const view = present(state);
  assert.equal(view.verificationStatus, 'VERIFIED');
  assert.equal(view.documents.filter((doc) => doc.required && doc.status === 'APPROVED').length, 3);
  assert.equal(view.documents.some((doc) => doc.key.endsWith(':back')), false);
  assert.equal(view.documents.find((doc) => doc.key === 'shenasnameh:front')?.title, undefined);
  assert.equal(
    present(pack('shenasnameh')).documents.find((doc) => doc.key === 'shenasnameh:front').title,
    'صفحه اول شناسنامه',
  );
});

test('shipment create stays blocked until identity is approved', () => {
  assert.equal(shipmentGateMessage(null), KYC_SHIPMENT_MISSING);
  assert.equal(shipmentGateMessage(null, 'VERIFIED'), null);
  assert.equal(shipmentGateMessage(setIdType(null, 'national_card')), KYC_SHIPMENT_MISSING);
  const uploaded = pack('shenasnameh');
  assert.equal(overallStatus(uploaded), 'PENDING');
  assert.equal(shipmentGateMessage(uploaded), KYC_SHIPMENT_PENDING);
  const rejected = reviewDocument(uploaded, {
    key: 'selfie',
    decision: 'REJECTED',
    reason: 'تصویر تار است',
  });
  assert.equal(shipmentGateMessage(rejected.kyc), KYC_SHIPMENT_REJECTED);
  let approved = uploaded;
  for (const key of ['selfie', 'holding', 'shenasnameh:front']) {
    approved = reviewDocument(approved, { key, decision: 'APPROVED' }).kyc;
  }
  assert.equal(overallStatus(approved), 'VERIFIED');
  assert.equal(shipmentGateMessage(approved), null);
});

test('switching the identity document invalidates the previous set', () => {
  let state = pack('shenasnameh');
  for (const key of ['selfie', 'holding', 'shenasnameh:front']) {
    state = reviewDocument(state, { key, decision: 'APPROVED' }).kyc;
  }
  assert.equal(overallStatus(state), 'VERIFIED');
  state = setIdType(state, 'national_card');
  assert.equal(overallStatus(state), 'PENDING');
  assert.throws(
    () => uploadDocument(state, { key: 'shenasnameh:front', url: '/uploads/x.jpg' }),
    /جور نیست/,
  );
  assert.throws(
    () => reviewDocument(setIdType(null, 'shenasnameh'), { key: 'selfie', decision: 'APPROVED' }),
    /پیدا نشد/,
  );
});
