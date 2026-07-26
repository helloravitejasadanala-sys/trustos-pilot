/**
 * Learning Stage 2 — Collect + Search acceptance (venue notes).
 * Requires: app running, migration 20260726170000 applied,
 *   SEED_VENDOR_EMAIL / SEED_VENDOR_PASSWORD,
 *   and a real second vendor (seed creates suren@agaralive.co.uk with the
 *   same SEED_VENDOR_PASSWORD, or set SEED_VENDOR_B_EMAIL / SEED_VENDOR_B_PASSWORD).
 *
 *   npm run test:learning
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
const emailA = process.env.SEED_VENDOR_EMAIL
const passwordA = process.env.SEED_VENDOR_PASSWORD
/** Seed's second vendor (Agara Live) unless overridden. */
const emailB = (process.env.SEED_VENDOR_B_EMAIL || 'suren@agaralive.co.uk').toLowerCase()
const passwordB = process.env.SEED_VENDOR_B_PASSWORD || passwordA

if (!emailA || !passwordA) {
  console.error('FAIL: missing SEED_VENDOR_EMAIL / SEED_VENDOR_PASSWORD')
  process.exit(1)
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

async function loginVendor(jar, email, password, label) {
  const r = await withJar(jar, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, remember: true }),
  })
  const session = jar.get('trustos_session')
  const authed =
    r.status === 200 &&
    r.data?.user?.role === 'VENDOR' &&
    (r.data?.user?.email || '').toLowerCase() === email.toLowerCase() &&
    typeof session === 'string' &&
    session.length > 20

  console.log(
    `${label} auth: status=${r.status}` +
      ` email=${r.data?.user?.email || '(none)'}` +
      ` role=${r.data?.user?.role || '(none)'}` +
      ` trustos_session=${session ? `present (${session.slice(0, 12)}…)` : 'MISSING'}`,
  )

  return { r, authed, session }
}

const jarA = new Map()
const jarB = new Map()
const apiA = (path, opts) => withJar(jarA, path, opts)
const apiB = (path, opts) => withJar(jarB, path, opts)

const stamp = Date.now().toString(36)
const venueName = `Learning Test Venue ${stamp}`
const title1 = `Learning test A1 ${stamp}`
const title2 = `Learning test A2 ${stamp}`
const client1 = `learning.a1.${stamp}@example.com`
const client2 = `learning.a2.${stamp}@example.com`

let slug1 = null
let slug2 = null
let projectId1 = null
let projectId2 = null
let noteId1 = null

