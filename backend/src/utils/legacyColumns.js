const sequelize = require('../config/database');

// جدول‌های قدیمی پنل راننده ستون‌ها را camelCase ذخیره کرده‌اند (driverId).
// مدل فعلی با underscored همان ستون را driver_id می‌خواهد. روی ویندوز نام جدول
// Shipments و shipments یکی است، پس sync سعی می‌کند ایندکس driver_id را روی
// ستونی بسازد که وجود ندارد.

const TABLES = ['shipments', 'drivers', 'owners'];

function snake(name) {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

async function normalizeLegacyColumns() {
  const qi = sequelize.getQueryInterface();
  for (const table of TABLES) {
    let described;
    try {
      described = await qi.describeTable(table);
    } catch {
      continue;
    }

    const existing = new Set(Object.keys(described));
    for (const name of [...existing]) {
      if (!/[A-Z]/.test(name)) continue;
      const next = snake(name);
      if (!next || next === name || existing.has(next)) continue;
      await qi.renameColumn(table, name, next);
      existing.delete(name);
      existing.add(next);
      console.log(`ستون ${table}.${name} به ${next} تغییر نام داد.`);
    }
  }
}

module.exports = normalizeLegacyColumns;
