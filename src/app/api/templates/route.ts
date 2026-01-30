import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// GET /api/templates - Liste tous les templates
export async function GET() {
  try {
    const templates = await prisma.quoteTemplate.findMany({
      include: {
        sections: {
          include: {
            items: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(serializeDecimal(templates))
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des templates' },
      { status: 500 }
    )
  }
}

// POST /api/templates - Crée un nouveau template
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom est requis' },
        { status: 400 }
      )
    }

    const template = await prisma.quoteTemplate.create({
      data: {
        name,
        description,
      },
      include: {
        sections: {
          include: { items: true },
        },
      },
    })

    return NextResponse.json(serializeDecimal(template), { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du template' },
      { status: 500 }
    )
  }
}
