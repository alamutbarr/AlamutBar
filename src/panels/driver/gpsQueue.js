const MAX_POINTS = 5000;
const FIFO_LIMIT = MAX_POINTS;
const LEGACY_KEY = 'xbar_gps_queue';

export function gpsQueueKey(missionId) {
  return missionId == null || missionId === '' ? 'alamut_gps_queue' : `alamut_gps_queue:${missionId}`;
}

export class GpsQueue {
  constructor(missionId) {
    this.missionId = missionId;
    this.points = [];
    this.storage = typeof window !== 'undefined' ? window.localStorage : null;
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(gpsQueueKey(this.missionId));
      if (raw) {
        this.points = JSON.parse(raw);
        return;
      }
      if (this.missionId == null || this.missionId === '') {
        const legacy = this.storage.getItem(LEGACY_KEY);
        if (legacy) this.points = JSON.parse(legacy);
      }
    } catch {
      this.points = [];
    }
  }

  saveToStorage() {
    if (!this.storage) return;
    try {
      this.storage.setItem(gpsQueueKey(this.missionId), JSON.stringify(this.points.slice(-200)));
    } catch {
      this.points = this.points.slice(-100);
      try {
        this.storage.setItem(gpsQueueKey(this.missionId), JSON.stringify(this.points));
      } catch {
        /* give up */
      }
    }
  }

  add(point) {
    this.points.push(point);
    if (this.points.length > FIFO_LIMIT) {
      this.points = this.points.slice(-FIFO_LIMIT);
    }
    this.saveToStorage();
  }

  getBatch(maxCount = 50) {
    return this.points.slice(0, maxCount);
  }

  latest() {
    return this.points.length ? this.points[this.points.length - 1] : null;
  }

  removeBatch(count) {
    this.points = this.points.slice(count);
    this.saveToStorage();
  }

  size() {
    return this.points.length;
  }

  clear() {
    this.points = [];
    this.saveToStorage();
  }
}
