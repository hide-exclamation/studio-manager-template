'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Edit,
  Download,
  Copy,
  Check,
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/components/ui'

type InvoiceItem = {
  id: string
  description: string
  quantity: number
  unitPrice: string
  total: string
}

type Invoice = {
  id: string
  invoiceNumber: string
  invoiceType: 'DEPOSIT' | 'PARTIAL' | 'FINAL' | 'STANDALONE'
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  issueDate: string
  dueDate: string
  subtotal: string
  tpsAmount: string
  tvqAmount: string
  total: string
  amountPaid: string
  paymentDate: string | null
  paymentMethod: string | null
  lateFeeApplied: boolean
  lateFeeAmount: string
  notes: string | null
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
  quote: {
    id: string
    quoteNumber: string
    depositPercent: string
  } | null
  items: InvoiceItem[]
  createdAt: string
}

type Settings = {
  companyName: string | null
  companyLogoUrl: string | null
  companyAddress: string | null
  companyEmail: string | null
  companyPhone: string | null
  tpsNumber: string | null
  tvqNumber: string | null
} | null

const typeLabels = {
  DEPOSIT: 'Facture de dépôt',
  PARTIAL: 'Facture partielle',
  FINAL: 'Facture finale',
  STANDALONE: 'Facture',
}

export function InvoicePreview({ invoice, settings }: { invoice: Invoice; settings: Settings }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const downloadPdf = async () => {
    setGeneratingPdf(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pdf`)
      if (!res.ok) throw new Error('Erreur lors de la génération')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoiceNumber}.pdf`
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

  // Infos du studio
  const studioName = settings?.companyName || 'Mon Studio'
  const studioAddress = settings?.companyAddress || ''
  const studioEmail = settings?.companyEmail || ''
  const tpsNumber = settings?.tpsNumber || ''
  const tvqNumber = settings?.tvqNumber || ''

  // Calculs
  const subtotal = invoice.items.reduce((sum, item) => sum + parseFloat(item.total), 0)
  const tpsRate = 0.05
  const tvqRate = 0.09975
  const tpsAmount = subtotal * tpsRate
  const tvqAmount = subtotal * tvqRate
  const lateFee = invoice.lateFeeApplied ? parseFloat(invoice.lateFeeAmount) : 0
  const total = subtotal + tpsAmount + tvqAmount + lateFee
  const amountPaid = parseFloat(invoice.amountPaid)
  const balanceDue = total - amountPaid

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const projectCode = `${invoice.project.client.code}-${String(invoice.project.projectNumber).padStart(3, '0')}`
  const primaryContact = invoice.project.client.contacts[0]

  const publicUrl = invoice.publicToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/factures/public/${invoice.publicToken}`
    : null

  const copyPublicUrl = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isPaid = invoice.status === 'PAID'
  const isOverdue = !isPaid && new Date(invoice.dueDate) < new Date()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1E8' }}>
      {/* Toolbar */}
      <div
        className="sticky top-0 z-40 px-6 py-4"
        style={{
          backgroundColor: 'rgba(245, 241, 232, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(10, 10, 10, 0.08)',
        }}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link
            href={`/factures/${invoice.id}`}
            className="flex items-center gap-2 text-sm transition-colors hover:opacity-70"
            style={{ color: 'rgba(10, 10, 10, 0.6)' }}
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
                  backgroundColor: 'rgba(10, 10, 10, 0.05)',
                  color: 'rgba(10, 10, 10, 0.7)',
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
                backgroundColor: 'rgba(10, 10, 10, 0.05)',
                color: 'rgba(10, 10, 10, 0.7)',
              }}
            >
              <Download size={16} />
              {generatingPdf ? 'Génération...' : 'PDF'}
            </button>

            <Link
              href={`/factures/${invoice.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: '#0A0A0A',
                color: 'white',
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
            backgroundColor: 'white',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Header - Beige */}
          <div
            className="px-10 py-8"
            style={{
              backgroundColor: '#F5F1E8',
              borderBottom: '1px solid rgba(10, 10, 10, 0.08)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                {settings?.companyLogoUrl ? (
                  <Image
                    src={settings.companyLogoUrl}
                    alt={studioName}
                    width={120}
                    height={50}
                    style={{ height: '50px', width: 'auto' }}
                  />
                ) : (
                  <h1
                    className="text-4xl"
                    style={{ fontFamily: 'var(--font-heading)', fontWeight: 300, letterSpacing: '-0.02em' }}
                  >
                    {studioName}
                  </h1>
                )}
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
                  {typeLabels[invoice.invoiceType]}
                </p>
                <p className="text-xl font-semibold" style={{ color: '#0A0A0A' }}>
                  {invoice.invoiceNumber}
                </p>
                <p className="text-sm mt-1" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
                  {formatDate(invoice.issueDate)}
                </p>
                {isPaid && (
                  <span
                    className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider"
                    style={{
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      color: '#16a34a',
                    }}
                  >
                    Payée
                  </span>
                )}
                {isOverdue && (
                  <span
                    className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#dc2626',
                    }}
                  >
                    En retard
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Client bar */}
          <div
            className="px-10 py-5 flex justify-between"
            style={{ borderBottom: '1px solid rgba(10, 10, 10, 0.08)' }}
          >
            <div>
              <p className="text-xs mb-1" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>De</p>
              <p className="font-medium text-sm" style={{ color: '#0A0A0A' }}>{studioName}</p>
              <p className="text-sm" style={{ color: 'rgba(10, 10, 10, 0.6)' }}>{studioAddress}</p>
              {studioEmail && (
                <p className="text-sm" style={{ color: 'rgba(10, 10, 10, 0.6)' }}>{studioEmail}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs mb-1" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>Facturer à</p>
              <p className="font-medium text-sm" style={{ color: '#0A0A0A' }}>
                {invoice.project.client.companyName}
              </p>
              {invoice.project.client.address && (
                <p className="text-sm" style={{ color: 'rgba(10, 10, 10, 0.6)' }}>
                  {invoice.project.client.address}
                </p>
              )}
              {primaryContact && (
                <p className="text-sm" style={{ color: 'rgba(10, 10, 10, 0.6)' }}>
                  {primaryContact.name}
                  {primaryContact.email && ` · ${primaryContact.email}`}
                </p>
              )}
            </div>
          </div>

          {/* Info bar */}
          <div
            className="px-10 py-4 flex justify-between text-sm"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.02)', borderBottom: '1px solid rgba(10, 10, 10, 0.08)' }}
          >
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>Projet</p>
              <p className="font-medium" style={{ color: '#0A0A0A' }}>{invoice.project.name}</p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>Référence</p>
              <p className="font-medium" style={{ color: '#0A0A0A' }}>{projectCode}</p>
            </div>
            {invoice.quote && (
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>Devis</p>
                <p className="font-medium" style={{ color: '#0A0A0A' }}>{invoice.quote.quoteNumber}</p>
              </div>
            )}
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>Échéance</p>
              <p className="font-medium" style={{ color: isOverdue && !isPaid ? '#dc2626' : '#0A0A0A' }}>
                {formatDate(invoice.dueDate)}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="px-10 py-6">
            {/* Table header */}
            <div
              className="flex pb-3 mb-2 text-xs font-medium"
              style={{ borderBottom: '1px solid rgba(10, 10, 10, 0.1)', color: 'rgba(10, 10, 10, 0.5)' }}
            >
              <div className="flex-1">Description</div>
              <div className="w-16 text-center">Qté</div>
              <div className="w-24 text-right">Prix unit.</div>
              <div className="w-24 text-right">Total</div>
            </div>

            {/* Items */}
            {invoice.items.map((item) => (
              <div
                key={item.id}
                className="flex py-4 items-start"
                style={{ borderBottom: '1px solid rgba(10, 10, 10, 0.06)' }}
              >
                <div className="flex-1 pr-4">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#0A0A0A' }}>
                    {item.description}
                  </p>
                </div>
                <div className="w-16 text-center text-sm" style={{ color: 'rgba(10, 10, 10, 0.6)' }}>
                  {item.quantity}
                </div>
                <div className="w-24 text-right text-sm" style={{ color: 'rgba(10, 10, 10, 0.6)' }}>
                  {formatCurrency(parseFloat(item.unitPrice))}
                </div>
                <div className="w-24 text-right text-sm font-medium" style={{ color: '#0A0A0A' }}>
                  {formatCurrency(parseFloat(item.total))}
                </div>
              </div>
            ))}
          </div>

          {/* Totals - Dark */}
          <div
            className="px-10 py-8"
            style={{ backgroundColor: '#0A0A0A', color: 'white' }}
          >
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ opacity: 0.7 }}>Sous-total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span style={{ opacity: 0.7 }}>TPS (5%)</span>
                <span>{formatCurrency(tpsAmount)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span style={{ opacity: 0.7 }}>TVQ (9,975%)</span>
                <span>{formatCurrency(tvqAmount)}</span>
              </div>

              {lateFee > 0 && (
                <div className="flex justify-between text-sm" style={{ color: '#f87171' }}>
                  <span>Frais de retard (2%)</span>
                  <span>{formatCurrency(lateFee)}</span>
                </div>
              )}

              <div
                className="flex justify-between pt-4 mt-4"
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}
              >
                <span className="text-base">Total</span>
                <span className="text-xl font-medium">{formatCurrency(total)}</span>
              </div>

              {amountPaid > 0 && (
                <>
                  <div className="flex justify-between text-sm pt-2">
                    <span style={{ opacity: 0.7 }}>Montant payé</span>
                    <span style={{ color: '#4ade80' }}>− {formatCurrency(amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Solde dû</span>
                    <span
                      className="font-medium"
                      style={{ color: balanceDue <= 0 ? '#4ade80' : '#C5B8E3' }}
                    >
                      {formatCurrency(Math.max(0, balanceDue))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment info */}
          {isPaid && invoice.paymentDate && (
            <div
              className="px-10 py-5 text-center"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)' }}
            >
              <span
                className="inline-block px-5 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#16a34a' }}
              >
                ✓ Facture payée
              </span>
              <p className="text-sm mt-2" style={{ color: 'rgba(10, 10, 10, 0.6)' }}>
                Payée le {formatDate(invoice.paymentDate)}
                {invoice.paymentMethod && ` par ${invoice.paymentMethod.toLowerCase()}`}
              </p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="px-10 py-6" style={{ borderTop: '1px solid rgba(10, 10, 10, 0.08)' }}>
              <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
                Notes
              </p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(10, 10, 10, 0.7)' }}>
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div
            className="px-10 py-5 flex justify-between text-xs"
            style={{ borderTop: '1px solid rgba(10, 10, 10, 0.08)', color: 'rgba(10, 10, 10, 0.5)' }}
          >
            <div>
              {!isPaid ? 'Payable à réception. Merci de votre confiance.' : 'Merci de votre confiance.'}
            </div>
            <div className="text-right">
              {tpsNumber && <div>TPS: {tpsNumber}</div>}
              {tvqNumber && <div>TVQ: {tvqNumber}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
