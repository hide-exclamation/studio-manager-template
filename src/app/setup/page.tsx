'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, ChevronRight, ChevronLeft, Check, Building2, Receipt, Palette } from 'lucide-react'
import Image from 'next/image'
import { Button, useToast, Spinner } from '@/components/ui'
import { DEFAULTS } from '@/lib/settings'

type SetupData = {
  // Step 1: Company info
  companyName: string
  companyShortName: string
  companyLogoUrl: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyWebsite: string
  // Step 2: Taxes
  tpsNumber: string
  tvqNumber: string
  defaultTpsRate: number
  defaultTvqRate: number
  // Step 3: Colors
  colorBackground: string
  colorAccent: string
  colorAccentDark: string
}

const STEPS = [
  { id: 1, title: 'Informations', icon: Building2 },
  { id: 2, title: 'Taxes', icon: Receipt },
  { id: 3, title: 'Apparence', icon: Palette },
]

export default function SetupPage() {
  const router = useRouter()
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<SetupData>({
    companyName: '',
    companyShortName: '',
    companyLogoUrl: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    tpsNumber: '',
    tvqNumber: '',
    defaultTpsRate: DEFAULTS.defaultTpsRate,
    defaultTvqRate: DEFAULTS.defaultTvqRate,
    colorBackground: DEFAULTS.colorBackground,
    colorAccent: DEFAULTS.colorAccent,
    colorAccentDark: DEFAULTS.colorAccentDark,
  })

  // Check if already configured
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          if (data.isConfigured) {
            router.replace('/')
            return
          }
          // Pre-fill with existing data if any
          setFormData((prev) => ({
            ...prev,
            companyName: data.companyName || '',
            companyShortName: data.companyShortName || '',
            companyLogoUrl: data.companyLogoUrl || '',
            companyAddress: data.companyAddress || '',
            companyPhone: data.companyPhone || '',
            companyEmail: data.companyEmail || '',
            companyWebsite: data.companyWebsite || '',
            tpsNumber: data.tpsNumber || '',
            tvqNumber: data.tvqNumber || '',
            defaultTpsRate: Number(data.defaultTpsRate) || DEFAULTS.defaultTpsRate,
            defaultTvqRate: Number(data.defaultTvqRate) || DEFAULTS.defaultTvqRate,
            colorBackground: data.colorBackground || DEFAULTS.colorBackground,
            colorAccent: data.colorAccent || DEFAULTS.colorAccent,
            colorAccentDark: data.colorAccentDark || DEFAULTS.colorAccentDark,
          }))
        }
      } catch (error) {
        console.error('Error checking setup:', error)
      } finally {
        setCheckingSetup(false)
      }
    }
    checkSetup()
  }, [router])

  const updateField = (field: keyof SetupData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const res = await fetch('/api/settings/upload-logo', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'upload")
      }

      updateField('companyLogoUrl', data.url)
      toast.success('Logo uploadé avec succès')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'upload")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeLogo = () => {
    updateField('companyLogoUrl', '')
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setSaving(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          isConfigured: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      toast.success('Configuration terminée !')
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.companyName.trim().length > 0
      case 2:
        return true // Tax info is optional
      case 3:
        return true // Colors have defaults
      default:
        return false
    }
  }

  if (checkingSetup) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <div
        className="border-b py-6"
        style={{ borderColor: 'var(--color-border-light)' }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Configuration initiale
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Configurez votre Studio Manager en quelques étapes
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="py-6" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: isActive || isCompleted
                          ? 'var(--color-bg-dark)'
                          : 'var(--color-bg-tertiary)',
                        color: isActive || isCompleted
                          ? 'var(--color-text-inverse)'
                          : 'var(--color-text-tertiary)',
                      }}
                    >
                      {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                    </div>
                    <span
                      className="ml-3 text-sm font-medium"
                      style={{
                        color: isActive
                          ? 'var(--color-text-primary)'
                          : 'var(--color-text-secondary)',
                      }}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className="w-24 h-0.5 mx-4"
                      style={{
                        backgroundColor: isCompleted
                          ? 'var(--color-bg-dark)'
                          : 'var(--color-border-light)',
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 py-8">
        <div className="max-w-3xl mx-auto px-6">
          <div
            className="rounded-xl p-8"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Step 1: Company Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2
                    className="text-lg font-medium mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Informations de votre entreprise
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Ces informations apparaîtront sur vos devis et factures.
                  </p>
                </div>

                {/* Logo Upload */}
                <div>
                  <label
                    className="block text-sm font-medium mb-3"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Logo
                  </label>
                  <div className="flex items-start gap-6">
                    <div
                      className="w-32 h-32 rounded-lg flex items-center justify-center overflow-hidden"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                    >
                      {formData.companyLogoUrl ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={formData.companyLogoUrl}
                            alt="Logo"
                            fill
                            className="object-contain p-2"
                          />
                        </div>
                      ) : (
                        <span
                          className="text-xs text-center px-2"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          Aucun logo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border-light)',
                        }}
                      >
                        <Upload size={16} />
                        {uploading ? 'Upload en cours...' : 'Choisir un logo'}
                      </button>
                      {formData.companyLogoUrl && (
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
                          style={{ color: 'var(--color-accent-rose)' }}
                        >
                          <X size={16} />
                          Supprimer
                        </button>
                      )}
                      <p
                        className="text-xs"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        JPG, PNG, WebP ou SVG. Max 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Company Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Nom de l'entreprise *
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                      placeholder="Mon Studio"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Abréviation
                    </label>
                    <input
                      type="text"
                      value={formData.companyShortName}
                      onChange={(e) => updateField('companyShortName', e.target.value)}
                      maxLength={4}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                      placeholder="MS"
                    />
                    <p
                      className="text-xs mt-1"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      Affiché dans la sidebar réduite (2-4 caractères)
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Adresse
                  </label>
                  <textarea
                    value={formData.companyAddress}
                    onChange={(e) => updateField('companyAddress', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border-light)',
                    }}
                    placeholder="123 Rue Exemple, Montréal, QC H2X 1Y2"
                  />
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.companyPhone}
                      onChange={(e) => updateField('companyPhone', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                      placeholder="514-555-1234"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Courriel
                    </label>
                    <input
                      type="email"
                      value={formData.companyEmail}
                      onChange={(e) => updateField('companyEmail', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                      placeholder="contact@monstudio.com"
                    />
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Site web
                  </label>
                  <input
                    type="url"
                    value={formData.companyWebsite}
                    onChange={(e) => updateField('companyWebsite', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border-light)',
                    }}
                    placeholder="https://monstudio.com"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Taxes */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2
                    className="text-lg font-medium mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Configuration fiscale
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Configurez vos numéros de taxes et taux par défaut (TPS/TVQ pour le Québec).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Numéro TPS
                    </label>
                    <input
                      type="text"
                      value={formData.tpsNumber}
                      onChange={(e) => updateField('tpsNumber', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                      placeholder="123456789 RT0001"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Numéro TVQ
                    </label>
                    <input
                      type="text"
                      value={formData.tvqNumber}
                      onChange={(e) => updateField('tvqNumber', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                      placeholder="1234567890 TQ0001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Taux TPS par défaut (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={(formData.defaultTpsRate * 100).toFixed(2)}
                      onChange={(e) =>
                        updateField('defaultTpsRate', parseFloat(e.target.value) / 100 || 0)
                      }
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Taux TVQ par défaut (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={(formData.defaultTvqRate * 100).toFixed(3)}
                      onChange={(e) =>
                        updateField('defaultTvqRate', parseFloat(e.target.value) / 100 || 0)
                      }
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                    />
                  </div>
                </div>

                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Les taux par défaut au Québec sont 5% (TPS) et 9.975% (TVQ). Vous pouvez
                    les modifier selon votre situation fiscale.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Colors */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2
                    className="text-lg font-medium mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Personnalisation visuelle
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Choisissez les couleurs de votre marque pour les documents et emails.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Couleur de fond
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.colorBackground}
                        onChange={(e) => updateField('colorBackground', e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                        style={{ backgroundColor: formData.colorBackground }}
                      />
                      <input
                        type="text"
                        value={formData.colorBackground}
                        onChange={(e) => updateField('colorBackground', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border-light)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Couleur d'accent
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.colorAccent}
                        onChange={(e) => updateField('colorAccent', e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                        style={{ backgroundColor: formData.colorAccent }}
                      />
                      <input
                        type="text"
                        value={formData.colorAccent}
                        onChange={(e) => updateField('colorAccent', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border-light)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Accent foncé
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.colorAccentDark}
                        onChange={(e) => updateField('colorAccentDark', e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                        style={{ backgroundColor: formData.colorAccentDark }}
                      />
                      <input
                        type="text"
                        value={formData.colorAccentDark}
                        onChange={(e) => updateField('colorAccentDark', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border-light)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label
                    className="block text-sm font-medium mb-3"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Aperçu
                  </label>
                  <div
                    className="rounded-lg p-6 border"
                    style={{
                      backgroundColor: formData.colorBackground,
                      borderColor: 'var(--color-border-light)',
                    }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: formData.colorAccentDark }}
                      >
                        {formData.companyShortName || formData.companyName?.substring(0, 2).toUpperCase() || 'MS'}
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: '#1a1a1a' }}>
                          {formData.companyName || 'Mon Studio'}
                        </p>
                        <p className="text-sm" style={{ color: '#666' }}>
                          Document de démonstration
                        </p>
                      </div>
                    </div>
                    <div
                      className="h-2 rounded-full"
                      style={{ backgroundColor: formData.colorAccent }}
                    />
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg text-sm text-white"
                        style={{ backgroundColor: formData.colorAccentDark }}
                      >
                        Bouton principal
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg text-sm"
                        style={{
                          backgroundColor: formData.colorAccent,
                          color: formData.colorAccentDark,
                        }}
                      >
                        Bouton secondaire
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 1}
            >
              <ChevronLeft size={18} />
              Précédent
            </Button>

            {currentStep < 3 ? (
              <Button type="button" onClick={handleNext} disabled={!isStepValid()}>
                Suivant
                <ChevronRight size={18} />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleComplete}
                loading={saving}
                disabled={!isStepValid()}
              >
                <Check size={18} />
                Terminer la configuration
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
