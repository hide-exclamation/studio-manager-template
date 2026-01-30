import {
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface QuoteApprovedEmailProps {
  // Studio
  studioName: string
  studioEmail?: string
  studioPhone?: string
  studioWebsite?: string
  logoUrl?: string
  // Quote
  quoteNumber: string
  projectName: string
  total: string
  depositAmount: string
  // Client
  contactName: string
  // Customizable texts
  customTexts?: {
    heading?: string
    greeting?: string
    intro?: string
    nextStepsTitle?: string
    nextSteps?: string[]
    outro?: string
    signature?: string
  }
}

export function QuoteApprovedEmail({
  studioName,
  studioEmail,
  studioPhone,
  studioWebsite,
  logoUrl,
  quoteNumber,
  projectName,
  total,
  depositAmount,
  contactName,
  customTexts,
}: QuoteApprovedEmailProps) {
  const firstName = contactName.split(' ')[0]

  // Default texts with proper accents
  const texts = {
    heading: customTexts?.heading || 'Merci pour votre confiance!',
    greeting: customTexts?.greeting || `Bonjour ${firstName},`,
    intro: customTexts?.intro || `Votre devis ${quoteNumber} pour le projet ${projectName} a été approuvé avec succès.`,
    nextStepsTitle: customTexts?.nextStepsTitle || 'Prochaines étapes',
    nextSteps: customTexts?.nextSteps || [
      'Vous recevrez une facture de dépôt sous peu',
      'Une fois le dépôt reçu, nous démarrerons le projet',
      'Je vous tiendrai informé de l\'avancement régulièrement',
    ],
    outro: customTexts?.outro || `N'hésitez pas à me contacter si vous avez des questions. J'ai hâte de commencer ce projet avec vous!`,
    signature: customTexts?.signature || 'À très bientôt,',
  }

  return (
    <BaseLayout
      preview={`Devis ${quoteNumber} approuvé - Merci!`}
      studioName={studioName}
      studioEmail={studioEmail}
      studioPhone={studioPhone}
      studioWebsite={studioWebsite}
      logoUrl={logoUrl}
    >
      <Section style={successBanner}>
        <Text style={checkmark}>&#10003;</Text>
        <Text style={bannerText}>Devis approuvé</Text>
      </Section>

      <Heading style={heading}>
        {texts.heading}
      </Heading>

      <Text style={paragraph}>
        {texts.greeting}
      </Text>

      <Text style={paragraph}>
        {texts.intro}
      </Text>

      {/* Summary box */}
      <Section style={summaryBox}>
        <Text style={summaryLabel}>Total du projet</Text>
        <Text style={summaryTotal}>{total}</Text>
        <Hr style={summaryHr} />
        <Text style={summaryDeposit}>
          Dépôt à verser: <strong>{depositAmount}</strong>
        </Text>
      </Section>

      <Heading as="h2" style={subheading}>
        {texts.nextStepsTitle}
      </Heading>

      {texts.nextSteps.map((step, index) => (
        <Text key={index} style={paragraph}>
          {index + 1}. {step}
        </Text>
      ))}

      <Hr style={hr} />

      <Text style={paragraph}>
        {texts.outro}
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
const successBanner = {
  backgroundColor: '#ECFDF5',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
  textAlign: 'center' as const,
}

const checkmark = {
  fontSize: '24px',
  color: '#10B981',
  margin: '0 0 4px',
}

const bannerText = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#065F46',
  margin: '0',
}

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#0A0A0A',
  margin: '0 0 24px',
}

const subheading = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#0A0A0A',
  margin: '24px 0 16px',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#3C3C3C',
  margin: '0 0 12px',
}

const summaryBox = {
  backgroundColor: '#F5F1E8',
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
  fontSize: '28px',
  fontWeight: '600',
  color: '#0A0A0A',
  margin: '0',
}

const summaryHr = {
  borderColor: 'rgba(0,0,0,0.1)',
  margin: '16px 0',
}

const summaryDeposit = {
  fontSize: '15px',
  color: '#7C6AA8',
  margin: '0',
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

export default QuoteApprovedEmail
