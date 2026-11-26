import type { TranslationDictionary } from '../../types';

export const enPacks: TranslationDictionary['packs'] = {
  eyebrow: 'YOUR LIBRARY',
  titleLine1: 'Bring your own',
  titleLine2Prefix: 'questions ',
  titleLine2Em: 'into the game.',
  lead: 'Paste a schemaVersion 1 JSON question pack, validate and preview it before saving.',
  jsonLabel: 'JSON content',
  validateButton: 'Validate & preview',
  guestRequiredError: 'Please create a guest profile on the Play page first.',
  invalidJsonError: 'Invalid JSON',
  savedMessage: 'Question pack version saved. You can now pick it when creating a room.',
  saveFailedError: 'Could not save pack',
  previewSummary: '{count} questions · {language} · {category} · {knowledgeType}',
  relatedKnowledgeTitle: 'Related knowledge',
  answerPrefix: 'Answer {optionId}:',
  questionMeta: '{topic} · {difficulty} · {hintsCount} hints',
  hintsRecommendation: 'Recommended authoring standard is 3–5 hints per question.',
  confirmNote:
    'Confirm you have reviewed the content. Saving creates a new version; ongoing matches keep their existing snapshot.',
  saveButton: 'Confirm & save pack',
};
