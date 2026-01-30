'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Receipt,
  Building2,
  Calendar,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import { LinkButton, Spinner, FadeIn, StaggerContainer, StaggerItem } from '@/components/ui'

type Invoice = {
  id: string
  invoiceNumber: string
  invoiceType: 'DEPOSIT' | 'PARTIAL' | 'FINAL' | 'STANDALONE'
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  total: string
  amountPaid: string
  dueDate: string
  createdAt: string
  project: {
    id: string
    name: string
    client: {
      id: string
      code: string
      companyName: string
    }
  }
  quote: {
    id: string
    quoteNumber: string
  } | null
}

const statusLabels = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
}

const statusColors = {
  DRAFT: { bg: 'rgba(163, 163, 163, 0.1)', text: 'var(--color-text-muted)' },
  SENT: { bg: 'rgba(59, 130, 246, 0.1)', text: 'var(--color-status-info-text)' },
  PAID: { bg: 'rgba(34, 197, 94, 0.1)', text: 'var(--color-status-success-text)' },
  OVERDUE: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--color-status-error-text)' },
  CANCELLED: { bg: 'rgba(163, 163, 163, 0.1)', text: 'var(--color-text-muted)' },
}

const typeLabels = {
  DEPOSIT: 'Dépôt',
  PARTIAL: 'Partiel',
  FINAL: 'Finale',
  STANDALONE: 'Facture',
}

export function InvoicesList() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchInvoices()
  }, [search, statusFilter])

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/invoices?${params}`)

      if (!res.ok) {
        console.error('Error fetching invoices:', res.status)
        setInvoices([])
        return
      }

      const data = await res.json()
      setInvoices(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: string) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(parseFloat(amount))

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') return false
    return new Date(invoice.dueDate) < new Date()
  }

  const getPaymentStatus = (invoice: Invoice) => {
    const total = parseFloat(invoice.total)
    const paid = parseFloat(invoice.amountPaid)
    if (paid === 0) return null
    if (paid >= total) return 'full'
    return 'partial'
  }

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Rechercher une facture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
            color: 'var(--color-text-primary)',
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillons</option>
          <option value="SENT">Envoyées</option>
          <option value="PAID">Payées</option>
          <option value="OVERDUE">En retard</option>
          <option value="CANCELLED">Annulées</option>
        </select>

        {/* Add button */}
        <LinkButton href="/factures/nouveau" icon={<Plus size={18} />}>
          Nouvelle facture
        </LinkButton>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : invoices.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <Receipt
            size={48}
            strokeWidth={1}
            className="mx-auto mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <p style={{ color: 'var(--color-text-muted)' }}>
            {search || statusFilter ? 'Aucune facture trouvée' : 'Aucune facture pour le moment'}
          </p>
          {!search && !statusFilter && (
            <LinkButton href="/factures/nouveau" icon={<Plus size={16} />} size="sm" className="mt-4">
              Créer votre première facture
            </LinkButton>
          )}
        </div>
      ) : (
        <FadeIn>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <StaggerContainer>
              {invoices.map((invoice, index) => (
                <StaggerItem key={invoice.id}>
                  <Link
                    href={`/factures/${invoice.id}`}
                    className={clsx(
                      'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-bg-tertiary)]',
                      index !== invoices.length - 1 && 'border-b'
                    )}
                    style={{
                      borderColor: 'var(--color-border-light)',
                    }}
                  >
              {/* Invoice number */}
              <div
                className="w-28 h-12 rounded-lg flex flex-col items-center justify-center text-xs font-medium shrink-0"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <span>{invoice.invoiceNumber}</span>
                {invoice.invoiceType !== 'STANDALONE' && (
                  <span
                    className="text-[10px] mt-0.5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {typeLabels[invoice.invoiceType]}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="font-medium truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {invoice.project.name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: statusColors[invoice.status].bg,
                      color: statusColors[invoice.status].text,
                    }}
                  >
                    {statusLabels[invoice.status]}
                  </span>
                  {getPaymentStatus(invoice) === 'partial' && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        color: 'var(--color-status-warning)',
                      }}
                    >
                      Partiel
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="flex items-center gap-1.5 truncate">
                    <Building2 size={14} />
                    {invoice.project.client.companyName}
                  </span>
                  <span className={clsx(
                    "hidden sm:flex items-center gap-1.5",
                    isOverdue(invoice) && invoice.status !== 'OVERDUE' && "text-red-500"
                  )}>
                    {isOverdue(invoice) && invoice.status !== 'OVERDUE' && <AlertCircle size={14} />}
                    <Calendar size={14} />
                    Échéance: {formatDate(invoice.dueDate)}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="text-right shrink-0">
                <div
                  className="text-lg font-medium"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {formatCurrency(invoice.total)}
                </div>
                {parseFloat(invoice.amountPaid) > 0 && parseFloat(invoice.amountPaid) < parseFloat(invoice.total) && (
                  <div className="text-xs" style={{ color: 'var(--color-status-success)' }}>
                    {formatCurrency(invoice.amountPaid)} paye
                  </div>
                )}
              </div>

                  {/* Arrow */}
                  <ChevronRight
                    size={20}
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </FadeIn>
      )}
    </div>
  )
}
