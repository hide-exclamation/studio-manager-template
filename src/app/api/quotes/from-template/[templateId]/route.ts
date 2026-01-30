import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// POST /api/quotes/from-template/[templateId] - Crée un devis depuis un template
export async function POST(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params
    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'Le projet est requis' },
        { status: 400 }
      )
    }

    // Vérifier que le projet existe et récupérer le client
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: { code: true },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer le template avec sections et items
    const template = await prisma.quoteTemplate.findUnique({
      where: { id: templateId },
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

    // Générer le numéro de devis
    const clientCode = project.client.code
    const existingQuotes = await prisma.quote.findMany({
      where: {
        quoteNumber: {
          startsWith: `D-${clientCode}-`,
        },
      },
      select: { quoteNumber: true },
    })

    const numbers = existingQuotes.map((q) => {
      const match = q.quoteNumber.match(/D-[A-Z]+-(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    })
    const nextNumber = Math.max(0, ...numbers) + 1
    const quoteNumber = `D-${clientCode}-${String(nextNumber).padStart(3, '0')}`

    // Récupérer les taux de taxe par défaut
    const settings = await prisma.studioSettings.findFirst()
    const tpsRate = settings?.defaultTpsRate ?? 0.05
    const tvqRate = settings?.defaultTvqRate ?? 0.09975

    // Créer le devis avec les sections et items du template
    const quote = await prisma.quote.create({
      data: {
        projectId,
        quoteNumber,
        status: 'DRAFT',
        coverTitle: template.coverTitle,
        coverSubtitle: template.coverSubtitle,
        introduction: template.introduction,
        depositPercent: template.depositPercent,
        paymentTerms: template.paymentTerms,
        lateFeePolicy: template.lateFeePolicy,
        endNotes: template.endNotes ?? undefined,
        tpsRate,
        tvqRate,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        sections: {
          create: template.sections.map((section, sectionIndex) => ({
            sectionNumber: sectionIndex + 1,
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
                isSelected: true,
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

    return NextResponse.json(serializeDecimal(quote), { status: 201 })
  } catch (error) {
    console.error('Error creating quote from template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du devis' },
      { status: 500 }
    )
  }
}
