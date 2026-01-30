import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'
import { randomBytes } from 'crypto'

function generatePublicToken(): string {
  return randomBytes(16).toString('hex')
}

// GET /api/quotes/[id] - Récupère un devis avec tous ses détails
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(serializeDecimal(quote))
  } catch (error) {
    console.error('Error fetching quote:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du devis' },
      { status: 500 }
    )
  }
}

// PATCH /api/quotes/[id] - Met à jour un devis
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      projectId,
      status,
      coverTitle,
      coverSubtitle,
      coverImageUrl,
      introduction,
      discounts,
      validUntil,
      validityDays,
      depositPercent,
      paymentTerms,
      lateFeePolicy,
      endNotes,
    } = body

    // Si on change de projet, générer un nouveau numéro de devis
    let newQuoteNumber: string | undefined
    if (projectId) {
      const newProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: { client: { select: { code: true } } }
      })

      if (!newProject) {
        return NextResponse.json(
          { error: 'Projet non trouvé' },
          { status: 404 }
        )
      }

      // Générer un nouveau numéro pour ce client
      const clientCode = newProject.client.code
      const lastQuote = await prisma.quote.findFirst({
        where: {
          quoteNumber: { startsWith: `D-${clientCode}-` }
        },
        orderBy: { quoteNumber: 'desc' },
        select: { quoteNumber: true }
      })

      let nextNumber = 1
      if (lastQuote) {
        const match = lastQuote.quoteNumber.match(/D-[A-Z]+-(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      newQuoteNumber = `D-${clientCode}-${String(nextNumber).padStart(3, '0')}`
    }

    // Recalculer les totaux si nécessaire
    let subtotal = body.subtotal
    let total = body.total

    if (subtotal === undefined || total === undefined) {
      // Calculer à partir des sections/items
      const existingQuote = await prisma.quote.findUnique({
        where: { id },
        include: {
          sections: {
            include: { items: true }
          }
        }
      })

      if (existingQuote) {
        subtotal = existingQuote.sections.reduce((sectionSum, section) => {
          return sectionSum + section.items.reduce((itemSum, item) => {
            if (!item.includeInTotal || !item.isSelected) return itemSum
            return itemSum + Number(item.unitPrice) * item.quantity
          }, 0)
        }, 0)

        // Appliquer les rabais
        const quoteDiscounts = discounts !== undefined ? discounts : (existingQuote.discounts as any[] || [])
        let totalDiscount = 0
        for (const d of quoteDiscounts) {
          if (d.type === 'PERCENTAGE') {
            totalDiscount += subtotal * (d.value / 100)
          } else {
            totalDiscount += d.value
          }
        }

        const afterDiscount = subtotal - totalDiscount
        const tps = afterDiscount * Number(existingQuote.tpsRate)
        const tvq = afterDiscount * Number(existingQuote.tvqRate)
        total = afterDiscount + tps + tvq
      }
    }

    // Générer un token public si on passe à SENT et qu'il n'y en a pas
    let publicToken: string | undefined
    if (status === 'SENT') {
      const existingQuote = await prisma.quote.findUnique({
        where: { id },
        select: { publicToken: true }
      })
      if (!existingQuote?.publicToken) {
        publicToken = generatePublicToken()
      }
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        ...(projectId && { projectId }),
        ...(newQuoteNumber && { quoteNumber: newQuoteNumber }),
        ...(status && { status }),
        ...(publicToken && { publicToken }),
        ...(coverTitle !== undefined && { coverTitle }),
        ...(coverSubtitle !== undefined && { coverSubtitle }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(introduction !== undefined && { introduction }),
        ...(discounts !== undefined && { discounts }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(validityDays !== undefined && { validityDays }),
        ...(depositPercent !== undefined && { depositPercent }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(lateFeePolicy !== undefined && { lateFeePolicy }),
        ...(endNotes !== undefined && { endNotes }),
        ...(subtotal !== undefined && { subtotal }),
        ...(total !== undefined && { total }),
      },
      include: {
        project: {
          include: {
            client: {
              select: { id: true, code: true, companyName: true }
            }
          }
        },
        sections: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' }
        },
      },
    })

    return NextResponse.json(serializeDecimal(quote))
  } catch (error) {
    console.error('Error updating quote:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du devis' },
      { status: 500 }
    )
  }
}

// DELETE /api/quotes/[id] - Supprime un devis
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        invoices: { select: { id: true } }
      }
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    if (quote.invoices.length > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un devis avec des factures associées' },
        { status: 400 }
      )
    }

    await prisma.quote.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quote:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du devis' },
      { status: 500 }
    )
  }
}
