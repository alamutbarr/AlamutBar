const GROUPS = ['personal', 'vehicle', 'insurance'];

function emptyDocuments() {
  return { personal: [], vehicle: [], insurance: [] };
}

function normalizeDocuments(raw) {
  const base = emptyDocuments();
  if (!raw || typeof raw !== 'object') return base;
  for (const group of GROUPS) {
    if (Array.isArray(raw[group])) base[group] = raw[group].map((item) => ({ ...item }));
  }
  return base;
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

function reviewDocument(raw, { group, index, decision, reason }) {
  const documents = normalizeDocuments(raw);
  const list = documents[group];
  const item = list && list[index];
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
  emptyDocuments,
  normalizeDocuments,
  upsertDocument,
  reviewDocument,
};
