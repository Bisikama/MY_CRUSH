import { Prisma, PrismaClient } from '@prisma/client';
import { questionPackSchema } from '../packages/shared-types/src/question-pack';
import starter from '../examples/question-pack.json';

const prisma = new PrismaClient();
async function seed() {
  const content = questionPackSchema.parse(starter);
  await prisma.quizQuestionPack.upsert({
    where: { packId_version: { packId: content.packId, version: 1 } },
    create: {
      packId: content.packId,
      version: 1,
      title: content.title,
      trusted: true,
      content: content as unknown as Prisma.InputJsonValue,
    },
    update: {},
  });
  await prisma.itemDefinition.upsert({
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
  console.log('Seeded starter pack and cosmetic catalog.');
}
seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
