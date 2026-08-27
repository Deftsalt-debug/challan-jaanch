'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { LANGUAGE_STORAGE_KEY, Language, isLanguage } from './i18n';

/**
 * The language choice is external state: it outlives a render, it is shared by
 * every open tab, and the server cannot know it. `useSyncExternalStore` is the
 * right primitive for that — it hydrates from a known server value and then
 * re-reads the real one, instead of flashing English and correcting itself
 * inside an effect.
 */
const LANGUAGE_EVENT = 'challan-jaanch:language-change';

/** Used when a browser blocks storage entirely, so the toggle still works. */
let memoryLanguage: Language = 'en';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(LANGUAGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(LANGUAGE_EVENT, onChange);
  };
}

function getSnapshot(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Private modes and blocked site data fall back to the in-memory value.
  }
  return memoryLanguage;
}

function getServerSnapshot(): Language {
  return 'en';
}

export function useLanguage(): readonly [Language, () => void] {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Language = language === 'en' ? 'hi' : 'en';
    memoryLanguage = next;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Persistence is a convenience; the in-memory value still drives the UI.
    }
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  }, [language]);

  return [language, toggle] as const;
}
