import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, getQuoteForEmail, getPrimaryContact } from '@/lib/email'
import { renderQuoteSendEmail } from '@/lib/email-templates'
import { EmailType } from '@prisma/client'
import crypto from 'crypto'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get quote with all data
    const quote = await getQuoteForEmail(id)

    if (!quote) {
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    // Ensure quote has a public token
    if (!quote.publicToken) {
      const publicToken = crypto.randomBytes(16).toString('hex')
      await prisma.quote.update({
        where: { id },
        data: { publicToken }
      })
      quote.publicToken = publicToken
    }

    // Get primary contact
    const contact = quote.project.client.contacts[0]
    if (!contact?.email) {
      return NextResponse.json(
        { error: 'Aucun contact avec email trouvé pour ce client' },
        { status: 400 }
      )
    }

    // Render email template
    const emailData = await renderQuoteSendEmail({ quote })

    // Note: PDF is not attached on initial quote send
    // PDF will be sent only after client approval

    // Send email
    const result = await sendEmail(
      {
        to: emailData.to,
        toName: emailData.toName,
        subject: emailData.subject,
        html: emailData.html,
      },
      {
        type: EmailType.QUOTE_SEND,
        quoteId: id,
        clientId: quote.project.clientId
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erreur lors de l\'envoi' },
        { status: 500 }
      )
    }

    // Update quote status to SENT if currently DRAFT
    if (quote.status === 'DRAFT') {
      await prisma.quote.update({
        where: { id },
        data: { status: 'SENT' }
      })
    }

    return NextResponse.json({
      success: true,
      emailLogId: result.emailLogId,
      message: `Email envoyé à ${emailData.to}`
    })
  } catch (error) {
    console.error('Error sending quote email:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    )
  }
}
