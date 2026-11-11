import { readdir, readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { serialTransaction } from '../apps/api/src/common/transaction';
import { parseQuestionPack } from '../apps/api/src/modules/question-packs/parse-question-pack';
import starter from '../examples/question-pack.json';

const prisma = new PrismaClient();
const packDirectory = new URL('./question-packs/', import.meta.url);

async function seed() {
  const packs = new Map([
    [starter.packId, { content: parseQuestionPack(starter), file: 'examples/question-pack.json' }],
  ]);
  const files = (await readdir(packDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
  for (const name of files) {
    const file = `prisma/question-packs/${name}`;
    try {
      const raw = await readFile(new URL(encodeURIComponent(name), packDirectory), 'utf8');
      const content = parseQuestionPack(JSON.parse(raw.replace(/^\uFEFF/, '')));
      const duplicate = packs.get(content.packId);
      if (duplicate) throw new Error(`packId "${content.packId}" đã dùng trong ${duplicate.file}`);
      packs.set(content.packId, { content, file });
    } catch (error) {
      throw new Error(
        `Bộ đề không hợp lệ tại ${file}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const createdCount = await serialTransaction(prisma, async (tx) => {
    const existing = await tx.quizQuestionPack.findMany({
      where: { packId: { in: [...packs.keys()] } },
      select: { packId: true },
    });
    const existingIds = new Set(existing.map(({ packId }) => packId));
    const missing = [...packs.values()]
      .filter(({ content }) => !existingIds.has(content.packId))
      .map(({ content }) => ({
        packId: content.packId,
        version: 1,
        title: content.title,
        trusted: true,
        content,
      }));
    const result = await tx.quizQuestionPack.createMany({ data: missing, skipDuplicates: true });
    await tx.itemDefinition.upsert({
      where: { id: 'frame-mint' },
      create: {
        id: 'frame-mint',
        name: 'Khung bạc hà',
        kind: 'COSMETIC',
        slot: 'avatar-frame',
        price: 250,
        metadata: { color: '#b9efd7' },
      },
      update: {},
    });
    return result.count;
  });
  console.log(
    `Bộ đề: thêm ${createdCount}, bỏ qua ${packs.size - createdCount} đã có. Danh mục vật phẩm đã sẵn sàng.`,
  );
}
seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
