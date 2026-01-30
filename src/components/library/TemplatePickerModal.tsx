'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText, Loader2, Layers, Calendar, ChevronRight } from 'lucide-react'
import { useToast } from '@/components/ui'

type Template = {
  id: string
  name: string
  description: string | null
  createdAt: string
  sections: Array<{
    id: string
    title: string
    items: Array<{ id: string }>
  }>
}

type TemplatePickerModalProps = {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export function TemplatePickerModal({
  isOpen,
  onClose,
  projectId,
}: TemplatePickerModalProps) {
  const router = useRouter()
  const toast = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/templates')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || 'Erreur lors du chargement des templates')
        return
      }
      const data = await res.json()
      setTemplates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Erreur lors du chargement des templates')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!selectedId) return

    setCreating(true)
    try {
      const res = await fetch(`/api/quotes/from-template/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la création du devis')
        return
      }

      const quote = await res.json()
      router.push(`/devis/${quote.id}`)
    } catch (error) {
      console.error('Error creating quote from template:', error)
      toast.error('Erreur lors de la création du devis')
      setCreating(false)
    }
  }

  if (!isOpen) return null

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const countItems = (template: Template) => {
    return template.sections.reduce((acc, s) => acc + s.items.length, 0)
  }

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
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--color-border-light)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'rgba(197, 184, 227, 0.2)' }}
            >
              <Layers size={20} style={{ color: 'var(--color-accent-lavender)' }} />
            </div>
            <div>
              <h2
                className="text-lg font-medium"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Créer depuis un template
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Sélectionnez un template pour pré-remplir le devis
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
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText
                size={48}
                strokeWidth={1}
                className="mx-auto mb-4"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <p style={{ color: 'var(--color-text-muted)' }}>
                Aucun template disponible
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Créez un devis puis sauvegardez-le comme template
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedId(template.id)}
                  className="w-full p-4 rounded-lg text-left transition-all"
                  style={{
                    backgroundColor: selectedId === template.id
                      ? 'rgba(197, 184, 227, 0.15)'
                      : 'var(--color-bg-tertiary)',
                    border: selectedId === template.id
                      ? '2px solid var(--color-accent-lavender)'
                      : '1px solid var(--color-border-light)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3
                        className="font-medium text-sm"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {template.name}
                      </h3>
                      {template.description && (
                        <p
                          className="text-xs mt-1 line-clamp-2"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Layers size={12} />
                          {template.sections.length} section{template.sections.length !== 1 ? 's' : ''}
                          {' · '}
                          {countItems(template)} item{countItems(template) !== 1 ? 's' : ''}
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
                    <ChevronRight
                      size={16}
                      style={{
                        color: selectedId === template.id
                          ? 'var(--color-accent-lavender)'
                          : 'var(--color-text-muted)',
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--color-border-light)' }}
        >
          <button
            onClick={onClose}
            disabled={creating}
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
            onClick={handleCreate}
            disabled={creating || !selectedId}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-bg-dark)',
              color: 'var(--color-text-inverse)',
            }}
          >
            {creating && <Loader2 size={14} className="animate-spin" />}
            {creating ? 'Création...' : 'Créer le devis'}
          </button>
        </div>
      </div>
    </div>
  )
}
