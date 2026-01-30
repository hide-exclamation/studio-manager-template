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

interface QuoteSendEmailProps {
  // Studio
  studioName: string
  studioEmail?: string
  studioPhone?: string
  studioWebsite?: string
  logoUrl?: string
  brandColors?: BrandColors
  // Quote
  quoteNumber: string
  quoteUrl: string
  projectName: string
  total: string
  validUntil: string
  depositPercent: number
  depositAmount: string
  // Client
  clientName: string
  contactName: string
  // Customizable texts
  customTexts?: {
    heading?: string
    greeting?: string
    intro?: string
    callToAction?: string
    outro?: string
    signature?: string
  }
}

export function QuoteSendEmail({
  studioName,
  studioEmail,
  studioPhone,
  studioWebsite,
  logoUrl,
  brandColors,
  quoteNumber,
  quoteUrl,
  projectName,
  total,
  validUntil,
  depositPercent,
  depositAmount,
  clientName,
  contactName,
  customTexts,
}: QuoteSendEmailProps) {
  const firstName = contactName.split(' ')[0]
  const colors = brandColors || { background: '#F5F5F5', accent: '#6366F1', accentDark: '#4F46E5' }

  // Default texts with proper accents
  const texts = {
    heading: customTexts?.heading || 'Votre devis est pret',
    greeting: customTexts?.greeting || `Bonjour ${firstName},`,
    intro: customTexts?.intro || `Merci pour votre confiance! Voici le devis pour votre projet`,
    callToAction: customTexts?.callToAction || 'Voir le devis complet',
    outro: customTexts?.outro || `Vous pourrez consulter tous les details et approuver le devis directement en ligne. N'hesitez pas a me contacter si vous avez des questions.`,
    signature: customTexts?.signature || 'A bientot,',
  }

  return (
    <BaseLayout
      preview={`Votre devis ${quoteNumber} pour ${projectName}`}
      studioName={studioName}
      studioEmail={studioEmail}
      studioPhone={studioPhone}
      studioWebsite={studioWebsite}
      logoUrl={logoUrl}
      brandColors={colors}
    >
      <Heading style={heading}>
        {texts.heading}
      </Heading>

      <Text style={paragraph}>
        {texts.greeting}
      </Text>

      <Text style={paragraph}>
        {texts.intro} <strong>{projectName}</strong>.
      </Text>

      {/* Quote summary box */}
      <Section style={{ ...summaryBox, backgroundColor: colors.background }}>
        <Text style={summaryLabel}>Devis {quoteNumber}</Text>
        <Text style={summaryTotal}>{total}</Text>
        <Text style={{ ...summaryDetail, color: colors.accentDark }}>
          Depot requis: {depositAmount} ({depositPercent}%)
        </Text>
        <Text style={summaryValidity}>
          Valide jusqu'au {validUntil}
        </Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={quoteUrl}>
          {texts.callToAction}
        </Button>
      </Section>

      <Text style={paragraph}>
        {texts.outro}
      </Text>

      <Hr style={hr} />

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
  margin: '0 0 8px',
}

const summaryDetail = {
  fontSize: '14px',
  color: '#4F46E5', // Will be overridden by brandColors.accentDark
  margin: '0 0 4px',
}

const summaryValidity = {
  fontSize: '13px',
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

export default QuoteSendEmail
