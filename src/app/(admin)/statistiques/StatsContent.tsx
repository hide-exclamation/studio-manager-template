'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  FileText,
  Users,
  FolderKanban,
  Clock,
  AlertCircle,
  Download,
  Calendar,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts'

interface StatsData {
  period: string
  summary: {
    totalRevenue: number
    totalExpenses: number
    grossProfit: number
    profitMargin: number
    avgQuoteValue: number
    conversionRate: number
    avgPaymentDelay: number
    overdueRate: number
    overdueAmount: number
    totalProjects: number
    totalClients: number
    totalQuotes: number
    totalInvoices: number
  }
  charts: {
    revenueByMonth: { month: string; revenue: number; expenses: number }[]
    revenueByCategory: { name: string; value: number; color: string }[]
    expensesByCategory: { name: string; value: number; color: string }[]
    invoicesByStatus: Record<string, number>
    projectsByStatus: Record<string, number>
  }
  tables: {
    topClients: { id: string; name: string; revenue: number; projectCount: number }[]
    projectProfitability: {
      id: string
      name: string
      client: string
      category: string
      revenue: number
      expenses: number
      profit: number
      margin: number
    }[]
  }
}

const PERIODS = [
  { value: '3months', label: '3 mois' },
  { value: '6months', label: '6 mois' },
  { value: '12months', label: '12 mois' },
  { value: 'ytd', label: 'Cette année' },
  { value: 'all', label: 'Tout' },
]

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(amount)

const formatPercent = (value: number) =>
  `${value.toFixed(1)}%`

export function StatsContent() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('12months')
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'clients' | 'projects'>('overview')

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats?period=${period}`)
      const data = await res.json()
      if (!res.ok) {
        console.error('Stats API error:', data)
        throw new Error(data.error || 'Erreur API')
      }
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!stats) return

    // Créer le CSV des top clients
    const headers = ['Client', 'Revenus', 'Projets']
    const rows = stats.tables.topClients.map(c => [
      c.name,
      c.revenue.toString(),
      c.projectCount.toString()
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statistiques-${period}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
        <p>Erreur lors du chargement des statistiques</p>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'financial', label: 'Finances' },
    { id: 'clients', label: 'Clients' },
    { id: 'projects', label: 'Projets' },
  ]

  return (
    <div className="p-6">
      {/* Header avec filtres */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--color-bg-tertiary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} style={{ color: 'var(--color-text-muted)' }} />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm rounded-lg px-3 py-2"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            >
              {PERIODS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-black/5"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Download size={16} />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Contenu selon l'onglet */}
      {activeTab === 'overview' && <OverviewTab stats={stats} />}
      {activeTab === 'financial' && <FinancialTab stats={stats} />}
      {activeTab === 'clients' && <ClientsTab stats={stats} />}
      {activeTab === 'projects' && <ProjectsTab stats={stats} />}
    </div>
  )
}

// ===== ONGLET VUE D'ENSEMBLE =====
function OverviewTab({ stats }: { stats: StatsData }) {
  const kpis = [
    {
      label: 'Revenus totaux',
      value: formatCurrency(stats.summary.totalRevenue),
      icon: DollarSign,
      color: 'var(--color-status-success)',
      trend: stats.summary.profitMargin > 0 ? 'up' : 'down',
    },
    {
      label: 'Profit brut',
      value: formatCurrency(stats.summary.grossProfit),
      icon: TrendingUp,
      color: stats.summary.grossProfit > 0 ? 'var(--color-status-success)' : 'var(--color-status-error)',
      subtitle: `${formatPercent(stats.summary.profitMargin)} de marge`,
    },
    {
      label: 'Dépenses',
      value: formatCurrency(stats.summary.totalExpenses),
      icon: Receipt,
      color: 'var(--color-status-warning)',
    },
    {
      label: 'Taux de conversion',
      value: formatPercent(stats.summary.conversionRate),
      icon: FileText,
      color: 'var(--color-accent-lavender)',
      subtitle: 'Devis → Acceptés',
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="p-5 rounded-xl"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {kpi.label}
                </p>
                <p
                  className="text-2xl"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {kpi.value}
                </p>
                {kpi.subtitle && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {kpi.subtitle}
                  </p>
                )}
              </div>
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${kpi.color}20` }}
              >
                <kpi.icon size={20} style={{ color: kpi.color }} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Graphique revenus vs dépenses */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <h3
          className="text-base mb-4"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
          }}
        >
          Revenus vs Dépenses
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.charts.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border-light)' }}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--color-border-light)' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: '8px',
                }}
                formatter={(value) => formatCurrency(value as number)}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenus"
                stroke="#22C55E"
                fill="#22C55E"
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Dépenses"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Deux colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition revenus par catégorie */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <h3
            className="text-base mb-4"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
            }}
          >
            Revenus par catégorie
          </h3>
          {stats.charts.revenueByCategory.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.charts.revenueByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {stats.charts.revenueByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Aucune donnée disponible
              </p>
            </div>
          )}
        </div>

        {/* Métriques additionnelles */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <h3
            className="text-base mb-4"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
            }}
          >
            Indicateurs clés
          </h3>
          <div className="space-y-4">
            <MetricRow
              label="Valeur moyenne des devis"
              value={formatCurrency(stats.summary.avgQuoteValue)}
              icon={FileText}
            />
            <MetricRow
              label="Délai moyen de paiement"
              value={`${stats.summary.avgPaymentDelay} jours`}
              icon={Clock}
            />
            <MetricRow
              label="Taux de factures en retard"
              value={formatPercent(stats.summary.overdueRate)}
              icon={AlertCircle}
              color={stats.summary.overdueRate > 10 ? 'var(--color-status-error)' : undefined}
            />
            <MetricRow
              label="Montant en retard"
              value={formatCurrency(stats.summary.overdueAmount)}
              icon={Receipt}
              color={stats.summary.overdueAmount > 0 ? 'var(--color-status-error)' : undefined}
            />
            <MetricRow
              label="Projets"
              value={stats.summary.totalProjects.toString()}
              icon={FolderKanban}
            />
            <MetricRow
              label="Clients actifs"
              value={stats.summary.totalClients.toString()}
              icon={Users}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== ONGLET FINANCES =====
