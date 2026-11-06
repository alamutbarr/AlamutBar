function shouldAlterSchema(env = process.env) {
  const value = String(env.DB_SYNC_ALTER || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

async function syncSchema(sequelize, options = {}) {
  const alter = options.alter ?? shouldAlterSchema();
  if (alter) {
    console.warn(
      'DB_SYNC_ALTER روشن است. روی MySQL زمپ این کار جدول‌ها را ALTER می‌کند و ممکن است سرویس را با پیام shutdown unexpectedly پایین بیاورد. بعد از یک بار موفقیت آن را خاموش کنید.',
    );
  }
  await sequelize.sync({ alter });
  return { alter };
}

module.exports = { shouldAlterSchema, syncSchema };
