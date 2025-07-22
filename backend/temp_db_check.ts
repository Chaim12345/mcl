import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'boards';
    `;
    console.log('Boards table schema:', result);
  } catch (e) {
    console.error('Error fetching schema:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();