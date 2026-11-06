const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DRIVER_ACCEPT_DOCS_REQUIRED,
  DRIVER_ACCEPT_ONE_ACTIVE,
  isActiveDriverAssignment,
  documentsApproved,
} = require('./driverAcceptPolicy');

test('driver cannot accept until admin marks documents VERIFIED', () => {
  assert.equal(documentsApproved({ verificationStatus: 'PENDING_VERIFICATION' }), false);
  assert.equal(documentsApproved({ verificationStatus: 'REJECTED' }), false);
  assert.equal(documentsApproved({ verificationStatus: 'VERIFIED' }), true);
  assert.match(DRIVER_ACCEPT_DOCS_REQUIRED, /پنل ادمین/);
});

test('an assigned load stays active until it is finished or cancelled', () => {
  assert.equal(isActiveDriverAssignment({ status: 'driver_assigned', driver_status: 'Accepted', workflow_status: 'DRIVER_ACCEPTED' }), true);
  assert.equal(isActiveDriverAssignment({ status: 'in_transit', driver_status: 'InTransit', workflow_status: 'IN_TRANSIT' }), true);
  assert.equal(isActiveDriverAssignment({ status: 'completed', driver_status: 'Completed', workflow_status: 'COMPLETED' }), false);
  assert.equal(isActiveDriverAssignment({ status: 'cancelled', driver_status: 'Cancelled', workflow_status: 'CANCELLED' }), false);
  assert.equal(isActiveDriverAssignment({ status: 'delivered', driver_status: 'Completed' }), false);
  assert.match(DRIVER_ACCEPT_ONE_ACTIVE, /یک بار فعال/);
});
