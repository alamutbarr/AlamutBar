const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, checkPassword, normalizeUsername } = require('./authService');

test('seeded admin password verifies and a wrong password does not', async () => {
  const hash = await hashPassword('Alamut@1234');
  assert.match(hash, /^\$2[aby]\$/);
  assert.equal(await checkPassword('Alamut@1234', hash), true);
  assert.equal(await checkPassword('alamut@1234', hash), false);
  assert.equal(await checkPassword('', hash), false);
  assert.equal(await checkPassword('Alamut@1234', null), false);
});

test('admin usernames are stored in lowercase', () => {
  assert.equal(normalizeUsername(' Admin '), 'admin');
  assert.equal(normalizeUsername('Dispatch'), 'dispatch');
  assert.throws(() => normalizeUsername('12'), /نام کاربری/);
  assert.throws(() => normalizeUsername(''), /نام کاربری/);
});
