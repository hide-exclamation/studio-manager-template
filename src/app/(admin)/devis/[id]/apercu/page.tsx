import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { QuotePreview } from './QuotePreview'

type Props = {
  params: Promise<{ id: string }>
}

export default async function QuotePreviewPage({ params }: Props) {
  const { id } = await params

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          client: {
            include: {
              contacts: {
                where: { isPrimary: true },
                take: 1,
              }
            }
          }
        }
      },
      sections: {
        include: {
          items: {
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: { sortOrder: 'asc' }
      },
    },
  })

  if (!quote) {
    notFound()
  }

  // Sérialiser pour le client
  const serializedQuote = {
    ...quote,
    subtotal: quote.subtotal.toString(),
    discounts: quote.discounts as any,
    tpsRate: quote.tpsRate.toString(),
    tvqRate: quote.tvqRate.toString(),
    total: quote.total.toString(),
    depositPercent: quote.depositPercent.toString(),
    validUntil: quote.validUntil?.toISOString() || null,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    sections: quote.sections.map(s => ({
      ...s,
      items: s.items.map(i => ({
        ...i,
        unitPrice: i.unitPrice.toString(),
        hourlyRate: i.hourlyRate?.toString() || null,
        hours: i.hours?.toString() || null,
        collaboratorAmount: i.collaboratorAmount?.toString() || null,
        itemTypes: i.itemTypes as ('SERVICE' | 'PRODUCT' | 'FREE' | 'A_LA_CARTE')[],
      }))
    })),
  }

  return <QuotePreview quote={serializedQuote} />
}
