const test = require('node:test');
const assert = require('node:assert/strict');
const {
  setIdType, uploadDocument, reviewDocument, overallStatus, present, normalize,
  shipmentGateMessage, postalCodeGateMessage, KYC_SHIPMENT_MISSING, KYC_SHIPMENT_PENDING, KYC_SHIPMENT_REJECTED, POSTAL_CODE_REQUIRED,
} = require('./ownerKyc');

function pack(idType) {
  let state = setIdType(null, idType);
  const prefix = idType === 'shenasnameh' ? 'shenasnameh' : 'national_card';
  const slots = [`${prefix}:selfie`, `${prefix}:front`];
  for (const key of slots) state = uploadDocument(state, { key, url: `/uploads/${key}.jpg` });
  return state;
}

test('each document is reviewed on its own and one rejection blocks verification', () => {
  const state = pack('shenasnameh');
  assert.equal(overallStatus(state), 'PENDING');
  assert.throws(
    () => reviewDocument(state, { key: 'shenasnameh:selfie', decision: 'REJECTED', reason: 'نه' }),
    /دلیل رد/,
  );
  const rejected = reviewDocument(state, { key: 'shenasnameh:selfie', decision: 'REJECTED', reason: 'تصویر تار است' });
  assert.equal(rejected.kyc.documents['shenasnameh:selfie'].status, 'REJECTED');
  assert.equal(rejected.kyc.documents['shenasnameh:selfie'].note, 'تصویر تار است');
  assert.equal(rejected.kyc.documents['shenasnameh:front'].status, 'PENDING');
  assert.equal(rejected.verificationStatus, 'REJECTED');
  assert.equal(rejected.verificationNote, 'سلفی: تصویر تار است');
  assert.match(rejected.notice.message, /سلفی: تصویر تار است/);

  const approvedFront = reviewDocument(rejected.kyc, { key: 'shenasnameh:front', decision: 'APPROVED' }).kyc;
  assert.equal(overallStatus(approvedFront), 'REJECTED');
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
  for (const key of ['national_card:selfie', 'national_card:front']) {
    const result = reviewDocument(state, { key, decision: 'APPROVED' });
    assert.equal(result.notice, null);
    state = result.kyc;
  }
  assert.equal(overallStatus(state), 'VERIFIED');
  const view = present(state);
  assert.equal(view.verificationStatus, 'VERIFIED');
  assert.equal(view.documents.filter((doc) => doc.required && doc.status === 'APPROVED').length, 2);
  assert.equal(view.documents.some((doc) => doc.key.endsWith(':back')), false);
  assert.equal(view.documents.some((doc) => doc.key.endsWith(':holding')), false);
  assert.equal(view.documents.find((doc) => doc.key === 'shenasnameh:front')?.title, undefined);
  assert.equal(
    present(pack('shenasnameh')).documents.find((doc) => doc.key === 'shenasnameh:front').title,
    'صفحه اول شناسنامه',
  );
  assert.equal(
    present(pack('shenasnameh')).documents.find((doc) => doc.key === 'shenasnameh:selfie').title,
    'سلفی',
  );
});

test('national card photos stay out of the birth-certificate section', () => {
  const shenasnameh = pack('shenasnameh');
  const mixed = uploadDocument(shenasnameh, { key: 'national_card:selfie', url: '/uploads/card-selfie.jpg', idType: 'national_card' });
  const cardView = present(mixed);
  assert.equal(cardView.idType, 'national_card');
  assert.deepEqual(cardView.documents.map((doc) => doc.key), [
    'national_card:selfie',
    'national_card:front',
  ]);
  assert.equal(cardView.documents.find((doc) => doc.key === 'national_card:selfie').url, '/uploads/card-selfie.jpg');
  const bookView = present({ ...mixed, idType: 'shenasnameh' });
  assert.deepEqual(bookView.documents.map((doc) => doc.key), [
    'shenasnameh:selfie',
    'shenasnameh:front',
  ]);
  assert.equal(bookView.documents.find((doc) => doc.key === 'shenasnameh:selfie').url, '/uploads/shenasnameh:selfie.jpg');
  assert.notEqual(bookView.documents.find((doc) => doc.key === 'shenasnameh:selfie').url, '/uploads/card-selfie.jpg');
});

