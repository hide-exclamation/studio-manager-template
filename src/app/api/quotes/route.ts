import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'
import { getTaxRates } from '@/lib/settings'
import crypto from 'crypto'

// GET /api/quotes - Liste tous les devis
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const projectId = searchParams.get('projectId') || ''
    const clientId = searchParams.get('clientId') || ''

    const quotes = await prisma.quote.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { quoteNumber: { contains: search, mode: 'insensitive' } },
              { project: { name: { contains: search, mode: 'insensitive' } } },
              { project: { client: { companyName: { contains: search, mode: 'insensitive' } } } },
            ]
          } : {},
          status ? { status: status as any } : {},
          projectId ? { projectId } : {},
          clientId ? { project: { clientId } } : {},
        ]
      },
      include: {
        project: {
          include: {
            client: {
              select: { id: true, code: true, companyName: true }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(serializeDecimal(quotes))
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des devis' },
      { status: 500 }
    )
  }
}

// POST /api/quotes - Crée un nouveau devis
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId } = body

    // Récupérer le projet avec le client
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { id: true, code: true } }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      )
    }

    // Générer le numéro de devis: D-CLIENT-XXX
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

    const quoteNumber = `D-${clientCode}-${String(nextNumber).padStart(3, '0')}`

    // Generer un token public pour le lien client
    const publicToken = crypto.randomBytes(16).toString('hex')

    // Calculer la date de validite (30 jours par defaut)
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 30)

    // Recuperer les taux de taxes depuis les settings
    const { tpsRate, tvqRate } = await getTaxRates()

    const quote = await prisma.quote.create({
      data: {
        projectId,
        quoteNumber,
        status: 'DRAFT',
        publicToken,
        validUntil,
        validityDays: 30,
        depositPercent: 50,
        tpsRate,
        tvqRate,
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
          include: { items: true },
          orderBy: { sortOrder: 'asc' }
        },
      },
    })

    return NextResponse.json(serializeDecimal(quote), { status: 201 })
  } catch (error) {
    console.error('Error creating quote:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du devis' },
      { status: 500 }
    )
  }
}
