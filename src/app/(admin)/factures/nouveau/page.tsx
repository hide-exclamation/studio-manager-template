'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import {
  ArrowLeft,
  FolderKanban,
  Building2,
  Plus,
  FileText,
} from 'lucide-react'

type Project = {
  id: string
  projectNumber: number
  name: string
  status: string
  client: {
    id: string
    code: string
    companyName: string
  }
}

type Quote = {
  id: string
  quoteNumber: string
  depositPercent: string
  total: string
}

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedProjectId = searchParams.get('projet')
  const quoteId = searchParams.get('devis')
  const invoiceType = searchParams.get('type') as 'DEPOSIT' | 'FINAL' | null

  const [projects, setProjects] = useState<Project[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (quoteId) {
      fetchQuote()
    } else {
      fetchProjects()
    }
  }, [quoteId])

  useEffect(() => {
    // Si on a un devis et un type, creer automatiquement la facture
    if (quote && invoiceType && preselectedProjectId) {
      handleCreateFromQuote()
    }
  }, [quote, invoiceType, preselectedProjectId])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      // Filtrer pour n'afficher que les projets actifs
      setProjects(data.filter((p: Project) => p.status === 'ACTIVE' || p.status === 'PROSPECT'))
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuote = async () => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`)
      if (!res.ok) throw new Error('Devis non trouvé')
      const data = await res.json()
      setQuote(data)
    } catch (error) {
      console.error('Error fetching quote:', error)
      setError('Devis non trouvé')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFromQuote = async () => {
    if (!quoteId || !invoiceType || !preselectedProjectId || creating) return

    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: preselectedProjectId,
          quoteId,
          invoiceType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la creation')
      }

      const invoice = await res.json()
      router.push(`/factures/${invoice.id}`)
    } catch (error: any) {
      setError(error.message)
      setCreating(false)
    }
  }

  const handleCreateStandalone = async (projectId: string) => {
    if (!projectId || creating) return

    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          invoiceType: 'STANDALONE',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la creation')
      }

      const invoice = await res.json()
      router.push(`/factures/${invoice.id}`)
    } catch (error: any) {
      setError(error.message)
      setCreating(false)
    }
  }

  const formatProjectCode = (project: Project) => {
    return `${project.client.code}-${String(project.projectNumber).padStart(3, '0')}`
  }

  const formatCurrency = (amount: string) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(parseFloat(amount))

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client.companyName.toLowerCase().includes(search.toLowerCase()) ||
    p.client.code.toLowerCase().includes(search.toLowerCase())
  )

  // Grouper par client
  const projectsByClient = filteredProjects.reduce((acc, project) => {
    const clientId = project.client.id
    if (!acc[clientId]) {
      acc[clientId] = {
        client: project.client,
        projects: []
      }
    }
    acc[clientId].projects.push(project)
    return acc
  }, {} as Record<string, { client: Project['client']; projects: Project[] }>)

  // Si creation en cours depuis un devis
  if (quoteId && creating) {
    const typeLabel = invoiceType === 'DEPOSIT' ? 'de dépôt' : 'finale'
    return (
      <div className="min-h-screen">
        <Header title="Nouvelle facture" subtitle={`Création de la facture ${typeLabel}...`} />
        <div className="p-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
          Création de la facture...
        </div>
      </div>
    )
  }

  // Si erreur lors de la creation depuis un devis
  if (quoteId && error) {
    return (
      <div className="min-h-screen">
        <Header title="Nouvelle facture" subtitle="Erreur" />
        <div className="p-6 max-w-4xl">
          <Link
            href={`/devis/${quoteId}`}
            className="inline-flex items-center gap-2 text-sm mb-6 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ArrowLeft size={16} />
            Retour au devis
          </Link>

          <div
            className="p-6 rounded-xl text-center"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--color-status-error)',
            }}
          >
            <p style={{ color: 'var(--color-status-error)' }}>{error}</p>
            <button
              onClick={() => {
                setError(null)
                setCreating(false)
                if (quote && invoiceType) {
                  handleCreateFromQuote()
                }
              }}
              className="mt-4 px-4 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-dark)',
                color: 'var(--color-text-inverse)',
              }}
            >
              Reessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Si on attend le chargement du devis
  if (quoteId && loading) {
    return (
      <div className="min-h-screen">
        <Header title="Nouvelle facture" subtitle="Chargement..." />
        <div className="p-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
          Chargement du devis...
        </div>
      </div>
    )
  }

  // Interface de selection de projet (mode standalone)
  return (
    <div className="min-h-screen">
      <Header title="Nouvelle facture" subtitle="Sélectionner un projet" />

      <div className="p-6 max-w-4xl">
        {/* Back link */}
        <Link
          href="/factures"
          className="inline-flex items-center gap-2 text-sm mb-6 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={16} />
          Retour aux factures
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

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher un projet ou client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            Chargement des projets...
          </div>
        ) : Object.keys(projectsByClient).length === 0 ? (
          <div
            className="text-center py-12 rounded-xl"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <FolderKanban
              size={48}
              strokeWidth={1}
              className="mx-auto mb-4"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <p style={{ color: 'var(--color-text-muted)' }}>
              {search ? 'Aucun projet trouvé' : 'Aucun projet actif'}
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Créez d'abord un projet pour pouvoir faire une facture
            </p>
            <Link
              href="/projets/nouveau"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-dark)',
                color: 'var(--color-text-inverse)',
              }}
            >
              <Plus size={16} />
              Creer un projet
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.values(projectsByClient).map(({ client, projects }) => (
              <div
                key={client.id}
                className="rounded-xl overflow-hidden"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-light)',
                }}
              >
                {/* Client header */}
                <div
                  className="px-5 py-3 flex items-center gap-3"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderBottom: '1px solid var(--color-border-light)',
                  }}
                >
                  <Building2 size={16} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {client.code} - {client.companyName}
                  </span>
                </div>

                {/* Projects */}
                {projects.map((project, index) => (
                  <button
                    key={project.id}
                    onClick={() => handleCreateStandalone(project.id)}
                    disabled={creating}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
                    style={{
                      borderBottom: index !== projects.length - 1 ? '1px solid var(--color-border-light)' : undefined,
                    }}
                  >
                    <div
                      className="w-20 h-10 rounded-lg flex items-center justify-center text-xs font-medium shrink-0"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {formatProjectCode(project)}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {project.name}
                      </span>
                    </div>
                    <Plus size={18} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
