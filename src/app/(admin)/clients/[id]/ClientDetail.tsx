'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Trash2,
  ExternalLink,
  User,
  Mail,
  Phone,
  Star,
  FolderKanban,
  FileText,
  Receipt,
  Plus,
  MapPin,
  Hash,
} from 'lucide-react'
import { useToast, useConfirm } from '@/components/ui'
import { CredentialsSection } from '@/components/credentials'

type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  isPrimary: boolean
}

type Project = {
  id: string
  name: string
  status: string
  quotes: { id: string; quoteNumber: string; status: string; total: any }[]
  invoices: { id: string; invoiceNumber: string; status: string; total: any; amountPaid: any }[]
}

type Client = {
  id: string
  code: string
  companyName: string
  address: string | null
  businessNumber: string | null
  status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE'
  googleDriveUrl: string | null
  notes: string | null
  contacts: Contact[]
  projects: Project[]
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

const projectStatusLabels: Record<string, string> = {
  PROSPECT: 'Prospect',
  ACTIVE: 'En cours',
  PAUSED: 'En pause',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
}

export function ClientDetail({ client }: { client: Client }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [deleting, setDeleting] = useState(false)

  // Calculs
  const totalInvoiced = client.projects.reduce((sum, project) => {
    return sum + project.invoices.reduce((s, inv) => s + Number(inv.total), 0)
  }, 0)

  const totalPaid = client.projects.reduce((sum, project) => {
    return sum + project.invoices.reduce((s, inv) => s + Number(inv.amountPaid), 0)
  }, 0)

  const activeProjects = client.projects.filter((p) => p.status === 'ACTIVE').length
  const pendingInvoices = client.projects.reduce((sum, project) => {
    return sum + project.invoices.filter((inv) => inv.status === 'SENT' || inv.status === 'OVERDUE').length
  }, 0)

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Supprimer le client',
      message: 'Tous les projets, devis et factures associés seront également supprimés. Cette action est irréversible.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error)
        return
      }
      router.push('/clients')
      router.refresh()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  return (
    <div className="p-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={16} />
          Retour aux clients
        </Link>

        <div className="flex items-center gap-2">
          {client.googleDriveUrl && (
            <a
              href={client.googleDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <ExternalLink size={16} />
              Google Drive
            </a>
          )}

          <Link
            href={`/clients/${client.id}/modifier`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Edit size={16} />
            Modifier
          </Link>

          <button
            onClick={handleDelete}
            disabled={deleting || client.projects.length > 0}
            className="btn-danger flex items-center gap-2 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-status-error)',
            }}
            title={client.projects.length > 0 ? 'Impossible de supprimer un client avec des projets' : ''}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Info Card */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-medium"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {client.code}
                </div>
                <div>
                  <h2
                    className="text-xl mb-1"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
                  >
                    {client.companyName}
                  </h2>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: statusColors[client.status].bg,
                      color: statusColors[client.status].text,
                    }}
                  >
                    {statusLabels[client.status]}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {client.address && (
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                  <span style={{ color: 'var(--color-text-secondary)' }}>{client.address}</span>
                </div>
              )}
              {client.businessNumber && (
                <div className="flex items-center gap-3">
                  <Hash size={16} style={{ color: 'var(--color-text-muted)' }} />
                  <span style={{ color: 'var(--color-text-secondary)' }}>NEQ: {client.businessNumber}</span>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {client.notes}
                </p>
              </div>
            )}
          </div>

          {/* Contacts */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-base"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Contacts
              </h3>
              <Link
                href={`/clients/${client.id}/modifier`}
                className="text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Gérer
              </Link>
            </div>

            <div className="space-y-3">
              {client.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-4 p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: contact.isPrimary ? 'var(--color-accent-lavender)' : 'var(--color-bg-secondary)',
                    }}
                  >
                    <User size={18} style={{ color: 'var(--color-text-primary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {contact.name}
                      </span>
                      {contact.isPrimary && <Star size={12} fill="var(--color-accent-yellow)" stroke="var(--color-accent-yellow)" />}
                    </div>
                    {contact.role && (
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {contact.role}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:underline">
                        <Mail size={14} />
                        <span className="hidden sm:inline">{contact.email}</span>
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 hover:underline">
                        <Phone size={14} />
                        <span className="hidden sm:inline">{contact.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {client.contacts.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                  Aucun contact
                </p>
              )}
            </div>
          </div>

          {/* Credentials Vault */}
          <CredentialsSection clientId={client.id} />

          {/* Projects */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-base"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Projets
              </h3>
              <Link
                href={`/projets/nouveau?client=${client.id}`}
                className="flex items-center gap-1.5 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Plus size={14} />
                Nouveau projet
              </Link>
            </div>

            {client.projects.length > 0 ? (
              <div className="space-y-3">
                {client.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projets/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <div className="flex items-center gap-3">
                      <FolderKanban size={18} style={{ color: 'var(--color-text-muted)' }} />
                      <div>
                        <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {project.name}
                        </span>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {project.quotes.length} devis · {project.invoices.length} factures
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          project.status === 'ACTIVE'
                            ? 'rgba(34, 197, 94, 0.1)'
                            : project.status === 'COMPLETED'
                            ? 'rgba(59, 130, 246, 0.1)'
                            : 'rgba(163, 163, 163, 0.1)',
                        color:
                          project.status === 'ACTIVE'
                            ? 'var(--color-status-success)'
                            : project.status === 'COMPLETED'
                            ? 'var(--color-status-info)'
                            : 'var(--color-text-muted)',
                      }}
                    >
                      {projectStatusLabels[project.status] || project.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderKanban size={32} strokeWidth={1} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Aucun projet pour ce client
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right column - Stats */}
        <div className="space-y-6">
          {/* Financial stats */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <h3
              className="text-base mb-4"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
            >
              Résumé financier
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Total facturé
                </p>
                <p
                  className="text-2xl"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
                >
                  {formatCurrency(totalInvoiced)}
                </p>
              </div>

              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Total payé
                </p>
                <p
                  className="text-xl"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-status-success)' }}
                >
                  {formatCurrency(totalPaid)}
                </p>
              </div>

              {totalInvoiced - totalPaid > 0 && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Solde en attente
                  </p>
                  <p
                    className="text-lg"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-status-warning)' }}
                  >
                    {formatCurrency(totalInvoiced - totalPaid)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <h3
              className="text-base mb-4"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
            >
              Activité
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <FolderKanban size={16} />
                  Projets actifs
                </span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {activeProjects}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <FileText size={16} />
                  Total projets
                </span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {client.projects.length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <Receipt size={16} />
                  Factures en attente
                </span>
                <span
                  className="font-medium"
                  style={{ color: pendingInvoices > 0 ? 'var(--color-status-warning)' : 'var(--color-text-primary)' }}
                >
                  {pendingInvoices}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
