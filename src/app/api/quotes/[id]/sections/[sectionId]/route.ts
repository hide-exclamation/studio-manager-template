import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// PATCH /api/quotes/[id]/sections/[sectionId] - Met à jour une section
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { sectionId } = await params
    const body = await request.json()
    const { title, description, sortOrder } = body

    const section = await prisma.quoteSection.update({
      where: { id: sectionId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } }
      }
    })

    return NextResponse.json(serializeDecimal(section))
  } catch (error) {
    console.error('Error updating section:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la section' },
      { status: 500 }
    )
  }
}

// DELETE /api/quotes/[id]/sections/[sectionId] - Supprime une section
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { sectionId } = await params

    await prisma.quoteSection.delete({
      where: { id: sectionId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting section:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la section' },
      { status: 500 }
    )
  }
}

// POST /api/quotes/[id]/sections/[sectionId] - Ajoute un item à la section
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { sectionId } = await params
    const body = await request.json()
    const {
      name,
      itemType,
      description,
      deliverables,
      quantity,
      unitPrice,
      variants,
      includeInTotal,
      isSelected,
      collaboratorName,
      collaboratorAmount,
    } = body

    // Obtenir le prochain sortOrder
    const lastItem = await prisma.quoteItem.findFirst({
      where: { sectionId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    })

    const sortOrder = (lastItem?.sortOrder || 0) + 1

    const item = await prisma.quoteItem.create({
      data: {
        sectionId,
        name: name || 'Nouvel item',
        itemType: itemType || 'SERVICE',
        description,
        deliverables,
        quantity: quantity || 1,
        unitPrice: unitPrice || 0,
        variants,
        includeInTotal: includeInTotal !== false,
        isSelected: isSelected !== false,
        collaboratorName,
        collaboratorAmount,
        sortOrder,
      }
    })

    return NextResponse.json(serializeDecimal(item), { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'item' },
      { status: 500 }
    )
  }
}
