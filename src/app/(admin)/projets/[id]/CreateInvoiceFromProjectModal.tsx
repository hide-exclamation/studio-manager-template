'use client'

import { useState, useEffect } from 'react'
import { X, Receipt, Percent, DollarSign, FileText, Wallet, Check } from 'lucide-react'

type Quote = {
  id: string
  quoteNumber: string
  status: string
  total: string
  depositPercent: string
  sections: Array<{
    items: Array<{
      id: string
      name: string
      includeInTotal: boolean
      isSelected: boolean
    }>
  }>
}

type ExistingInvoice = {
  id: string
  invoiceNumber: string
  invoiceType: 'DEPOSIT' | 'PARTIAL' | 'FINAL' | 'STANDALONE'
  total: string
  status: string
}

type BillableExpense = {
  id: string
  description: string
  amount: string
  date: string
  vendor: string | null
  category: { name: string; color: string | null }
}

type Props = {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
  acceptedQuotes: Quote[]
  onInvoiceCreated: (invoiceId: string) => void
}

export function CreateInvoiceFromProjectModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  acceptedQuotes,
  onInvoiceCreated,
}: Props) {
  // Mode: 'select' pour choisir le devis, 'configure' pour configurer la facture
  const [mode, setMode] = useState<'select' | 'configure'>('select')
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)

  // Configuration de la facture
  const [invoiceType, setInvoiceType] = useState<'DEPOSIT' | 'FINAL'>('DEPOSIT')
  const [amountMode, setAmountMode] = useState<'percentage' | 'fixed'>('percentage')
  const [percentage, setPercentage] = useState(100)
  const [fixedAmount, setFixedAmount] = useState(0)

  // Factures existantes pour le devis sélectionné
  const [existingInvoices, setExistingInvoices] = useState<ExistingInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dépenses facturables
  const [billableExpenses, setBillableExpenses] = useState<BillableExpense[]>([])
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set())

  // Reset au changement de devis
  useEffect(() => {
    if (selectedQuote) {
      setLoading(true)
      setError(null)
      fetch(`/api/quotes/${selectedQuote.id}/invoices`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setExistingInvoices([])
            setInvoiceType('DEPOSIT')
          } else {
            setExistingInvoices(data)
            // Si un dépôt existe déjà, passer automatiquement en mode Paiement
            const hasDeposit = data.some((inv: ExistingInvoice) => inv.invoiceType === 'DEPOSIT')
            setInvoiceType(hasDeposit ? 'FINAL' : 'DEPOSIT')
          }
        })
        .catch(() => {
          setExistingInvoices([])
          setInvoiceType('DEPOSIT')
        })
        .finally(() => setLoading(false))
    }
  }, [selectedQuote])

  // Reset quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setMode('select')
      setSelectedQuote(null)
      setInvoiceType('DEPOSIT')
      setAmountMode('percentage')
      setPercentage(100)
      setExistingInvoices([])
      setError(null)
      setSelectedExpenses(new Set())

      // Charger les dépenses facturables non encore facturées
      fetch(`/api/expenses?projectId=${projectId}&isBillable=true&isBilled=false`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setBillableExpenses(data)
          }
        })
        .catch(() => setBillableExpenses([]))
    }
  }, [isOpen, projectId])

  // Calculer le solde
  const quoteTotal = selectedQuote ? parseFloat(selectedQuote.total) : 0
  const depositPercent = selectedQuote ? parseFloat(selectedQuote.depositPercent) : 50
  const totalInvoiced = existingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0)
  const remainingBalance = Math.max(0, quoteTotal - totalInvoiced)
  const hasDeposit = existingInvoices.some(inv => inv.invoiceType === 'DEPOSIT')
  const isFullyInvoiced = remainingBalance < 0.01

  // Total des dépenses sélectionnées
  const selectedExpensesTotal = billableExpenses
    .filter(e => selectedExpenses.has(e.id))
    .reduce((sum, e) => sum + parseFloat(e.amount), 0)

  // Montant calculé selon le mode
  // Si entièrement facturé, le montant de base est 0
  const baseAmount = isFullyInvoiced
    ? 0
    : invoiceType === 'DEPOSIT'
      ? quoteTotal * (depositPercent / 100)
      : amountMode === 'percentage'
        ? remainingBalance * (percentage / 100)
        : fixedAmount

  // Le montant total est le baseAmount + dépenses (sauf pour dépôt)
  const calculatedAmount = invoiceType === 'DEPOSIT'
    ? baseAmount
    : baseAmount + selectedExpensesTotal

  // Mode "dépenses uniquement" si devis entièrement facturé
  const expensesOnlyMode = isFullyInvoiced && billableExpenses.length > 0

  // Items du devis sélectionné
  const itemTitles = selectedQuote
    ? selectedQuote.sections.flatMap(section =>
        section.items
          .filter(item => item.isSelected && item.includeInTotal)
          .map(item => item.name)
      )
    : []

  const handleSelectQuote = (quote: Quote) => {
    setSelectedQuote(quote)
    setMode('configure')
    // Reset invoice type based on existing invoices
    setInvoiceType('DEPOSIT')
  }

  const toggleExpense = (expenseId: string) => {
    const newSelected = new Set(selectedExpenses)
    if (newSelected.has(expenseId)) {
      newSelected.delete(expenseId)
    } else {
      newSelected.add(expenseId)
    }
    setSelectedExpenses(newSelected)
  }

  const selectAllExpenses = () => {
    if (selectedExpenses.size === billableExpenses.length) {
      setSelectedExpenses(new Set())
    } else {
      setSelectedExpenses(new Set(billableExpenses.map(e => e.id)))
    }
  }

  const handleCreate = async () => {
    if (!selectedQuote) return

    setCreating(true)
    setError(null)

    try {
      const res = await fetch(`/api/quotes/${selectedQuote.id}/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceType,
          amount: baseAmount, // Montant de base sans les dépenses
          expenseIds: Array.from(selectedExpenses), // Dépenses à inclure
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b sticky top-0"
          style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-primary)' }}
        >
          <div className="flex items-center gap-3">
            <Receipt size={20} style={{ color: 'var(--color-accent-lavender)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {mode === 'select' ? 'Nouvelle facture' : 'Configurer la facture'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 transition-colors">
            <X size={20} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {mode === 'select' ? (
            <>
              {/* Sélection du devis */}
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  Créer une facture depuis un devis accepté
                </h3>

                {acceptedQuotes.length > 0 ? (
                  <div className="space-y-2">
                    {acceptedQuotes.map(quote => (
                      <button
                        key={quote.id}
                        onClick={() => handleSelectQuote(quote)}
                        className="w-full flex items-center justify-between p-4 rounded-lg border transition-all hover:border-[var(--color-accent-lavender)]"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderColor: 'var(--color-border-light)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <FileText size={18} style={{ color: 'var(--color-accent-lavender)' }} />
                          <div className="text-left">
                            <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                              {quote.quoteNumber}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              Accepté
                            </p>
                          </div>
                        </div>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {parseFloat(quote.total).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    className="text-center py-8 rounded-lg"
                    style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                  >
                    <FileText size={32} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Aucun devis accepté pour ce projet
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Créez et faites approuver un devis d'abord
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Configuration de la facture */}

              {/* Bouton retour */}
              <button
                onClick={() => setMode('select')}
                className="text-sm flex items-center gap-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ← Changer de devis
              </button>

              {/* Suivi du solde */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  Suivi du solde — {selectedQuote?.quoteNumber}
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
                            {inv.invoiceNumber} ({inv.invoiceType === 'DEPOSIT' ? 'Dépôt' : inv.invoiceType === 'PARTIAL' ? 'Partiel' : 'Final'})
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

              {/* Type de facture - masqué si devis entièrement facturé */}
              {!expensesOnlyMode && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Type de facture
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setInvoiceType('DEPOSIT')}
                      disabled={hasDeposit || isFullyInvoiced}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${(hasDeposit || isFullyInvoiced) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              )}

              {/* Message si devis entièrement facturé */}
              {isFullyInvoiced && billableExpenses.length > 0 && (
                <div
                  className="p-4 rounded-lg text-sm"
                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-status-info)' }}
                >
                  Le devis est entièrement facturé. Vous pouvez créer une facture pour les dépenses facturables uniquement.
                </div>
              )}

              {/* Message si devis entièrement facturé et pas de dépenses */}
              {isFullyInvoiced && billableExpenses.length === 0 && (
                <div
                  className="p-4 rounded-lg text-sm"
                  style={{ backgroundColor: 'rgba(163, 163, 163, 0.1)', color: 'var(--color-text-muted)' }}
                >
                  Le devis est entièrement facturé et il n'y a pas de dépenses facturables à inclure.
                </div>
              )}

              {/* Montant (seulement pour FINAL et si pas en mode dépenses uniquement) */}
              {invoiceType === 'FINAL' && !expensesOnlyMode && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Montant
                  </label>

                  {/* Mode selector */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => { setAmountMode('percentage'); setPercentage(100) }}
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
                      onClick={() => { setAmountMode('fixed'); setFixedAmount(remainingBalance) }}
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

              {/* Dépenses facturables */}
              {(expensesOnlyMode || (invoiceType !== 'DEPOSIT' && billableExpenses.length > 0)) && billableExpenses.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                      <Wallet size={16} />
                      Dépenses facturables ({billableExpenses.length})
                    </label>
                    <button
                      onClick={selectAllExpenses}
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {selectedExpenses.size === billableExpenses.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>
                  <div
                    className="max-h-40 overflow-y-auto rounded-lg border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border-light)',
                    }}
                  >
                    {billableExpenses.map(expense => (
                      <button
                        key={expense.id}
                        onClick={() => toggleExpense(expense.id)}
                        className="w-full flex items-center gap-3 p-3 border-b last:border-b-0 text-left transition-colors hover:bg-black/5"
                        style={{ borderColor: 'var(--color-border-light)' }}
                      >
                        <div
                          className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                          style={{
                            borderColor: selectedExpenses.has(expense.id) ? 'var(--color-accent-lavender)' : 'var(--color-border-light)',
                            backgroundColor: selectedExpenses.has(expense.id) ? 'var(--color-accent-lavender)' : 'transparent',
                          }}
                        >
                          {selectedExpenses.has(expense.id) && <Check size={12} className="text-white" />}
                        </div>
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: expense.category.color || '#6B7280' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {expense.description}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {expense.category.name}
                            {expense.vendor && ` · ${expense.vendor}`}
                          </p>
                        </div>
                        <span className="text-sm font-medium shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                          {parseFloat(expense.amount).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedExpenses.size > 0 && (
                    <p className="text-xs mt-2" style={{ color: 'var(--color-status-success)' }}>
                      +{selectedExpensesTotal.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })} de dépenses sélectionnées
                    </p>
                  )}
                </div>
              )}

              {/* Montant calculé */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(197, 184, 227, 0.1)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Montant de la facture
                  </span>
                  <span className="text-xl font-semibold" style={{ color: 'var(--color-accent-lavender)' }}>
                    {calculatedAmount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                  </span>
                </div>
                {selectedExpenses.size > 0 && (
                  <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    <span>Dont dépenses:</span>
                    <span>{selectedExpensesTotal.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}</span>
                  </div>
                )}
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  + TPS et TVQ seront calculées automatiquement
                </p>
              </div>

              {/* Items inclus - masqué en mode dépenses uniquement */}
              {itemTitles.length > 0 && !expensesOnlyMode && (
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
            </>
          )}
        </div>

        {/* Footer */}
        {mode === 'configure' && (
          <div
            className="flex justify-end gap-3 p-4 border-t sticky bottom-0"
            style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-primary)' }}
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
              disabled={
                creating ||
                (expensesOnlyMode
                  ? selectedExpensesTotal <= 0 // Mode dépenses: besoin d'au moins une dépense
                  : (baseAmount <= 0 || baseAmount > remainingBalance + 0.01)) // Mode normal
              }
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-accent-lavender)',
                color: '#1a1a1a',
                opacity: creating ||
                  (expensesOnlyMode
                    ? selectedExpensesTotal <= 0
                    : (baseAmount <= 0 || baseAmount > remainingBalance + 0.01))
                  ? 0.5 : 1,
              }}
            >
              <Receipt size={16} />
              {creating ? 'Création...' : 'Créer la facture'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
