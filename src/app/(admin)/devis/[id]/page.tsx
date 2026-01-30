import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { QuoteEditor } from './QuoteEditor'

type Props = {
  params: Promise<{ id: string }>
}

export default async function QuotePage({ params }: Props) {
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

  // Types pour la sérialisation
  type EndNote = { title: string; content: string }
  type PriceVariant = { label: string; price: number }
  type ItemType = 'SERVICE' | 'PRODUCT' | 'FREE' | 'A_LA_CARTE'

  // Sérialiser les données pour le composant client
  const serializedQuote = {
    ...quote,
    subtotal: quote.subtotal.toString(),
    discounts: quote.discounts as any,
    endNotes: quote.endNotes as EndNote[] | null,
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
        itemTypes: i.itemTypes as ItemType[],
        variants: i.variants as PriceVariant[] | null,
        deliverables: i.deliverables as any,
      }))
    })),
  }

  return <QuoteEditor initialQuote={serializedQuote} />
}
