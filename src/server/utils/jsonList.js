function unwrapJson(value) {
  let current = value;
  for (let depth = 0; depth < 3 && typeof current === 'string'; depth += 1) {
    const text = current.trim();
    if (!text) return null;
    try {
      current = JSON.parse(text);
    } catch {
      return text;
    }
  }
  return current;
}

function jsonList(value) {
  const current = unwrapJson(value);
  if (current == null || current === '') return [];
  if (Array.isArray(current)) return current;
  if (typeof current === 'object') {
    if (current.url || current.path || current.kind || current.field || current.note || current.key) return [current];
    return Object.values(current);
  }
  return [];
}

function photoList(value) {
  const current = unwrapJson(value);
  if (typeof current === 'string') {
    const url = current.trim();
    return url ? [{ kind: 'other', url }] : [];
  }
  return jsonList(current).map((photo) => {
    if (typeof photo === 'string') {
      const url = photo.trim();
      return url ? { kind: 'other', url } : null;
    }
    if (!photo || typeof photo !== 'object') return null;
    const url = String(photo.url || photo.path || photo.src || '').trim();
    const kind = String(photo.kind || photo.type || '').trim();
    if (!url && !kind) return null;
    return { kind: kind || 'other', url };
  }).filter(Boolean);
}

module.exports = { jsonList, photoList };
