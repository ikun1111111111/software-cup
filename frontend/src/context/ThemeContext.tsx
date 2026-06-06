import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeName = 'dawn' | 'day' | 'dusk' | 'night';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dawn',
  setTheme: () => {},
});

function getThemeByHour(hour: number): ThemeName {
  if (hour >= 6 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'dusk';
  return 'night';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const hour = new Date().getHours();
    return getThemeByHour(hour);
  });

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    const interval = setInterval(() => {
      const hour = new Date().getHours();
      const expected = getThemeByHour(hour);
      if (expected !== theme) {
        setThemeState(expected);
        document.documentElement.setAttribute('data-theme', expected);
      }
    }, 3600000);

    return () => clearInterval(interval);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
