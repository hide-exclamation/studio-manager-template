import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface InvoiceOverdueEmailProps {
  // Studio
  studioName: string
  studioEmail?: string
  studioPhone?: string
  studioWebsite?: string
  logoUrl?: string
  // Invoice
  invoiceNumber: string
  invoiceUrl: string
  projectName: string
  originalTotal: string
  lateFeeAmount: string
  newTotal: string
  dueDate: string
  daysOverdue: number
  // Client
  contactName: string
  // Customizable texts
  customTexts?: {
    intro?: string
    outro?: string
  }
}

export function InvoiceOverdueEmail({
  studioName,
  studioEmail,
  studioPhone,
  studioWebsite,
  logoUrl,
  invoiceNumber,
  invoiceUrl,
  projectName,
  originalTotal,
  lateFeeAmount,
  newTotal,
  dueDate,
  daysOverdue,
  contactName,
  customTexts,
}: InvoiceOverdueEmailProps) {
  const firstName = contactName.split(' ')[0]

  // Default texts with proper accents
  const texts = {
    intro: customTexts?.intro || `La facture ${invoiceNumber} pour le projet ${projectName} est maintenant en retard de ${daysOverdue} jours. Conformément à nos conditions de paiement, des frais de retard de 2% ont été appliqués.`,
    outro: customTexts?.outro || `Merci de régulariser cette situation dans les plus brefs délais. Si vous avez des questions ou souhaitez discuter d'un échéancier de paiement, n'hésitez pas à me contacter.`,
  }

  return (
    <BaseLayout
      preview={`Facture ${invoiceNumber} en retard - Frais appliqués`}
      studioName={studioName}
      studioEmail={studioEmail}
      studioPhone={studioPhone}
      studioWebsite={studioWebsite}
      logoUrl={logoUrl}
    >
      <Section style={overdueBanner}>
        <Text style={overdueText}>Facture en retard</Text>
      </Section>

      <Heading style={heading}>
        Frais de retard appliqués
      </Heading>

      <Text style={paragraph}>
        Bonjour {firstName},
      </Text>

      <Text style={paragraph}>
        {texts.intro}
      </Text>

      {/* Invoice summary box */}
      <Section style={summaryBox}>
        <Text style={summaryLabel}>Facture {invoiceNumber}</Text>

        <Section style={summaryRow}>
          <Text style={summaryRowLabel}>Montant original</Text>
          <Text style={summaryRowValue}>{originalTotal}</Text>
        </Section>

        <Section style={summaryRow}>
          <Text style={summaryRowLabelRed}>Frais de retard (2%)</Text>
          <Text style={summaryRowValueRed}>+ {lateFeeAmount}</Text>
        </Section>

        <Hr style={summaryHr} />

        <Text style={summaryTotalLabel}>Nouveau total</Text>
        <Text style={summaryTotal}>{newTotal}</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={invoiceUrl}>
          Payer maintenant
        </Button>
      </Section>

      <Text style={paragraph}>
        {texts.outro}
      </Text>

      <Hr style={hr} />

      <Text style={signature}>
        Cordialement,
      </Text>
      <Text style={signatureName}>
        {studioName}
      </Text>
    </BaseLayout>
  )
}

// Styles
const overdueBanner = {
  backgroundColor: '#FEF2F2',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '24px',
  textAlign: 'center' as const,
}

const overdueText = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#DC2626',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
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
}

const summaryLabel = {
  fontSize: '13px',
  color: '#6B6B6B',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}

const summaryRow = {
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
  margin: '8px 0',
}

const summaryRowLabel = {
  fontSize: '14px',
  color: '#6B6B6B',
  margin: '0',
}

const summaryRowValue = {
  fontSize: '14px',
  color: '#0A0A0A',
  margin: '0',
}

const summaryRowLabelRed = {
  fontSize: '14px',
  color: '#DC2626',
  margin: '0',
}

const summaryRowValueRed = {
  fontSize: '14px',
  color: '#DC2626',
  fontWeight: '500',
  margin: '0',
}

const summaryHr = {
  borderColor: 'rgba(0,0,0,0.1)',
  margin: '16px 0',
}

const summaryTotalLabel = {
  fontSize: '13px',
  color: '#6B6B6B',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const summaryTotal = {
  fontSize: '28px',
  fontWeight: '600',
  color: '#0A0A0A',
  margin: '0',
  textAlign: 'center' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#DC2626',
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

export default InvoiceOverdueEmail
