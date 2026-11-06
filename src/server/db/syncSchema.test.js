const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldAlterSchema, syncSchema } = require('./syncSchema');

test('schema alter stays off unless DB_SYNC_ALTER is explicit', () => {
  assert.equal(shouldAlterSchema({}), false);
  assert.equal(shouldAlterSchema({ DB_SYNC_ALTER: '' }), false);
  assert.equal(shouldAlterSchema({ DB_SYNC_ALTER: 'true' }), true);
  assert.equal(shouldAlterSchema({ DB_SYNC_ALTER: '1' }), true);
  assert.equal(shouldAlterSchema({ DB_SYNC_ALTER: 'yes' }), true);
});

test('syncSchema uses alter:false by default', async () => {
  const calls = [];
  const sequelize = {
    async sync(options) {
      calls.push(options);
    },
  };
  const result = await syncSchema(sequelize, {});
  assert.deepEqual(result, { alter: false });
  assert.deepEqual(calls, [{ alter: false }]);
});
