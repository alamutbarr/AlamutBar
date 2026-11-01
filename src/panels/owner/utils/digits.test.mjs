import test from 'node:test';
import assert from 'node:assert/strict';
import { formatGroupedDigits, ungroupNumber } from './digits.js';

test('groups every three digits with a comma', () => {
  assert.equal(formatGroupedDigits('1234567'), '1,234,567');
  assert.equal(formatGroupedDigits('۱۲۳۴۵۶۷'), '1,234,567');
  assert.equal(formatGroupedDigits('1,234,567'), '1,234,567');
  assert.equal(ungroupNumber('1,234,567'), '1234567');
});

test('keeps a decimal point on grouped weights', () => {
  assert.equal(formatGroupedDigits('12345.5', { decimal: true }), '12,345.5');
  assert.equal(ungroupNumber('12,345.5'), '12345.5');
});
