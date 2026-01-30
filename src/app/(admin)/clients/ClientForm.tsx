'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Star,
  Building2,
  User,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Link from 'next/link'
import { Button, LinkButton, useToast } from '@/components/ui'

type Contact = {
  id?: string
  name: string
  email: string
  phone: string
  role: string
  isPrimary: boolean
  notes: string
}

type EmailPreferences = {
  quoteSend: boolean
  quoteApproved: boolean
  invoiceSend: boolean
  invoiceReminder1: boolean
  invoiceReminder2: boolean
  invoiceOverdue: boolean
  paymentReceived: boolean
}

type ClientData = {
  id?: string
  code: string
  companyName: string
  address: string
  businessNumber: string
  status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE'
  googleDriveUrl: string
  notes: string
  emailPreferences: EmailPreferences
  contacts: Contact[]
}

const defaultEmailPreferences: EmailPreferences = {
  quoteSend: true,
  quoteApproved: true,
  invoiceSend: true,
  invoiceReminder1: true,
  invoiceReminder2: true,
  invoiceOverdue: true,
  paymentReceived: true,
}

const emailPreferenceLabels: Record<keyof EmailPreferences, { label: string; description: string }> = {
  quoteSend: { label: 'Envoi de devis', description: 'Courriel d\'envoi initial du devis' },
  quoteApproved: { label: 'Devis approuvé', description: 'Confirmation quand le client approuve' },
  invoiceSend: { label: 'Envoi de facture', description: 'Courriel d\'envoi initial de la facture' },
  invoiceReminder1: { label: 'Rappel 1 (J+21)', description: 'Premier rappel 21 jours après l\'envoi' },
  invoiceReminder2: { label: 'Rappel 2 (J+28)', description: 'Deuxième rappel 28 jours après l\'envoi' },
  invoiceOverdue: { label: 'Facture en retard', description: 'Frais de retard (2%) 30 jours après l\'envoi' },
  paymentReceived: { label: 'Paiement reçu', description: 'Confirmation de réception du paiement' },
}

type Props = {
  initialData?: ClientData
  isEditing?: boolean
}

const emptyContact: Contact = {
  name: '',
  email: '',
  phone: '',
  role: '',
  isPrimary: false,
  notes: '',
}

