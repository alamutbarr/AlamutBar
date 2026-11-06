const test = require('node:test');
const assert = require('node:assert/strict');
const {
  driverMatchesOffer, isOfferedVisibleToDriver, resolveTractor, resolveTrailer, cargoFitsVehicle, parseMaxMeters,
} = require('./vehicleOfferMatch');

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
  assert.equal(isOfferedVisibleToDriver({ ...row, offered_driver_id: 7 }, driver, 7), false);
  assert.equal(isOfferedVisibleToDriver({ ...row, offered_driver_id: 9 }, driver, 7), false);
});

test('cargo longer than the registered vehicle is hidden', () => {
  assert.equal(parseMaxMeters('12.2m'), 12.2);
  assert.equal(parseMaxMeters('6.5+'), Number.POSITIVE_INFINITY);
  assert.equal(parseMaxMeters('3.5-4'), 4);
  const twelve = { tractorType: 'تریلی', trailerType: 'کفی', vehicleSpecs: { length: '12.2m', width: '2.5-2.6' } };
  const offer = { vehicleTitle: 'تریلی', variants: ['کفی'], lengthCm: 1300, widthCm: 240, heightCm: 280 };
  assert.equal(driverMatchesOffer(twelve, offer), false);
  assert.equal(driverMatchesOffer({ ...twelve, vehicleSpecs: { length: '13.6m', width: '2.5-2.6' } }, offer), true);
});

test('open dump and edged trailers ignore cargo height only', () => {
  const open = { tractorType: 'خاور', trailerType: 'روباز', vehicleSpecs: { length: '5-5.5', width: '2-2.1', roomHeight: '2-2.2' } };
  const tall = { vehicleTitle: 'خاور', variants: ['روباز'], lengthCm: 500, widthCm: 200, heightCm: 400 };
  assert.equal(cargoFitsVehicle(open, tall), true);
  assert.equal(driverMatchesOffer(open, tall), true);
  const covered = { tractorType: 'خاور', trailerType: 'مسقف', vehicleSpecs: { length: '5-5.5', width: '2-2.1', roomHeight: '2-2.2' } };
  assert.equal(driverMatchesOffer(covered, { vehicleTitle: 'خاور', variants: ['مسقف'], lengthCm: 500, widthCm: 200, heightCm: 400 }), false);
  assert.equal(driverMatchesOffer(
    { tractorType: 'تریلی', trailerType: 'کمپرسی', vehicleSpecs: { length: '12.2m', width: '2.5-2.6', roomHeight: '2.4-2.6' } },
    { vehicleTitle: 'تریلی', variants: ['کمپرسی'], lengthCm: 1200, widthCm: 240, heightCm: 400 },
  ), true);
  assert.equal(driverMatchesOffer(
    { tractorType: 'تریلی', trailerType: 'لبه‌دار', vehicleSpecs: { length: '12.2m', width: '2.4-2.5' } },
    { vehicleTitle: 'تریلی', variants: ['لبه‌دار'], lengthCm: 1300, widthCm: 240, heightCm: 400 },
  ), false);
});
