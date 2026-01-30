import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { InvoiceEditor } from './InvoiceEditor'

type Props = {
  params: Promise<{ id: string }>
}

export default async function InvoicePage({ params }: Props) {
  const { id } = await params

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

  // Serialiser les donnees pour le composant client
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

  return <InvoiceEditor initialInvoice={serializedInvoice} />
}
