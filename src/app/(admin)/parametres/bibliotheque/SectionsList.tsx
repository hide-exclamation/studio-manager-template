'use client'

import { useState, useEffect } from 'react'
import {
  LayoutList,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  GripVertical,
} from 'lucide-react'
import { useToast, useConfirm } from '@/components/ui'

type SectionItem = {
  id: string
  name: string
  description: string | null
  billingMode: 'FIXED' | 'HOURLY'
  quantity: number
  unitPrice: string
  hourlyRate: string | null
  hours: string | null
  sortOrder: number
}

type Section = {
  id: string
  name: string
  description: string | null
  sortOrder: number
  items: SectionItem[]
}

export function SectionsList() {
  const toast = useToast()
  const confirm = useConfirm()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchSections()
  }, [])

  const fetchSections = async () => {
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

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error('Le nom est requis')
      return
    }

    setAdding(true)
    try {
      const res = await fetch('/api/library/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error)
        return
      }

      const section = await res.json()
      setSections((prev) => [...prev, { ...section, items: [] }])
      setShowAddForm(false)
      setNewName('')
      setNewDescription('')
      toast.success('Section créée')
    } catch (error) {
      console.error('Error adding section:', error)
      toast.error('Erreur lors de la création')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la section',
      message: 'Cette action supprimera aussi tous les items de cette section.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/library/sections/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error)
        return
      }
      setSections((prev) => prev.filter((s) => s.id !== id))
      toast.success('Section supprimée')
    } catch (error) {
      console.error('Error deleting section:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const startEdit = (section: Section) => {
    setEditingId(section.id)
    setEditName(section.name)
    setEditDescription(section.description || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      toast.error('Le nom est requis')
      return
    }

    try {
      const res = await fetch(`/api/library/sections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error)
        return
      }

      const updated = await res.json()
      setSections((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, name: updated.name, description: updated.description } : s
        )
      )
      cancelEdit()
      toast.success('Section mise à jour')
    } catch (error) {
      console.error('Error updating section:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const formatCurrency = (amount: string) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(parseFloat(amount))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
          Ajouter une section
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
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de la section"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
              autoFocus
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optionnel)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewName('')
                  setNewDescription('')
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
                onClick={handleAdd}
                disabled={adding || !newName.trim()}
                className="px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-bg-dark)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                {adding && <Loader2 size={14} className="animate-spin" />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sections list */}
      {sections.length === 0 && !showAddForm ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <LayoutList
            size={48}
            strokeWidth={1}
            className="mx-auto mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <h3
            className="text-lg font-medium mb-2"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
          >
            Aucune section
          </h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Créez des sections réutilisables pour vos devis.
          </p>
        </div>
      ) : (
        sections.map((section) => (
          <div
            key={section.id}
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            {/* Header */}
            <div className="p-4">
              {editingId === section.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nom de la section"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                    autoFocus
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optionnel)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <X size={16} />
                    </button>
                    <button
                      onClick={() => saveEdit(section.id)}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: 'var(--color-status-success)' }}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg shrink-0"
                        style={{ backgroundColor: 'rgba(197, 184, 227, 0.15)' }}
                      >
                        <LayoutList size={18} style={{ color: 'var(--color-accent-lavender)' }} />
                      </div>
                      <div className="flex-1">
                        <h3
                          className="font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {section.name}
                        </h3>
                        {section.description && (
                          <p
                            className="text-sm mt-0.5"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {section.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 ml-11">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {section.items.length} item{section.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(section)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      title="Modifier"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(section.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {expandedId === section.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Expanded content */}
            {expandedId === section.id && editingId !== section.id && (
              <div
                className="px-4 pb-4"
                style={{ borderTop: '1px solid var(--color-border-light)' }}
              >
                <div className="pt-4 space-y-2">
                  {section.items.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                      Aucun item dans cette section
                    </p>
                  ) : (
                    section.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          border: '1px solid var(--color-border-light)',
                        }}
                      >
                        <GripVertical size={14} style={{ color: 'var(--color-text-muted)' }} />
                        <div className="flex-1">
                          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {item.billingMode === 'HOURLY'
                            ? `${item.hours || 0}h × ${formatCurrency(item.hourlyRate || '0')}`
                            : `${item.quantity}× ${formatCurrency(item.unitPrice)}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
