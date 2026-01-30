'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Send,
  MoreHorizontal,
  Plus,
  Trash2,
  GripVertical,
  Building2,
  FolderKanban,
  ChevronDown,
  ChevronUp,
  FileText,
  Copy,
  ImagePlus,
  X,
  Upload,
  Download,
  BookMarked,
  LayoutList,
  Package,
  Eye,
  Link2,
} from 'lucide-react'
import { useToast, useConfirm, Tooltip } from '@/components/ui'
import { SaveAsTemplateModal } from '@/components/library/SaveAsTemplateModal'
import { InsertSectionModal } from '@/components/library/InsertSectionModal'
import { InsertItemModal } from '@/components/library/InsertItemModal'
import { SendEmailModal } from '@/components/email/SendEmailModal'

type Discount = {
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  label: string
  reason: string
}

type ItemType = 'SERVICE' | 'PRODUCT' | 'FREE' | 'A_LA_CARTE'
type BillingMode = 'FIXED' | 'HOURLY'
type CollaboratorType = 'OWNER' | 'FREELANCER' | null
type PriceVariant = {
  label: string
  price: number
}

type QuoteItem = {
  id: string
  sectionId: string
  name: string
  itemType: ItemType // Deprecated, utiliser itemTypes
  itemTypes: ItemType[]
  description: string | null
  deliverables: any
  billingMode: BillingMode
  quantity: number
  unitPrice: string
  hourlyRate: string | null
  hours: string | null
  variants: PriceVariant[] | null
  selectedVariant: number | null
  includeInTotal: boolean
  isSelected: boolean
  collaboratorType: CollaboratorType
  collaboratorName: string | null
  collaboratorAmount: string | null
  sortOrder: number
}

type QuoteSection = {
  id: string
  quoteId: string
  sectionNumber: number
  title: string
  description: string | null
  sortOrder: number
  items: QuoteItem[]
}

type EndNote = {
  title: string
  content: string
}

type Quote = {
  id: string
  quoteNumber: string
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED'
  coverTitle: string | null
  coverSubtitle: string | null
  coverImageUrl: string | null
  introduction: string | null
  endNotes: EndNote[] | null
  subtotal: string
  discounts: Discount[] | null
  tpsRate: string
  tvqRate: string
  total: string
  validUntil: string | null
  validityDays: number
  depositPercent: string
  paymentTerms: string | null
  lateFeePolicy: string | null
  publicToken: string | null
  project: {
    id: string
    name: string
    projectNumber: number
    client: {
      id: string
      code: string
      companyName: string
      address: string | null
      contacts: { name: string; email: string | null }[]
    }
  }
  sections: QuoteSection[]
}

const statusLabels = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  VIEWED: 'Consulté',
  ACCEPTED: 'Accepté',
  REFUSED: 'Refusé',
  EXPIRED: 'Expiré',
}

const statusColors = {
  DRAFT: { bg: 'rgba(163, 163, 163, 0.1)', text: 'var(--color-text-muted)' },
  SENT: { bg: 'rgba(59, 130, 246, 0.1)', text: 'var(--color-status-info-text)' },
  VIEWED: { bg: 'rgba(197, 184, 227, 0.2)', text: '#7C3AED' }, /* violet-600 pour meilleur contraste */
  ACCEPTED: { bg: 'rgba(34, 197, 94, 0.1)', text: 'var(--color-status-success-text)' },
  REFUSED: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--color-status-error-text)' },
  EXPIRED: { bg: 'rgba(234, 179, 8, 0.1)', text: 'var(--color-status-warning-text)' },
}

