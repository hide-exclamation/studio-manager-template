import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/invoices/next-number?clientId=xxx - Suggère le prochain numéro de facture
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId requis' },
        { status: 400 }
      )
    }

    // Récupérer le code client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { code: true }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: `F-${client.code}-` }
      },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true }
    })

    let nextNumber = 1
    if (lastInvoice) {
      const match = lastInvoice.invoiceNumber.match(/F-[A-Z]+-(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }

    const nextInvoiceNumber = `F-${client.code}-${String(nextNumber).padStart(3, '0')}`

    return NextResponse.json({ nextNumber: nextInvoiceNumber })
  } catch (error) {
    console.error('Error fetching next invoice number:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du numéro' },
      { status: 500 }
    )
  }
}
