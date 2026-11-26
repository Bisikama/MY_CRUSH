'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { getLocaleMeta, LOCALE_LIST, type LocaleCode, type LocaleMeta } from './config';
import { hydrateLocale, useI18nStore } from './store';
import { formatLocaleDateTime, formatLocaleNumber, translate } from './translator';
import type { TranslationKey, TranslationParams } from './types';

export interface UseI18nResult {
  locale: LocaleCode;
  localeMeta: LocaleMeta;
  supportedLocales: readonly LocaleMeta[];
  setLocale: (locale: LocaleCode) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDateTime: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
}

export function useI18n(): UseI18nResult {
  const locale = useI18nStore((state) => state.locale);
  const setLocale = useI18nStore((state) => state.setLocale);

  const localeMeta = useMemo(() => getLocaleMeta(locale), [locale]);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(locale, key, params),
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      formatLocaleNumber(locale, value, options),
    [locale],
  );

  const formatDateTime = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions) =>
      formatLocaleDateTime(locale, date, options),
    [locale],
  );

  return {
    locale,
    localeMeta,
    supportedLocales: LOCALE_LIST,
    setLocale,
    t,
    formatNumber,
    formatDateTime,
  };
}

/** Keeps `<html lang>` and `<html dir>` synchronized with the active locale on the client. */
export function I18nHtmlSync() {
  const locale = useI18nStore((state) => state.locale);

  useEffect(() => {
    hydrateLocale();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const meta = getLocaleMeta(locale);
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
  }, [locale]);

  return null;
}
