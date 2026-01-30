import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { launchBrowser } from '@/lib/puppeteer'
import { DEFAULTS } from '@/lib/settings'

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

    // Récupérer la facture
    const invoice = await prisma.invoice.findUnique({
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
        quote: {
          select: { quoteNumber: true }
        },
        items: {
          orderBy: { sortOrder: 'asc' }
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      )
    }

    // Générer le HTML de la facture
    const html = generateInvoiceHtml(invoice, settings, logoBase64)

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
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
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

function generateInvoiceHtml(invoice: any, settings: any, logoBase64: string | null) {
  const projectCode = `${invoice.project.client.code}-${String(invoice.project.projectNumber).padStart(3, '0')}`
  const primaryContact = invoice.project.client.contacts[0]

  // Infos du studio depuis les parametres ou valeurs par defaut
  const studioName = settings?.companyName || DEFAULTS.companyName
  const studioAddress = settings?.companyAddress || ''
  const studioEmail = settings?.companyEmail || ''
  const studioPhone = settings?.companyPhone || ''
  const tpsNumber = settings?.tpsNumber || ''
  const tvqNumber = settings?.tvqNumber || ''

  // Couleurs de marque depuis les settings
  const colorBackground = settings?.colorBackground || DEFAULTS.colorBackground
  const colorAccent = settings?.colorAccent || DEFAULTS.colorAccent
  const colorAccentDark = settings?.colorAccentDark || DEFAULTS.colorAccentDark

  // Calculs - utiliser les taux depuis les settings
  const subtotal = invoice.items.reduce((sum: number, item: any) => sum + Number(item.total), 0)
  const tpsRate = Number(settings?.defaultTpsRate) || DEFAULTS.defaultTpsRate
  const tvqRate = Number(settings?.defaultTvqRate) || DEFAULTS.defaultTvqRate
  const tpsAmount = subtotal * tpsRate
  const tvqAmount = subtotal * tvqRate
  const lateFee = invoice.lateFeeApplied ? Number(invoice.lateFeeAmount) : 0
  const total = subtotal + tpsAmount + tvqAmount + lateFee
  const amountPaid = Number(invoice.amountPaid)
  const balanceDue = total - amountPaid

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  const formatDate = (date: Date) =>
    date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })

  const typeLabels: Record<string, string> = {
    DEPOSIT: 'Facture de dépôt',
    PARTIAL: 'Facture partielle',
    FINAL: 'Facture finale',
    STANDALONE: 'Facture',
  }

  const isPaid = invoice.status === 'PAID'
  const isOverdue = !isPaid && new Date(invoice.dueDate) < new Date()

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;500;600&display=swap');

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
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: 28pt;
          font-weight: 400;
          letter-spacing: -0.02em;
        }
        .header-right { text-align: right; }
        .invoice-label { font-size: 8pt; color: rgba(10,10,10,0.5); text-transform: uppercase; letter-spacing: 1px; }
        .invoice-number { font-size: 14pt; font-weight: 600; margin-top: 2px; color: #0A0A0A; }
        .invoice-date { font-size: 8pt; color: rgba(10,10,10,0.5); margin-top: 4px; }

        .badge {
          display: inline-block;
          font-size: 7pt;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .badge-paid { background: rgba(34, 197, 94, 0.15); color: #16a34a; }
        .badge-overdue { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
        .badge-type { background: ${colorAccent}30; color: ${colorAccentDark}; }

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

        /* === PROJECT & DUE DATE === */
        .info-bar {
          padding: 16px 30px;
          display: flex;
          justify-content: space-between;
          background: rgba(10,10,10,0.02);
          border-bottom: 1px solid rgba(10,10,10,0.08);
          font-size: 8pt;
        }
        .info-item { }
        .info-label { color: rgba(10,10,10,0.5); margin-bottom: 2px; }
        .info-value { font-weight: 500; color: #0A0A0A; }
        .info-value.overdue { color: #dc2626; }

        /* === TABLE === */
        .table-section {
          padding: 20px 30px;
        }
        .table-header {
          display: flex;
          padding: 10px 0;
          border-bottom: 1px solid rgba(10,10,10,0.1);
          font-size: 8pt;
          font-weight: 500;
          color: rgba(10,10,10,0.5);
        }
        .th-desc { flex: 1; }
        .th-qty { width: 70px; text-align: center; }
        .th-unit { width: 90px; text-align: right; }
        .th-total { width: 100px; text-align: right; }

        .item-row {
          display: flex;
          padding: 14px 0;
          border-bottom: 1px solid rgba(10,10,10,0.06);
          align-items: flex-start;
        }
        .item-row:last-child { border-bottom: none; }

        .item-desc { flex: 1; padding-right: 15px; }
        .item-desc-text { font-size: 9pt; color: #0A0A0A; white-space: pre-wrap; line-height: 1.5; }
        .item-qty { width: 70px; text-align: center; font-size: 9pt; color: rgba(10,10,10,0.6); }
        .item-unit { width: 90px; text-align: right; font-size: 9pt; color: rgba(10,10,10,0.6); }
        .item-total { width: 100px; text-align: right; font-size: 9pt; font-weight: 500; color: #0A0A0A; }

        /* === TOTALS === */
        .totals-section {
          background: #0A0A0A;
          color: white;
          padding: 30px;
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
        .total-divider { border-top: 1px solid rgba(255,255,255,0.15); margin: 12px 0; }
        .total-final {
          font-size: 16pt;
          font-weight: 500;
        }
        .total-final .total-label {
          font-weight: 400;
          opacity: 1;
        }
        .total-late-fee { color: #f87171; }
        .total-paid { color: #4ade80; }
        .total-balance { }
        .total-balance-value { color: ${colorAccent}; }
        .total-balance-paid { color: #4ade80; }

        /* === PAYMENT INFO === */
        .payment-section {
          padding: 20px 30px;
          background: rgba(34, 197, 94, 0.08);
          text-align: center;
        }
        .payment-badge {
          display: inline-block;
          background: rgba(34, 197, 94, 0.15);
          color: #16a34a;
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 9pt;
          font-weight: 500;
        }
        .payment-details {
          margin-top: 8px;
          font-size: 8pt;
          color: rgba(10,10,10,0.6);
        }

        /* === NOTES === */
        .notes-section {
          padding: 20px 30px;
          border-top: 1px solid rgba(10,10,10,0.08);
        }
        .notes-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(10,10,10,0.5); margin-bottom: 8px; font-weight: 500; }
        .notes-content { font-size: 8pt; color: rgba(10,10,10,0.7); line-height: 1.6; white-space: pre-wrap; }

        /* === FOOTER === */
        .footer {
          padding: 25px 30px;
          border-top: 1px solid rgba(10,10,10,0.08);
          display: flex;
          justify-content: space-between;
          font-size: 8pt;
          color: rgba(10,10,10,0.5);
        }
        .footer-left { }
        .footer-right { text-align: right; }
        .footer-tax { margin-bottom: 2px; }
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
          <div class="invoice-label">${typeLabels[invoice.invoiceType] || 'Facture'}</div>
          <div class="invoice-number">${invoice.invoiceNumber}</div>
          <div class="invoice-date">${formatDate(invoice.issueDate)}</div>
          ${isPaid ? '<div class="badge badge-paid">Payée</div>' : isOverdue ? '<div class="badge badge-overdue">En retard</div>' : ''}
        </div>
      </div>

      <!-- CLIENT BAR -->
      <div class="client-bar">
        <div>
          <div class="client-bar-label">De</div>
          <div class="client-bar-value">${studioName}</div>
          <div class="client-bar-sub">${studioAddress}</div>
          ${studioEmail ? `<div class="client-bar-sub">${studioEmail}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <div class="client-bar-label">Facturer à</div>
          <div class="client-bar-value">${invoice.project.client.companyName}</div>
          ${invoice.project.client.address ? `<div class="client-bar-sub">${invoice.project.client.address}</div>` : ''}
          ${primaryContact ? `<div class="client-bar-sub">${primaryContact.name}${primaryContact.email ? ` · ${primaryContact.email}` : ''}</div>` : ''}
        </div>
      </div>

      <!-- INFO BAR -->
      <div class="info-bar">
        <div class="info-item">
          <div class="info-label">Projet</div>
          <div class="info-value">${invoice.project.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Référence</div>
          <div class="info-value">${projectCode}</div>
        </div>
        ${invoice.quote ? `
        <div class="info-item">
          <div class="info-label">Devis</div>
          <div class="info-value">${invoice.quote.quoteNumber}</div>
        </div>
        ` : ''}
        <div class="info-item">
          <div class="info-label">Échéance</div>
          <div class="info-value ${isOverdue && !isPaid ? 'overdue' : ''}">${formatDate(invoice.dueDate)}</div>
        </div>
      </div>

      <!-- TABLE -->
      <div class="table-section">
        <div class="table-header">
          <div class="th-desc">Description</div>
          <div class="th-qty">Qté</div>
          <div class="th-unit">Prix unit.</div>
          <div class="th-total">Total</div>
        </div>

        ${invoice.items.map((item: any) => `
          <div class="item-row">
            <div class="item-desc">
              <div class="item-desc-text">${item.description}</div>
            </div>
            <div class="item-qty">${item.quantity}</div>
            <div class="item-unit">${formatCurrency(Number(item.unitPrice))}</div>
            <div class="item-total">${formatCurrency(Number(item.total))}</div>
          </div>
        `).join('')}
      </div>

      <!-- TOTALS -->
      <div class="totals-section">
        <div class="totals-grid">
          <div class="total-row">
            <span class="total-label">Sous-total</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">TPS (5%)</span>
            <span>${formatCurrency(tpsAmount)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">TVQ (9,975%)</span>
            <span>${formatCurrency(tvqAmount)}</span>
          </div>
          ${lateFee > 0 ? `
            <div class="total-row">
              <span class="total-late-fee">Frais de retard (2%)</span>
              <span class="total-late-fee">${formatCurrency(lateFee)}</span>
            </div>
          ` : ''}
          <div class="total-divider"></div>
          <div class="total-row total-final">
            <span class="total-label">Total</span>
            <span>${formatCurrency(total)}</span>
          </div>
          ${amountPaid > 0 ? `
            <div class="total-row">
              <span class="total-label">Montant payé</span>
              <span class="total-paid">− ${formatCurrency(amountPaid)}</span>
            </div>
            <div class="total-row total-balance">
              <span class="total-label" style="font-weight: 500;">Solde dû</span>
              <span class="${balanceDue <= 0 ? 'total-balance-paid' : 'total-balance-value'}">${formatCurrency(Math.max(0, balanceDue))}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- PAYMENT INFO (if paid) -->
      ${isPaid ? `
        <div class="payment-section">
          <div class="payment-badge">✓ Facture payée</div>
          ${invoice.paymentDate ? `
            <div class="payment-details">
              Payée le ${formatDate(invoice.paymentDate)}${invoice.paymentMethod ? ` par ${invoice.paymentMethod.toLowerCase()}` : ''}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- NOTES -->
      ${invoice.notes ? `
        <div class="notes-section">
          <div class="notes-label">Notes</div>
          <div class="notes-content">${invoice.notes}</div>
        </div>
      ` : ''}

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-left">
          ${!isPaid ? 'Payable à réception. Merci de votre confiance.' : 'Merci de votre confiance.'}
        </div>
        <div class="footer-right">
          ${tpsNumber ? `<div class="footer-tax">TPS: ${tpsNumber}</div>` : ''}
          ${tvqNumber ? `<div class="footer-tax">TVQ: ${tvqNumber}</div>` : ''}
        </div>
      </div>
    </body>
    </html>
  `
}
