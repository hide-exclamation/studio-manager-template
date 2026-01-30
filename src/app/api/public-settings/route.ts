import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULTS } from '@/lib/settings'

// GET /api/public-settings - Récupère les paramètres publics (sans authentification)
// Retourne uniquement les informations nécessaires pour les vues publiques
export async function GET() {
  try {
    const settings = await prisma.studioSettings.findUnique({
      where: { id: 'default' },
      select: {
        companyName: true,
        companyLogoUrl: true,
        colorBackground: true,
        colorAccent: true,
        colorAccentDark: true,
      },
    })

    return NextResponse.json({
      companyName: settings?.companyName || DEFAULTS.companyName,
      companyLogoUrl: settings?.companyLogoUrl || null,
      colorBackground: settings?.colorBackground || DEFAULTS.colorBackground,
      colorAccent: settings?.colorAccent || DEFAULTS.colorAccent,
      colorAccentDark: settings?.colorAccentDark || DEFAULTS.colorAccentDark,
    })
  } catch (error) {
    console.error('Error fetching public settings:', error)
    // Return defaults on error
    return NextResponse.json({
      companyName: DEFAULTS.companyName,
      companyLogoUrl: null,
      colorBackground: DEFAULTS.colorBackground,
      colorAccent: DEFAULTS.colorAccent,
      colorAccentDark: DEFAULTS.colorAccentDark,
    })
  }
}
