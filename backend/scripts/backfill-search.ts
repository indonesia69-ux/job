import { PrismaClient } from '@prisma/client';
import { buildSearchBlob } from '../src/lib/helpers';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all candidates to backfill searchBlob...');
  const candidates = await prisma.candidate.findMany();
  
  console.log(`Found ${candidates.length} candidates.`);
  
  let updatedCount = 0;
  for (const candidate of candidates) {
    const searchBlob = buildSearchBlob(candidate);
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { searchBlob }
    });
    updatedCount++;
    if (updatedCount % 100 === 0) {
      console.log(`Updated ${updatedCount} candidates...`);
    }
  }
  
  console.log(`Successfully backfilled searchBlob for ${updatedCount} candidates.`);
}

main()
  .catch((e) => {
    console.error('Error backfilling searchBlob:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
