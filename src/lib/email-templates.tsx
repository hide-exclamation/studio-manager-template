import { render } from '@react-email/components'
import { prisma } from './prisma'
import {
  QuoteSendEmail,
  QuoteApprovedEmail,
  InvoiceSendEmail,
  InvoiceReminderEmail,
  InvoiceOverdueEmail,
  PaymentReceivedEmail,
} from '@/emails'
import { formatCurrency, formatDate, getQuotePublicUrl, getInvoicePublicUrl } from './email'
import { EmailType } from '@prisma/client'
import { DEFAULTS } from './settings'

// Get studio settings for all templates
async function getStudioData() {
  const settings = await prisma.studioSettings.findUnique({
    where: { id: 'default' }
  })
  return {
    studioName: settings?.companyName || DEFAULTS.companyName,
    studioEmail: settings?.companyEmail || undefined,
    studioPhone: settings?.companyPhone || undefined,
    studioWebsite: settings?.companyWebsite || undefined,
    logoUrl: settings?.companyLogoUrl || undefined,
    brandColors: {
      background: settings?.colorBackground || DEFAULTS.colorBackground,
      accent: settings?.colorAccent || DEFAULTS.colorAccent,
      accentDark: settings?.colorAccentDark || DEFAULTS.colorAccentDark,
    },
  }
}

// Get custom email template from database
async function getEmailTemplate(type: EmailType) {
  const template = await prisma.emailTemplate.findUnique({
    where: { type }
  })
  return template
}

// ===== QUOTE EMAILS =====

interface RenderQuoteSendParams {
  quote: {
    quoteNumber: string
    publicToken: string | null
    depositPercent: any // Decimal
    total: any // Decimal
    validUntil: Date | null
    project: {
      name: string
      client: {
        companyName: string
        contacts: Array<{ name: string; email: string | null }>
      }
    }
  }
}

export async function renderQuoteSendEmail({ quote }: RenderQuoteSendParams) {
  const studio = await getStudioData()
  const contact = quote.project.client.contacts[0]
  const template = await getEmailTemplate(EmailType.QUOTE_SEND)
  const customTexts = (template?.customTexts || {}) as Record<string, string>

  if (!quote.publicToken) {
    throw new Error('Quote has no public token')
  }

  const total = Number(quote.total)
  const depositPercent = Number(quote.depositPercent)
  const depositAmount = total * (depositPercent / 100)

  const html = await render(
    <QuoteSendEmail
      {...studio}
      quoteNumber={quote.quoteNumber}
      quoteUrl={getQuotePublicUrl(quote.publicToken)}
      projectName={quote.project.name}
      total={formatCurrency(total)}
      validUntil={quote.validUntil ? formatDate(quote.validUntil) : 'dans 30 jours'}
      depositPercent={depositPercent}
      depositAmount={formatCurrency(depositAmount)}
      clientName={quote.project.client.companyName}
      contactName={contact?.name || 'Client'}
      customTexts={Object.keys(customTexts).length > 0 ? customTexts : undefined}
    />
  )

  // Use custom subject or default
  const subject = template?.subject || `${studio.studioName} vous invite à consulter votre devis`

  return {
    html,
    subject,
    to: contact?.email || '',
    toName: contact?.name,
  }
}

interface RenderQuoteApprovedParams {
  quote: {
    quoteNumber: string
    depositPercent: any
    total: any
    project: {
      name: string
      client: {
        contacts: Array<{ name: string; email: string | null }>
      }
    }
  }
}

