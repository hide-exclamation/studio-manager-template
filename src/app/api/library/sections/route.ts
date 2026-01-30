import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// GET /api/library/sections - Liste toutes les sections de la bibliothèque
export async function GET() {
  try {
    const sections = await prisma.sectionLibrary.findMany({
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(serializeDecimal(sections))
  } catch (error) {
    console.error('Error fetching library sections:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des sections' },
      { status: 500 }
    )
  }
}

// POST /api/library/sections - Crée une nouvelle section
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

    // Vérifier l'unicité du nom
    const existing = await prisma.sectionLibrary.findUnique({
      where: { name },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Une section avec ce nom existe déjà' },
        { status: 400 }
      )
    }

    // Calculer le prochain sortOrder
    const lastSection = await prisma.sectionLibrary.findFirst({
      orderBy: { sortOrder: 'desc' },
    })
    const sortOrder = (lastSection?.sortOrder ?? -1) + 1

    const section = await prisma.sectionLibrary.create({
      data: {
        name,
        description,
        sortOrder,
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(serializeDecimal(section), { status: 201 })
  } catch (error) {
    console.error('Error creating library section:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la section' },
      { status: 500 }
    )
  }
}
