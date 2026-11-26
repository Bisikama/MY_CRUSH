import { DEFAULT_LOCALE, getLocaleMeta, type LocaleCode } from './config';
import { LOCALE_DICTIONARIES } from './locales';
import type { TranslationDictionary, TranslationKey, TranslationParams } from './types';

function resolvePath(dictionary: TranslationDictionary, key: string): string | undefined {
  const segments = key.split('.');
  let current: unknown = dictionary;
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' ? current : undefined;
}

export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token: string) => {
    if (!(token in params)) return match;
    return String(params[token]);
  });
}

export function translate(
  locale: LocaleCode,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const primary = resolvePath(LOCALE_DICTIONARIES[locale], key);
  const template = primary ?? resolvePath(LOCALE_DICTIONARIES[DEFAULT_LOCALE], key) ?? key;
  return interpolate(template, params);
}

export function createTranslator(locale: LocaleCode) {
  return (key: TranslationKey, params?: TranslationParams): string =>
    translate(locale, key, params);
}

export function formatLocaleNumber(
  locale: LocaleCode,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocaleMeta(locale).bcp47, options).format(value);
}

export function formatLocaleDateTime(
  locale: LocaleCode,
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(getLocaleMeta(locale).bcp47, options).format(date);
}