export async function renderQuoteApprovedEmail({ quote }: RenderQuoteApprovedParams) {
  const studio = await getStudioData()
  const contact = quote.project.client.contacts[0]
  const template = await getEmailTemplate(EmailType.QUOTE_APPROVED)
  const customTexts = (template?.customTexts || {}) as Record<string, string>

  const total = Number(quote.total)
  const depositPercent = Number(quote.depositPercent)
  const depositAmount = total * (depositPercent / 100)

  const html = await render(
    <QuoteApprovedEmail
      {...studio}
      quoteNumber={quote.quoteNumber}
      projectName={quote.project.name}
      total={formatCurrency(total)}
      depositAmount={formatCurrency(depositAmount)}
      contactName={contact?.name || 'Client'}
      customTexts={Object.keys(customTexts).length > 0 ? customTexts : undefined}
    />
  )

  const subject = template?.subject || 'Merci pour votre confiance!'

  return {
    html,
    subject,
    to: contact?.email || '',
    toName: contact?.name,
  }
}

// ===== INVOICE EMAILS =====

interface RenderInvoiceSendParams {
  invoice: {
    invoiceNumber: string
    publicToken: string | null
    invoiceType: 'DEPOSIT' | 'PARTIAL' | 'FINAL' | 'STANDALONE'
    total: any
    dueDate: Date
    project: {
      name: string
      client: {
        contacts: Array<{ name: string; email: string | null }>
      }
    }
  }
}

export async function renderInvoiceSendEmail({ invoice }: RenderInvoiceSendParams) {
  const studio = await getStudioData()
  const contact = invoice.project.client.contacts[0]
  const template = await getEmailTemplate(EmailType.INVOICE_SEND)
  const customTexts = (template?.customTexts || {}) as Record<string, string>

  if (!invoice.publicToken) {
    throw new Error('Invoice has no public token')
  }

  const typeLabels = {
    DEPOSIT: 'Facture de dépôt',
    PARTIAL: 'Facture partielle',
    FINAL: 'Facture finale',
    STANDALONE: 'Facture',
  }

  const html = await render(
    <InvoiceSendEmail
      {...studio}
      invoiceNumber={invoice.invoiceNumber}
      invoiceUrl={getInvoicePublicUrl(invoice.publicToken)}
      invoiceType={invoice.invoiceType}
      projectName={invoice.project.name}
      total={formatCurrency(Number(invoice.total))}
      dueDate={formatDate(invoice.dueDate)}
      contactName={contact?.name || 'Client'}
      customTexts={Object.keys(customTexts).length > 0 ? customTexts : undefined}
    />
  )

  const subject = template?.subject || `${studio.studioName} vous envoie votre facture`

  return {
    html,
    subject,
    to: contact?.email || '',
    toName: contact?.name,
  }
}

interface RenderInvoiceReminderParams {
  invoice: {
    invoiceNumber: string
    publicToken: string | null
    total: any
    issueDate: Date
    dueDate: Date
    project: {
      name: string
      client: {
        contacts: Array<{ name: string; email: string | null }>
      }
    }
  }
  reminderLevel: 1 | 2
}

