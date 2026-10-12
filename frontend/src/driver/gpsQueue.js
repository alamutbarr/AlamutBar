const MAX_POINTS = 5000;
const STORAGE_KEY = 'xbar_gps_queue';
const FIFO_LIMIT = MAX_POINTS;

export class GpsQueue {
  constructor() {
    this.points = [];
    this.storage = typeof window !== 'undefined' ? window.localStorage : null;
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw) {
        this.points = JSON.parse(raw);
      }
    } catch {
      this.points = [];
    }
  }

  saveToStorage() {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.points.slice(-200)));
    } catch {
      // storage full — drop oldest
      this.points = this.points.slice(-100);
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(this.points));
      } catch {
        // give up
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