import { useState } from 'react';

export function useSidebarCollapsed(panel) {
  const storage = `alamut_sidebar_${panel}`;
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storage) === '1';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(storage, next ? '1' : '0');
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  return { collapsed, toggle };
}
