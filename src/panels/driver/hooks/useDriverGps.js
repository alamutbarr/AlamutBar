import { useState, useEffect, useCallback, useRef } from 'react';
import { GpsQueue } from '../gpsQueue';

const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
};

function toPoint(pos) {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    ts: Date.now(),
    accuracy: pos.coords.accuracy,
    speed: pos.coords.speed ?? undefined,
    heading: pos.coords.heading ?? undefined,
    source: navigator.onLine ? 'online' : 'offline',
  };
}

export function useDriverGps(enabled, missionId) {
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [currentPoint, setCurrentPoint] = useState(null);
  const [queueSize, setQueueSize] = useState(0);
  const queueRef = useRef(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const latestRef = useRef(null);
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    queueRef.current = new GpsQueue(missionId);
    setQueueSize(queueRef.current.size());
    latestRef.current = queueRef.current.latest();
  }, [missionId]);

  const sendBatch = useCallback(async (active = true) => {
    if (!queueRef.current || !missionId) return;
    const batch = queueRef.current.getBatch(20);
    const current = latestRef.current;
    if (!batch.length && !current) return;
    try {
      const { api } = await import('../services/api');
      await api.post('/v1/driver/location', {
        missionId,
        points: batch,
        current,
        active,
      });
      if (batch.length) queueRef.current.removeBatch(batch.length);
      lastSentAtRef.current = Date.now();
      setQueueSize(queueRef.current.size());
    } catch {
      setQueueSize(queueRef.current.size());
    }
  }, [missionId]);

  const tracking = Boolean(enabled && missionId && !paused);

  useEffect(() => {
    const stopWatch = () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!tracking) {
      stopWatch();
      if (!enabled || !missionId) setStatus('disconnected');
      return undefined;
    }

    if (!navigator.geolocation) {
      setStatus('disconnected');
      return undefined;
    }

    const onSuccess = (pos) => {
      const point = toPoint(pos);
      latestRef.current = point;
      setCurrentPoint(point);
      queueRef.current?.add(point);
      setQueueSize(queueRef.current?.size() ?? 0);
      setStatus('active');
      if (Date.now() - lastSentAtRef.current > 8000) {
        sendBatch(true);
      }
    };

    const onError = () => {
      setStatus('issue');
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, WATCH_OPTIONS);
    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, WATCH_OPTIONS);
    intervalRef.current = setInterval(() => {
      sendBatch(true);
    }, 15000);

    return stopWatch;
  }, [tracking, enabled, missionId, sendBatch]);

  const toggleGps = useCallback(() => {
    setPaused((current) => {
      const next = !current;
      if (next) {
        setStatus('disconnected');
        sendBatch(false);
      }
      return next;
    });
  }, [sendBatch]);

  return {
    status,
    currentPoint,
    queueSize,
    onToggle: toggleGps,
    onSync: sendBatch,
    toggleGps,
    sendBatch,
  };
}