export function QuoteEditor({ initialQuote }: { initialQuote: Quote }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [quote, setQuote] = useState<Quote>(initialQuote)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [sending, setSending] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [projects, setProjects] = useState<Array<{ id: string; name: string; projectNumber: number; client: { code: string; companyName: string } }>>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(initialQuote.sections.map(s => s.id))
  )
  const [uploadingCover, setUploadingCover] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false)
  const [showInsertSection, setShowInsertSection] = useState(false)
  const [showInsertItem, setShowInsertItem] = useState(false)
  const [insertItemSectionId, setInsertItemSectionId] = useState<string | null>(null)

  // Calculs
  const calculateTotals = useCallback((sections: QuoteSection[], discounts: Discount[] | null) => {
    const subtotal = sections.reduce((sectionSum, section) => {
      return sectionSum + section.items.reduce((itemSum, item) => {
        const types = item.itemTypes || [item.itemType]
        if (!item.includeInTotal || !item.isSelected || types.includes('FREE')) return itemSum
        if (item.billingMode === 'HOURLY' && item.hourlyRate && item.hours) {
          return itemSum + parseFloat(item.hourlyRate) * parseFloat(item.hours)
        }
        // Use variant price if variants exist, default to first variant
        if (item.variants && item.variants.length > 0) {
          const selectedVariantIndex = item.selectedVariant ?? 0
          const selectedVariant = item.variants[selectedVariantIndex]
          if (selectedVariant) {
            return itemSum + selectedVariant.price * item.quantity
          }
        }
        return itemSum + parseFloat(item.unitPrice) * item.quantity
      }, 0)
    }, 0)

    // Calculer tous les rabais
    const discountDetails = (discounts || []).map(d => {
      if (d.type === 'PERCENTAGE') {
        return { ...d, amount: subtotal * (d.value / 100) }
      }
      return { ...d, amount: d.value }
    })

    const totalDiscount = discountDetails.reduce((sum, d) => sum + d.amount, 0)
    const afterDiscount = subtotal - totalDiscount
    const tps = afterDiscount * parseFloat(quote.tpsRate)
    const tvq = afterDiscount * parseFloat(quote.tvqRate)
    const total = afterDiscount + tps + tvq

    return { subtotal, discountDetails, totalDiscount, afterDiscount, tps, tvq, total }
  }, [quote.tpsRate, quote.tvqRate])

  const totals = calculateTotals(quote.sections, quote.discounts)

  // Gestion des rabais
  const addDiscount = () => {
    const newDiscount: Discount = {
      type: 'FIXED',
      value: 0,
      label: '',
      reason: '',
    }
    setQuote(prev => ({
      ...prev,
      discounts: [...(prev.discounts || []), newDiscount]
    }))
  }

  const updateDiscount = (index: number, field: keyof Discount, value: any) => {
    setQuote(prev => ({
      ...prev,
      discounts: (prev.discounts || []).map((d, i) =>
        i === index ? { ...d, [field]: value } : d
      )
    }))
  }

  const removeDiscount = (index: number) => {
    setQuote(prev => ({
      ...prev,
      discounts: (prev.discounts || []).filter((_, i) => i !== index)
    }))
  }

  // Sauvegarder le devis
  const saveQuote = async () => {
    setSaving(true)
    try {
      await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          introduction: quote.introduction,
          endNotes: quote.endNotes,
          depositPercent: parseFloat(quote.depositPercent),
          paymentTerms: quote.paymentTerms,
          lateFeePolicy: quote.lateFeePolicy,
          discounts: quote.discounts,
          subtotal: totals.subtotal,
          total: totals.total,
        }),
      })
      router.refresh()
    } catch (error) {
      console.error('Error saving quote:', error)
    } finally {
      setSaving(false)
    }
  }

  // Envoyer le devis (passer à SENT et générer le lien public)
  const sendQuote = async () => {
    const confirmed = await confirm({
      title: 'Envoyer le devis',
      message: 'Un lien public sera généré pour le client.',
      confirmText: 'Envoyer',
      variant: 'info',
    })
    if (!confirmed) return

    setSending(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })

      if (res.ok) {
        const updatedQuote = await res.json()
        setQuote(prev => ({
          ...prev,
          status: 'SENT',
          publicToken: updatedQuote.publicToken,
        }))
        router.refresh()
      }
    } catch (error) {
      console.error('Error sending quote:', error)
    } finally {
      setSending(false)
    }
  }

  const handleDeleteQuote = async () => {
    const confirmed = await confirm({
      title: 'Supprimer le devis',
      message: 'Cette action est irréversible. Le devis sera définitivement supprimé.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error)
        return
      }
      router.push('/devis')
      router.refresh()
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  const handleDuplicateQuote = async () => {
    const confirmed = await confirm({
      title: 'Dupliquer le devis',
      message: 'Une copie sera créée en brouillon.',
      confirmText: 'Dupliquer',
      variant: 'info',
    })
    if (!confirmed) return

    setDuplicating(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/duplicate`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error)
        return
      }
      const newQuote = await res.json()
      router.push(`/devis/${newQuote.id}`)
    } catch (error) {
      console.error('Error duplicating quote:', error)
      toast.error('Erreur lors de la duplication')
    } finally {
      setDuplicating(false)
    }
  }

  const fetchProjects = async () => {
    if (projects.length > 0) return // Déjà chargés
    setLoadingProjects(true)
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const changeProject = async (projectId: string) => {
    const selectedProject = projects.find(p => p.id === projectId)
    if (!selectedProject) return

    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (res.ok) {
        const updatedQuote = await res.json()
        setQuote(prev => ({
          ...prev,
          quoteNumber: updatedQuote.quoteNumber,
          project: {
            id: selectedProject.id,
            name: selectedProject.name,
            projectNumber: selectedProject.projectNumber,
            client: {
              id: selectedProject.client.code,
              code: selectedProject.client.code,
              companyName: selectedProject.client.companyName,
              address: prev.project.client.address,
              contacts: prev.project.client.contacts,
            }
          }
        }))
        setShowProjectSelector(false)
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Error changing project:', error)
      toast.error('Erreur lors du changement de projet')
    }
  }

  // Ajouter une section
  const addSection = async () => {
    try {
      const res = await fetch(`/api/quotes/${quote.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nouvelle section' }),
      })
      const section = await res.json()
      setQuote(prev => ({
        ...prev,
        sections: [...prev.sections, { ...section, items: [] }]
      }))
      setExpandedSections(prev => new Set([...prev, section.id]))
    } catch (error) {
      console.error('Error adding section:', error)
    }
  }

  // Insérer une section depuis la bibliothèque
  const insertSectionFromLibrary = async (librarySection: {
    id: string
    name: string
    description: string | null
    items: Array<{
      name: string
      description: string | null
      billingMode: 'FIXED' | 'HOURLY'
      quantity: number
      unitPrice: string
      hourlyRate: string | null
      hours: string | null
    }>
  }) => {
    try {
      // Créer la section
      const sectionRes = await fetch(`/api/quotes/${quote.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: librarySection.name,
          description: librarySection.description,
        }),
      })
      const newSection = await sectionRes.json()

      // Créer les items
      const itemPromises = librarySection.items.map((item) =>
        fetch(`/api/quotes/${quote.id}/sections/${newSection.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name,
            description: item.description,
            billingMode: item.billingMode,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice),
            hourlyRate: item.hourlyRate ? parseFloat(item.hourlyRate) : null,
            hours: item.hours ? parseFloat(item.hours) : null,
          }),
        }).then((res) => res.json())
      )

      const newItems = await Promise.all(itemPromises)

      setQuote((prev) => ({
        ...prev,
        sections: [...prev.sections, { ...newSection, items: newItems }],
      }))
      setExpandedSections((prev) => new Set([...prev, newSection.id]))
      toast.success('Section insérée')
    } catch (error) {
      console.error('Error inserting section:', error)
      throw error
    }
  }

  // Supprimer une section
  const deleteSection = async (sectionId: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la section',
      message: 'Cette section et tous ses items seront supprimés.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      await fetch(`/api/quotes/${quote.id}/sections/${sectionId}`, {
        method: 'DELETE',
      })
      setQuote(prev => ({
        ...prev,
        sections: prev.sections.filter(s => s.id !== sectionId)
      }))
    } catch (error) {
      console.error('Error deleting section:', error)
    }
  }

  // Mettre à jour une section
  const updateSection = async (sectionId: string, field: string, value: string) => {
    setQuote(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? { ...s, [field]: value } : s
      )
    }))

    try {
      await fetch(`/api/quotes/${quote.id}/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
    } catch (error) {
      console.error('Error updating section:', error)
    }
  }

  // Ajouter un item
  const addItem = async (sectionId: string) => {
    try {
      const res = await fetch(`/api/quotes/${quote.id}/sections/${sectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Nouvel item', unitPrice: 0 }),
      })
      const item = await res.json()
      setQuote(prev => ({
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, items: [...s.items, item] } : s
        )
      }))
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  // Insérer un item depuis la bibliothèque
  const insertItemFromLibrary = async (libraryItem: {
    name: string
    description: string | null
    billingMode: 'FIXED' | 'HOURLY'
    defaultQuantity: number
    defaultPrice: string
    hourlyRate: string | null
    estimatedHours: string | null
  }) => {
    if (!insertItemSectionId) return

    try {
      const res = await fetch(`/api/quotes/${quote.id}/sections/${insertItemSectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: libraryItem.name,
          description: libraryItem.description,
          billingMode: libraryItem.billingMode,
          quantity: libraryItem.defaultQuantity,
          unitPrice: parseFloat(libraryItem.defaultPrice),
          hourlyRate: libraryItem.hourlyRate ? parseFloat(libraryItem.hourlyRate) : null,
          hours: libraryItem.estimatedHours ? parseFloat(libraryItem.estimatedHours) : null,
        }),
      })
      const item = await res.json()
      setQuote((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === insertItemSectionId ? { ...s, items: [...s.items, item] } : s
        ),
      }))
      toast.success('Item inséré')
    } catch (error) {
      console.error('Error inserting item:', error)
      throw error
    }
  }

  // Supprimer un item
  const deleteItem = async (itemId: string, sectionId: string) => {
    try {
      await fetch(`/api/quotes/items/${itemId}`, {
        method: 'DELETE',
      })
      setQuote(prev => ({
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s
        )
      }))
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  // Mettre à jour un item
  const updateItem = async (itemId: string, sectionId: string, field: string, value: any) => {
    setQuote(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? {
          ...s,
          items: s.items.map(i =>
            i.id === itemId ? { ...i, [field]: value } : i
          )
        } : s
      )
    }))

    try {
      await fetch(`/api/quotes/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // Upload cover image
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCover(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('quoteId', quote.id)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de l\'upload')
        return
      }

      const data = await res.json()
      setQuote(prev => ({ ...prev, coverImageUrl: data.url }))

      // Save to database
      await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl: data.url }),
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Erreur lors de l\'upload')
    } finally {
      setUploadingCover(false)
    }
  }

  const removeCoverImage = async () => {
    try {
      setQuote(prev => ({ ...prev, coverImageUrl: null }))
      await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl: null }),
      })
    } catch (error) {
      console.error('Error removing cover image:', error)
    }
  }

  // Download PDF
  const downloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/pdf`)
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de la génération du PDF')
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${quote.quoteNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Erreur lors du téléchargement du PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  const projectCode = `${quote.project.client.code}-${String(quote.project.projectNumber).padStart(3, '0')}`

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-6 py-4"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border-light)',
        }}
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/devis"
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <ArrowLeft size={20} />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-lg font-medium"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
                >
                  {quote.quoteNumber}
                </h1>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: statusColors[quote.status].bg,
                    color: statusColors[quote.status].text,
                  }}
                >
                  {statusLabels[quote.status]}
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {quote.project.client.companyName} · {quote.project.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Actions principales */}
            <button
              onClick={saveQuote}
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-bg-dark)',
                color: 'var(--color-text-inverse)',
              }}
            >
              <Save size={16} />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>

            {(quote.status === 'DRAFT' || quote.status === 'SENT' || quote.status === 'VIEWED') && (
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--color-bg-dark)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                <Send size={16} />
                {quote.status === 'DRAFT' ? 'Envoyer' : 'Renvoyer'}
              </button>
            )}

            {/* Séparateur */}
            <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--color-border-light)' }} />

            {/* Actions secondaires - style uniforme */}
            {quote.publicToken && (
              <>
                <Tooltip content="Aperçu client">
                  <Link
                    href={`/devis/public/${quote.publicToken}`}
                    target="_blank"
                    className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <Eye size={16} />
                  </Link>
                </Tooltip>

                <Tooltip content="Copier le lien">
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/devis/public/${quote.publicToken}`
                      navigator.clipboard.writeText(url)
                      toast.success('Lien copié dans le presse-papiers')
                    }}
                    className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <Link2 size={16} />
                  </button>
                </Tooltip>

                <Tooltip content="Télécharger PDF">
                  <button
                    onClick={downloadPdf}
                    disabled={downloadingPdf}
                    className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <Download size={16} />
                  </button>
                </Tooltip>
              </>
            )}

            <Tooltip content="Dupliquer">
              <button
                onClick={handleDuplicateQuote}
                disabled={duplicating}
                className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Copy size={16} />
              </button>
            </Tooltip>

            <Tooltip content="Sauvegarder comme template">
              <button
                onClick={() => setShowSaveAsTemplate(true)}
                className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <BookMarked size={16} />
              </button>
            </Tooltip>

            {/* Separateur */}
            <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--color-border-light)' }} />

            {/* Action danger - toujours a la fin */}
            <Tooltip content="Supprimer">
              <button
                onClick={handleDeleteQuote}
                disabled={deleting}
                className="btn-icon-danger flex items-center gap-2 p-2 rounded-lg text-sm disabled:opacity-50"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Trash2 size={18} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Page de couverture */}
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <h2
                className="text-base mb-4"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
              >
                Page de couverture
              </h2>

              <div className="space-y-4">
                {/* Cover image */}
                <div>
                  <label className="text-xs block mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Image de couverture
                  </label>
                  {quote.coverImageUrl ? (
                    <div className="relative rounded-lg overflow-hidden" style={{ maxHeight: '200px' }}>
                      <img
                        src={quote.coverImageUrl}
                        alt="Couverture"
                        className="w-full h-48 object-cover"
                      />
                      <button
                        onClick={removeCoverImage}
                        className="absolute top-2 right-2 p-1.5 rounded-full transition-colors"
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          color: 'white',
                        }}
                        title="Supprimer l'image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex flex-col items-center justify-center w-full h-32 rounded-lg cursor-pointer transition-colors ${uploadingCover ? 'opacity-50 pointer-events-none' : ''}`}
                      style={{
                        border: '2px dashed var(--color-border-light)',
                        backgroundColor: 'var(--color-bg-tertiary)',
                      }}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleCoverImageUpload}
                        className="hidden"
                        disabled={uploadingCover}
                      />
                      {uploadingCover ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent-lavender)', borderTopColor: 'transparent' }} />
                          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Upload en cours...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <ImagePlus size={24} style={{ color: 'var(--color-text-muted)' }} />
                          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            Cliquez ou glissez une image
                          </span>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                            JPG, PNG, WebP ou GIF (max 5MB)
                          </span>
                        </div>
                      )}
                    </label>
                  )}
                </div>

                {/* Cover title */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Titre principal
                  </label>
                  <input
                    type="text"
                    value={quote.coverTitle || ''}
                    onChange={(e) => setQuote(prev => ({ ...prev, coverTitle: e.target.value || null }))}
                    placeholder={quote.project.name}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                    Laissez vide pour utiliser le nom du projet
                  </p>
                </div>

                {/* Cover subtitle */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Sous-titre
                  </label>
                  <input
                    type="text"
                    value={quote.coverSubtitle || ''}
                    onChange={(e) => setQuote(prev => ({ ...prev, coverSubtitle: e.target.value || null }))}
                    placeholder="Ex: Proposition de services créatifs"
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>

                {/* Introduction */}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Introduction
                  </label>
                  <textarea
                    value={quote.introduction || ''}
                    onChange={(e) => setQuote(prev => ({ ...prev, introduction: e.target.value }))}
                    placeholder="Texte d'introduction du devis... (Markdown supporté)"
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-lg text-sm resize-y"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                    **gras** · *italique* · - liste · &nbsp;&nbsp;- sous-liste
                  </p>
                </div>
              </div>
            </div>

            {/* Sections */}
            {quote.sections.map((section) => (
              <div
                key={section.id}
                className="rounded-xl overflow-hidden"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-light)',
                }}
              >
                {/* Section header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  onClick={() => toggleSection(section.id)}
                >
                  <GripVertical size={16} style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent text-sm font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {section.items.length} item{section.items.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSection(section.id) }}
                    className="btn-icon-danger p-1.5 rounded"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                  {expandedSections.has(section.id) ? (
                    <ChevronUp size={16} style={{ color: 'var(--color-text-muted)' }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </div>

                {/* Section content */}
                {expandedSections.has(section.id) && (
                  <div className="p-4">
                    {/* Section description */}
                    <div className="mb-4">
                      <textarea
                        value={section.description || ''}
                        onChange={(e) => updateSection(section.id, 'description', e.target.value)}
                        placeholder="Description de la section... (Markdown: **gras**, *italique*, - liste)"
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg text-sm resize-y"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          border: '1px solid var(--color-border-light)',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                        **gras** · *italique* · - liste · &nbsp;&nbsp;- sous-liste
                      </p>
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                      {section.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-lg"
                          style={{
                            backgroundColor: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border-light)',
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <GripVertical size={16} className="mt-2" style={{ color: 'var(--color-text-muted)' }} />

                            <div className="flex-1 space-y-3">
                              {/* Item name + badges */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateItem(item.id, section.id, 'name', e.target.value)}
                                  className="flex-1 bg-transparent text-sm font-medium"
                                  style={{ color: 'var(--color-text-primary)' }}
                                />
                                {(item.itemTypes || [item.itemType]).includes('A_LA_CARTE') && (
                                  <span
                                    className="px-2 py-0.5 rounded text-xs whitespace-nowrap"
                                    style={{ backgroundColor: 'rgba(197, 184, 227, 0.3)', color: '#6b5b95' }}
                                  >
                                    Optionnel
                                  </span>
                                )}
                                {(item.itemTypes || [item.itemType]).includes('FREE') && (
                                  <span
                                    className="px-2 py-0.5 rounded text-xs whitespace-nowrap"
                                    style={{ backgroundColor: 'rgba(22, 163, 74, 0.15)', color: '#15803d' }}
                                  >
                                    Gratuit
                                  </span>
                                )}
                              </div>

                              {/* Item description */}
                              <div>
                                <textarea
                                  value={item.description || ''}
                                  onChange={(e) => updateItem(item.id, section.id, 'description', e.target.value)}
                                  placeholder="Description... (Markdown: **gras**, *italique*, - liste)"
                                  rows={5}
                                  className="w-full px-3 py-2 rounded-lg text-sm resize-y"
                                  style={{
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    border: '1px solid var(--color-border-light)',
                                    color: 'var(--color-text-primary)',
                                  }}
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                                  **gras** · *italique* · - liste · &nbsp;&nbsp;- sous-liste
                                </p>
                              </div>

                              {/* Billing mode toggle */}
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Mode:</span>
                                <button
                                  onClick={() => updateItem(item.id, section.id, 'billingMode', 'FIXED')}
                                  className="px-2 py-1 rounded text-xs transition-colors"
                                  style={{
                                    backgroundColor: (item.billingMode || 'FIXED') === 'FIXED' ? 'var(--color-bg-dark)' : 'var(--color-bg-secondary)',
                                    color: (item.billingMode || 'FIXED') === 'FIXED' ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                                    border: '1px solid var(--color-border-light)',
                                  }}
                                >
                                  Fixe
                                </button>
                                <button
                                  onClick={() => updateItem(item.id, section.id, 'billingMode', 'HOURLY')}
                                  className="px-2 py-1 rounded text-xs transition-colors"
                                  style={{
                                    backgroundColor: item.billingMode === 'HOURLY' ? 'var(--color-bg-dark)' : 'var(--color-bg-secondary)',
                                    color: item.billingMode === 'HOURLY' ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                                    border: '1px solid var(--color-border-light)',
                                  }}
                                >
                                  Horaire
                                </button>
                              </div>

                              {/* Item price - dynamic fields based on billing mode */}
                              <div className="flex items-center gap-4">
                                {(item.billingMode || 'FIXED') === 'FIXED' ? (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Qté</label>
                                      <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(item.id, section.id, 'quantity', parseInt(e.target.value) || 1)}
                                        min={1}
                                        className="w-16 px-2 py-1 rounded text-sm text-center"
                                        style={{
                                          backgroundColor: 'var(--color-bg-secondary)',
                                          border: '1px solid var(--color-border-light)',
                                          color: 'var(--color-text-primary)',
                                        }}
                                      />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Prix</label>
                                      <input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) => updateItem(item.id, section.id, 'unitPrice', e.target.value)}
                                        step="0.01"
                                        className="w-28 px-2 py-1 rounded text-sm text-right"
                                        style={{
                                          backgroundColor: 'var(--color-bg-secondary)',
                                          border: '1px solid var(--color-border-light)',
                                          color: 'var(--color-text-primary)',
                                        }}
                                      />
                                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>$</span>
                                    </div>

                                    <div className="flex-1 text-right">
                                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                        {formatCurrency(
                                          item.variants && item.variants.length > 0 && item.selectedVariant !== null && item.variants[item.selectedVariant]
                                            ? item.variants[item.selectedVariant].price * item.quantity
                                            : parseFloat(item.unitPrice) * item.quantity
                                        )}
                                      </span>
                                      {item.variants && item.variants.length > 0 && item.selectedVariant !== null && item.variants[item.selectedVariant] && (
                                        <span className="block text-xs" style={{ color: 'var(--color-accent-lavender)' }}>
                                          {item.variants[item.selectedVariant].label}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Heures</label>
                                      <input
                                        type="number"
                                        value={item.hours || ''}
                                        onChange={(e) => updateItem(item.id, section.id, 'hours', e.target.value)}
                                        step="0.5"
                                        min={0}
                                        placeholder="0"
                                        className="w-20 px-2 py-1 rounded text-sm text-center"
                                        style={{
                                          backgroundColor: 'var(--color-bg-secondary)',
                                          border: '1px solid var(--color-border-light)',
                                          color: 'var(--color-text-primary)',
                                        }}
                                      />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Taux/h</label>
                                      <input
                                        type="number"
                                        value={item.hourlyRate || ''}
                                        onChange={(e) => updateItem(item.id, section.id, 'hourlyRate', e.target.value)}
                                        step="0.01"
                                        placeholder="0"
                                        className="w-28 px-2 py-1 rounded text-sm text-right"
                                        style={{
                                          backgroundColor: 'var(--color-bg-secondary)',
                                          border: '1px solid var(--color-border-light)',
                                          color: 'var(--color-text-primary)',
                                        }}
                                      />
                                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>$/h</span>
                                    </div>

                                    <div className="flex-1 text-right">
                                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                        {formatCurrency((parseFloat(item.hourlyRate || '0') * parseFloat(item.hours || '0')))}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Item options */}
                              <div className="flex flex-wrap items-center gap-4 text-xs">
                                <label className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                                  <input
                                    type="checkbox"
                                    checked={item.includeInTotal}
                                    onChange={(e) => updateItem(item.id, section.id, 'includeInTotal', e.target.checked)}
                                  />
                                  Inclure dans le total
                                </label>

                                <div className="flex items-center gap-3">
                                  <span style={{ color: 'var(--color-text-muted)' }}>Types:</span>
                                  {([
                                    { value: 'SERVICE', label: 'Service' },
                                    { value: 'PRODUCT', label: 'Produit' },
                                    { value: 'FREE', label: 'Gratuit' },
                                    { value: 'A_LA_CARTE', label: 'À la carte' },
                                  ] as const).map(type => {
                                    const types = item.itemTypes || [item.itemType]
                                    const isChecked = types.includes(type.value)
                                    return (
                                      <label
                                        key={type.value}
                                        className="flex items-center gap-1.5 cursor-pointer"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const currentTypes = item.itemTypes || [item.itemType]
                                            let newTypes: ItemType[]
                                            if (e.target.checked) {
                                              newTypes = [...currentTypes, type.value]
                                            } else {
                                              newTypes = currentTypes.filter(t => t !== type.value)
                                              if (newTypes.length === 0) newTypes = ['SERVICE']
                                            }
                                            updateItem(item.id, section.id, 'itemTypes', newTypes)
                                          }}
                                          className="rounded"
                                        />
                                        {type.label}
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* Collaborator assignment */}
                              <div className="flex flex-wrap items-center gap-3 pt-3 mt-3" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Assignation:</span>
                                <select
                                  value={item.collaboratorType || ''}
                                  onChange={(e) => {
                                    const value = e.target.value || null
                                    updateItem(item.id, section.id, 'collaboratorType', value)
                                    if (value !== 'FREELANCER') {
                                      updateItem(item.id, section.id, 'collaboratorName', null)
                                      updateItem(item.id, section.id, 'collaboratorAmount', null)
                                    }
                                  }}
                                  className="px-2 py-1 rounded text-xs"
                                  style={{
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    border: '1px solid var(--color-border-light)',
                                    color: 'var(--color-text-primary)',
                                  }}
                                >
                                  <option value="">Non assigne</option>
                                  <option value="OWNER">Moi</option>
                                  <option value="FREELANCER">Pigiste</option>
                                </select>

                                {item.collaboratorType === 'FREELANCER' && (
                                  <>
                                    <input
                                      type="text"
                                      value={item.collaboratorName || ''}
                                      onChange={(e) => updateItem(item.id, section.id, 'collaboratorName', e.target.value)}
                                      placeholder="Nom du pigiste"
                                      className="px-2 py-1 rounded text-xs w-32"
                                      style={{
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        border: '1px solid var(--color-border-light)',
                                        color: 'var(--color-text-primary)',
                                      }}
                                    />
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        value={item.collaboratorAmount || ''}
                                        onChange={(e) => updateItem(item.id, section.id, 'collaboratorAmount', e.target.value)}
                                        placeholder="0"
                                        step="0.01"
                                        className="px-2 py-1 rounded text-xs w-20 text-right"
                                        style={{
                                          backgroundColor: 'var(--color-bg-secondary)',
                                          border: '1px solid var(--color-border-light)',
                                          color: 'var(--color-text-primary)',
                                        }}
                                      />
                                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>$</span>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Price variants */}
                              <div className="flex flex-col gap-2 pt-3 mt-3" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Variantes de prix:</span>
                                  <button
                                    onClick={() => {
                                      const currentVariants = item.variants || []
                                      const newVariant = { label: `Option ${currentVariants.length + 1}`, price: 0 }
                                      updateItem(item.id, section.id, 'variants', [...currentVariants, newVariant])
                                    }}
                                    className="px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                                    style={{
                                      backgroundColor: 'var(--color-bg-tertiary)',
                                      color: 'var(--color-text-secondary)',
                                      border: '1px solid var(--color-border-light)',
                                    }}
                                  >
                                    <Plus size={12} />
                                    Ajouter
                                  </button>
                                </div>

                                {item.variants && item.variants.length > 0 && (
                                  <div className="space-y-2 mt-2">
                                    {item.variants.map((variant: PriceVariant, variantIndex: number) => (
                                      <div
                                        key={variantIndex}
                                        className="flex items-center gap-2 p-2 rounded-lg"
                                        style={{
                                          backgroundColor: item.selectedVariant === variantIndex
                                            ? 'rgba(197, 184, 227, 0.15)'
                                            : 'var(--color-bg-tertiary)',
                                          border: item.selectedVariant === variantIndex
                                            ? '1px solid var(--color-accent-lavender)'
                                            : '1px solid var(--color-border-light)',
                                        }}
                                      >
                                        <input
                                          type="radio"
                                          name={`variant-${item.id}`}
                                          checked={item.selectedVariant === variantIndex}
                                          onChange={() => updateItem(item.id, section.id, 'selectedVariant', variantIndex)}
                                          className="shrink-0"
                                        />
                                        <input
                                          type="text"
                                          value={variant.label}
                                          onChange={(e) => {
                                            const newVariants = [...item.variants!]
                                            newVariants[variantIndex] = { ...variant, label: e.target.value }
                                            updateItem(item.id, section.id, 'variants', newVariants)
                                          }}
                                          placeholder="Label (ex: 5 pages)"
                                          className="flex-1 px-2 py-1 rounded text-xs"
                                          style={{
                                            backgroundColor: 'var(--color-bg-secondary)',
                                            border: '1px solid var(--color-border-light)',
                                            color: 'var(--color-text-primary)',
                                          }}
                                        />
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            value={variant.price}
                                            onChange={(e) => {
                                              const newVariants = [...item.variants!]
                                              newVariants[variantIndex] = { ...variant, price: parseFloat(e.target.value) || 0 }
                                              updateItem(item.id, section.id, 'variants', newVariants)
                                            }}
                                            step="0.01"
                                            className="w-24 px-2 py-1 rounded text-xs text-right"
                                            style={{
                                              backgroundColor: 'var(--color-bg-secondary)',
                                              border: '1px solid var(--color-border-light)',
                                              color: 'var(--color-text-primary)',
                                            }}
                                          />
                                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>$</span>
                                        </div>
                                        <button
                                          onClick={() => {
                                            const newVariants = item.variants!.filter((_: PriceVariant, i: number) => i !== variantIndex)
                                            updateItem(item.id, section.id, 'variants', newVariants.length > 0 ? newVariants : null)
                                            // Reset selectedVariant if we deleted the selected one
                                            if (item.selectedVariant === variantIndex) {
                                              updateItem(item.id, section.id, 'selectedVariant', null)
                                            } else if (item.selectedVariant !== null && item.selectedVariant > variantIndex) {
                                              updateItem(item.id, section.id, 'selectedVariant', item.selectedVariant - 1)
                                            }
                                          }}
                                          className="p-1 rounded transition-colors"
                                          style={{ color: 'var(--color-text-muted)' }}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    ))}
                                    {item.variants.length > 0 && item.selectedVariant === null && (
                                      <p className="text-xs" style={{ color: 'var(--color-status-warning)' }}>
                                        ⚠ Sélectionnez une variante par défaut
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => deleteItem(item.id, section.id)}
                              className="p-1 rounded transition-colors"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add item buttons */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => addItem(section.id)}
                        className="btn-dashed flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                        style={{
                          border: '1px dashed var(--color-border-light)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <Plus size={14} />
                        Nouvel item
                      </button>
                      <button
                        onClick={() => {
                          setInsertItemSectionId(section.id)
                          setShowInsertItem(true)
                        }}
                        className="py-2 px-3 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                        style={{
                          backgroundColor: 'rgba(197, 184, 227, 0.15)',
                          border: '1px solid var(--color-accent-lavender)',
                          color: 'var(--color-accent-lavender)',
                        }}
                      >
                        <Package size={14} />
                        Biblio
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add section buttons */}
            <div className="flex gap-3">
              <button
                onClick={addSection}
                className="btn-dashed flex-1 py-4 rounded-xl text-sm flex items-center justify-center gap-2"
                style={{
                  border: '2px dashed var(--color-border-light)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Plus size={18} />
                Nouvelle section
              </button>
              <button
                onClick={() => setShowInsertSection(true)}
                className="py-4 px-6 rounded-xl text-sm flex items-center gap-2 transition-colors"
                style={{
                  backgroundColor: 'rgba(197, 184, 227, 0.15)',
                  border: '1px solid var(--color-accent-lavender)',
                  color: 'var(--color-accent-lavender)',
                }}
              >
                <LayoutList size={18} />
                Bibliothèque
              </button>
            </div>

            {/* End notes section */}
            <div
              className="rounded-xl p-6 mt-6"
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
                  Notes de fin
                </h3>
                <button
                  onClick={() => {
                    const newNote: EndNote = { title: '', content: '' }
                    setQuote(prev => ({
                      ...prev,
                      endNotes: [...(prev.endNotes || []), newNote]
                    }))
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border-light)',
                  }}
                >
                  <Plus size={14} />
                  Ajouter
                </button>
              </div>

              {quote.endNotes && quote.endNotes.length > 0 ? (
                <div className="space-y-4">
                  {quote.endNotes.map((note, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            value={note.title}
                            onChange={(e) => {
                              const newNotes = [...(quote.endNotes || [])]
                              newNotes[index] = { ...note, title: e.target.value }
                              setQuote(prev => ({ ...prev, endNotes: newNotes }))
                            }}
                            placeholder="Titre (ex: Conditions, Garantie...)"
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                              backgroundColor: 'var(--color-bg-secondary)',
                              border: '1px solid var(--color-border-light)',
                              color: 'var(--color-text-primary)',
                            }}
                          />
                          <div>
                            <textarea
                              value={note.content}
                              onChange={(e) => {
                                const newNotes = [...(quote.endNotes || [])]
                                newNotes[index] = { ...note, content: e.target.value }
                                setQuote(prev => ({ ...prev, endNotes: newNotes }))
                              }}
                              placeholder="Contenu de la note... (Markdown supporté)"
                              rows={3}
                              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                              style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border-light)',
                                color: 'var(--color-text-primary)',
                              }}
                            />
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                              **gras** · *italique* · - liste
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newNotes = (quote.endNotes || []).filter((_, i) => i !== index)
                            setQuote(prev => ({ ...prev, endNotes: newNotes.length > 0 ? newNotes : null }))
                          }}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Ajoutez des notes qui apparaîtront après le récapitulatif du devis.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project info */}
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
                  Projet
                </h3>
                {quote.status === 'DRAFT' && (
                  <button
                    onClick={() => {
                      setShowProjectSelector(!showProjectSelector)
                      if (!showProjectSelector) fetchProjects()
                    }}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Changer
                  </button>
                )}
              </div>

              {showProjectSelector && (
                <div className="mb-4">
                  {loadingProjects ? (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Chargement...</p>
                  ) : (
                    <select
                      value={quote.project.id}
                      onChange={(e) => changeProject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border-light)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.client.code}-{String(p.projectNumber).padStart(3, '0')} · {p.client.companyName} · {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <Building2 size={14} />
                  <span>{quote.project.client.companyName}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <FolderKanban size={14} />
                  <span>{projectCode} - {quote.project.name}</span>
                </div>
              </div>
            </div>

            {/* Discounts */}
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
                  Rabais
                </h3>
                <button
                  onClick={addDiscount}
                  className="text-xs flex items-center gap-1 px-2 py-1 rounded"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <Plus size={12} />
                  Ajouter
                </button>
              </div>

              {(!quote.discounts || quote.discounts.length === 0) ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                  Aucun rabais
                </p>
              ) : (
                <div className="space-y-4">
                  {quote.discounts.map((discount, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg space-y-2"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <select
                          value={discount.type}
                          onChange={(e) => updateDiscount(index, 'type', e.target.value)}
                          className="flex-1 px-2 py-1.5 rounded text-xs"
                          style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-light)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          <option value="PERCENTAGE">%</option>
                          <option value="FIXED">$</option>
                        </select>
                        <input
                          type="number"
                          value={discount.value}
                          onChange={(e) => updateDiscount(index, 'value', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          step="0.01"
                          className="w-20 px-2 py-1.5 rounded text-xs text-right"
                          style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-light)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                        <button
                          onClick={() => removeDiscount(index)}
                          className="p-1 rounded"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={discount.label}
                        onChange={(e) => updateDiscount(index, 'label', e.target.value)}
                        placeholder="Nom du rabais"
                        className="w-full px-2 py-1.5 rounded text-xs"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border-light)',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                      <input
                        type="text"
                        value={discount.reason}
                        onChange={(e) => updateDiscount(index, 'reason', e.target.value)}
                        placeholder="Raison (optionnel)"
                        className="w-full px-2 py-1.5 rounded text-xs"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border-light)',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
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
                Totaux
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Sous-total</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(totals.subtotal)}</span>
                </div>

                {totals.discountDetails.map((d, i) => (
                  <div key={i} className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {d.label || 'Rabais'} {d.type === 'PERCENTAGE' && `(${d.value}%)`}
                    </span>
                    <span style={{ color: 'var(--color-status-success)' }}>-{formatCurrency(d.amount)}</span>
                  </div>
                ))}

                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>TPS (5%)</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(totals.tps)}</span>
                </div>

                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>TVQ (9.975%)</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(totals.tvq)}</span>
                </div>

                <div
                  className="flex justify-between pt-2 mt-2"
                  style={{ borderTop: '1px solid var(--color-border-light)' }}
                >
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Total</span>
                  <span
                    className="text-lg font-medium"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
                  >
                    {formatCurrency(totals.total)}
                  </span>
                </div>

                <div className="flex justify-between text-xs pt-2">
                  <span style={{ color: 'var(--color-text-muted)' }}>Dépôt ({quote.depositPercent}%)</span>
                  <span style={{ color: 'var(--color-accent-lavender)' }}>
                    {formatCurrency(totals.total * (parseFloat(quote.depositPercent) / 100))}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment terms & policies */}
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
                Conditions
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Dépôt requis (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={quote.depositPercent}
                      onChange={(e) => setQuote(prev => ({ ...prev, depositPercent: e.target.value }))}
                      min={0}
                      max={100}
                      step={5}
                      className="w-20 px-3 py-2 rounded-lg text-sm text-center"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border-light)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>%</span>
                    <span className="text-sm ml-auto" style={{ color: 'var(--color-accent-lavender)' }}>
                      {formatCurrency(totals.total * (parseFloat(quote.depositPercent) / 100))}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Conditions de paiement
                  </label>
                  <textarea
                    value={quote.paymentTerms || ''}
                    onChange={(e) => setQuote(prev => ({ ...prev, paymentTerms: e.target.value || null }))}
                    placeholder="Ex: Paiement en 2 versements: 50% à la signature, 50% à la livraison..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Politique de retard
                  </label>
                  <textarea
                    value={quote.lateFeePolicy || ''}
                    onChange={(e) => setQuote(prev => ({ ...prev, lateFeePolicy: e.target.value || null }))}
                    placeholder="Ex: Des frais de 2% par mois seront appliqués sur les soldes en retard..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save as template modal */}
      <SaveAsTemplateModal
        isOpen={showSaveAsTemplate}
        onClose={() => setShowSaveAsTemplate(false)}
        quoteId={quote.id}
        quoteName={quote.coverTitle || quote.project.name}
      />

      {/* Insert section modal */}
      <InsertSectionModal
        isOpen={showInsertSection}
        onClose={() => setShowInsertSection(false)}
        onInsert={insertSectionFromLibrary}
      />

      {/* Insert item modal */}
      <InsertItemModal
        isOpen={showInsertItem}
        onClose={() => {
          setShowInsertItem(false)
          setInsertItemSectionId(null)
        }}
        onInsert={insertItemFromLibrary}
      />

      {/* Send email modal */}
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        type="quote"
        itemId={quote.id}
        itemNumber={quote.quoteNumber}
        recipientEmail={quote.project.client.contacts[0]?.email || ''}
        recipientName={quote.project.client.contacts[0]?.name || quote.project.client.companyName}
        onSent={() => {
          setQuote(prev => ({ ...prev, status: 'SENT' }))
          router.refresh()
          setShowEmailModal(false)
          toast.success('Email envoyé avec succès')
        }}
      />
    </div>
  )
}
