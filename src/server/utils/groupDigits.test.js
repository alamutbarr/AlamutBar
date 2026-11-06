const test = require('node:test');
const assert = require('node:assert/strict');
const { groupDigits } = require('./groupDigits');

test('prices group every three digits with a comma', () => {
  assert.equal(groupDigits(1500000), '1,500,000');
  assert.equal(groupDigits('25000'), '25,000');
  assert.equal(groupDigits(0), '0');
  assert.equal(groupDigits(null), '');
});
