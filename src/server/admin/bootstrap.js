const { ensureSettings } = require('./settingsStore');
const { ensureAdmins, ensureDemo, backfillWorkflow } = require('./seed');
const { scanOnce, startMonitor } = require('./monitor');

async function bootstrapAdmin() {
  await ensureSettings();
  await ensureAdmins();
  await backfillWorkflow();
  await ensureDemo();
  await scanOnce();
  startMonitor();
  const seeded = process.env.ADMIN_SEED_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Alamut@1234');
  console.log(`پنل ادمین آماده است. ورود با نام کاربری: admin، dispatch، security، inspection، support، shift. رمز فقط هنگام ساخت اول حساب${seeded ? ` (${seeded})` : ' (ADMIN_SEED_PASSWORD)'} گذاشته می‌شود و در بالا آمدن‌های بعدی عوض نمی‌شود.`);
  console.log('پنل متصدی: 09124000001 و 09124000002 با کد ثابت 12345.');
}

module.exports = { bootstrapAdmin };
