import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// GET /api/quotes/public/[id] - Recupere un devis par son token public
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: token } = await params

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
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    // Mettre a jour le statut vers VIEWED si actuellement SENT
    if (quote.status === 'SENT') {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'VIEWED' }
      })

      // Creer une notification QUOTE_VIEWED en temps reel
      await prisma.notification.create({
        data: {
          type: 'QUOTE_VIEWED',
          title: 'Devis consulte',
          message: `Le devis ${quote.quoteNumber} (${quote.project.client.companyName}) a ete consulte par le client`,
          link: `/projects/${quote.projectId}?tab=devis`,
          relatedId: quote.id,
          relatedType: 'quote',
        },
      })
    }

    return NextResponse.json(serializeDecimal(quote))
  } catch (error) {
    console.error('Error fetching public quote:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du devis' },
      { status: 500 }
    )
  }
}
