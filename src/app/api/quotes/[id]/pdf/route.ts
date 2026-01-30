import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { launchBrowser } from '@/lib/puppeteer'
import { DEFAULTS } from '@/lib/settings'

// Simple markdown to HTML converter for PDF
function parseMarkdown(text: string): string {
  if (!text) return ''

  const lines = text.split('\n')
  const result: string[] = []
  let inList = false
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      result.push(`<ul style="margin: 0 0 8px 0; padding-left: 18px; list-style-type: disc;">${listItems.join('')}</ul>`)
      listItems = []
    }
    inList = false
  }

  const formatInline = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const bulletMatch = line.match(/^(\s*)[-•]\s+(.+)$/)

    if (bulletMatch) {
      inList = true
      const indent = bulletMatch[1].length
      const content = formatInline(bulletMatch[2])
      if (indent > 0) {
        // Sous-liste: tiret, plus d'indentation
        listItems.push(`<li style="margin-left: 18px; list-style-type: '–  ';">${content}</li>`)
      } else {
        listItems.push(`<li>${content}</li>`)
      }
    } else {
      flushList()

      const trimmed = line.trim()
      if (trimmed === '') {
        // Empty line - add spacing
        if (result.length > 0 && !result[result.length - 1].endsWith('</ul>')) {
          result.push('<br>')
        }
      } else {
        result.push(`<p style="margin-bottom: 8px;">${formatInline(trimmed)}</p>`)
      }
    }
  }

  flushList()

  return result.join('')
    .replace(/<p[^>]*><br><\/p>/g, '')
    .replace(/<br>(<ul)/g, '$1')
    .replace(/(<\/ul>)<br>/g, '$1')
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Récupérer les paramètres du studio
    const settings = await prisma.studioSettings.findUnique({
      where: { id: 'default' }
    })

    // Convertir le logo en base64 si présent
    let logoBase64: string | null = null
    if (settings?.companyLogoUrl) {
      try {
        const logoResponse = await fetch(settings.companyLogoUrl)
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer()
          const contentType = logoResponse.headers.get('content-type') || 'image/png'
          logoBase64 = `data:${contentType};base64,${Buffer.from(logoBuffer).toString('base64')}`
        }
      } catch (e) {
        console.error('Error fetching logo:', e)
      }
    }

    // Récupérer le devis pour vérifier qu'il existe et obtenir les infos
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: {
              include: {
                contacts: {
                  where: { isPrimary: true },
                  take: 1,
                }
              }
            }
          }
        },
        sections: {
          include: {
            items: {
              orderBy: { sortOrder: 'asc' }
            }
          },
          orderBy: { sortOrder: 'asc' }
        },
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    // Générer le HTML du devis
    const html = generateQuoteHtml(quote, settings, logoBase64)

    // Mode debug: retourner le HTML au lieu du PDF
    const { searchParams } = new URL(request.url)
    if (searchParams.get('debug') === 'html') {
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // Lancer Puppeteer et générer le PDF
    const browser = await launchBrowser()

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm',
      },
    })

    await browser.close()

    // Retourner le PDF
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quoteNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('PDF Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF', details: errorMessage },
      { status: 500 }
    )
  }
}

