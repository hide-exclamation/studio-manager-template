import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, getInvoiceForEmail } from '@/lib/email'
import { renderInvoiceSendEmail } from '@/lib/email-templates'
import { EmailType, InvoiceType } from '@prisma/client'
import crypto from 'crypto'

export async function POST(
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

    // Ensure invoice has a public token
    if (!invoice.publicToken) {
      const publicToken = crypto.randomBytes(16).toString('hex')
      await prisma.invoice.update({
        where: { id },
        data: { publicToken }
      })
      invoice.publicToken = publicToken
    }

    // Get primary contact
    const contact = invoice.project.client.contacts[0]
    if (!contact?.email) {
      return NextResponse.json(
        { error: 'Aucun contact avec email trouvé pour ce client' },
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

    // Generate PDF attachment
    let pdfBuffer: Buffer | undefined
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const pdfResponse = await fetch(`${baseUrl}/api/invoices/${id}/pdf`)
      if (pdfResponse.ok) {
        const arrayBuffer = await pdfResponse.arrayBuffer()
        pdfBuffer = Buffer.from(arrayBuffer)
      }
    } catch (e) {
      console.error('Error generating PDF for email:', e)
      // Continue without attachment
    }

    // Send email
    const result = await sendEmail(
      {
        to: emailData.to,
        toName: emailData.toName,
        subject: emailData.subject,
        html: emailData.html,
        attachments: pdfBuffer ? [
          {
            filename: `${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ] : undefined
      },
      {
        type: EmailType.INVOICE_SEND,
        invoiceId: id,
        clientId: invoice.project.clientId
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erreur lors de l\'envoi' },
        { status: 500 }
      )
    }

    // Update invoice status to SENT if currently DRAFT
    if (invoice.status === 'DRAFT') {
      await prisma.invoice.update({
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
    console.error('Error sending invoice email:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    )
  }
}
