/**
 * Money edge tests — legacy Phase 1 (assertions 1–4) plus payment schedule.
 * Requires: app running (dev or prod URL), SEED_VENDOR_EMAIL / SEED_VENDOR_PASSWORD.
 *
 *   npm run test:money
 *
 * Assertions 1–4 must remain unchanged — they prove legacy deposit/final
 * bookings still behave. Schedule tests use a separate fixture.
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
const jarC = new Map()
const apiC = (path, opts) => withJar(jarC, path, opts)

const stamp = Date.now().toString(36)
// Title includes "test" so DELETE is allowed (isTestProject).
const title = `Money test ${stamp}`
const clientEmail = `money.test.${stamp}@example.com`
const LOCK_MSG = "This quote's amounts are locked because a deposit has been paid."
const ZERO_DEP_MSG = 'Enter a deposit greater than £0, or choose Free collaboration.'
const STAGE_LOCK_MSG =
  'Payment stage amounts are locked because a payment has been confirmed on this booking.'

const cleanupSlugs = []

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
  cleanupSlugs.push(slug)
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

  // Legacy path had no stages — still true after deposit/final flow.
  const legacyStages = await api(`/api/vendor/projects/${projectId}/payment-stages`)
  ok(
    '4b. Legacy project has no payment stages',
    legacyStages.status === 200 && (legacyStages.data?.stages || []).length === 0,
    `status=${legacyStages.status} stageCount=${(legacyStages.data?.stages || []).length}`,
  )

  // ══════════════════════════════════════════════════════════════════════
  // Schedule fixture (separate booking — does not alter assertions 1–4)
  // ══════════════════════════════════════════════════════════════════════
  const schedStamp = Date.now().toString(36)
  const schedTitle = `Money schedule test ${schedStamp}`
  const schedEmail = `money.sched.${schedStamp}@example.com`

  r = await api('/api/vendor/projects', {
    method: 'POST',
    body: JSON.stringify({
      title: schedTitle,
      type: 'FAMILY_SESSION',
      clientName: 'Schedule Test Client',
      clientEmail: schedEmail,
      location: 'Schedule City',
      notes: '[test] money-tests.mjs schedule',
    }),
  })
  if (r.status !== 200 || !r.data?.project?.id || !r.data?.invitation?.url) {
    console.error(`FAIL: create schedule fixture (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  const schedSlug = r.data.project.slug
  const schedId = r.data.project.id
  const inviteToken = String(r.data.invitation.url).split('/p/').pop()
  cleanupSlugs.push(schedSlug)
  console.log(`Schedule fixture: ${schedSlug}`)

  r = await api(`/api/vendor/projects/${schedSlug}/proposal`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Schedule package',
      description: 'Schedule money test',
      price: 800,
      deposit: 200,
      method: 'manual',
    }),
  })
  if (r.status !== 200) {
    console.error(`FAIL: schedule quote (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }

  // ── 5. Stage sum ≠ quote rejected (over) ─────────────────────────────
  r = await api(`/api/vendor/projects/${schedId}/payment-stages`, {
    method: 'PUT',
    body: JSON.stringify({
      stages: [
        { name: 'A', amount: 500, timingLabel: 'On booking', sortOrder: 0 },
        { name: 'B', amount: 400, timingLabel: 'Later', sortOrder: 1 },
      ],
    }),
  })
  ok(
    '5. Stage sum over quote is rejected',
    r.status === 400 && /over by/i.test(r.data?.error || '') && /800/.test(r.data?.error || ''),
    `status=${r.status} error=${JSON.stringify(r.data?.error)}`,
  )

  // ── 6. Stage sum ≠ quote rejected (under) ────────────────────────────
  r = await api(`/api/vendor/projects/${schedId}/payment-stages`, {
    method: 'PUT',
    body: JSON.stringify({
      stages: [
        { name: 'A', amount: 100, timingLabel: 'On booking', sortOrder: 0 },
        { name: 'B', amount: 100, timingLabel: 'Later', sortOrder: 1 },
      ],
    }),
  })
  ok(
    '6. Stage sum under quote is rejected',
    r.status === 400 && /under by/i.test(r.data?.error || '') && /800/.test(r.data?.error || ''),
    `status=${r.status} error=${JSON.stringify(r.data?.error)}`,
  )

  // ── 7. More than 4 stages rejected ───────────────────────────────────
  r = await api(`/api/vendor/projects/${schedId}/payment-stages`, {
    method: 'PUT',
    body: JSON.stringify({
      stages: [0, 1, 2, 3, 4].map(i => ({
        name: `S${i}`,
        amount: i === 0 ? 800 : 0,
        timingLabel: `T${i}`,
        sortOrder: i,
      })),
    }),
  })
  ok(
    '7. More than 4 stages rejected',
    r.status === 400 && /at most 4/i.test(r.data?.error || ''),
    `status=${r.status} error=${JSON.stringify(r.data?.error)}`,
  )

  // Valid 2-stage schedule
  r = await api(`/api/vendor/projects/${schedId}/payment-stages`, {
    method: 'PUT',
    body: JSON.stringify({ applyDefault: true }),
  })
  if (r.status !== 200 || (r.data?.stages || []).length < 2) {
    console.error(`FAIL: apply default schedule (status=${r.status} body=${JSON.stringify(r.data)})`)
    process.exit(1)
  }
  const stage1 = r.data.stages[0]
  const stage2 = r.data.stages[1]

  // Client path: invite → accept → contract → sign (needed to declare)
  r = await apiC(`/api/client/invite/${encodeURIComponent(inviteToken)}`, { method: 'POST' })
  if (r.status !== 200) {
    console.error(`FAIL: client invite (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  r = await apiC('/api/client/proposal', { method: 'POST' })
  if (r.status !== 200) {
    console.error(`FAIL: client accept quote (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }

  // Resending quote after accept + schedule must NOT rewind past PROPOSAL_ACCEPTED
  // (that hid "Send agreement" in the vendor UI).
  r = await api(`/api/vendor/projects/${schedSlug}/proposal`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Schedule package',
      description: 'Schedule money test (resend)',
      price: 800,
      deposit: 200,
      method: 'manual',
    }),
  })
  const afterSchedResend = await api(`/api/vendor/projects/${schedSlug}/detail`)
  ok(
    '7b. Resend quote after accept keeps PROPOSAL_ACCEPTED (agreement still sendable)',
    r.status === 200 && afterSchedResend.data?.project?.status === 'PROPOSAL_ACCEPTED',
    `proposal=${r.status} status=${afterSchedResend.data?.project?.status}`,
  )

  r = await api(`/api/vendor/projects/${schedId}/contract`, { method: 'POST' })
  if (r.status !== 200) {
    console.error(`FAIL: send contract (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  ok('7c. Send agreement after schedule + accept', r.status === 200, `status=${r.status}`)
  r = await apiC('/api/client/contract', {
    method: 'POST',
    body: JSON.stringify({ signedBy: 'Schedule Tester', consent: true }),
  })
  if (r.status !== 200) {
    console.error(`FAIL: client sign (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }

  // ── 8. Declare against a stage that isn't open is rejected ───────────
  r = await apiC('/api/client/payment', {
    method: 'POST',
    body: JSON.stringify({
      stageId: stage2.id,
      mode: 'manual',
      declaredMethod: 'bank_transfer',
    }),
  })
  ok(
    '8. Declare against closed stage is rejected',
    r.status === 409 && /not asked for this payment/i.test(r.data?.error || ''),
    `status=${r.status} error=${JSON.stringify(r.data?.error)}`,
  )

  // Confirm stage 1
  r = await api(`/api/vendor/projects/${schedId}/payment-stages/${stage1.id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ method: 'manual' }),
  })
  if (r.status !== 200 || r.data?.status !== 'DEPOSIT_PAID') {
    console.error(`FAIL: confirm stage1 (status=${r.status} body=${JSON.stringify(r.data)})`)
    process.exit(1)
  }

  // ── 9. Confirm same stage twice → alreadyConfirmed, one COMPLETED ────
  r = await api(`/api/vendor/projects/${schedId}/payment-stages/${stage1.id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ method: 'manual' }),
  })
  const d9 = await api(`/api/vendor/projects/${schedSlug}/detail`)
  const stage1Completed = (d9.data?.project?.payments || []).filter(
    p => p.stageId === stage1.id && p.status === 'COMPLETED',
  )
  ok(
    '9. Confirm same stage twice returns alreadyConfirmed (one COMPLETED)',
    r.status === 200 &&
      r.data?.alreadyConfirmed === true &&
      stage1Completed.length === 1,
    `alreadyConfirmed=${r.data?.alreadyConfirmed} completedCount=${stage1Completed.length}`,
  )

  // ── 10. Stage amounts locked after COMPLETED payment ─────────────────
  r = await api(`/api/vendor/projects/${schedId}/payment-stages`, {
    method: 'PUT',
    body: JSON.stringify({
      stages: [
        { name: 'A', amount: 200, timingLabel: 'On booking', sortOrder: 0 },
        { name: 'B', amount: 600, timingLabel: 'Later', sortOrder: 1 },
      ],
    }),
  })
  ok(
    '10. Stage amounts locked once any COMPLETED payment exists',
    r.status === 400 && r.data?.error === STAGE_LOCK_MSG,
    `status=${r.status} error=${JSON.stringify(r.data?.error)}`,
  )

  // Request + confirm stage 2 → FULLY_PAID
  r = await api(`/api/vendor/projects/${schedId}/payment-stages/${stage2.id}/request`, {
    method: 'POST',
  })
  if (r.status !== 200) {
    console.error(`FAIL: request stage2 (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  r = await api(`/api/vendor/projects/${schedId}/payment-stages/${stage2.id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ method: 'manual' }),
  })
  const statusFully = r.data?.status
  ok(
    '11. All stages complete → FULLY_PAID',
    r.status === 200 && statusFully === 'FULLY_PAID',
    `status=${r.status} projectStatus=${statusFully}`,
  )

  // Second confirm stage 2 — no rewind
  r = await api(`/api/vendor/projects/${schedId}/payment-stages/${stage2.id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ method: 'manual' }),
  })
  const d12 = await api(`/api/vendor/projects/${schedSlug}/detail`)
  ok(
    '12. Status never rewinds after second stage confirm',
    r.status === 200 &&
      r.data?.alreadyConfirmed === true &&
      d12.data?.project?.status === 'FULLY_PAID',
    `alreadyConfirmed=${r.data?.alreadyConfirmed} status=${d12.data?.project?.status}`,
  )
} finally {
  for (const s of cleanupSlugs) {
    const del = await api(`/api/vendor/projects/${s}`, { method: 'DELETE' })
    console.log(
      del.status === 200
        ? `Cleanup: deleted fixture ${s}`
        : `Cleanup: could not delete ${s} (status=${del.status} err=${del.data?.error || ''})`,
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
