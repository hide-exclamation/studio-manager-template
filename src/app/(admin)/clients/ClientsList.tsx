'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Building2,
  User,
  Mail,
  FolderKanban,
  ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'
import { LinkButton, Spinner, FadeIn, StaggerContainer, StaggerItem } from '@/components/ui'

type Client = {
  id: string
  code: string
  companyName: string
  status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE'
  contacts: { name: string; email: string | null }[]
  projects: { id: string; status: string }[]
}

const statusLabels = {
  PROSPECT: 'Prospect',
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
}

const statusColors = {
  PROSPECT: { bg: 'rgba(197, 184, 227, 0.2)', text: 'var(--color-accent-lavender)' },
  ACTIVE: { bg: 'rgba(34, 197, 94, 0.1)', text: 'var(--color-status-success)' },
  INACTIVE: { bg: 'rgba(163, 163, 163, 0.1)', text: 'var(--color-text-muted)' },
}

export function ClientsList() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchClients()
  }, [search, statusFilter])

  const fetchClients = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      setClients(data)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const activeProjectsCount = (client: Client) =>
    client.projects.filter(p => p.status === 'ACTIVE').length

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
            placeholder="Rechercher un client..."
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
          <option value="ACTIVE">Actifs</option>
          <option value="INACTIVE">Inactifs</option>
        </select>

        {/* Add button */}
        <LinkButton href="/clients/nouveau" icon={<Plus size={18} />}>
          Nouveau client
        </LinkButton>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : clients.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <Building2
            size={48}
            strokeWidth={1}
            className="mx-auto mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <p style={{ color: 'var(--color-text-muted)' }}>
            {search || statusFilter ? 'Aucun client trouvé' : 'Aucun client pour le moment'}
          </p>
          {!search && !statusFilter && (
            <LinkButton href="/clients/nouveau" icon={<Plus size={16} />} size="sm" className="mt-4">
              Créer votre premier client
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
              {clients.map((client, index) => (
                <StaggerItem key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className={clsx(
                      'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-bg-tertiary)]',
                      index !== clients.length - 1 && 'border-b'
                    )}
                    style={{
                      borderColor: 'var(--color-border-light)',
                    }}
                  >
                    {/* Avatar/Code */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-medium shrink-0"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {client.code}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-medium truncate"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {client.companyName}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: statusColors[client.status].bg,
                            color: statusColors[client.status].text,
                          }}
                        >
                          {statusLabels[client.status]}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {client.contacts[0] && (
                          <span className="flex items-center gap-1.5 truncate">
                            <User size={14} />
                            {client.contacts[0].name}
                          </span>
                        )}
                        {client.contacts[0]?.email && (
                          <span className="hidden sm:flex items-center gap-1.5 truncate">
                            <Mail size={14} />
                            {client.contacts[0].email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <div
                          className="text-lg font-medium"
                          style={{
                            fontFamily: 'var(--font-heading)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {client.projects.length}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {client.projects.length === 1 ? 'projet' : 'projets'}
                        </div>
                      </div>

                      {activeProjectsCount(client) > 0 && (
                        <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-status-success)' }}>
                          <FolderKanban size={16} />
                          {activeProjectsCount(client)} actif{activeProjectsCount(client) > 1 ? 's' : ''}
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
