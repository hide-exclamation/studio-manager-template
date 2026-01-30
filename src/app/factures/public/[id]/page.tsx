import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PublicInvoiceView } from './PublicInvoiceView'

type Props = {
  params: Promise<{ id: string }>
}

async function getInvoice(token: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
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
      items: {
        orderBy: { sortOrder: 'asc' }
      },
    },
  })

  if (!invoice) {
    return null
  }

  // Sérialiser les Decimal et Date pour le composant client
  return {
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
    items: invoice.items.map(i => ({
      ...i,
      unitPrice: i.unitPrice.toString(),
      total: i.total.toString(),
    })),
  }
}

export default async function PublicInvoicePage({ params }: Props) {
  const { id: token } = await params
  const invoice = await getInvoice(token)

  if (!invoice) {
    notFound()
  }

  return <PublicInvoiceView invoice={invoice} />
}

export async function generateMetadata({ params }: Props) {
  const { id: token } = await params

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      project: {
        include: {
          client: {
            select: { companyName: true }
          }
        }
      }
    }
  })

  if (!invoice) {
    return { title: 'Facture non trouvée' }
  }

  return {
    title: `Facture ${invoice.invoiceNumber} - ${invoice.project.name}`,
    description: `Facture pour ${invoice.project.client.companyName}`,
  }
}
