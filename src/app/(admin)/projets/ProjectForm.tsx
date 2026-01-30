'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  FolderKanban,
  Building2,
  Tags,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { Button, LinkButton, useToast } from '@/components/ui'

type Client = {
  id: string
  code: string
  companyName: string
}

type ProjectCategory = {
  id: string
  name: string
  color: string | null
}

type ProjectData = {
  id?: string
  clientId: string
  categoryId: string
  projectNumber: number | ''
  name: string
  description: string
  status: 'PROSPECT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  startDate: string
  endDate: string
  googleDriveUrl: string
}

type Props = {
  initialData?: ProjectData
  isEditing?: boolean
  preselectedClientId?: string
}

export function ProjectForm({ initialData, isEditing = false, preselectedClientId }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [categories, setCategories] = useState<ProjectCategory[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)

  const [formData, setFormData] = useState<ProjectData>(
    initialData || {
      clientId: preselectedClientId || '',
      categoryId: '',
      projectNumber: '',
      name: '',
      description: '',
      status: 'PROSPECT',
      startDate: '',
      endDate: '',
      googleDriveUrl: '',
    }
  )
  const [suggestedNumber, setSuggestedNumber] = useState<number | null>(null)

  useEffect(() => {
    fetchClients()
    fetchCategories()
    // Si un client est présélectionné, charger le numéro suggéré
    if (preselectedClientId && !isEditing) {
      fetchSuggestedNumber(preselectedClientId)
    }
  }, [preselectedClientId, isEditing])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients?status=ACTIVE')
      const activeClients = await res.json()

      // Aussi récupérer les prospects
      const res2 = await fetch('/api/clients?status=PROSPECT')
      const prospectClients = await res2.json()

      setClients([...activeClients, ...prospectClients].sort((a, b) =>
        a.companyName.localeCompare(b.companyName)
      ))
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/project-categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const createCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const res = await fetch('/api/project-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })
      if (res.ok) {
        const category = await res.json()
        setCategories([...categories, category])
        updateField('categoryId', category.id)
        setNewCategoryName('')
        setShowNewCategory(false)
        toast.success('Catégorie créée')
      }
    } catch (error) {
      toast.error('Erreur lors de la création')
    }
  }

  const updateField = (field: keyof ProjectData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const fetchSuggestedNumber = async (clientId: string) => {
    if (!clientId) {
      setSuggestedNumber(null)
      return
    }
    try {
      const res = await fetch(`/api/projects/next-number?clientId=${clientId}`)
      const data = await res.json()
      setSuggestedNumber(data.nextNumber)
    } catch (error) {
      console.error('Error fetching suggested number:', error)
    }
  }

  const handleClientChange = (clientId: string) => {
    updateField('clientId', clientId)
    if (!isEditing) {
      fetchSuggestedNumber(clientId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = isEditing ? `/api/projects/${initialData?.id}` : '/api/projects'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Une erreur est survenue')
      }

      const project = await res.json()
      toast.success(isEditing ? 'Projet modifié avec succès' : 'Projet créé avec succès')
      router.push(`/projets/${project.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/projets"
        className="inline-flex items-center gap-2 text-sm mb-6 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft size={16} />
        Retour aux projets
      </Link>

      {error && (
        <div
          className="p-4 rounded-lg mb-6"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--color-status-error)',
          }}
        >
          {error}
        </div>
      )}

      {/* Client selection */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <Building2 size={20} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <h2
            className="text-lg"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
          >
            Client
          </h2>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
            Sélectionner un client *
          </label>
          <select
            value={formData.clientId}
            onChange={(e) => handleClientChange(e.target.value)}
            required
            disabled={isEditing || loadingClients}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-primary)',
              opacity: isEditing ? 0.7 : 1,
            }}
          >
            <option value="">
              {loadingClients ? 'Chargement...' : 'Choisir un client'}
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.code} - {client.companyName}
              </option>
            ))}
          </select>
          {isEditing && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Le client ne peut pas être modifié après la création
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
            Numéro de projet *
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={formData.projectNumber}
              onChange={(e) => updateField('projectNumber', e.target.value ? parseInt(e.target.value) : '')}
              required
              disabled={isEditing}
              min={1}
              placeholder={suggestedNumber ? String(suggestedNumber) : '1'}
              className="w-32 px-3 py-2.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
                opacity: isEditing ? 0.7 : 1,
              }}
            />
            {!isEditing && suggestedNumber && !formData.projectNumber && (
              <button
                type="button"
                onClick={() => updateField('projectNumber', suggestedNumber)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Utiliser {suggestedNumber}
              </button>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {isEditing ? 'Le numéro ne peut pas être modifié' : 'Numéro séquentiel pour ce client (ex: 1, 2, 3...)'}
          </p>
        </div>
      </div>

      {/* Project info */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <FolderKanban size={20} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <h2
            className="text-lg"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
          >
            Informations du projet
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Nom du projet *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
              placeholder="Refonte du site web"
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Statut
            </label>
            <select
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="PROSPECT">Prospect</option>
              <option value="ACTIVE">En cours</option>
              <option value="PAUSED">En pause</option>
              <option value="COMPLETED">Terminé</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Catégorie
            </label>
            {!showNewCategory ? (
              <div className="flex gap-2">
                <select
                  value={formData.categoryId}
                  onChange={(e) => updateField('categoryId', e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="">Aucune catégorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-secondary)',
                  }}
                  title="Nouvelle catégorie"
                >
                  <Plus size={18} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nom de la catégorie"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createCategory())}
                />
                <button
                  type="button"
                  onClick={createCategory}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-accent-lavender)',
                    color: 'white',
                  }}
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Annuler
                </button>
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Pour les statistiques (ex: Branding, Web, Identité)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Date de début
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => updateField('startDate', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Date de fin prévue
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => updateField('endDate', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Lien Google Drive
            </label>
            <input
              type="url"
              value={formData.googleDriveUrl}
              onChange={(e) => updateField('googleDriveUrl', e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
              placeholder="Description du projet, objectifs, livrables attendus..."
              className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={loading}>
          {isEditing ? 'Enregistrer les modifications' : 'Créer le projet'}
        </Button>

        <LinkButton href="/projets" variant="secondary">
          Annuler
        </LinkButton>
      </div>
    </form>
  )
}
