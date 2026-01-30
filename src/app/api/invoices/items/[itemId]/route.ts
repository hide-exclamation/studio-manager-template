import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// Fonction utilitaire pour recalculer les totaux d'une facture
async function recalculateInvoiceTotals(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true }
  })

  if (!invoice) return

  const subtotal = invoice.items.reduce((sum, item) => sum + Number(item.total), 0)
  const tpsRate = 0.05
  const tvqRate = 0.09975
  const tpsAmount = subtotal * tpsRate
  const tvqAmount = subtotal * tvqRate
  const total = subtotal + tpsAmount + tvqAmount + Number(invoice.lateFeeAmount)

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, tpsAmount, tvqAmount, total }
  })
}

// PATCH /api/invoices/items/[itemId] - Met a jour un item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params
    const body = await request.json()

    // Verifier que l'item existe
    const existingItem = await prisma.invoiceItem.findUnique({
      where: { id: itemId },
      include: {
        invoice: { select: { id: true, status: true } }
      }
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item non trouvé' },
        { status: 404 }
      )
    }

    // Empecher la modification si la facture est payee ou annulee
    if (existingItem.invoice.status === 'PAID' || existingItem.invoice.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Impossible de modifier une facture payée ou annulée' },
        { status: 400 }
      )
    }

    const { description, quantity, unitPrice, sortOrder } = body

    // Calculer le nouveau total de l'item
    const newQuantity = quantity !== undefined ? quantity : existingItem.quantity
    const newUnitPrice = unitPrice !== undefined ? unitPrice : Number(existingItem.unitPrice)
    const itemTotal = newQuantity * newUnitPrice

    const item = await prisma.invoiceItem.update({
      where: { id: itemId },
      data: {
        ...(description !== undefined && { description }),
        ...(quantity !== undefined && { quantity }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(sortOrder !== undefined && { sortOrder }),
        total: itemTotal,
      }
    })

    // Recalculer les totaux de la facture
    await recalculateInvoiceTotals(existingItem.invoice.id)

    return NextResponse.json(serializeDecimal(item))
  } catch (error) {
    console.error('Error updating invoice item:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'item' },
      { status: 500 }
    )
  }
}

// DELETE /api/invoices/items/[itemId] - Supprime un item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params

    // Verifier que l'item existe
    const existingItem = await prisma.invoiceItem.findUnique({
      where: { id: itemId },
      include: {
        invoice: { select: { id: true, status: true } }
      }
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item non trouvé' },
        { status: 404 }
      )
    }

    // Empecher la suppression si la facture est payee ou annulee
    if (existingItem.invoice.status === 'PAID' || existingItem.invoice.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Impossible de modifier une facture payée ou annulée' },
        { status: 400 }
      )
    }

    const invoiceId = existingItem.invoice.id

    await prisma.invoiceItem.delete({
      where: { id: itemId }
    })

    // Recalculer les totaux de la facture
    await recalculateInvoiceTotals(invoiceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invoice item:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'item' },
      { status: 500 }
    )
  }
}
