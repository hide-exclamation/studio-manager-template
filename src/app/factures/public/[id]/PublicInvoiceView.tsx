'use client'

import { useState, useEffect } from 'react'
import { Download, Check, Clock, AlertCircle } from 'lucide-react'

// Default brand colors (will be overridden by API)
const DEFAULT_COLORS = {
  background: '#F5F5F5',
  accent: '#6366F1',
  accentDark: '#4F46E5',
}

type Invoice = {
  id: string
  invoiceNumber: string
  status: string
  invoiceType: string
  issueDate: string
  dueDate: string
  subtotal: string
  tpsAmount: string
  tvqAmount: string
  total: string
  amountPaid: string
  lateFeeApplied: boolean
  lateFeeAmount: string
  notes: string | null
  publicToken: string | null
  project: {
    name: string
    client: {
      companyName: string
      address: string | null
      contacts: Array<{
        name: string
        email: string | null
      }>
    }
  }
  items: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: string
    total: string
  }>
}

type Props = {
  invoice: Invoice
}

export function PublicInvoiceView({ invoice }: Props) {
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [brandColors, setBrandColors] = useState(DEFAULT_COLORS)

  // Fetch brand colors from public settings
  useEffect(() => {
    fetch('/api/public-settings')
      .then((res) => res.json())
      .then((data) => {
        setBrandColors({
          background: data.colorBackground || DEFAULT_COLORS.background,
          accent: data.colorAccent || DEFAULT_COLORS.accent,
          accentDark: data.colorAccentDark || DEFAULT_COLORS.accentDark,
        })
      })
      .catch(() => {
        // Use defaults if fetch fails
      })
  }, [])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })

  const downloadPdf = async () => {
    setDownloadingPdf(true)
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
    } finally {
      setDownloadingPdf(false)
    }
  }

  const isPaid = invoice.status === 'PAID'
  const isOverdue = invoice.status === 'OVERDUE'
  const contact = invoice.project.client.contacts[0]
  const total = Number(invoice.total)
  const amountPaid = Number(invoice.amountPaid)
  const amountDue = total - amountPaid

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: brandColors.background }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{
          backgroundColor: `${brandColors.background}e6`,
          borderColor: 'rgba(10, 10, 10, 0.08)',
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
              Facture
            </p>
            <p className="text-lg font-semibold" style={{ color: '#0A0A0A' }}>
              {invoice.invoiceNumber}
            </p>
          </div>

          <button
            onClick={downloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300"
            style={{
              backgroundColor: brandColors.accent,
              color: '#0A0A0A',
            }}
          >
            <Download size={16} />
            {downloadingPdf ? 'Génération...' : 'Télécharger PDF'}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Status badge */}
        <div className="flex items-center gap-3 mb-8">
          {isPaid ? (
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#16a34a' }}
            >
              <Check size={16} />
              Payée
            </span>
          ) : isOverdue ? (
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#dc2626' }}
            >
              <AlertCircle size={16} />
              En retard
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#d97706' }}
            >
              <Clock size={16} />
              En attente
            </span>
          )}
        </div>

        {/* Client info */}
        <div
          className="p-8 rounded-2xl mb-8"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
        >
          <p className="text-xs font-medium tracking-wider uppercase mb-2" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
            Facturé à
          </p>
          <p className="text-xl font-semibold mb-1" style={{ color: '#0A0A0A' }}>
            {invoice.project.client.companyName}
          </p>
          {contact && (
            <p className="text-sm" style={{ color: 'rgba(10, 10, 10, 0.6)' }}>
              {contact.name}
            </p>
          )}
          {invoice.project.client.address && (
            <p className="text-sm mt-2" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
              {invoice.project.client.address}
            </p>
          )}

          <div className="grid grid-cols-2 gap-6 mt-6 pt-6" style={{ borderTop: '1px solid rgba(10, 10, 10, 0.08)' }}>
            <div>
              <p className="text-xs font-medium tracking-wider uppercase mb-1" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
                Date d'émission
              </p>
              <p className="font-medium" style={{ color: '#0A0A0A' }}>
                {formatDate(invoice.issueDate)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wider uppercase mb-1" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
                Date d'échéance
              </p>
              <p className="font-medium" style={{ color: isOverdue ? '#dc2626' : '#0A0A0A' }}>
                {formatDate(invoice.dueDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Project */}
        <div
          className="p-8 rounded-2xl mb-8"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
        >
          <p className="text-xs font-medium tracking-wider uppercase mb-2" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
            Projet
          </p>
          <p className="text-xl font-semibold" style={{ color: '#0A0A0A' }}>
            {invoice.project.name}
          </p>
        </div>

        {/* Items */}
        <div
          className="p-8 rounded-2xl mb-8"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
        >
          <p className="text-xs font-medium tracking-wider uppercase mb-6" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
            Détails
          </p>

          <div className="space-y-4">
            {invoice.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-start py-4"
                style={{ borderBottom: '1px solid rgba(10, 10, 10, 0.06)' }}
              >
                <div className="flex-1">
                  <p className="font-medium" style={{ color: '#0A0A0A' }}>
                    {item.description}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-sm mt-1" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
                      {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                    </p>
                  )}
                </div>
                <p className="font-medium" style={{ color: '#0A0A0A' }}>
                  {formatCurrency(Number(item.total))}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div
          className="p-8 rounded-2xl"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
        >
          <div className="space-y-3">
            <div className="flex justify-between">
              <p style={{ color: 'rgba(10, 10, 10, 0.6)' }}>Sous-total</p>
              <p className="font-medium" style={{ color: '#0A0A0A' }}>
                {formatCurrency(Number(invoice.subtotal))}
              </p>
            </div>
            <div className="flex justify-between">
              <p style={{ color: 'rgba(10, 10, 10, 0.6)' }}>TPS (5%)</p>
              <p className="font-medium" style={{ color: '#0A0A0A' }}>
                {formatCurrency(Number(invoice.tpsAmount))}
              </p>
            </div>
            <div className="flex justify-between">
              <p style={{ color: 'rgba(10, 10, 10, 0.6)' }}>TVQ (9.975%)</p>
              <p className="font-medium" style={{ color: '#0A0A0A' }}>
                {formatCurrency(Number(invoice.tvqAmount))}
              </p>
            </div>

            {invoice.lateFeeApplied && Number(invoice.lateFeeAmount) > 0 && (
              <div className="flex justify-between">
                <p style={{ color: '#dc2626' }}>Frais de retard</p>
                <p className="font-medium" style={{ color: '#dc2626' }}>
                  {formatCurrency(Number(invoice.lateFeeAmount))}
                </p>
              </div>
            )}

            <div
              className="flex justify-between pt-4 mt-4"
              style={{ borderTop: '2px solid rgba(10, 10, 10, 0.1)' }}
            >
              <p className="text-lg font-semibold" style={{ color: '#0A0A0A' }}>Total</p>
              <p className="text-lg font-semibold" style={{ color: '#0A0A0A' }}>
                {formatCurrency(total)}
              </p>
            </div>

            {amountPaid > 0 && (
              <>
                <div className="flex justify-between">
                  <p style={{ color: '#16a34a' }}>Montant payé</p>
                  <p className="font-medium" style={{ color: '#16a34a' }}>
                    -{formatCurrency(amountPaid)}
                  </p>
                </div>
                <div
                  className="flex justify-between pt-3 mt-3"
                  style={{ borderTop: '1px solid rgba(10, 10, 10, 0.08)' }}
                >
                  <p className="font-semibold" style={{ color: isPaid ? '#16a34a' : '#0A0A0A' }}>
                    {isPaid ? 'Solde' : 'Solde dû'}
                  </p>
                  <p className="font-semibold" style={{ color: isPaid ? '#16a34a' : '#0A0A0A' }}>
                    {formatCurrency(amountDue)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div
            className="p-8 rounded-2xl mt-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
          >
            <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
              Notes
            </p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(10, 10, 10, 0.7)' }}>
              {invoice.notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-sm" style={{ color: 'rgba(10, 10, 10, 0.4)' }}>
            Merci pour votre confiance.
          </p>
        </footer>
      </main>
    </div>
  )
}
