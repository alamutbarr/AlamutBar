const test = require('node:test');
const assert = require('node:assert/strict');
const { applySchemaPatches } = require('./schemaPatches');

test('skips message patches when the table does not exist', async () => {
  const sequelize = {
    async query() {
      return [[]];
    },
  };
  assert.deepEqual(await applySchemaPatches(sequelize), { messages: false });
});
