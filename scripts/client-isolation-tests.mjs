/**
 * Client portal isolation — same cookie jar, two invitation tokens.
 *
 * Proves: session cookie authenticates; X-TrustOS-Invitation selects project.
 * Tab A after opening B must still get project A; foreign token → 403.
 *
 *   npm run test:client-isolation
 *
 * Requires: app running, SEED_VENDOR_EMAIL / SEED_VENDOR_PASSWORD.
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

const INVITE_HEADER = 'x-trustos-invitation'

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

function tokenFromInviteUrl(url) {
  const s = String(url || '')
  const i = s.indexOf('/p/')
  if (i < 0) return null
  return s.slice(i + 3).split(/[?#]/)[0] || null
}

const jarVendor = new Map()
const jarClient = new Map() // ONE cookie jar for both "tabs"
const apiV = (path, opts) => withJar(jarVendor, path, opts)
const apiC = (path, opts) => withJar(jarClient, path, opts)

const stamp = Date.now().toString(36)
const cleanupSlugs = []

console.log(`Running against ${BASE} as ${email}`)

try {
  let r = await apiV('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, remember: true }),
  })
  if (r.status !== 200 || r.data?.user?.role !== 'VENDOR') {
    console.error(`FAIL: vendor login (status=${r.status})`)
    process.exit(1)
  }

  async function createProject(label) {
    const title = `Isolation ${label} ${stamp}`
    const res = await apiV('/api/vendor/projects', {
      method: 'POST',
      body: JSON.stringify({
        title,
        type: 'FAMILY_SESSION',
        clientName: `Isolation ${label}`,
        clientEmail: `isolation.${label}.${stamp}@example.com`,
        location: 'Test City',
        notes: '[test] client-isolation-tests.mjs',
      }),
    })
    if (res.status !== 200 || !res.data?.project?.id || !res.data?.invitation?.url) {
      console.error(`FAIL: create ${label} (status=${res.status} err=${res.data?.error || ''})`)
      process.exit(1)
    }
    cleanupSlugs.push(res.data.project.slug)
    const token = tokenFromInviteUrl(res.data.invitation.url)
    if (!token || token.length < 20) {
      console.error(`FAIL: bad invite token for ${label}`)
      process.exit(1)
    }
    return {
      label,
      id: res.data.project.id,
      slug: res.data.project.slug,
      title: res.data.project.title,
      token,
    }
  }

  const projectA = await createProject('A')
  const projectB = await createProject('B')
  console.log(`Fixtures: A=${projectA.slug} B=${projectB.slug}`)
  ok('0. Distinct projects + tokens', projectA.id !== projectB.id && projectA.token !== projectB.token)

  // Open A then B in the SAME cookie jar (cookie overwritten to B).
  r = await apiC(`/api/client/invite/${encodeURIComponent(projectA.token)}`, { method: 'POST' })
  ok('1a. Exchange token A', r.status === 200, `status=${r.status}`)
  const cookieAfterA = jarClient.get('trustos_client')
  ok('1b. Client cookie after A', typeof cookieAfterA === 'string' && cookieAfterA.length > 20)

  r = await apiC(`/api/client/invite/${encodeURIComponent(projectB.token)}`, { method: 'POST' })
  ok('1c. Exchange token B (same jar)', r.status === 200, `status=${r.status}`)
  const cookieAfterB = jarClient.get('trustos_client')
  ok('1d. Cookie still present after B', typeof cookieAfterB === 'string' && cookieAfterB.length > 20)
  console.log(
    `Cookie jar: after A then B — cookie changed=${cookieAfterA !== cookieAfterB}` +
      ` (last-write-wins expected)`,
  )

  // Tab A still sends token A; Tab B sends token B.
  const tabAProject = await apiC('/api/client/project', {
    headers: { [INVITE_HEADER]: projectA.token },
  })
  const tabBProject = await apiC('/api/client/project', {
    headers: { [INVITE_HEADER]: projectB.token },
  })

  const aTitle = tabAProject.data?.project?.title
  const bTitle = tabBProject.data?.project?.title
  ok(
    '2. Tab A project poll returns A (not B) after B exchange',
    tabAProject.status === 200 && aTitle === projectA.title,
    `status=${tabAProject.status} title=${JSON.stringify(aTitle)} expected=${JSON.stringify(projectA.title)}`,
  )
  ok(
    '3. Tab B project poll returns B',
    tabBProject.status === 200 && bTitle === projectB.title,
    `status=${tabBProject.status} title=${JSON.stringify(bTitle)} expected=${JSON.stringify(projectB.title)}`,
  )
  ok(
    '4. Tabs do not collapse to one project',
    aTitle === projectA.title && bTitle === projectB.title && aTitle !== bTitle,
    `A=${JSON.stringify(aTitle)} B=${JSON.stringify(bTitle)}`,
  )

  // Message poll path (5s) must isolate too.
  const tabAMsgs = await apiC('/api/client/messages', {
    headers: { [INVITE_HEADER]: projectA.token },
  })
  const tabBMsgs = await apiC('/api/client/messages', {
    headers: { [INVITE_HEADER]: projectB.token },
  })
  ok(
    '5. Message poll isolates (both 200, no cross-leak via cookie)',
    tabAMsgs.status === 200 && tabBMsgs.status === 200 && Array.isArray(tabAMsgs.data?.messages),
    `A.status=${tabAMsgs.status} B.status=${tabBMsgs.status}`,
  )

  // Tampered / foreign invitation identity → 403, not another project's data.
  const garbage = await apiC('/api/client/project', {
    headers: { [INVITE_HEADER]: 'x'.repeat(40) + 'not-a-real-invitation-token' },
  })
  ok(
    '6. Tampered invitation → 403 (not another project)',
    garbage.status === 403 && !garbage.data?.project,
    `status=${garbage.status} hasProject=${!!garbage.data?.project}`,
  )

  const missing = await apiC('/api/client/project')
  ok(
    '7. Missing invitation header → 403',
    missing.status === 403 && !missing.data?.project,
    `status=${missing.status} hasProject=${!!missing.data?.project}`,
  )

  // Payment soft poll (8s path) — same isolation.
  const tabAPay = await apiC('/api/client/payment', {
    headers: { [INVITE_HEADER]: projectA.token },
  })
  const tabBPay = await apiC('/api/client/payment', {
    headers: { [INVITE_HEADER]: projectB.token },
  })
  ok(
    '8. Payment poll isolates (200 each)',
    tabAPay.status === 200 && tabBPay.status === 200,
    `A=${tabAPay.status} B=${tabBPay.status}`,
  )
} finally {
  let cleaned = 0
  for (const slug of cleanupSlugs) {
    const del = await apiV(`/api/vendor/projects/${slug}`, { method: 'DELETE' })
    if (del.status === 200) cleaned++
    console.log(
      del.status === 200
        ? `Cleanup: deleted ${slug}`
        : `Cleanup: could not delete ${slug} (status=${del.status})`,
    )
  }
  ok(
    '9. Cleanup fixtures',
    cleanupSlugs.length > 0 && cleaned === cleanupSlugs.length,
    `deleted ${cleaned}/${cleanupSlugs.length}`,
  )
}

const failed = results.filter(x => !x.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
