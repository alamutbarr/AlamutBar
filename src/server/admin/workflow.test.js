const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveWorkflow, legacyPatch, isKnownStatus } = require('./workflow');

test('legacy shipment maps onto the twelve-step flow', () => {
  assert.equal(deriveWorkflow({ status: 'searching_driver' }), 'DRIVER_ASSIGNMENT');
  assert.equal(deriveWorkflow({ status: 'driver_assigned', driver_status: 'EnRouteToPickup' }), 'EN_ROUTE_TO_LOADING');
  assert.equal(deriveWorkflow({ status: 'in_transit', driver_status: 'NearDestination' }), 'AT_DESTINATION_UNLOADING');
  assert.equal(deriveWorkflow({ workflow_status: 'ON_HOLD', status: 'in_transit' }), 'ON_HOLD');
});

test('workflow patches keep the owner and driver panels in sync', () => {
  assert.deepEqual(legacyPatch('PRICE_ESTIMATED'), {
    status: 'price_proposed',
    driver_status: null,
    price_status: 'proposed',
  });
  assert.equal(legacyPatch('IN_TRANSIT').status, 'in_transit');
  assert.equal(legacyPatch('WAYBILL_ISSUED').driver_status, 'WaybillIssued');
  assert.equal(legacyPatch('ON_HOLD').status, null);
  assert.equal(legacyPatch('COMPLETED').status, 'completed');
});

test('unknown status is rejected', () => {
  assert.equal(isKnownStatus('IN_TRANSIT'), true);
  assert.equal(isKnownStatus('FLYING'), false);
  assert.equal(legacyPatch('FLYING'), null);
});
