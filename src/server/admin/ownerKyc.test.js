const test = require('node:test');
const assert = require('node:assert/strict');
const {
  setIdType, uploadDocument, reviewDocument, overallStatus, present,
} = require('./ownerKyc');

function pack(idType) {
  let state = setIdType(null, idType);
  const prefix = idType === 'shenasnameh' ? 'shenasnameh' : 'national_card';
  const slots = ['selfie', 'holding', `${prefix}:front`, `${prefix}:back`];
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
  for (const key of ['holding', 'shenasnameh:front', 'shenasnameh:back']) {
    approved = reviewDocument(approved, { key, decision: 'APPROVED' }).kyc;
  }
  assert.equal(overallStatus(approved), 'REJECTED');
});

test('re-upload clears the rejection and verification needs every required document', () => {
  const rejected = reviewDocument(pack('national_card'), {
    key: 'national_card:back',
    decision: 'REJECTED',
    reason: 'پشت کارت خوانا نیست',
  });
  const again = uploadDocument(rejected.kyc, { key: 'national_card:back', url: '/uploads/back-2.jpg' });
  assert.equal(again.documents['national_card:back'].status, 'PENDING');
  assert.equal(again.documents['national_card:back'].note, null);
  assert.equal(again.documents['national_card:back'].url, '/uploads/back-2.jpg');
  assert.equal(overallStatus(again), 'PENDING');

  let state = again;
  for (const key of ['selfie', 'holding', 'national_card:front', 'national_card:back']) {
    const result = reviewDocument(state, { key, decision: 'APPROVED' });
    assert.equal(result.notice, null);
    state = result.kyc;
  }
  assert.equal(overallStatus(state), 'VERIFIED');
  const view = present(state);
  assert.equal(view.verificationStatus, 'VERIFIED');
  assert.equal(view.documents.filter((doc) => doc.required && doc.status === 'APPROVED').length, 4);
});

test('switching the identity document invalidates the previous set', () => {
  let state = pack('shenasnameh');
  for (const key of ['selfie', 'holding', 'shenasnameh:front', 'shenasnameh:back']) {
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
