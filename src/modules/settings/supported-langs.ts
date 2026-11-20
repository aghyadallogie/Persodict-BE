/**
 * Languages a user can pick, mirroring the list in the mobile app (`src/features/settings/langs.ts`).
 * English is not here on purpose: every phrase is always translated to English as well. Add a code
 * here when the app adds a language.
 *
 * Without this, a user could store any number of arbitrary strings, and every one of them would
 * become a separate DeepL request each time they translate.
 */
export const SUPPORTED_LANGS = [
  'de',
  'fr',
  'it',
  'es',
  'sv',
  'bg',
  'pt',
  'ru',
  'tr',
  'hu',
  'el',
  'pl',
  'nl',
  'ar',
  'ja',
] as const;
