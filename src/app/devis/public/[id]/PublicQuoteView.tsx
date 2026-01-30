'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useToast } from '@/components/ui'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// Default brand colors (will be overridden by API)
const DEFAULT_COLORS = {
  background: '#F5F5F5',
  accent: '#6366F1',
  accentDark: '#4F46E5',
}

type EndNote = {
  title: string
  content: string
}

type Quote = {
  id: string
  quoteNumber: string
  status: string
  publicToken?: string | null
  coverTitle?: string | null
  coverSubtitle?: string | null
  coverImageUrl?: string | null
  introduction?: string | null
  endNotes?: EndNote[] | null
  paymentTerms?: string | null
  lateFeePolicy?: string | null
  subtotal: string
  discounts?: Array<{ type: string; value: number; label: string; reason?: string }> | null
  tpsRate: string
  tvqRate: string
  total: string
  depositPercent: string
  validUntil?: string | null
  createdAt: string
  project: {
    name: string
    client: {
      companyName: string
      code: string
    }
  }
  sections: Array<{
    id: string
    sectionNumber: number
    title: string
    description?: string | null
    items: Array<{
      id: string
      name: string
      description?: string | null
      itemType: string
      itemTypes?: string[]
      billingMode?: 'FIXED' | 'HOURLY'
      quantity: number
      unitPrice: string
      hourlyRate?: string | null
      hours?: string | null
      variants?: Array<{ label: string; price: number }> | null
      selectedVariant?: number | null
      collaboratorType?: 'OWNER' | 'FREELANCER' | null
      collaboratorName?: string | null
      includeInTotal: boolean
      isSelected: boolean
    }>
  }>
}

type Props = {
  quote: Quote
}

// Markdown components - Space only AFTER nested lists (not before)
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-6 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold" style={{ color: '#0A0A0A' }}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em>{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-none mb-5">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex gap-2 leading-relaxed">
      <span className="shrink-0 markdown-bullet">•</span>
      <div className="flex-1 [&>ul]:ml-2 [&>ul]:mb-4">{children}</div>
    </li>
  ),
}

const markdownComponentsCompact = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold" style={{ color: '#0A0A0A' }}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em>{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-none mb-4">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex gap-2 leading-relaxed">
      <span className="shrink-0 markdown-bullet">–</span>
      <div className="flex-1 [&>ul]:ml-2 [&>ul]:mb-3">{children}</div>
    </li>
  ),
}

