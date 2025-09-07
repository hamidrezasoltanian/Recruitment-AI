import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Theme = 'indigo' | 'blue' | 'teal' | 'rose';
type Background = { type: 'default' } | { type: 'custom', url: string };

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  background: Background;
  setCustomBackground: (dataUrl: string) => void;
  setDefaultBackground: () => void;
}

const THEME_KEY = 'recruitment_theme_v1';
const BACKGROUND_KEY = 'recruitment_background_v1';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
      return storedTheme || 'indigo';
    } catch {
      return 'indigo';
    }
  });

  const [background, setBackgroundState] = useState<Background>(() => {
    try {
      const storedBg = localStorage.getItem(BACKGROUND_KEY);
      return storedBg ? JSON.parse(storedBg) : { type: 'default' };
    } catch {
      return { type: 'default' };
    }
  });

  useEffect(() => {
    // The base classes are in index.html, we just set the theme name class
    document.body.className = `theme-${theme}`;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (background.type === 'custom') {
      document.body.style.backgroundImage = `url(${background.url})`;
    } else {
      document.body.style.backgroundImage = 'none';
    }
    localStorage.setItem(BACKGROUND_KEY, JSON.stringify(background));
  }, [background]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };
  
  const setCustomBackground = (dataUrl: string) => {
    setBackgroundState({ type: 'custom', url: dataUrl });
  };
  
  const setDefaultBackground = () => {
    setBackgroundState({ type: 'default' });
  };

  const value = { theme, setTheme, background, setCustomBackground, setDefaultBackground };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
