const ID_TYPES = ['shenasnameh', 'national_card'];

const SLOTS = {
  'shenasnameh:selfie': { title: 'سلفی با شناسنامه', idType: 'shenasnameh' },
  'shenasnameh:front': { title: 'صفحه اول شناسنامه', idType: 'shenasnameh' },
  'national_card:selfie': { title: 'سلفی با کارت ملی', idType: 'national_card' },
  'national_card:front': { title: 'کارت ملی', idType: 'national_card' },
};

const LEGACY_KEY_MAP = {
  'shenasnameh:selfie': 'shenasnameh:selfie',
  'shenasnameh:front': 'shenasnameh:front',
  'shenasnameh:holding': 'shenasnameh:selfie',
  'national_card:selfie': 'national_card:selfie',
  'national_card:front': 'national_card:front',
  'national_card:holding': 'national_card:selfie',
  'nationalCard:front': 'national_card:front',
  'nationalCard:back': 'national_card:front',
  national_card: 'national_card:front',
  'selfie:selfie': 'selfie',
  selfie: 'selfie',
  smart_card: 'selfie',
};

const GROUPS = ['personal', 'vehicle', 'insurance'];
const SLOT_META = Object.fromEntries(
  Object.entries(SLOTS).map(([key, slot]) => [key, { group: 'personal', title: slot.title, idType: slot.idType }]),
);

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
  if (!item) return { url: null, status: 'MISSING', note: null };
  const url = item.url ? String(item.url) : null;
  const status = url && ['PENDING', 'APPROVED', 'REJECTED'].includes(item.status)
    ? item.status
    : (url ? 'PENDING' : 'MISSING');
  return {
    url,
    status,
    note: status === 'REJECTED' && item.note ? String(item.note) : null,
  };
}

function listRawItems(source) {
  if (Array.isArray(source)) return source;
  if (Array.isArray(source.documents)) return source.documents;
  if (source.documents && typeof source.documents === 'object') {
    return Object.entries(source.documents).map(([key, value]) => ({ key, ...(value || {}) }));
  }
  const items = [];
  for (const group of GROUPS) {
    if (Array.isArray(source[group])) items.push(...source[group]);
  }
  return items;
}

function inferIdType(source, items) {
  if (ID_TYPES.includes(source.idType)) return source.idType;
  const keys = items.map((item) => String(item?.key || ''));
  if (keys.some((key) => key.startsWith('shenasnameh:'))) return 'shenasnameh';
  if (keys.some((key) => key.startsWith('national_card:') || key.startsWith('nationalCard'))) return 'national_card';
  return null;
}

function canonicalKey(key, idType) {
  if (SLOTS[key]) return key;
  const mapped = LEGACY_KEY_MAP[key];
  if (mapped === 'selfie' && idType) return `${idType}:selfie`;
  if (mapped && SLOTS[mapped]) return mapped;
  return null;
}

function emptyDocs() {
  const documents = {};
  for (const key of Object.keys(SLOTS)) documents[key] = readDoc(null);
  return documents;
}

