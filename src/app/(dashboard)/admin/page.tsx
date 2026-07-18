'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, Briefcase, TrendingUp, LogOut, Loader2, ArrowUpRight
} from 'lucide-react'

interface AnalyticsData {
  kpi: {
    totalUsers: number
    totalVendors: number
    totalProjects: number
    totalRevenue: number
  }
  funnel: Array<{ name: string; event: string; count: number }>
}

export default function AdminDashboard() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="space-y-3 w-56">
          <div className="skeleton h-6 w-24" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { kpi, funnel } = data
  const maxFunnel = Math.max(...funnel.map(f => f.count), 1)

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 px-5 py-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <h1 className="text-base font-semibold text-ink-900 tracking-tight">Overview</h1>
          <button onClick={logout} className="text-xs text-ink-400 hover:text-ink-600 transition">Sign out</button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-5 space-y-5 pb-10">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard icon={Users} value={kpi.totalUsers} label="Users" color="text-emerald-600" />
          <KpiCard icon={Briefcase} value={kpi.totalProjects} label="Projects" color="text-blue-500" />
          <KpiCard icon={Users} value={kpi.totalVendors} label="Vendors" color="text-amber-500" />
          <KpiCard icon={TrendingUp} value={`£${kpi.totalRevenue.toFixed(0)}`} label="Revenue" color="text-emerald-600" />
        </div>

        {/* Funnel */}
        <div className="card">
          <h2 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-5">Conversion</h2>
          <div className="space-y-3">
            {funnel.map((stage, i) => {
              const prevCount = i > 0 ? funnel[i - 1].count : stage.count
              const rate = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 0
              const width = (stage.count / maxFunnel) * 100

              return (
                <div key={stage.event} className="flex items-center gap-3">
                  <div className="w-20 text-[11px] text-ink-400 truncate">{stage.name}</div>
                  <div className="flex-1">
                    <div className="h-7 bg-sand-100 rounded-lg overflow-hidden relative">
                      <div 
                        className="h-full bg-emerald-500 rounded-lg transition-all flex items-center px-2"
                        style={{ width: `${Math.max(width, 6)}%` }}
                      >
                        {width > 15 && <span className="text-[11px] text-white font-medium">{stage.count}</span>}
                      </div>
                      {width <= 15 && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-ink-400">{stage.count}</span>
                      )}
                    </div>
                  </div>
                  {i > 0 && (
                    <span className={`text-[11px] font-medium w-7 text-right ${
                      rate >= 50 ? 'text-emerald-600' : rate >= 20 ? 'text-amber-500' : 'text-ink-300'
                    }`}>{rate}%</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

function KpiCard({ icon: Icon, value, label, color }: any) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-[11px] text-ink-400 font-medium">{label}</span>
      </div>
      <p className="text-xl font-semibold text-ink-900 tracking-tight">{value}</p>
    </div>
  )
}
