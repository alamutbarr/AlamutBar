const reminderService = require('../services/reminder.service');

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // هر ۱۵ دقیقه بررسی می‌شود

// بدون وابستگی به پکیج‌های cron خارجی؛ برای پروژه‌ای در این مقیاس setInterval کفایت می‌کند
function startReminderScheduler() {
  const run = async () => {
    try {
      const count = await reminderService.sendDueReminders();
      if (count > 0) console.log(`⏰ ${count} یادآوری بارگیری ارسال شد.`);
    } catch (err) {
      console.error('❌ خطا در ارسال یادآوری‌های زمان‌بندی‌شده:', err);
    }
  };

  run(); // یک بار هم بلافاصله بعد از بالا آمدن سرور اجرا شود
  setInterval(run, CHECK_INTERVAL_MS);
}

module.exports = startReminderScheduler;
