import { prisma } from './prisma'

// Types pour les settings
export interface StudioSettings {
  id: string
  companyName: string | null
  companyShortName: string | null
  companyLogoUrl: string | null
  companyAddress: string | null
  companyPhone: string | null
  companyEmail: string | null
  companyWebsite: string | null
  tpsNumber: string | null
  tvqNumber: string | null
  defaultTpsRate: number
  defaultTvqRate: number
  colorBackground: string
  colorAccent: string
  colorAccentDark: string
  senderEmail: string | null
  isConfigured: boolean
}

export interface BrandColors {
  background: string
  accent: string
  accentDark: string
}

// Fallbacks génériques
export const DEFAULTS = {
  companyName: 'Mon Studio',
  companyShortName: 'MS',
  companyEmail: 'contact@example.com',
  companyAddress: '',
  colorBackground: '#F5F5F5',
  colorAccent: '#6366F1',
  colorAccentDark: '#4F46E5',
  defaultTpsRate: 0.05,
  defaultTvqRate: 0.09975,
} as const

/**
 * Récupère les settings du studio depuis la base de données
 * Retourne les valeurs par défaut si aucun enregistrement n'existe
 */
export async function getSettings(): Promise<StudioSettings> {
  const settings = await prisma.studioSettings.findFirst({
    where: { id: 'default' },
  })

  if (!settings) {
    // Retourner les valeurs par défaut si pas de settings
    return {
      id: 'default',
      companyName: DEFAULTS.companyName,
      companyShortName: DEFAULTS.companyShortName,
      companyLogoUrl: null,
      companyAddress: DEFAULTS.companyAddress,
      companyPhone: null,
      companyEmail: DEFAULTS.companyEmail,
      companyWebsite: null,
      tpsNumber: null,
      tvqNumber: null,
      defaultTpsRate: DEFAULTS.defaultTpsRate,
      defaultTvqRate: DEFAULTS.defaultTvqRate,
      colorBackground: DEFAULTS.colorBackground,
      colorAccent: DEFAULTS.colorAccent,
      colorAccentDark: DEFAULTS.colorAccentDark,
      senderEmail: null,
      isConfigured: false,
    }
  }

  return {
    id: settings.id,
    companyName: settings.companyName,
    companyShortName: settings.companyShortName,
    companyLogoUrl: settings.companyLogoUrl,
    companyAddress: settings.companyAddress,
    companyPhone: settings.companyPhone,
    companyEmail: settings.companyEmail,
    companyWebsite: settings.companyWebsite,
    tpsNumber: settings.tpsNumber,
    tvqNumber: settings.tvqNumber,
    defaultTpsRate: Number(settings.defaultTpsRate),
    defaultTvqRate: Number(settings.defaultTvqRate),
    colorBackground: settings.colorBackground,
    colorAccent: settings.colorAccent,
    colorAccentDark: settings.colorAccentDark,
    senderEmail: settings.senderEmail,
    isConfigured: settings.isConfigured,
  }
}

/**
 * Récupère uniquement les couleurs de marque
 */
export async function getBrandColors(): Promise<BrandColors> {
  const settings = await getSettings()
  return {
    background: settings.colorBackground,
    accent: settings.colorAccent,
    accentDark: settings.colorAccentDark,
  }
}

/**
 * Verifie si l'application est configuree
 */
export async function isAppConfigured(): Promise<boolean> {
  const settings = await prisma.studioSettings.findFirst({
    where: { id: 'default' },
    select: { isConfigured: true },
  })
  return settings?.isConfigured ?? false
}

/**
 * Formate un montant en devise CAD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount)
}

/**
 * Formate une date en francais canadien
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/**
 * Formate une date courte (JJ/MM/AAAA)
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Récupère le nom de l'entreprise avec fallback
 */
export async function getCompanyName(): Promise<string> {
  const settings = await getSettings()
  return settings.companyName || DEFAULTS.companyName
}

/**
 * Récupère le nom court de l'entreprise avec fallback
 */
export async function getCompanyShortName(): Promise<string> {
  const settings = await getSettings()
  return settings.companyShortName || settings.companyName?.substring(0, 2).toUpperCase() || DEFAULTS.companyShortName
}

/**
 * Récupère l'email de l'entreprise avec fallback
 */
export async function getCompanyEmail(): Promise<string> {
  const settings = await getSettings()
  return settings.companyEmail || DEFAULTS.companyEmail
}

/**
 * Récupère l'email d'envoi (senderEmail ou companyEmail)
 */
export async function getSenderEmail(): Promise<string> {
  const settings = await getSettings()
  return settings.senderEmail || settings.companyEmail || DEFAULTS.companyEmail
}

/**
 * Récupère les taux de taxes
 */
export async function getTaxRates(): Promise<{ tpsRate: number; tvqRate: number }> {
  const settings = await getSettings()
  return {
    tpsRate: settings.defaultTpsRate,
    tvqRate: settings.defaultTvqRate,
  }
}
