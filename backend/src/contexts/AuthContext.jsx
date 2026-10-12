import React, { createContext, useContext, useState } from "react";
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem("driver_token"));
    const login = (newToken) => {
        localStorage.setItem("driver_token", newToken);
        setToken(newToken);
    };
    const logout = () => {
        localStorage.removeItem("driver_token");
        setToken(null);
    };
    return (<AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>);
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used within AuthProvider");
    return context;
}
