import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, THEME_KEYS } from '../constants/themes';

const STORAGE_KEY = '@app_theme';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState('daylight');

  // Restore persisted theme on launch
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved && THEMES[saved]) setThemeKey(saved);
    }).catch(() => {});
  }, []);

  const cycleTheme = () => {
    setThemeKey(prev => {
      const idx = THEME_KEYS.indexOf(prev);
      const next = THEME_KEYS[(idx + 1) % THEME_KEYS.length];
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  };

  const setTheme = (key) => {
    if (!THEMES[key]) return;
    setThemeKey(key);
    AsyncStorage.setItem(STORAGE_KEY, key).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{
      theme: THEMES[themeKey],
      themeKey,
      cycleTheme,
      setTheme,
      allThemes: THEMES,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
