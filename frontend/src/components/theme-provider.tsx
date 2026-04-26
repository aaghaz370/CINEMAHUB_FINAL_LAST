'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';

export type ThemeId = 
  | 'soft-frost' | 'champagne-gold' | 'arctic-mint'
  | 'midnight-indigo' | 'cyber-rose' | 'forest-stealth';

export type Mode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeId;
  mode: Mode;
  setTheme: (t: ThemeId) => void;
  setMode: (m: Mode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'midnight-indigo',
  mode: 'dark',
  setTheme: () => {},
  setMode: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

const applyToDom = (theme: ThemeId, mode: Mode) => {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('midnight-indigo');
  const [mode, setModeState] = useState<Mode>('dark');
  
  // Use refs so setTheme/setMode always have latest values (no stale closure)
  const themeRef = useRef(theme);
  const modeRef = useRef(mode);
  themeRef.current = theme;
  modeRef.current = mode;

  useEffect(() => {
    const savedTheme = (localStorage.getItem('ch-theme') as ThemeId) || 'midnight-indigo';
    const savedMode = (localStorage.getItem('ch-mode') as Mode) || 'dark';
    setThemeState(savedTheme);
    setModeState(savedMode);
    applyToDom(savedTheme, savedMode);
  }, []);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem('ch-theme', t);
    applyToDom(t, modeRef.current);
  };

  const setMode = (m: Mode) => {
    setModeState(m);
    localStorage.setItem('ch-mode', m);
    applyToDom(themeRef.current, m);
  };

  // Render children always — blocking script in <head> already prevents flash
  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
