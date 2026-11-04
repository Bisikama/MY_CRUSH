import { describe, expect, it } from 'vitest';
import starter from '../../../examples/question-pack.json';
import { questionPackSchema } from './question-pack';
import { gameActionSchema } from './index';

describe('QuestionPack import validation', () => {
  it('accepts the starter and supplies defaults', () => {
    expect(questionPackSchema.parse(starter).questions[0]!.hints).toEqual([]);
  });
  it('rejects duplicate question ids', () => {
    const pack = structuredClone(starter);
    pack.questions[1]!.id = pack.questions[0]!.id;
    expect(questionPackSchema.safeParse(pack).success).toBe(false);
  });
  it('rejects repeated prompts including normalized whitespace', () => {
    const pack = structuredClone(starter);
    pack.questions[1]!.prompt = ` ${pack.questions[0]!.prompt.toUpperCase()} `;
    expect(questionPackSchema.safeParse(pack).success).toBe(false);
  });
  it('rejects repeated option IDs', () => {
    const pack = structuredClone(starter);
    pack.questions[0]!.options[1]!.id = 'A';
    expect(questionPackSchema.safeParse(pack).success).toBe(false);
  });
  it('rejects repeated option text', () => {
    const pack = structuredClone(starter);
    pack.questions[0]!.options[1]!.text = pack.questions[0]!.options[0]!.text;
    expect(questionPackSchema.safeParse(pack).success).toBe(false);
  });
  it('rejects empty packs and unknown versions', () => {
    expect(questionPackSchema.safeParse({ ...starter, questions: [] }).success).toBe(false);
    expect(questionPackSchema.safeParse({ ...starter, schemaVersion: 2 }).success).toBe(false);
  });
  it('rejects invalid answer IDs and excessive timer values', () => {
    const pack = structuredClone(starter);
    Object.assign(pack.questions[0]!, { correctOptionId: 'Z', timeLimitSeconds: 100000 });
    expect(questionPackSchema.safeParse(pack).success).toBe(false);
  });
  it('strictly rejects a client claiming its score', () => {
    expect(
      gameActionSchema.safeParse({
        code: 'ABC234',
        sessionId: crypto.randomUUID(),
        roundId: '1',
        actionId: crypto.randomUUID(),
        playerId: crypto.randomUUID(),
        payload: { type: 'ANSWER', optionId: 'A', score: 999 },
      }).success,
    ).toBe(false);
  });
});
