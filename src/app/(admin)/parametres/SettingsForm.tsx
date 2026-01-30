'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, X, Palette } from 'lucide-react'
import Image from 'next/image'
import { Button, useToast, Spinner } from '@/components/ui'
import { DEFAULTS } from '@/lib/settings'

type SettingsData = {
  companyName: string
  companyShortName: string
  companyLogoUrl: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyWebsite: string
  tpsNumber: string
  tvqNumber: string
  defaultTpsRate: number
  defaultTvqRate: number
  colorBackground: string
  colorAccent: string
  colorAccentDark: string
}

export function SettingsForm() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<SettingsData>({
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

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setFormData({
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
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof SettingsData, value: string | number) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      toast.success('Paramètres sauvegardés avec succès')
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Logo Section */}
        <section>
          <h2
            className="text-lg font-medium mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Logo de l'entreprise
          </h2>
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Ce logo apparaîtra sur vos devis et factures PDF.
          </p>

          <div className="flex items-start gap-6">
            {/* Preview */}
            <div
              className="w-40 h-40 rounded-lg flex items-center justify-center overflow-hidden"
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
                  className="text-sm"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Aucun logo
                </span>
              )}
            </div>

            {/* Upload buttons */}
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
                {uploading ? 'Upload en cours...' : 'Changer le logo'}
              </button>
              {formData.companyLogoUrl && (
                <button
                  type="button"
                  onClick={removeLogo}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    color: 'var(--color-accent-rose)',
                  }}
                >
                  <X size={16} />
                  Supprimer
                </button>
              )}
              <p
                className="text-xs mt-1"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                JPG, PNG, WebP ou SVG. Max 2MB.
              </p>
            </div>
          </div>
        </section>

        {/* Company Info Section */}
        <section>
          <h2
            className="text-lg font-medium mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Informations de l'entreprise
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Nom de l'entreprise
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
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
                className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Abréviation
              </label>
              <input
                type="text"
                value={formData.companyShortName}
                onChange={(e) => updateField('companyShortName', e.target.value)}
                maxLength={4}
                placeholder="Ex: MS"
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
                className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Site web
              </label>
              <input
                type="url"
                value={formData.companyWebsite}
                onChange={(e) => updateField('companyWebsite', e.target.value)}
                placeholder="https://"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-light)',
                }}
              />
            </div>

            <div className="col-span-2">
              <label
                className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
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
              />
            </div>

            <div>
              <label
                className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
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
              />
            </div>

            <div>
              <label
                className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
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
              />
            </div>
          </div>
        </section>

        {/* Tax Numbers Section */}
        <section>
          <h2
            className="text-lg font-medium mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Numéros de taxes
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
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
              />
            </div>

            <div>
              <label
                className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
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
              />
            </div>

            <div>
              <label
                className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Taux TPS par défaut (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={(formData.defaultTpsRate * 100).toFixed(2)}
                onChange={(e) => updateField('defaultTpsRate', parseFloat(e.target.value) / 100 || 0)}
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
                className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Taux TVQ par défaut (%)
              </label>
              <input
                type="number"
                step="0.001"
                value={(formData.defaultTvqRate * 100).toFixed(3)}
                onChange={(e) => updateField('defaultTvqRate', parseFloat(e.target.value) / 100 || 0)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-light)',
                }}
              />
            </div>
          </div>
        </section>

        {/* Appearance Section */}
        <section>
          <h2
            className="text-lg font-medium mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <Palette size={20} className="inline mr-2" />
            Apparence
          </h2>
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Personnalisez les couleurs de votre marque pour les documents et emails.
          </p>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label
                className="block text-sm mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Couleur de fond
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.colorBackground}
                  onChange={(e) => updateField('colorBackground', e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
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
                className="block text-sm mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Couleur d'accent
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.colorAccent}
                  onChange={(e) => updateField('colorAccent', e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
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
                className="block text-sm mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Accent foncé
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.colorAccentDark}
                  onChange={(e) => updateField('colorAccentDark', e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
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

          {/* Color Preview */}
          <div className="mt-6">
            <label
              className="block text-sm mb-3"
              style={{ color: 'var(--color-text-secondary)' }}
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
                    Exemple de document
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
        </section>

        {/* Submit Button */}
        <div className="pt-4">
          <Button type="submit" loading={saving}>
            Sauvegarder les paramètres
          </Button>
        </div>
      </form>
    </div>
  )
}
