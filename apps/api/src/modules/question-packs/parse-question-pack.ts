import { z } from 'zod';
import { questionPackSchema } from '@duoquest/shared-types';

export function parseQuestionPack(
  input: unknown,
  cdnOrigins = process.env.QUIZ_IMAGE_CDN_ORIGINS ?? '',
) {
  const pack = questionPackSchema.parse(input);
  const allowed = new Set(
    cdnOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  const issues: z.ZodIssue[] = [];
  for (const [index, question] of pack.questions.entries()) {
    for (const [imageIndex, { src }] of (question.images ?? []).entries()) {
      if (src.startsWith('/') || allowed.has(new URL(src).origin)) continue;
      issues.push({
        code: 'custom',
        path: ['questions', index, 'images', imageIndex, 'src'],
        message: 'Origin ảnh chưa có trong QUIZ_IMAGE_CDN_ORIGINS',
      });
    }
  }
  if (issues.length) throw new z.ZodError(issues);
  return pack;
}
