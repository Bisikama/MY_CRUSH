import type { LocaleCode } from '../config';
import type { TranslationDictionary } from '../types';
import { enDictionary } from './en';
import { viDictionary } from './vi';

export const LOCALE_DICTIONARIES: Readonly<Record<LocaleCode, TranslationDictionary>> = {
  vi: viDictionary,
  en: enDictionary,
};
