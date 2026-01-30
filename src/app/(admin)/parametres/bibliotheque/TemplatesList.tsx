'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Layers,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Check,
} from 'lucide-react'
import { useToast, useConfirm } from '@/components/ui'

type Template = {
  id: string
  name: string
  description: string | null
  coverTitle: string | null
  coverSubtitle: string | null
  introduction: string | null
  depositPercent: string
  paymentTerms: string | null
  lateFeePolicy: string | null
  createdAt: string
  updatedAt: string
  sections: Array<{
    id: string
    title: string
    description: string | null
    sortOrder: number
    items: Array<{
      id: string
      name: string
      unitPrice: string
    }>
  }>
}

export function TemplatesList() {
  const toast = useToast()
  const confirm = useConfirm()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || 'Erreur lors du chargement')
        return
      }
      const data = await res.json()
      setTemplates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le template',
      message: 'Cette action est irréversible.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error)
        return
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success('Template supprimé')
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const startEdit = (template: Template) => {
    setEditingId(template.id)
    setEditName(template.name)
    setEditDescription(template.description || '')
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
      const res = await fetch(`/api/templates/${id}`, {
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
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: updated.name, description: updated.description } : t))
      )
      cancelEdit()
      toast.success('Template mis à jour')
    } catch (error) {
      console.error('Error updating template:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
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

  if (templates.length === 0) {
    return (
      <div
        className="text-center py-16 rounded-xl"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <FileText
          size={48}
          strokeWidth={1}
          className="mx-auto mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <h3
          className="text-lg font-medium mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
        >
          Aucun template
        </h3>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Créez un devis puis sauvegardez-le comme template pour le réutiliser.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <div
          key={template.id}
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          {/* Header */}
          <div className="p-4">
            {editingId === template.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nom du template"
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
                    onClick={() => saveEdit(template.id)}
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
                      <FileText size={18} style={{ color: 'var(--color-accent-lavender)' }} />
                    </div>
                    <div className="flex-1">
                      <h3
                        className="font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {template.name}
                      </h3>
                      {template.description && (
                        <p
                          className="text-sm mt-0.5"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 ml-11">
                    <span
                      className="text-xs flex items-center gap-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <Layers size={12} />
                      {template.sections.length} section{template.sections.length !== 1 ? 's' : ''}
                    </span>
                    <span
                      className="text-xs flex items-center gap-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <Calendar size={12} />
                      {formatDate(template.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(template)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Modifier"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {expandedId === template.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Expanded content */}
          {expandedId === template.id && editingId !== template.id && (
            <div
              className="px-4 pb-4"
              style={{ borderTop: '1px solid var(--color-border-light)' }}
            >
              <div className="pt-4 space-y-3">
                {template.sections.map((section) => (
                  <div
                    key={section.id}
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                    }}
                  >
                    <h4
                      className="text-sm font-medium mb-2"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {section.title}
                    </h4>
                    {section.items.length > 0 ? (
                      <ul className="space-y-1">
                        {section.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span style={{ color: 'var(--color-text-secondary)' }}>{item.name}</span>
                            <span style={{ color: 'var(--color-text-muted)' }}>
                              {formatCurrency(item.unitPrice)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Aucun item
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
