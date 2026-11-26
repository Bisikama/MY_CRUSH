export const SUPPORTED_LOCALES = ['vi', 'en'] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

export interface LocaleMeta {
  code: LocaleCode;
  /** BCP 47 tag used by Intl.NumberFormat, Intl.DateTimeFormat and localeCompare. */
  bcp47: string;
  /** Short code displayed on compact switchers (e.g. VI, EN). */
  shortLabel: string;
  /** Native display name shown in language menus (e.g. Tiếng Việt, English). */
  nativeName: string;
  /** Text direction for future RTL language extensibility. */
  dir: 'ltr' | 'rtl';
}

export const DEFAULT_LOCALE: LocaleCode = 'vi';

export const LOCALE_META: Readonly<Record<LocaleCode, LocaleMeta>> = {
  vi: {
    code: 'vi',
    bcp47: 'vi-VN',
    shortLabel: 'VI',
    nativeName: 'Tiếng Việt',
    dir: 'ltr',
  },
  en: {
    code: 'en',
    bcp47: 'en-US',
    shortLabel: 'EN',
    nativeName: 'English',
    dir: 'ltr',
  },
};

export const LOCALE_LIST: readonly LocaleMeta[] = SUPPORTED_LOCALES.map(
  (code) => LOCALE_META[code],
);

export function isLocale(value: unknown): value is LocaleCode {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function getLocaleMeta(locale: LocaleCode): LocaleMeta {
  return LOCALE_META[locale];
}
