import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('quoteId')
    const invoiceId = searchParams.get('invoiceId')
    const clientId = searchParams.get('clientId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (quoteId) where.quoteId = quoteId
    if (invoiceId) where.invoiceId = invoiceId
    if (clientId) where.clientId = clientId

    const emails = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json(serializeDecimal(emails))
  } catch (error) {
    console.error('Error fetching email logs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des emails' },
      { status: 500 }
    )
  }
}
