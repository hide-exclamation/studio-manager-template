import { Resend } from 'resend'
import { prisma } from './prisma'
import { EmailType, EmailStatus } from '@prisma/client'

// Singleton Resend client
const globalForResend = globalThis as unknown as {
  resend: Resend | undefined
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 're_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    return null
  }
  if (!globalForResend.resend) {
    globalForResend.resend = new Resend(apiKey)
  }
  return globalForResend.resend
}

// Types
interface SendEmailOptions {
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
  replyTo?: string
}

interface EmailResult {
  success: boolean
  emailLogId?: string
  resendId?: string
  error?: string
}

import { DEFAULTS } from './settings'

// Get studio settings for sender info
async function getStudioSettings() {
  const settings = await prisma.studioSettings.findUnique({
    where: { id: 'default' }
  })
  return {
    name: settings?.companyName || DEFAULTS.companyName,
    email: settings?.senderEmail || settings?.companyEmail || DEFAULTS.companyEmail,
    phone: settings?.companyPhone,
    address: settings?.companyAddress,
    website: settings?.companyWebsite
  }
}

// Core email sending function
export async function sendEmail(
  options: SendEmailOptions,
  metadata: {
    type: EmailType
    quoteId?: string
    invoiceId?: string
    clientId?: string
  }
): Promise<EmailResult> {
  const resend = getResendClient()
  const studio = await getStudioSettings()

  // Create email log entry
  const emailLog = await prisma.emailLog.create({
    data: {
      type: metadata.type,
      status: EmailStatus.PENDING,
      recipient: options.to,
      recipientName: options.toName,
      subject: options.subject,
      quoteId: metadata.quoteId,
      invoiceId: metadata.invoiceId,
      clientId: metadata.clientId,
    }
  })

  if (!resend) {
    // Development mode - just log
    console.log('[EMAIL DEV MODE] Would send email:', {
      to: options.to,
      subject: options.subject,
      type: metadata.type
    })

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
        resendId: 'dev-mode'
      }
    })

    return {
      success: true,
      emailLogId: emailLog.id,
      resendId: 'dev-mode'
    }
  }

  try {
    const result = await resend.emails.send({
      from: `${studio.name} <${studio.email}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || studio.email,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
      }))
    })

    if (result.error) {
      throw new Error(result.error.message)
    }

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
        resendId: result.data?.id
      }
    })

    return {
      success: true,
      emailLogId: emailLog.id,
      resendId: result.data?.id
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: EmailStatus.FAILED,
        errorMessage
      }
    })

    return {
      success: false,
      emailLogId: emailLog.id,
      error: errorMessage
    }
  }
}

// Helper: Get primary contact for a client
export async function getPrimaryContact(clientId: string) {
  const contact = await prisma.contact.findFirst({
    where: {
      clientId,
      isPrimary: true
    }
  })

  if (!contact) {
    // Fallback to any contact with email
    return await prisma.contact.findFirst({
      where: {
        clientId,
        email: { not: null }
      }
    })
  }

  return contact
}

// Helper: Check if client has specific email type enabled
export async function canSendEmailType(clientId: string, emailType: EmailType): Promise<boolean> {
  const prefs = await prisma.clientEmailPreferences.findUnique({
    where: { clientId }
  })

  // If no preferences exist, all emails are enabled by default
  if (!prefs) {
    return true
  }

  // Map EmailType to preference field
  const typeToField: Record<EmailType, keyof typeof prefs> = {
    QUOTE_SEND: 'quoteSend',
    QUOTE_APPROVED: 'quoteApproved',
    INVOICE_SEND: 'invoiceSend',
    INVOICE_REMINDER_1: 'invoiceReminder1',
    INVOICE_REMINDER_2: 'invoiceReminder2',
    INVOICE_OVERDUE: 'invoiceOverdue',
    PAYMENT_RECEIVED: 'paymentReceived',
  }

  const field = typeToField[emailType]
  return field ? (prefs[field] as boolean) : true
}

// Legacy helper for backwards compatibility
export async function canSendAutoReminder(clientId: string): Promise<boolean> {
  const prefs = await prisma.clientEmailPreferences.findUnique({
    where: { clientId }
  })

  // If no preferences, all enabled by default
  if (!prefs) {
    return true
  }

  // Check if any reminder emails are enabled
  return prefs.invoiceReminder1 || prefs.invoiceReminder2 || prefs.invoiceOverdue
}

// Helper: Get quote with all needed data for email
export async function getQuoteForEmail(quoteId: string) {
  return await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      project: {
        include: {
          client: {
            include: {
              contacts: {
                where: { isPrimary: true },
                take: 1
              }
            }
          }
        }
      },
      sections: {
        include: {
          items: { orderBy: { sortOrder: 'asc' } }
        },
        orderBy: { sortOrder: 'asc' }
      }
    }
  })
}

// Helper: Get invoice with all needed data for email
export async function getInvoiceForEmail(invoiceId: string) {
  return await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      project: {
        include: {
          client: {
            include: {
              contacts: {
                where: { isPrimary: true },
                take: 1
              }
            }
          }
        }
      },
      quote: { select: { quoteNumber: true } },
      items: { orderBy: { sortOrder: 'asc' } }
    }
  })
}

// Format currency for emails
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount)
}

// Format date for emails
export function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-CA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Get base URL for public links
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

// Generate public link for quote
export function getQuotePublicUrl(publicToken: string): string {
  return `${getBaseUrl()}/devis/public/${publicToken}`
}

// Generate public link for invoice
export function getInvoicePublicUrl(publicToken: string): string {
  return `${getBaseUrl()}/factures/public/${publicToken}`
}
