const { SystemSetting } = require('../models');
const { DEFAULT_CHECKLIST, DEFAULT_REQUIRED } = require('../inspector/policy');

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
  inspector_required_mode: { value: 'flagged_or_value', description: 'الزام متصدی: flagged_or_value یا all یا assigned_only' },
  inspector_dispatch_payer: { value: 'alamut', description: 'مسئول هماهنگی اعزام متصدی: alamut یا cargo_owner یا carrier. تسویه در این نسخه نیست' },
  inspector_grace_minutes: { value: 30, description: 'مهلت حضور متصدی بعد از پایان پنجره بارگیری (دقیقه)' },
  inspector_no_show_policy: { value: 'alert', description: 'غیبت متصدی فقط هشدار می‌سازد و بازرسی را حذف نمی‌کند' },
  weight_discrepancy_kg: { value: 200, description: 'اختلاف وزن قابل قبول نسبت به وزن اعلامی (کیلوگرم)' },
  value_discrepancy_ratio: { value: 0.05, description: 'نسبت اختلاف ارزش کالا که مغایرت حساب می‌شود' },
  inspector_final_approval: { value: 'supervisor', description: 'تأیید نهایی: supervisor، یا inspector فقط برای مراجعه کامل و بدون مغایرت' },
  inspector_required_items: { value: DEFAULT_REQUIRED, description: 'مدارک الزامی متصدی: عکس پلمب و مهار، وزن خالی و پر، ارزش دقیق' },
  inspector_checklist: { value: DEFAULT_CHECKLIST, description: 'چک‌لیست مراجعه متصدی' },
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
