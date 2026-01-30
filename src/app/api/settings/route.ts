import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/settings - Récupère les paramètres du studio
export async function GET() {
  try {
    let settings = await prisma.studioSettings.findUnique({
      where: { id: 'default' }
    })

    // Créer les paramètres par défaut s'ils n'existent pas
    if (!settings) {
      settings = await prisma.studioSettings.create({
        data: { id: 'default' }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Met a jour les parametres du studio
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const {
      companyName,
      companyShortName,
      companyLogoUrl,
      companyAddress,
      companyPhone,
      companyEmail,
      companyWebsite,
      tpsNumber,
      tvqNumber,
      defaultTpsRate,
      defaultTvqRate,
      colorBackground,
      colorAccent,
      colorAccentDark,
      senderEmail,
      isConfigured,
    } = body

    const settings = await prisma.studioSettings.upsert({
      where: { id: 'default' },
      update: {
        companyName,
        companyShortName,
        companyLogoUrl,
        companyAddress,
        companyPhone,
        companyEmail,
        companyWebsite,
        tpsNumber,
        tvqNumber,
        defaultTpsRate,
        defaultTvqRate,
        colorBackground,
        colorAccent,
        colorAccentDark,
        senderEmail,
        isConfigured,
      },
      create: {
        id: 'default',
        companyName,
        companyShortName,
        companyLogoUrl,
        companyAddress,
        companyPhone,
        companyEmail,
        companyWebsite,
        tpsNumber,
        tvqNumber,
        defaultTpsRate,
        defaultTvqRate,
        colorBackground,
        colorAccent,
        colorAccentDark,
        senderEmail,
        isConfigured,
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise a jour des parametres' },
      { status: 500 }
    )
  }
}
