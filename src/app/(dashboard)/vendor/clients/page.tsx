'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Mail, Phone } from 'lucide-react'
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
    if (!isTestClient(client) || !confirm('Delete this test client?')) return
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
          <button onClick={() => setModal({ mode: 'create' })} className="btn-primary shrink-0">
            <Plus size={16} className="mr-1.5" />New client
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="inline-flex rounded-lg border border-forest-100 bg-white p-0.5 self-start">
          {(['active', 'archived'] as const).map(key => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${tab === key ? 'bg-forest-950 text-paper-50' : 'text-forest-600 hover:text-forest-900'}`}>
              {key === 'active' ? 'Active' : 'Archived'}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email"
            aria-label="Search clients by name or email"
            className="w-full !min-h-0 py-2.5 px-3.5 text-[13px]"
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
          action={tab === 'active' ? <button className="btn-primary" onClick={() => setModal({ mode: 'create' })}>＋ New client</button> : undefined}
        />
      ) : (
        <div className="divide-y divide-forest-100 rounded-xl border border-forest-100 bg-white overflow-visible">
          {filtered.map(client => (
            <div
              key={client.id}
              className="relative z-0 flex items-start justify-between gap-3 px-4 py-3 hover:bg-forest-50/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-forest-950">{client.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[13px] text-[color:var(--muted)]">
                  <span className="inline-flex items-center gap-1"><Mail size={12} />{client.email}</span>
                  {client.phone && <span className="inline-flex items-center gap-1"><Phone size={12} />{client.phone}</span>}
                  <span>{client.projects.length} project{client.projects.length === 1 ? '' : 's'}</span>
                </div>
                {client.projects.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {client.projects.map(p => (
                      <Link key={p.id} href={`/vendor/projects/${p.slug}`} className="text-[13px] text-forest-700 hover:underline">{p.title}</Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative shrink-0">
                <ActionMenu
                  closeKey={`${tab}:${query}`}
                  ariaLabel={`Actions for ${client.name}`}
                  triggerClassName="flex h-10 w-10 items-center justify-center rounded-lg text-[color:var(--muted)] hover:bg-forest-100 hover:text-forest-700"
                  triggerStyle={{}}
                >
                  {({ close }) => (
                    <>
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
      {modal?.mode === 'edit' && <ClientFormModal initial={{ id: modal.client.id, name: modal.client.name, email: modal.client.email, phone: modal.client.phone }} onClose={() => setModal(null)} onSaved={load} />}
    </PageLayout>
  )
}
