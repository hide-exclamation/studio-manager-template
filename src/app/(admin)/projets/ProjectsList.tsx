'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  FolderKanban,
  Building2,
  FileText,
  Receipt,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import clsx from 'clsx'
import { LinkButton, Spinner, FadeIn, StaggerContainer, StaggerItem } from '@/components/ui'

type Project = {
  id: string
  projectNumber: number
  name: string
  status: 'PROSPECT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  startDate: string | null
  endDate: string | null
  client: {
    id: string
    code: string
    companyName: string
  }
  quotes: { id: string; status: string; total: string }[]
  invoices: { id: string; status: string; total: string; amountPaid: string }[]
}

const statusLabels = {
  PROSPECT: 'Prospect',
  ACTIVE: 'En cours',
  PAUSED: 'En pause',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
}

const statusColors = {
  PROSPECT: { bg: 'rgba(197, 184, 227, 0.2)', text: '#7C3AED' }, /* violet-600 pour meilleur contraste */
  ACTIVE: { bg: 'rgba(34, 197, 94, 0.1)', text: 'var(--color-status-success-text)' },
  PAUSED: { bg: 'rgba(234, 179, 8, 0.1)', text: 'var(--color-status-warning-text)' },
  COMPLETED: { bg: 'rgba(59, 130, 246, 0.1)', text: 'var(--color-status-info-text)' },
  CANCELLED: { bg: 'rgba(163, 163, 163, 0.1)', text: 'var(--color-text-muted)' },
}

export function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [search, statusFilter])

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/projects?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setProjects(data)
      } else {
        console.error('Projects API error:', data)
        setProjects([])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const formatProjectCode = (project: Project) => {
    return `${project.client.code}-${String(project.projectNumber).padStart(3, '0')}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const calculateTotalQuoted = (project: Project) => {
    return project.quotes
      .filter(q => q.status === 'ACCEPTED')
      .reduce((sum, q) => sum + parseFloat(q.total), 0)
  }

  const calculateTotalInvoiced = (project: Project) => {
    return project.invoices.reduce((sum, i) => sum + parseFloat(i.amountPaid), 0)
  }

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Rechercher un projet ou client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
            color: 'var(--color-text-primary)',
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="PROSPECT">Prospects</option>
          <option value="ACTIVE">En cours</option>
          <option value="PAUSED">En pause</option>
          <option value="COMPLETED">Terminés</option>
          <option value="CANCELLED">Annulés</option>
        </select>

        {/* Add button */}
        <LinkButton href="/projets/nouveau" icon={<Plus size={18} />}>
          Nouveau projet
        </LinkButton>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
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
            {search || statusFilter ? 'Aucun projet trouvé' : 'Aucun projet pour le moment'}
          </p>
          {!search && !statusFilter && (
            <LinkButton href="/projets/nouveau" icon={<Plus size={16} />} size="sm" className="mt-4">
              Créer votre premier projet
            </LinkButton>
          )}
        </div>
      ) : (
        <FadeIn>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <StaggerContainer>
              {projects.map((project, index) => (
                <StaggerItem key={project.id}>
                  <Link
                    href={`/projets/${project.id}`}
                    className={clsx(
                      'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-bg-tertiary)]',
                      index !== projects.length - 1 && 'border-b'
                    )}
                    style={{
                      borderColor: 'var(--color-border-light)',
                    }}
                  >
                    {/* Code */}
                    <div
                      className="w-20 h-12 rounded-lg flex items-center justify-center text-xs font-medium shrink-0"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {formatProjectCode(project)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-medium truncate"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {project.name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: statusColors[project.status].bg,
                            color: statusColors[project.status].text,
                          }}
                        >
                          {statusLabels[project.status]}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        <span className="flex items-center gap-1.5 truncate">
                          <Building2 size={14} />
                          {project.client.companyName}
                        </span>
                        {project.startDate && (
                          <span className="hidden sm:flex items-center gap-1.5">
                            <Calendar size={14} />
                            {formatDate(project.startDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-6 shrink-0">
                      <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        <FileText size={16} />
                        {project.quotes.length}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        <Receipt size={16} />
                        {project.invoices.length}
                      </div>
                      {calculateTotalQuoted(project) > 0 && (
                        <div className="text-right">
                          <div
                            className="text-sm font-medium"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {calculateTotalQuoted(project).toLocaleString('fr-CA', {
                              style: 'currency',
                              currency: 'CAD',
                            })}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            devisé
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                  <ChevronRight
                    size={20}
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </FadeIn>
      )}
    </div>
  )
}
