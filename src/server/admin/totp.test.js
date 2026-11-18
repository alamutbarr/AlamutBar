const test = require('node:test');
const assert = require('node:assert/strict');
const { generateSecret, totp, verifyTotp } = require('./totp');

test('a generated secret verifies the current code and rejects a wrong one', () => {
  const secret = generateSecret();
  const now = Date.parse('2026-03-01T00:00:30Z');
  const code = totp(secret, now);
  assert.equal(verifyTotp(secret, code, now), true);
  const wrong = code === '111111' ? '222222' : '111111';
  assert.equal(verifyTotp(secret, wrong, now), false);
  assert.equal(verifyTotp(secret, 'abc', now), false);
});
