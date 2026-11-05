const test = require('node:test');
const assert = require('node:assert/strict');
const { tractorLabel, trailerLabel, describeVehicle } = require('./vehicleLabels');

test('tractor and trailer English keys become Persian labels', () => {
  assert.equal(tractorLabel('khavar'), 'خاور/۹۱۱');
  assert.equal(tractorLabel('tandem_truck'), 'کامیون جفت');
  assert.equal(trailerLabel('side_open'), 'بغل بازشو');
  assert.equal(trailerLabel('half_edge'), 'نیم‌لبه');
});

test('Persian stored tractor names still resolve field titles', () => {
  const described = describeVehicle('تریلی', 'کفی', {});
  assert.equal(described.tractorLabel, 'تریلی');
  assert.equal(described.trailerLabel, 'کفی');
  assert.ok(described.fields.some((field) => field.key === 'length'));
});

test('vehicle description keeps Persian labels for stored specs', () => {
  const described = describeVehicle('trailer', 'edged', { length: '13.6m', edgeHeight: '80-100', width: '2.5-2.6', groundHeight: '1.5' });
  assert.equal(described.tractorLabel, 'تریلی');
  assert.equal(described.trailerLabel, 'لبه‌دار');
  assert.match(described.summary, /تریلی/);
  assert.equal(described.fields.find((field) => field.key === 'length').value, '۱۳٫۶۰ متر');
});
