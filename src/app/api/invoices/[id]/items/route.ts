import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// POST /api/invoices/[id]/items - Ajoute un item a la facture
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Verifier que la facture existe
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }

    // Empecher l'ajout d'items sur les factures payees ou annulees
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Impossible de modifier une facture payée ou annulée' },
        { status: 400 }
      )
    }

    // Determiner le sortOrder
    const maxSortOrder = invoice.items.reduce((max, item) =>
      Math.max(max, item.sortOrder), -1
    )

    const { description, quantity = 1, unitPrice = 0 } = body
    const itemTotal = quantity * unitPrice

    const item = await prisma.invoiceItem.create({
      data: {
        invoiceId: id,
        description: description || 'Nouvel item',
        quantity,
        unitPrice,
        total: itemTotal,
        sortOrder: maxSortOrder + 1,
      }
    })

    // Recalculer les totaux de la facture
    const allItems = [...invoice.items, item]
    const subtotal = allItems.reduce((sum, i) => sum + Number(i.total), 0)
    const tpsRate = 0.05
    const tvqRate = 0.09975
    const tpsAmount = subtotal * tpsRate
    const tvqAmount = subtotal * tvqRate
    const total = subtotal + tpsAmount + tvqAmount + Number(invoice.lateFeeAmount)

    await prisma.invoice.update({
      where: { id },
      data: { subtotal, tpsAmount, tvqAmount, total }
    })

    // Retourner la facture mise a jour
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: {
              select: { id: true, code: true, companyName: true }
            }
          }
        },
        quote: {
          select: { id: true, quoteNumber: true }
        },
        items: {
          orderBy: { sortOrder: 'asc' }
        },
      },
    })

    return NextResponse.json(serializeDecimal(updatedInvoice), { status: 201 })
  } catch (error) {
    console.error('Error adding invoice item:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout de l\'item' },
      { status: 500 }
    )
  }
}
