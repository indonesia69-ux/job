const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const hospitals = await prisma.hospital.findMany();
  for (const h of hospitals) {
    if (!h.phone || !h.email) {
      await prisma.hospital.update({
        where: { id: h.id },
        data: {
          phone: h.phone || h.submittedPhone || 'Not provided',
          email: h.email || h.submittedEmail || 'notprovided@example.com'
        }
      });
      console.log('Fixed hospital:', h.name);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
