import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// GET /api/library/sections/[id] - Récupère une section avec ses items
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const section = await prisma.sectionLibrary.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!section) {
      return NextResponse.json(
        { error: 'Section non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(serializeDecimal(section))
  } catch (error) {
    console.error('Error fetching library section:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la section' },
      { status: 500 }
    )
  }
}

// PUT /api/library/sections/[id] - Met à jour une section
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, sortOrder } = body

    // Vérifier l'unicité du nom si modifié
    if (name) {
      const existing = await prisma.sectionLibrary.findFirst({
        where: {
          name,
          id: { not: id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Une section avec ce nom existe déjà' },
          { status: 400 }
        )
      }
    }

    const section = await prisma.sectionLibrary.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json(serializeDecimal(section))
  } catch (error) {
    console.error('Error updating library section:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la section' },
      { status: 500 }
    )
  }
}

// DELETE /api/library/sections/[id] - Supprime une section
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.sectionLibrary.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting library section:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la section' },
      { status: 500 }
    )
  }
}

// POST /api/library/sections/[id] - Ajoute un item à la section
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sectionId } = await params
    const body = await request.json()
    const {
      name,
      itemTypes,
      description,
      deliverables,
      billingMode,
      quantity,
      unitPrice,
      hourlyRate,
      hours,
      variants,
      includeInTotal,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom est requis' },
        { status: 400 }
      )
    }

    // Vérifier que la section existe
    const section = await prisma.sectionLibrary.findUnique({
      where: { id: sectionId },
    })

    if (!section) {
      return NextResponse.json(
        { error: 'Section non trouvée' },
        { status: 404 }
      )
    }

    // Calculer le prochain sortOrder
    const lastItem = await prisma.sectionLibraryItem.findFirst({
      where: { sectionId },
      orderBy: { sortOrder: 'desc' },
    })
    const sortOrder = (lastItem?.sortOrder ?? -1) + 1

    const item = await prisma.sectionLibraryItem.create({
      data: {
        sectionId,
        name,
        itemTypes: itemTypes || ['SERVICE'],
        description,
        deliverables,
        billingMode: billingMode || 'FIXED',
        quantity: quantity || 1,
        unitPrice: unitPrice || 0,
        hourlyRate,
        hours,
        variants,
        includeInTotal: includeInTotal ?? true,
        sortOrder,
      },
    })

    return NextResponse.json(serializeDecimal(item), { status: 201 })
  } catch (error) {
    console.error('Error creating library section item:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'item' },
      { status: 500 }
    )
  }
}
