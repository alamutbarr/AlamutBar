const test = require('node:test');
const assert = require('node:assert/strict');
const { can, permissionSet } = require('./permissions');

test('super admin can manage admins and settings', () => {
  assert.equal(can(['SUPER_ADMIN'], 'admins.manage'), true);
  assert.equal(can(['SUPER_ADMIN'], 'settings.manage'), true);
  assert.equal(can(['SUPER_ADMIN'], 'reports.financial'), true);
});

test('dispatch cannot open settings or financial reports', () => {
  assert.equal(can(['DISPATCH_OPERATOR'], 'orders.price'), true);
  assert.equal(can(['DISPATCH_OPERATOR'], 'settings.manage'), false);
  assert.equal(can(['DISPATCH_OPERATOR'], 'reports.financial'), false);
  assert.equal(can(['DISPATCH_OPERATOR'], 'drivers.documents'), false);
});

test('security cannot edit price or documents', () => {
  assert.equal(can(['SECURITY_OPERATOR'], 'map'), true);
  assert.equal(can(['SECURITY_OPERATOR'], 'alerts.resolve'), true);
  assert.equal(can(['SECURITY_OPERATOR'], 'orders.price'), false);
  assert.equal(can(['SECURITY_OPERATOR'], 'drivers.documents'), false);
});

test('a person with two roles gets the union', () => {
  const roles = ['DISPATCH_OPERATOR', 'SECURITY_OPERATOR'];
  assert.equal(can(roles, 'orders.assign'), true);
  assert.equal(can(roles, 'map'), true);
  assert.equal(permissionSet(roles).has('settings.manage'), false);
});

test('support verifies documents and tickets only', () => {
  assert.equal(can(['SUPPORT_AGENT'], 'drivers.documents'), true);
  assert.equal(can(['SUPPORT_AGENT'], 'owners.documents'), true);
  assert.equal(can(['SUPPORT_AGENT'], 'complaints'), true);
  assert.equal(can(['SUPPORT_AGENT'], 'orders.price'), false);
});
