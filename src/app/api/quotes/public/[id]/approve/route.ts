import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, getQuoteForEmail } from '@/lib/email'
import { renderQuoteApprovedEmail } from '@/lib/email-templates'
import { EmailType } from '@prisma/client'

// POST /api/quotes/public/[id]/approve - Approuve un devis via son token public
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: token } = await params
    const body = await request.json()
    const { selections, variantSelections } = body // Items à la carte et variantes sélectionnés par le client

    // Trouver le devis par son token public
    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
      include: {
        project: {
          include: { client: true }
        },
        sections: {
          include: { items: true }
        }
      }
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le devis peut être approuvé (SENT ou VIEWED)
    if (!['SENT', 'VIEWED'].includes(quote.status)) {
      return NextResponse.json(
        { error: 'Ce devis ne peut pas être approuvé dans son état actuel' },
        { status: 400 }
      )
    }

    // Mettre à jour les sélections des items à la carte si fournies
    if (selections && typeof selections === 'object') {
      for (const [itemId, isSelected] of Object.entries(selections)) {
        await prisma.quoteItem.update({
          where: { id: itemId },
          data: { isSelected: isSelected as boolean }
        })
      }
    }

    // Mettre à jour les variantes sélectionnées par le client
    if (variantSelections && typeof variantSelections === 'object') {
      for (const [itemId, variantIndex] of Object.entries(variantSelections)) {
        await prisma.quoteItem.update({
          where: { id: itemId },
          data: { selectedVariant: variantIndex as number }
        })
      }
    }

    // Recalculer le total avec les nouvelles sélections
    const updatedQuote = await prisma.quote.findUnique({
      where: { id: quote.id },
      include: {
        sections: {
          include: { items: true }
        }
      }
    })

    if (updatedQuote) {
      let subtotal = 0
      updatedQuote.sections.forEach(section => {
        section.items.forEach(item => {
          const types = (item.itemTypes as string[]) || [item.itemType]
          if (!item.includeInTotal || types.includes('FREE')) return
          if (types.includes('A_LA_CARTE') && !item.isSelected) return
          if (item.billingMode === 'HOURLY' && item.hourlyRate && item.hours) {
            subtotal += Number(item.hourlyRate) * Number(item.hours)
          } else {
            // Use variant price if selected
            const variants = item.variants as Array<{ label: string; price: number }> | null
            if (variants && variants.length > 0 && item.selectedVariant !== null) {
              const variant = variants[item.selectedVariant]
              if (variant) {
                subtotal += variant.price * item.quantity
              } else {
                subtotal += Number(item.unitPrice) * item.quantity
              }
            } else {
              subtotal += Number(item.unitPrice) * item.quantity
            }
          }
        })
      })

      // Appliquer les rabais
      const discounts = (updatedQuote.discounts as any[]) || []
      let totalDiscount = 0
      for (const d of discounts) {
        if (d.type === 'PERCENTAGE') {
          totalDiscount += subtotal * (d.value / 100)
        } else {
          totalDiscount += d.value
        }
      }

      const afterDiscount = subtotal - totalDiscount
      const tps = afterDiscount * Number(updatedQuote.tpsRate)
      const tvq = afterDiscount * Number(updatedQuote.tvqRate)
      const total = afterDiscount + tps + tvq

      // Mettre à jour le devis avec le nouveau statut et totaux
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: 'ACCEPTED',
          subtotal,
          total,
        }
      })

      // Creer une notification QUOTE_ACCEPTED
      await prisma.notification.create({
        data: {
          type: 'QUOTE_ACCEPTED',
          title: 'Devis accepte',
          message: `Le devis ${quote.quoteNumber} (${quote.project.client.companyName}) a ete accepte par le client`,
          link: `/projects/${quote.projectId}?tab=devis`,
          relatedId: quote.id,
          relatedType: 'quote',
        },
      })

      // Envoyer email de confirmation au client
      try {
        const quoteForEmail = await getQuoteForEmail(quote.id)
        if (quoteForEmail) {
          const contact = quoteForEmail.project.client.contacts[0]
          if (contact?.email) {
            const emailData = await renderQuoteApprovedEmail({ quote: quoteForEmail })
            await sendEmail(
              {
                to: emailData.to,
                toName: emailData.toName,
                subject: emailData.subject,
                html: emailData.html,
              },
              {
                type: EmailType.QUOTE_APPROVED,
                quoteId: quote.id,
                clientId: quote.project.clientId,
              }
            )
          }
        }
      } catch (emailError) {
        // Log but don't fail the approval if email fails
        console.error('Error sending approval confirmation email:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error approving quote:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'approbation du devis' },
      { status: 500 }
    )
  }
}
