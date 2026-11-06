function toRad(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const earth = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

function distanceToSegmentKm(point, start, end) {
  if (!point || !start || !end) return null;
  if (start.lat == null || end.lat == null || point.lat == null) return null;
  const midLat = ((Number(start.lat) + Number(end.lat)) / 2) * (Math.PI / 180);
  const kx = 111.32 * Math.cos(midLat);
  const ky = 110.57;
  const xy = (p) => ({ x: Number(p.lng) * kx, y: Number(p.lat) * ky });
  const A = xy(start);
  const B = xy(end);
  const P = xy(point);
  const abx = B.x - A.x;
  const aby = B.y - A.y;
  const lengthSquared = abx * abx + aby * aby;
  if (lengthSquared === 0) return Math.hypot(P.x - A.x, P.y - A.y);
  let t = ((P.x - A.x) * abx + (P.y - A.y) * aby) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(P.x - (A.x + t * abx), P.y - (A.y + t * aby));
}

module.exports = { haversineKm, distanceToSegmentKm };
