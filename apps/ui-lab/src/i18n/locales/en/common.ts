import type { TranslationDictionary } from '../../types';

export const enCommon: TranslationDictionary['common'] = {
  language: {
    label: 'Language',
    switcherAria: 'Choose display language',
    sectionTitle: 'Display language',
    sectionPill: 'Interface preference',
    sectionDesc:
      'Choose the language for the DuoQuest interface. Question pack content remains in each pack’s original language.',
    activeTag: 'Active',
  },
  difficulty: {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    mixed: 'Mixed',
    any: 'Any difficulty',
  },
  knowledgeType: {
    all: 'All',
    academic: 'Academic study',
    practical: 'Everyday life',
    discovery: 'Fun discovery',
    unclassified: 'Unclassified',
  },
  skills: {
    HINT: 'Hint',
    FIFTY_FIFTY: '50/50',
    COVER: 'Cover Question',
    BLUR: 'Blur Answers',
  },
  actions: {
    close: 'Close',
    processing: 'Processing…',
    loading: 'Loading…',
  },
  errors: {
    generic: 'Something went wrong',
  },
};
