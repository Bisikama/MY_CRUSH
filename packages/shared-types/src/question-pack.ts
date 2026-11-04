import { z } from 'zod';

export const optionIdSchema = z.enum(['A', 'B', 'C', 'D']);
const text = z.string().trim().min(1).max(4000);
export const questionSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    type: z.literal('single_choice'),
    topic: text,
    difficulty: z.enum(['easy', 'medium', 'hard']),
    prompt: text,
    options: z.array(z.object({ id: optionIdSchema, text }).strict()).length(4),
    correctOptionId: optionIdSchema,
    explanation: text,
    hints: z.array(text).max(5).default([]),
    tags: z.array(z.string().max(80)).max(20).default([]),
    timeLimitSeconds: z.number().int().min(5).max(120).default(20),
  })
  .strict();

export const questionPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    packId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
    title: z.string().trim().min(1).max(160),
    language: z.string().trim().min(2).max(20),
    category: z.string().trim().min(1).max(80),
    questions: z.array(questionSchema).min(1).max(500),
  })
  .strict()
  .superRefine((pack, ctx) => {
    const ids = new Set<string>();
    const prompts = new Set<string>();
    const normalize = (value: string) =>
      value.normalize('NFKC').toLocaleLowerCase('vi').replace(/\s+/g, ' ').trim();
    for (const [i, question] of pack.questions.entries()) {
      const issue = (path: (string | number)[], message: string) =>
        ctx.addIssue({ code: 'custom', path: ['questions', i, ...path], message });
      if (ids.has(question.id)) issue(['id'], 'Question ID bị trùng');
      ids.add(question.id);
      if (prompts.has(normalize(question.prompt))) issue(['prompt'], 'Nội dung câu hỏi bị trùng');
      prompts.add(normalize(question.prompt));
      if (new Set(question.options.map((o) => o.id)).size !== 4)
        issue(['options'], 'Cần đủ bốn lựa chọn A–D, không trùng ID');
      if (new Set(question.options.map((o) => normalize(o.text))).size !== 4)
        issue(['options'], 'Nội dung lựa chọn bị trùng');
      if (!question.options.some((o) => o.id === question.correctOptionId))
        issue(['correctOptionId'], 'Đáp án không tồn tại');
    }
  });

export type Question = z.infer<typeof questionSchema>;
export type QuestionPack = z.infer<typeof questionPackSchema>;
export type OptionId = z.infer<typeof optionIdSchema>;
export type PublicQuestion = Pick<Question, 'id' | 'prompt' | 'options' | 'topic' | 'difficulty'>;
