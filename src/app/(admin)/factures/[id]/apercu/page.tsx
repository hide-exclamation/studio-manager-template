import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { InvoicePreview } from './InvoicePreview'

type Props = {
  params: Promise<{ id: string }>
}

export default async function InvoicePreviewPage({ params }: Props) {
  const { id } = await params

  // Récupérer les paramètres du studio
  const settings = await prisma.studioSettings.findUnique({
    where: { id: 'default' }
  })

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
        select: { id: true, quoteNumber: true, depositPercent: true }
      },
      items: {
        orderBy: { sortOrder: 'asc' }
      },
    },
  })

  if (!invoice) {
    notFound()
  }

  // Serialiser pour le client
  const serializedInvoice = {
    ...invoice,
    subtotal: invoice.subtotal.toString(),
    tpsAmount: invoice.tpsAmount.toString(),
    tvqAmount: invoice.tvqAmount.toString(),
    total: invoice.total.toString(),
    amountPaid: invoice.amountPaid.toString(),
    lateFeeAmount: invoice.lateFeeAmount.toString(),
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    paymentDate: invoice.paymentDate?.toISOString() || null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    quote: invoice.quote ? {
      ...invoice.quote,
      depositPercent: invoice.quote.depositPercent.toString(),
    } : null,
    items: invoice.items.map(i => ({
      ...i,
      unitPrice: i.unitPrice.toString(),
      total: i.total.toString(),
    })),
  }

  const serializedSettings = settings ? {
    companyName: settings.companyName,
    companyLogoUrl: settings.companyLogoUrl,
    companyAddress: settings.companyAddress,
    companyEmail: settings.companyEmail,
    companyPhone: settings.companyPhone,
    tpsNumber: settings.tpsNumber,
    tvqNumber: settings.tvqNumber,
  } : null

  return <InvoicePreview invoice={serializedInvoice} settings={serializedSettings} />
}
