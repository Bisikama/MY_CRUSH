import { writeFileSync } from 'node:fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { questionPackSchema } from '../packages/shared-types/src/question-pack';
writeFileSync(
  'examples/question-pack.schema.json',
  `${JSON.stringify(zodToJsonSchema(questionPackSchema, 'QuestionPack'), null, 2)}\n`,
);
