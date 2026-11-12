import {
  knowledgeKey,
  matchesQuestion,
  questionPackSchema,
  summarizePack,
  type CasualCatalog,
  type CreateRoomInput,
  type Question,
  type QuestionPack,
  type RoomView,
} from '@duoquest/shared-types';
import discovery from './question-pack.json';
import academic from './question-pack-learning.json';
import practical from './question-pack-smart-shopping.json';

export const sampleImage = '/images/quiz/lab-sample.jpg';
const starter = questionPackSchema.parse(discovery);
export const sceneQuestions: Question[] = starter.questions.map((question, index) =>
  index === 0
    ? {
        ...question,
        images: [{ src: sampleImage, alt: 'Minh họa Quiz Battle' }],
        hints: ['Thành phố này nằm ở miền Bắc.', 'Hồ Hoàn Kiếm nằm ở đây.'],
      }
    : question,
);

export const imageSceneQuestion: Question = {
  ...sceneQuestions[0]!,
  id: 'lab-count-question-cards',
  topic: 'Quan sát',
  prompt: 'Trên sân khấu trong ảnh có bao nhiêu thẻ dấu hỏi?',
  options: [
    { id: 'A', text: '2 thẻ' },
    { id: 'B', text: '3 thẻ' },
    { id: 'C', text: '4 thẻ' },
    { id: 'D', text: '5 thẻ' },
  ],
  correctOptionId: 'C',
  explanation: 'Có bốn thẻ dấu hỏi xếp cạnh nhau ở giữa sân khấu.',
  hints: ['Đếm các thẻ màu vàng ở giữa sân khấu.'],
};

export interface LabPack {
  id: string;
  pack: QuestionPack;
  trusted: boolean;
}

export function initialPacks(): LabPack[] {
  return [
    { ...starter, questions: sceneQuestions },
    questionPackSchema.parse(academic),
    questionPackSchema.parse(practical),
  ].map((pack) => ({ id: pack.packId, pack, trusted: true }));
}

const isCasual = ({ trusted, pack }: LabPack) =>
  trusted && (pack.knowledgeType === 'practical' || pack.knowledgeType === 'discovery');

export function labCatalog(packs: LabPack[]): CasualCatalog {
  return packs.filter(isCasual).flatMap(({ id, pack, trusted }) =>
    summarizePack(id, pack, trusted).groups.map((group) => ({
      ...group,
      category: pack.category,
    })),
  );
}

export function selectLabQuestions(packs: LabPack[], input: CreateRoomInput) {
  const selection = input.selection ?? {
    type: 'STUDY' as const,
    packVersionId: input.packVersionId,
    filter: input.filter ?? {},
  };
  let setup: NonNullable<RoomView['setup']>;
  let questions: Question[];
  let trusted = true;
  if (selection.type === 'STUDY') {
    const source = packs.find(({ id }) => id === selection.packVersionId);
    if (!source) throw new Error('Không tìm thấy bộ đề mẫu.');
    const filter = selection.filter ?? {};
    questions = source.pack.questions
      .filter((question) => matchesQuestion(source.pack.category, question, filter))
      .slice(0, input.mode === 'COOP' ? 20 : 10);
    trusted = source.trusted;
    setup = {
      title: source.pack.title,
      category: source.pack.category,
      filter,
      questionCount: questions.length,
      ...(input.selection && { selection: input.selection }),
    };
  } else {
    questions = packs
      .filter(isCasual)
      .flatMap(({ pack }) => {
        if (selection.type === 'CASUAL_RANDOM') return pack.questions;
        const category = knowledgeKey(pack.category);
        const categories = selection.categories.map(knowledgeKey);
        const topics = selection.topics.filter(
          (topic) => knowledgeKey(topic.category) === category,
        );
        return pack.questions.filter(
          (question) =>
            (!categories.length || categories.includes(category)) &&
            (!selection.topics.length ||
              topics.some((topic) => knowledgeKey(topic.topic) === knowledgeKey(question.topic))) &&
            (selection.difficulty === 'mixed' || question.difficulty === selection.difficulty),
        );
      })
      .slice(0, 20);
    setup = {
      title: 'Đố vui',
      category: 'Tổng hợp',
      filter: {},
      selection,
      questionCount: questions.length,
    };
  }
  if (!questions.length) throw new Error('Không có câu hỏi phù hợp với bộ lọc.');
  return { questions, setup, trusted };
}
