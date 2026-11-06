const test = require('node:test');
const assert = require('node:assert/strict');
const { indexesToDrop, pruneDuplicateIndexes } = require('./pruneIndexes');

test('duplicate sequelize indexes on the same columns are dropped, foreign keys stay', () => {
  const drops = indexesToDrop(
    [
      { tableName: 'shipments', indexName: 'PRIMARY', nonUnique: 0, cols: 'id' },
      { tableName: 'shipments', indexName: 'shipments_ibfk_1', nonUnique: 1, cols: 'owner_id' },
      { tableName: 'shipments', indexName: 'shipments_owner_id', nonUnique: 1, cols: 'owner_id' },
      { tableName: 'shipments', indexName: 'shipments_owner_id_2', nonUnique: 1, cols: 'owner_id' },
      { tableName: 'shipments', indexName: 'tracking_code', nonUnique: 0, cols: 'tracking_code' },
    ],
    [{ tableName: 'shipments', constraintName: 'shipments_ibfk_1' }],
  );
  assert.deepEqual(
    drops.map((row) => row.indexName).sort(),
    ['shipments_owner_id', 'shipments_owner_id_2'],
  );
});

test('a unique index is kept over extra non-unique copies', () => {
  const drops = indexesToDrop(
    [
      { tableName: 'users', indexName: 'phone_number', nonUnique: 0, cols: 'phone_number' },
      { tableName: 'users', indexName: 'users_phone_number', nonUnique: 1, cols: 'phone_number' },
    ],
    [],
  );
  assert.deepEqual(drops.map((row) => row.indexName), ['users_phone_number']);
});

test('pruneDuplicateIndexes drops extras through sequelize.query', async () => {
  const sql = [];
  const sequelize = {
    async query(text) {
      sql.push(String(text).replace(/\s+/g, ' ').trim());
      if (text.includes('INFORMATION_SCHEMA.STATISTICS')) {
        return [[
          { tableName: 'shipments', indexName: 'shipments_ibfk_3', nonUnique: 1, cols: 'driver_id' },
          { tableName: 'shipments', indexName: 'shipments_driver_id', nonUnique: 1, cols: 'driver_id' },
        ]];
      }
      if (text.includes('TABLE_CONSTRAINTS')) {
        return [[{ tableName: 'shipments', constraintName: 'shipments_ibfk_3' }]];
      }
      return [[]];
    },
  };
  const dropped = await pruneDuplicateIndexes(sequelize);
  assert.deepEqual(dropped, ['shipments.shipments_driver_id']);
  assert.ok(sql.some((item) => item.includes('DROP INDEX `shipments_driver_id`')));
});
