import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// POST /api/templates/from-quote/[quoteId] - Crée un template depuis un devis existant
export async function POST(
  request: Request,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const { quoteId } = await params
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom du template est requis' },
        { status: 400 }
      )
    }

    // Récupérer le devis avec toutes ses sections et items
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        sections: {
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    // Créer le template avec les sections et items
    const template = await prisma.quoteTemplate.create({
      data: {
        name,
        description,
        coverTitle: quote.coverTitle,
        coverSubtitle: quote.coverSubtitle,
        introduction: quote.introduction,
        depositPercent: quote.depositPercent,
        paymentTerms: quote.paymentTerms,
        lateFeePolicy: quote.lateFeePolicy,
        endNotes: quote.endNotes ?? undefined,
        sections: {
          create: quote.sections.map((section) => ({
            title: section.title,
            description: section.description,
            sortOrder: section.sortOrder,
            items: {
              create: section.items.map((item) => ({
                name: item.name,
                itemTypes: item.itemTypes,
                description: item.description,
                deliverables: item.deliverables ?? undefined,
                billingMode: item.billingMode,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                hourlyRate: item.hourlyRate,
                hours: item.hours,
                variants: item.variants ?? undefined,
                includeInTotal: item.includeInTotal,
                sortOrder: item.sortOrder,
              })),
            },
          })),
        },
      },
      include: {
        sections: {
          include: { items: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json(serializeDecimal(template), { status: 201 })
  } catch (error) {
    console.error('Error creating template from quote:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du template' },
      { status: 500 }
    )
  }
}
