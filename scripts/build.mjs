#!/usr/bin/env node
/**
 * Production / preview build entry.
 *
 * Runs `prisma migrate deploy` only when both DATABASE_URL and DIRECT_URL
 * are set (Vercel has them). Netlify previews historically had DATABASE_URL
 * for runtime but not DIRECT_URL for migrate — forcing migrate there made
 * every Deploy Preview fail before `next build`.
 *
 * Always: prisma generate → next build.
 */
import { spawnSync } from 'node:child_process'

function run(cmd) {
  console.log(`\n> ${cmd}`)
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  })
  const code = result.status ?? 1
  if (code !== 0) process.exit(code)
}

const databaseUrl = (process.env.DATABASE_URL || '').trim()
const directUrl = (process.env.DIRECT_URL || '').trim()

if (databaseUrl && directUrl) {
  run('npx prisma migrate deploy')
} else {
  console.warn(
    '[build] Skipping prisma migrate deploy — set both DATABASE_URL and DIRECT_URL to migrate during build.',
  )
}

run('npx prisma generate')
run('npx next build')
