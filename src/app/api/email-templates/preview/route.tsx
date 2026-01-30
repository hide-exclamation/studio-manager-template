import { NextResponse } from 'next/server'
import { render } from '@react-email/components'
import {
  QuoteSendEmail,
  QuoteApprovedEmail,
  InvoiceSendEmail,
  InvoiceReminderEmail,
  InvoiceOverdueEmail,
  PaymentReceivedEmail,
} from '@/emails'
import { prisma } from '@/lib/prisma'
import { EmailType } from '@prisma/client'

// Données d'exemple pour les aperçus
const sampleData = {
  studioName: 'Mon Studio',
  studioEmail: 'contact@example.com',
  studioPhone: '514-555-1234',
  studioWebsite: 'https://example.com',
  logoUrl: undefined,
  quoteNumber: 'D-ACME-001',
  invoiceNumber: 'F-ACME-001',
  projectName: 'Refonte de site web',
  clientName: 'Acme Inc.',
  contactName: 'Marie Dupont',
  total: '5 000,00 $',
  depositPercent: 50,
  depositAmount: '2 500,00 $',
  validUntil: '15 février 2025',
  dueDate: '15 janvier 2025',
  daysSinceSent: 25,
  daysOverdue: 35,
  originalTotal: '5 000,00 $',
  lateFeeAmount: '100,00 $',
  newTotal: '5 100,00 $',
  paymentDate: '10 janvier 2025',
  paymentMethod: 'Virement bancaire',
  quoteUrl: '#',
  invoiceUrl: '#',
}

// POST /api/email-templates/preview - Génère un aperçu du courriel
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, subject, customTexts } = body

    if (!type || !Object.values(EmailType).includes(type)) {
      return NextResponse.json(
        { error: 'Type de courriel invalide' },
        { status: 400 }
      )
    }

    // Récupérer les paramètres du studio
    const settings = await prisma.studioSettings.findUnique({
      where: { id: 'default' }
    })

    const studioData = {
      studioName: settings?.companyName || sampleData.studioName,
      studioEmail: settings?.companyEmail || sampleData.studioEmail,
      studioPhone: settings?.companyPhone || sampleData.studioPhone,
      studioWebsite: settings?.companyWebsite || sampleData.studioWebsite,
      logoUrl: settings?.companyLogoUrl || undefined,
    }

    let html: string
    let previewSubject: string

    switch (type) {
      case 'QUOTE_SEND':
        html = await render(
          <QuoteSendEmail
            {...studioData}
            quoteNumber={sampleData.quoteNumber}
            quoteUrl={sampleData.quoteUrl}
            projectName={sampleData.projectName}
            total={sampleData.total}
            validUntil={sampleData.validUntil}
            depositPercent={sampleData.depositPercent}
            depositAmount={sampleData.depositAmount}
            clientName={sampleData.clientName}
            contactName={sampleData.contactName}
            customTexts={customTexts}
          />
        )
        previewSubject = subject || `${studioData.studioName} vous invite à consulter votre devis`
        break

      case 'QUOTE_APPROVED':
        html = await render(
          <QuoteApprovedEmail
            {...studioData}
            quoteNumber={sampleData.quoteNumber}
            projectName={sampleData.projectName}
            total={sampleData.total}
            depositAmount={sampleData.depositAmount}
            contactName={sampleData.contactName}
            customTexts={customTexts}
          />
        )
        previewSubject = subject || 'Merci pour votre confiance!'
        break

      case 'INVOICE_SEND':
        html = await render(
          <InvoiceSendEmail
            {...studioData}
            invoiceNumber={sampleData.invoiceNumber}
            invoiceUrl={sampleData.invoiceUrl}
            invoiceType="STANDALONE"
            projectName={sampleData.projectName}
            total={sampleData.total}
            dueDate={sampleData.dueDate}
            contactName={sampleData.contactName}
            customTexts={customTexts}
          />
        )
        previewSubject = subject || `${studioData.studioName} vous envoie votre facture`
        break

      case 'INVOICE_REMINDER_1':
        html = await render(
          <InvoiceReminderEmail
            {...studioData}
            invoiceNumber={sampleData.invoiceNumber}
            invoiceUrl={sampleData.invoiceUrl}
            projectName={sampleData.projectName}
            total={sampleData.total}
            dueDate={sampleData.dueDate}
            daysSinceSent={21}
            reminderLevel={1}
            contactName={sampleData.contactName}
            customTexts={Object.keys(customTexts || {}).length > 0 ? { level1: { intro: customTexts?.intro, outro: customTexts?.outro } } : undefined}
          />
        )
        previewSubject = subject || `Rappel: Facture ${sampleData.invoiceNumber}`
        break

      case 'INVOICE_REMINDER_2':
        html = await render(
          <InvoiceReminderEmail
            {...studioData}
            invoiceNumber={sampleData.invoiceNumber}
            invoiceUrl={sampleData.invoiceUrl}
            projectName={sampleData.projectName}
            total={sampleData.total}
            dueDate={sampleData.dueDate}
            daysSinceSent={28}
            reminderLevel={2}
            contactName={sampleData.contactName}
            customTexts={Object.keys(customTexts || {}).length > 0 ? { level2: { intro: customTexts?.intro, outro: customTexts?.outro } } : undefined}
          />
        )
        previewSubject = subject || `Dernier rappel: Facture ${sampleData.invoiceNumber}`
        break

      case 'INVOICE_OVERDUE':
        html = await render(
          <InvoiceOverdueEmail
            {...studioData}
            invoiceNumber={sampleData.invoiceNumber}
            invoiceUrl={sampleData.invoiceUrl}
            projectName={sampleData.projectName}
            originalTotal={sampleData.originalTotal}
            lateFeeAmount={sampleData.lateFeeAmount}
            newTotal={sampleData.newTotal}
            dueDate={sampleData.dueDate}
            daysOverdue={sampleData.daysOverdue}
            contactName={sampleData.contactName}
            customTexts={customTexts}
          />
        )
        previewSubject = subject || `Facture ${sampleData.invoiceNumber} en retard - Frais appliqués`
        break

      case 'PAYMENT_RECEIVED':
        html = await render(
          <PaymentReceivedEmail
            {...studioData}
            invoiceNumber={sampleData.invoiceNumber}
            projectName={sampleData.projectName}
            amount={sampleData.total}
            paymentDate={sampleData.paymentDate}
            paymentMethod={sampleData.paymentMethod}
            contactName={sampleData.contactName}
            customTexts={customTexts}
          />
        )
        previewSubject = subject || 'Merci pour votre paiement!'
        break

      default:
        return NextResponse.json(
          { error: 'Type de courriel non supporté' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      html,
      subject: previewSubject,
    })
  } catch (error) {
    console.error('Error generating email preview:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération de l\'aperçu' },
      { status: 500 }
    )
  }
}
