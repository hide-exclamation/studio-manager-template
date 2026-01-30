'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Download,
  Send,
  Copy,
  Check,
  Receipt,
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/components/ui'

type Discount = {
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  label: string
  reason: string
}

type ItemType = 'SERVICE' | 'PRODUCT' | 'FREE' | 'A_LA_CARTE'

type QuoteItem = {
  id: string
  name: string
  itemType: ItemType
  itemTypes?: ItemType[]
  description: string | null
  billingMode?: 'FIXED' | 'HOURLY'
  quantity: number
  unitPrice: string
  hourlyRate?: string | null
  hours?: string | null
  includeInTotal: boolean
  isSelected: boolean
}

type QuoteSection = {
  id: string
  sectionNumber: number
  title: string
  description: string | null
  items: QuoteItem[]
}

type Quote = {
  id: string
  quoteNumber: string
  status: string
  introduction: string | null
  subtotal: string
  discounts: Discount[] | null
  tpsRate: string
  tvqRate: string
  total: string
  validUntil: string | null
  depositPercent: string
  publicToken: string | null
  project: {
    id: string
    name: string
    projectNumber: number
    client: {
      id: string
      code: string
      companyName: string
      address: string | null
      contacts: { name: string; email: string | null }[]
    }
  }
  sections: QuoteSection[]
  createdAt: string
}

