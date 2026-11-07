import { PrismaClient } from '@prisma/client';

const [address, role, ...extra] = process.argv.slice(2);
if (!address || (role !== 'ADMIN' && role !== 'PLAYER') || extra.length)
  throw new Error('Cách dùng: pnpm auth:role <email> <ADMIN|PLAYER>');
const db = new PrismaClient();
void db.account
  .updateMany({
    where: { email: address.trim().toLowerCase() },
    data: { role },
  })
  .then(({ count }) => {
    if (count !== 1) throw new Error('Không tìm thấy tài khoản đã xác minh.');
    console.log('Đã cập nhật role.');
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Không cập nhật được role.');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
