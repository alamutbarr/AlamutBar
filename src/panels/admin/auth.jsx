import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, getAccess, saveSession } from './api';

const AdminAuth = createContext(null);

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccess()) {
      setLoading(false);
      return;
    }
    api('/auth/me')
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
    can(permission) {
      const permissions = user?.permissions || [];
      return permissions.includes('*') || permissions.includes(permission);
    },
    async login(username, password) {
      const data = await api('/auth/login', { method: 'POST', body: { username, password } });
      saveSession(data.token, data.refreshToken);
      setUser(data.admin);
      return data.admin;
    },
    async logout() {
      try { await api('/auth/logout', { method: 'POST' }); } catch { /* نشست محلی پاک می‌شود */ }
      clearSession();
      setUser(null);
    },
    setUser,
  }), [user, loading]);

  return <AdminAuth.Provider value={value}>{children}</AdminAuth.Provider>;
}

export function useAdmin() {
  return useContext(AdminAuth);
}
