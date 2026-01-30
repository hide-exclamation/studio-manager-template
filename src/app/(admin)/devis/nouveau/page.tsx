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
  Layers,
} from 'lucide-react'
import { useToast } from '@/components/ui'
import { TemplatePickerModal } from '@/components/library/TemplatePickerModal'

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

export default function NewQuotePage() {
  const router = useRouter()
  const toast = useToast()
  const searchParams = useSearchParams()
  const preselectedProjectId = searchParams.get('projet')

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId || '')
  const [search, setSearch] = useState('')
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [projectForTemplate, setProjectForTemplate] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    // Si un projet est présélectionné, créer directement le devis
    if (preselectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === preselectedProjectId)
      if (project) {
        handleCreateQuote(preselectedProjectId)
      }
    }
  }, [preselectedProjectId, projects])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      // Filtrer pour n'afficher que les projets actifs ou prospects
      setProjects(data.filter((p: Project) => p.status === 'ACTIVE' || p.status === 'PROSPECT'))
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQuote = async (projectId: string) => {
    if (!projectId || creating) return

    setCreating(true)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la création')
      }

      const quote = await res.json()
      router.push(`/devis/${quote.id}`)
    } catch (error: any) {
      toast.error(error.message)
      setCreating(false)
    }
  }

  const formatProjectCode = (project: Project) => {
    return `${project.client.code}-${String(project.projectNumber).padStart(3, '0')}`
  }

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

  if (preselectedProjectId && creating) {
    return (
      <div className="min-h-screen">
        <Header title="Nouveau devis" subtitle="Création en cours..." />
        <div className="p-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
          Création du devis...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header title="Nouveau devis" subtitle="Sélectionner un projet" />

      <div className="p-6 max-w-4xl">
        {/* Back link */}
        <Link
          href="/devis"
          className="inline-flex items-center gap-2 text-sm mb-6 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={16} />
          Retour aux devis
        </Link>

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
              Créez d'abord un projet pour pouvoir faire un devis
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
              Créer un projet
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
                  <div
                    key={project.id}
                    className="flex items-center gap-4 px-5 py-4"
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setProjectForTemplate(project.id)
                          setShowTemplatePicker(true)
                        }}
                        disabled={creating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        style={{
                          backgroundColor: 'rgba(197, 184, 227, 0.15)',
                          color: 'var(--color-accent-lavender)',
                          border: '1px solid var(--color-accent-lavender)',
                        }}
                        title="Créer depuis un template"
                      >
                        <Layers size={14} />
                        Template
                      </button>
                      <button
                        onClick={() => handleCreateQuote(project.id)}
                        disabled={creating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--color-bg-dark)',
                          color: 'var(--color-text-inverse)',
                        }}
                        title="Créer un devis vierge"
                      >
                        <Plus size={14} />
                        Vierge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template picker modal */}
      {projectForTemplate && (
        <TemplatePickerModal
          isOpen={showTemplatePicker}
          onClose={() => {
            setShowTemplatePicker(false)
            setProjectForTemplate(null)
          }}
          projectId={projectForTemplate}
        />
      )}
    </div>
  )
}
