'use client'

import { useState, useEffect } from 'react'
import {
  Package,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  X,
  Check,
  Tag,
} from 'lucide-react'
import { useToast, useConfirm } from '@/components/ui'

type LibraryItem = {
  id: string
  name: string
  category: string | null
  itemTypes: string[]
  description: string | null
  billingMode: 'FIXED' | 'HOURLY'
  defaultQuantity: number
  defaultPrice: string
  hourlyRate: string | null
  estimatedHours: string | null
  sortOrder: number
}

export function ItemsList() {
  const toast = useToast()
  const confirm = useConfirm()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formBillingMode, setFormBillingMode] = useState<'FIXED' | 'HOURLY'>('FIXED')
  const [formQuantity, setFormQuantity] = useState('1')
  const [formPrice, setFormPrice] = useState('0')
  const [formHourlyRate, setFormHourlyRate] = useState('')
  const [formHours, setFormHours] = useState('')

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/library/items')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || 'Erreur lors du chargement')
        return
      }
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching items:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormCategory('')
    setFormDescription('')
    setFormBillingMode('FIXED')
    setFormQuantity('1')
    setFormPrice('0')
    setFormHourlyRate('')
    setFormHours('')
  }

  const handleAdd = async () => {
    if (!formName.trim()) {
      toast.error('Le nom est requis')
      return
    }

    setAdding(true)
    try {
      const res = await fetch('/api/library/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          category: formCategory.trim() || null,
          description: formDescription.trim() || null,
          billingMode: formBillingMode,
          defaultQuantity: parseInt(formQuantity) || 1,
          defaultPrice: parseFloat(formPrice) || 0,
          hourlyRate: formHourlyRate ? parseFloat(formHourlyRate) : null,
          estimatedHours: formHours ? parseFloat(formHours) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error)
        return
      }

      const item = await res.json()
      setItems((prev) => [...prev, item])
      setShowAddForm(false)
      resetForm()
      toast.success('Item créé')
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Erreur lors de la création')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'item',
      message: 'Cette action est irréversible.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/library/items/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error)
        return
      }
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success('Item supprimé')
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const startEdit = (item: LibraryItem) => {
    setEditingId(item.id)
    setFormName(item.name)
    setFormCategory(item.category || '')
    setFormDescription(item.description || '')
    setFormBillingMode(item.billingMode)
    setFormQuantity(String(item.defaultQuantity))
    setFormPrice(item.defaultPrice)
    setFormHourlyRate(item.hourlyRate || '')
    setFormHours(item.estimatedHours || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    resetForm()
  }

  const saveEdit = async (id: string) => {
    if (!formName.trim()) {
      toast.error('Le nom est requis')
      return
    }

    try {
      const res = await fetch(`/api/library/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          category: formCategory.trim() || null,
          description: formDescription.trim() || null,
          billingMode: formBillingMode,
          defaultQuantity: parseInt(formQuantity) || 1,
          defaultPrice: parseFloat(formPrice) || 0,
          hourlyRate: formHourlyRate ? parseFloat(formHourlyRate) : null,
          estimatedHours: formHours ? parseFloat(formHours) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error)
        return
      }

      const updated = await res.json()
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
      cancelEdit()
      toast.success('Item mis à jour')
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const formatCurrency = (amount: string) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(parseFloat(amount))

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const cat = item.category || 'Sans catégorie'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, LibraryItem[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    )
  }

  const renderForm = (itemId?: string) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Nom *
          </label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Nom de l'item"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-primary)',
            }}
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Catégorie
          </label>
          <input
            type="text"
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
            placeholder="Ex: Design, Développement..."
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      </div>

      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>
          Description
        </label>
        <textarea
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          placeholder="Description de l'item..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border-light)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Mode:</span>
        <button
          onClick={() => setFormBillingMode('FIXED')}
          className="px-2 py-1 rounded text-xs transition-colors"
          style={{
            backgroundColor: formBillingMode === 'FIXED' ? 'var(--color-bg-dark)' : 'var(--color-bg-tertiary)',
            color: formBillingMode === 'FIXED' ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          Fixe
        </button>
        <button
          onClick={() => setFormBillingMode('HOURLY')}
          className="px-2 py-1 rounded text-xs transition-colors"
          style={{
            backgroundColor: formBillingMode === 'HOURLY' ? 'var(--color-bg-dark)' : 'var(--color-bg-tertiary)',
            color: formBillingMode === 'HOURLY' ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          Horaire
        </button>
      </div>

      {formBillingMode === 'FIXED' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Quantité par défaut
            </label>
            <input
              type="number"
              value={formQuantity}
              onChange={(e) => setFormQuantity(e.target.value)}
              min={1}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Prix par défaut ($)
            </label>
            <input
              type="number"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              step="0.01"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Heures estimées
            </label>
            <input
              type="number"
              value={formHours}
              onChange={(e) => setFormHours(e.target.value)}
              step="0.5"
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Taux horaire ($)
            </label>
            <input
              type="number"
              value={formHourlyRate}
              onChange={(e) => setFormHourlyRate(e.target.value)}
              step="0.01"
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={itemId ? cancelEdit : () => {
            setShowAddForm(false)
            resetForm()
          }}
          disabled={adding}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Annuler
        </button>
        <button
          onClick={itemId ? () => saveEdit(itemId) : handleAdd}
          disabled={adding || !formName.trim()}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-bg-dark)',
            color: 'var(--color-text-inverse)',
          }}
        >
          {adding && <Loader2 size={14} className="animate-spin" />}
          {itemId ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Add button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
          style={{
            border: '2px dashed var(--color-border-light)',
            color: 'var(--color-text-muted)',
          }}
        >
          <Plus size={18} />
          Ajouter un item
        </button>
      )}

      {/* Add form */}
      {showAddForm && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-accent-lavender)',
          }}
        >
          {renderForm()}
        </div>
      )}

      {/* Items list */}
      {items.length === 0 && !showAddForm ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <Package
            size={48}
            strokeWidth={1}
            className="mx-auto mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <h3
            className="text-lg font-medium mb-2"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
          >
            Aucun item
          </h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Créez des items réutilisables pour vos devis.
          </p>
        </div>
      ) : (
        Object.entries(itemsByCategory).map(([category, categoryItems]) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-2 px-2">
              <Tag size={14} style={{ color: 'var(--color-text-muted)' }} />
              <h3
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {category}
              </h3>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                ({categoryItems.length})
              </span>
            </div>

            <div className="space-y-2">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-light)',
                  }}
                >
                  {editingId === item.id ? (
                    <div className="p-4">{renderForm(item.id)}</div>
                  ) : (
                    <div className="flex items-center gap-4 p-4">
                      <div
                        className="p-2 rounded-lg shrink-0"
                        style={{ backgroundColor: 'rgba(197, 184, 227, 0.15)' }}
                      >
                        <Package size={18} style={{ color: 'var(--color-accent-lavender)' }} />
                      </div>
                      <div className="flex-1">
                        <h4
                          className="font-medium text-sm"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {item.name}
                        </h4>
                        {item.description && (
                          <p
                            className="text-xs mt-0.5 line-clamp-1"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {item.billingMode === 'HOURLY'
                            ? `${item.estimatedHours || 0}h × ${formatCurrency(item.hourlyRate || '0')}`
                            : formatCurrency(item.defaultPrice)}
                        </span>
                        <span
                          className="block text-xs"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {item.billingMode === 'HOURLY' ? 'Taux horaire' : `Qté: ${item.defaultQuantity}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-text-muted)' }}
                          title="Modifier"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--color-text-muted)' }}
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
