import { createContext, useContext, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEYS = {
  owner: "alamut_owner_theme",
  driver: "alamut_driver_theme",
};

const PanelThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

function readTheme(key) {
  try {
    return localStorage.getItem(key) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function PanelThemeProvider({ panel, children }) {
  const key = KEYS[panel] || "alamut_panel_theme";
  const [theme, setTheme] = useState(() => readTheme(key));

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* ignore quota / private mode */
    }
  };

  return (
    <PanelThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="panel-app" data-theme={theme}>
        {children}
      </div>
    </PanelThemeContext.Provider>
  );
}

export function usePanelTheme() {
  return useContext(PanelThemeContext);
}

export function ThemeToggle({ compact = false, className = "" }) {
  const { theme, toggleTheme } = usePanelTheme();
  const dark = theme === "dark";
  const label = dark ? "حالت روشن" : "حالت تیره";

  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? "theme-toggle--icon" : "theme-toggle--row"} ${className}`}
      onClick={toggleTheme}
      aria-label="تغییر تم"
      title={label}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
      {!compact && <span>{label}</span>}
    </button>
  );
}
