/**
 * P0 pilot acceptance — API-level end-to-end checks.
 * Requires: next dev running, SEED_VENDOR_EMAIL/PASSWORD in env.
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
const title = `P0 Acceptance ${stamp}`
const clientEmail = `p0.client.${stamp}@example.com`

let r
r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, remember: true }) })
ok('Vendor login', r.status === 200 && r.data?.user?.role === 'VENDOR', `status=${r.status} role=${r.data?.user?.role}`)
ok('Session cookie set', jar.has('trustos_session'))
const business = r.data?.user?.vendorProfile?.businessName || ''
ok('Workspace profile present', !!business, business)

r = await api('/api/auth/me')
ok('Session survives /api/auth/me', r.status === 200 && r.data?.user?.email?.toLowerCase() === email.toLowerCase())

r = await api('/api/vendor/projects', {
  method: 'POST',
  body: JSON.stringify({
    title, type: 'FAMILY_SESSION', clientName: 'P0 Client', clientEmail, location: 'Test City',
  }),
})
ok('Create project', r.status === 200 && !!r.data?.project?.slug, `status=${r.status} err=${r.data?.error || ''}`)
const slug = r.data?.project?.slug
const projectId = r.data?.project?.id
const inviteUrl = r.data?.invitation?.url || ''
ok('Invitation URL returned', inviteUrl.includes('/p/'), inviteUrl.slice(-24))

r = await api('/api/vendor/projects', {
  method: 'POST',
  body: JSON.stringify({
    title: `P0 Second ${stamp}`, type: 'EVENT', clientName: 'P0 Client', clientEmail,
  }),
})
ok('Second project same client email', r.status === 200 && !!r.data?.project?.id, `status=${r.status} err=${r.data?.error || ''}`)

r = await api('/api/vendor/projects')
const projects = r.data?.projects || []
ok('Project in list after create', projects.some(p => p.slug === slug), `count=${projects.length}`)

r = await api('/api/vendor/clients')
const clients = r.data?.clients || []
ok('Client in Clients list', clients.some(c => c.email === clientEmail && c.projects?.some(p => p.slug === slug)))

const orphanEmail = `p0.orphan.${stamp}@example.com`
r = await api('/api/vendor/clients', { method: 'POST', body: JSON.stringify({ name: 'Orphan Client', email: orphanEmail }) })
ok('Create standalone client', r.status === 200 && !!r.data?.client?.id, `status=${r.status}`)
r = await api('/api/vendor/clients')
ok('Standalone client persists in list', (r.data?.clients || []).some(c => c.email === orphanEmail))

r = await api(`/api/vendor/projects/${slug}/detail`)
ok('Project detail loads', r.status === 200 && r.data?.project?.id === projectId)

r = await api(`/api/vendor/projects/${slug}`, {
  method: 'PATCH',
  body: JSON.stringify({ location: 'Updated Venue', notes: 'Prep note persists' }),
})
ok('Preparation fields save', r.status === 200, `status=${r.status}`)
r = await api(`/api/vendor/projects/${slug}/detail`)
ok(
  'Preparation persists after reload',
  r.data?.project?.location === 'Updated Venue' && (r.data?.project?.notes || '').includes('Prep note'),
)

r = await api(`/api/vendor/projects/${projectId}/link`, {
  method: 'POST',
  body: JSON.stringify({ name: 'Files', url: 'https://example.com/files', type: 'gallery' }),
})
ok('Add deliverable link', r.status === 200, `status=${r.status} err=${r.data?.error || ''}`)
r = await api(`/api/vendor/projects/${slug}/detail`)
ok('Deliverable visible on detail', (r.data?.project?.files || []).some(f => f.type === 'gallery'))

r = await api(`/api/vendor/projects/${projectId}/complete`, { method: 'POST' })
ok('Mark service complete', r.status === 200, `status=${r.status}`)

const token = inviteUrl.split('/p/')[1]
const clientJar = new Map()
const clientApi = (path, opts) => withJar(clientJar, path, opts)
r = await clientApi(`/api/client/invite/${token}`, { method: 'POST' })
ok('Client invite exchange', r.status === 200 && clientJar.has('trustos_client'), `status=${r.status}`)
r = await clientApi('/api/client/project')
ok('Client sees deliverables', (r.data?.project?.files || []).some(f => f.type === 'gallery'))
r = await clientApi('/api/client/complete', { method: 'POST' })
ok('Client approve delivery', r.status === 200, `status=${r.status} err=${r.data?.error || ''}`)

r = await api(`/api/vendor/projects/${slug}/detail`)
ok('Vendor sees delivery approval', (r.data?.project?.approvals || []).length > 0)
ok('Service completed status', r.data?.project?.status === 'COMPLETED')

r = await api('/api/auth/logout', { method: 'POST' })
ok('Logout OK', r.status === 200)
jar.delete('trustos_session')
r = await api('/api/auth/me')
ok('Vendor session cleared after logout', r.status === 401 || !r.data?.user)

r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, remember: true }) })
ok('Re-login after logout', r.status === 200)
const page = await fetch(`${BASE}/vendor`, { headers: { Cookie: cookieHeader(jar) }, redirect: 'manual' })
ok('Vendor page accessible when VENDOR', page.status === 200 || page.status === 304, `status=${page.status}`)

const html = await (await fetch(`${BASE}/vendor`, { headers: { Cookie: cookieHeader(jar) } })).text()
ok("No Today's shoots copy", !html.includes("Today's shoots"))
ok('Workspace brand visible', html.includes(business) || html.includes('TrustOS'), business)

// Middleware: wrong-role should not bounce in a loop — simulate by checking login page for unauth
const unauth = await fetch(`${BASE}/vendor`, { redirect: 'manual' })
ok('Unauth /vendor redirects to login', unauth.status === 307 || unauth.status === 302, `status=${unauth.status} loc=${unauth.headers.get('location')}`)

const failed = results.filter(x => !x.pass)
console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`)
if (failed.length) {
  console.log('Failed:')
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`)
  process.exit(1)
}
