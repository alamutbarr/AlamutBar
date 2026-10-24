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
  console.log('پنل ادمین آماده است. ورود با نام کاربری: admin، dispatch، security، inspection، support، shift. رمز همه: Alamut@1234.');
  console.log('پنل متصدی: 09124000001 و 09124000002 با کد ثابت 12345.');
}

module.exports = { bootstrapAdmin };
