/**
 * Money edge tests — exactly four assertions for stranger-safe Phase 1.
 * Requires: app running (dev or prod URL), SEED_VENDOR_EMAIL / SEED_VENDOR_PASSWORD.
 *
 *   npm run test:money
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 1) continue
      const k = t.slice(0, i)
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[k]) process.env[k] = v
    }
  } catch { /* ignore */ }
}

loadEnvLocal()

const BASE = process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
const email = process.env.SEED_VENDOR_EMAIL
const password = process.env.SEED_VENDOR_PASSWORD
if (!email || !password) {
  console.error('FAIL: missing SEED_VENDOR_EMAIL / SEED_VENDOR_PASSWORD')
  process.exit(1)
}

function parseSetCookie(res) {
  const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  const map = new Map()
  for (const c of raw) {
    const [pair] = c.split(';')
    const i = pair.indexOf('=')
    if (i > 0) map.set(pair.slice(0, i), pair.slice(i + 1))
  }
  return map
}

function cookieHeader(map) {
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

const results = []
function ok(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`)
}

async function withJar(jar, path, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  if (jar.size) headers.Cookie = cookieHeader(jar)
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, redirect: 'manual' })
  const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  for (const c of raw) {
    const name = c.split('=')[0]
    if (/Max-Age=0/i.test(c) || /Expires=Thu, 01 Jan 1970/i.test(c)) {
      jar.delete(name)
      continue
    }
    const [pair] = c.split(';')
    const i = pair.indexOf('=')
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1))
  }
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = { raw: text.slice(0, 200) } }
  return { res, data, status: res.status }
}

const jar = new Map()
const api = (path, opts) => withJar(jar, path, opts)

const stamp = Date.now().toString(36)
// Title includes "test" so DELETE is allowed (isTestProject).
const title = `Money test ${stamp}`
const clientEmail = `money.test.${stamp}@example.com`
const LOCK_MSG = "This quote's amounts are locked because a deposit has been paid."
const ZERO_DEP_MSG = 'Enter a deposit greater than £0, or choose Free collaboration.'

let slug = null
let projectId = null

try {
  let r = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, remember: true }),
  })
  if (r.status !== 200 || r.data?.user?.role !== 'VENDOR') {
    console.error(`FAIL: vendor login (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  console.log(`Running against ${BASE} as ${email}`)

  r = await api('/api/vendor/projects', {
    method: 'POST',
    body: JSON.stringify({
      title,
      type: 'FAMILY_SESSION',
      clientName: 'Money Test Client',
      clientEmail,
      location: 'Test City',
      notes: '[test] money-tests.mjs',
    }),
  })
  if (r.status !== 200 || !r.data?.project?.id) {
    console.error(`FAIL: create project (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  slug = r.data.project.slug
  projectId = r.data.project.id
  console.log(`Fixture project: ${slug}`)

  // ── 1. £0 deposit on priced quote rejected ───────────────────────────
  r = await api(`/api/vendor/projects/${slug}/proposal`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Priced package',
      description: 'Money test quote',
      price: 800,
      deposit: 0,
      method: 'manual',
    }),
  })
  ok(
    '1. £0 deposit on priced quote rejected',
    r.status === 400 && r.data?.error === ZERO_DEP_MSG,
    `status=${r.status} error=${JSON.stringify(r.data?.error)}`,
  )

  // Valid quote so later steps can run
  r = await api(`/api/vendor/projects/${slug}/proposal`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Priced package',
      description: 'Money test quote',
      price: 800,
      deposit: 200,
      method: 'manual',
    }),
  })
  if (r.status !== 200) {
    console.error(`FAIL: setup quote (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }

  // Confirm deposit (vendor path — no PENDING required)
  r = await api(`/api/vendor/projects/${projectId}/payment`, {
    method: 'POST',
    body: JSON.stringify({ type: 'DEPOSIT', method: 'manual' }),
  })
  if (r.status !== 200 || r.data?.status !== 'DEPOSIT_PAID') {
    console.error(`FAIL: setup deposit confirm (status=${r.status} body=${JSON.stringify(r.data)})`)
    process.exit(1)
  }

  // ── 2. Second confirm → alreadyConfirmed, one COMPLETED DEPOSIT ──────
  r = await api(`/api/vendor/projects/${projectId}/payment`, {
    method: 'POST',
    body: JSON.stringify({ type: 'DEPOSIT', method: 'manual' }),
  })
  const secondOk = r.status === 200 && r.data?.alreadyConfirmed === true
  const detail = await api(`/api/vendor/projects/${slug}/detail`)
  const completedDeposits = (detail.data?.project?.payments || []).filter(
    p => p.type === 'DEPOSIT' && p.status === 'COMPLETED',
  )
  ok(
    '2. Second confirm is idempotent (one COMPLETED deposit)',
    secondOk && completedDeposits.length === 1,
    `alreadyConfirmed=${r.data?.alreadyConfirmed} completedCount=${completedDeposits.length}`,
  )

  const statusAfterDeposit = detail.data?.project?.status

  // ── 3. Resend quote does not rewind status ───────────────────────────
  r = await api(`/api/vendor/projects/${slug}/proposal`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Priced package (notes updated)',
      description: 'Updated after deposit',
      price: 800,
      deposit: 200,
      method: 'manual',
    }),
  })
  const afterResend = await api(`/api/vendor/projects/${slug}/detail`)
  const statusAfterResend = afterResend.data?.project?.status
  ok(
    '3. Resend after deposit does not rewind status',
    r.status === 200 &&
      statusAfterResend === statusAfterDeposit &&
      statusAfterResend !== 'PROPOSAL_SENT',
    `before=${statusAfterDeposit} after=${statusAfterResend} postStatus=${r.status}`,
  )

  // ── 4. Money fields locked ───────────────────────────────────────────
  r = await api(`/api/vendor/projects/${slug}/proposal`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Priced package (notes updated)',
      description: 'Updated after deposit',
      price: 999,
      deposit: 200,
      method: 'manual',
    }),
  })
  ok(
    '4. Price/deposit/method locked after COMPLETED deposit',
    r.status === 400 && r.data?.error === LOCK_MSG,
    `status=${r.status} error=${JSON.stringify(r.data?.error)}`,
  )
} finally {
  if (slug) {
    const del = await api(`/api/vendor/projects/${slug}`, { method: 'DELETE' })
    console.log(
      del.status === 200
        ? `Cleanup: deleted fixture ${slug}`
        : `Cleanup: could not delete ${slug} (status=${del.status} err=${del.data?.error || ''})`,
    )
  }
}

const failed = results.filter(x => !x.pass)
console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`)
if (failed.length) {
  console.log('Failed:')
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
console.log('All money edge tests passed.')
