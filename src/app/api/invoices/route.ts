import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'
import crypto from 'crypto'

// GET /api/invoices - Liste toutes les factures
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const projectId = searchParams.get('projectId') || ''
    const clientId = searchParams.get('clientId') || ''

    const invoices = await prisma.invoice.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { invoiceNumber: { contains: search, mode: 'insensitive' } },
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
        quote: {
          select: { id: true, quoteNumber: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(serializeDecimal(invoices))
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des factures' },
      { status: 500 }
    )
  }
}

// POST /api/invoices - Cree une nouvelle facture
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, quoteId, invoiceType = 'STANDALONE' } = body

    // Recuperer le projet avec le client
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

    // Generer le numero de facture: F-CLIENT-XXX
    const clientCode = project.client.code

    // D'abord, chercher un numero reutilisable (facture annulee)
    const reusableInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: `F-${clientCode}-` },
        isNumberReusable: true,
        status: 'CANCELLED'
      },
      orderBy: { invoiceNumber: 'asc' },
      select: { id: true, invoiceNumber: true }
    })

    let invoiceNumber: string

    if (reusableInvoice) {
      // Reutiliser le numero et marquer comme non-reutilisable
      invoiceNumber = reusableInvoice.invoiceNumber
      await prisma.invoice.update({
        where: { id: reusableInvoice.id },
        data: { isNumberReusable: false }
      })
    } else {
      // Generer un nouveau numero
      const lastInvoice = await prisma.invoice.findFirst({
        where: {
          invoiceNumber: { startsWith: `F-${clientCode}-` }
        },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true }
      })

      let nextNumber = 1
      if (lastInvoice) {
        const match = lastInvoice.invoiceNumber.match(/F-[A-Z]+-(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      invoiceNumber = `F-${clientCode}-${String(nextNumber).padStart(3, '0')}`
    }

    // Generer un token public pour le lien client
    const publicToken = crypto.randomBytes(16).toString('hex')

    // Date d'echeance par defaut: 30 jours
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    let subtotal = 0
    let tpsAmount = 0
    let tvqAmount = 0
    let total = 0
    let items: { description: string; quantity: number; unitPrice: number; total: number; sortOrder: number }[] = []

    // Si creation depuis un devis
    if (quoteId && (invoiceType === 'DEPOSIT' || invoiceType === 'FINAL')) {
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: {
          invoices: {
            where: { invoiceType: 'DEPOSIT', status: { not: 'CANCELLED' } },
            select: { total: true }
          },
          sections: {
            include: {
              items: {
                where: { isSelected: true },
                orderBy: { sortOrder: 'asc' }
              }
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      })

      if (!quote) {
        return NextResponse.json(
          { error: 'Devis non trouvé' },
          { status: 404 }
        )
      }

      if (quote.status !== 'ACCEPTED') {
        return NextResponse.json(
          { error: 'Le devis doit être accepté pour générer une facture' },
          { status: 400 }
        )
      }

      const quoteTotal = Number(quote.total)
      const tpsRate = Number(quote.tpsRate)
      const tvqRate = Number(quote.tvqRate)
      const taxMultiplier = 1 + tpsRate + tvqRate

      if (invoiceType === 'DEPOSIT') {
        // Verifier qu'il n'y a pas deja une facture de depot
        const existingDeposit = await prisma.invoice.findFirst({
          where: { quoteId, invoiceType: 'DEPOSIT', status: { not: 'CANCELLED' } }
        })

        if (existingDeposit) {
          return NextResponse.json(
            { error: 'Une facture de depot existe deja pour ce devis' },
            { status: 400 }
          )
        }

        const depositPercent = Number(quote.depositPercent)
        total = quoteTotal * (depositPercent / 100)
        subtotal = total / taxMultiplier
        tpsAmount = subtotal * tpsRate
        tvqAmount = subtotal * tvqRate

        items = [{
          description: `Depot (${depositPercent}%) - Devis ${quote.quoteNumber}`,
          quantity: 1,
          unitPrice: subtotal,
          total: subtotal,
          sortOrder: 0,
        }]
      } else if (invoiceType === 'FINAL') {
        // Calculer le montant restant apres depot
        const depositPaid = quote.invoices.reduce((sum, inv) => sum + Number(inv.total), 0)

        // Copier tous les items selectionnes du devis
        let sortOrder = 0
        items = []

        // Si un depot a ete paye, ajouter une ligne de deduction
        if (depositPaid > 0) {
          const depositSubtotal = depositPaid / taxMultiplier
          items.push({
            description: `Depot deja facture - Devis ${quote.quoteNumber}`,
            quantity: 1,
            unitPrice: -depositSubtotal,
            total: -depositSubtotal,
            sortOrder: sortOrder++,
          })
        }

        // Copier les items du devis
        for (const section of quote.sections) {
          for (const item of section.items) {
            const types = item.itemTypes || [item.itemType]
            if (item.includeInTotal && !types.includes('FREE')) {
              let itemTotal: number
              let quantity: number
              let unitPrice: number
              let description: string

              if (item.billingMode === 'HOURLY' && item.hourlyRate && item.hours) {
                // Mode horaire: afficher les heures dans la description
                quantity = 1
                unitPrice = Number(item.hourlyRate) * Number(item.hours)
                itemTotal = unitPrice
                description = `${section.title} - ${item.name} (${item.hours}h)`
              } else {
                // Mode fixe
                quantity = item.quantity
                unitPrice = Number(item.unitPrice)
                itemTotal = unitPrice * quantity
                description = `${section.title} - ${item.name}`
              }

              items.push({
                description,
                quantity,
                unitPrice,
                total: itemTotal,
                sortOrder: sortOrder++,
              })
            }
          }
        }

        // Recalculer les totaux
        subtotal = items.reduce((sum, i) => sum + i.total, 0)
        tpsAmount = subtotal * tpsRate
        tvqAmount = subtotal * tvqRate
        total = subtotal + tpsAmount + tvqAmount

        if (total <= 0) {
          return NextResponse.json(
            { error: 'Le montant total du devis a deja ete facture' },
            { status: 400 }
          )
        }
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        quoteId: quoteId || null,
        invoiceNumber,
        invoiceType: invoiceType as any,
        status: 'DRAFT',
        publicToken,
        issueDate: new Date(),
        dueDate,
        subtotal,
        tpsAmount,
        tvqAmount,
        total,
        items: {
          create: items,
        },
      },
      include: {
        project: {
          include: {
            client: {
              select: { id: true, code: true, companyName: true }
            }
          }
        },
        quote: {
          select: { id: true, quoteNumber: true }
        },
        items: {
          orderBy: { sortOrder: 'asc' }
        },
      },
    })

    return NextResponse.json(serializeDecimal(invoice), { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la creation de la facture' },
      { status: 500 }
    )
  }
}
