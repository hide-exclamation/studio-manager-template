import { Header } from '@/components/layout/Header'
import { prisma } from '@/lib/prisma'
import { getSettings, DEFAULTS } from '@/lib/settings'
import Link from 'next/link'
import {
  FolderKanban,
  FileText,
  Receipt,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Wallet,
} from 'lucide-react'

export default async function DashboardPage() {
  // Récupérer les settings
  const settings = await getSettings()
  const companyName = settings.companyName || DEFAULTS.companyName

  // Récupérer les données
  const [
    activeProjects,
    pendingQuotes,
    allInvoices,
    recentProjects,
    recentExpenses,
  ] = await Promise.all([
    // Projets actifs
    prisma.project.count({
      where: { status: 'ACTIVE' }
    }),
    // Devis en attente (envoyés mais pas encore acceptés/refusés)
    prisma.quote.count({
      where: { status: { in: ['SENT', 'VIEWED'] } }
    }),
    // Toutes les factures pour calculs
    prisma.invoice.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: {
        project: {
          include: {
            client: { select: { code: true, companyName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // Projets récents
    prisma.project.findMany({
      where: { status: { in: ['ACTIVE', 'PAUSED'] } },
      include: {
        client: { select: { code: true, companyName: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    }),
    // Dépenses récentes (ce mois)
    prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      include: {
        category: true,
        project: {
          select: { name: true }
        }
      },
      orderBy: { date: 'desc' },
      take: 5
    }),
  ])

  // Calculs des factures
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const unpaidInvoices = allInvoices.filter(inv =>
    inv.status !== 'PAID' && inv.status !== 'CANCELLED'
  )

  const overdueInvoices = unpaidInvoices.filter(inv =>
    new Date(inv.dueDate) < now
  )

  const pendingInvoices = unpaidInvoices
    .sort((a, b) => {
      // Mettre les retards en premier
      const aOverdue = new Date(a.dueDate) < now
      const bOverdue = new Date(b.dueDate) < now
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
    .slice(0, 5)

  // Revenus
  const paidInvoices = allInvoices.filter(inv => inv.status === 'PAID')

  const revenueThisMonth = paidInvoices
    .filter(inv => inv.paymentDate && new Date(inv.paymentDate) >= startOfMonth)
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  const revenueThisYear = paidInvoices
    .filter(inv => inv.paymentDate && new Date(inv.paymentDate) >= startOfYear)
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  // Revenus par mois (12 derniers mois)
  const monthlyRevenue: { month: string; revenue: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthName = date.toLocaleDateString('fr-CA', { month: 'short' })

    const revenue = paidInvoices
      .filter(inv => {
        if (!inv.paymentDate) return false
        const payDate = new Date(inv.paymentDate)
        return payDate >= date && payDate <= endDate
      })
      .reduce((sum, inv) => sum + Number(inv.total), 0)

    monthlyRevenue.push({ month: monthName, revenue })
  }

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1)

  // Calcul dépenses du mois
  const expensesThisMonth = recentExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

  // Répartition des factures par statut
  const invoicesByStatus = {
    DRAFT: allInvoices.filter(inv => inv.status === 'DRAFT').length,
    SENT: allInvoices.filter(inv => inv.status === 'SENT').length,
    PAID: allInvoices.filter(inv => inv.status === 'PAID').length,
    OVERDUE: allInvoices.filter(inv => inv.status === 'OVERDUE' || (inv.status === 'SENT' && new Date(inv.dueDate) < now)).length,
  }
  const totalInvoices = Object.values(invoicesByStatus).reduce((a, b) => a + b, 0)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(amount)

  const formatDate = (date: Date) =>
    date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })

  // Stats cards
  const stats = [
    { label: 'Projets actifs', value: activeProjects.toString(), icon: FolderKanban, color: 'var(--color-accent-lavender)' },
    { label: 'Devis en attente', value: pendingQuotes.toString(), icon: FileText, color: 'var(--color-status-warning)' },
    { label: 'Factures impayées', value: unpaidInvoices.length.toString(), icon: Receipt, color: overdueInvoices.length > 0 ? 'var(--color-status-error)' : 'var(--color-accent-rose)' },
    { label: 'Revenus ce mois', value: formatCurrency(revenueThisMonth), icon: TrendingUp, color: 'var(--color-status-success)' },
    { label: 'Dépenses ce mois', value: formatCurrency(expensesThisMonth), icon: Wallet, color: 'var(--color-status-info)' },
  ]

  return (
    <div className="min-h-screen">
      <Header
        title="Tableau de bord"
        subtitle={`Vue d'ensemble de ${companyName}`}
      />

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-5 rounded-xl"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)'
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="text-sm mb-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {stat.label}
                  </p>
                  <p
                    className="text-2xl"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {stat.value}
                  </p>
                </div>
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <stat.icon size={20} style={{ color: stat.color }} strokeWidth={1.5} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Chart + Invoice Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart */}
          <div
            className="lg:col-span-2 rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-base"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-text-primary)'
                }}
              >
                Revenus (12 derniers mois)
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Total: {formatCurrency(revenueThisYear)}
              </p>
            </div>

            <div className="flex items-end gap-2 h-40">
              {monthlyRevenue.map((month, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${Math.max((month.revenue / maxRevenue) * 100, 4)}%`,
                      backgroundColor: i === 11 ? 'var(--color-accent-lavender)' : 'var(--color-border-light)',
                      minHeight: '4px',
                    }}
                    title={formatCurrency(month.revenue)}
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {month.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Status Breakdown */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)'
            }}
          >
            <h2
              className="text-base mb-4"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-text-primary)'
              }}
            >
              Factures
            </h2>

            <div className="space-y-3">
              {[
                { label: 'Brouillons', count: invoicesByStatus.DRAFT, icon: Clock, color: 'var(--color-text-muted)' },
                { label: 'Envoyées', count: invoicesByStatus.SENT, icon: Send, color: 'var(--color-status-info)' },
                { label: 'En retard', count: invoicesByStatus.OVERDUE, icon: AlertCircle, color: 'var(--color-status-error)' },
                { label: 'Payées', count: invoicesByStatus.PAID, icon: CheckCircle2, color: 'var(--color-status-success)' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <item.icon size={16} style={{ color: item.color }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.label}
                      </span>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {item.count}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: totalInvoices > 0 ? `${(item.count / totalInvoices) * 100}%` : '0%',
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Two columns: Projects + Invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)'
            }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
              <h2
                className="text-base"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-text-primary)'
                }}
              >
                Projets actifs
              </h2>
              <Link
                href="/projets"
                className="text-sm hover:underline"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Voir tout
              </Link>
            </div>

            {recentProjects.length > 0 ? (
              <div className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projets/${project.id}`}
                    className="px-5 py-4 flex items-center justify-between hover:bg-black/5 transition-colors block"
                  >
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {project.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {project.client.companyName}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: project.status === 'ACTIVE'
                          ? 'rgba(34, 197, 94, 0.1)'
                          : 'rgba(245, 158, 11, 0.1)',
                        color: project.status === 'ACTIVE'
                          ? 'var(--color-status-success)'
                          : 'var(--color-status-warning)'
                      }}
                    >
                      {project.status === 'ACTIVE' ? 'En cours' : 'En pause'}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <FolderKanban size={24} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Aucun projet actif
                </p>
              </div>
            )}
          </div>

          {/* Pending Invoices */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)'
            }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
              <h2
                className="text-base"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-text-primary)'
                }}
              >
                Factures en attente
              </h2>
              <Link
                href="/factures"
                className="text-sm hover:underline"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Voir tout
              </Link>
            </div>

            {pendingInvoices.length > 0 ? (
              <div className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
                {pendingInvoices.map((invoice) => {
                  const isOverdue = new Date(invoice.dueDate) < now
                  return (
                    <Link
                      key={invoice.id}
                      href={`/factures/${invoice.id}`}
                      className="px-5 py-4 flex items-center justify-between hover:bg-black/5 transition-colors block"
                    >
                      <div className="flex items-center gap-3">
                        {isOverdue && (
                          <AlertCircle
                            size={16}
                            style={{ color: 'var(--color-status-error)' }}
                          />
                        )}
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {invoice.invoiceNumber}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {invoice.project.client.companyName} · Éch. {formatDate(invoice.dueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {formatCurrency(Number(invoice.total))}
                        </p>
                        <span
                          className="text-xs"
                          style={{
                            color: isOverdue
                              ? 'var(--color-status-error)'
                              : 'var(--color-status-warning)'
                          }}
                        >
                          {isOverdue ? 'En retard' : 'Envoyée'}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 size={24} className="mx-auto mb-2" style={{ color: 'var(--color-status-success)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Aucune facture en attente
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
