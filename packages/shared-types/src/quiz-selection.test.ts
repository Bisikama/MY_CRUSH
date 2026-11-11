import { describe, expect, it } from 'vitest';
import { createRoomSchema } from './index';

describe('Quiz room selection contract', () => {
  const base = { mode: 'SOLO', layout: 'MULTI_DEVICE' };
  it('accepts legacy study and each new selection', () => {
    for (const selection of [
      { type: 'CASUAL_RANDOM' },
      { type: 'CASUAL_CUSTOM', categories: [], topics: [], difficulty: 'mixed' },
      { type: 'STUDY', packVersionId: 'pack', filter: { difficulty: 'hard' } },
    ])
      expect(createRoomSchema.safeParse({ ...base, selection }).success).toBe(true);
    expect(createRoomSchema.safeParse({ ...base, packVersionId: 'pack' }).success).toBe(true);
  });
  it('rejects ambiguous selection, injected questions and random filters', () => {
    for (const input of [
      base,
      { ...base, selection: { type: 'CASUAL_RANDOM' }, packVersionId: 'pack' },
      { ...base, selection: { type: 'CASUAL_RANDOM' }, filter: {} },
      { ...base, selection: { type: 'CASUAL_RANDOM', difficulty: 'easy' } },
      { ...base, selection: { type: 'CASUAL_RANDOM' }, questions: [] },
    ])
      expect(createRoomSchema.safeParse(input).success).toBe(false);
  });
  it('limits each custom multi-selection to 50 entries', () => {
    const selection = { type: 'CASUAL_CUSTOM', categories: [], topics: [], difficulty: 'mixed' };
    expect(
      createRoomSchema.safeParse({
        ...base,
        selection: { ...selection, categories: Array(51).fill('category') },
      }).success,
    ).toBe(false);
    expect(
      createRoomSchema.safeParse({
        ...base,
        selection: { ...selection, topics: Array(51).fill({ category: 'one', topic: 'two' }) },
      }).success,
    ).toBe(false);
  });
});
