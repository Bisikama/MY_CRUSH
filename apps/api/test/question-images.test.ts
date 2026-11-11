import { describe, expect, it } from 'vitest';
import starter from '../../../examples/question-pack.json';
import { questionPackSchema } from '@duoquest/shared-types';
import { parseQuestionPack } from '../src/modules/question-packs/parse-question-pack';
import { questionKey } from '../src/modules/question-packs/quiz-preparation.service';

const local = { src: '/images/quiz/food/a.webp', alt: 'Bát mì sợi vàng' };
const remote = { src: 'https://cdn.example.test/food/b.avif', alt: 'Đĩa mì và rau' };
const first = starter.questions[0]!;
const packWith = (images: { src: string; alt: string }[]) => ({
  ...starter,
  questions: [{ ...first, images }],
});

describe('Question image references', () => {
  it('accepts old packs and one to four image references', () => {
    expect(parseQuestionPack(starter).questions[0]?.images).toBeUndefined();
    expect(parseQuestionPack(packWith([local])).questions[0]?.images).toEqual([local]);
    expect(parseQuestionPack(packWith(Array(4).fill(local))).questions[0]?.images).toHaveLength(4);
    expect(() => parseQuestionPack(packWith(Array(5).fill(local)))).toThrow();
  });

  it.each([
    'data:image/png;base64,AA',
    'http://cdn.example.test/a.png',
    '//cdn.example.test/a.png',
    '/images/quiz/../a.png',
    '/images/quiz/%2e%2e/a.png',
    '/images/quiz/a.svg',
    'https://user:password@cdn.example.test/a.png',
    'https://cdn.example.test/a.png?token=test',
    'https://cdn.example.test/a.png#image',
  ])('rejects invalid references: %s', (src) => {
    expect(questionPackSchema.safeParse(packWith([{ ...local, src }])).success).toBe(false);
  });

  it('checks exact CDN origins at import', () => {
    expect(() => parseQuestionPack(packWith([remote]), '')).toThrow('QUIZ_IMAGE_CDN_ORIGINS');
    expect(() => parseQuestionPack(packWith([remote]), 'https://example.test')).toThrow();
    expect(
      parseQuestionPack(packWith([local, remote]), 'https://cdn.example.test').questions[0]?.images,
    ).toEqual([local, remote]);
  });

  it('distinguishes image sets and preserves identity when order or alt changes', () => {
    const question = { ...first, images: [local, remote] };
    const another = { ...question, id: 'other', images: [remote] };
    const reorder = { ...another, images: [remote, { ...local, alt: 'Mô tả mới' }] };
    expect(
      questionPackSchema.safeParse({ ...starter, questions: [question, another] }).success,
    ).toBe(true);
    expect(
      questionPackSchema.safeParse({ ...starter, questions: [question, reorder] }).success,
    ).toBe(false);
    expect(questionKey(first.prompt, question.images)).toBe(
      questionKey(first.prompt, reorder.images),
    );
    expect(questionKey(first.prompt, question.images)).not.toBe(
      questionKey(first.prompt, another.images),
    );
    expect(questionKey(first.prompt, [])).toBe(questionKey(first.prompt));
  });
});
