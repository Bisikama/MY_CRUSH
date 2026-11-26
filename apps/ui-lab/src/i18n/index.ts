export {
  DEFAULT_LOCALE,
  getLocaleMeta,
  isLocale,
  LOCALE_LIST,
  LOCALE_META,
  SUPPORTED_LOCALES,
  type LocaleCode,
  type LocaleMeta,
} from './config';
export {
  configureLocaleStorage,
  createLocalStorageAdapter,
  hydrateLocale,
  LOCALE_STORAGE_KEY,
  memoryLocaleStorageAdapter,
  useI18nStore,
  type I18nState,
  type LocaleStorageAdapter,
} from './store';
export {
  createTranslator,
  formatLocaleDateTime,
  formatLocaleNumber,
  interpolate,
  translate,
} from './translator';
export type { TranslationDictionary, TranslationKey, TranslationParams } from './types';
export { I18nHtmlSync, useI18n, type UseI18nResult } from './use-i18n';
