import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'
import { Decimal } from '@prisma/client/runtime/library'
import { Prisma } from '@prisma/client'

// Helper pour convertir les Decimal en nombre ou null
const toNumber = (val: Decimal | null | undefined): number | null => {
  if (val === null || val === undefined) return null
  return Number(val)
}

// POST /api/quotes/[id]/duplicate - Duplique un devis
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Récupérer le devis original avec toutes ses relations
    const original = await prisma.quote.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            items: true
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!original) {
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer le code client pour générer un nouveau numéro
    const project = await prisma.project.findUnique({
      where: { id: original.projectId },
      include: { client: { select: { code: true } } }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      )
    }

    // Générer un nouveau numéro de devis: D-CLIENT-XXX
    const clientCode = project.client.code
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

    const newQuoteNumber = `D-${clientCode}-${String(nextNumber).padStart(3, '0')}`

    // Créer le nouveau devis
    const newQuote = await prisma.quote.create({
      data: {
        projectId: original.projectId,
        quoteNumber: newQuoteNumber,
        status: 'DRAFT',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
        introduction: original.introduction,
        depositPercent: toNumber(original.depositPercent) ?? 50,
        tpsRate: toNumber(original.tpsRate) ?? 0.05,
        tvqRate: toNumber(original.tvqRate) ?? 0.09975,
        discounts: original.discounts as Prisma.InputJsonValue ?? Prisma.JsonNull,
        sections: {
          create: original.sections.map((section, index) => ({
            sectionNumber: index + 1,
            title: section.title,
            description: section.description,
            sortOrder: section.sortOrder,
            items: {
              create: section.items.map(item => ({
                name: item.name,
                itemType: item.itemType,
                itemTypes: item.itemTypes,
                description: item.description,
                deliverables: item.deliverables as Prisma.InputJsonValue ?? Prisma.JsonNull,
                billingMode: item.billingMode,
                quantity: item.quantity,
                unitPrice: toNumber(item.unitPrice) ?? 0,
                hourlyRate: toNumber(item.hourlyRate) ?? undefined,
                hours: toNumber(item.hours) ?? undefined,
                variants: item.variants as Prisma.InputJsonValue ?? Prisma.JsonNull,
                selectedVariant: item.selectedVariant,
                includeInTotal: item.includeInTotal,
                isSelected: item.isSelected,
                collaboratorType: item.collaboratorType,
                collaboratorName: item.collaboratorName,
                collaboratorAmount: toNumber(item.collaboratorAmount) ?? undefined,
                sortOrder: item.sortOrder,
              }))
            }
          }))
        }
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        sections: {
          include: { items: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    return NextResponse.json(serializeDecimal(newQuote), { status: 201 })
  } catch (error) {
    console.error('Error duplicating quote:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la duplication du devis' },
      { status: 500 }
    )
  }
}
