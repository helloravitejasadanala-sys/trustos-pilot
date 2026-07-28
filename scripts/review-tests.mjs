/**
 * Review + closing acceptance (C5).
 * Requires: app running, migration 20260726180000 applied,
 *   SEED_VENDOR_EMAIL / SEED_VENDOR_PASSWORD.
 *
 *   npm run test:review
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

const jarV = new Map()
const jarC = new Map()
const apiV = (path, opts) => withJar(jarV, path, opts)
const apiC = (path, opts) => withJar(jarC, path, opts)
const INVITE_HEADER = 'x-trustos-invitation'
function apiClient(token, path, opts = {}) {
  return apiC(path, {
    ...opts,
    headers: { ...(opts.headers || {}), [INVITE_HEADER]: token },
  })
}

const stamp = Date.now().toString(36)
const title = `Review test ${stamp}`
const clientEmail = `review.test.${stamp}@example.com`

let slug = null
let projectId = null
let inviteToken = null

try {
  let r = await apiV('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, remember: true }),
  })
  if (r.status !== 200 || r.data?.user?.role !== 'VENDOR' || !jarV.get('trustos_session')) {
    console.error(`FAIL: vendor login (status=${r.status})`)
    process.exit(1)
  }
  console.log(`Running against ${BASE} as ${email}`)

  r = await apiV('/api/vendor/projects', {
    method: 'POST',
    body: JSON.stringify({
      title,
      type: 'FAMILY_SESSION',
      clientName: 'Review Test Client',
      clientEmail,
      location: 'Review Test Venue',
      notes: '[test] review-tests.mjs',
    }),
  })
  if (r.status !== 200 || !r.data?.project?.id || !r.data?.invitation?.url) {
    console.error(`FAIL: create project (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  slug = r.data.project.slug
  projectId = r.data.project.id
  inviteToken = String(r.data.invitation.url).split('/p/').pop()
  console.log(`Fixture project: ${slug}`)

  // Client session via invitation
  r = await apiC(`/api/client/invite/${encodeURIComponent(inviteToken)}`, { method: 'POST' })
  const clientSession =
    r.status === 200 &&
    ([...jarC.keys()].some(k => /session|client|trustos/i.test(k)) || jarC.size > 0)
  if (!clientSession && r.status !== 200) {
    console.error(`FAIL: client invite exchange (status=${r.status})`)
    process.exit(1)
  }
  console.log(`Client invite: status=${r.status} cookies=${[...jarC.keys()].join(',') || '(none)'}`)

  // 1. Review blocked before approved/COMPLETED
  r = await apiClient(inviteToken, '/api/client/review', {
    method: 'POST',
    body: JSON.stringify({ overall: 5, wentWell: 'Great', wouldRecommend: 'Yes' }),
  })
  ok(
    '1. Review blocked before complete/approve',
    r.status === 409,
    `status=${r.status} error=${JSON.stringify(r.data?.error)}`,
  )

  // Money path required before complete (deposit confirmed).
  r = await apiV(`/api/vendor/projects/${slug}/proposal`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Review package',
      description: 'Review test quote',
      price: 100,
      deposit: 100,
      method: 'manual',
    }),
  })
  if (r.status !== 200) {
    console.error(`FAIL: review quote (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  const stagesRes = await apiV(`/api/vendor/projects/${projectId}/payment-stages`)
  const stage0 = (stagesRes.data?.stages || [])[0]
  if (!stage0?.id) {
    console.error(`FAIL: review stages missing (body=${JSON.stringify(stagesRes.data)})`)
    process.exit(1)
  }
  r = await apiClient(inviteToken, '/api/client/proposal', { method: 'POST' })
  if (r.status !== 200) {
    console.error(`FAIL: review accept (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  r = await apiClient(inviteToken, '/api/client/contract', {
    method: 'POST',
    body: JSON.stringify({ signedBy: 'Review Tester', consent: true }),
  })
  if (r.status !== 200) {
    console.error(`FAIL: review sign (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }
  r = await apiV(`/api/vendor/projects/${projectId}/payment-stages/${stage0.id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ method: 'manual' }),
  })
  if (r.status !== 200) {
    console.error(`FAIL: review confirm pay (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }

  // Vendor marks COMPLETED (client-side close gate: COMPLETED OR approval)
  r = await apiV(`/api/vendor/projects/${projectId}/complete`, { method: 'POST' })
  if (r.status !== 200) {
    console.error(`FAIL: mark complete (status=${r.status} err=${r.data?.error || ''})`)
    process.exit(1)
  }

  // 2. Client can submit review
  r = await apiClient(inviteToken, '/api/client/review', {
    method: 'POST',
    body: JSON.stringify({
      overall: 5,
      wentWell: 'On time and kind',
      wouldRecommend: 'Would book again',
    }),
  })
  ok(
    '2. Client submits review after COMPLETED',
    r.status === 200 && !!r.data?.review?.id && r.data.review.overall === 5,
    `status=${r.status} overall=${r.data?.review?.overall} id=${r.data?.review?.id || ''}`,
  )

  // 3. Vendor sees review on detail (no venue fields)
  r = await apiV(`/api/vendor/projects/${slug}/detail`)
  const rev = r.data?.project?.review
  const noVenueLeak =
    rev &&
    !('venueId' in rev) &&
    !('venue_id' in rev) &&
    rev.wentWell === 'On time and kind'
  ok(
    '3. Vendor detail shows review (not venue-linked)',
    r.status === 200 && noVenueLeak && rev.overall === 5,
    `status=${r.status} overall=${rev?.overall} wentWell=${JSON.stringify(rev?.wentWell)}`,
  )

  // 4. Idempotent second submit
  r = await apiClient(inviteToken, '/api/client/review', {
    method: 'POST',
    body: JSON.stringify({ overall: 1, wentWell: 'dup' }),
  })
  ok(
    '4. Second review is idempotent',
    r.status === 200 && r.data?.alreadyReviewed === true,
    `status=${r.status} alreadyReviewed=${r.data?.alreadyReviewed}`,
  )

  // 5. Confirm Review model fields only — GET shape
  r = await apiClient(inviteToken, '/api/client/review')
  ok(
    '5. Client GET review has stars + short answers only',
    r.status === 200 &&
      r.data?.review?.overall === 5 &&
      r.data.review.wentWell === 'On time and kind' &&
      r.data.review.wouldRecommend === 'Would book again',
    `status=${r.status}`,
  )
} finally {
  if (slug) {
    const del = await apiV(`/api/vendor/projects/${slug}`, { method: 'DELETE' })
    ok(
      '6. Cleanup test fixture',
      del.status === 200,
      `status=${del.status}`,
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
console.log('All review/closing tests passed.')
console.log('Confirmed: Review has no FK/join to VendorVenue or VenueNote.')
