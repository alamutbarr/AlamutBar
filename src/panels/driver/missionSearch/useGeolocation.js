// frontend/src/driver/missionSearch/useGeolocation.js
//
// دریافت موقعیت مکانی واقعی راننده از طریق Geolocation API مرورگر.
// درخواست مجوز GPS فقط با اقدام صریح کاربر (requestLocation) انجام می‌شود؛
// هیچ مختصاتی بدون این اقدام خوانده نمی‌شود.

import { useCallback, useState } from 'react';

// status: 'idle' | 'locating' | 'success' | 'error'
// errorCode: 'unsupported' | 'denied' | 'unavailable' | 'timeout' | 'unknown'

function mapGeolocationError(error) {
  if (!error) return 'unknown';
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'denied';
    case error.POSITION_UNAVAILABLE:
      return 'unavailable';
    case error.TIMEOUT:
      return 'timeout';
    default:
      return 'unknown';
  }
}

export function useGeolocation() {
  const [status, setStatus] = useState('idle');
  const [coords, setCoords] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorCode('unsupported');
      return;
    }

    setStatus('locating');
    setErrorCode(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('success');
      },
      (error) => {
        setErrorCode(mapGeolocationError(error));
        setStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }, []);

  return { status, coords, errorCode, requestLocation };
}
