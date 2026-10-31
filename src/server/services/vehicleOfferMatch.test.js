const test = require('node:test');
const assert = require('node:assert/strict');
const { driverMatchesOffer, isOfferedVisibleToDriver, resolveTractor, resolveTrailer } = require('./vehicleOfferMatch');

test('owner trailer variants only match the same driver trailer model', () => {
  assert.equal(resolveTractor('تریلی'), 'trailer');
  assert.equal(resolveTractor('trailer'), 'trailer');
  assert.equal(resolveTrailer('لبه‌دار'), 'edged');
  assert.equal(resolveTrailer('کانتینر'), 'container');
  assert.equal(resolveTrailer('تیغه (کانتینربر)'), 'blade_container');
  const edged = { tractorType: 'تریلی', trailerType: 'لبه‌دار' };
  const flatbed = { tractorType: 'trailer', trailerType: 'flatbed' };
  const offer = { vehicleTitle: 'تریلی', variants: ['لبه‌دار', 'کانتینر'] };
  assert.equal(driverMatchesOffer(edged, offer), true);
  assert.equal(driverMatchesOffer(flatbed, offer), false);
  assert.equal(driverMatchesOffer({ tractorType: 'khavar', trailerType: 'open' }, offer), false);
});

test('unassigned missions stay hidden from the wrong vehicle', () => {
  const row = {
    driver_id: null,
    vehicleType: { title: 'تریلی' },
    vehicle_variants: ['کفی'],
    declined_by: [],
  };
  const driver = { tractorType: 'تریلی', trailerType: 'کفی' };
  assert.equal(isOfferedVisibleToDriver(row, driver, 7), true);
  assert.equal(isOfferedVisibleToDriver(row, { tractorType: 'khavar', trailerType: 'open' }, 7), false);
  assert.equal(isOfferedVisibleToDriver({ ...row, driver_id: 7 }, { tractorType: 'khavar', trailerType: 'open' }, 7), true);
});
