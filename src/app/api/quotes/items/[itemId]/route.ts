import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// Helper pour convertir les chaînes vides en null pour les Decimals
const toDecimalOrNull = (value: any) => {
  if (value === undefined) return undefined
  if (value === '' || value === null) return null
  return value
}

// PATCH /api/quotes/items/[itemId] - Met à jour un item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params
    const body = await request.json()
    const {
      name,
      itemType,
      itemTypes,
      description,
      deliverables,
      billingMode,
      quantity,
      unitPrice,
      hourlyRate,
      hours,
      variants,
      selectedVariant,
      includeInTotal,
      isSelected,
      collaboratorType,
      collaboratorName,
      collaboratorAmount,
      sortOrder,
    } = body

    // Convertir les valeurs Decimal vides en null
    const safeUnitPrice = toDecimalOrNull(unitPrice)
    const safeHourlyRate = toDecimalOrNull(hourlyRate)
    const safeHours = toDecimalOrNull(hours)
    const safeCollaboratorAmount = toDecimalOrNull(collaboratorAmount)

    const item = await prisma.quoteItem.update({
      where: { id: itemId },
      data: {
        ...(name !== undefined && { name }),
        ...(itemType !== undefined && { itemType }),
        ...(itemTypes !== undefined && { itemTypes }),
        ...(description !== undefined && { description }),
        ...(deliverables !== undefined && { deliverables }),
        ...(billingMode !== undefined && { billingMode }),
        ...(quantity !== undefined && { quantity }),
        ...(safeUnitPrice !== undefined && { unitPrice: safeUnitPrice }),
        ...(safeHourlyRate !== undefined && { hourlyRate: safeHourlyRate }),
        ...(safeHours !== undefined && { hours: safeHours }),
        ...(variants !== undefined && { variants }),
        ...(selectedVariant !== undefined && { selectedVariant }),
        ...(includeInTotal !== undefined && { includeInTotal }),
        ...(isSelected !== undefined && { isSelected }),
        ...(collaboratorType !== undefined && { collaboratorType }),
        ...(collaboratorName !== undefined && { collaboratorName }),
        ...(safeCollaboratorAmount !== undefined && { collaboratorAmount: safeCollaboratorAmount }),
        ...(sortOrder !== undefined && { sortOrder }),
      }
    })

    return NextResponse.json(serializeDecimal(item))
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'item' },
      { status: 500 }
    )
  }
}

// DELETE /api/quotes/items/[itemId] - Supprime un item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params

    await prisma.quoteItem.delete({
      where: { id: itemId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'item' },
      { status: 500 }
    )
  }
}
