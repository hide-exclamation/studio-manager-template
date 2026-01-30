import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// GET /api/library/items/[id] - Récupère un item
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const item = await prisma.itemLibrary.findUnique({
      where: { id },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(serializeDecimal(item))
  } catch (error) {
    console.error('Error fetching library item:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'item' },
      { status: 500 }
    )
  }
}

// PUT /api/library/items/[id] - Met à jour un item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      sortOrder,
    } = body

    const item = await prisma.itemLibrary.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(itemTypes !== undefined && { itemTypes }),
        ...(description !== undefined && { description }),
        ...(deliverables !== undefined && { deliverables }),
        ...(billingMode !== undefined && { billingMode }),
        ...(defaultQuantity !== undefined && { defaultQuantity }),
        ...(defaultPrice !== undefined && { defaultPrice }),
        ...(hourlyRate !== undefined && { hourlyRate }),
        ...(estimatedHours !== undefined && { estimatedHours }),
        ...(variants !== undefined && { variants }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json(serializeDecimal(item))
  } catch (error) {
    console.error('Error updating library item:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'item' },
      { status: 500 }
    )
  }
}

// DELETE /api/library/items/[id] - Supprime un item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.itemLibrary.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting library item:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'item' },
      { status: 500 }
    )
  }
}
