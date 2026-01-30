'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Trash2,
  ExternalLink,
  Building2,
  User,
  Mail,
  FileText,
  Receipt,
  Plus,
  Calendar,
  AlertTriangle,
  CheckSquare,
  Wallet,
  LayoutDashboard,
} from 'lucide-react'
import { CreateInvoiceFromProjectModal } from './CreateInvoiceFromProjectModal'
import { useToast, useConfirm } from '@/components/ui'
import { TaskList } from '@/components/tasks'

type Quote = {
  id: string
  quoteNumber: string
  status: string
  total: any
  depositPercent: any
  createdAt: string
  sections: Array<{
    items: Array<{
      id: string
      name: string
      includeInTotal: boolean
      isSelected: boolean
    }>
  }>
}

type Invoice = {
  id: string
  invoiceNumber: string
  status: string
  subtotal: any
  total: any
  amountPaid: any
  dueDate: string
  lateFeeApplied: boolean
  lateFeeAmount: any
}

type Expense = {
  id: string
  description: string
  amount: string
  date: string
  vendor: string | null
  isBillable: boolean
  isBilled: boolean
  category: {
    id: string
    name: string
    color: string | null
  }
}

type Project = {
  id: string
  projectNumber: number
  name: string
  description: string | null
  status: 'PROSPECT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  startDate: string | null
  endDate: string | null
  googleDriveUrl: string | null
  client: {
    id: string
    code: string
    companyName: string
    contacts: { name: string; email: string | null }[]
  }
  quotes: Quote[]
  invoices: Invoice[]
  expenses: Expense[]
}

const statusLabels = {
  PROSPECT: 'Prospect',
  ACTIVE: 'En cours',
  PAUSED: 'En pause',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
}

const statusColors = {
  PROSPECT: { bg: 'rgba(91, 74, 138, 0.2)', text: '#4a3d6e' },
  ACTIVE: { bg: 'rgba(22, 163, 74, 0.15)', text: '#15803d' },
  PAUSED: { bg: 'rgba(202, 138, 4, 0.15)', text: '#a16207' },
  COMPLETED: { bg: 'rgba(37, 99, 235, 0.15)', text: '#1d4ed8' },
  CANCELLED: { bg: 'rgba(115, 115, 115, 0.15)', text: '#525252' },
}

const quoteStatusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  VIEWED: 'Consulté',
  ACCEPTED: 'Accepté',
  REFUSED: 'Refusé',
  EXPIRED: 'Expiré',
}

const invoiceStatusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
}

type Tab = 'apercu' | 'finances' | 'taches'

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'apercu', label: 'Aperçu', icon: LayoutDashboard },
  { id: 'finances', label: 'Finances', icon: Wallet },
  { id: 'taches', label: 'Tâches', icon: CheckSquare },
]

