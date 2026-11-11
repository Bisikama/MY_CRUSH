import { z } from 'zod';

export const optionIdSchema = z.enum(['A', 'B', 'C', 'D']);
export const difficultySchema = z.enum(['easy', 'medium', 'hard']);
export const knowledgeTypeSchema = z.enum(['academic', 'practical', 'discovery']);
export type KnowledgeType = z.infer<typeof knowledgeTypeSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
const text = z.string().trim().min(1).max(4000);
const imagePath =
  '(?:[a-zA-Z0-9_-][a-zA-Z0-9_.~-]*/)*[a-zA-Z0-9_-][a-zA-Z0-9_.~-]*\\.(?:webp|jpe?g|png|avif)';
const imageSource = new RegExp(
  `^(?:/images/quiz/|https://[a-zA-Z0-9.-]+(?::[0-9]+)?/)${imagePath}(?![\\s\\S])`,
);
const questionImageSchema = z
  .object({
    src: z
      .string()
      .max(1024)
      .regex(imageSource, 'Dùng đường dẫn ảnh Quiz hoặc URL HTTPS tĩnh (WebP, JPEG, PNG, AVIF)')
      .refine((src) => {
        if (src.startsWith('/')) return true;
        try {
          return new URL(src).protocol === 'https:';
        } catch {
          return false;
        }
      }, 'Dùng đường dẫn ảnh Quiz hoặc URL HTTPS tĩnh (WebP, JPEG, PNG, AVIF)'),
    alt: z.string().trim().min(1).max(300),
  })
  .strict();
export type QuestionImage = z.infer<typeof questionImageSchema>;

export const questionSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    type: z.literal('single_choice'),
    topic: text,
    difficulty: difficultySchema,
    prompt: text,
    images: z.array(questionImageSchema).max(4).optional(),
    options: z.array(z.object({ id: optionIdSchema, text }).strict()).length(4),
    correctOptionId: optionIdSchema,
    explanation: text,
    hints: z.array(text).max(5).default([]),
    tags: z.array(z.string().max(80)).max(20).default([]),
    timeLimitSeconds: z.number().int().min(5).max(120).default(20),
  })
  .strict();

export const relatedKnowledgeSchema = z
  .object({
    category: z.string().trim().min(1).max(80),
    topic: z.string().trim().min(1).max(160),
    reason: text,
  })
  .strict();

export const questionPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    packId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
    title: z.string().trim().min(1).max(160),
    language: z.string().trim().min(2).max(20),
    knowledgeType: knowledgeTypeSchema.optional(),
    category: z.string().trim().min(1).max(80),
    relatedKnowledge: z.array(relatedKnowledgeSchema).max(12).optional(),
    questions: z.array(questionSchema).min(1).max(500),
  })
  .strict()
  .superRefine((pack, ctx) => {
    const ids = new Set<string>();
    const prompts = new Set<string>();
    for (const [i, question] of pack.questions.entries()) {
      const issue = (path: (string | number)[], message: string) =>
        ctx.addIssue({ code: 'custom', path: ['questions', i, ...path], message });
      if (ids.has(question.id)) issue(['id'], 'Question ID bị trùng');
      ids.add(question.id);
      const identity = questionContentKey(question.prompt, question.images);
      if (prompts.has(identity)) issue(['prompt'], 'Nội dung câu hỏi bị trùng');
      prompts.add(identity);
      if (new Set(question.options.map((o) => o.id)).size !== 4)
        issue(['options'], 'Cần đủ bốn lựa chọn A–D, không trùng ID');
      if (new Set(question.options.map((o) => knowledgeKey(o.text))).size !== 4)
        issue(['options'], 'Nội dung lựa chọn bị trùng');
      if (!question.options.some((o) => o.id === question.correctOptionId))
        issue(['correctOptionId'], 'Đáp án không tồn tại');
    }
  });

export type Question = z.infer<typeof questionSchema>;
export type QuestionPack = z.infer<typeof questionPackSchema>;
export type OptionId = z.infer<typeof optionIdSchema>;
export type PublicQuestion = Pick<
  Question,
  'id' | 'prompt' | 'options' | 'topic' | 'difficulty' | 'images'
>;

export const questionFilterSchema = z
  .object({
    category: z.string().trim().min(1).max(80).optional(),
    topic: text.optional(),
    difficulty: difficultySchema.optional(),
  })
  .strict();
export type QuestionFilter = z.infer<typeof questionFilterSchema>;

export const quizSelectionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CASUAL_RANDOM') }).strict(),
  z
    .object({
      type: z.literal('CASUAL_CUSTOM'),
      categories: z.array(z.string().trim().min(1).max(80)).max(50),
      topics: z
        .array(
          z
            .object({
              category: z.string().trim().min(1).max(80),
              topic: text,
            })
            .strict(),
        )
        .max(50),
      difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']),
    })
    .strict(),
  z
    .object({
      type: z.literal('STUDY'),
      packVersionId: z.string().min(1).max(100),
      filter: questionFilterSchema.optional(),
    })
    .strict(),
]);
export type QuizSelection = z.infer<typeof quizSelectionSchema>;
export type CasualCustomSelection = Extract<QuizSelection, { type: 'CASUAL_CUSTOM' }>;

export const casualCatalogSchema = z.array(
  z.object({
    category: z.string(),
    topic: z.string(),
    difficulty: difficultySchema,
    count: z.number().int().nonnegative(),
  }),
);
export type CasualCatalog = z.infer<typeof casualCatalogSchema>;

export function knowledgeKey(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

export function questionContentKey(prompt: string, images?: readonly QuestionImage[]) {
  const normalized = knowledgeKey(prompt);
  if (!images?.length) return normalized;
  const sources = [...new Set(images.map(({ src }) => src))].sort();
  return '\u0000quiz-images-v1\u0000' + JSON.stringify([normalized, sources]);
}

export function matchesQuestion(
  category: string,
  question: Pick<Question, 'topic' | 'difficulty'>,
  filter: QuestionFilter,
) {
  return (
    (!filter.category || knowledgeKey(category) === knowledgeKey(filter.category)) &&
    (!filter.topic || knowledgeKey(question.topic) === knowledgeKey(filter.topic)) &&
    (!filter.difficulty || question.difficulty === filter.difficulty)
  );
}

export function summarizePack(id: string, pack: QuestionPack, trusted: boolean) {
  const groups = new Map<string, { topic: string; difficulty: Difficulty; count: number }>();
  for (const { topic, difficulty } of pack.questions) {
    const key = JSON.stringify([knowledgeKey(topic), difficulty]);
    const group = groups.get(key);
    if (group) group.count++;
    else groups.set(key, { topic, difficulty, count: 1 });
  }
  return {
    id,
    packId: pack.packId,
    title: pack.title,
    trusted,
    category: pack.category,
    ...(pack.knowledgeType && { knowledgeType: pack.knowledgeType }),
    questionCount: pack.questions.length,
    relatedKnowledge: pack.relatedKnowledge ?? [],
    groups: [...groups.values()],
  };
}
