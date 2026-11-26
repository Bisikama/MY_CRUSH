import { beforeEach, describe, expect, it } from 'vitest';
import {
  configureLocaleStorage,
  createTranslator,
  DEFAULT_LOCALE,
  formatLocaleNumber,
  hydrateLocale,
  interpolate,
  isLocale,
  memoryLocaleStorageAdapter,
  SUPPORTED_LOCALES,
  translate,
  useI18nStore,
  type LocaleCode,
  type LocaleStorageAdapter,
} from './index';
import { LOCALE_DICTIONARIES } from './locales';

function collectLeafEntries(obj: Record<string, unknown>, prefix = ''): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      entries.push([path, value]);
    } else if (typeof value === 'object' && value !== null) {
      entries.push(...collectLeafEntries(value as Record<string, unknown>, path));
    }
  }
  return entries.sort(([a], [b]) => a.localeCompare(b));
}

function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{([a-zA-Z0-9_]+)\}/g) ?? [];
  return [...new Set(matches)].sort();
}

describe('UI Lab i18n architecture', () => {
  beforeEach(() => {
    configureLocaleStorage(memoryLocaleStorageAdapter);
    useI18nStore.getState().resetLocale();
  });

  it('keeps 100% key parity, non-empty strings, and matching placeholders across all locales', () => {
    const baseEntries = collectLeafEntries(
      LOCALE_DICTIONARIES[DEFAULT_LOCALE] as unknown as Record<string, unknown>,
    );
    const baseMap = new Map(baseEntries);
    expect(baseEntries.length).toBeGreaterThan(100);

    for (const locale of SUPPORTED_LOCALES) {
      const entries = collectLeafEntries(
        LOCALE_DICTIONARIES[locale] as unknown as Record<string, unknown>,
      );
      expect(entries.map(([key]) => key)).toEqual(baseEntries.map(([key]) => key));

      for (const [key, value] of entries) {
        expect(value.trim().length, `Empty translation for ${locale}:${key}`).toBeGreaterThan(0);
        expect(extractPlaceholders(value), `Placeholder mismatch for ${locale}:${key}`).toEqual(
          extractPlaceholders(baseMap.get(key)!),
        );
      }
    }
  });

  it('interpolates parameters cleanly and leaves unknown placeholders intact', () => {
    expect(interpolate('Xin chào {name} ({count})', { name: 'Minh', count: 3 })).toBe(
      'Xin chào Minh (3)',
    );
    expect(interpolate('Code {code} {missing}', { code: 'LAB222' })).toBe('Code LAB222 {missing}');
  });

  it('translates keys for vi and en using both translate() and createTranslator()', () => {
    expect(translate('vi', 'nav.games')).toBe('Các trò chơi');
    expect(translate('en', 'nav.games')).toBe('Games');

    const tEn = createTranslator('en');
    expect(tEn('nav.leaveDialog.title', { code: 'LAB222' })).toBe('Confirm leaving room LAB222');
  });

  it('validates supported locales and formats numbers according to locale', () => {
    expect(isLocale('vi')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(null)).toBe(false);

    expect(formatLocaleNumber('en', 12500)).toBe('12,500');
    expect(formatLocaleNumber('vi', 12500)).toBe('12.500');
  });

  it('switches locale in Zustand store and supports pluggable storage adapters', () => {
    let persisted: LocaleCode | null = 'en';
    const customAdapter: LocaleStorageAdapter = {
      read: () => persisted,
      write: (next) => {
        persisted = next;
      },
    };

    configureLocaleStorage(customAdapter);
    hydrateLocale();
    expect(useI18nStore.getState().locale).toBe('en');

    useI18nStore.getState().setLocale('vi');
    expect(useI18nStore.getState().locale).toBe('vi');
    expect(persisted).toBe('vi');
  });
});
