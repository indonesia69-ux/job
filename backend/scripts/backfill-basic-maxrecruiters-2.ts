import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HOSPITAL_IDS = [
  'b1c956e3-3639-4d33-a132-bf3467d5dabb', // Apollo Hospitals
  'c35f0c64-7db3-479a-b04e-06f0c2edadd6', // Demo Multispeciality Hospital
] as const;

async function main() {
  const before = await prisma.hospital.findMany({
    where: { id: { in: [...HOSPITAL_IDS] } },
    select: { id: true, name: true, onboardingPlan: true, maxRecruiters: true },
  });

  await prisma.hospital.updateMany({
    where: { id: { in: [...HOSPITAL_IDS] } },
    data: { maxRecruiters: 2 },
  });

  const after = await prisma.hospital.findMany({
    where: { id: { in: [...HOSPITAL_IDS] } },
    select: { id: true, name: true, onboardingPlan: true, maxRecruiters: true },
  });

  console.log(JSON.stringify({ before, after }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

