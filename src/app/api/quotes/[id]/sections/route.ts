import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// POST /api/quotes/[id]/sections - Ajoute une section au devis
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params
    const body = await request.json()
    const { title, description } = body

    // Vérifier que le devis existe
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        sections: {
          orderBy: { sortOrder: 'desc' },
          take: 1,
          select: { sortOrder: true, sectionNumber: true }
        }
      }
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    const lastSection = quote.sections[0]
    const sortOrder = (lastSection?.sortOrder || 0) + 1
    const sectionNumber = (lastSection?.sectionNumber || 0) + 1

    const section = await prisma.quoteSection.create({
      data: {
        quoteId,
        sectionNumber,
        title: title || `Section ${sectionNumber}`,
        description,
        sortOrder,
      },
      include: {
        items: true
      }
    })

    return NextResponse.json(serializeDecimal(section), { status: 201 })
  } catch (error) {
    console.error('Error creating section:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la section' },
      { status: 500 }
    )
  }
}

// PATCH /api/quotes/[id]/sections - Réordonne les sections
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params
    const body = await request.json()
    const { sections } = body // [{id, sortOrder}]

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'Liste de sections requise' },
        { status: 400 }
      )
    }

    // Mettre à jour l'ordre de chaque section
    await Promise.all(
      sections.map((s: { id: string; sortOrder: number }) =>
        prisma.quoteSection.update({
          where: { id: s.id },
          data: { sortOrder: s.sortOrder }
        })
      )
    )

    // Retourner le devis mis à jour
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        sections: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    return NextResponse.json(serializeDecimal(quote))
  } catch (error) {
    console.error('Error reordering sections:', error)
    return NextResponse.json(
      { error: 'Erreur lors du réordonnancement' },
      { status: 500 }
    )
  }
}
