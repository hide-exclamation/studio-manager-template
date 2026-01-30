import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PublicQuoteView } from './PublicQuoteView'

type Props = {
  params: Promise<{ id: string }>
}

async function getQuote(token: string) {
  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
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
    return null
  }

  // Mettre à jour le statut vers VIEWED si actuellement SENT
  if (quote.status === 'SENT') {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'VIEWED' }
    })
  }

  // Types pour la sérialisation
  type EndNote = { title: string; content: string }
  type Discount = { type: string; value: number; label: string; reason?: string }
  type PriceVariant = { label: string; price: number }

  // Sérialiser les Decimal et Date pour le composant client
  return {
    ...quote,
    subtotal: quote.subtotal.toString(),
    tpsRate: quote.tpsRate.toString(),
    tvqRate: quote.tvqRate.toString(),
    total: quote.total.toString(),
    depositPercent: quote.depositPercent.toString(),
    validUntil: quote.validUntil?.toISOString() || null,
    createdAt: quote.createdAt.toISOString(),
    endNotes: quote.endNotes as EndNote[] | null,
    discounts: quote.discounts as Discount[] | null,
    sections: quote.sections.map(s => ({
      ...s,
      items: s.items.map(i => ({
        ...i,
        unitPrice: i.unitPrice.toString(),
        hourlyRate: i.hourlyRate?.toString() || null,
        hours: i.hours?.toString() || null,
        collaboratorAmount: i.collaboratorAmount?.toString() || null,
        variants: i.variants as PriceVariant[] | null,
      }))
    })),
  }
}

export default async function PublicQuotePage({ params }: Props) {
  const { id: token } = await params
  const quote = await getQuote(token)

  if (!quote) {
    notFound()
  }

  return <PublicQuoteView quote={quote} />
}

export async function generateMetadata({ params }: Props) {
  const { id: token } = await params

  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: {
      project: {
        include: {
          client: {
            select: { companyName: true }
          }
        }
      }
    }
  })

  if (!quote) {
    return { title: 'Devis non trouvé' }
  }

  return {
    title: `Devis ${quote.quoteNumber} - ${quote.project.name}`,
    description: `Devis pour ${quote.project.client.companyName}`,
  }
}
