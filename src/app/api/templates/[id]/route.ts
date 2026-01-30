import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// GET /api/templates/[id] - Récupère un template avec ses sections et items
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const template = await prisma.quoteTemplate.findUnique({
      where: { id },
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

    if (!template) {
      return NextResponse.json(
        { error: 'Template non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(serializeDecimal(template))
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du template' },
      { status: 500 }
    )
  }
}

// PUT /api/templates/[id] - Met à jour un template
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      coverTitle,
      coverSubtitle,
      introduction,
      depositPercent,
      paymentTerms,
      lateFeePolicy,
      endNotes,
      sortOrder,
    } = body

    const template = await prisma.quoteTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(coverTitle !== undefined && { coverTitle }),
        ...(coverSubtitle !== undefined && { coverSubtitle }),
        ...(introduction !== undefined && { introduction }),
        ...(depositPercent !== undefined && { depositPercent }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(lateFeePolicy !== undefined && { lateFeePolicy }),
        ...(endNotes !== undefined && { endNotes }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        sections: {
          include: { items: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json(serializeDecimal(template))
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du template' },
      { status: 500 }
    )
  }
}

// DELETE /api/templates/[id] - Supprime un template
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.quoteTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du template' },
      { status: 500 }
    )
  }
}