function generateQuoteHtml(quote: any, settings: any, logoBase64: string | null) {
  const projectCode = `${quote.project.client.code}-${String(quote.project.projectNumber).padStart(3, '0')}`
  const primaryContact = quote.project.client.contacts[0]

  // Infos du studio depuis les parametres ou valeurs par defaut
  const studioName = settings?.companyName || DEFAULTS.companyName
  const studioAddress = settings?.companyAddress || ''

  // Couleurs de marque depuis les settings
  const colorBackground = settings?.colorBackground || DEFAULTS.colorBackground
  const colorAccent = settings?.colorAccent || DEFAULTS.colorAccent
  const colorAccentDark = settings?.colorAccentDark || DEFAULTS.colorAccentDark

  // Calculs - prendre en compte les variantes
  const subtotal = quote.sections.reduce((sectionSum: number, section: any) => {
    return sectionSum + section.items.reduce((itemSum: number, item: any) => {
      if (!item.includeInTotal || !item.isSelected) return itemSum
      const types = item.itemTypes || [item.itemType]
      if (types.includes('FREE')) return itemSum

      if (item.billingMode === 'HOURLY' && item.hourlyRate && item.hours) {
        return itemSum + Number(item.hourlyRate) * Number(item.hours)
      }

      // Utiliser le prix de la variante si applicable
      if (item.variants && item.variants.length > 0) {
        const variantIndex = item.selectedVariant ?? 0
        const variant = item.variants[variantIndex]
        if (variant) {
          return itemSum + variant.price * item.quantity
        }
      }

      return itemSum + Number(item.unitPrice) * item.quantity
    }, 0)
  }, 0)

  // Calculer les rabais multiples
  const discounts = (quote.discounts || []) as Array<{ type: string; value: number; label: string; reason: string }>
  const discountDetails = discounts.map(d => {
    if (d.type === 'PERCENTAGE') {
      return { ...d, amount: subtotal * (d.value / 100) }
    }
    return { ...d, amount: d.value }
  })
  const totalDiscount = discountDetails.reduce((sum, d) => sum + d.amount, 0)

  const afterDiscount = subtotal - totalDiscount
  const tps = afterDiscount * Number(quote.tpsRate)
  const tvq = afterDiscount * Number(quote.tvqRate)
  const total = afterDiscount + tps + tvq
  const deposit = total * (Number(quote.depositPercent) / 100)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  const formatDate = (date: Date) =>
    date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 9pt;
          line-height: 1.5;
          color: #0A0A0A;
          background: white;
        }

        /* === HEADER === */
        .header {
          background: ${colorBackground};
          color: #0A0A0A;
          padding: 25px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(10,10,10,0.08);
        }
        .logo {
          font-family: 'Inter', sans-serif;
          font-size: 28pt;
          font-weight: 300;
          letter-spacing: -0.02em;
        }
        .header-right { text-align: right; }
        .quote-label { font-size: 8pt; color: rgba(10,10,10,0.5); text-transform: uppercase; letter-spacing: 1px; }
        .quote-number { font-size: 14pt; font-weight: 600; margin-top: 2px; color: #0A0A0A; }
        .quote-date { font-size: 8pt; color: rgba(10,10,10,0.5); margin-top: 4px; }

        /* === CLIENT INFO === */
        .client-bar {
          padding: 20px 30px;
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid rgba(10,10,10,0.08);
          font-size: 8pt;
        }
        .client-bar-label { color: rgba(10,10,10,0.5); margin-bottom: 4px; }
        .client-bar-value { font-weight: 500; color: #0A0A0A; }
        .client-bar-sub { color: rgba(10,10,10,0.6); margin-top: 2px; }

        /* === SECTION HEADER === */
        .section-header {
          padding: 20px 30px 14px;
          margin-top: 0;
          border-top: 1px solid rgba(10,10,10,0.08);
        }
        .section-number {
          font-size: 8pt;
          font-weight: 500;
          color: ${colorAccent};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .section-title {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: 18pt;
          font-weight: 400;
          color: #0A0A0A;
          margin-top: 4px;
        }
        .section-desc {
          font-size: 9pt;
          color: rgba(10,10,10,0.6);
          margin-top: 6px;
        }

        /* === TABLE HEADER === */
        .table-header {
          display: flex;
          padding: 8px 30px;
          border-bottom: 1px solid rgba(10,10,10,0.1);
          font-size: 8pt;
          font-weight: 500;
          color: rgba(10,10,10,0.5);
        }
        .th-name { flex: 1; }
        .th-qty { width: 80px; text-align: center; }
        .th-price { width: 90px; text-align: right; }

        /* === ITEM ROW === */
        .item-row {
          display: flex;
          padding: 16px 30px;
          border-bottom: 1px solid rgba(10,10,10,0.06);
          align-items: flex-start;
        }
        .item-row:last-child { border-bottom: none; }

        .item-left { flex: 1; padding-right: 20px; }
        .item-name { font-size: 10pt; font-weight: 500; line-height: 1.3; color: #0A0A0A; }
        .item-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        .badge {
          display: inline-block;
          font-size: 7pt;
          font-weight: 500;
          padding: 3px 8px;
          border-radius: 20px;
        }
        .badge-free { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
        .badge-optional { background: rgba(197, 184, 227, 0.25); color: #7c3aed; }
        .badge-selected { background: rgba(34, 197, 94, 0.12); color: #16a34a; }

        .item-description { font-size: 8pt; color: rgba(10,10,10,0.6); line-height: 1.6; margin-top: 6px; }
        .item-description p { margin-bottom: 6px; }
        .item-description p:last-child { margin-bottom: 0; }
        .item-description ul { margin: 0 0 6px 0; padding-left: 14px; }
        .item-description li { margin-bottom: 0; }
        .item-description li ul { margin-top: 0; margin-bottom: 0; }
        .item-collaborator { font-size: 8pt; color: ${colorAccentDark}; margin-top: 8px; }
        .item-variant { font-size: 8pt; color: #7c3aed; margin-top: 4px; font-weight: 500; }

        /* Google Fonts */
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;500;600&display=swap');

        .item-qty-col { width: 80px; text-align: center; font-size: 9pt; color: rgba(10,10,10,0.6); }
        .item-price-col { width: 90px; text-align: right; }
        .item-price { font-size: 10pt; font-weight: 500; color: #0A0A0A; }
        .item-price-free { color: #16a34a; }
        .item-price-na { color: rgba(10,10,10,0.3); }

        /* Item non sélectionné */
        .item-row.not-selected { opacity: 0.5; }

        /* === TOTALS === */
        .totals-section {
          background: #0A0A0A;
          color: white;
          padding: 30px;
          margin-top: 20px;
        }
        .totals-grid {
          max-width: 320px;
          margin-left: auto;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 10pt;
        }
        .total-label { opacity: 0.7; }
        .total-discount { color: ${colorAccent}; }
        .total-divider { border-top: 1px solid rgba(255,255,255,0.15); margin: 12px 0; }
        .total-final {
          font-size: 16pt;
          font-weight: 500;
        }
        .total-final .total-label {
          font-weight: 400;
          opacity: 1;
        }
        .total-deposit { color: ${colorAccent}; }

        /* === END NOTES === */
        .notes-section {
          padding: 30px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          border-top: 1px solid rgba(10,10,10,0.08);
        }
        .note-block {}
        .note-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(10,10,10,0.5); margin-bottom: 8px; font-weight: 500; }
        .note-title { font-weight: 600; font-size: 10pt; margin-bottom: 6px; color: #0A0A0A; }
        .note-content { font-size: 8pt; color: rgba(10,10,10,0.7); line-height: 1.6; }
        .note-content p { margin-bottom: 6px; }
        .note-content p:last-child { margin-bottom: 0; }
        .note-content ul { margin: 0 0 6px 0; padding-left: 14px; }
        .note-content li { margin-bottom: 0; }

        /* === FOOTER === */
        .footer {
          padding: 20px 30px;
          text-align: center;
          font-size: 8pt;
          color: rgba(10,10,10,0.5);
          border-top: 1px solid rgba(10,10,10,0.08);
        }
      </style>
    </head>
    <body>
      <!-- HEADER -->
      <div class="header">
        <div>
          ${logoBase64
            ? `<img src="${logoBase64}" alt="${studioName}" style="height: 50px; width: auto;" />`
            : `<div class="logo">${studioName}</div>`
          }
        </div>
        <div class="header-right">
          <div class="quote-label">Devis</div>
          <div class="quote-number">${quote.quoteNumber}</div>
          <div class="quote-date">${formatDate(quote.createdAt)}</div>
        </div>
      </div>

      <!-- CLIENT BAR -->
      <div class="client-bar">
        <div>
          <div class="client-bar-label">de: ${studioName}</div>
          <div class="client-bar-sub">${studioAddress}</div>
        </div>
        <div style="text-align: right;">
          <div class="client-bar-label">à: ${quote.project.client.companyName}</div>
          ${quote.project.client.address ? `<div class="client-bar-sub">${quote.project.client.address}</div>` : ''}
          ${primaryContact ? `<div class="client-bar-sub">${primaryContact.name}${primaryContact.email ? ` · ${primaryContact.email}` : ''}</div>` : ''}
        </div>
      </div>

      <!-- SECTIONS -->
      ${quote.sections.map((section: any) => `
        <!-- Section Header -->
        <div class="section-header">
          <div class="section-number">> Section ${section.sectionNumber}</div>
          <div class="section-title">${section.title}</div>
          ${section.description ? `<div class="section-desc">${section.description.split('\n')[0]}</div>` : ''}
        </div>

        <!-- Table Header -->
        <div class="table-header">
          <div class="th-name"></div>
          <div class="th-qty">Quantité</div>
          <div class="th-price">Sous-total</div>
        </div>

        <!-- Items -->
        ${section.items.map((item: any) => {
          const types = item.itemTypes || [item.itemType]
          const isFree = types.includes('FREE')
          const isALaCarte = types.includes('A_LA_CARTE')
          const isHourly = item.billingMode === 'HOURLY'
          const isSelected = item.isSelected

          let priceDisplay = ''
          let qtyDisplay = '1'

          if (isFree) {
            priceDisplay = 'Offert'
            qtyDisplay = '1'
          } else if (isHourly && item.hourlyRate && item.hours) {
            const hourlyTotal = Number(item.hourlyRate) * Number(item.hours)
            qtyDisplay = `${item.hours}h`
            priceDisplay = formatCurrency(hourlyTotal)
          } else if (item.variants && item.variants.length > 0) {
            const variantIndex = item.selectedVariant ?? 0
            const variant = item.variants[variantIndex]
            if (variant) {
              qtyDisplay = String(item.quantity)
              priceDisplay = formatCurrency(variant.price * item.quantity)
            }
          } else {
            qtyDisplay = String(item.quantity)
            priceDisplay = formatCurrency(Number(item.unitPrice) * item.quantity)
          }

          const rowClass = isALaCarte && !isSelected ? 'item-row not-selected' : 'item-row'
          const priceClass = isFree ? 'item-price item-price-free' : (isALaCarte && !isSelected ? 'item-price item-price-na' : 'item-price')

          // Badges comme sur le site
          let badge = ''
          if (isFree) badge = '<span class="badge badge-free">Offert</span>'
          else if (isALaCarte) badge = '<span class="badge badge-optional">Optionnel</span>'

          const collaboratorHtml = item.collaboratorType === 'FREELANCER' && item.collaboratorName
            ? `<div class="item-collaborator">Partenaire : ${item.collaboratorName}</div>`
            : ''

          const variantHtml = item.variants && item.variants.length > 0 && item.selectedVariant !== null
            ? `<div class="item-variant">Option: ${item.variants[item.selectedVariant]?.label || ''}</div>`
            : ''

          return `
          <div class="${rowClass}">
            <div class="item-left">
              <div class="item-name-row">
                <span class="item-name">${item.name}</span>
                ${badge}
              </div>
              ${item.description ? `<div class="item-description">${parseMarkdown(item.description)}</div>` : ''}
              ${variantHtml}
              ${collaboratorHtml}
            </div>
            <div class="item-qty-col">${qtyDisplay}</div>
            <div class="item-price-col">
              <div class="${priceClass}">${isALaCarte && !isSelected ? '—' : priceDisplay}</div>
            </div>
          </div>
          `
        }).join('')}
      `).join('')}

      <!-- TOTALS -->
      <div class="totals-section">
        <div class="totals-grid">
          <div class="total-row">
            <span class="total-label">Sous-total</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          ${discountDetails.map(d => `
            <div class="total-row">
              <span class="total-label">${d.label || 'Rabais'}${d.type === 'PERCENTAGE' ? ` (${d.value}%)` : ''}</span>
              <span class="total-discount">-${formatCurrency(d.amount)}</span>
            </div>
          `).join('')}
          <div class="total-row">
            <span class="total-label">TPS (5%)</span>
            <span>${formatCurrency(tps)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">TVQ (9,975%)</span>
            <span>${formatCurrency(tvq)}</span>
          </div>
          <div class="total-divider"></div>
          <div class="total-row total-final">
            <span class="total-label">Total du devis</span>
            <span>${formatCurrency(total)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Dépôt requis (${quote.depositPercent}%)</span>
            <span class="total-deposit">${formatCurrency(deposit)}</span>
          </div>
        </div>
      </div>

      <!-- END NOTES & TERMS -->
      ${(quote.endNotes && quote.endNotes.length > 0) || quote.paymentTerms || quote.lateFeePolicy ? `
      <div class="notes-section">
        ${quote.endNotes ? quote.endNotes.map((note: any) => `
          <div class="note-block">
            <div class="note-label">Note</div>
            ${note.title ? `<div class="note-title">${note.title}</div>` : ''}
            <div class="note-content">${parseMarkdown(note.content)}</div>
          </div>
        `).join('') : ''}
        ${quote.paymentTerms ? `
          <div class="note-block">
            <div class="note-label">Conditions de paiement</div>
            <div class="note-content">${parseMarkdown(quote.paymentTerms)}</div>
          </div>
        ` : ''}
        ${quote.lateFeePolicy ? `
          <div class="note-block">
            <div class="note-label">Politique de retard</div>
            <div class="note-content">${parseMarkdown(quote.lateFeePolicy)}</div>
          </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- FOOTER -->
      <div class="footer">
        Ce devis est valide ${quote.validUntil ? `jusqu'au ${formatDate(quote.validUntil)}` : 'pendant 30 jours'}.
      </div>
    </body>
    </html>
  `
}
