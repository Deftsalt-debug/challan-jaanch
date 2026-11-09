'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'challan-jaanch:theme';
const THEME_EVENT = 'challan-jaanch:theme-change';

/** Used when a browser blocks storage entirely, so the control still works. */
let memoryTheme: ThemeChoice = 'system';

function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function getSnapshot(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeChoice(stored)) return stored;
  } catch {
    // Private modes and blocked site data fall back to the in-memory value.
  }
  return memoryTheme;
}

function getServerSnapshot(): ThemeChoice {
  return 'system';
}

/**
 * The theme choice, stored the same way as the language. 'system' removes the
 * data-theme attribute so the stylesheet's prefers-color-scheme rule decides.
 * The inline script in app/layout.tsx applies a stored choice before first
 * paint; this hook keeps it in step afterwards and across tabs.
 */
export function useTheme(): readonly [ThemeChoice, (next: ThemeChoice) => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    memoryTheme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Persistence is a convenience; the in-memory value still drives the UI.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return [theme, setTheme] as const;
}
