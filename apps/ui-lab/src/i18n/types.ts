import type { viDictionary } from './locales/vi';

/**
 * Recursively maps a dictionary shape so every leaf is a plain `string`
 * (preventing literal string types from blocking translations in other locales).
 */
type DeepStringRecord<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>;
};

export type TranslationDictionary = DeepStringRecord<typeof viDictionary>;

type DotJoin<Prefix extends string, Key extends string> = `${Prefix}.${Key}`;

type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : DotJoin<K, LeafPaths<T[K]>>;
}[keyof T & string];

export type TranslationKey = LeafPaths<TranslationDictionary>;

export type TranslationParams = Readonly<Record<string, string | number>>;