export function ProjectDetail({ project: initialProject, projectCode }: { project: Project; projectCode: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const confirm = useConfirm()
  const [project, setProject] = useState(initialProject)
  const [deleting, setDeleting] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  const currentTab = (searchParams.get('tab') as Tab) || 'apercu'

  const setTab = (tab: Tab) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    router.push(url.pathname + url.search)
  }

  // Devis acceptés pour la création de factures
  const acceptedQuotes = project.quotes.filter(q => q.status === 'ACCEPTED')

  // Calculs financiers
  const totalQuoted = project.quotes
    .filter((q) => q.status === 'ACCEPTED')
    .reduce((sum, q) => sum + Number(q.total), 0)

  const totalInvoiced = project.invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
  const totalPaid = project.invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0)

  // Calcul des dépenses
  const totalExpenses = project.expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const billableExpenses = project.expenses.filter(e => e.isBillable).reduce((sum, e) => sum + Number(e.amount), 0)

  // Frais de retard
  const LATE_FEE_RATE = 0.02
  const LATE_FEE_DAYS = 30

  const getOverdueInvoices = () => {
    const today = new Date()
    return project.invoices
      .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
      .map(inv => {
        const dueDate = new Date(inv.dueDate)
        const diffTime = today.getTime() - dueDate.getTime()
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        return { ...inv, daysOverdue: Math.max(0, daysOverdue) }
      })
      .filter(inv => inv.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
  }

  const overdueInvoices = getOverdueInvoices()

  const applyLateFee = async (invoiceId: string, subtotal: number) => {
    const lateFee = Number(subtotal) * LATE_FEE_RATE
    const confirmed = await confirm({
      title: 'Appliquer les frais de retard',
      message: `Des frais de ${formatCurrency(lateFee)} (2% du sous-total) seront ajoutés.`,
      confirmText: 'Appliquer',
      variant: 'warning',
    })
    if (!confirmed) return

    try {
      const invoice = project.invoices.find(i => i.id === invoiceId)
      if (!invoice) return

      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lateFeeApplied: true,
          lateFeeAmount: lateFee,
          total: Number(invoice.total) + lateFee,
        }),
      })

      if (res.ok) {
        setProject(prev => ({
          ...prev,
          invoices: prev.invoices.map(inv =>
            inv.id === invoiceId
              ? { ...inv, lateFeeApplied: true, lateFeeAmount: lateFee.toString(), total: (Number(inv.total) + lateFee).toString() }
              : inv
          ),
        }))
      }
    } catch (error) {
      console.error('Error applying late fee:', error)
    }
  }

  const removeLateFee = async (invoiceId: string) => {
    const confirmed = await confirm({
      title: 'Retirer les frais de retard',
      message: 'Les frais de retard seront retirés de la facture.',
      confirmText: 'Retirer',
      variant: 'warning',
    })
    if (!confirmed) return

    try {
      const invoice = project.invoices.find(i => i.id === invoiceId)
      if (!invoice) return

      const lateFee = Number(invoice.lateFeeAmount)
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lateFeeApplied: false,
          lateFeeAmount: 0,
          total: Number(invoice.total) - lateFee,
        }),
      })

      if (res.ok) {
        setProject(prev => ({
          ...prev,
          invoices: prev.invoices.map(inv =>
            inv.id === invoiceId
              ? { ...inv, lateFeeApplied: false, lateFeeAmount: '0', total: (Number(inv.total) - lateFee).toString() }
              : inv
          ),
        }))
      }
    } catch (error) {
      console.error('Error removing late fee:', error)
    }
  }

  const handleDelete = async (force = false) => {
    if (!force) {
      const confirmed = await confirm({
        title: 'Supprimer le projet',
        message: 'Êtes-vous sûr de vouloir supprimer ce projet ?',
        confirmText: 'Supprimer',
        variant: 'danger',
      })
      if (!confirmed) return
    }

    setDeleting(true)
    try {
      const url = force
        ? `/api/projects/${project.id}?force=true`
        : `/api/projects/${project.id}`
      const res = await fetch(url, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()

        if (data.requiresConfirmation) {
          const { counts } = data
          const details = []
          if (counts.quotes > 0) details.push(`${counts.quotes} devis`)
          if (counts.invoices > 0) details.push(`${counts.invoices} facture(s)`)

          const confirmForce = await confirm({
            title: 'Supprimer définitivement',
            message: `Ce projet contient: ${details.join(', ')}. Tout sera supprimé définitivement.`,
            confirmText: 'Supprimer tout',
            variant: 'danger',
          })

          if (confirmForce) {
            await handleDelete(true)
          }
          return
        }

        toast.error(data.error)
        return
      }
      router.push('/projets')
      router.refresh()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const primaryContact = project.client.contacts[0]

  return (
    <div className="p-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/projets"
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={16} />
          Retour aux projets
        </Link>

        <div className="flex items-center gap-2">
          {project.googleDriveUrl && (
            <a
              href={project.googleDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <ExternalLink size={16} />
              Google Drive
            </a>
          )}

          <Link
            href={`/projets/${project.id}/modifier`}
            className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Edit size={16} />
            Modifier
          </Link>

          <button
            onClick={() => handleDelete()}
            disabled={deleting}
            className="btn-danger flex items-center gap-2 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-status-error)',
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Project Header */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-sm font-medium"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
              }}
            >
              {projectCode}
            </div>
            <div>
              <h1
                className="text-xl mb-1"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                {project.name}
              </h1>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: statusColors[project.status].bg,
                    color: statusColors[project.status].text,
                  }}
                >
                  {statusLabels[project.status]}
                </span>
                {project.startDate && (
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Calendar size={12} />
                    {formatDate(project.startDate)}
                    {project.endDate && ` → ${formatDate(project.endDate)}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 mb-6 p-1 rounded-lg"
        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: currentTab === tab.id ? 'var(--color-bg-secondary)' : 'transparent',
              color: currentTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              boxShadow: currentTab === tab.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {currentTab === 'apercu' && (
        <div className="space-y-6">
          {/* Alertes */}
          {overdueInvoices.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                  >
                    <AlertTriangle size={20} style={{ color: 'var(--color-status-error)' }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {overdueInvoices.length} facture{overdueInvoices.length > 1 ? 's' : ''} en retard
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {formatCurrency(overdueInvoices.reduce((sum, inv) => sum + Number(inv.total) - Number(inv.amountPaid), 0))} en attente de paiement
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTab('finances')}
                  className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: 'var(--color-status-error)',
                  }}
                >
                  Voir les détails
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Description */}
          {project.description && (
            <div
              className="lg:col-span-2 rounded-xl p-6"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <h3
                className="text-base mb-3"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Description
              </h3>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                {project.description}
              </p>
            </div>
          )}

          {/* Client */}
          <div
            className={`rounded-xl p-6 ${project.description ? '' : 'lg:col-span-2'}`}
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <h3
              className="text-base mb-3"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
            >
              Client
            </h3>
            <Link
              href={`/clients/${project.client.id}`}
              className="flex items-center gap-4 p-3 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {project.client.code}
              </div>
              <div className="flex-1">
                <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {project.client.companyName}
                </span>
                {primaryContact && (
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {primaryContact.name}
                    </span>
                    {primaryContact.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} />
                        {primaryContact.email}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Building2 size={18} style={{ color: 'var(--color-text-muted)' }} />
            </Link>
          </div>

          {/* Financial Summary */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <h3
              className="text-base mb-4"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
            >
              Résumé financier
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Devisé</span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(totalQuoted)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Facturé</span>
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatCurrency(totalInvoiced)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Payé</span>
                <span className="font-medium" style={{ color: 'var(--color-status-success)' }}>
                  {formatCurrency(totalPaid)}
                </span>
              </div>
              {totalInvoiced - totalPaid > 0 && (
                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>En attente</span>
                  <span className="font-medium" style={{ color: 'var(--color-status-warning)' }}>
                    {formatCurrency(totalInvoiced - totalPaid)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Document counts */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <h3
              className="text-base mb-4"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
            >
              Documents
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => setTab('finances')}
                className="btn-ghost w-full flex items-center justify-between p-2 rounded-lg"
              >
                <span className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <FileText size={16} />
                  Devis
                </span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {project.quotes.length}
                </span>
              </button>
              <button
                onClick={() => setTab('finances')}
                className="btn-ghost w-full flex items-center justify-between p-2 rounded-lg"
              >
                <span className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <Receipt size={16} />
                  Factures
                </span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {project.invoices.length}
                </span>
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {currentTab === 'finances' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quotes */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-base"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Devis
              </h3>
              <Link
                href={`/devis/nouveau?projet=${project.id}`}
                className="btn-ghost flex items-center gap-1.5 text-sm px-2 py-1 rounded"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Plus size={14} />
                Nouveau
              </Link>
            </div>

            {project.quotes.length > 0 ? (
              <div className="space-y-2">
                {project.quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/devis/${quote.id}`}
                    className="flex items-center justify-between p-3 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={16} style={{ color: 'var(--color-text-muted)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {quote.quoteNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatCurrency(Number(quote.total))}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            quote.status === 'ACCEPTED'
                              ? 'rgba(34, 197, 94, 0.1)'
                              : quote.status === 'REFUSED'
                              ? 'rgba(239, 68, 68, 0.1)'
                              : 'rgba(163, 163, 163, 0.1)',
                          color:
                            quote.status === 'ACCEPTED'
                              ? 'var(--color-status-success)'
                              : quote.status === 'REFUSED'
                              ? 'var(--color-status-error)'
                              : 'var(--color-text-muted)',
                        }}
                      >
                        {quoteStatusLabels[quote.status] || quote.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText size={28} strokeWidth={1} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Aucun devis
                </p>
              </div>
            )}
          </div>

          {/* Invoices */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-base"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Factures
              </h3>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="btn-ghost flex items-center gap-1.5 text-sm px-2 py-1 rounded"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Plus size={14} />
                Nouvelle
              </button>
            </div>

            {project.invoices.length > 0 ? (
              <div className="space-y-2">
                {project.invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/factures/${invoice.id}`}
                    className="flex items-center justify-between p-3 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <Receipt size={16} style={{ color: 'var(--color-text-muted)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {invoice.invoiceNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatCurrency(Number(invoice.total))}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            invoice.status === 'PAID'
                              ? 'rgba(34, 197, 94, 0.1)'
                              : invoice.status === 'OVERDUE'
                              ? 'rgba(239, 68, 68, 0.1)'
                              : 'rgba(163, 163, 163, 0.1)',
                          color:
                            invoice.status === 'PAID'
                              ? 'var(--color-status-success)'
                              : invoice.status === 'OVERDUE'
                              ? 'var(--color-status-error)'
                              : 'var(--color-text-muted)',
                        }}
                      >
                        {invoiceStatusLabels[invoice.status] || invoice.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt size={28} strokeWidth={1} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Aucune facture
                </p>
              </div>
            )}
          </div>

          {/* Overdue Invoices Alert */}
          {overdueInvoices.length > 0 && (
            <div
              className="lg:col-span-2 rounded-xl p-5"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} style={{ color: 'var(--color-status-warning)' }} />
                <h3
                  className="text-base"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
                >
                  Factures en retard
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overdueInvoices.map((invoice) => {
                  const isEligibleForLateFee = invoice.daysOverdue >= LATE_FEE_DAYS && !invoice.lateFeeApplied
                  const calculatedLateFee = Number(invoice.subtotal) * LATE_FEE_RATE

                  return (
                    <div
                      key={invoice.id}
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Link
                          href={`/factures/${invoice.id}`}
                          className="text-sm font-medium hover:underline"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: invoice.lateFeeApplied ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.15)',
                            color: invoice.lateFeeApplied ? 'var(--color-status-error)' : 'var(--color-status-warning)',
                          }}
                        >
                          {invoice.daysOverdue} jour{invoice.daysOverdue > 1 ? 's' : ''} de retard
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                        <span>Solde: {formatCurrency(Number(invoice.total) - Number(invoice.amountPaid))}</span>
                        {invoice.lateFeeApplied ? (
                          <span style={{ color: 'var(--color-status-error)' }}>
                            Frais: {formatCurrency(Number(invoice.lateFeeAmount))}
                          </span>
                        ) : invoice.daysOverdue < LATE_FEE_DAYS ? (
                          <span>Frais dans {LATE_FEE_DAYS - invoice.daysOverdue}j</span>
                        ) : null}
                      </div>

                      <div>
                        {invoice.lateFeeApplied ? (
                          <button
                            onClick={() => removeLateFee(invoice.id)}
                            className="btn-secondary text-xs px-2.5 py-1 rounded transition-colors"
                            style={{
                              backgroundColor: 'var(--color-bg-tertiary)',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            Retirer les frais
                          </button>
                        ) : isEligibleForLateFee ? (
                          <button
                            onClick={() => applyLateFee(invoice.id, invoice.subtotal)}
                            className="btn-primary text-xs px-2.5 py-1 rounded font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--color-status-warning)',
                              color: 'white',
                            }}
                          >
                            Appliquer 2% ({formatCurrency(calculatedLateFee)})
                          </button>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            Frais applicables après 30 jours
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Expenses */}
          <div
            className="lg:col-span-2 rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-base"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Dépenses
              </h3>
              <Link
                href={`/depenses?projectId=${project.id}`}
                className="btn-secondary text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Voir tout
              </Link>
            </div>

            <div className="flex items-center gap-6 mb-4">
              <div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total</span>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
              {billableExpenses > 0 && (
                <div>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Facturable</span>
                  <p className="font-medium" style={{ color: 'var(--color-status-success)' }}>
                    {formatCurrency(billableExpenses)}
                  </p>
                </div>
              )}
            </div>

            {project.expenses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {project.expenses.slice(0, 6).map(expense => (
                  <div
                    key={expense.id}
                    className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: expense.category.color || '#6B7280' }}
                    />
                    <span className="flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {expense.description}
                    </span>
                    <span className="font-medium shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(Number(expense.amount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Aucune dépense
              </p>
            )}
          </div>
        </div>
      )}

      {currentTab === 'taches' && (
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <TaskList projectId={project.id} />
        </div>
      )}

      {/* Modal de création de facture */}
      <CreateInvoiceFromProjectModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        projectId={project.id}
        projectName={project.name}
        acceptedQuotes={acceptedQuotes.map(q => ({
          ...q,
          total: q.total.toString(),
          depositPercent: q.depositPercent.toString(),
        }))}
        onInvoiceCreated={(invoiceId) => {
          setShowInvoiceModal(false)
          router.push(`/factures/${invoiceId}`)
        }}
      />
    </div>
  )
}
