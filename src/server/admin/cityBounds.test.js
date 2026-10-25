const test = require('node:test');
const assert = require('node:assert/strict');
const { CITIES } = require('../services/geoData');
const { assertPinInCity, CITY_RADIUS_KM, centerOf } = require('../services/cityBounds');

const tehran = CITIES.find((city) => city.name === 'تهران' && city.province === 'تهران');

test('a pin must sit within the selected city radius', () => {
  assert.ok(tehran.lat);
  assert.equal(CITY_RADIUS_KM, 60);
  const row = { name: 'تهران', province: 'تهران' };
  assert.equal(centerOf(row).name, 'تهران');
  assert.doesNotThrow(() => assertPinInCity({ lat: tehran.lat + 0.05, lng: tehran.lng }, row, 'مبدأ'));
  assert.throws(
    () => assertPinInCity({ lat: 29.61, lng: 52.53 }, row, 'مقصد'),
    /موقعیت مقصد با شهر «تهران» هم‌خوان نیست/,
  );
  assert.doesNotThrow(() => assertPinInCity({ lat: '', lng: '' }, row, 'مقصد'));
});
