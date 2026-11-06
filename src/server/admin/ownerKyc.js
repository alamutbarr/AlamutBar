const ID_TYPES = ['shenasnameh', 'national_card'];

const SLOTS = {
  'shenasnameh:selfie': { title: 'سلفی با شناسنامه', idType: 'shenasnameh' },
  'shenasnameh:holding': { title: 'سلفی به‌همراه شناسنامه', idType: 'shenasnameh', retired: true },
  'shenasnameh:front': { title: 'صفحه اول شناسنامه', idType: 'shenasnameh' },
  'shenasnameh:back': { title: 'پشت شناسنامه', idType: 'shenasnameh', retired: true },
  'national_card:selfie': { title: 'سلفی با کارت ملی', idType: 'national_card' },
  'national_card:holding': { title: 'سلفی به‌همراه کارت ملی', idType: 'national_card', retired: true },
  'national_card:front': { title: 'کارت ملی', idType: 'national_card' },
  'national_card:back': { title: 'پشت کارت ملی', idType: 'national_card', retired: true },
  selfie: { title: 'سلفی', retired: true },
  holding: { title: 'سلفی به‌همراه مدرک شناسایی', retired: true },
};

function fail(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function asObject(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return typeof raw === 'object' ? raw : {};
}

function readDoc(item) {
  const url = item && item.url ? String(item.url) : null;
  const status = url && ['PENDING', 'APPROVED', 'REJECTED'].includes(item.status) ? item.status : (url ? 'PENDING' : 'MISSING');
  return {
    url,
    status,
    note: status === 'REJECTED' && item && item.note ? String(item.note) : null,
  };
}

function migrateLegacyDocuments(source, idType) {
  const docs = source.documents && typeof source.documents === 'object' ? { ...source.documents } : {};
  if (!idType) return docs;
  for (const legacy of ['selfie', 'holding']) {
    const alreadyTyped = ID_TYPES.some((type) => docs[`${type}:${legacy}`] && docs[`${type}:${legacy}`].url);
    if (alreadyTyped) continue;
    if (docs[legacy] && docs[legacy].url) docs[`${idType}:${legacy}`] = docs[legacy];
  }
  return docs;
}

function normalize(raw) {
  const source = asObject(raw);
  const idType = ID_TYPES.includes(source.idType) ? source.idType : null;
  const migrated = migrateLegacyDocuments(source, idType);
  const documents = {};
  for (const key of Object.keys(SLOTS)) {
    documents[key] = readDoc(migrated[key]);
  }
  return { idType, documents };
}

function requiredKeys(idType) {
  if (idType === 'shenasnameh') return ['shenasnameh:selfie', 'shenasnameh:front'];
  if (idType === 'national_card') return ['national_card:selfie', 'national_card:front'];
  return [];
}

function overallStatus(raw) {
  const state = normalize(raw);
  if (!state.idType) return 'PENDING';
  const docs = requiredKeys(state.idType).map((key) => state.documents[key]);
  if (docs.some((doc) => doc.status === 'REJECTED')) return 'REJECTED';
  if (docs.every((doc) => doc.status === 'APPROVED')) return 'VERIFIED';
  return 'PENDING';
}

const KYC_SHIPMENT_MISSING =
  'برای ثبت بار ابتدا باید احراز هویت را در پروفایل انجام دهید. شناسنامه یا کارت ملی کافی است و نیازی به بارگذاری هر دو نیست.';
const KYC_SHIPMENT_PENDING =
  'مدارک هویت هنوز تأیید نشده است. پس از تأیید احراز هویت می‌توانید بار ثبت کنید.';
const KYC_SHIPMENT_REJECTED =
  'مدارک هویت رد شده است. ابتدا در پروفایل مدارک را اصلاح کنید تا بتوانید بار ثبت کنید.';
const POSTAL_CODE_REQUIRED =
  'برای ثبت بار وارد کردن کد پستی در پروفایل الزامی است. این مورد هنگام ورود گرفته نمی‌شود و باید در پروفایل تکمیل شود.';

function hasValidPostalCode(postal) {
  return /^\d{10}$/.test(String(postal || '').trim());
}

function postalCodeGateMessage(postal) {
  return hasValidPostalCode(postal) ? null : POSTAL_CODE_REQUIRED;
}

function shipmentGateMessage(raw, verificationStatus) {
  const fromDocs = overallStatus(raw);
  const status = verificationStatus === 'VERIFIED' || fromDocs === 'VERIFIED'
    ? 'VERIFIED'
    : verificationStatus === 'REJECTED' || fromDocs === 'REJECTED'
      ? 'REJECTED'
      : fromDocs;
  if (status === 'VERIFIED') return null;
  if (status === 'REJECTED') return KYC_SHIPMENT_REJECTED;
  const state = normalize(raw);
  if (!state.idType) return KYC_SHIPMENT_MISSING;
  const docs = requiredKeys(state.idType).map((key) => state.documents[key]);
  const uploaded = docs.every((doc) => doc.url && doc.status !== 'MISSING');
  if (uploaded) return KYC_SHIPMENT_PENDING;
  return KYC_SHIPMENT_MISSING;
}

function syncStatus(raw) {
  const kyc = normalize(raw);
  const verificationStatus = overallStatus(kyc);
  const verificationNote = requiredKeys(kyc.idType)
    .map((key) => {
      const doc = kyc.documents[key];
      if (doc.status !== 'REJECTED' || !doc.note) return null;
      return `${SLOTS[key].title}: ${doc.note}`;
    })
    .filter(Boolean)
    .join(' | ')
    .slice(0, 500) || null;
  return { kyc, verificationStatus, verificationNote };
}

function setIdType(raw, idType) {
  if (!ID_TYPES.includes(idType)) throw fail('نوع مدرک شناسایی نامعتبر است.', 400);
  const state = normalize(raw);
  state.idType = idType;
  return state;
}

function uploadDocument(raw, { key, url, idType }) {
  if (!url) throw fail('نوع مدرک نامعتبر است.', 400);
  const state = idType ? setIdType(raw, idType) : normalize(raw);
  let slotKey = key;
  if ((key === 'selfie' || key === 'holding') && state.idType) {
    slotKey = `${state.idType}:${key}`;
  }
  const slot = SLOTS[slotKey];
  if (!slot || slot.retired) throw fail('نوع مدرک نامعتبر است.', 400);
  if (slot.idType && state.idType && slot.idType !== state.idType) {
    throw fail('این مدرک با نوع شناسایی انتخاب‌شده جور نیست.', 400);
  }
  if (slot.idType && !state.idType) state.idType = slot.idType;
  const existing = state.documents[slotKey];
  if (existing?.status === 'APPROVED') {
    throw fail('این مدرک تأیید شده و دیگر قابل تغییر نیست.', 403);
  }
  state.documents[slotKey] = { url: String(url), status: 'PENDING', note: null };
  return state;
}

function reviewDocument(raw, { key, decision, reason }) {
  const state = normalize(raw);
  const doc = state.documents[key];
  if (!SLOTS[key] || !doc || !doc.url) throw fail('مدرک پیدا نشد.', 404);
  if (decision !== 'APPROVED' && decision !== 'REJECTED') throw fail('تصمیم نامعتبر است.', 400);
  const note = String(reason || '').trim();
  if (decision === 'REJECTED' && note.length < 3) throw fail('دلیل رد مدرک را بنویسید.', 400);
  doc.status = decision;
  doc.note = decision === 'REJECTED' ? note.slice(0, 300) : null;
  const synced = syncStatus(state);
  return {
    ...synced,
    notice: decision === 'REJECTED'
      ? { title: 'مدرک هویت رد شد', message: `${SLOTS[key].title}: ${doc.note}`.slice(0, 500) }
      : null,
  };
}

function present(raw) {
  const state = normalize(raw);
  const required = new Set(requiredKeys(state.idType));
  return {
    idType: state.idType,
    verificationStatus: overallStatus(state),
    documents: Object.entries(SLOTS).map(([key, slot]) => ({
      key,
      title: slot.title,
      required: required.has(key),
      ...state.documents[key],
    })).filter((doc) => {
      const slot = SLOTS[doc.key];
      if (slot.retired) return false;
      if (!state.idType) return false;
      return slot.idType === state.idType;
    }),
  };
}

module.exports = {
  SLOTS,
  ID_TYPES,
  KYC_SHIPMENT_MISSING,
  KYC_SHIPMENT_PENDING,
  KYC_SHIPMENT_REJECTED,
  POSTAL_CODE_REQUIRED,
  hasValidPostalCode,
  postalCodeGateMessage,
  normalize,
  requiredKeys,
  overallStatus,
  shipmentGateMessage,
  syncStatus,
  setIdType,
  uploadDocument,
  reviewDocument,
  present,
};
