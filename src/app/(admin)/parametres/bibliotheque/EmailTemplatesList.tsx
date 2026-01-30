'use client'

import { useState, useEffect } from 'react'
import { Mail, Save, RotateCcw, ChevronDown, ChevronUp, Eye, X } from 'lucide-react'
import { Button, useToast } from '@/components/ui'

type EmailType =
  | 'QUOTE_SEND'
  | 'QUOTE_APPROVED'
  | 'INVOICE_SEND'
  | 'INVOICE_REMINDER_1'
  | 'INVOICE_REMINDER_2'
  | 'INVOICE_OVERDUE'
  | 'PAYMENT_RECEIVED'

interface EmailTemplateData {
  type: EmailType
  subject: string
  customTexts: Record<string, string>
}

interface PreviewData {
  html: string
  subject: string
}

const emailTypeInfo: Record<EmailType, { label: string; description: string; fields: Array<{ key: string; label: string; placeholder: string; multiline?: boolean }> }> = {
  QUOTE_SEND: {
    label: 'Envoi de devis',
    description: 'Courriel envoyé au client avec le devis à consulter',
    fields: [
      { key: 'subject', label: 'Sujet', placeholder: 'Votre devis est prêt à consulter' },
      { key: 'heading', label: 'Titre', placeholder: 'Votre devis est prêt!' },
      { key: 'greeting', label: 'Salutation', placeholder: 'Bonjour {prénom},' },
      { key: 'intro', label: 'Introduction', placeholder: 'Nous avons préparé un devis pour votre projet.', multiline: true },
      { key: 'callToAction', label: 'Bouton', placeholder: 'Consulter le devis' },
      { key: 'outro', label: 'Conclusion', placeholder: 'N\'hésitez pas à me contacter pour toute question.', multiline: true },
      { key: 'signature', label: 'Signature', placeholder: 'Au plaisir,' },
    ],
  },
  QUOTE_APPROVED: {
    label: 'Devis approuvé',
    description: 'Confirmation envoyée après approbation du devis par le client',
    fields: [
      { key: 'subject', label: 'Sujet', placeholder: 'Merci pour votre confiance!' },
      { key: 'heading', label: 'Titre', placeholder: 'Merci pour votre confiance!' },
      { key: 'greeting', label: 'Salutation', placeholder: 'Bonjour {prénom},' },
      { key: 'intro', label: 'Introduction', placeholder: 'Votre devis a été approuvé avec succès.', multiline: true },
      { key: 'nextStepsTitle', label: 'Titre prochaines étapes', placeholder: 'Prochaines étapes' },
      { key: 'outro', label: 'Conclusion', placeholder: 'N\'hésitez pas à me contacter si vous avez des questions.', multiline: true },
      { key: 'signature', label: 'Signature', placeholder: 'À très bientôt,' },
    ],
  },
  INVOICE_SEND: {
    label: 'Envoi de facture',
    description: 'Courriel envoyé avec la facture à payer',
    fields: [
      { key: 'subject', label: 'Sujet', placeholder: 'Votre facture est disponible' },
      { key: 'greeting', label: 'Salutation', placeholder: 'Bonjour {prénom},' },
      { key: 'intro', label: 'Introduction', placeholder: 'Veuillez trouver ci-joint votre facture.', multiline: true },
      { key: 'callToAction', label: 'Bouton', placeholder: 'Voir la facture' },
      { key: 'note', label: 'Note', placeholder: 'Pour toute question, n\'hésitez pas à me contacter.', multiline: true },
      { key: 'signature', label: 'Signature', placeholder: 'Merci,' },
    ],
  },
  INVOICE_REMINDER_1: {
    label: 'Rappel 1 (J+21)',
    description: 'Premier rappel envoyé 21 jours après l\'envoi de la facture',
    fields: [
      { key: 'subject', label: 'Sujet', placeholder: 'Rappel: Votre facture en attente' },
      { key: 'intro', label: 'Introduction', placeholder: 'Nous nous permettons de vous rappeler que votre facture est en attente de paiement.', multiline: true },
      { key: 'outro', label: 'Conclusion', placeholder: 'Si vous avez déjà procédé au paiement, veuillez ignorer ce message.', multiline: true },
    ],
  },
  INVOICE_REMINDER_2: {
    label: 'Rappel 2 (J+28)',
    description: 'Dernier rappel avant frais de retard, envoyé 28 jours après l\'envoi',
    fields: [
      { key: 'subject', label: 'Sujet', placeholder: 'Dernier rappel avant frais de retard' },
      { key: 'intro', label: 'Introduction', placeholder: 'Votre facture reste impayée et les frais de retard seront appliqués sous peu.', multiline: true },
      { key: 'outro', label: 'Conclusion', placeholder: 'Merci de régulariser la situation rapidement.', multiline: true },
    ],
  },
  INVOICE_OVERDUE: {
    label: 'Facture en retard',
    description: 'Notification avec frais de retard (2%), envoyée après 30 jours',
    fields: [
      { key: 'subject', label: 'Sujet', placeholder: 'Frais de retard appliqués' },
      { key: 'intro', label: 'Introduction', placeholder: 'Des frais de retard de 2% ont été appliqués à votre facture impayée.', multiline: true },
      { key: 'outro', label: 'Conclusion', placeholder: 'Merci de régulariser cette situation dans les plus brefs délais.', multiline: true },
    ],
  },
  PAYMENT_RECEIVED: {
    label: 'Paiement reçu',
    description: 'Remerciement envoyé après réception du paiement',
    fields: [
      { key: 'subject', label: 'Sujet', placeholder: 'Merci pour votre paiement!' },
      { key: 'heading', label: 'Titre', placeholder: 'Merci pour votre paiement!' },
      { key: 'greeting', label: 'Salutation', placeholder: 'Bonjour {prénom},' },
      { key: 'intro', label: 'Introduction', placeholder: 'Nous confirmons la réception de votre paiement.', multiline: true },
      { key: 'outro', label: 'Conclusion', placeholder: 'Merci pour votre confiance!', multiline: true },
      { key: 'signature', label: 'Signature', placeholder: 'À bientôt,' },
    ],
  },
}

