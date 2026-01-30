import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getQuoteForEmail } from '@/lib/email'
import { renderQuoteSendEmail } from '@/lib/email-templates'
import crypto from 'crypto'

export async function GET(
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

    // Ensure quote has a public token for the preview
    if (!quote.publicToken) {
      quote.publicToken = crypto.randomBytes(16).toString('hex')
    }

    // Get primary contact
    const contact = quote.project.client.contacts[0]
    if (!contact?.email) {
      return NextResponse.json(
        { error: 'Aucun contact avec email' },
        { status: 400 }
      )
    }

    // Render email template
    const emailData = await renderQuoteSendEmail({ quote })

    return NextResponse.json({
      subject: emailData.subject,
      to: emailData.to,
      toName: emailData.toName,
      html: emailData.html,
    })
  } catch (error) {
    console.error('Error previewing quote email:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la generation du preview' },
      { status: 500 }
    )
  }
}
