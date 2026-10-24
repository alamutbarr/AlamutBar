import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, getAccess, saveSession } from './api';

const InspectorAuth = createContext(null);

export function InspectorAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccess()) {
      setLoading(false);
      return;
    }
    api('/me')
      .then(setUser)
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(phone, code) {
      const data = await api('/auth/verify-otp', { method: 'POST', body: { phone, code } });
      saveSession(data.token, data.refreshToken);
      setUser(data.inspector);
      return data.inspector;
    },
    async logout() {
      try { await api('/auth/logout', { method: 'POST' }); } catch { /* نشست محلی پاک می‌شود */ }
      clearSession();
      setUser(null);
    },
  }), [user, loading]);

  return <InspectorAuth.Provider value={value}>{children}</InspectorAuth.Provider>;
}

export function useInspector() {
  return useContext(InspectorAuth);
}
