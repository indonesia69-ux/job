import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting admin account seeding...");

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("ERROR: ADMIN_EMAIL or ADMIN_PASSWORD is not set in .env");
    console.error("Please add these to your .env file and try again.");
    process.exit(1);
  }

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    console.log(`Admin account with email ${adminEmail} already exists. Updating password...`);
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.adminUser.update({
      where: { email: adminEmail },
      data: { passwordHash }
    });
    console.log("Password updated successfully.");
  } else {
    console.log(`Creating new admin account for ${adminEmail}...`);
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'System Admin'
      }
    });
    console.log("Admin account created successfully.");
  }
}

main()
  .catch((e) => {
    console.error("Error during admin seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
