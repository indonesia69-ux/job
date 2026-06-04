import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting cleanup of invalid recruiter accounts...");

  // Find all recruiters not linked to a hospital
  const invalidRecruiters = await prisma.user.findMany({
    where: {
      role: 'RECRUITER',
      hospitalId: null,
    }
  });

  if (invalidRecruiters.length === 0) {
    console.log("No invalid recruiters found. Database is clean.");
    return;
  }

  console.log(`Found ${invalidRecruiters.length} invalid recruiter accounts.`);
  
  for (const recruiter of invalidRecruiters) {
    console.log(`Deleting recruiter: ${recruiter.email} (ID: ${recruiter.id})`);
  }

  // Delete them
  const deleteResult = await prisma.user.deleteMany({
    where: {
      role: 'RECRUITER',
      hospitalId: null,
    }
  });

  console.log(`Successfully deleted ${deleteResult.count} invalid recruiter accounts.`);
}

main()
  .catch((e) => {
    console.error("Error during cleanup:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
