'use client'

import { useState, useEffect } from 'react'
import { X, Package, Loader2, Tag, Search } from 'lucide-react'
import { useToast } from '@/components/ui'

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
}

type InsertItemModalProps = {
  isOpen: boolean
  onClose: () => void
  onInsert: (item: LibraryItem) => Promise<void>
}

export function InsertItemModal({
  isOpen,
  onClose,
  onInsert,
}: InsertItemModalProps) {
  const toast = useToast()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [inserting, setInserting] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchItems()
    }
  }, [isOpen])

  const fetchItems = async () => {
    setLoading(true)
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

  const handleInsert = async () => {
    const item = items.find((i) => i.id === selectedId)
    if (!item) return

    setInserting(true)
    try {
      await onInsert(item)
      onClose()
    } catch (error) {
      console.error('Error inserting item:', error)
      toast.error('Erreur lors de l\'insertion')
    } finally {
      setInserting(false)
    }
  }

  if (!isOpen) return null

  const formatCurrency = (amount: string) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(parseFloat(amount))

  // Filter items by search
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(search.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
  )

  // Group by category
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'Sans catégorie'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, LibraryItem[]>)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-light)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'rgba(197, 184, 227, 0.2)' }}
            >
              <Package size={20} style={{ color: 'var(--color-accent-lavender)' }} />
            </div>
            <div>
              <h2
                className="text-lg font-medium"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Insérer un item
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Choisissez un item de la bibliothèque
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un item..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Package
                size={48}
                strokeWidth={1}
                className="mx-auto mb-4"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <p style={{ color: 'var(--color-text-muted)' }}>
                Aucun item disponible
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Créez des items dans la bibliothèque
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'var(--color-text-muted)' }}>
                Aucun résultat pour "{search}"
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag size={14} style={{ color: 'var(--color-text-muted)' }} />
                    <h3
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {category}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {categoryItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className="w-full p-3 rounded-lg text-left transition-all"
                        style={{
                          backgroundColor: selectedId === item.id
                            ? 'rgba(197, 184, 227, 0.15)'
                            : 'var(--color-bg-tertiary)',
                          border: selectedId === item.id
                            ? '2px solid var(--color-accent-lavender)'
                            : '1px solid var(--color-border-light)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
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
                          <div className="text-right shrink-0">
                            <span
                              className="text-sm font-medium"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {item.billingMode === 'HOURLY'
                                ? `${item.estimatedHours || 0}h × ${formatCurrency(item.hourlyRate || '0')}`
                                : formatCurrency(item.defaultPrice)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex justify-end gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--color-border-light)' }}
        >
          <button
            onClick={onClose}
            disabled={inserting}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleInsert}
            disabled={inserting || !selectedId}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-bg-dark)',
              color: 'var(--color-text-inverse)',
            }}
          >
            {inserting && <Loader2 size={14} className="animate-spin" />}
            {inserting ? 'Insertion...' : 'Insérer l\'item'}
          </button>
        </div>
      </div>
    </div>
  )
}
