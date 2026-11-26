import type { KnowledgeType } from '@duoquest/shared-types';
import { DEFAULT_LOCALE, translate, type LocaleCode } from '../i18n';

export type KnowledgeTypeFilter = KnowledgeType | 'all' | 'unclassified';

export const knowledgeTypeLabels = {
  academic: 'Học chuyên đề',
  practical: 'Đời sống hữu ích',
  discovery: 'Khám phá thú vị',
  unclassified: 'Chưa phân loại',
} satisfies Record<KnowledgeType | 'unclassified', string>;

export function getKnowledgeTypeLabel(
  type: KnowledgeType | 'unclassified' | undefined,
  locale: LocaleCode = DEFAULT_LOCALE,
): string {
  const key = type ?? 'unclassified';
  return translate(locale, `common.knowledgeType.${key}`);
}
