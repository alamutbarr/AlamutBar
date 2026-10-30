import { useState, useEffect, useCallback, useRef } from 'react';
import { GpsQueue } from '../gpsQueue';

export function useDriverGps(enabled, missionId) {
  const [status, setStatus] = useState('active');
  const [currentPoint, setCurrentPoint] = useState(null);
  const [queueSize, setQueueSize] = useState(0);
  const queueRef = useRef(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    queueRef.current = new GpsQueue();
    setQueueSize(queueRef.current.size());
  }, []);

  const sendBatch = useCallback(async () => {
    if (!queueRef.current || !missionId) return;
    const batch = queueRef.current.getBatch(20);
    if (batch.length === 0) return;
    try {
      const { api } = await import('../services/api');
      await api.post('/v1/driver/location', { missionId, points: batch, active: true });
      queueRef.current.removeBatch(batch.length);
      setQueueSize(queueRef.current.size());
    } catch {
      setQueueSize(queueRef.current.size());
    }
  }, [missionId]);

  useEffect(() => {
    if (!enabled || !missionId) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setStatus('disconnected');
      return;
    }

    const onSuccess = (pos) => {
      const point = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        ts: Date.now(),
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed ?? undefined,
        heading: pos.coords.heading ?? undefined,
        source: navigator.onLine ? 'online' : 'offline',
      };
      setCurrentPoint(point);
      queueRef.current?.add(point);
      setQueueSize(queueRef.current?.size() ?? 0);
      setStatus('active');
    };

    const onError = () => {
      setStatus('issue');
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    });

    intervalRef.current = setInterval(() => {
      sendBatch();
    }, 30000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, missionId, sendBatch]);

  const toggleGps = useCallback(() => {
    if (status === 'active') {
      setStatus('disconnected');
    } else {
      setStatus('active');
    }
  }, [status]);

  return { status, currentPoint, queueSize, toggleGps, sendBatch };
}