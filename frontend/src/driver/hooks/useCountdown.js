import { useState, useEffect, useRef } from 'react';

export function useCountdown(targetIso) {
  const [remaining, setRemaining] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!targetIso) {
      setRemaining(0);
      return;
    }
    const target = new Date(targetIso).getTime();

    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setRemaining(diff);
    };

    tick();
    rafRef.current = setInterval(tick, 1000);

    return () => {
      if (rafRef.current) clearInterval(rafRef.current);
    };
  }, [targetIso]);

  return { remaining, expired: remaining <= 0 };
}

export function formatCountdown(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const faMin = new Intl.NumberFormat('fa-IR').format(min);
  const faSec = new Intl.NumberFormat('fa-IR').format(sec);
  return `${faMin}:${faSec.padStart(2, '۰')}`;
}