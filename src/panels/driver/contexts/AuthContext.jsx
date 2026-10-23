// frontend/src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

export const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return (
      JSON.parse(
        localStorage.getItem("driver_user") || sessionStorage.getItem("driver_user"),
      ) || null
    );
  } catch {
    return null;
  }
}

function readStoredToken() {
  return (
    localStorage.getItem("driver_token") ||
    sessionStorage.getItem("driver_token") ||
    null
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(readStoredToken);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = (authToken, authUser = null, rememberMe = true) => {
    const storage = rememberMe ? localStorage : sessionStorage;

    // پاک کردن از استوریج دیگر برای اطمینان
    localStorage.removeItem("driver_token");
    sessionStorage.removeItem("driver_token");

    storage.setItem("driver_token", authToken);
    setToken(authToken);

    if (authUser) {
      storage.setItem("driver_user", JSON.stringify(authUser));
      setUser(authUser);
    }
  };

  const logout = () => {
    localStorage.removeItem("driver_token");
    sessionStorage.removeItem("driver_token");
    localStorage.removeItem("driver_user");
    sessionStorage.removeItem("driver_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
