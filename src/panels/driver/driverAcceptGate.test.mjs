import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRIVER_ACCEPT_DOCS_REQUIRED,
  DRIVER_ACCEPT_ONE_ACTIVE,
  driverAcceptIssue,
  driverDocumentsApproved,
} from './driverAcceptGate.js';

test('pending or rejected documents block accept until admin approval', () => {
  assert.equal(driverDocumentsApproved({ verificationStatus: 'PENDING_VERIFICATION' }), false);
  assert.equal(driverDocumentsApproved({ verifiedStatus: 'pending' }), false);
  assert.equal(driverDocumentsApproved({ verificationStatus: 'VERIFIED' }), true);
  assert.equal(
    driverAcceptIssue({ verificationStatus: 'PENDING_VERIFICATION' }, [], { id: 2 })?.code,
    'DOCS_NOT_APPROVED',
  );
  assert.equal(
    driverAcceptIssue({ verificationStatus: 'PENDING_VERIFICATION' }, [], { id: 2 })?.message,
    DRIVER_ACCEPT_DOCS_REQUIRED,
  );
});

test('a verified driver with one active load cannot accept another', () => {
  const driver = { verificationStatus: 'VERIFIED' };
  const missions = [
    { id: 11, status: 'InTransit' },
    { id: 22, status: 'Offered' },
  ];
  assert.equal(driverAcceptIssue(driver, missions, { id: 22 })?.code, 'ONE_ACTIVE_LOAD');
  assert.equal(driverAcceptIssue(driver, missions, { id: 22 })?.message, DRIVER_ACCEPT_ONE_ACTIVE);
  assert.equal(driverAcceptIssue(driver, [{ id: 22, status: 'Offered' }], { id: 22 }), null);
});
