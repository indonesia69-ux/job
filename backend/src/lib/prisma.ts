import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient — reused across all route modules
const prisma = new PrismaClient();

export default prisma;
