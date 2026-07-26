import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

/**
 * Runtime queries must use DATABASE_URL (pooled / transaction mode).
 * NEVER fall back to DIRECT_URL here — that is session/direct and exhausts
 * serverless connection limits (EMAXCONNSESSION).
 *
 * Migrations use DIRECT_URL via prisma schema `directUrl` only.
 */
function runtimeDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL
  if (!raw?.trim()) {
    throw new Error('DATABASE_URL is required')
  }
  try {
    const u = new URL(raw)
    // Supabase transaction pooler (6543) — Prisma needs pgbouncer=true
    // so it disables prepared statements.
    if (u.port === '6543' && !u.searchParams.has('pgbouncer')) {
      u.searchParams.set('pgbouncer', 'true')
    }
    // One connection per serverless isolate.
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', '1')
    }
    return u.toString()
  } catch {
    return raw
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: runtimeDatabaseUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// Reuse across warm serverless invocations (and Next HMR in dev).
globalForPrisma.prisma = prisma
