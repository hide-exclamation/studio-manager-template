'use client'

import { useState, useEffect } from 'react'
import { X, LayoutList, Loader2, ChevronRight, Package } from 'lucide-react'
import { useToast } from '@/components/ui'

type SectionItem = {
  id: string
  name: string
  description: string | null
  billingMode: 'FIXED' | 'HOURLY'
  quantity: number
  unitPrice: string
  hourlyRate: string | null
  hours: string | null
}

type Section = {
  id: string
  name: string
  description: string | null
  items: SectionItem[]
}

type InsertSectionModalProps = {
  isOpen: boolean
  onClose: () => void
  onInsert: (section: Section) => Promise<void>
}

export function InsertSectionModal({
  isOpen,
  onClose,
  onInsert,
}: InsertSectionModalProps) {
  const toast = useToast()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [inserting, setInserting] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchSections()
    }
  }, [isOpen])

  const fetchSections = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/library/sections')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || 'Erreur lors du chargement')
        return
      }
      const data = await res.json()
      setSections(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching sections:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleInsert = async () => {
    const section = sections.find((s) => s.id === selectedId)
    if (!section) return

    setInserting(true)
    try {
      await onInsert(section)
      onClose()
    } catch (error) {
      console.error('Error inserting section:', error)
      toast.error('Erreur lors de l\'insertion')
    } finally {
      setInserting(false)
    }
  }

  if (!isOpen) return null

  const formatCurrency = (amount: string) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(parseFloat(amount))

  const selectedSection = sections.find((s) => s.id === selectedId)

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
              <LayoutList size={20} style={{ color: 'var(--color-accent-lavender)' }} />
            </div>
            <div>
              <h2
                className="text-lg font-medium"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Insérer une section
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Choisissez une section de la bibliothèque
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-12">
              <LayoutList
                size={48}
                strokeWidth={1}
                className="mx-auto mb-4"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <p style={{ color: 'var(--color-text-muted)' }}>
                Aucune section disponible
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Créez des sections dans la bibliothèque
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedId(section.id)}
                  className="p-4 rounded-lg text-left transition-all"
                  style={{
                    backgroundColor: selectedId === section.id
                      ? 'rgba(197, 184, 227, 0.15)'
                      : 'var(--color-bg-tertiary)',
                    border: selectedId === section.id
                      ? '2px solid var(--color-accent-lavender)'
                      : '1px solid var(--color-border-light)',
                  }}
                >
                  <h3
                    className="font-medium text-sm"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {section.name}
                  </h3>
                  {section.description && (
                    <p
                      className="text-xs mt-1 line-clamp-1"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {section.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Package size={12} style={{ color: 'var(--color-text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {section.items.length} item{section.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Preview selected section */}
          {selectedSection && selectedSection.items.length > 0 && (
            <div
              className="mt-4 p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Items inclus:
              </h4>
              <ul className="space-y-1.5">
                {selectedSection.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span style={{ color: 'var(--color-text-secondary)' }}>{item.name}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {item.billingMode === 'HOURLY'
                        ? `${item.hours || 0}h × ${formatCurrency(item.hourlyRate || '0')}`
                        : `${item.quantity}× ${formatCurrency(item.unitPrice)}`}
                    </span>
                  </li>
                ))}
              </ul>
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
            {inserting ? 'Insertion...' : 'Insérer la section'}
          </button>
        </div>
      </div>
    </div>
  )
}
