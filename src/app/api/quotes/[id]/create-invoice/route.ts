import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// POST /api/quotes/[id]/create-invoice - Crée une facture à partir d'un devis accepté
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const requestedInvoiceType = body.invoiceType || 'FINAL' // DEPOSIT ou FINAL (sera ajusté en PARTIAL si nécessaire)
    const requestedAmount = body.amount // Montant TTC (sans les dépenses)
    const expenseIds: string[] = body.expenseIds || [] // IDs des dépenses à inclure

    // Récupérer le devis avec ses sections et items
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: { select: { code: true } }
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
        invoices: {
          select: {
            id: true,
            invoiceType: true,
            total: true,
            status: true,
          }
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
        { error: 'Seul un devis accepté peut être converti en facture' },
        { status: 400 }
      )
    }

    // Récupérer les dépenses à inclure (si spécifiées)
    let expensesToInclude: { id: string; description: string; amount: any; vendor: string | null }[] = []
    if (expenseIds.length > 0) {
      expensesToInclude = await prisma.expense.findMany({
        where: {
          id: { in: expenseIds },
          projectId: quote.projectId,
          isBillable: true,
          isBilled: false,
        },
        select: {
          id: true,
          description: true,
          amount: true,
          vendor: true,
        }
      })
    }

    // Calculer le total des dépenses
    const expensesTotal = expensesToInclude.reduce((sum, e) => sum + Number(e.amount), 0)

    // Vérifier si un dépôt existe déjà (une seule facture DEPOSIT par devis)
    const existingDeposit = quote.invoices.find(inv => inv.invoiceType === 'DEPOSIT')
    if (requestedInvoiceType === 'DEPOSIT' && existingDeposit) {
      return NextResponse.json(
        { error: 'Une facture de dépôt existe déjà pour ce devis' },
        { status: 400 }
      )
    }

    // Calculer le total déjà facturé et le solde restant
    const totalInvoiced = quote.invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
    const quoteTotal = Number(quote.total)
    const remainingBalance = quoteTotal - totalInvoiced

    // Taux de taxes
    const tpsRate = Number(quote.tpsRate)
    const tvqRate = Number(quote.tvqRate)
    const taxMultiplier = 1 + tpsRate + tvqRate

    // Calculer le montant de la facture (hors dépenses)
    let baseSubtotal: number
    if (requestedInvoiceType === 'DEPOSIT') {
      // Dépôt = % du total TTC du devis, converti en HT
      const depositPercent = Number(quote.depositPercent)
      const depositTTC = quoteTotal * (depositPercent / 100)
      baseSubtotal = depositTTC / taxMultiplier
    } else {
      // Paiement : montant demandé (TTC) ou solde restant
      if (requestedAmount !== undefined) {
        // Le montant reçu est TTC, on le convertit en HT
        baseSubtotal = requestedAmount / taxMultiplier
      } else {
        // Par défaut, tout le solde restant
        baseSubtotal = remainingBalance / taxMultiplier
      }
    }

    // Ajouter les dépenses au sous-total (les dépenses sont HT)
    const subtotal = baseSubtotal + expensesTotal

    // Calculer les taxes
    const tpsAmount = subtotal * tpsRate
    const tvqAmount = subtotal * tvqRate
    const total = subtotal + tpsAmount + tvqAmount

    // Calculer le solde restant effectif (hors dépenses ajoutées)
    // Les dépenses ne comptent pas dans le solde du devis
    const baseTotal = baseSubtotal + (baseSubtotal * tpsRate) + (baseSubtotal * tvqRate)

    // Déterminer le type de facture final
    // DEPOSIT = dépôt, FINAL = solde le devis, PARTIAL = paiement intermédiaire
    // STANDALONE = dépenses uniquement (quand solde = 0)
    let invoiceType: 'DEPOSIT' | 'PARTIAL' | 'FINAL' | 'STANDALONE'

    // Cas spécial: facture de dépenses uniquement (solde à 0 mais dépenses à facturer)
    const isExpensesOnly = remainingBalance < 0.10 && expensesTotal > 0 && baseSubtotal < 0.01

    if (isExpensesOnly) {
      invoiceType = 'STANDALONE'
    } else if (requestedInvoiceType === 'DEPOSIT') {
      invoiceType = 'DEPOSIT'
    } else {
      // Si le paiement couvre le solde restant (avec marge d'arrondi), c'est FINAL
      const newRemainingBalance = remainingBalance - baseTotal
      invoiceType = newRemainingBalance < 0.10 ? 'FINAL' : 'PARTIAL'
    }

    // Validation: le montant de base ne doit pas dépasser le solde (sauf si dépenses uniquement)
    if (!isExpensesOnly && baseTotal > remainingBalance + 0.10) {
      return NextResponse.json(
        { error: `Le montant dépasse le solde restant (${remainingBalance.toFixed(2)} $)` },
        { status: 400 }
      )
    }

    // Générer le numéro de facture: F-CLIENT-PROJET-NUMERO
    const clientCode = quote.project.client.code
    const projectNumber = String(quote.project.projectNumber).padStart(3, '0')
    const invoicePrefix = `F-${clientCode}-${projectNumber}`

    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: invoicePrefix }
      },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true }
    })

    let nextNumber = 1
    if (lastInvoice) {
      const match = lastInvoice.invoiceNumber.match(/-(\d+)$/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }

    const invoiceNumber = `${invoicePrefix}-${String(nextNumber).padStart(2, '0')}`

    // Calculer la date d'échéance (30 jours par défaut)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    // Créer les items de facture (titres seulement, sans descriptions longues)
    const invoiceItems = quote.sections.flatMap((section, sectionIndex) =>
      section.items
        .filter(item => item.isSelected && item.includeInTotal)
        .map((item, itemIndex) => {
          // Calculer le prix unitaire selon le mode de facturation
          let itemUnitPrice: number
          if (item.billingMode === 'HOURLY' && item.hourlyRate && item.hours) {
            itemUnitPrice = Number(item.hourlyRate) * Number(item.hours) / item.quantity
          } else {
            // Vérifier si une variante est sélectionnée
            const variants = item.variants as Array<{ label: string; price: number }> | null
            if (variants && variants.length > 0 && item.selectedVariant !== null) {
              const variant = variants[item.selectedVariant]
              if (variant) {
                itemUnitPrice = variant.price
              } else {
                itemUnitPrice = Number(item.unitPrice)
              }
            } else {
              itemUnitPrice = Number(item.unitPrice)
            }
          }

          return {
            description: item.name, // Titre seulement, pas la description complète
            quantity: item.quantity,
            unitPrice: itemUnitPrice,
            total: itemUnitPrice * item.quantity,
            sortOrder: sectionIndex * 100 + itemIndex,
          }
        })
    )

    // Créer les items de facture
    let finalItems: Array<{
      description: string
      quantity: number
      unitPrice: number
      total: number
      sortOrder: number
    }> = []

    if (invoiceType === 'DEPOSIT') {
      // Facture de dépôt : un seul item résumé
      const depositPercent = Number(quote.depositPercent)
      finalItems = [{
        description: `Dépôt (${depositPercent}%) — Devis ${quote.quoteNumber}`,
        quantity: 1,
        unitPrice: baseSubtotal,
        total: baseSubtotal,
        sortOrder: 0,
      }]
    } else if (isExpensesOnly) {
      // Facture de dépenses uniquement (pas d'items du devis)
      expensesToInclude.forEach((expense, index) => {
        const expenseDescription = expense.vendor
          ? `${expense.description} (${expense.vendor})`
          : expense.description

        finalItems.push({
          description: expenseDescription,
          quantity: 1,
          unitPrice: Number(expense.amount),
          total: Number(expense.amount),
          sortOrder: index,
        })
      })
    } else {
      // Facture de paiement : liste à puces des items du devis
      const itemTitles = invoiceItems.map(item => `• ${item.description}`).join('\n')
      const description = `Paiement — Devis ${quote.quoteNumber}\n\n${itemTitles}`

      finalItems = [{
        description,
        quantity: 1,
        unitPrice: baseSubtotal,
        total: baseSubtotal,
        sortOrder: 0,
      }]

      // Ajouter les dépenses comme items séparés
      expensesToInclude.forEach((expense, index) => {
        const expenseDescription = expense.vendor
          ? `Dépense: ${expense.description} (${expense.vendor})`
          : `Dépense: ${expense.description}`

        finalItems.push({
          description: expenseDescription,
          quantity: 1,
          unitPrice: Number(expense.amount),
          total: Number(expense.amount),
          sortOrder: index + 1,
        })
      })
    }

    // Créer la facture
    const invoice = await prisma.invoice.create({
      data: {
        projectId: quote.projectId,
        quoteId: quote.id,
        invoiceNumber,
        invoiceType,
        status: 'DRAFT',
        subtotal,
        tpsAmount,
        tvqAmount,
        total,
        amountPaid: 0,
        dueDate,
        items: {
          create: finalItems
        }
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        items: true
      }
    })

    // Marquer les dépenses comme facturées
    if (expensesToInclude.length > 0) {
      await prisma.expense.updateMany({
        where: {
          id: { in: expensesToInclude.map(e => e.id) }
        },
        data: {
          isBilled: true,
          invoiceId: invoice.id,
        }
      })
    }

    return NextResponse.json(serializeDecimal(invoice), { status: 201 })
  } catch (error) {
    console.error('Error creating invoice from quote:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la facture' },
      { status: 500 }
    )
  }
}

// Calcule le sous-total du devis après rabais
function calculateQuoteSubtotalAfterDiscount(quote: any): number {
  const subtotal = Number(quote.subtotal)
  const discounts = (quote.discounts as any[]) || []

  let totalDiscount = 0
  for (const d of discounts) {
    if (d.type === 'PERCENTAGE') {
      totalDiscount += subtotal * (d.value / 100)
    } else {
      totalDiscount += d.value
    }
  }

  return subtotal - totalDiscount
}

// Calcule le sous-total restant à facturer
function calculateRemainingSubtotal(quote: any, totalAlreadyInvoiced: number): number {
  const quoteTotal = Number(quote.total)
  const tpsRate = Number(quote.tpsRate)
  const tvqRate = Number(quote.tvqRate)

  // Le total déjà facturé inclut les taxes
  // On doit calculer le sous-total restant
  const remainingTotal = quoteTotal - totalAlreadyInvoiced

  // Inverser le calcul des taxes: total = subtotal * (1 + tps + tvq)
  const taxMultiplier = 1 + tpsRate + tvqRate
  const remainingSubtotal = remainingTotal / taxMultiplier

  return remainingSubtotal
}
