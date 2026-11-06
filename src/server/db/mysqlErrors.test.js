const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isConnectionRefused,
  formatMysqlStartupError,
  normalizeDbHost,
  xamppRecoverySteps,
} = require('./mysqlErrors');

test('Windows localhost is rewritten to 127.0.0.1 for XAMPP TCP', () => {
  assert.equal(normalizeDbHost('localhost', 'win32'), '127.0.0.1');
  assert.equal(normalizeDbHost('127.0.0.1', 'win32'), '127.0.0.1');
  assert.equal(normalizeDbHost('localhost', 'linux'), 'localhost');
});

test('XAMPP shutdown maps to connection-refused help', () => {
  const formatted = formatMysqlStartupError({
    error: { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:3306' },
    dbConfig: { host: '127.0.0.1', port: 3306, user: 'root' },
  });
  assert.equal(isConnectionRefused({ code: 'ECONNREFUSED' }), true);
  assert.match(formatted.title, /shutdown unexpectedly/);
  assert.ok(formatted.lines.some((line) => line.includes('npm run db:doctor')));
  assert.ok(formatted.lines.some((line) => line.includes('fix-xampp-mysql.ps1')));
  assert.ok(xamppRecoverySteps().length >= 5);
});

test('too many keys points at leftover sequelize alter indexes', () => {
  const formatted = formatMysqlStartupError({
    error: { code: 'ER_TOO_MANY_KEYS', errno: 1069, message: 'Too many keys specified; max 64 keys allowed' },
    dbConfig: { host: '127.0.0.1', port: 3306, user: 'root' },
  });
  assert.match(formatted.title, /۶۴ ایندکس/);
  assert.ok(formatted.lines.some((line) => line.includes('alter: true')));
});

test('wrong password stays distinct from a downed XAMPP service', () => {
  const formatted = formatMysqlStartupError({
    error: { code: 'ER_ACCESS_DENIED_ERROR', errno: 1045, message: 'Access denied' },
    dbConfig: { host: '127.0.0.1', port: 3306, user: 'root' },
  });
  assert.match(formatted.title, /ورود کاربر/);
  assert.equal(formatted.lines.some((line) => line.includes('shutdown unexpectedly')), false);
});
