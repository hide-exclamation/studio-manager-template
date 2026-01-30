import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

// Default colors (can be overridden via props)
const DEFAULT_COLORS = {
  background: '#F5F5F5',
  accent: '#6366F1',
  accentDark: '#4F46E5',
}

interface BrandColors {
  background: string
  accent: string
  accentDark: string
}

interface BaseLayoutProps {
  preview: string
  studioName: string
  studioEmail?: string
  studioPhone?: string
  studioWebsite?: string
  logoUrl?: string
  brandColors?: BrandColors
  children: React.ReactNode
}

export function BaseLayout({
  preview,
  studioName,
  studioEmail,
  studioPhone,
  studioWebsite,
  logoUrl,
  brandColors,
  children,
}: BaseLayoutProps) {
  const colors = brandColors || DEFAULT_COLORS

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ ...main, backgroundColor: colors.background }}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            {logoUrl ? (
              <Img src={logoUrl} alt={studioName} height="40" style={logo} />
            ) : (
              <Text style={logoText}>{studioName}</Text>
            )}
          </Section>

          {/* Content */}
          <Section style={content}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              {studioName}
              {studioPhone && ` · ${studioPhone}`}
            </Text>
            {studioEmail && (
              <Text style={footerText}>
                <Link href={`mailto:${studioEmail}`} style={footerLink}>
                  {studioEmail}
                </Link>
              </Text>
            )}
            {studioWebsite && (
              <Text style={footerText}>
                <Link href={studioWebsite} style={footerLink}>
                  {studioWebsite.replace(/^https?:\/\//, '')}
                </Link>
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#F5F5F5', // Will be overridden by brandColors
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
}

const header = {
  padding: '20px 0 30px',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto',
}

const logoText = {
  fontSize: '28px',
  fontWeight: '300',
  letterSpacing: '-0.02em',
  color: '#0A0A0A',
  margin: '0',
}

const content = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  padding: '40px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
}

const footer = {
  padding: '30px 0 0',
  textAlign: 'center' as const,
}

const footerText = {
  fontSize: '13px',
  color: '#6B6B6B',
  margin: '4px 0',
}

const footerLink = {
  color: '#6B6B6B',
  textDecoration: 'none',
}

export default BaseLayout
