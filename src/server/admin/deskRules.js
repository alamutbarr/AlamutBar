const LEAD_STAGES = ['new', 'qualified', 'proposal', 'won', 'lost'];
const INCIDENT_KINDS = ['delay', 'breakdown', 'damage', 'shortage', 'other'];
const INCIDENT_STATUSES = ['open', 'investigating', 'resolved'];
const TICKET_PRIORITIES = ['normal', 'urgent'];
const FLEET_SLOTS = {
  license: 'گواهینامه',
  vehicle_card: 'کارت خودرو',
  insurance: 'بیمه‌نامه خودرو',
  smart_card: 'کارت هوشمند',
  health: 'کارت سلامت',
};
const FLEET_REQUIRED = ['license', 'vehicle_card', 'insurance'];

function articlePhase(status, publishedAt, now = new Date()) {
  if (status !== 'published') return 'draft';
  if (publishedAt && new Date(publishedAt).getTime() > now.getTime()) return 'scheduled';
  return 'published';
}

function invoiceLedger(amount, payments) {
  const total = Math.max(0, Number(amount) || 0);
  const paid = (payments || []).reduce((sum, row) => sum + Math.max(0, Number(row.amount) || 0), 0);
  const remaining = Math.max(0, total - paid);
  return {
    amount: total,
    paid,
    remaining,
    settled: total > 0 && remaining === 0,
  };
}

function movementBlocked(criticalOpen) {
  return Boolean(criticalOpen);
}

function locationIsStale(observedAt, now = new Date(), minutes = 5) {
  if (!observedAt) return true;
  const at = new Date(observedAt).getTime();
  if (!Number.isFinite(at)) return true;
  return now.getTime() - at > minutes * 60 * 1000;
}

function dayStamp(value) {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function documentsExpired(driver, today = new Date()) {
  const day = dayStamp(today);
  const license = dayStamp(driver?.licenseExpiry || driver?.license_expiry);
  const insurance = dayStamp(driver?.insuranceExpiry || driver?.insurance_expiry);
  return Boolean((license && license <= day) || (insurance && insurance <= day));
}

function marketOpen(driver, today = new Date()) {
  if (!driver) return false;
  if (driver.verificationStatus !== 'VERIFIED') return false;
  if (driver.accountVerified === false || driver.account_verified === false) return false;
  const dossier = driver.dossierStatus || driver.dossier_status || 'approved';
  if (dossier !== 'approved') return false;
  if (documentsExpired(driver, today)) return false;
  return true;
}

function checklistPassed(report) {
  if (!report) return false;
  const packaging = report.packagingOk ?? report.packaging_ok;
  const weight = report.weightOk ?? report.weight_ok;
  const vehicle = report.vehicleOk ?? report.vehicle_ok;
  const hasChecks = packaging != null || weight != null || vehicle != null;
  if (!hasChecks) return report.decision === 'APPROVED' || report.decision === 'CORRECTED';
  return Boolean(packaging) && Boolean(weight) && Boolean(vehicle);
}

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function readFleet(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const documents = {};
  for (const [key, title] of Object.entries(FLEET_SLOTS)) {
    const item = source[key] && typeof source[key] === 'object' ? source[key] : {};
    const url = item.url ? String(item.url) : null;
    documents[key] = {
      key,
      title,
      required: FLEET_REQUIRED.includes(key),
      url,
      status: url && ['PENDING', 'APPROVED', 'REJECTED'].includes(item.status) ? item.status : (url ? 'PENDING' : 'MISSING'),
      note: item.note || null,
    };
  }
  return documents;
}

function fleetReady(raw) {
  const docs = readFleet(raw);
  return FLEET_REQUIRED.every((key) => docs[key].status === 'APPROVED');
}

function reviewFleet(raw, { key, decision, reason } = {}) {
  if (!FLEET_SLOTS[key]) {
    const error = new Error('نوع مدرک ناوگان نامعتبر است.');
    error.statusCode = 400;
    throw error;
  }
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : {};
  const current = source[key] && typeof source[key] === 'object' ? source[key] : {};
  if (!current.url) {
    const error = new Error('این مدرک هنوز بارگذاری نشده است.');
    error.statusCode = 404;
    throw error;
  }
  const next = decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : null;
  if (!next) {
    const error = new Error('تصمیم نامعتبر است.');
    error.statusCode = 400;
    throw error;
  }
  const text = String(reason || '').trim();
  if (next === 'REJECTED' && text.length < 3) {
    const error = new Error('دلیل رد مدرک را بنویسید.');
    error.statusCode = 400;
    throw error;
  }
  source[key] = {
    url: current.url,
    status: next,
    note: next === 'REJECTED' ? text : null,
    title: FLEET_SLOTS[key],
  };
  return source;
}

function upsertFleet(raw, { key, url } = {}) {
  if (!FLEET_SLOTS[key]) {
    const error = new Error('نوع مدرک ناوگان نامعتبر است.');
    error.statusCode = 400;
    throw error;
  }
  if (!url) {
    const error = new Error('فایل مدرک لازم است.');
    error.statusCode = 400;
    throw error;
  }
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : {};
  const current = source[key] && typeof source[key] === 'object' ? source[key] : {};
  if (current.status === 'APPROVED') {
    const error = new Error('این مدرک تأیید شده و دیگر قابل تغییر نیست.');
    error.statusCode = 403;
    throw error;
  }
  source[key] = { url: String(url), status: 'PENDING', note: null, title: FLEET_SLOTS[key] };
  return source;
}

module.exports = {
  LEAD_STAGES,
  INCIDENT_KINDS,
  INCIDENT_STATUSES,
  TICKET_PRIORITIES,
  FLEET_SLOTS,
  FLEET_REQUIRED,
  articlePhase,
  invoiceLedger,
  movementBlocked,
  locationIsStale,
  documentsExpired,
  marketOpen,
  checklistPassed,
  slugify,
  readFleet,
  fleetReady,
  reviewFleet,
  upsertFleet,
};
