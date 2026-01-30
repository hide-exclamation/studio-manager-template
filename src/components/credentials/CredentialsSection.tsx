'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Key,
  Plus,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
  History,
  X,
  Check,
  Loader2,
} from 'lucide-react'
import { useToast, useConfirm } from '@/components/ui'

type Credential = {
  id: string
  serviceName: string
  serviceUrl: string | null
  username: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

type CredentialWithPassword = Credential & {
  password: string
}

type HistoryEntry = {
  id: string
  fieldName: string
  oldValue: string | null
  newValue: string
  changedAt: string
}

type CredentialsSectionProps = {
  clientId: string
}

export function CredentialsSection({ clientId }: CredentialsSectionProps) {
  const toast = useToast()
  const confirm = useConfirm()
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    serviceName: '',
    serviceUrl: '',
    username: '',
    password: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Password visibility per credential
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({})
  const [loadingPasswords, setLoadingPasswords] = useState<Record<string, boolean>>({})

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/credentials`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setCredentials(data)
    } catch {
      toast.error('Erreur lors du chargement des identifiants')
    } finally {
      setLoading(false)
    }
  }, [clientId, toast])

  useEffect(() => {
    fetchCredentials()
  }, [fetchCredentials])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = editingId
        ? `/api/credentials/${editingId}`
        : `/api/clients/${clientId}/credentials`

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      toast.success(editingId ? 'Identifiant mis à jour' : 'Identifiant créé')
      setShowForm(false)
      setEditingId(null)
      setFormData({ serviceName: '', serviceUrl: '', username: '', password: '', notes: '' })
      fetchCredentials()
      // Clear visible password if we edited
      if (editingId) {
        setVisiblePasswords((prev) => {
          const newState = { ...prev }
          delete newState[editingId]
          return newState
        })
      }
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (id: string) => {
    setLoadingPasswords((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/credentials/${id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const cred: CredentialWithPassword = await res.json()

      setFormData({
        serviceName: cred.serviceName,
        serviceUrl: cred.serviceUrl || '',
        username: cred.username || '',
        password: cred.password,
        notes: cred.notes || '',
      })
      setEditingId(id)
      setShowForm(true)
    } catch {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoadingPasswords((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'identifiant',
      message: 'Cette action est irréversible.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/credentials/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Identifiant supprimé')
      fetchCredentials()
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const togglePasswordVisibility = async (id: string) => {
    if (visiblePasswords[id]) {
      // Hide password
      setVisiblePasswords((prev) => {
        const newState = { ...prev }
        delete newState[id]
        return newState
      })
    } else {
      // Fetch and show password
      setLoadingPasswords((prev) => ({ ...prev, [id]: true }))
      try {
        const res = await fetch(`/api/credentials/${id}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const cred: CredentialWithPassword = await res.json()
        setVisiblePasswords((prev) => ({ ...prev, [id]: cred.password }))
      } catch {
        toast.error('Erreur lors du chargement du mot de passe')
      } finally {
        setLoadingPasswords((prev) => ({ ...prev, [id]: false }))
      }
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copié`)
    } catch {
      toast.error('Erreur lors de la copie')
    }
  }

  const copyPassword = async (id: string) => {
    if (visiblePasswords[id]) {
      copyToClipboard(visiblePasswords[id], 'Mot de passe')
    } else {
      // Fetch password first
      try {
        const res = await fetch(`/api/credentials/${id}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const cred: CredentialWithPassword = await res.json()
        await navigator.clipboard.writeText(cred.password)
        toast.success('Mot de passe copié')
      } catch {
        toast.error('Erreur lors de la copie')
      }
    }
  }

  const loadHistory = async (id: string) => {
    if (showHistoryFor === id) {
      setShowHistoryFor(null)
      return
    }

    setLoadingHistory(true)
    setShowHistoryFor(id)
    try {
      const res = await fetch(`/api/credentials/${id}/history`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setHistory(data)
    } catch {
      toast.error('Erreur lors du chargement de l\'historique')
    } finally {
      setLoadingHistory(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const fieldLabels: Record<string, string> = {
    serviceName: 'Nom du service',
    serviceUrl: 'URL',
    username: 'Identifiant',
    password: 'Mot de passe',
    notes: 'Notes',
  }

  if (loading) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-text-muted)' }} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-light)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-base flex items-center gap-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
        >
          <Key size={18} />
          Identifiants
        </h3>
        <button
          onClick={() => {
            setFormData({ serviceName: '', serviceUrl: '', username: '', password: '', notes: '' })
            setEditingId(null)
            setShowForm(!showForm)
          }}
          className="btn-ghost flex items-center gap-1.5 text-sm px-2 py-1 rounded"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Annuler' : 'Ajouter'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Service *
              </label>
              <input
                type="text"
                required
                value={formData.serviceName}
                onChange={(e) => setFormData((f) => ({ ...f, serviceName: e.target.value }))}
                placeholder="Ex: WordPress Admin"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-light)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                URL
              </label>
              <input
                type="url"
                value={formData.serviceUrl}
                onChange={(e) => setFormData((f) => ({ ...f, serviceUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-light)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Identifiant
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData((f) => ({ ...f, username: e.target.value }))}
                placeholder="Nom d'utilisateur"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-light)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Mot de passe *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                placeholder="********"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-light)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes supplémentaires..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
              className="btn-secondary px-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-3 py-1.5 rounded-lg text-sm flex items-center gap-2"
              style={{
                backgroundColor: 'var(--color-bg-dark)',
                color: 'var(--color-text-inverse)',
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingId ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}

      {/* Credentials list */}
      {credentials.length > 0 ? (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <div key={cred.id}>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {cred.serviceName}
                      </span>
                      {cred.serviceUrl && (
                        <a
                          href={cred.serviceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {cred.username && (
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <span style={{ color: 'var(--color-text-muted)' }}>Identifiant:</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{cred.username}</span>
                        <button
                          onClick={() => copyToClipboard(cred.username!, 'Identifiant')}
                          className="btn-ghost p-1 rounded"
                          title="Copier"
                        >
                          <Copy size={12} style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span style={{ color: 'var(--color-text-muted)' }}>Mot de passe:</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {visiblePasswords[cred.id] || '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(cred.id)}
                        disabled={loadingPasswords[cred.id]}
                        className="btn-ghost p-1 rounded"
                        title={visiblePasswords[cred.id] ? 'Masquer' : 'Afficher'}
                      >
                        {loadingPasswords[cred.id] ? (
                          <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
                        ) : visiblePasswords[cred.id] ? (
                          <EyeOff size={12} style={{ color: 'var(--color-text-muted)' }} />
                        ) : (
                          <Eye size={12} style={{ color: 'var(--color-text-muted)' }} />
                        )}
                      </button>
                      <button
                        onClick={() => copyPassword(cred.id)}
                        className="btn-ghost p-1 rounded"
                        title="Copier"
                      >
                        <Copy size={12} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    </div>
                    {cred.notes && (
                      <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                        {cred.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => loadHistory(cred.id)}
                      className="btn-ghost p-1.5 rounded"
                      title="Historique"
                    >
                      <History size={14} style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                    <button
                      onClick={() => handleEdit(cred.id)}
                      disabled={loadingPasswords[cred.id]}
                      className="btn-ghost p-1.5 rounded"
                      title="Modifier"
                    >
                      {loadingPasswords[cred.id] ? (
                        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
                      ) : (
                        <Edit size={14} style={{ color: 'var(--color-text-muted)' }} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(cred.id)}
                      className="btn-icon-danger p-1.5 rounded"
                      title="Supprimer"
                    >
                      <Trash2 size={14} style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                  </div>
                </div>

                {/* History panel */}
                {showHistoryFor === cred.id && (
                  <div
                    className="mt-3 pt-3"
                    style={{ borderTop: '1px solid var(--color-border-light)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        Historique des modifications
                      </span>
                      <button
                        onClick={() => setShowHistoryFor(null)}
                        className="p-1"
                      >
                        <X size={12} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    </div>
                    {loadingHistory ? (
                      <div className="flex justify-center py-2">
                        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                    ) : history.length > 0 ? (
                      <div className="space-y-1">
                        {history.map((entry) => (
                          <div key={entry.id} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>{formatDate(entry.changedAt)}</span>
                            {' — '}
                            <span>{fieldLabels[entry.fieldName] || entry.fieldName}</span>
                            {entry.fieldName !== 'password' && entry.oldValue && (
                              <>
                                {' '}
                                <span style={{ color: 'var(--color-status-error)' }}>{entry.oldValue}</span>
                                {' → '}
                              </>
                            )}
                            {entry.fieldName !== 'password' && (
                              <span style={{ color: 'var(--color-status-success)' }}>{entry.newValue}</span>
                            )}
                            {entry.fieldName === 'password' && (
                              <span style={{ color: 'var(--color-status-info)' }}> modifié</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-center py-2" style={{ color: 'var(--color-text-muted)' }}>
                        Aucune modification
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Key size={32} strokeWidth={1} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Aucun identifiant enregistré
          </p>
        </div>
      )}
    </div>
  )
}
