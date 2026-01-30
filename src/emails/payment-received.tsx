import {
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface PaymentReceivedEmailProps {
  // Studio
  studioName: string
  studioEmail?: string
  studioPhone?: string
  studioWebsite?: string
  logoUrl?: string
  // Invoice
  invoiceNumber: string
  projectName: string
  amount: string
  paymentDate: string
  paymentMethod?: string
  // Client
  contactName: string
  // Customizable texts
  customTexts?: {
    heading?: string
    greeting?: string
    intro?: string
    outro?: string
    signature?: string
  }
}

export function PaymentReceivedEmail({
  studioName,
  studioEmail,
  studioPhone,
  studioWebsite,
  logoUrl,
  invoiceNumber,
  projectName,
  amount,
  paymentDate,
  paymentMethod,
  contactName,
  customTexts,
}: PaymentReceivedEmailProps) {
  const firstName = contactName.split(' ')[0]

  // Default texts with proper accents
  const texts = {
    heading: customTexts?.heading || 'Merci pour votre paiement!',
    greeting: customTexts?.greeting || `Bonjour ${firstName},`,
    intro: customTexts?.intro || `Nous confirmons la réception de votre paiement pour la facture ${invoiceNumber}.`,
    outro: customTexts?.outro || `Merci pour votre confiance! C'est toujours un plaisir de travailler avec vous.`,
    signature: customTexts?.signature || 'À bientôt,',
  }

  return (
    <BaseLayout
      preview={`Paiement reçu - Merci!`}
      studioName={studioName}
      studioEmail={studioEmail}
      studioPhone={studioPhone}
      studioWebsite={studioWebsite}
      logoUrl={logoUrl}
    >
      <Section style={successBanner}>
        <Text style={checkmark}>&#10003;</Text>
        <Text style={bannerText}>Paiement reçu</Text>
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

      {/* Payment summary box */}
      <Section style={summaryBox}>
        <Text style={summaryLabel}>Confirmation de paiement</Text>
        <Text style={summaryTotal}>{amount}</Text>
        <Text style={summaryDetail}>
          Projet: {projectName}
        </Text>
        <Text style={summaryDetail}>
          Date: {paymentDate}
          {paymentMethod && ` · ${paymentMethod}`}
        </Text>
      </Section>

      <Text style={paragraph}>
        Votre facture est maintenant marquée comme payée. Vous pouvez conserver cet email
        comme confirmation de paiement.
      </Text>

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

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#3C3C3C',
  margin: '0 0 16px',
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
  color: '#10B981',
  margin: '0 0 12px',
}

const summaryDetail = {
  fontSize: '14px',
  color: '#6B6B6B',
  margin: '0 0 4px',
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

export default PaymentReceivedEmail
