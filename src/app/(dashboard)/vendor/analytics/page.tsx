'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  LayoutDashboard, Briefcase, Palette, BarChart3, LogOut, 
  TrendingUp, Eye, CheckCircle, Clock, CreditCard, 
  Loader2, ArrowUpRight, ArrowDownRight, PoundSterling 
} from 'lucide-react'
import Link from 'next/link'

export default function VendorAnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
    fetchStats()
  }, [])

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (!data.user || data.user.role !== 'VENDOR') {
        router.push('/login')
        return
      }
      setUser(data.user)
    } catch {
      router.push('/login')
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/vendor/projects')
      const data = await res.json()
      const projects = data.projects || []

      // Calculate stats
      const totalProjects = projects.length
      const activeProjects = projects.filter((p: any) => !['COMPLETED', 'CANCELLED'].includes(p.status)).length
      const completedProjects = projects.filter((p: any) => p.status === 'COMPLETED').length
      const totalRevenue = projects
        .filter((p: any) => p.status === 'FULLY_PAID')
        .reduce((sum: number, p: any) => sum + (parseFloat(p.budget) || 0), 0)

      const statusBreakdown = projects.reduce((acc: any, p: any) => {
        acc[p.status] = (acc[p.status] || 0) + 1
        return acc
      }, {})

      setStats({ totalProjects, activeProjects, completedProjects, totalRevenue, statusBreakdown, projects })
    } catch {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const statusColors: Record<string, string> = {
    LEAD: 'bg-ink-100 text-ink-700',
    QUESTIONNAIRE_SENT: 'bg-sand-100 text-sand-700',
    QUESTIONNAIRE_COMPLETED: 'bg-sage-100 text-sage-700',
    PROPOSAL_SENT: 'bg-clay-100 text-clay-700',
    PROPOSAL_ACCEPTED: 'bg-sage-100 text-sage-700',
    CONTRACT_SENT: 'bg-sand-100 text-sand-700',
    CONTRACT_SIGNED: 'bg-sage-100 text-sage-700',
    DEPOSIT_PAID: 'bg-sage-100 text-sage-700',
    FULLY_PAID: 'bg-sage-600 text-white',
    COMPLETED: 'bg-ink-900 text-white',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-ink-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-sand-200 hidden lg:flex flex-col">
        <div className="p-5 border-b border-sand-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-card bg-ink-900 text-white flex items-center justify-center">
              <LayoutDashboard size={16} />
            </div>
            <span className="font-semibold text-ink-900">TrustOS</span>
          </div>
          <p className="text-xs text-ink-400 mt-1">{user?.vendorProfile?.businessName || 'Vendor'}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link href="/vendor" className="flex items-center gap-2 px-3 py-2 rounded-card text-sm font-medium text-ink-600 hover:bg-sand-50">
            <Briefcase size={16} /> Projects
          </Link>
          <Link href="/vendor/templates" className="flex items-center gap-2 px-3 py-2 rounded-card text-sm font-medium text-ink-600 hover:bg-sand-50">
            <Palette size={16} /> Templates
          </Link>
          <Link href="/vendor/analytics" className="flex items-center gap-2 px-3 py-2 rounded-card text-sm font-medium bg-sand-100 text-ink-900">
            <BarChart3 size={16} /> Analytics
          </Link>
        </nav>
        <div className="p-3 border-t border-sand-200">
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-card text-sm text-ink-500 hover:bg-sand-50 w-full">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden bg-white border-b border-sand-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink-900">Analytics</span>
          <button onClick={logout} className="text-sm text-ink-500">Sign Out</button>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:ml-64 p-4 sm:p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-ink-900">Analytics</h1>
          <p className="text-sm text-ink-500">Track your bookings, conversions, and revenue</p>
        </div>

        {stats && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="card p-4">
                <p className="text-xs text-ink-500 uppercase tracking-wide">Total Projects</p>
                <p className="text-2xl font-bold text-ink-900 mt-1">{stats.totalProjects}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight size={12} className="text-sage-500" />
                  <span className="text-xs text-sage-600">All time</span>
                </div>
              </div>
              <div className="card p-4">
                <p className="text-xs text-ink-500 uppercase tracking-wide">Active</p>
                <p className="text-2xl font-bold text-ink-900 mt-1">{stats.activeProjects}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-ink-400">In progress</span>
                </div>
              </div>
              <div className="card p-4">
                <p className="text-xs text-ink-500 uppercase tracking-wide">Completed</p>
                <p className="text-2xl font-bold text-ink-900 mt-1">{stats.completedProjects}</p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle size={12} className="text-sage-500" />
                  <span className="text-xs text-sage-600">Finished</span>
                </div>
              </div>
              <div className="card p-4">
                <p className="text-xs text-ink-500 uppercase tracking-wide">Revenue</p>
                <p className="text-2xl font-bold text-sage-600 mt-1">£{stats.totalRevenue.toFixed(2)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <PoundSterling size={12} className="text-sage-500" />
                  <span className="text-xs text-sage-600">Fully paid</span>
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="card mb-6">
              <h2 className="text-sm font-semibold text-ink-900 mb-4">Project Status Breakdown</h2>
              <div className="space-y-3">
                {Object.entries(stats.statusBreakdown).map(([status, count]: [string, any]) => {
                  const pct = stats.totalProjects > 0 ? Math.round((count / stats.totalProjects) * 100) : 0
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-chip text-xs font-medium w-32 text-center ${statusColors[status] || 'bg-sand-100 text-sand-700'}`}>
                        {status.replace(/_/g, ' ')}
                      </span>
                      <div className="flex-1">
                        <div className="h-2 bg-sand-100 rounded-full overflow-hidden">
                          <div className="h-full bg-sage-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-ink-700 w-8 text-right">{count}</span>
                      <span className="text-xs text-ink-400 w-8">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent Projects */}
            <div className="card">
              <h2 className="text-sm font-semibold text-ink-900 mb-4">Recent Projects</h2>
              <div className="space-y-3">
                {stats.projects.slice(0, 5).map((project: any) => (
                  <div key={project.id} className="flex items-center justify-between p-2 rounded-card hover:bg-sand-50 transition">
                    <div>
                      <p className="text-sm font-medium text-ink-700">{project.title}</p>
                      <p className="text-xs text-ink-400">{project.client?.name || 'No client'} • {new Date(project.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-chip text-xs font-medium ${statusColors[project.status] || 'bg-sand-100 text-sand-700'}`}>
                      {project.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
