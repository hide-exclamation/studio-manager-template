'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  Building2,
  FolderKanban,
  FileText,
  Calendar,
  CreditCard,
  Send,
  Check,
  X,
  Receipt,
  AlertTriangle,
} from 'lucide-react'
import { useToast, useConfirm, Tooltip } from '@/components/ui'
import { SendEmailModal } from '@/components/email/SendEmailModal'
import { DEFAULTS } from '@/lib/settings'

type InvoiceItem = {
  id: string
  invoiceId: string
  description: string
  quantity: number
  unitPrice: string
  total: string
  sortOrder: number
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
  DEPOSIT: 'Facture de dépôt',
  PARTIAL: 'Facture partielle',
  FINAL: 'Facture finale',
  STANDALONE: 'Facture',
}

export function InvoiceEditor({ initialInvoice }: { initialInvoice: Invoice }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice)
  const [saving, setSaving] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'VIREMENT',
  })
  const [taxRates, setTaxRates] = useState({
    tpsRate: DEFAULTS.defaultTpsRate,
    tvqRate: DEFAULTS.defaultTvqRate,
  })

  const isEditable = invoice.status === 'DRAFT' || invoice.status === 'SENT'

  // Fetch tax rates from settings
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setTaxRates({
          tpsRate: Number(data.defaultTpsRate) || DEFAULTS.defaultTpsRate,
          tvqRate: Number(data.defaultTvqRate) || DEFAULTS.defaultTvqRate,
        })
      })
      .catch(() => {
        // Use defaults if fetch fails
      })
  }, [])

  // Calculs
  const calculateTotals = useCallback((items: InvoiceItem[]) => {
    const subtotal = items.reduce((sum, item) => {
      return sum + parseFloat(item.total)
    }, 0)

    const tpsAmount = subtotal * taxRates.tpsRate
    const tvqAmount = subtotal * taxRates.tvqRate
    const lateFee = invoice.lateFeeApplied ? parseFloat(invoice.lateFeeAmount) : 0
    const total = subtotal + tpsAmount + tvqAmount + lateFee

    return { subtotal, tpsAmount, tvqAmount, total }
  }, [invoice.lateFeeApplied, invoice.lateFeeAmount, taxRates])

  const totals = calculateTotals(invoice.items)
  const balanceDue = totals.total - parseFloat(invoice.amountPaid)

  // Sauvegarder la facture
  const saveInvoice = async () => {
    setSaving(true)
    try {
      await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          notes: invoice.notes,
          subtotal: totals.subtotal,
          tpsAmount: totals.tpsAmount,
          tvqAmount: totals.tvqAmount,
          total: totals.total,
        }),
      })
      router.refresh()
    } catch (error) {
      console.error('Error saving invoice:', error)
    } finally {
      setSaving(false)
    }
  }

  // Ajouter un item
  const addItem = async () => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Nouvel item', quantity: 1, unitPrice: 0 }),
      })
      const updatedInvoice = await res.json()
      setInvoice(prev => ({
        ...prev,
        items: updatedInvoice.items.map((i: any) => ({
          ...i,
          unitPrice: i.unitPrice.toString(),
          total: i.total.toString(),
        })),
      }))
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  // Supprimer un item
  const deleteItem = async (itemId: string) => {
    try {
      await fetch(`/api/invoices/items/${itemId}`, {
        method: 'DELETE',
      })
      setInvoice(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== itemId)
      }))
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  // Mettre a jour un item
  const updateItem = async (itemId: string, field: string, value: any) => {
    // Mise a jour locale optimiste
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== itemId) return item

        const updated = { ...item, [field]: value }

        // Recalculer le total de l'item
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? value : item.quantity
          const price = field === 'unitPrice' ? parseFloat(value) : parseFloat(item.unitPrice)
          updated.total = (qty * price).toString()
        }

        return updated
      })
    }))

    try {
      await fetch(`/api/invoices/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  // Changer le statut
  const updateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        const updated = await res.json()
        setInvoice(prev => ({ ...prev, status: updated.status }))
        router.refresh()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  // Supprimer la facture
  const deleteInvoice = async () => {
    const confirmed = await confirm({
      title: 'Supprimer la facture',
      message: 'Cette action est irréversible. La facture sera définitivement supprimée.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) {
      return
    }

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/factures')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  // Enregistrer un paiement
  const recordPayment = async () => {
    const amount = parseFloat(paymentData.amount) || balanceDue

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: amount >= balanceDue ? 'PAID' : invoice.status,
          amountPaid: parseFloat(invoice.amountPaid) + amount,
          paymentDate: paymentData.date,
          paymentMethod: paymentData.method,
        }),
      })

      if (res.ok) {
        setShowPaymentModal(false)
        router.refresh()
      }
    } catch (error) {
      console.error('Error recording payment:', error)
    }
  }

  // Frais de retard (2% après 30 jours)
  const LATE_FEE_RATE = 0.02
  const LATE_FEE_DAYS = 30

  const getDaysOverdue = () => {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') return 0
    const dueDate = new Date(invoice.dueDate)
    const today = new Date()
    const diffTime = today.getTime() - dueDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const daysOverdue = getDaysOverdue()
  const isEligibleForLateFee = daysOverdue >= LATE_FEE_DAYS && !invoice.lateFeeApplied && invoice.status !== 'PAID'
  const calculatedLateFee = totals.subtotal * LATE_FEE_RATE

  const applyLateFee = async () => {
    const confirmed = await confirm({
      title: 'Appliquer les frais de retard',
      message: `Des frais de ${formatCurrency(calculatedLateFee)} (2% du sous-total) seront ajoutés à la facture.`,
      confirmText: 'Appliquer',
      variant: 'warning',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lateFeeApplied: true,
          lateFeeAmount: calculatedLateFee,
          total: totals.total + calculatedLateFee,
        }),
      })

      if (res.ok) {
        setInvoice(prev => ({
          ...prev,
          lateFeeApplied: true,
          lateFeeAmount: calculatedLateFee.toString(),
        }))
        router.refresh()
      }
    } catch (error) {
      console.error('Error applying late fee:', error)
    }
  }

  const removeLateFee = async () => {
    const confirmed = await confirm({
      title: 'Retirer les frais de retard',
      message: 'Les frais de retard seront retirés de la facture.',
      confirmText: 'Retirer',
      variant: 'warning',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lateFeeApplied: false,
          lateFeeAmount: 0,
          total: totals.total - parseFloat(invoice.lateFeeAmount),
        }),
      })

      if (res.ok) {
        setInvoice(prev => ({
          ...prev,
          lateFeeApplied: false,
          lateFeeAmount: '0',
        }))
        router.refresh()
      }
    } catch (error) {
      console.error('Error removing late fee:', error)
    }
  }

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-6 py-4"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border-light)',
        }}
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/factures"
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <ArrowLeft size={20} />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-lg font-medium"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
                >
                  {invoice.invoiceNumber}
                </h1>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: statusColors[invoice.status].bg,
                    color: statusColors[invoice.status].text,
                  }}
                >
                  {statusLabels[invoice.status]}
                </span>
                {invoice.invoiceType !== 'STANDALONE' && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'rgba(197, 184, 227, 0.2)',
                      color: 'var(--color-accent-lavender)',
                    }}
                  >
                    {typeLabels[invoice.invoiceType].replace('Facture ', '')}
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {invoice.project.client.companyName} · {invoice.project.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Actions principales */}
            {isEditable && (
              <button
                onClick={saveInvoice}
                disabled={saving}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-bg-dark)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                <Save size={16} />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            )}

            {(invoice.status === 'DRAFT' || invoice.status === 'SENT') && (
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--color-bg-dark)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                <Send size={16} />
                {invoice.status === 'DRAFT' ? 'Envoyer' : 'Renvoyer'}
              </button>
            )}

            {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
              <button
                onClick={() => {
                  setPaymentData(prev => ({ ...prev, amount: balanceDue.toFixed(2) }))
                  setShowPaymentModal(true)
                }}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--color-bg-dark)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                <CreditCard size={16} />
                Paiement
              </button>
            )}

            {/* Séparateur */}
            <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--color-border-light)' }} />

            {/* Actions secondaires */}
            {invoice.publicToken && (
              <Tooltip content="Aperçu client">
                <Link
                  href={`/factures/public/${invoice.publicToken}`}
                  target="_blank"
                  className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <Eye size={16} />
                </Link>
              </Tooltip>
            )}

            {/* Separateur */}
            <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--color-border-light)' }} />

            {/* Action danger - toujours a la fin */}
            {isEditable && (
              <Tooltip content="Supprimer">
                <button
                  onClick={deleteInvoice}
                  className="btn-icon-danger flex items-center gap-2 p-2 rounded-lg text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Trash2 size={18} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dates */}
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <h2
                className="text-base mb-4"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Dates
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Date d'emission
                  </label>
                  <input
                    type="date"
                    value={invoice.issueDate.split('T')[0]}
                    onChange={(e) => setInvoice(prev => ({ ...prev, issueDate: e.target.value }))}
                    disabled={!isEditable}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                      opacity: isEditable ? 1 : 0.7,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    value={invoice.dueDate.split('T')[0]}
                    onChange={(e) => setInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                    disabled={!isEditable}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                      opacity: isEditable ? 1 : 0.7,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <h2
                className="text-base mb-4"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Items
              </h2>

              <div className="space-y-3">
                {invoice.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        {/* Item description */}
                        <textarea
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          disabled={!isEditable}
                          placeholder="Description de l'item..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                          style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-light)',
                            color: 'var(--color-text-primary)',
                            opacity: isEditable ? 1 : 0.7,
                          }}
                        />

                        {/* Item price */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Qte</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              disabled={!isEditable}
                              min={1}
                              className="w-16 px-2 py-1 rounded text-sm text-center"
                              style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border-light)',
                                color: 'var(--color-text-primary)',
                                opacity: isEditable ? 1 : 0.7,
                              }}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Prix</label>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                              disabled={!isEditable}
                              step="0.01"
                              className="w-28 px-2 py-1 rounded text-sm text-right"
                              style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border-light)',
                                color: 'var(--color-text-primary)',
                                opacity: isEditable ? 1 : 0.7,
                              }}
                            />
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>$</span>
                          </div>

                          <div className="flex-1 text-right">
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {formatCurrency(parseFloat(item.total))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isEditable && (
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="btn-icon-danger p-1.5 rounded"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add item button */}
              {isEditable && (
                <button
                  onClick={addItem}
                  className="btn-dashed w-full mt-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                  style={{
                    border: '1px dashed var(--color-border-light)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <Plus size={14} />
                  Ajouter un item
                </button>
              )}
            </div>

            {/* Notes */}
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <h2
                className="text-base mb-4"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Notes
              </h2>
              <textarea
                value={invoice.notes || ''}
                onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
                disabled={!isEditable}
                placeholder="Notes internes ou conditions de paiement..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border-light)',
                  color: 'var(--color-text-primary)',
                  opacity: isEditable ? 1 : 0.7,
                }}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project info */}
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
                Projet
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <Building2 size={14} />
                  <span>{invoice.project.client.companyName}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <FolderKanban size={14} />
                  <span>{projectCode} - {invoice.project.name}</span>
                </div>
                {invoice.quote && (
                  <Link
                    href={`/devis/${invoice.quote.id}`}
                    className="flex items-center gap-2 transition-colors hover:opacity-70"
                    style={{ color: 'var(--color-accent-lavender)' }}
                  >
                    <FileText size={14} />
                    <span>Devis {invoice.quote.quoteNumber}</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Totals */}
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
                Totaux
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Sous-total</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(totals.subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>TPS (5%)</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(totals.tpsAmount)}</span>
                </div>

                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>TVQ (9.975%)</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(totals.tvqAmount)}</span>
                </div>

                {invoice.lateFeeApplied && parseFloat(invoice.lateFeeAmount) > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-status-error)' }}>Frais de retard</span>
                    <span style={{ color: 'var(--color-status-error)' }}>{formatCurrency(parseFloat(invoice.lateFeeAmount))}</span>
                  </div>
                )}

                <div
                  className="flex justify-between pt-2 mt-2"
                  style={{ borderTop: '1px solid var(--color-border-light)' }}
                >
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Total</span>
                  <span
                    className="text-lg font-medium"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
                  >
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment status */}
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
                Paiement
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Payé</span>
                  <span style={{ color: 'var(--color-status-success)' }}>
                    {formatCurrency(parseFloat(invoice.amountPaid))}
                  </span>
                </div>

                <div
                  className="flex justify-between pt-2 mt-2"
                  style={{ borderTop: '1px solid var(--color-border-light)' }}
                >
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Solde du</span>
                  <span
                    className="text-lg font-medium"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      color: balanceDue > 0 ? 'var(--color-status-error)' : 'var(--color-status-success)',
                    }}
                  >
                    {formatCurrency(balanceDue)}
                  </span>
                </div>

                {invoice.paymentDate && (
                  <div className="flex items-center gap-2 pt-2" style={{ color: 'var(--color-text-muted)' }}>
                    <Calendar size={14} />
                    <span>Paye le {formatDate(invoice.paymentDate)}</span>
                  </div>
                )}

                {invoice.paymentMethod && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                    <CreditCard size={14} />
                    <span>{invoice.paymentMethod}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {invoice.status !== 'PAID' && (
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
                  Actions
                </h3>

                <div className="space-y-2">
                  {invoice.status !== 'CANCELLED' && (
                    <button
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Annuler la facture',
                          message: 'La facture restera dans le système comme annulée.',
                          confirmText: 'Annuler la facture',
                          variant: 'warning',
                        })
                        if (confirmed) {
                          updateStatus('CANCELLED')
                        }
                      }}
                      className="btn-ghost w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        color: 'var(--color-status-warning)',
                      }}
                    >
                      <X size={16} />
                      Annuler la facture
                    </button>
                  )}
                  <button
                    onClick={deleteInvoice}
                    className="btn-danger w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--color-status-error)',
                    }}
                  >
                    <Trash2 size={16} />
                    Supprimer définitivement
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <h3
              className="text-lg mb-4"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
            >
              Enregistrer un paiement
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Montant
                </label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                  step="0.01"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Date de paiement
                </label>
                <input
                  type="date"
                  value={paymentData.date}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Methode de paiement
                </label>
                <select
                  value={paymentData.method}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, method: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="VIREMENT">Virement bancaire</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CARTE">Carte de credit</option>
                  <option value="COMPTANT">Comptant</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn-secondary flex-1 px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Annuler
              </button>
              <button
                onClick={recordPayment}
                className="btn-success flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--color-status-success)',
                  color: 'white',
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send email modal */}
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        type="invoice"
        itemId={invoice.id}
        itemNumber={invoice.invoiceNumber}
        recipientEmail={invoice.project.client.contacts[0]?.email || ''}
        recipientName={invoice.project.client.contacts[0]?.name || invoice.project.client.companyName}
        onSent={() => {
          setInvoice(prev => ({ ...prev, status: 'SENT' }))
          router.refresh()
          setShowEmailModal(false)
          toast.success('Email envoyé avec succès')
        }}
      />
    </div>
  )
}
