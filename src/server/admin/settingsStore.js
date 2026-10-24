const { SystemSetting } = require('../models');

const SETTING_DEFAULTS = {
  dispatch_delay_minutes: { value: 45, description: 'تحمل تأخیر اعزام نسبت به ETA (دقیقه)' },
  geofence_loading_m: { value: 500, description: 'شعاع ژئوفنس بارگیری (متر)' },
  geofence_dest_m: { value: 500, description: 'شعاع ژئوفنس مقصد (متر)' },
  geofence_dwell_seconds: { value: 90, description: 'حداقل ماندن در محدوده برای ثبت حضور (ثانیه)' },
  deviation_km: { value: 10, description: 'آستانه انحراف از مسیر (کیلومتر)' },
  deviation_minutes: { value: 15, description: 'مدت تداوم انحراف پیش از هشدار (دقیقه)' },
  gps_stale_minutes: { value: 10, description: 'کهنه‌شدن موقعیت و ثبت قطع GPS (دقیقه)' },
  gps_offline_points: { value: 5000, description: 'حداکثر نقاط GPS آفلاین در هر ارسال' },
  image_max_kb: { value: 300, description: 'حداکثر اندازه تصویر مدارک (کیلوبایت)' },
  penalty_step_minutes: { value: 30, description: 'فاصله افزایش جریمه تأخیر (دقیقه)' },
  penalty_per_step: { value: 250000, description: 'مبلغ هر پله جریمه (تومان)' },
  penalty_cap_ratio: { value: 0.15, description: 'سقف جریمه نسبت به کرایه' },
  sensitive_cargo_value: { value: 500000000, description: 'آستانه ارزش برای الزام متصدی (تومان، پیش‌فرض عملیاتی)' },
};

let cache = null;

function clearSettingsCache() {
  cache = null;
}

async function ensureSettings() {
  for (const [key, meta] of Object.entries(SETTING_DEFAULTS)) {
    const [row, created] = await SystemSetting.findOrCreate({
      where: { key },
      defaults: {
        key,
        value: JSON.stringify(meta.value),
        description: meta.description,
      },
    });
    if (!created && row.description !== meta.description) {
      row.description = meta.description;
      await row.save();
    }
  }
  clearSettingsCache();
}

async function getSettings() {
  if (cache) return cache;
  const rows = await SystemSetting.findAll();
  const map = {};
  for (const [key, meta] of Object.entries(SETTING_DEFAULTS)) map[key] = meta.value;
  for (const row of rows) {
    try {
      map[row.key] = JSON.parse(row.value);
    } catch {
      map[row.key] = row.value;
    }
  }
  cache = map;
  return map;
}

async function listSettings() {
  const rows = await SystemSetting.findAll({ order: [['key', 'ASC']] });
  return rows.map((row) => ({
    key: row.key,
    value: (() => {
      try { return JSON.parse(row.value); } catch { return row.value; }
    })(),
    description: row.description,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt,
  }));
}

module.exports = {
  SETTING_DEFAULTS,
  ensureSettings,
  getSettings,
  listSettings,
  clearSettingsCache,
};
