import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EmailType } from '@prisma/client'

// GET /api/email-templates - Récupère tous les modèles de courriel
export async function GET() {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { type: 'asc' },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching email templates:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des modèles' },
      { status: 500 }
    )
  }
}

// POST /api/email-templates - Crée ou met à jour un modèle de courriel
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, subject, customTexts } = body

    if (!type || !Object.values(EmailType).includes(type)) {
      return NextResponse.json(
        { error: 'Type de courriel invalide' },
        { status: 400 }
      )
    }

    const template = await prisma.emailTemplate.upsert({
      where: { type },
      create: {
        type,
        subject: subject || '',
        customTexts: customTexts || {},
      },
      update: {
        subject: subject || '',
        customTexts: customTexts || {},
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error saving email template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde du modèle' },
      { status: 500 }
    )
  }
}
