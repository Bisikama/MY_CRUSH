import { create } from 'zustand';
import { DEFAULT_LOCALE, isLocale, type LocaleCode } from './config';

/**
 * Storage adapter abstraction so UI Lab stays strictly in-memory (no localStorage side effects)
 * while apps/web can plug in `createLocalStorageAdapter()` on migration without changing callers.
 */
export interface LocaleStorageAdapter {
  read: () => LocaleCode | null;
  write: (locale: LocaleCode) => void;
}

export const LOCALE_STORAGE_KEY = 'duoquest.locale';

export const memoryLocaleStorageAdapter: LocaleStorageAdapter = {
  read: () => null,
  write: () => {},
};

export function createLocalStorageAdapter(
  storageKey: string = LOCALE_STORAGE_KEY,
): LocaleStorageAdapter {
  return {
    read: () => {
      if (typeof window === 'undefined') return null;
      try {
        const value = window.localStorage.getItem(storageKey);
        return isLocale(value) ? value : null;
      } catch {
        return null;
      }
    },
    write: (locale) => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(storageKey, locale);
      } catch {
        // Ignore storage quota or private mode restrictions.
      }
    },
  };
}

let activeStorageAdapter: LocaleStorageAdapter = memoryLocaleStorageAdapter;

export function configureLocaleStorage(adapter: LocaleStorageAdapter): void {
  activeStorageAdapter = adapter;
}

export interface I18nState {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  resetLocale: () => void;
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => {
    if (!isLocale(locale)) return;
    set({ locale });
    activeStorageAdapter.write(locale);
  },
  resetLocale: () => {
    set({ locale: DEFAULT_LOCALE });
    activeStorageAdapter.write(DEFAULT_LOCALE);
  },
}));

/** Hydrate persisted locale on client mount (no-op when using memory adapter in UI Lab). */
export function hydrateLocale(): void {
  const stored = activeStorageAdapter.read();
  if (stored && stored !== useI18nStore.getState().locale) {
    useI18nStore.setState({ locale: stored });
  }
}
