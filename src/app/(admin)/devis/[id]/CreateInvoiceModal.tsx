'use client'

import { useState, useEffect } from 'react'
import { X, Receipt, Percent, DollarSign } from 'lucide-react'

type QuoteItem = {
  id: string
  name: string
  includeInTotal: boolean
  isSelected: boolean
}

type QuoteSection = {
  id: string
  title: string
  items: QuoteItem[]
}

type ExistingInvoice = {
  id: string
  invoiceNumber: string
  invoiceType: 'DEPOSIT' | 'FINAL' | 'STANDALONE'
  total: string
  status: string
  amountPaid: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  quoteId: string
  quoteNumber: string
  quoteTotal: number
  depositPercent: number
  sections: QuoteSection[]
  onInvoiceCreated: (invoiceId: string) => void
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  quoteId,
  quoteNumber,
  quoteTotal,
  depositPercent,
  sections,
  onInvoiceCreated,
}: Props) {
  const [invoiceType, setInvoiceType] = useState<'DEPOSIT' | 'FINAL'>('DEPOSIT')
  const [amountMode, setAmountMode] = useState<'percentage' | 'fixed'>('percentage')
  const [percentage, setPercentage] = useState(100)
  const [fixedAmount, setFixedAmount] = useState(0)
  const [existingInvoices, setExistingInvoices] = useState<ExistingInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger les factures existantes liées à ce devis
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setError(null)
      fetch(`/api/quotes/${quoteId}/invoices`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setExistingInvoices([])
          } else {
            setExistingInvoices(data)
          }
        })
        .catch(() => setExistingInvoices([]))
        .finally(() => setLoading(false))
    }
  }, [isOpen, quoteId])

  // Calculer le solde
  const totalInvoiced = existingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0)
  const remainingBalance = quoteTotal - totalInvoiced
  const hasDeposit = existingInvoices.some(inv => inv.invoiceType === 'DEPOSIT')

  // Montant calculé selon le mode
  const calculatedAmount = invoiceType === 'DEPOSIT'
    ? quoteTotal * (depositPercent / 100)
    : amountMode === 'percentage'
      ? remainingBalance * (percentage / 100)
      : fixedAmount

  // Items à afficher (titres seulement)
  const itemTitles = sections.flatMap(section =>
    section.items
      .filter(item => item.isSelected && item.includeInTotal)
      .map(item => item.name)
  )

  const handleCreate = async () => {
    setCreating(true)
    setError(null)

    try {
      const res = await fetch(`/api/quotes/${quoteId}/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceType,
          amount: calculatedAmount,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la création')
        return
      }

      const invoice = await res.json()
      onInvoiceCreated(invoice.id)
    } catch (err) {
      setError('Erreur lors de la création de la facture')
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl shadow-2xl"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <div className="flex items-center gap-3">
            <Receipt size={20} style={{ color: 'var(--color-accent-lavender)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Créer une facture
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X size={20} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Suivi du solde */}
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
              Suivi du solde — {quoteNumber}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Total du devis</span>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {quoteTotal.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Déjà facturé</span>
                <span style={{ color: totalInvoiced > 0 ? 'var(--color-status-success)' : 'var(--color-text-muted)' }}>
                  {totalInvoiced.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                </span>
              </div>
              <div
                className="flex justify-between pt-2 border-t font-medium"
                style={{ borderColor: 'var(--color-border-light)' }}
              >
                <span style={{ color: 'var(--color-text-primary)' }}>Reste à facturer</span>
                <span style={{ color: 'var(--color-accent-lavender)' }}>
                  {remainingBalance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                </span>
              </div>
            </div>

            {/* Factures existantes */}
            {existingInvoices.length > 0 && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Factures existantes:
                </p>
                <div className="space-y-1">
                  {existingInvoices.map(inv => (
                    <div key={inv.id} className="flex justify-between text-xs">
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {inv.invoiceNumber} ({inv.invoiceType === 'DEPOSIT' ? 'Dépôt' : 'Paiement'})
                      </span>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {parseFloat(inv.total).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Type de facture */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Type de facture
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setInvoiceType('DEPOSIT')}
                disabled={hasDeposit}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  hasDeposit ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  borderColor: invoiceType === 'DEPOSIT' ? 'var(--color-accent-lavender)' : 'var(--color-border-light)',
                  backgroundColor: invoiceType === 'DEPOSIT' ? 'rgba(197, 184, 227, 0.1)' : 'transparent',
                  color: invoiceType === 'DEPOSIT' ? 'var(--color-accent-lavender)' : 'var(--color-text-secondary)',
                }}
              >
                Dépôt ({depositPercent}%)
                {hasDeposit && <span className="block text-xs mt-1">Déjà créé</span>}
              </button>
              <button
                onClick={() => setInvoiceType('FINAL')}
                className="p-3 rounded-lg border text-sm font-medium transition-all"
                style={{
                  borderColor: invoiceType === 'FINAL' ? 'var(--color-accent-lavender)' : 'var(--color-border-light)',
                  backgroundColor: invoiceType === 'FINAL' ? 'rgba(197, 184, 227, 0.1)' : 'transparent',
                  color: invoiceType === 'FINAL' ? 'var(--color-accent-lavender)' : 'var(--color-text-secondary)',
                }}
              >
                Paiement
              </button>
            </div>
          </div>

          {/* Montant (seulement pour FINAL) */}
          {invoiceType === 'FINAL' && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Montant
              </label>

              {/* Mode selector */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    setAmountMode('percentage')
                    setPercentage(100)
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all"
                  style={{
                    backgroundColor: amountMode === 'percentage' ? 'rgba(197, 184, 227, 0.2)' : 'transparent',
                    color: amountMode === 'percentage' ? 'var(--color-accent-lavender)' : 'var(--color-text-muted)',
                  }}
                >
                  <Percent size={14} />
                  Pourcentage
                </button>
                <button
                  onClick={() => {
                    setAmountMode('fixed')
                    setFixedAmount(remainingBalance)
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all"
                  style={{
                    backgroundColor: amountMode === 'fixed' ? 'rgba(197, 184, 227, 0.2)' : 'transparent',
                    color: amountMode === 'fixed' ? 'var(--color-accent-lavender)' : 'var(--color-text-muted)',
                  }}
                >
                  <DollarSign size={14} />
                  Montant fixe
                </button>
              </div>

              {/* Input */}
              {amountMode === 'percentage' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={percentage}
                    onChange={e => setPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-24 px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                    min={0}
                    max={100}
                  />
                  <span style={{ color: 'var(--color-text-muted)' }}>% du solde restant</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={fixedAmount}
                    onChange={e => setFixedAmount(Math.min(remainingBalance, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-32 px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                    min={0}
                    max={remainingBalance}
                    step={0.01}
                  />
                  <span style={{ color: 'var(--color-text-muted)' }}>$</span>
                </div>
              )}
            </div>
          )}

          {/* Montant calculé */}
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'rgba(197, 184, 227, 0.1)' }}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Montant de la facture
              </span>
              <span className="text-xl font-semibold" style={{ color: 'var(--color-accent-lavender)' }}>
                {calculatedAmount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              + TPS et TVQ seront calculées automatiquement
            </p>
          </div>

          {/* Items inclus */}
          {itemTitles.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Items inclus ({itemTitles.length})
              </label>
              <div
                className="max-h-32 overflow-y-auto p-3 rounded-lg space-y-1"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                {itemTitles.map((title, idx) => (
                  <p key={idx} className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    • {title}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-status-error)' }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-3 p-4 border-t"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || calculatedAmount <= 0 || calculatedAmount > remainingBalance}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-accent-lavender)',
              color: '#1a1a1a',
              opacity: creating || calculatedAmount <= 0 || calculatedAmount > remainingBalance ? 0.5 : 1,
            }}
          >
            <Receipt size={16} />
            {creating ? 'Création...' : 'Créer la facture'}
          </button>
        </div>
      </div>
    </div>
  )
}
