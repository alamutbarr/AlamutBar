const GROUPS = ['personal', 'vehicle', 'insurance'];

const SLOT_META = {
  'driverLicense:front': { group: 'personal', title: 'روی گواهینامه' },
  'driverLicense:back': { group: 'personal', title: 'پشت گواهینامه' },
  'selfie:selfie': { group: 'personal', title: 'عکس شخصی با کارت' },
  'nationalCard:front': { group: 'personal', title: 'روی کارت ملی' },
  'nationalCard:back': { group: 'personal', title: 'پشت کارت ملی' },
  'vehicleCard:front': { group: 'vehicle', title: 'روی کارت خودرو' },
  'vehicleCard:back': { group: 'vehicle', title: 'پشت کارت خودرو' },
};

const LEGACY_KEY_MAP = {
  license: 'driverLicense:front',
  national_card: 'nationalCard:front',
  vehicle_card: 'vehicleCard:front',
  smart_card: 'selfie:selfie',
};

function emptyDocuments() {
  return { personal: [], vehicle: [], insurance: [] };
}

function normalizeDocuments(raw) {
  const base = emptyDocuments();
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      const group = GROUPS.includes(item?.group) ? item.group : (SLOT_META[item?.key]?.group || 'personal');
      base[group].push({ ...item, group });
    });
    return base;
  }
  if (!raw || typeof raw !== 'object') return base;
  for (const group of GROUPS) {
    if (Array.isArray(raw[group])) base[group] = raw[group].map((item) => ({ ...item, group }));
  }
  return base;
}

function flatDocuments(raw) {
  const documents = normalizeDocuments(raw);
  const list = GROUPS.flatMap((group) => documents[group].map((item) => ({ ...item, group })));
  const byKey = new Map(list.map((item) => [item.key, item]));
  for (const [legacy, canonical] of Object.entries(LEGACY_KEY_MAP)) {
    const source = byKey.get(legacy);
    if (source && !byKey.has(canonical)) {
      const meta = SLOT_META[canonical] || {};
      byKey.set(canonical, {
        ...source,
        key: canonical,
        title: meta.title || source.title,
        group: meta.group || source.group,
      });
    }
  }
  return [...byKey.values()];
}

function findDocument(raw, { group, index, key } = {}) {
  const documents = normalizeDocuments(raw);
  if (key) {
    const aliases = new Set([key]);
    Object.entries(LEGACY_KEY_MAP).forEach(([legacy, canonical]) => {
      if (legacy === key || canonical === key) {
        aliases.add(legacy);
        aliases.add(canonical);
      }
    });
    for (const candidate of aliases) {
      for (const grp of GROUPS) {
        const idx = documents[grp].findIndex((item) => item.key === candidate);
        if (idx !== -1) return { documents, group: grp, index: idx, item: documents[grp][idx] };
      }
    }
    return { documents, group: null, index: -1, item: null };
  }
  const item = documents[group] && documents[group][index];
  return { documents, group, index, item: item || null };
}

function upsertDocument(raw, { group, key, title, url }) {
  if (!GROUPS.includes(group)) {
    const error = new Error('گروه مدرک نامعتبر است.');
    error.statusCode = 400;
    throw error;
  }
  if (!key || !url) {
    const error = new Error('مدرک و تصویر لازم است.');
    error.statusCode = 400;
    throw error;
  }
  const documents = normalizeDocuments(raw);
  const list = documents[group];
  const existing = list.find((item) => item.key === key);
  if (existing?.status === 'APPROVED') {
    const error = new Error('این مدرک تأیید شده و دیگر قابل تغییر نیست.');
    error.statusCode = 403;
    throw error;
  }
  if (existing) {
    existing.title = title || existing.title;
    existing.url = url;
    existing.status = 'PENDING';
    existing.note = '';
  } else {
    list.push({ key, title: title || key, url, status: 'PENDING', note: '' });
  }
  return documents;
}

function reviewDocument(raw, { group, index, key, decision, reason }) {
  const found = findDocument(raw, { group, index, key });
  const { documents, item } = found;
  if (!item) {
    const error = new Error('مدرک پیدا نشد.');
    error.statusCode = 404;
    throw error;
  }
  const next = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  const note = String(reason || '').trim();
  if (next === 'REJECTED' && note.length < 3) {
    const error = new Error('دلیل رد مدرک را بنویسید.');
    error.statusCode = 400;
    throw error;
  }
  item.status = next;
  item.note = next === 'REJECTED' ? note : '';
  const all = [...documents.personal, ...documents.vehicle, ...documents.insurance];
  let verificationStatus = 'PENDING_VERIFICATION';
  let rejectionReason = null;
  let availability = null;
  if (all.some((entry) => entry.status === 'REJECTED')) {
    verificationStatus = 'REJECTED';
    rejectionReason = item.note;
    availability = 'OFFLINE';
  } else if (all.length && all.every((entry) => entry.status === 'APPROVED')) {
    verificationStatus = 'VERIFIED';
    availability = 'READY_IF_OFFLINE';
  }
  return {
    documents,
    verificationStatus,
    rejectionReason,
    availability,
    notice: next === 'REJECTED'
      ? { title: 'مدرک رد شد', message: `${item.title}: ${note}` }
      : null,
  };
}

module.exports = {
  GROUPS,
  SLOT_META,
  LEGACY_KEY_MAP,
  emptyDocuments,
  normalizeDocuments,
  flatDocuments,
  findDocument,
  upsertDocument,
  reviewDocument,
};