export async function renderInvoiceReminderEmail({ invoice, reminderLevel }: RenderInvoiceReminderParams) {
  const studio = await getStudioData()
  const contact = invoice.project.client.contacts[0]
  const emailType = reminderLevel === 1 ? EmailType.INVOICE_REMINDER_1 : EmailType.INVOICE_REMINDER_2
  const template = await getEmailTemplate(emailType)
  const customTexts = (template?.customTexts || {}) as Record<string, string>

  if (!invoice.publicToken) {
    throw new Error('Invoice has no public token')
  }

  // Calculer le nombre de jours depuis l'envoi de la facture
  const daysSinceSent = Math.floor(
    (Date.now() - new Date(invoice.issueDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  const defaultSubjects = {
    1: `Rappel: Facture ${invoice.invoiceNumber}`,
    2: `Dernier rappel: Facture ${invoice.invoiceNumber}`,
  }

  const html = await render(
    <InvoiceReminderEmail
      {...studio}
      invoiceNumber={invoice.invoiceNumber}
      invoiceUrl={getInvoicePublicUrl(invoice.publicToken)}
      projectName={invoice.project.name}
      total={formatCurrency(Number(invoice.total))}
      dueDate={formatDate(invoice.dueDate)}
      daysSinceSent={Math.max(0, daysSinceSent)}
      reminderLevel={reminderLevel}
      contactName={contact?.name || 'Client'}
      customTexts={Object.keys(customTexts).length > 0 ? { [`level${reminderLevel}`]: customTexts } : undefined}
    />
  )

  const subject = template?.subject || defaultSubjects[reminderLevel]

  return {
    html,
    subject,
    to: contact?.email || '',
    toName: contact?.name,
  }
}

interface RenderInvoiceOverdueParams {
  invoice: {
    invoiceNumber: string
    publicToken: string | null
    total: any
    lateFeeAmount: any
    issueDate: Date
    dueDate: Date
    project: {
      name: string
      client: {
        contacts: Array<{ name: string; email: string | null }>
      }
    }
  }
}

export async function renderInvoiceOverdueEmail({ invoice }: RenderInvoiceOverdueParams) {
  const studio = await getStudioData()
  const contact = invoice.project.client.contacts[0]
  const template = await getEmailTemplate(EmailType.INVOICE_OVERDUE)
  const customTexts = (template?.customTexts || {}) as Record<string, string>

  if (!invoice.publicToken) {
    throw new Error('Invoice has no public token')
  }

  // Calculer les jours depuis l'envoi (issueDate), pas depuis l'échéance
  const daysSinceSent = Math.floor(
    (Date.now() - new Date(invoice.issueDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  const originalTotal = Number(invoice.total)
  // Calculer les frais de retard: 2% par mois de retard (après 30 jours)
  const monthsOverdue = Math.max(1, Math.ceil((daysSinceSent - 30) / 30) + 1)
  const lateFeePercent = 0.02 * monthsOverdue
  const lateFee = originalTotal * lateFeePercent
  const newTotal = originalTotal + lateFee

  const html = await render(
    <InvoiceOverdueEmail
      {...studio}
      invoiceNumber={invoice.invoiceNumber}
      invoiceUrl={getInvoicePublicUrl(invoice.publicToken)}
      projectName={invoice.project.name}
      originalTotal={formatCurrency(originalTotal)}
      lateFeeAmount={formatCurrency(lateFee)}
      newTotal={formatCurrency(newTotal)}
      dueDate={formatDate(invoice.dueDate)}
      daysOverdue={daysSinceSent}
      contactName={contact?.name || 'Client'}
      customTexts={Object.keys(customTexts).length > 0 ? customTexts : undefined}
    />
  )

  const subject = template?.subject || `Facture ${invoice.invoiceNumber} en retard - Frais appliqués`

  return {
    html,
    subject,
    to: contact?.email || '',
    toName: contact?.name,
  }
}

interface RenderPaymentReceivedParams {
  invoice: {
    invoiceNumber: string
    total: any
    paymentDate: Date | null
    paymentMethod: string | null
    project: {
      name: string
      client: {
        contacts: Array<{ name: string; email: string | null }>
      }
    }
  }
}

export async function renderPaymentReceivedEmail({ invoice }: RenderPaymentReceivedParams) {
  const studio = await getStudioData()
  const contact = invoice.project.client.contacts[0]
  const template = await getEmailTemplate(EmailType.PAYMENT_RECEIVED)
  const customTexts = (template?.customTexts || {}) as Record<string, string>

  const html = await render(
    <PaymentReceivedEmail
      {...studio}
      invoiceNumber={invoice.invoiceNumber}
      projectName={invoice.project.name}
      amount={formatCurrency(Number(invoice.total))}
      paymentDate={invoice.paymentDate ? formatDate(invoice.paymentDate) : formatDate(new Date())}
      paymentMethod={invoice.paymentMethod || undefined}
      contactName={contact?.name || 'Client'}
      customTexts={Object.keys(customTexts).length > 0 ? customTexts : undefined}
    />
  )

  const subject = template?.subject || 'Merci pour votre paiement!'

  return {
    html,
    subject,
    to: contact?.email || '',
    toName: contact?.name,
  }
}
