import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface InvoiceReminderEmailProps {
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
  total: string
  dueDate: string
  daysSinceSent: number
  // Reminder level: 1 (J+21) or 2 (J+28)
  reminderLevel: 1 | 2
  // Client
  contactName: string
  // Customizable texts per level
  customTexts?: {
    level1?: { intro?: string; outro?: string }
    level2?: { intro?: string; outro?: string }
  }
}

export function InvoiceReminderEmail({
  studioName,
  studioEmail,
  studioPhone,
  studioWebsite,
  logoUrl,
  invoiceNumber,
  invoiceUrl,
  projectName,
  total,
  dueDate,
  daysSinceSent,
  reminderLevel,
  contactName,
  customTexts,
}: InvoiceReminderEmailProps) {
  const firstName = contactName.split(' ')[0]

  // Default content varies by reminder level
  // Level 1: J+21 après envoi
  // Level 2: J+28 après envoi (dernier rappel avant frais)
  const defaultContent = {
    1: {
      subject: `Rappel: Facture ${invoiceNumber}`,
      heading: 'Rappel de paiement',
      intro: `Je me permets de vous rappeler que la facture ${invoiceNumber} pour le projet ${projectName} est en attente de paiement depuis ${daysSinceSent} jours.`,
      outro: 'Si vous avez déjà procédé au paiement, veuillez ignorer ce message.',
    },
    2: {
      subject: `Dernier rappel: Facture ${invoiceNumber}`,
      heading: 'Dernier rappel avant frais de retard',
      intro: `La facture ${invoiceNumber} pour le projet ${projectName} reste impayée depuis ${daysSinceSent} jours.`,
      outro: 'Conformément à nos conditions, des frais de retard de 2% seront appliqués à compter du 30e jour après l\'envoi. Merci de régulariser la situation rapidement.',
    },
  }

  const levelKey = `level${reminderLevel}` as 'level1' | 'level2'
  const content = {
    ...defaultContent[reminderLevel],
    intro: customTexts?.[levelKey]?.intro || defaultContent[reminderLevel].intro,
    outro: customTexts?.[levelKey]?.outro || defaultContent[reminderLevel].outro,
  }

  return (
    <BaseLayout
      preview={content.subject}
      studioName={studioName}
      studioEmail={studioEmail}
      studioPhone={studioPhone}
      studioWebsite={studioWebsite}
      logoUrl={logoUrl}
    >
      {reminderLevel === 2 && (
        <Section style={urgentBanner}>
          <Text style={urgentText}>Dernier rappel</Text>
        </Section>
      )}

      <Heading style={heading}>
        {content.heading}
      </Heading>

      <Text style={paragraph}>
        Bonjour {firstName},
      </Text>

      <Text style={paragraph}>
        {content.intro}
      </Text>

      {/* Invoice summary box */}
      <Section style={summaryBox}>
        <Text style={summaryLabel}>Facture {invoiceNumber}</Text>
        <Text style={summaryTotal}>{total}</Text>
        <Text style={summaryDue}>
          Échéance: {dueDate}
        </Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={invoiceUrl}>
          Voir la facture
        </Button>
      </Section>

      <Text style={paragraph}>
        {content.outro}
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
const urgentBanner = {
  backgroundColor: '#FEF2F2',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '24px',
  textAlign: 'center' as const,
}

const urgentText = {
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

export default InvoiceReminderEmail
