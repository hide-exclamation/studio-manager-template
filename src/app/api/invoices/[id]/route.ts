import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'
import { sendEmail, getInvoiceForEmail } from '@/lib/email'
import { renderPaymentReceivedEmail } from '@/lib/email-templates'
import { getTaxRates } from '@/lib/settings'
import { EmailType } from '@prisma/client'

// GET /api/invoices/[id] - Recupere une facture avec tous ses details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await prisma.invoice.findUnique({
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
        quote: {
          select: { id: true, quoteNumber: true, depositPercent: true }
        },
        items: {
          orderBy: { sortOrder: 'asc' }
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(serializeDecimal(invoice))
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la facture' },
      { status: 500 }
    )
  }
}

// PATCH /api/invoices/[id] - Met a jour une facture
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Verifier que la facture existe et peut etre modifiee
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }

    // Empecher modification des factures payees ou annulees (sauf pour certains champs)
    if (existingInvoice.status === 'PAID' || existingInvoice.status === 'CANCELLED') {
      // Seul le statut peut etre change dans certains cas
      if (Object.keys(body).some(k => k !== 'status' && k !== 'notes')) {
        return NextResponse.json(
          { error: 'Impossible de modifier une facture payée ou annulée' },
          { status: 400 }
        )
      }
    }

    const {
      status,
      issueDate,
      dueDate,
      notes,
      paymentDate,
      paymentMethod,
      amountPaid,
      lateFeeApplied,
      lateFeeAmount,
    } = body

    // Calculer les totaux si les items ont change
    let subtotal = body.subtotal
    let tpsAmount = body.tpsAmount
    let tvqAmount = body.tvqAmount
    let total = body.total

    if (subtotal === undefined) {
      // Recalculer a partir des items existants
      subtotal = existingInvoice.items.reduce((sum, item) => {
        return sum + Number(item.total)
      }, 0)

      // Recuperer les taux de taxes depuis les settings
      const { tpsRate, tvqRate } = await getTaxRates()

      tpsAmount = subtotal * tpsRate
      tvqAmount = subtotal * tvqRate
      total = subtotal + tpsAmount + tvqAmount

      // Ajouter les frais de retard si applicable
      if (lateFeeApplied || existingInvoice.lateFeeApplied) {
        const feeAmount = lateFeeAmount !== undefined ? lateFeeAmount : Number(existingInvoice.lateFeeAmount)
        total += feeAmount
      }
    }

    // Si on passe a PAID, definir la date de paiement
    let finalPaymentDate = paymentDate
    if (status === 'PAID' && !paymentDate && !existingInvoice.paymentDate) {
      finalPaymentDate = new Date().toISOString()
    }

    // Si on passe a PAID, definir le montant paye au total si non specifie
    let finalAmountPaid = amountPaid
    if (status === 'PAID' && amountPaid === undefined && Number(existingInvoice.amountPaid) === 0) {
      finalAmountPaid = total
    }

    // Si on passe a CANCELLED, marquer le numero comme reutilisable
    let isNumberReusable = false
    if (status === 'CANCELLED' && existingInvoice.status !== 'CANCELLED') {
      isNumberReusable = true
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(isNumberReusable && { isNumberReusable: true }),
        ...(issueDate !== undefined && { issueDate: issueDate ? new Date(issueDate) : undefined }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : undefined }),
        ...(notes !== undefined && { notes }),
        ...(finalPaymentDate !== undefined && { paymentDate: finalPaymentDate ? new Date(finalPaymentDate) : null }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(finalAmountPaid !== undefined && { amountPaid: finalAmountPaid }),
        ...(lateFeeApplied !== undefined && { lateFeeApplied }),
        ...(lateFeeAmount !== undefined && { lateFeeAmount }),
        ...(subtotal !== undefined && { subtotal }),
        ...(tpsAmount !== undefined && { tpsAmount }),
        ...(tvqAmount !== undefined && { tvqAmount }),
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
        quote: {
          select: { id: true, quoteNumber: true }
        },
        items: {
          orderBy: { sortOrder: 'asc' }
        },
      },
    })

    // Envoyer email de remerciement si passage a PAID
    if (status === 'PAID' && existingInvoice.status !== 'PAID') {
      try {
        const invoiceForEmail = await getInvoiceForEmail(id)
        if (invoiceForEmail) {
          const contact = invoiceForEmail.project.client.contacts[0]
          if (contact?.email) {
            const emailData = await renderPaymentReceivedEmail({ invoice: invoiceForEmail })
            await sendEmail(
              {
                to: emailData.to,
                toName: emailData.toName,
                subject: emailData.subject,
                html: emailData.html,
              },
              {
                type: EmailType.PAYMENT_RECEIVED,
                invoiceId: id,
                clientId: invoiceForEmail.project.clientId,
              }
            )
          }
        }
      } catch (emailError) {
        // Log but don't fail the update if email fails
        console.error('Error sending payment received email:', emailError)
      }
    }

    return NextResponse.json(serializeDecimal(invoice))
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la facture' },
      { status: 500 }
    )
  }
}

// DELETE /api/invoices/[id] - Supprime une facture
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }

    // Empecher la suppression si des paiements ont ete enregistres
    if (Number(invoice.amountPaid) > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer une facture avec des paiements enregistrés' },
        { status: 400 }
      )
    }

    await prisma.invoice.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la facture' },
      { status: 500 }
    )
  }
}
