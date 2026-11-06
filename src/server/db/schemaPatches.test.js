const test = require('node:test');
const assert = require('node:assert/strict');
const { applySchemaPatches, evidenceColumnIsWide } = require('./schemaPatches');

test('skips message patches when the table does not exist', async () => {
  const sequelize = {
    async query() {
      return [[]];
    },
  };
  assert.deepEqual(await applySchemaPatches(sequelize), { messages: false, complaints: false });
});

test('widens a varchar evidence_url so four complaint photos fit', async () => {
  const calls = [];
  const sequelize = {
    async query(sql) {
      calls.push(sql);
      if (sql.includes("SHOW TABLES LIKE 'messages'")) return [[]];
      if (sql.includes("SHOW TABLES LIKE 'complaints'")) return [[{ Tables_in_alamut: 'complaints' }]];
      if (sql.includes("SHOW COLUMNS FROM complaints LIKE 'evidence_url'")) {
        return [[{ Field: 'evidence_url', Type: 'varchar(255)' }]];
      }
      return [[]];
    },
  };
  assert.deepEqual(await applySchemaPatches(sequelize), { messages: false, complaints: true });
  assert.ok(calls.some((sql) => /MODIFY evidence_url TEXT NULL/i.test(sql)));
});

test('a json or text evidence column does not need another alter', () => {
  assert.equal(evidenceColumnIsWide('varchar(255)'), false);
  assert.equal(evidenceColumnIsWide('text'), true);
  assert.equal(evidenceColumnIsWide('json'), true);
});
