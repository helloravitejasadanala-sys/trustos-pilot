/**
 * Fixture tests for Today tier ranking (no DB).
 * Run: npm run test:today-queue
 */

import {
  buildTodayQueue,
  isEventTomorrowLocal,
  type TodayQueueItem,
} from '../src/lib/today-queue'
import type { VendorProject } from '../src/lib/vendor-phase1'

const NOW = new Date('2026-07-25T12:00:00')

let failed = 0
let passed = 0

function ok(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function ids(queue: TodayQueueItem[]) {
  return queue.map(q => `${q.tier}:${q.kind}:${q.p.id}`).join(' > ')
}

function base(partial: Partial<VendorProject> & { id: string; status: string }): VendorProject {
  return {
    title: partial.title || partial.id,
    slug: partial.slug || partial.id,
    type: 'WEDDING',
    eventDate: null,
    location: null,
    notes: null,
    client: { name: partial.id },
    createdAt: '2026-07-20T10:00:00Z',
    ...partial,
  }
}

console.log('\nToday queue fixtures\n')

// ── Bug: four fresh LEADs — oldest wins, not newest ───────────────────
{
  console.log('1. Four fresh LEADs → oldest wins (Do this first)')
  const projects: VendorProject[] = [
    base({ id: 'lead-newest', status: 'LEAD', createdAt: '2026-07-24T18:00:00Z' }),
    base({ id: 'lead-mid-b', status: 'LEAD', createdAt: '2026-07-22T12:00:00Z' }),
    base({ id: 'lead-oldest', status: 'LEAD', createdAt: '2026-07-10T09:00:00Z' }),
    base({ id: 'lead-mid-a', status: 'LEAD', createdAt: '2026-07-15T09:00:00Z' }),
  ]
  const queue = buildTodayQueue(projects, {
    isUnread: () => false,
    now: NOW,
  })
  ok('all four in queue', queue.length === 4, ids(queue))
  ok('all Tier 3 action', queue.every(q => q.tier === 3 && q.kind === 'action'), ids(queue))
  ok(
    'Do this first is oldest LEAD',
    queue[0]?.p.id === 'lead-oldest',
    `got ${queue[0]?.p.id}; order=${ids(queue)}`,
  )
  ok(
    'order is oldest → newest',
    queue.map(q => q.p.id).join(',') === 'lead-oldest,lead-mid-a,lead-mid-b,lead-newest',
    ids(queue),
  )
}

// ── Tier 1 beats Tier 3 ───────────────────────────────────────────────
{
  console.log('\n2. Tier 1 payment blocks ahead of older LEAD')
  const projects: VendorProject[] = [
    base({ id: 'old-lead', status: 'LEAD', createdAt: '2026-01-01T00:00:00Z' }),
    base({
      id: 'pay-wait',
      status: 'CONTRACT_SIGNED',
      createdAt: '2026-07-24T00:00:00Z',
      payments: [
        {
          status: 'PENDING',
          type: 'DEPOSIT',
          amount: 200,
          createdAt: '2026-07-24T08:00:00Z',
        },
      ],
    }),
  ]
  const queue = buildTodayQueue(projects, { isUnread: () => false, now: NOW })
  ok('payment is Do this first', queue[0]?.kind === 'payment' && queue[0]?.p.id === 'pay-wait', ids(queue))
  ok('LEAD is second (Tier 3)', queue[1]?.p.id === 'old-lead' && queue[1]?.tier === 3, ids(queue))
}

// ── Tier 1: longest wait wins; £ is tiebreak only ─────────────────────
{
  console.log('\n3. Tier 1 longest wait first; £ tiebreak only')
  const projects: VendorProject[] = [
    base({
      id: 'pay-big-new',
      status: 'CONTRACT_SIGNED',
      createdAt: '2026-07-24T00:00:00Z',
      payments: [
        { status: 'PENDING', type: 'DEPOSIT', amount: 5000, createdAt: '2026-07-24T10:00:00Z' },
      ],
    }),
    base({
      id: 'pay-small-old',
      status: 'CONTRACT_SIGNED',
      createdAt: '2026-07-20T00:00:00Z',
      payments: [
        { status: 'PENDING', type: 'DEPOSIT', amount: 50, createdAt: '2026-07-20T10:00:00Z' },
      ],
    }),
  ]
  const queue = buildTodayQueue(projects, { isUnread: () => false, now: NOW })
  ok(
    'older smaller payment wins over newer larger',
    queue[0]?.p.id === 'pay-small-old',
    ids(queue),
  )
}

// ── CONTRACT_SIGNED (no pending) is NOT Tier 1 ────────────────────────
{
  console.log('\n4. Agreement signed (client owes deposit) is not urgent')
  const projects: VendorProject[] = [
    base({ id: 'signed', status: 'CONTRACT_SIGNED', createdAt: '2026-07-01T00:00:00Z' }),
    base({ id: 'lead', status: 'LEAD', createdAt: '2026-07-20T00:00:00Z' }),
  ]
  const queue = buildTodayQueue(projects, { isUnread: () => false, now: NOW })
  ok('signed project not in Do-this-first queue', !queue.some(q => q.p.id === 'signed'), ids(queue))
  ok('LEAD is Do this first', queue[0]?.p.id === 'lead', ids(queue))
}

// ── Unread + delivery Tier 1 ──────────────────────────────────────────
{
  console.log('\n5. Unread and delivery follow-up are Tier 1')
  const projects: VendorProject[] = [
    base({
      id: 'msg',
      status: 'DEPOSIT_PAID',
      createdAt: '2026-07-01T00:00:00Z',
      lastClientMessageAt: '2026-07-23T09:00:00Z',
      eventDate: '2026-08-01',
      location: 'Hall',
      notes: 'prep notes',
    }),
    base({
      id: 'delivered',
      status: 'FULLY_PAID',
      createdAt: '2026-07-02T00:00:00Z',
      approvals: [{ id: 'a1', createdAt: '2026-07-22T12:00:00Z' }],
      review: null,
    }),
    base({ id: 'lead', status: 'LEAD', createdAt: '2026-06-01T00:00:00Z' }),
  ]
  const queue = buildTodayQueue(projects, {
    isUnread: p => p.id === 'msg',
    now: NOW,
  })
  ok('first two are Tier 1', queue[0]?.tier === 1 && queue[1]?.tier === 1, ids(queue))
  ok(
    'longer-waiting delivery before newer unread',
    queue[0]?.p.id === 'delivered' && queue[1]?.p.id === 'msg',
    ids(queue),
  )
  ok('LEAD is after Tier 1', queue[2]?.p.id === 'lead' && queue[2]?.tier === 3, ids(queue))
}

// ── Tier 2: event tomorrow + prep incomplete ──────────────────────────
{
  console.log('\n6. Tier 2 — event tomorrow, prep incomplete')
  const tomorrow = new Date(NOW)
  tomorrow.setDate(tomorrow.getDate() + 1)
  ok('helper: isEventTomorrowLocal', isEventTomorrowLocal(tomorrow, NOW))

  const projects: VendorProject[] = [
    base({
      id: 'tomorrow-raw',
      status: 'DEPOSIT_PAID',
      createdAt: '2026-07-01T00:00:00Z',
      eventDate: tomorrow.toISOString(),
      // no location / notes → prep incomplete for photography
    }),
    base({ id: 'old-lead', status: 'LEAD', createdAt: '2026-01-01T00:00:00Z' }),
  ]
  const queue = buildTodayQueue(projects, { isUnread: () => false, now: NOW })
  ok('deadline is Do this first', queue[0]?.kind === 'deadline' && queue[0]?.tier === 2, ids(queue))
  ok('LEAD second', queue[1]?.p.id === 'old-lead', ids(queue))
}

// ── One project once ──────────────────────────────────────────────────
{
  console.log('\n7. One project once (pending payment + unread)')
  const projects: VendorProject[] = [
    base({
      id: 'both',
      status: 'CONTRACT_SIGNED',
      createdAt: '2026-07-01T00:00:00Z',
      lastClientMessageAt: '2026-07-24T00:00:00Z',
      payments: [
        { status: 'PENDING', type: 'DEPOSIT', amount: 100, createdAt: '2026-07-24T00:00:00Z' },
      ],
    }),
  ]
  const queue = buildTodayQueue(projects, {
    isUnread: () => true,
    now: NOW,
  })
  ok('appears once', queue.length === 1, ids(queue))
  ok('payment wins over unread', queue[0]?.kind === 'payment', ids(queue))
}

// ── Tier 4 optional review ────────────────────────────────────────────
{
  console.log('\n8. COMPLETED without review is Tier 4, after LEAD')
  const projects: VendorProject[] = [
    base({ id: 'done', status: 'COMPLETED', createdAt: '2026-06-01T00:00:00Z', review: null }),
    base({ id: 'lead', status: 'LEAD', createdAt: '2026-07-01T00:00:00Z' }),
  ]
  const queue = buildTodayQueue(projects, { isUnread: () => false, now: NOW })
  ok('LEAD before optional review', queue[0]?.p.id === 'lead' && queue[0]?.tier === 3, ids(queue))
  ok('review is Tier 4', queue[1]?.p.id === 'done' && queue[1]?.tier === 4, ids(queue))
}

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed ? 1 : 0)
