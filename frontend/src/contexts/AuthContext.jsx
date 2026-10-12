import { createContext, useContext, useEffect, useState } from 'react';

export const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Stored user could not be read:', error);
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem('driver_token') || localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setToken(localStorage.getItem('driver_token') || localStorage.getItem('token') || null);
    setUser(readStoredUser());
    setLoading(false);
  }, []);

  // OTP verification and registration both return a ready-to-use JWT.
  const login = (authToken, authUser = null) => {
    if (typeof authToken !== 'string' || !authToken.trim()) {
      throw new Error('سرور توکن ورود معتبر برنگرداند.');
    }
    localStorage.setItem('driver_token', authToken);
    localStorage.setItem('token', authToken);
    setToken(authToken);
    if (authUser && typeof authUser === 'object') {
      localStorage.setItem('user', JSON.stringify(authUser));
      setUser(authUser);
    }
  };

  const logout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
