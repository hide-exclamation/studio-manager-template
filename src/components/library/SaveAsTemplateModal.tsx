'use client'

import { useState } from 'react'
import { X, FileText, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui'

type SaveAsTemplateModalProps = {
  isOpen: boolean
  onClose: () => void
  quoteId: string
  quoteName: string
}

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  quoteId,
  quoteName,
}: SaveAsTemplateModalProps) {
  const toast = useToast()
  const [name, setName] = useState(quoteName)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Le nom du template est requis')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/templates/from-quote/${quoteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la création du template')
        return
      }

      toast.success('Template créé avec succès')
      onClose()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Erreur lors de la création du template')
    } finally {
      setSaving(false)
    }
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
        className="relative w-full max-w-md rounded-xl p-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'rgba(197, 184, 227, 0.2)' }}
            >
              <FileText size={20} style={{ color: 'var(--color-accent-lavender)' }} />
            </div>
            <h2
              className="text-lg font-medium"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
            >
              Sauvegarder comme template
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label
              className="text-xs block mb-1.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Nom du template *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Projet web standard"
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
              autoFocus
            />
          </div>

          <div>
            <label
              className="text-xs block mb-1.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez ce template..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Ce template inclura toutes les sections, items et paramètres de ce devis.
            Il pourra être réutilisé pour créer de nouveaux devis rapidement.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
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
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-bg-dark)',
              color: 'var(--color-text-inverse)',
            }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Enregistrement...' : 'Créer le template'}
          </button>
        </div>
      </div>
    </div>
  )
}
