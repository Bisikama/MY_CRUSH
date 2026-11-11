import { z } from 'zod';
import type { GameLayout, GameMode } from './index';

export const skillSchema = z.enum(['HINT', 'FIFTY_FIFTY', 'COVER', 'BLUR']);
export type QuizSkill = z.infer<typeof skillSchema>;
export const QUIZ_SKILLS = {
  HINT: { id: 'quiz-hint', name: 'Gợi ý', price: 10 },
  FIFTY_FIFTY: { id: 'quiz-fifty-fifty', name: '50/50', price: 15 },
  COVER: { id: 'quiz-cover', name: 'Che câu hỏi', price: 20 },
  BLUR: { id: 'quiz-blur', name: 'Làm mờ đáp án', price: 25 },
} as const;

export function allowedQuizSkills(mode: GameMode, layout: GameLayout): readonly QuizSkill[] {
  return mode === 'DUEL' && layout === 'MULTI_DEVICE'
    ? skillSchema.options
    : ['HINT', 'FIFTY_FIFTY'];
}
