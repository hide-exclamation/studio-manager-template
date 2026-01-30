import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// GET /api/library/items - Liste tous les items de la bibliothèque
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const items = await prisma.itemLibrary.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(serializeDecimal(items))
  } catch (error) {
    console.error('Error fetching library items:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des items' },
      { status: 500 }
    )
  }
}

// POST /api/library/items - Crée un nouvel item
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      category,
      itemTypes,
      description,
      deliverables,
      billingMode,
      defaultQuantity,
      defaultPrice,
      hourlyRate,
      estimatedHours,
      variants,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom est requis' },
        { status: 400 }
      )
    }

    // Calculer le prochain sortOrder
    const lastItem = await prisma.itemLibrary.findFirst({
      orderBy: { sortOrder: 'desc' },
    })
    const sortOrder = (lastItem?.sortOrder ?? -1) + 1

    const item = await prisma.itemLibrary.create({
      data: {
        name,
        category,
        itemTypes: itemTypes || ['SERVICE'],
        description,
        deliverables,
        billingMode: billingMode || 'FIXED',
        defaultQuantity: defaultQuantity || 1,
        defaultPrice: defaultPrice || 0,
        hourlyRate,
        estimatedHours,
        variants,
        sortOrder,
      },
    })

    return NextResponse.json(serializeDecimal(item), { status: 201 })
  } catch (error) {
    console.error('Error creating library item:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'item' },
      { status: 500 }
    )
  }
}