function FinancialTab({ stats }: { stats: StatsData }) {
  return (
    <div className="space-y-6">
      {/* Graphique revenus mensuels */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <h3
          className="text-base mb-4"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
          }}
        >
          Revenus mensuels
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.charts.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: '8px',
                }}
                formatter={(value) => formatCurrency(value as number)}
              />
              <Bar dataKey="revenue" name="Revenus" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Deux colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dépenses par catégorie */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <h3
            className="text-base mb-4"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
            }}
          >
            Dépenses par catégorie
          </h3>
          {stats.charts.expensesByCategory.length > 0 ? (
            <div className="space-y-3">
              {stats.charts.expensesByCategory.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {cat.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {formatCurrency(cat.value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              Aucune dépense
            </p>
          )}
        </div>

        {/* Factures par statut */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <h3
            className="text-base mb-4"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
            }}
          >
            Factures par statut
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.charts.invoicesByStatus).map(([status, count]) => {
              const statusConfig: Record<string, { label: string; color: string }> = {
                DRAFT: { label: 'Brouillons', color: 'var(--color-text-muted)' },
                SENT: { label: 'Envoyées', color: 'var(--color-status-info)' },
                PAID: { label: 'Payées', color: 'var(--color-status-success)' },
                OVERDUE: { label: 'En retard', color: 'var(--color-status-error)' },
              }
              const config = statusConfig[status] || { label: status, color: '#666' }
              const total = Object.values(stats.charts.invoicesByStatus).reduce((a, b) => a + b, 0)
              const percent = total > 0 ? (count / total) * 100 : 0

              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {config.label}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {count}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== ONGLET CLIENTS =====
function ClientsTab({ stats }: { stats: StatsData }) {
  return (
    <div className="space-y-6">
      {/* Top clients */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
          <h3
            className="text-base"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
            }}
          >
            Top clients par revenus
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Client
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Revenus
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Projets
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Moy/Projet
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
              {stats.tables.topClients.length > 0 ? (
                stats.tables.topClients.map((client, index) => (
                  <tr key={client.id} className="hover:bg-black/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                          style={{
                            backgroundColor: 'var(--color-accent-lavender)',
                            color: 'white',
                          }}
                        >
                          {index + 1}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {client.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(client.revenue)}
                    </td>
                    <td className="px-6 py-4 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                      {client.projectCount}
                    </td>
                    <td className="px-6 py-4 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatCurrency(client.projectCount > 0 ? client.revenue / client.projectCount : 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Aucun client avec des revenus
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ===== ONGLET PROJETS =====
function ProjectsTab({ stats }: { stats: StatsData }) {
  return (
    <div className="space-y-6">
      {/* Projets par statut */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(stats.charts.projectsByStatus).map(([status, count]) => {
          const statusConfig: Record<string, { label: string; color: string }> = {
            PROSPECT: { label: 'Prospects', color: 'var(--color-status-info)' },
            ACTIVE: { label: 'En cours', color: 'var(--color-status-success)' },
            PAUSED: { label: 'En pause', color: 'var(--color-status-warning)' },
            COMPLETED: { label: 'Terminés', color: 'var(--color-accent-lavender)' },
            CANCELLED: { label: 'Annulés', color: 'var(--color-status-error)' },
          }
          const config = statusConfig[status] || { label: status, color: '#666' }

          return (
            <div
              key={status}
              className="p-4 rounded-xl text-center"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <p className="text-2xl font-semibold" style={{ color: config.color }}>
                {count}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {config.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Rentabilité des projets */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
          <h3
            className="text-base"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
            }}
          >
            Rentabilité des projets
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Projet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Client
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Revenus
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Dépenses
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Profit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Marge
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
              {stats.tables.projectProfitability.length > 0 ? (
                stats.tables.projectProfitability.map((project) => (
                  <tr key={project.id} className="hover:bg-black/5 transition-colors">
                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {project.name}
                    </td>
                    <td className="px-6 py-4" style={{ color: 'var(--color-text-secondary)' }}>
                      {project.client}
                    </td>
                    <td className="px-6 py-4 text-right" style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(project.revenue)}
                    </td>
                    <td className="px-6 py-4 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatCurrency(project.expenses)}
                    </td>
                    <td
                      className="px-6 py-4 text-right font-medium"
                      style={{
                        color: project.profit >= 0 ? 'var(--color-status-success)' : 'var(--color-status-error)',
                      }}
                    >
                      {formatCurrency(project.profit)}
                    </td>
                    <td
                      className="px-6 py-4 text-right"
                      style={{
                        color: project.margin >= 50 ? 'var(--color-status-success)' : project.margin >= 20 ? 'var(--color-status-warning)' : 'var(--color-status-error)',
                      }}
                    >
                      {formatPercent(project.margin)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Aucun projet avec des revenus
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Composant helper pour les métriques
function MetricRow({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>
  color?: string
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Icon size={18} style={{ color: color || 'var(--color-text-muted)' }} />
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      </div>
      <span
        className="text-sm font-medium"
        style={{ color: color || 'var(--color-text-primary)' }}
      >
        {value}
      </span>
    </div>
  )
}
