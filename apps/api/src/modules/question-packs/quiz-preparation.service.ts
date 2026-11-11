import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { assertDomain } from '@duoquest/game-core';
import {
  knowledgeKey,
  questionContentKey,
  matchesQuestion,
  type CasualCatalog,
  type GameMode,
  type Question,
  type QuizSelection,
} from '@duoquest/shared-types';
import { PlatformStore, type SelectionSnapshot } from '../persistence/store';

export interface PreparedQuiz {
  questions: Question[];
  packVersionId: string | null;
  snapshot: SelectionSnapshot;
  title: string;
  category: string;
}
interface Candidate {
  question: Question;
  source: SelectionSnapshot['sources'][number];
  category: string;
}

export function questionKey(prompt: string, images?: Question['images']) {
  return createHash('sha256').update(questionContentKey(prompt, images)).digest('hex');
}

function offer<T>(
  sample: T[],
  candidate: T,
  count: number,
  limit: number,
  random: (max: number) => number,
) {
  if (sample.length < limit) sample.push(candidate);
  else {
    const index = random(count);
    if (index < limit) sample[index] = candidate;
  }
}
export function sampleQuestions<T>(values: Iterable<T>, limit: number, random = randomInt): T[] {
  const sample: T[] = [];
  let count = 0;
  for (const value of values) offer(sample, value, ++count, limit, random);
  return shuffle(sample, random);
}
function shuffle<T>(sample: T[], random: (max: number) => number) {
  for (let index = sample.length - 1; index > 0; index--) {
    const other = random(index + 1);
    [sample[index], sample[other]] = [sample[other]!, sample[index]!];
  }
  return sample;
}

@Injectable()
export class QuizPreparationService {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}

  private async *candidateBatches(selection: QuizSelection) {
    const packs = await this.store.latestTrustedPacks();
    const seen = new Set<string>();
    const categories = new Set(
      selection.type === 'CASUAL_CUSTOM' ? selection.categories.map(knowledgeKey) : [],
    );
    const topics = new Set(
      selection.type === 'CASUAL_CUSTOM'
        ? selection.topics.map(({ category, topic }) =>
            JSON.stringify([knowledgeKey(category), knowledgeKey(topic)]),
          )
        : [],
    );
    for (let offset = 0; offset < packs.length; offset += 25) {
      const batch: Candidate[] = [];
      const records = await this.store.readPacks(
        packs.slice(offset, offset + 25).map((pack) => pack.id),
      );
      for (const pack of records) {
        if (!pack.trusted || !['discovery', 'practical'].includes(pack.content.knowledgeType ?? ''))
          continue;
        const category = pack.content.category;
        for (const question of pack.content.questions) {
          if (selection.type === 'CASUAL_CUSTOM') {
            if (categories.size && !categories.has(knowledgeKey(category))) continue;
            if (
              topics.size &&
              !topics.has(JSON.stringify([knowledgeKey(category), knowledgeKey(question.topic)]))
            )
              continue;
            if (selection.difficulty !== 'mixed' && selection.difficulty !== question.difficulty)
              continue;
          }
          const key = questionKey(question.prompt, question.images);
          if (seen.has(key)) continue;
          seen.add(key);
          batch.push({
            category,
            question,
            source: { packVersionId: pack.id, questionId: question.id, questionKey: key },
          });
        }
      }
      yield batch;
    }
  }

  async catalog(): Promise<CasualCatalog> {
    const groups = new Map<string, CasualCatalog[number]>();
    for await (const batch of this.candidateBatches({ type: 'CASUAL_RANDOM' })) {
      for (const { category, question } of batch) {
        const key = JSON.stringify([
          knowledgeKey(category),
          knowledgeKey(question.topic),
          question.difficulty,
        ]);
        const group = groups.get(key);
        if (group) group.count++;
        else
          groups.set(key, {
            category,
            topic: question.topic,
            difficulty: question.difficulty,
            count: 1,
          });
      }
    }
    return [...groups.values()].sort(
      (a, b) =>
        a.category.localeCompare(b.category, 'vi') ||
        a.topic.localeCompare(b.topic, 'vi') ||
        a.difficulty.localeCompare(b.difficulty),
    );
  }

  async prepare(
    hostPlayerId: string,
    mode: GameMode,
    selection: QuizSelection,
  ): Promise<PreparedQuiz> {
    if (selection.type === 'CASUAL_CUSTOM')
      selection = {
        ...selection,
        categories: [
          ...new Map(selection.categories.map((value) => [knowledgeKey(value), value])).values(),
        ],
        topics: [
          ...new Map(
            selection.topics.map((value) => [
              JSON.stringify([knowledgeKey(value.category), knowledgeKey(value.topic)]),
              value,
            ]),
          ).values(),
        ],
      };
    if (selection.type === 'STUDY') {
      const pack = await this.store.getPack(selection.packVersionId, hostPlayerId);
      assertDomain(pack, 'NOT_FOUND', 'Không có quyền dùng bộ đề này');
      const questions = sampleQuestions(
        pack.content.questions.filter((question) =>
          matchesQuestion(pack.content.category, question, selection.filter ?? {}),
        ),
        mode === 'COOP' ? 20 : 10,
      );
      assertDomain(questions.length, 'INVALID_INPUT', 'Bộ đề không có câu phù hợp với bộ lọc');
      return {
        questions: structuredClone(questions),
        packVersionId: pack.id,
        title: pack.content.title,
        category: pack.content.category,
        snapshot: {
          selection,
          hostPlayerId,
          trusted: pack.trusted,
          resetKeys: [],
          sources: questions.map((question) => ({
            packVersionId: pack.id,
            questionId: question.id,
            questionKey: questionKey(question.prompt, question.images),
          })),
        },
      };
    }
    const all: Candidate[] = [];
    const fresh: Candidate[] = [];
    const keys: string[] = [];
    let total = 0;
    let freshTotal = 0;
    for await (const batch of this.candidateBatches(selection)) {
      for (let offset = 0; offset < batch.length; offset += 1000) {
        const part = batch.slice(offset, offset + 1000);
        const asked = new Set(
          await this.store.askedQuestionKeys(
            hostPlayerId,
            part.map((candidate) => candidate.source.questionKey),
          ),
        );
        for (const candidate of part) {
          keys.push(candidate.source.questionKey);
          offer(all, candidate, ++total, 20, randomInt);
          if (!asked.has(candidate.source.questionKey))
            offer(fresh, candidate, ++freshTotal, 20, randomInt);
        }
      }
    }
    assertDomain(
      total > 0,
      'INVALID_INPUT',
      'Chưa có câu đố vui phù hợp. Hãy thử lĩnh vực, chủ đề hoặc độ khó khác.',
    );
    const selected = shuffle(freshTotal ? fresh : all, randomInt);
    return {
      questions: selected.map(({ question }) => ({
        ...structuredClone(question),
        id: randomUUID(),
      })),
      packVersionId: null,
      title: selection.type === 'CASUAL_RANDOM' ? 'Đố vui ngẫu nhiên' : 'Đố vui tự chọn',
      category:
        selection.type === 'CASUAL_CUSTOM' && selection.categories.length
          ? selection.categories.join(', ')
          : 'Mọi lĩnh vực',
      snapshot: {
        selection,
        hostPlayerId,
        trusted: true,
        sources: selected.map(({ source }) => source),
        resetKeys: freshTotal ? [] : keys,
      },
    };
  }
}