function normalize(raw) {
  const source = asObject(raw);
  const items = listRawItems(source);
  const idType = inferIdType(source, items);
  const documents = emptyDocs();
  for (const item of items) {
    const key = canonicalKey(item.key, idType);
    if (!key || documents[key].url) continue;
    documents[key] = readDoc(item);
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
  if (!state.idType) return 'PENDING_VERIFICATION';
  const docs = requiredKeys(state.idType).map((key) => state.documents[key] || { status: 'MISSING' });
  if (docs.some((doc) => doc.status === 'REJECTED')) return 'REJECTED';
  if (docs.every((doc) => doc.status === 'APPROVED')) return 'VERIFIED';
  return 'PENDING_VERIFICATION';
}

function persistable(state) {
  return {
    idType: state.idType,
    documents: state.documents,
  };
}

function setIdType(raw, idType) {
  if (!ID_TYPES.includes(idType)) throw fail('نوع مدرک شناسایی نامعتبر است.', 400);
  const state = normalize(raw);
  if (overallStatus(state) === 'VERIFIED' && state.idType && state.idType !== idType) {
    throw fail('هویت تأیید شده و نوع مدرک قابل تغییر نیست.', 403);
  }
  state.idType = idType;
  return persistable(state);
}

function upsertDocument(raw, { key, url, title, idType, group } = {}) {
  const slotKey = key;
  const incomingType = ID_TYPES.includes(idType) ? idType : null;
  const state = incomingType ? { ...normalize(raw), idType: incomingType } : normalize(raw);
  let resolved = canonicalKey(slotKey, state.idType);
  if (!resolved && incomingType) resolved = canonicalKey(slotKey, incomingType);
  const slot = SLOTS[resolved];
  if (!slot) {
    throw fail('نوع مدرک نامعتبر است.', 400);
  }
  if (!url) throw fail('مدرک و تصویر لازم است.', 400);
  if (slot.idType && state.idType && slot.idType !== state.idType) {
    throw fail('این مدرک با نوع شناسایی انتخاب‌شده جور نیست.', 400);
  }
  if (slot.idType && !state.idType) state.idType = slot.idType;
  const existing = state.documents[resolved];
  if (existing?.status === 'APPROVED') {
    throw fail('این مدرک تأیید شده و دیگر قابل تغییر نیست.', 403);
  }
  state.documents[resolved] = {
    url: String(url),
    status: 'PENDING',
    note: null,
    title: title || slot.title,
  };
  return persistable(state);
}

function reviewDocument(raw, { key, decision, reason, note } = {}) {
  const state = normalize(raw);
  const resolved = canonicalKey(key, state.idType) || key;
  const item = state.documents[resolved];
  if (!SLOTS[resolved] || !item || !item.url) throw fail('مدرک پیدا نشد.', 404);
  const next = decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : null;
  if (!next) throw fail('تصمیم نامعتبر است.', 400);
  const text = String(reason || note || '').trim();
  if (next === 'REJECTED' && text.length < 3) throw fail('دلیل رد مدرک را بنویسید.', 400);
  item.status = next;
  item.note = next === 'REJECTED' ? text : null;
  const verificationStatus = overallStatus(state);
  let availability = null;
  if (verificationStatus === 'REJECTED') availability = 'OFFLINE';
  if (verificationStatus === 'VERIFIED') availability = 'READY_IF_OFFLINE';
  const rejectionReason = next === 'REJECTED' ? text : null;
  return {
    documents: persistable(state),
    verificationStatus,
    rejectionReason,
    availability,
    notice: next === 'REJECTED'
      ? { title: 'مدرک رد شد', message: `${SLOTS[resolved].title}: ${text}` }
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
      group: 'personal',
      ...state.documents[key],
    })).filter((doc) => {
      if (!state.idType) return false;
      return SLOTS[doc.key].idType === state.idType;
    }),
  };
}

function flatDocuments(raw) {
  return present(raw).documents;
}

function normalizeDocuments(raw) {
  const presented = present(raw);
  return {
    idType: presented.idType,
    personal: presented.documents,
    vehicle: [],
    insurance: [],
  };
}

function findDocument(raw, { key } = {}) {
  const state = normalize(raw);
  const resolved = canonicalKey(key, state.idType) || key;
  const item = state.documents[resolved];
  if (!item || !item.url) return { documents: persistable(state), group: 'personal', index: -1, item: null };
  return {
    documents: persistable(state),
    group: 'personal',
    index: 0,
    item: { key: resolved, title: SLOTS[resolved]?.title, ...item, group: 'personal' },
  };
}

function emptyDocuments() {
  return persistable({ idType: null, documents: emptyDocs() });
}

module.exports = {
  ID_TYPES,
  SLOTS,
  GROUPS,
  SLOT_META,
  LEGACY_KEY_MAP,
  emptyDocuments,
  normalize,
  normalizeDocuments,
  requiredKeys,
  overallStatus,
  present,
  flatDocuments,
  findDocument,
  setIdType,
  upsertDocument,
  reviewDocument,
};