export function QuotePreview({ quote }: { quote: Quote }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const downloadPdf = async () => {
    setGeneratingPdf(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/pdf`)
      if (!res.ok) throw new Error('Erreur lors de la génération')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${quote.quoteNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  // Calculs
  const subtotal = quote.sections.reduce((sectionSum, section) => {
    return sectionSum + section.items.reduce((itemSum, item) => {
      if (!item.includeInTotal || !item.isSelected) return itemSum
      if (item.billingMode === 'HOURLY' && item.hourlyRate && item.hours) {
        return itemSum + parseFloat(item.hourlyRate) * parseFloat(item.hours)
      }
      return itemSum + parseFloat(item.unitPrice) * item.quantity
    }, 0)
  }, 0)

  // Calculer les rabais
  const discountDetails = (quote.discounts || []).map(d => {
    if (d.type === 'PERCENTAGE') {
      return { ...d, amount: subtotal * (d.value / 100) }
    }
    return { ...d, amount: d.value }
  })
  const totalDiscount = discountDetails.reduce((sum, d) => sum + d.amount, 0)

  const afterDiscount = subtotal - totalDiscount
  const tps = afterDiscount * parseFloat(quote.tpsRate)
  const tvq = afterDiscount * parseFloat(quote.tvqRate)
  const total = afterDiscount + tps + tvq
  const deposit = total * (parseFloat(quote.depositPercent) / 100)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const projectCode = `${quote.project.client.code}-${String(quote.project.projectNumber).padStart(3, '0')}`
  const primaryContact = quote.project.client.contacts[0]

  const publicUrl = quote.publicToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/devis/public/${quote.publicToken}`
    : null

  const copyPublicUrl = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Toolbar */}
      <div
        className="sticky top-0 z-40 px-6 py-4"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border-light)',
        }}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link
            href={`/devis/${quote.id}`}
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ArrowLeft size={16} />
            Retour à l'éditeur
          </Link>

          <div className="flex items-center gap-2">
            {publicUrl && (
              <button
                onClick={copyPublicUrl}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copié!' : 'Copier le lien'}
              </button>
            )}

            <button
              onClick={downloadPdf}
              disabled={generatingPdf}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Download size={16} />
              {generatingPdf ? 'Génération...' : 'PDF'}
            </button>

            <Link
              href={`/devis/${quote.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-dark)',
                color: 'var(--color-text-inverse)',
              }}
            >
              <Edit size={16} />
              Modifier
            </Link>
          </div>
        </div>
      </div>

      {/* Preview content */}
      <div className="max-w-4xl mx-auto p-8">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Header */}
          <div
            className="p-8"
            style={{
              backgroundColor: 'var(--color-bg-dark)',
              color: 'var(--color-text-inverse)',
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h1
                  className="text-3xl mb-2"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Mon Studio
                </h1>
                <p className="text-sm opacity-70">Studio créatif</p>
              </div>

              <div className="text-right">
                <p className="text-sm opacity-70">Devis</p>
                <p className="text-xl font-medium">{quote.quoteNumber}</p>
                <p className="text-sm opacity-70 mt-2">
                  {formatDate(quote.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Client info */}
          <div className="p-8" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Client
                </p>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {quote.project.client.companyName}
                </p>
                {quote.project.client.address && (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {quote.project.client.address}
                  </p>
                )}
                {primaryContact && (
                  <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {primaryContact.name}
                    {primaryContact.email && ` · ${primaryContact.email}`}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Projet
                </p>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {quote.project.name}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Réf: {projectCode}
                </p>
                {quote.validUntil && (
                  <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                    Valide jusqu'au {formatDate(quote.validUntil)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Introduction */}
          {quote.introduction && (
            <div className="px-8 py-6" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                {quote.introduction}
              </p>
            </div>
          )}

          {/* Sections */}
          <div className="p-8">
            {quote.sections.map((section, sectionIndex) => (
              <div
                key={section.id}
                className={sectionIndex !== quote.sections.length - 1 ? 'mb-8 pb-8' : ''}
                style={{
                  borderBottom: sectionIndex !== quote.sections.length - 1
                    ? '1px solid var(--color-border-light)'
                    : undefined
                }}
              >
                <h2
                  className="text-lg mb-2"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
                >
                  {section.sectionNumber}. {section.title}
                </h2>

                {section.description && (
                  <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    {section.description}
                  </p>
                )}

                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-4 rounded-lg"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {item.name}
                          {(() => {
                            const types = item.itemTypes || [item.itemType]
                            return (
                              <>
                                {types.includes('FREE') && (
                                  <span
                                    className="ml-2 text-xs px-2 py-0.5 rounded"
                                    style={{
                                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                      color: 'var(--color-status-success)',
                                    }}
                                  >
                                    Offert
                                  </span>
                                )}
                                {types.includes('A_LA_CARTE') && (
                                  <span
                                    className="ml-2 text-xs px-2 py-0.5 rounded"
                                    style={{
                                      backgroundColor: 'rgba(197, 184, 227, 0.2)',
                                      color: 'var(--color-accent-lavender)',
                                    }}
                                  >
                                    Optionnel
                                  </span>
                                )}
                              </>
                            )
                          })()}
                        </p>
                        {item.description && (
                          <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--color-text-muted)' }}>
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        {(() => {
                          const types = item.itemTypes || [item.itemType]
                          const isFree = types.includes('FREE')
                          const isHourly = item.billingMode === 'HOURLY'

                          if (isFree) {
                            return <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Offert</p>
                          }

                          if (isHourly && item.hourlyRate && item.hours) {
                            const hourlyTotal = parseFloat(item.hourlyRate) * parseFloat(item.hours)
                            return (
                              <>
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  {item.hours}h × {formatCurrency(parseFloat(item.hourlyRate))}/h
                                </p>
                                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                  {formatCurrency(hourlyTotal)}
                                </p>
                              </>
                            )
                          }

                          return (
                            <>
                              {item.quantity > 1 && (
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  {item.quantity} × {formatCurrency(parseFloat(item.unitPrice))}
                                </p>
                              )}
                              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                {formatCurrency(parseFloat(item.unitPrice) * item.quantity)}
                              </p>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div
            className="p-8"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderTop: '1px solid var(--color-border-light)',
            }}
          >
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>Sous-total</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(subtotal)}</span>
              </div>

              {discountDetails.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {d.label || 'Rabais'} {d.type === 'PERCENTAGE' && `(${d.value}%)`}
                    </span>
                    <span style={{ color: 'var(--color-status-success)' }}>-{formatCurrency(d.amount)}</span>
                  </div>
                  {d.reason && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {d.reason}
                    </p>
                  )}
                </div>
              ))}

              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>TPS (5%)</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(tps)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>TVQ (9.975%)</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(tvq)}</span>
              </div>

              <div
                className="flex justify-between pt-3 mt-3"
                style={{ borderTop: '1px solid var(--color-border-light)' }}
              >
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Total</span>
                <span
                  className="text-xl font-medium"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
                >
                  {formatCurrency(total)}
                </span>
              </div>

              <div className="flex justify-between text-sm pt-2">
                <span style={{ color: 'var(--color-text-muted)' }}>
                  Dépôt requis ({quote.depositPercent}%)
                </span>
                <span style={{ color: 'var(--color-accent-lavender)' }}>
                  {formatCurrency(deposit)}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice generation buttons - only show when quote is accepted */}
          {quote.status === 'ACCEPTED' && (
            <div
              className="p-6"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.05)',
                borderTop: '1px solid var(--color-border-light)',
              }}
            >
              <p
                className="text-sm mb-4 text-center"
                style={{ color: 'var(--color-status-success)' }}
              >
                Ce devis a ete accepte. Vous pouvez maintenant generer les factures.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href={`/factures/nouveau?projet=${quote.project.id}&devis=${quote.id}&type=DEPOSIT`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor: 'var(--color-accent-lavender)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <Receipt size={16} />
                  Facture depot ({quote.depositPercent}%)
                </Link>
                <Link
                  href={`/factures/nouveau?projet=${quote.project.id}&devis=${quote.id}&type=FINAL`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <Receipt size={16} />
                  Facture finale
                </Link>
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            className="p-8 text-center text-sm"
            style={{
              backgroundColor: 'var(--color-bg-dark)',
              color: 'var(--color-text-inverse)',
            }}
          >
            <p className="opacity-70">
              Ce devis est valide pendant {quote.validUntil ? `jusqu'au ${formatDate(quote.validUntil)}` : '30 jours'}.
            </p>
                      </div>
        </div>
      </div>
    </div>
  )
}
