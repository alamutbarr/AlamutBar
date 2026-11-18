const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('./deskRules');

test('a future publish date stays scheduled until that moment', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  assert.equal(rules.articlePhase('draft', null, now), 'draft');
  assert.equal(rules.articlePhase('published', '2026-02-01T00:00:00Z', now), 'scheduled');
  assert.equal(rules.articlePhase('published', '2025-12-01T00:00:00Z', now), 'published');
});

test('partial payments keep a remaining balance until the invoice is covered', () => {
  const open = rules.invoiceLedger(1000, [{ amount: 400 }]);
  assert.equal(open.remaining, 600);
  assert.equal(open.settled, false);
  const closed = rules.invoiceLedger(1000, [{ amount: 400 }, { amount: 600 }]);
  assert.equal(closed.remaining, 0);
  assert.equal(closed.settled, true);
});

test('an open critical incident blocks movement and completion', () => {
  assert.equal(rules.movementBlocked(1), true);
  assert.equal(rules.movementBlocked(0), false);
});

test('a position older than five minutes is stale', () => {
  const now = new Date('2026-06-01T12:00:00Z');
  assert.equal(rules.locationIsStale('2026-06-01T11:54:00Z', now, 5), true);
  assert.equal(rules.locationIsStale('2026-06-01T11:56:00Z', now, 5), false);
  assert.equal(rules.locationIsStale(null, now, 5), true);
});

test('market stays closed until the dossier is approved and documents are in date', () => {
  const today = '2026-06-01';
  const ready = {
    verificationStatus: 'VERIFIED',
    dossier_status: 'approved',
    account_verified: true,
    license_expiry: '2027-01-01',
    insurance_expiry: '2027-01-01',
  };
  assert.equal(rules.marketOpen(ready, today), true);
  assert.equal(rules.marketOpen({ ...ready, dossier_status: 'submitted' }, today), false);
  assert.equal(rules.marketOpen({ ...ready, license_expiry: '2026-05-01' }, today), false);
  assert.equal(rules.marketOpen({ ...ready, account_verified: false }, today), false);
});

test('checklist passes only when packaging, weight and vehicle are confirmed', () => {
  assert.equal(rules.checklistPassed({ decision: 'APPROVED' }), true);
  assert.equal(rules.checklistPassed({
    packaging_ok: true,
    weight_ok: true,
    vehicle_ok: false,
    decision: 'PENDING',
  }), false);
  assert.equal(rules.checklistPassed({
    packagingOk: true,
    weightOk: true,
    vehicleOk: true,
  }), true);
});

test('fleet review locks an approved credential and requires a rejection reason', () => {
  const uploaded = rules.upsertFleet({}, { key: 'license', url: '/uploads/lic.jpg' });
  assert.equal(rules.readFleet(uploaded).license.status, 'PENDING');
  const approved = rules.reviewFleet(uploaded, { key: 'license', decision: 'APPROVED' });
  assert.throws(() => rules.upsertFleet(approved, { key: 'license', url: '/uploads/new.jpg' }), /تأیید شده/);
  assert.equal(rules.fleetReady({
    license: { url: '/a', status: 'APPROVED' },
    vehicle_card: { url: '/b', status: 'APPROVED' },
    insurance: { url: '/c', status: 'APPROVED' },
  }), true);
});