try {
  const loginA = await loginVendor(jarA, emailA, passwordA, 'Vendor A')
  if (!loginA.authed) {
    console.error('FAIL: vendor A login — session not established')
    process.exit(1)
  }
  console.log(`Running against ${BASE} as A=${emailA}`)

  // Prove B can authenticate before any assertions that depend on isolation.
  const loginB = await loginVendor(jarB, emailB, passwordB, 'Vendor B')
  if (!loginB.authed) {
    console.error(`
FAIL: second vendor login — adversarial check cannot run without a real session.

Seed already creates: suren@agaralive.co.uk (password = SEED_VENDOR_PASSWORD).
  1. Ensure that user exists: npm run db:seed
  2. Or set SEED_VENDOR_B_EMAIL / SEED_VENDOR_B_PASSWORD for another real vendor
     and re-run.

Do not skip or fake this check.
`)
    process.exit(1)
  }
  if (loginB.session === loginA.session) {
    console.error('FAIL: vendor B session cookie identical to A — isolation invalid')
    process.exit(1)
  }
  if (emailB.toLowerCase() === emailA.toLowerCase()) {
    console.error('FAIL: SEED_VENDOR_B_EMAIL must differ from SEED_VENDOR_EMAIL')
    process.exit(1)
  }
  console.log(`Adversary B established: ${emailB} (distinct session from A)`)

  // ── Setup: project 1 + venue note ────────────────────────────────────
  let r = await apiA('/api/vendor/projects', {
    method: 'POST',
    body: JSON.stringify({
      title: title1,
      type: 'FAMILY_SESSION',
      clientName: 'Learning Test Client A1',
      clientEmail: client1,
      location: venueName,
      notes: '[test] learning-tests.mjs',
    }),
  })
  if (r.status !== 200 || !r.data?.project?.id) {
    console.error(`FAIL: create project 1 (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  slug1 = r.data.project.slug
  projectId1 = r.data.project.id

  r = await apiA(`/api/vendor/projects/${projectId1}/venue-note`, {
    method: 'POST',
    body: JSON.stringify({
      location: venueName,
      power: 'Sockets behind the stage',
      access: 'Loading bay on the left',
      confidence: 4,
    }),
  })
  ok(
    '1. Save venue note (city "")',
    r.status === 200 && !!r.data?.note?.id && r.data?.venue?.city === '',
    `status=${r.status} noteId=${r.data?.note?.id || ''} city=${JSON.stringify(r.data?.venue?.city)} err=${r.data?.error || ''}`,
  )
  noteId1 = r.data?.note?.id || null

  // ── Lookup same location + city= ─────────────────────────────────────
  const q = new URLSearchParams()
  q.set('location', venueName)
  q.set('city', '') // explicit empty — same unique key as POST
  r = await apiA(`/api/vendor/venues/lookup?${q.toString()}`)
  ok(
    '2. Lookup same location + city="" returns note',
    r.status === 200 &&
      r.data?.match === true &&
      r.data?.note?.id === noteId1 &&
      r.data?.note?.power === 'Sockets behind the stage',
    `status=${r.status} match=${r.data?.match} noteId=${r.data?.note?.id || ''} earlier=${r.data?.earlierCount}`,
  )

  // ── Second note on another project → latest + earlierCount ───────────
  r = await apiA('/api/vendor/projects', {
    method: 'POST',
    body: JSON.stringify({
      title: title2,
      type: 'FAMILY_SESSION',
      clientName: 'Learning Test Client A2',
      clientEmail: client2,
      location: venueName,
      notes: '[test] learning-tests.mjs',
    }),
  })
  if (r.status !== 200 || !r.data?.project?.id) {
    console.error(`FAIL: create project 2 (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  slug2 = r.data.project.slug
  projectId2 = r.data.project.id

  r = await apiA(`/api/vendor/projects/${projectId2}/venue-note`, {
    method: 'POST',
    body: JSON.stringify({
      location: venueName,
      power: 'Brought own extension this time',
      confidence: 5,
    }),
  })
  const noteId2 = r.data?.note?.id
  const lookup2 = await apiA(`/api/vendor/venues/lookup?${q.toString()}`)
  ok(
    '3. Second note → latest + earlierCount >= 1',
    r.status === 200 &&
      lookup2.data?.match === true &&
      lookup2.data?.note?.id === noteId2 &&
      lookup2.data?.note?.power === 'Brought own extension this time' &&
      (lookup2.data?.earlierCount ?? 0) >= 1,
    `post=${r.status} latest=${lookup2.data?.note?.id || ''} earlier=${lookup2.data?.earlierCount}`,
  )

  // ── 4. Adversarial cross-vendor isolation ────────────────────────────
  // B already logged in with a distinct trustos_session (see above).
  console.log('Vendor B adversarial probes (session already verified)…')

  const bLookup = await apiB(`/api/vendor/venues/lookup?${q.toString()}`)
  const lookupIsolated =
    bLookup.status === 200 &&
    bLookup.data?.match === false

  // Direct project-scoped read (only id-based note path that exists).
  const bGetNote = await apiB(`/api/vendor/projects/${projectId1}/venue-note`)
  const getIsolated = bGetNote.status === 404

  // Direct project-scoped write attempt.
  const bPostNote = await apiB(`/api/vendor/projects/${projectId1}/venue-note`, {
    method: 'POST',
    body: JSON.stringify({ location: venueName, power: 'should not write' }),
  })
  const postIsolated = bPostNote.status === 404

  // No public GET /venues/:id — only lookup + project venue-note exist.
  ok(
    '4. Cross-vendor isolation (B cannot read/write A)',
    lookupIsolated && getIsolated && postIsolated && !!jarB.get('trustos_session'),
    `B.session=${jarB.has('trustos_session') ? 'yes' : 'NO'}` +
      ` lookup.status=${bLookup.status} match=${bLookup.data?.match}` +
      ` getNote.status=${bGetNote.status}` +
      ` postNote.status=${bPostNote.status}` +
      ` (paths: lookup + GET/POST /projects/{A.id}/venue-note; no /venues/:id)`,
  )

  // ── 5. Duplicate POST same project → 409 ─────────────────────────────
  r = await apiA(`/api/vendor/projects/${projectId1}/venue-note`, {
    method: 'POST',
    body: JSON.stringify({ location: venueName, power: 'duplicate' }),
  })
  ok(
    '5. Duplicate POST same project → 409',
    r.status === 409,
    `status=${r.status} error=${JSON.stringify(r.data?.error)}`,
  )
} finally {
  // Cleanup as vendor A (notes SetNull on project delete; venues may remain — unique stamp).
  let cleaned = 0
  let expected = 0
  if (slug1) {
    expected++
    const del = await apiA(`/api/vendor/projects/${slug1}`, { method: 'DELETE' })
    if (del.status === 200) cleaned++
    console.log(
      del.status === 200
        ? `Cleanup: deleted ${slug1}`
        : `Cleanup: could not delete ${slug1} (status=${del.status})`,
    )
  }
  if (slug2) {
    expected++
    const del = await apiA(`/api/vendor/projects/${slug2}`, { method: 'DELETE' })
    if (del.status === 200) cleaned++
    console.log(
      del.status === 200
        ? `Cleanup: deleted ${slug2}`
        : `Cleanup: could not delete ${slug2} (status=${del.status})`,
    )
  }
  ok(
    '6. Cleanup test fixtures',
    expected > 0 && cleaned === expected,
    `deleted ${cleaned}/${expected}`,
  )
}

const failed = results.filter(x => !x.pass)
console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`)
if (failed.length) {
  console.log('Failed:')
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
console.log('All learning Stage 2 tests passed.')
