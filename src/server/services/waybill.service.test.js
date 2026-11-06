const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateWaybillSmsCode,
  waybillSmsMatches,
  driverMayStartTransit,
  waybillForDriver,
} = require('./waybill.service');

test('waybill sms code is five digits and only matches the stored value', () => {
  const code = generateWaybillSmsCode();
  assert.match(code, /^\d{5}$/);
  assert.equal(waybillSmsMatches(code, code), true);
  assert.equal(waybillSmsMatches(code, '00000'), false);
  assert.equal(waybillSmsMatches('', '12345'), false);
});

test('driver cannot start transit until the sms code and waybill photo are both in', () => {
  assert.equal(driverMayStartTransit({ waybill_code_verified: true }), false);
  assert.equal(driverMayStartTransit({ waybill_photo_url: '/uploads/w.jpg' }), false);
  assert.equal(driverMayStartTransit({
    waybill_code_verified: true,
    waybill_photo_url: '/uploads/w.jpg',
  }), true);
});

test('driver waybill payload hides the sms digits', () => {
  assert.deepEqual(waybillForDriver({
    waybill_sms_code: '41820',
    waybill_code_verified: false,
    waybill_photo_url: null,
  }), { smsSent: true, codeVerified: false, photoUrl: null });
});
