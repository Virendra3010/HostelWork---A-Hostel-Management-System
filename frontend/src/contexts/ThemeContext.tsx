import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  toggleDarkMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemPreference = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const getInitialTheme = (): { mode: ThemeMode; isDark: boolean } => {
  const saved = localStorage.getItem('themeMode') as ThemeMode;
  
  if (saved && ['light', 'dark', 'system'].includes(saved)) {
    const isDark = saved === 'dark' || (saved === 'system' && getSystemPreference());
    return { mode: saved, isDark };
  }
  
  // Default to system preference
  return { mode: 'system', isDark: getSystemPreference() };
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeState, setThemeState] = useState(() => getInitialTheme());

  const applyTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    localStorage.setItem('themeMode', themeState.mode);
    applyTheme(themeState.isDark);
  }, [themeState]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (themeState.mode === 'system') {
        setThemeState(prev => ({ ...prev, isDark: e.matches }));
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [themeState.mode]);

  const toggleDarkMode = () => {
    const newMode: ThemeMode = themeState.isDark ? 'light' : 'dark';
    setThemeState({ mode: newMode, isDark: newMode === 'dark' });
  };

  const setThemeMode = (mode: ThemeMode) => {
    const isDark = mode === 'dark' || (mode === 'system' && getSystemPreference());
    setThemeState({ mode, isDark });
  };

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode: themeState.isDark, 
      themeMode: themeState.mode,
      toggleDarkMode, 
      setThemeMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};