test('legacy shared selfie migrates only into the selected identity type', () => {
  const legacy = {
    idType: 'shenasnameh',
    documents: {
      selfie: { url: '/uploads/old-selfie.jpg', status: 'APPROVED' },
      'shenasnameh:front': { url: '/uploads/old-front.jpg', status: 'APPROVED' },
    },
  };
  assert.equal(overallStatus(legacy), 'VERIFIED');
  const book = present(legacy);
  assert.equal(book.documents.find((doc) => doc.key === 'shenasnameh:selfie').url, '/uploads/old-selfie.jpg');
  const migrated = normalize(legacy);
  const card = present({ ...migrated, idType: 'national_card' });
  assert.equal(card.documents.find((doc) => doc.key === 'national_card:selfie')?.url, null);
  const afterCardSelfie = uploadDocument(migrated, { key: 'national_card:selfie', url: '/uploads/new-card.jpg', idType: 'national_card' });
  assert.equal(present({ ...afterCardSelfie, idType: 'shenasnameh' }).documents.find((doc) => doc.key === 'shenasnameh:selfie').url, '/uploads/old-selfie.jpg');
  assert.equal(present(afterCardSelfie).documents.find((doc) => doc.key === 'national_card:selfie').url, '/uploads/new-card.jpg');
});

test('shipment create stays blocked until identity is approved', () => {
  assert.equal(shipmentGateMessage(null), KYC_SHIPMENT_MISSING);
  assert.equal(shipmentGateMessage(null, 'VERIFIED'), null);
  assert.equal(shipmentGateMessage(setIdType(null, 'national_card')), KYC_SHIPMENT_MISSING);
  const uploaded = pack('shenasnameh');
  assert.equal(overallStatus(uploaded), 'PENDING');
  assert.equal(shipmentGateMessage(uploaded), KYC_SHIPMENT_PENDING);
  const rejected = reviewDocument(uploaded, {
    key: 'shenasnameh:selfie',
    decision: 'REJECTED',
    reason: 'تصویر تار است',
  });
  assert.equal(shipmentGateMessage(rejected.kyc), KYC_SHIPMENT_REJECTED);
  let approved = uploaded;
  for (const key of ['shenasnameh:selfie', 'shenasnameh:front']) {
    approved = reviewDocument(approved, { key, decision: 'APPROVED' }).kyc;
  }
  assert.equal(overallStatus(approved), 'VERIFIED');
  assert.equal(shipmentGateMessage(approved), null);
});

test('shipment create also requires a 10-digit owner postal code', () => {
  assert.equal(postalCodeGateMessage(null), POSTAL_CODE_REQUIRED);
  assert.equal(postalCodeGateMessage(''), POSTAL_CODE_REQUIRED);
  assert.equal(postalCodeGateMessage('12345'), POSTAL_CODE_REQUIRED);
  assert.equal(postalCodeGateMessage('1234567890'), null);
});

test('switching the identity document invalidates the previous set', () => {
  let state = pack('shenasnameh');
  for (const key of ['shenasnameh:selfie', 'shenasnameh:front']) {
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
    () => reviewDocument(setIdType(null, 'shenasnameh'), { key: 'shenasnameh:selfie', decision: 'APPROVED' }),
    /پیدا نشد/,
  );
});

test('an approved KYC photo cannot be replaced', () => {
  let state = pack('national_card');
  state = reviewDocument(state, { key: 'national_card:selfie', decision: 'APPROVED' }).kyc;
  assert.throws(
    () => uploadDocument(state, { key: 'national_card:selfie', url: '/uploads/new-selfie.jpg' }),
    /قابل تغییر نیست/,
  );
});
