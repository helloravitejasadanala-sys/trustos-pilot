'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Phone, Plus, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import ClientFormModal from '@/components/vendor/ClientFormModal'
import { ActionMenu, ActionMenuItem, CardSkeleton, EmptyState } from '@/components/ui'
import { PageHeader, PageLayout } from '@/components/layout'
import { isTestClient } from '@/lib/vendor-phase1'
import { parseJsonResponse } from '@/lib/safe-json'

type ClientRow = {
  id: string
  name: string
  email: string
  phone?: string | null
  archived: boolean
  projects: { id: string; title: string; slug: string; status: string; eventDate: string | null }[]
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; client: ClientRow } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/vendor/clients')
      const { ok, data } = await parseJsonResponse<{ clients?: ClientRow[] }>(res)
      if (ok) setClients(data.clients || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter(c => {
      if (tab === 'active' ? c.archived : !c.archived) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    })
  }, [clients, query, tab])

  async function patchClient(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/vendor/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await parseJsonResponse(res)
    if (!data.ok) throw new Error((data.data as { error?: string }).error || 'Update failed')
    toast.success('Client updated')
    load()
  }

  async function deleteClient(client: ClientRow) {
    if (!isTestClient(client)) {
      toast.error('Real clients can only be archived — use Archive instead of Delete.')
      return
    }
    const warned = confirm(
      `Permanently delete test client “${client.name}”?\n\n` +
        'This cannot be undone. Their messages and link to test projects will be removed.\n\n' +
        'Real clients should be Archived, not deleted.',
    )
    if (!warned) return
    const res = await fetch(`/api/vendor/clients/${client.id}`, { method: 'DELETE' })
    const data = await parseJsonResponse(res)
    if (!data.ok) return toast.error((data.data as { error?: string }).error || 'Delete failed')
    toast.success('Test client deleted')
    load()
  }

  return (
    <PageLayout>
      <PageHeader
        title="Clients"
        actions={
          <button type="button" onClick={() => setModal({ mode: 'create' })} className="btn btn-forest shrink-0">
            <Plus size={16} className="mr-1.5" />New client
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="vendor-seg" role="tablist" aria-label="Client filter">
          {(['active', 'archived'] as const).map(key => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className="vendor-seg__btn"
            >
              {key === 'active' ? 'Active' : 'Archived'}
            </button>
          ))}
        </div>
        <div className="vendor-search-wrap">
          <Search size={16} aria-hidden />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email"
            aria-label="Search clients by name or email"
            className="vendor-search"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5"><CardSkeleton /><CardSkeleton /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? 'No clients yet' : 'No archived clients'}
          description={tab === 'active'
            ? 'Add someone here, or create a booking with their email — they get a secure link, no account.'
            : 'People you archive will rest here — out of the way until you need them.'}
          action={tab === 'active' ? <button type="button" className="btn btn-forest" onClick={() => setModal({ mode: 'create' })}>＋ New client</button> : undefined}
        />
      ) : (
        <div className="divide-y divide-forest-100 rounded-xl border border-forest-100 bg-white overflow-visible">
          {filtered.map(client => (
            <div
              key={client.id}
              className="relative z-0 flex items-stretch gap-1 px-1.5 py-0.5 hover:bg-forest-50/40 transition-colors sm:px-2"
            >
              <button
                type="button"
                className="min-h-[64px] min-w-0 flex-1 rounded-lg px-2.5 py-3 text-left"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => router.push(`/vendor/clients/${client.id}`)}
              >
                <p className="text-[15px] font-semibold text-forest-950 truncate">{client.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[13px] text-[color:var(--muted)]">
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </span>
                  {client.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone size={12} />
                      {client.phone}
                    </span>
                  )}
                  <span>
                    {client.projects.length} booking{client.projects.length === 1 ? '' : 's'}
                  </span>
                </div>
              </button>
              <span
                className="pointer-events-none self-center pr-1 text-[13px] font-semibold text-forest-700 sm:pr-2"
                aria-hidden
              >
                Open →
              </span>
              <div className="relative shrink-0 self-center" onClick={e => e.stopPropagation()}>
                <ActionMenu
                  closeKey={`${tab}:${query}`}
                  ariaLabel={`Actions for ${client.name}`}
                  triggerClassName="flex h-11 w-11 items-center justify-center rounded-lg text-[color:var(--muted)] hover:bg-forest-100 hover:text-forest-700"
                  triggerStyle={{}}
                >
                  {({ close }) => (
                    <>
                      <ActionMenuItem
                        onSelect={() => {
                          close()
                          router.push(`/vendor/clients/${client.id}`)
                        }}
                      >
                        Open
                      </ActionMenuItem>
                      <ActionMenuItem
                        onSelect={() => {
                          close()
                          setModal({ mode: 'edit', client })
                        }}
                      >
                        Edit
                      </ActionMenuItem>
                      {!client.archived && (
                        <ActionMenuItem
                          onSelect={() => {
                            close()
                            patchClient(client.id, { archive: true }).catch(e => toast.error(e.message))
                          }}
                        >
                          Archive
                        </ActionMenuItem>
                      )}
                      {client.archived && (
                        <ActionMenuItem
                          onSelect={() => {
                            close()
                            patchClient(client.id, { unarchive: true }).catch(e => toast.error(e.message))
                          }}
                        >
                          Restore
                        </ActionMenuItem>
                      )}
                      {isTestClient(client) && (
                        <ActionMenuItem
                          tone="danger"
                          onSelect={() => {
                            close()
                            deleteClient(client)
                          }}
                        >
                          Delete test client
                        </ActionMenuItem>
                      )}
                    </>
                  )}
                </ActionMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.mode === 'create' && <ClientFormModal onClose={() => setModal(null)} onSaved={load} />}
      {modal?.mode === 'edit' && (
        <ClientFormModal
          initial={{ id: modal.client.id, name: modal.client.name, email: modal.client.email, phone: modal.client.phone }}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </PageLayout>
  )
}
