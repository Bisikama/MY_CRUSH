import type { KnowledgeType } from '@duoquest/shared-types';

export type KnowledgeTypeFilter = KnowledgeType | 'all' | 'unclassified';

export const knowledgeTypeLabels = {
  academic: 'Học chuyên đề',
  practical: 'Đời sống hữu ích',
  discovery: 'Khám phá thú vị',
  unclassified: 'Chưa phân loại',
} satisfies Record<KnowledgeType | 'unclassified', string>;
