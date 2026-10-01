import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { THEME_STORAGE_KEY } from '../utils/constants';

const ThemeContext = createContext(null);

function readInitialTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function themeReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE':
      return state === 'dark' ? 'light' : 'dark';
    case 'SET':
      return action.theme === 'light' ? 'light' : 'dark';
    default:
      return state;
  }
}

export function ThemeProvider({ children }) {
  const [theme, dispatch] = useReducer(themeReducer, undefined, readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111318' : '#F4F5F7');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // storage unavailable (private mode) — theme still applies for this session
    }
  }, [theme]);

  const toggleTheme = useCallback(() => dispatch({ type: 'TOGGLE' }), []);
  const setTheme = useCallback((t) => dispatch({ type: 'SET', theme: t }), []);

  const value = useMemo(() => ({ theme, isDark: theme === 'dark', toggleTheme, setTheme }), [theme, toggleTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