export function ClientForm({ initialData, isEditing = false }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailPrefsExpanded, setEmailPrefsExpanded] = useState(false)

  const [formData, setFormData] = useState<ClientData>(
    initialData || {
      code: '',
      companyName: '',
      address: '',
      businessNumber: '',
      status: 'PROSPECT',
      googleDriveUrl: '',
      notes: '',
      emailPreferences: { ...defaultEmailPreferences },
      contacts: [{ ...emptyContact, isPrimary: true }],
    }
  )

  const updateField = (field: keyof ClientData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateEmailPreference = (key: keyof EmailPreferences, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      emailPreferences: { ...prev.emailPreferences, [key]: value }
    }))
  }

  const toggleAllEmailPreferences = (enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      emailPreferences: Object.keys(prev.emailPreferences).reduce((acc, key) => ({
        ...acc,
        [key]: enabled
      }), {} as EmailPreferences)
    }))
  }

  const allEmailsEnabled = Object.values(formData.emailPreferences).every(v => v)
  const someEmailsEnabled = Object.values(formData.emailPreferences).some(v => v)

  const updateContact = (index: number, field: keyof Contact, value: any) => {
    setFormData((prev) => {
      const contacts = [...prev.contacts]
      contacts[index] = { ...contacts[index], [field]: value }
      return { ...prev, contacts }
    })
  }

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      contacts: [...prev.contacts, { ...emptyContact }],
    }))
  }

  const removeContact = (index: number) => {
    if (formData.contacts.length <= 1) return
    setFormData((prev) => {
      const contacts = prev.contacts.filter((_, i) => i !== index)
      // Si on supprime le contact principal, le premier devient principal
      if (prev.contacts[index].isPrimary && contacts.length > 0) {
        contacts[0].isPrimary = true
      }
      return { ...prev, contacts }
    })
  }

  const setPrimaryContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => ({
        ...c,
        isPrimary: i === index,
      })),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = isEditing ? `/api/clients/${initialData?.id}` : '/api/clients'
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

      const client = await res.json()
      toast.success(isEditing ? 'Client modifié avec succès' : 'Client créé avec succès')
      router.push(`/clients/${client.id}`)
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
        href="/clients"
        className="inline-flex items-center gap-2 text-sm mb-6 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft size={16} />
        Retour aux clients
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

      {/* Company info */}
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
            Informations de l'entreprise
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Code client *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => updateField('code', e.target.value.toUpperCase())}
              required
              maxLength={10}
              placeholder="ABC"
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Abréviation unique (ex: ACME, STAR)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Nom de l'entreprise *
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              required
              placeholder="Nom de l'entreprise"
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
              onChange={(e) => updateField('status', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="PROSPECT">Prospect</option>
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Numéro d'entreprise (NEQ)
            </label>
            <input
              type="text"
              value={formData.businessNumber}
              onChange={(e) => updateField('businessNumber', e.target.value)}
              placeholder="1234567890"
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
              Adresse
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              rows={2}
              placeholder="5800 R. Saint-Denis Local 602, Montréal, QC, H2S 3L5"
              className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
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
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              placeholder="Notes internes sur ce client..."
              className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Préférences d'envoi d'email */}
          <div className="md:col-span-2">
            <div
              className="rounded-lg overflow-hidden"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              {/* Header avec toggle global */}
              <button
                type="button"
                onClick={() => setEmailPrefsExpanded(!emailPrefsExpanded)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <Mail size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  <div className="text-left">
                    <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Préférences d'envoi d'email
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {allEmailsEnabled ? 'Tous les emails activés' :
                       someEmailsEnabled ? 'Certains emails activés' : 'Tous les emails désactivés'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAllEmailPreferences(!allEmailsEnabled)
                    }}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer"
                    style={{
                      backgroundColor: allEmailsEnabled
                        ? 'var(--color-status-success)'
                        : someEmailsEnabled
                          ? 'var(--color-accent-lavender)'
                          : 'var(--color-bg-secondary)',
                      border: allEmailsEnabled || someEmailsEnabled
                        ? 'none'
                        : '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      className="inline-block h-4 w-4 transform rounded-full transition-transform"
                      style={{
                        backgroundColor: allEmailsEnabled || someEmailsEnabled ? 'white' : 'var(--color-text-muted)',
                        transform: allEmailsEnabled || someEmailsEnabled ? 'translateX(1.375rem)' : 'translateX(0.25rem)',
                      }}
                    />
                  </div>
                  {emailPrefsExpanded ? (
                    <ChevronUp size={16} style={{ color: 'var(--color-text-muted)' }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </div>
              </button>

              {/* Liste détaillée des préférences */}
              {emailPrefsExpanded && (
                <div
                  className="border-t px-4 pb-4"
                  style={{ borderColor: 'var(--color-border-light)' }}
                >
                  <div className="space-y-1 mt-3">
                    {(Object.keys(emailPreferenceLabels) as Array<keyof EmailPreferences>).map((key) => (
                      <div
                        key={key}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-opacity-50 transition-colors"
                        style={{ backgroundColor: formData.emailPreferences[key] ? 'transparent' : 'rgba(0,0,0,0.02)' }}
                      >
                        <div>
                          <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {emailPreferenceLabels[key].label}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {emailPreferenceLabels[key].description}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateEmailPreference(key, !formData.emailPreferences[key])}
                          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                          style={{
                            backgroundColor: formData.emailPreferences[key]
                              ? 'var(--color-status-success)'
                              : 'var(--color-bg-secondary)',
                            border: formData.emailPreferences[key]
                              ? 'none'
                              : '1px solid var(--color-border)',
                          }}
                        >
                          <span
                            className="inline-block h-3.5 w-3.5 transform rounded-full transition-transform"
                            style={{
                              backgroundColor: formData.emailPreferences[key] ? 'white' : 'var(--color-text-muted)',
                              transform: formData.emailPreferences[key] ? 'translateX(1rem)' : 'translateX(0.2rem)',
                            }}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <User size={20} style={{ color: 'var(--color-text-secondary)' }} />
            </div>
            <h2
              className="text-lg"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
            >
              Contacts
            </h2>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<Plus size={16} />}
            onClick={addContact}
          >
            Ajouter
          </Button>
        </div>

        <div className="space-y-4">
          {formData.contacts.map((contact, index) => (
            <div
              key={index}
              className="p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: contact.isPrimary ? '2px solid var(--color-accent-lavender)' : '1px solid var(--color-border-light)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPrimaryContact(index)}
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors"
                    style={{
                      backgroundColor: contact.isPrimary ? 'var(--color-accent-lavender)' : 'transparent',
                      color: contact.isPrimary ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    }}
                  >
                    <Star size={12} fill={contact.isPrimary ? 'currentColor' : 'none'} />
                    {contact.isPrimary ? 'Contact principal' : 'Définir comme principal'}
                  </button>
                </div>

                {formData.contacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                    required
                    placeholder="Marie Dupont"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Rôle
                  </label>
                  <input
                    type="text"
                    value={contact.role}
                    onChange={(e) => updateContact(index, 'role', e.target.value)}
                    placeholder="Directrice marketing"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Courriel
                  </label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                    placeholder="courriel@exemple.com"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                    placeholder="514-555-1234"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={loading}>
          {isEditing ? 'Enregistrer les modifications' : 'Créer le client'}
        </Button>

        <LinkButton href="/clients" variant="secondary">
          Annuler
        </LinkButton>
      </div>
    </form>
  )
}