export function PublicQuoteView({ quote: initialQuote }: Props) {
  const toast = useToast()
  const [quote, setQuote] = useState(initialQuote)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(quote.status === 'ACCEPTED')
  const [stickyVisible, setStickyVisible] = useState(true)
  const [brandColors, setBrandColors] = useState(DEFAULT_COLORS)
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLElement[]>([])
  const totalsSectionRef = useRef<HTMLElement>(null)

  // Fetch brand colors from public settings
  useEffect(() => {
    fetch('/api/public-settings')
      .then((res) => res.json())
      .then((data) => {
        setBrandColors({
          background: data.colorBackground || DEFAULT_COLORS.background,
          accent: data.colorAccent || DEFAULT_COLORS.accent,
          accentDark: data.colorAccentDark || DEFAULT_COLORS.accentDark,
        })
      })
      .catch(() => {
        // Use defaults if fetch fails
      })
  }, [])

  // State pour les items à la carte sélectionnables
  const [selections, setSelections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    quote.sections.forEach(section => {
      section.items.forEach(item => {
        const types = item.itemTypes || [item.itemType]
        if (types.includes('A_LA_CARTE')) {
          initial[item.id] = false
        }
      })
    })
    return initial
  })

  // State pour les variantes sélectionnées par le client
  const [variantSelections, setVariantSelections] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    quote.sections.forEach(section => {
      section.items.forEach(item => {
        if (item.variants && item.variants.length > 0) {
          initial[item.id] = item.selectedVariant ?? 0
        }
      })
    })
    return initial
  })

  // GSAP Animations
  useEffect(() => {
    if (typeof window === 'undefined') return

    const ctx = gsap.context(() => {
      // Hero animation
      if (heroRef.current) {
        const heroElements = heroRef.current.querySelectorAll('.hero-animate')
        gsap.fromTo(heroElements,
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.2,
            stagger: 0.15,
            ease: 'power3.out',
            delay: 0.3
          }
        )
      }

      // Scroll parallax on shapes - each at different speed
      const shapes = document.querySelectorAll('.shape-parallax')
      shapes.forEach((shape) => {
        const speed = parseFloat(shape.getAttribute('data-speed') || '0.1')
        gsap.to(shape, {
          y: () => window.innerHeight * speed,
          ease: 'none',
          scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          },
        })
      })

      // Sticky total - hide when reaching totals section
      if (totalsSectionRef.current) {
        ScrollTrigger.create({
          trigger: totalsSectionRef.current,
          start: 'top 60%',
          end: 'bottom top',
          onEnter: () => setStickyVisible(false),
          onLeaveBack: () => setStickyVisible(true),
        })
      }

      // Sections scroll animations - play once, no reverse
      sectionsRef.current.forEach((section) => {
        if (!section) return

        const elements = section.querySelectorAll('.section-animate')
        gsap.fromTo(elements,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              toggleActions: 'play none none none'
            }
          }
        )
      })

      // Items stagger animation - play once
      const itemGroups = document.querySelectorAll('.items-group')
      itemGroups.forEach((group) => {
        const items = group.querySelectorAll('.item-animate')
        gsap.fromTo(items,
          { y: 25, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.05,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: group,
              start: 'top 88%',
              toggleActions: 'play none none none'
            }
          }
        )
      })

    }, containerRef)

    return () => ctx.revert()
  }, [])

  const toggleSelection = (itemId: string) => {
    setSelections(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const selectVariant = (itemId: string, variantIndex: number) => {
    setVariantSelections(prev => ({
      ...prev,
      [itemId]: variantIndex
    }))
    // Auto-select the item if it's à la carte
    if (selections[itemId] === false) {
      setSelections(prev => ({
        ...prev,
        [itemId]: true
      }))
    }
  }

  const handleApprove = async () => {
    if (!quote.publicToken) return

    setApproving(true)
    try {
      const res = await fetch(`/api/quotes/public/${quote.publicToken || quote.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections, variantSelections }),
      })

      if (res.ok) {
        setApproved(true)
        setQuote(prev => ({ ...prev, status: 'ACCEPTED' }))
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de l\'approbation')
      }
    } catch (error) {
      console.error('Error approving quote:', error)
      toast.error('Erreur lors de l\'approbation')
    } finally {
      setApproving(false)
    }
  }

  // Calcul des totaux
  const calculations = useMemo(() => {
    let subtotal = 0
    quote.sections.forEach(section => {
      section.items.forEach(item => {
        const types = item.itemTypes || [item.itemType]
        const isALaCarte = types.includes('A_LA_CARTE')
        if (types.includes('FREE')) return
        // Pour les items à la carte, c'est la sélection qui contrôle l'inclusion
        if (isALaCarte) {
          if (!selections[item.id]) return
        } else if (!item.includeInTotal) {
          return
        }
        if (item.billingMode === 'HOURLY' && item.hourlyRate && item.hours) {
          subtotal += Number(item.hourlyRate) * Number(item.hours)
        } else {
          if (item.variants && item.variants.length > 0) {
            const selectedVariantIndex = variantSelections[item.id] ?? (item.selectedVariant ?? 0)
            const variant = item.variants[selectedVariantIndex]
            if (variant) {
              subtotal += variant.price * item.quantity
            } else {
              subtotal += Number(item.unitPrice) * item.quantity
            }
          } else {
            subtotal += Number(item.unitPrice) * item.quantity
          }
        }
      })
    })

    const discounts = quote.discounts || []
    const totalDiscount = discounts.reduce((sum, d) => {
      if (d.type === 'PERCENTAGE') {
        return sum + subtotal * (d.value / 100)
      }
      return sum + d.value
    }, 0)

    const afterDiscount = subtotal - totalDiscount
    const tps = afterDiscount * Number(quote.tpsRate)
    const tvq = afterDiscount * Number(quote.tvqRate)
    const total = afterDiscount + tps + tvq
    const deposit = total * (Number(quote.depositPercent) / 100)

    return { subtotal, totalDiscount, discounts, afterDiscount, tps, tvq, total, deposit }
  }, [quote, selections, variantSelections])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div
      ref={containerRef}
      className="min-h-screen relative"
      style={{
        backgroundColor: brandColors.background,
        fontFamily: "'Inter', sans-serif",
        // CSS variables for brand colors
        ['--brand-background' as string]: brandColors.background,
        ['--brand-accent' as string]: brandColors.accent,
        ['--brand-accent-dark' as string]: brandColors.accentDark,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════
          FLOATING SHAPES - Scroll parallax decorations (right side only)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Lavender circle - top right */}
        <div
          className="shape-parallax absolute w-24 h-24 rounded-full opacity-30"
          data-speed="0.08"
          style={{
            background: brandColors.accent,
            top: '12%',
            right: '8%',
          }}
        />
        {/* Yellow circle - right middle-top */}
        <div
          className="shape-parallax absolute w-16 h-16 rounded-full opacity-40"
          data-speed="0.15"
          style={{
            background: '#F5D785',
            top: '35%',
            right: '15%',
          }}
        />
        {/* Lavender triangle - right middle */}
        <div
          className="shape-parallax absolute opacity-30"
          data-speed="0.12"
          style={{
            width: 0,
            height: 0,
            borderLeft: '20px solid transparent',
            borderRight: '20px solid transparent',
            borderBottom: `35px solid ${brandColors.accent}`,
            top: '55%',
            right: '5%',
          }}
        />
        {/* Rose circle - bottom right */}
        <div
          className="shape-parallax absolute w-20 h-20 rounded-full opacity-25"
          data-speed="0.06"
          style={{
            background: '#E88BA8',
            top: '75%',
            right: '12%',
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STICKY TOTAL - Floating recap on the right (outline style)
      ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`hidden lg:block fixed top-1/2 -translate-y-1/2 z-30 transition-all duration-500 ${
          stickyVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 pointer-events-none'
        }`}
        style={{ width: '180px', right: '10%' }}
      >
        <div
          className="p-5 rounded-xl"
          style={{
            backgroundColor: brandColors.background,
            border: '1px solid rgba(10, 10, 10, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        >
          <p
            className="text-xs tracking-widest uppercase mb-1 font-medium"
            style={{ color: 'rgba(10, 10, 10, 0.5)' }}
          >
            Total estimé
          </p>
          <p
            className="text-xl mb-4"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: '#0A0A0A',
            }}
          >
            {formatCurrency(calculations.total)}
          </p>
          {calculations.totalDiscount > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
                Économie
              </p>
              <p className="text-base font-medium" style={{ color: '#16a34a' }}>
                {formatCurrency(calculations.totalDiscount)}
              </p>
            </div>
          )}
          <div
            className="pt-3"
            style={{ borderTop: '1px solid rgba(10, 10, 10, 0.1)' }}
          >
            <p className="text-xs font-medium" style={{ color: 'rgba(10, 10, 10, 0.5)' }}>
              Dépôt ({quote.depositPercent}%)
            </p>
            <p className="text-base font-medium" style={{ color: '#7c6aa8' }}>
              {formatCurrency(calculations.deposit)}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          HERO SECTION - Cinematic entrance
      ═══════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="min-h-[85vh] md:min-h-screen flex flex-col justify-center px-6 md:px-16 lg:px-24 py-16 md:py-24 relative z-10"
      >
        {/* Cover image background */}
        {quote.coverImageUrl && (
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${quote.coverImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.15,
            }}
          />
        )}

        <div className="max-w-4xl relative z-10">
          {/* Quote number - small detail */}
          <p
            className="hero-animate text-xs tracking-[0.3em] uppercase mb-8"
            style={{ color: 'rgba(10, 10, 10, 0.5)' }}
          >
            Devis {quote.quoteNumber}
          </p>

          {/* Main title - PP Eiko */}
          <h1
            className="hero-animate mb-8"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(3rem, 8vw, 6rem)',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              color: '#0A0A0A'
            }}
          >
            {quote.coverTitle || quote.project.name}
          </h1>

          {/* Subtitle */}
          {quote.coverSubtitle && (
            <p
              className="hero-animate text-xl md:text-2xl lg:text-3xl font-light leading-relaxed max-w-3xl"
              style={{ color: 'rgba(10, 10, 10, 0.65)' }}
            >
              {quote.coverSubtitle}
            </p>
          )}

          {/* Meta info - IMPROVED CONTRAST */}
          <div className="hero-animate mt-12 md:mt-20 flex flex-wrap gap-6 md:gap-12">
            <div>
              <p
                className="text-xs tracking-[0.15em] uppercase mb-2 font-medium"
                style={{ color: 'rgba(10, 10, 10, 0.6)' }}
              >
                Client
              </p>
              <p className="text-lg" style={{ color: '#0A0A0A' }}>
                {quote.project.client.companyName}
              </p>
            </div>
            <div>
              <p
                className="text-xs tracking-[0.15em] uppercase mb-2 font-medium"
                style={{ color: 'rgba(10, 10, 10, 0.6)' }}
              >
                Date
              </p>
              <p className="text-lg" style={{ color: '#0A0A0A' }}>
                {formatDate(quote.createdAt)}
              </p>
            </div>
            {quote.validUntil && (
              <div>
                <p
                  className="text-xs tracking-[0.15em] uppercase mb-2 font-medium"
                  style={{ color: 'rgba(10, 10, 10, 0.6)' }}
                >
                  Valide jusqu&apos;au
                </p>
                <p className="text-lg" style={{ color: '#0A0A0A' }}>
                  {formatDate(quote.validUntil)}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          INTRODUCTION - Full width, generous spacing
      ═══════════════════════════════════════════════════════════════ */}
      {quote.introduction && (
        <section
          ref={el => { if (el) sectionsRef.current[0] = el }}
          className="px-6 md:px-16 lg:px-24 py-16 md:py-32 relative z-10"
          style={{ borderTop: '1px solid rgba(10, 10, 10, 0.08)' }}
        >
          <div
            className="section-animate max-w-3xl text-lg md:text-2xl leading-relaxed"
            style={{ color: 'rgba(10, 10, 10, 0.75)' }}
          >
            <ReactMarkdown components={markdownComponents}>
              {quote.introduction}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTIONS - Each section with generous breathing room
      ═══════════════════════════════════════════════════════════════ */}
      {quote.sections.map((section, sectionIndex) => (
        <section
          key={section.id}
          ref={el => { if (el) sectionsRef.current[sectionIndex + 1] = el }}
          className="px-6 md:px-16 lg:px-24 py-16 md:py-32 relative z-10"
          style={{ borderTop: '1px solid rgba(10, 10, 10, 0.08)' }}
        >
          <div className="max-w-4xl">
            {/* Section header */}
            <div className="section-animate mb-16">
              <span
                className="text-sm tracking-[0.2em] block mb-4 font-medium"
                style={{ color: '#9b87c2' }}
              >
                {String(section.sectionNumber).padStart(2, '0')}
              </span>
              <h2
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                  lineHeight: 1.1,
                  color: '#0A0A0A'
                }}
              >
                {section.title}
              </h2>
            </div>

            {/* Section description */}
            {section.description && (
              <div
                className="section-animate mb-16 max-w-3xl text-lg leading-relaxed"
                style={{ color: 'rgba(10, 10, 10, 0.65)' }}
              >
                <ReactMarkdown components={markdownComponents}>
                  {section.description}
                </ReactMarkdown>
              </div>
            )}

            {/* Items */}
            <div className="items-group space-y-6">
              {section.items.map((item) => {
                const types = item.itemTypes || [item.itemType]
                const isALaCarte = types.includes('A_LA_CARTE')
                const isSelected = isALaCarte ? selections[item.id] : true
                const isFree = types.includes('FREE')

                return (
                  <div
                    key={item.id}
                    onClick={isALaCarte ? () => toggleSelection(item.id) : undefined}
                    className={`item-animate relative p-5 md:p-8 lg:p-10 rounded-xl md:rounded-2xl transition-all duration-500 ${
                      isALaCarte ? 'cursor-pointer' : ''
                    }`}
                    style={{
                      backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                      boxShadow: isSelected
                        ? '0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)'
                        : 'none',
                      opacity: isSelected ? 1 : 0.6,
                      transform: isSelected ? 'scale(1)' : 'scale(0.98)',
                    }}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                      {/* Left side - Content */}
                      <div className="flex-1">
                        {/* Item header - NO PP Eiko, just bold Montreal */}
                        <div className="flex items-start gap-4 mb-4">
                          {isALaCarte && (
                            <div
                              className="mt-1 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-300"
                              style={{
                                borderColor: isSelected ? brandColors.accent : 'rgba(10,10,10,0.25)',
                                backgroundColor: isSelected ? brandColors.accent : 'transparent'
                              }}
                            >
                              {isSelected && (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3
                                className="text-base md:text-xl font-semibold"
                                style={{ color: '#0A0A0A' }}
                              >
                                {item.name}
                              </h3>
                              {isFree && (
                                <span
                                  className="text-xs font-medium px-3 py-1 rounded-full"
                                  style={{
                                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                                    color: '#16a34a'
                                  }}
                                >
                                  Offert
                                </span>
                              )}
                              {isALaCarte && (
                                <span
                                  className="text-xs font-medium px-3 py-1 rounded-full"
                                  style={{
                                    backgroundColor: 'rgba(197, 184, 227, 0.25)',
                                    color: '#7c3aed'
                                  }}
                                >
                                  Optionnel
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Item description */}
                        {item.description && (
                          <div
                            className="text-base leading-relaxed pl-0 md:pl-10"
                            style={{ color: 'rgba(10, 10, 10, 0.6)' }}
                          >
                            <ReactMarkdown components={markdownComponentsCompact}>
                              {item.description}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Freelancer partner - IMPROVED CONTRAST */}
                        {item.collaboratorType === 'FREELANCER' && item.collaboratorName && (
                          <div
                            className="mt-6 pl-0 md:pl-10 flex items-center gap-2 text-sm"
                            style={{ color: '#7c6aa8' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span>
                              Partenaire : <strong style={{ color: '#5b4a8a' }}>{item.collaboratorName}</strong>
                            </span>
                          </div>
                        )}

                        {/* Variant selector */}
                        {item.variants && item.variants.length > 0 && (
                          <div
                            className="mt-6 pl-0 md:pl-10 grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.variants.map((variant, variantIndex) => {
                              const isVariantSelected = (variantSelections[item.id] ?? (item.selectedVariant ?? 0)) === variantIndex
                              return (
                                <button
                                  key={variantIndex}
                                  onClick={() => selectVariant(item.id, variantIndex)}
                                  className="px-4 py-3 md:py-2.5 text-sm rounded-xl transition-all duration-300 text-left md:text-center"
                                  style={{
                                    backgroundColor: isVariantSelected ? brandColors.accent : 'rgba(10,10,10,0.05)',
                                    color: isVariantSelected ? '#0A0A0A' : 'rgba(10,10,10,0.6)',
                                    fontWeight: isVariantSelected ? 500 : 400,
                                    boxShadow: isVariantSelected ? `0 2px 8px ${brandColors.accent}66` : 'none'
                                  }}
                                >
                                  {variant.label} — {formatCurrency(variant.price)}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right side - Price */}
                      <div className="text-left md:text-right md:min-w-[140px] mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0" style={{ borderColor: 'rgba(10,10,10,0.08)' }}>
                        {(() => {
                          if (isFree) {
                            return (
                              <p className="text-lg font-medium" style={{ color: '#16a34a' }}>
                                Offert
                              </p>
                            )
                          }
                          const isHourly = item.billingMode === 'HOURLY'
                          if (isHourly && item.hourlyRate && item.hours) {
                            const hourlyTotal = Number(item.hourlyRate) * Number(item.hours)
                            return (
                              <>
                                <p className="text-sm mb-1" style={{ color: 'rgba(10,10,10,0.5)' }}>
                                  {item.hours}h × {formatCurrency(Number(item.hourlyRate))}/h
                                </p>
                                <p className="text-xl font-medium" style={{ color: '#0A0A0A' }}>
                                  {formatCurrency(hourlyTotal)}
                                </p>
                              </>
                            )
                          }
                          if (item.variants && item.variants.length > 0) {
                            const selectedVariantIndex = variantSelections[item.id] ?? (item.selectedVariant ?? 0)
                            const variant = item.variants[selectedVariantIndex]
                            if (variant) {
                              return (
                                <>
                                  {item.quantity > 1 && (
                                    <p className="text-sm mb-1" style={{ color: 'rgba(10,10,10,0.5)' }}>
                                      {item.quantity} × {formatCurrency(variant.price)}
                                    </p>
                                  )}
                                  <p className="text-xl font-medium" style={{ color: '#0A0A0A' }}>
                                    {formatCurrency(variant.price * item.quantity)}
                                  </p>
                                </>
                              )
                            }
                          }
                          return (
                            <>
                              {item.quantity > 1 && (
                                <p className="text-sm mb-1" style={{ color: 'rgba(10,10,10,0.5)' }}>
                                  {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                                </p>
                              )}
                              <p className="text-xl font-medium" style={{ color: '#0A0A0A' }}>
                                {formatCurrency(Number(item.unitPrice) * item.quantity)}
                              </p>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ))}

      {/* ═══════════════════════════════════════════════════════════════
          TOTALS - Dark section, elegant summary
      ═══════════════════════════════════════════════════════════════ */}
      <section
        ref={totalsSectionRef}
        className="px-6 md:px-16 lg:px-24 py-16 md:py-32 relative z-20"
        style={{ backgroundColor: '#0A0A0A' }}
      >
        <div className="max-w-lg ml-auto">
          <div className="space-y-6">
            {/* Subtotal */}
            <div className="flex justify-between items-baseline">
              <span
                className="text-sm tracking-wide"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Sous-total
              </span>
              <span className="text-lg text-white">
                {formatCurrency(calculations.subtotal)}
              </span>
            </div>

            {/* Discounts - IMPROVED CONTRAST */}
            {calculations.discounts.map((d, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline">
                  <span
                    className="text-sm tracking-wide"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {d.label || 'Rabais'}{d.type === 'PERCENTAGE' ? ` (${d.value}%)` : ''}
                  </span>
                  <span style={{ color: '#4ade80' }}>
                    -{formatCurrency(d.type === 'PERCENTAGE' ? calculations.subtotal * (d.value / 100) : d.value)}
                  </span>
                </div>
                {d.reason && (
                  <p
                    className="text-xs mt-1 text-right"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    {d.reason}
                  </p>
                )}
              </div>
            ))}

            {/* Taxes */}
            <div className="flex justify-between items-baseline">
              <span
                className="text-sm tracking-wide"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                TPS (5%)
              </span>
              <span className="text-white">{formatCurrency(calculations.tps)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span
                className="text-sm tracking-wide"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                TVQ (9.975%)
              </span>
              <span className="text-white">{formatCurrency(calculations.tvq)}</span>
            </div>

            {/* Total */}
            <div
              className="pt-8 mt-8"
              style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}
            >
              <div className="flex justify-between items-baseline">
                <span
                  className="text-lg"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  Total
                </span>
                <span
                  className="text-3xl md:text-4xl font-light"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: '#FFFFFF'
                  }}
                >
                  {formatCurrency(calculations.total)}
                </span>
              </div>
            </div>

            {/* Deposit */}
            <div className="flex justify-between items-baseline pt-4">
              <span
                className="text-sm tracking-wide"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Dépôt requis ({quote.depositPercent}%)
              </span>
              <span style={{ color: brandColors.accent }}>
                {formatCurrency(calculations.deposit)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          END NOTES - If any
      ═══════════════════════════════════════════════════════════════ */}
      {quote.endNotes && quote.endNotes.length > 0 && (
        <section className="px-6 md:px-16 lg:px-24 py-12 md:py-24 relative z-10">
          <div className="max-w-3xl mx-auto space-y-10 md:space-y-16">
            {quote.endNotes.map((note, index) => (
              <div key={index}>
                {note.title && (
                  <h3
                    className="text-xl md:text-2xl mb-6"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      color: '#0A0A0A'
                    }}
                  >
                    {note.title}
                  </h3>
                )}
                <div
                  className="text-base leading-relaxed"
                  style={{ color: 'rgba(10, 10, 10, 0.65)' }}
                >
                  <ReactMarkdown components={markdownComponents}>
                    {note.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PAYMENT TERMS - If any - IMPROVED CONTRAST
      ═══════════════════════════════════════════════════════════════ */}
      {(quote.paymentTerms || quote.lateFeePolicy) && (
        <section
          className="px-6 md:px-16 lg:px-24 py-12 md:py-16 relative z-10"
          style={{ borderTop: '1px solid rgba(10, 10, 10, 0.08)' }}
        >
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12">
            {quote.paymentTerms && (
              <div>
                <h4
                  className="text-xs tracking-[0.15em] uppercase mb-4 font-medium"
                  style={{ color: 'rgba(10, 10, 10, 0.55)' }}
                >
                  Conditions de paiement
                </h4>
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'rgba(10, 10, 10, 0.7)' }}
                >
                  {quote.paymentTerms}
                </p>
              </div>
            )}
            {quote.lateFeePolicy && (
              <div>
                <h4
                  className="text-xs tracking-[0.15em] uppercase mb-4 font-medium"
                  style={{ color: 'rgba(10, 10, 10, 0.55)' }}
                >
                  Politique de retard
                </h4>
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'rgba(10, 10, 10, 0.7)' }}
                >
                  {quote.lateFeePolicy}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          APPROVAL CTA - The money shot
      ═══════════════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-16 lg:px-24 py-16 md:py-32 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          {approved ? (
            <div className="space-y-8">
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
              >
                <Check size={40} style={{ color: '#16a34a' }} />
              </div>
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  color: '#0A0A0A'
                }}
              >
                Devis approuvé
              </h3>
              <p
                className="text-lg"
                style={{ color: 'rgba(10, 10, 10, 0.65)' }}
              >
                Merci pour votre confiance. Nous vous contacterons très bientôt pour la suite du projet.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              <h3
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                  lineHeight: 1.1,
                  color: '#0A0A0A'
                }}
              >
                Prêt à démarrer?
              </h3>
              <p
                className="text-lg max-w-md mx-auto"
                style={{ color: 'rgba(10, 10, 10, 0.65)' }}
              >
                En approuvant ce devis, vous acceptez les termes présentés.
                Un dépôt de {quote.depositPercent}% sera requis pour lancer le projet.
              </p>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="group relative w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 rounded-full text-base sm:text-lg font-medium overflow-hidden transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: '#0A0A0A',
                  color: brandColors.background,
                  opacity: approving ? 0.7 : 1,
                }}
              >
                <span className="relative z-10 transition-colors duration-300 group-hover:text-[#0A0A0A]">
                  {approving ? 'Approbation en cours...' : 'Approuver ce devis'}
                </span>
                {/* Hover fill effect */}
                <span
                  className="absolute inset-0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ backgroundColor: brandColors.accent }}
                />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER - Minimal
      ═══════════════════════════════════════════════════════════════ */}
      <footer
        className="px-6 md:px-16 lg:px-24 py-12 md:py-16 pb-28 lg:pb-16 text-center relative z-10"
        style={{ borderTop: '1px solid rgba(10, 10, 10, 0.08)' }}
      >
        <p
          className="text-sm mb-2"
          style={{ color: 'rgba(10, 10, 10, 0.5)' }}
        >
          Ce devis est valide {quote.validUntil ? `jusqu'au ${formatDate(quote.validUntil)}` : 'pendant 30 jours'}.
        </p>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE STICKY TOTAL - Bottom bar on small screens
      ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-all duration-500 ${
          stickyVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          backgroundColor: '#0A0A0A',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p
              className="text-xs tracking-wide uppercase mb-0.5"
              style={{ color: 'rgba(255, 255, 255, 0.5)' }}
            >
              Total estimé
            </p>
            <p
              className="text-xl font-medium"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: '#FFFFFF',
              }}
            >
              {formatCurrency(calculations.total)}
            </p>
          </div>
          {!approved && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300"
              style={{
                backgroundColor: brandColors.accent,
                color: '#0A0A0A',
                opacity: approving ? 0.7 : 1,
              }}
            >
              {approving ? 'En cours...' : 'Approuver'}
            </button>
          )}
          {approved && (
            <div className="flex items-center gap-2" style={{ color: '#4ade80' }}>
              <Check size={20} />
              <span className="text-sm font-medium">Approuvé</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
