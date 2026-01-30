'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  FileText,
  Building2,
  FolderKanban,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import clsx from 'clsx'
import { LinkButton, Spinner, FadeIn, StaggerContainer, StaggerItem } from '@/components/ui'

type Quote = {
  id: string
  quoteNumber: string
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED'
  total: string
  validUntil: string | null
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
}

const statusLabels = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  VIEWED: 'Consulté',
  ACCEPTED: 'Accepté',
  REFUSED: 'Refusé',
  EXPIRED: 'Expiré',
}

const statusColors = {
  DRAFT: { bg: 'rgba(163, 163, 163, 0.1)', text: 'var(--color-text-muted)' },
  SENT: { bg: 'rgba(59, 130, 246, 0.1)', text: 'var(--color-status-info-text)' },
  VIEWED: { bg: 'rgba(197, 184, 227, 0.2)', text: '#7C3AED' }, /* violet-600 pour meilleur contraste */
  ACCEPTED: { bg: 'rgba(34, 197, 94, 0.1)', text: 'var(--color-status-success-text)' },
  REFUSED: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--color-status-error-text)' },
  EXPIRED: { bg: 'rgba(234, 179, 8, 0.1)', text: 'var(--color-status-warning-text)' },
}

export function QuotesList() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchQuotes()
  }, [search, statusFilter])

  const fetchQuotes = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/quotes?${params}`)

      if (!res.ok) {
        console.error('Error fetching quotes:', res.status)
        setQuotes([])
        return
      }

      const data = await res.json()
      setQuotes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching quotes:', error)
      setQuotes([])
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

  const handleNewQuote = async () => {
    // Pour créer un devis, on doit d'abord choisir un projet
    // On redirige vers une page de sélection ou un modal
    router.push('/devis/nouveau')
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
            placeholder="Rechercher un devis..."
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
          <option value="SENT">Envoyés</option>
          <option value="VIEWED">Consultés</option>
          <option value="ACCEPTED">Acceptés</option>
          <option value="REFUSED">Refusés</option>
          <option value="EXPIRED">Expirés</option>
        </select>

        {/* Add button */}
        <LinkButton href="/devis/nouveau" icon={<Plus size={18} />}>
          Nouveau devis
        </LinkButton>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : quotes.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <FileText
            size={48}
            strokeWidth={1}
            className="mx-auto mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <p style={{ color: 'var(--color-text-muted)' }}>
            {search || statusFilter ? 'Aucun devis trouvé' : 'Aucun devis pour le moment'}
          </p>
          {!search && !statusFilter && (
            <LinkButton href="/devis/nouveau" icon={<Plus size={16} />} size="sm" className="mt-4">
              Créer votre premier devis
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
              {quotes.map((quote, index) => (
                <StaggerItem key={quote.id}>
                  <Link
                    href={`/devis/${quote.id}`}
                    className={clsx(
                      'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-bg-tertiary)]',
                      index !== quotes.length - 1 && 'border-b'
                    )}
                    style={{
                      borderColor: 'var(--color-border-light)',
                    }}
                  >
              {/* Quote number */}
              <div
                className="w-28 h-12 rounded-lg flex items-center justify-center text-xs font-medium shrink-0"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {quote.quoteNumber}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="font-medium truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {quote.project.name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: statusColors[quote.status].bg,
                      color: statusColors[quote.status].text,
                    }}
                  >
                    {statusLabels[quote.status]}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="flex items-center gap-1.5 truncate">
                    <Building2 size={14} />
                    {quote.project.client.companyName}
                  </span>
                  {quote.validUntil && (
                    <span className="hidden sm:flex items-center gap-1.5">
                      <Calendar size={14} />
                      Valide jusqu'au {formatDate(quote.validUntil)}
                    </span>
                  )}
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
                  {formatCurrency(quote.total)}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  TTC
                </div>
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
