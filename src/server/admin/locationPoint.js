function normalizePoint(point) {
  if (!point) return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    ts: point.ts ? new Date(point.ts) : new Date(),
  };
}

function pickLatestPoint(points = []) {
  return points.reduce((best, point) => {
    if (!best) return point;
    return new Date(point.ts) >= new Date(best.ts) ? point : best;
  }, null);
}

module.exports = { normalizePoint, pickLatestPoint };
