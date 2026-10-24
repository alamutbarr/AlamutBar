const test = require('node:test');
const assert = require('node:assert/strict');
const { canRevealExactDestination, assertDeliveryOtp } = require('./missionPolicy');

test('exact destination stays hidden until the waybill', () => {
  assert.equal(canRevealExactDestination({ driverStatus: 'Accepted', workflowStatus: 'DRIVER_ACCEPTED' }), false);
  assert.equal(canRevealExactDestination({ driverStatus: 'EnRouteToPickup', workflowStatus: 'EN_ROUTE_TO_LOADING' }), false);
  assert.equal(canRevealExactDestination({ driverStatus: 'WaybillIssued', workflowStatus: 'WAYBILL_ISSUED' }), true);
  assert.equal(canRevealExactDestination({ legacyStatus: 'in_transit' }), true);
});

test('delivery otp matches or needs an exception reason', () => {
  assert.equal(assertDeliveryOtp({ expected: '4455', provided: '4455' }).ok, true);
  assert.equal(assertDeliveryOtp({ expected: '4455', provided: '0000' }).ok, false);
  assert.equal(assertDeliveryOtp({ expected: '4455', exceptionReason: 'تحویل‌گیرنده کد نگرفت' }).method, 'exception');
  assert.equal(assertDeliveryOtp({}).method, 'not_required');
});
