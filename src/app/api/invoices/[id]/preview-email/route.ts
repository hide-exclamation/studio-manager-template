import { NextResponse } from 'next/server'
import { getInvoiceForEmail } from '@/lib/email'
import { renderInvoiceSendEmail } from '@/lib/email-templates'
import crypto from 'crypto'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get invoice with all data
    const invoice = await getInvoiceForEmail(id)

    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }

    // Ensure invoice has a public token for the preview
    if (!invoice.publicToken) {
      invoice.publicToken = crypto.randomBytes(16).toString('hex')
    }

    // Get primary contact
    const contact = invoice.project.client.contacts[0]
    if (!contact?.email) {
      return NextResponse.json(
        { error: 'Aucun contact avec email' },
        { status: 400 }
      )
    }

    // Render email template
    const emailData = await renderInvoiceSendEmail({
      invoice: {
        ...invoice,
        invoiceType: invoice.invoiceType as 'DEPOSIT' | 'PARTIAL' | 'FINAL' | 'STANDALONE'
      }
    })

    return NextResponse.json({
      subject: emailData.subject,
      to: emailData.to,
      toName: emailData.toName,
      html: emailData.html,
    })
  } catch (error) {
    console.error('Error previewing invoice email:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la generation du preview' },
      { status: 500 }
    )
  }
}