const emailTypes: EmailType[] = [
  'QUOTE_SEND',
  'QUOTE_APPROVED',
  'INVOICE_SEND',
  'INVOICE_REMINDER_1',
  'INVOICE_REMINDER_2',
  'INVOICE_OVERDUE',
  'PAYMENT_RECEIVED',
]

export function EmailTemplatesList() {
  const toast = useToast()
  const [templates, setTemplates] = useState<Record<EmailType, EmailTemplateData>>({} as any)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<EmailType | null>(null)
  const [expandedType, setExpandedType] = useState<EmailType | null>(null)
  const [editedTemplates, setEditedTemplates] = useState<Record<EmailType, EmailTemplateData>>({} as any)
  const [previewType, setPreviewType] = useState<EmailType | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/email-templates')
      if (res.ok) {
        const data = await res.json()
        const templatesMap: Record<EmailType, EmailTemplateData> = {} as any
        const editedMap: Record<EmailType, EmailTemplateData> = {} as any

        for (const type of emailTypes) {
          const existing = data.find((t: any) => t.type === type)
          const template = {
            type,
            subject: existing?.subject || '',
            customTexts: existing?.customTexts || {},
          }
          templatesMap[type] = template
          editedMap[type] = { ...template, customTexts: { ...template.customTexts } }
        }

        setTemplates(templatesMap)
        setEditedTemplates(editedMap)
      }
    } catch (error) {
      console.error('Error fetching email templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (type: EmailType, field: string, value: string) => {
    setEditedTemplates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        ...(field === 'subject' ? { subject: value } : {
          customTexts: {
            ...prev[type].customTexts,
            [field]: value,
          },
        }),
      },
    }))
  }

  const hasChanges = (type: EmailType) => {
    const original = templates[type]
    const edited = editedTemplates[type]
    if (!original || !edited) return false

    if (original.subject !== edited.subject) return true

    const info = emailTypeInfo[type]
    for (const field of info.fields) {
      if (field.key === 'subject') continue
      const originalValue = original.customTexts[field.key] || ''
      const editedValue = edited.customTexts[field.key] || ''
      if (originalValue !== editedValue) return true
    }

    return false
  }

  const saveTemplate = async (type: EmailType) => {
    setSaving(type)
    try {
      const template = editedTemplates[type]
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })

      if (res.ok) {
        setTemplates(prev => ({
          ...prev,
          [type]: { ...template, customTexts: { ...template.customTexts } },
        }))
        toast.success('Modèle sauvegardé')
      } else {
        throw new Error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(null)
    }
  }

  const resetTemplate = (type: EmailType) => {
    setEditedTemplates(prev => ({
      ...prev,
      [type]: {
        ...templates[type],
        customTexts: { ...templates[type].customTexts },
      },
    }))
  }

  const loadPreview = async (type: EmailType) => {
    setPreviewType(type)
    setLoadingPreview(true)
    setPreviewData(null)

    try {
      const template = editedTemplates[type]
      const res = await fetch('/api/email-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subject: template.subject,
          customTexts: template.customTexts,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setPreviewData(data)
      } else {
        throw new Error('Erreur')
      }
    } catch (error) {
      toast.error('Erreur lors du chargement de l\'aperçu')
      setPreviewType(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  const closePreview = () => {
    setPreviewType(null)
    setPreviewData(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Mail size={20} style={{ color: 'var(--color-text-secondary)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Personnalisez le contenu de chaque type de courriel. Les champs vides utiliseront les valeurs par défaut.
        </p>
      </div>

      {/* Liste des templates */}
      <div className={previewType ? 'hidden lg:block' : ''}>
        {emailTypes.map((type) => {
          const info = emailTypeInfo[type]
          const isExpanded = expandedType === type
          const edited = editedTemplates[type]
          const changed = hasChanges(type)

          return (
            <div
              key={type}
              className="rounded-xl overflow-hidden mb-4"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: `1px solid ${changed ? 'var(--color-accent-lavender)' : 'var(--color-border-light)'}`,
              }}
            >
              {/* Header */}
              <button
                onClick={() => setExpandedType(isExpanded ? null : type)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {info.label}
                    </span>
                    {changed && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--color-accent-lavender)', color: 'var(--color-text-primary)' }}
                      >
                        Modifié
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {info.description}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp size={18} style={{ color: 'var(--color-text-muted)' }} />
                ) : (
                  <ChevronDown size={18} style={{ color: 'var(--color-text-muted)' }} />
                )}
              </button>

              {/* Content */}
              {isExpanded && edited && (
                <div className="p-4 pt-0 space-y-4">
                  <div
                    className="h-px"
                    style={{ backgroundColor: 'var(--color-border-light)' }}
                  />

                  {info.fields.map((field) => (
                    <div key={field.key}>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {field.label}
                      </label>
                      {field.multiline ? (
                        <textarea
                          value={field.key === 'subject' ? edited.subject : (edited.customTexts[field.key] || '')}
                          onChange={(e) => updateField(type, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                          style={{
                            backgroundColor: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border-light)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={field.key === 'subject' ? edited.subject : (edited.customTexts[field.key] || '')}
                          onChange={(e) => updateField(type, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{
                            backgroundColor: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border-light)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      )}
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => saveTemplate(type)}
                      loading={saving === type}
                      disabled={!changed}
                      icon={<Save size={14} />}
                    >
                      Sauvegarder
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => loadPreview(type)}
                      icon={<Eye size={14} />}
                    >
                      Aperçu
                    </Button>
                    {changed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resetTemplate(type)}
                        icon={<RotateCcw size={14} />}
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal d'aperçu */}
      {previewType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'var(--color-border-light)' }}
            >
              <div>
                <h3 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Aperçu: {emailTypeInfo[previewType].label}
                </h3>
                {previewData && (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Sujet: {previewData.subject}
                  </p>
                )}
              </div>
              <button
                onClick={closePreview}
                className="p-2 rounded-lg transition-colors hover:bg-opacity-10"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: '#f5f5f5' }}>
              {loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
                </div>
              ) : previewData ? (
                <div
                  className="mx-auto rounded-lg overflow-hidden shadow-lg"
                  style={{ maxWidth: '600px', backgroundColor: 'white' }}
                >
                  <iframe
                    srcDoc={previewData.html}
                    className="w-full border-0"
                    style={{ height: '600px' }}
                    title="Aperçu du courriel"
                  />
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                  Erreur lors du chargement de l'aperçu
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-2 p-4 border-t"
              style={{ borderColor: 'var(--color-border-light)' }}
            >
              <Button variant="secondary" onClick={closePreview}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
