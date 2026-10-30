function quoteIdent(name) {
  const value = String(name || '');
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`نام جدول یا ایندکس نامعتبر است: ${value}`);
  }
  return `\`${value}\``;
}

function groupKey(row) {
  return `${row.tableName}\0${row.cols}`;
}

function isPrimary(row) {
  return String(row.indexName) === 'PRIMARY';
}

function isUnique(row) {
  return Number(row.nonUnique) === 0;
}

function isForeignKeyIndex(row, fkNames) {
  return fkNames.has(`${row.tableName}\0${row.indexName}`);
}

function pickIndexToKeep(group, fkNames) {
  return group.find(isPrimary)
    || group.find(isUnique)
    || group.find((row) => isForeignKeyIndex(row, fkNames))
    || group[0];
}

function indexesToDrop(indexRows, fkRows) {
  const fkNames = new Set((fkRows || []).map((row) => `${row.tableName}\0${row.constraintName}`));
  const groups = new Map();
  for (const row of indexRows) {
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const drops = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const keep = pickIndexToKeep(group, fkNames);
    for (const row of group) {
      if (row.indexName === keep.indexName) continue;
      if (isPrimary(row) || isForeignKeyIndex(row, fkNames)) continue;
      drops.push(row);
    }
  }
  return drops;
}

async function loadIndexRows(sequelize) {
  const [rows] = await sequelize.query(`
    SELECT
      TABLE_NAME AS tableName,
      INDEX_NAME AS indexName,
      NON_UNIQUE AS nonUnique,
      GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') AS cols
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
  `);
  return rows;
}

async function loadForeignKeys(sequelize) {
  const [rows] = await sequelize.query(`
    SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  `);
  return rows;
}

async function pruneDuplicateIndexes(sequelize) {
  const [indexRows, fkRows] = await Promise.all([
    loadIndexRows(sequelize),
    loadForeignKeys(sequelize),
  ]);
  const drops = indexesToDrop(indexRows, fkRows);
  const dropped = [];
  for (const row of drops) {
    try {
      await sequelize.query(
        `ALTER TABLE ${quoteIdent(row.tableName)} DROP INDEX ${quoteIdent(row.indexName)}`,
      );
      dropped.push(`${row.tableName}.${row.indexName}`);
    } catch (error) {
      const errno = error?.original?.errno || error?.parent?.errno || error?.errno;
      if (errno === 1553 || String(error?.message || '').includes('needed in a foreign key')) {
        continue;
      }
      throw error;
    }
  }
  return dropped;
}

module.exports = {
  quoteIdent,
  indexesToDrop,
  pruneDuplicateIndexes,
};
