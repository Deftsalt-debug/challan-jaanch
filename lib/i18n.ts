/**
 * Bilingual support for the citizen journey.
 *
 * Two shapes are used deliberately:
 *
 * - `t(language, english, hindi)` for interface copy written inline in JSX. The
 *   English string stays readable at the call site, so a reviewer can see what a
 *   screen says without following an indirection into a key table.
 * - `Bilingual` values for content produced by the rule layer (`lib/cases.ts`,
 *   `lib/scam-shield.ts`). Rules must be able to return a finished sentence in
 *   either language without importing interface code.
 *
 * There is no runtime translation service. Every Hindi string in this project is
 * written and reviewed as source, so a language switch can never leave a citizen
 * on a screen that silently falls back to English.
 */

export type Language = 'en' | 'hi';

export interface Bilingual {
  en: string;
  hi: string;
}

/** Interface copy helper. Prefer this inside components. */
export function t(language: Language, english: string, hindi: string): string {
  return language === 'hi' ? hindi : english;
}

/** Resolves a rule-layer `Bilingual` value for the active language. */
export function pick(language: Language, value: Bilingual): string {
  return value[language];
}

/** Builds a `Bilingual` value. Keeps rule tables compact and type-checked. */
export function bi(en: string, hi: string): Bilingual {
  return { en, hi };
}

export const LANGUAGE_STORAGE_KEY = 'challan-jaanch:language';

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'hi';
}

/**
 * BCP-47 tags used for `<html lang>`, speech synthesis and date formatting.
 * `en-IN` rather than `en` because the numbering, date order and spoken accent
 * should stay Indian in both languages.
 */
export const localeTag: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
};
