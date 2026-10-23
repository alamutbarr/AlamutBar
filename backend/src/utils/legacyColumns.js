const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// جدول قدیمی پنل راننده ستون‌ها را camelCase دارد (driverId) و روی ویندوز
// Shipments و shipments یک جدول‌اند. sync بدون alter هم ایندکس driver_id را
// می‌سازد و اگر آن ستون نباشد MySQL با خطای 1072 بالا نمی‌آید.
// این‌جا پیش از sync: نام واقعی جدول پیدا می‌شود، ستون‌های camelCase عوض
// می‌شوند، و ستون‌های مدل که اصلاً وجود ندارند (مثل driver_id) اضافه می‌شوند.

function snake(name) {
  return String(name)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

function tableNameOf(model) {
  const name = model.getTableName();
  return typeof name === 'string' ? name : name.tableName;
}

async function resolveTableName(wanted) {
  const schema = sequelize.config.database;
  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME AS name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND LOWER(TABLE_NAME) = LOWER(?)`,
    { replacements: [schema, wanted] },
  );
  const names = rows.map((row) => row.name);
  if (names.length === 0) return null;
  if (names.includes(wanted)) return wanted;
  return names.find((name) => name === wanted.toLowerCase()) || names[0];
}

async function dropForeignKeys(table, column) {
  const schema = sequelize.config.database;
  const [rows] = await sequelize.query(
    `SELECT CONSTRAINT_NAME AS name
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [schema, table, column] },
  );
  for (const row of rows) {
    await sequelize.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${row.name}\``);
    console.log(`قید خارجی ${row.name} از ${table}.${column} برداشته شد.`);
  }
}

async function renameLegacyColumns(table) {
  const described = await sequelize.getQueryInterface().describeTable(table);
  const existing = new Set(Object.keys(described));
  for (const name of [...existing]) {
    if (!/[A-Z]/.test(name)) continue;
    const next = snake(name);
    if (!next || next === name || existing.has(next)) continue;
    await dropForeignKeys(table, name);
    await sequelize.getQueryInterface().renameColumn(table, name, next);
    existing.delete(name);
    existing.add(next);
    console.log(`ستون ${table}.${name} به ${next} تغییر نام داد.`);
  }
  return existing;
}

function columnDefinition(attribute) {
  const definition = {
    type: attribute.type,
    allowNull: true,
  };
  const fallback = attribute.defaultValue;
  if (typeof fallback === 'string' || typeof fallback === 'number' || typeof fallback === 'boolean') {
    definition.defaultValue = fallback;
  }
  return definition;
}

async function addMissingColumns(model, table, existing) {
  const known = new Set([...existing].map((name) => name.toLowerCase()));
  for (const attribute of Object.values(model.rawAttributes)) {
    if (!attribute || attribute.primaryKey || attribute.type instanceof DataTypes.VIRTUAL) continue;
    const field = attribute.field || snake(attribute.fieldName || '');
    if (!field || known.has(field.toLowerCase())) continue;
    // references را عمداً نمی‌فرستیم؛ نوع id جدول قدیمی با مدل یکی نیست
    // و ساخت قید خارجی اینجا بوت را دوباره می‌خواباند.
    await sequelize.getQueryInterface().addColumn(table, field, columnDefinition(attribute));
    known.add(field.toLowerCase());
    console.log(`ستون ${table}.${field} اضافه شد.`);
  }
}

async function prepareLegacySchema(models) {
  console.log('آماده‌سازی ستون‌های دیتابیس');
  for (const model of [models.Owner, models.Driver, models.Shipment]) {
    const wanted = tableNameOf(model);
    const table = await resolveTableName(wanted);
    if (!table) continue;
    const existing = await renameLegacyColumns(table);
    await addMissingColumns(model, table, existing);
  }
}

module.exports = prepareLegacySchema;
