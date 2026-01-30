import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// GET /api/quotes/[id]/invoices - Récupère toutes les factures liées à un devis
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoices = await prisma.invoice.findMany({
      where: { quoteId: id },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceType: true,
        status: true,
        total: true,
        amountPaid: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(serializeDecimal(invoices))
  } catch (error) {
    console.error('Error fetching quote invoices:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des factures' },
      { status: 500 }
    )
  }
}
