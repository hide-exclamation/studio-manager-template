import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface BrandColors {
  background: string
  accent: string
  accentDark: string
}

interface InvoiceSendEmailProps {
  // Studio
  studioName: string
  studioEmail?: string
  studioPhone?: string
  studioWebsite?: string
  logoUrl?: string
  brandColors?: BrandColors
  // Invoice
  invoiceNumber: string
  invoiceUrl: string
  invoiceType: 'DEPOSIT' | 'PARTIAL' | 'FINAL' | 'STANDALONE'
  projectName: string
  total: string
  dueDate: string
  // Client
  contactName: string
  // Customizable texts
  customTexts?: {
    greeting?: string
    intro?: string
    callToAction?: string
    note?: string
    signature?: string
  }
}

const typeLabels = {
  DEPOSIT: 'Facture de dépôt',
  PARTIAL: 'Facture partielle',
  FINAL: 'Facture finale',
  STANDALONE: 'Facture',
}

export function InvoiceSendEmail({
  studioName,
  studioEmail,
  studioPhone,
  studioWebsite,
  logoUrl,
  brandColors,
  invoiceNumber,
  invoiceUrl,
  invoiceType,
  projectName,
  total,
  dueDate,
  contactName,
  customTexts,
}: InvoiceSendEmailProps) {
  const firstName = contactName.split(' ')[0]
  const typeLabel = typeLabels[invoiceType] || 'Facture'
  const colors = brandColors || { background: '#F5F5F5', accent: '#6366F1', accentDark: '#4F46E5' }

  // Default texts with proper accents
  const texts = {
    greeting: customTexts?.greeting || `Bonjour ${firstName},`,
    intro: customTexts?.intro || `Veuillez trouver ci-joint la facture pour le projet`,
    callToAction: customTexts?.callToAction || 'Voir la facture',
    note: customTexts?.note || `Pour toute question concernant cette facture, n'hésitez pas à me contacter.`,
    signature: customTexts?.signature || 'Merci,',
  }

  return (
    <BaseLayout
      preview={`${typeLabel} ${invoiceNumber} - ${total}`}
      studioName={studioName}
      studioEmail={studioEmail}
      studioPhone={studioPhone}
      studioWebsite={studioWebsite}
      logoUrl={logoUrl}
      brandColors={colors}
    >
      <Heading style={heading}>
        {typeLabel}
      </Heading>

      <Text style={paragraph}>
        {texts.greeting}
      </Text>

      <Text style={paragraph}>
        {texts.intro} <strong>{projectName}</strong>.
      </Text>

      {/* Invoice summary box */}
      <Section style={{ ...summaryBox, backgroundColor: colors.background }}>
        <Text style={summaryLabel}>Facture {invoiceNumber}</Text>
        <Text style={summaryTotal}>{total}</Text>
        <Text style={summaryDue}>
          A payer avant le <strong>{dueDate}</strong>
        </Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={invoiceUrl}>
          {texts.callToAction}
        </Button>
      </Section>

      <Text style={paragraph}>
        Vous trouverez également le PDF de la facture en pièce jointe à cet email.
      </Text>

      <Hr style={hr} />

      <Text style={smallText}>
        {texts.note}
      </Text>

      <Text style={signature}>
        {texts.signature}
      </Text>
      <Text style={signatureName}>
        {studioName}
      </Text>
    </BaseLayout>
  )
}

// Styles
const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#0A0A0A',
  margin: '0 0 24px',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#3C3C3C',
  margin: '0 0 16px',
}

const summaryBox = {
  backgroundColor: '#F5F5F5', // Will be overridden by brandColors
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const summaryLabel = {
  fontSize: '13px',
  color: '#6B6B6B',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px',
}

const summaryTotal = {
  fontSize: '32px',
  fontWeight: '600',
  color: '#0A0A0A',
  margin: '0 0 12px',
}

const summaryDue = {
  fontSize: '14px',
  color: '#6B6B6B',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0A0A0A',
  borderRadius: '6px',
  color: '#FFFFFF',
  fontSize: '15px',
  fontWeight: '500',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '14px 28px',
  display: 'inline-block',
}

const hr = {
  borderColor: '#E5E5E5',
  margin: '32px 0 24px',
}

const smallText = {
  fontSize: '14px',
  color: '#6B6B6B',
  margin: '0 0 16px',
}

const signature = {
  fontSize: '15px',
  color: '#3C3C3C',
  margin: '0 0 4px',
}

const signatureName = {
  fontSize: '15px',
  fontWeight: '500',
  color: '#0A0A0A',
  margin: '0',
}

export default InvoiceSendEmail
