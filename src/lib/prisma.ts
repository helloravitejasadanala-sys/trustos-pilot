import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

/** Supabase pooler (6543) breaks Prisma prepared statements — prefer direct URL. */
function databaseUrl() {
  return process.env.DIRECT_URL || process.env.DATABASE_URL
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: { db: { url: databaseUrl() } },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
