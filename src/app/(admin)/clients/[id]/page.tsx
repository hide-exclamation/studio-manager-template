import { Header } from '@/components/layout/Header'
import { ClientDetail } from './ClientDetail'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ClientPage({ params }: Props) {
  const { id } = await params

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      },
      projects: {
        include: {
          quotes: {
            select: { id: true, quoteNumber: true, status: true, total: true },
          },
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              total: true,
              amountPaid: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!client) {
    notFound()
  }

  // Sérialiser les Decimal pour le composant client
  const serializedClient = {
    ...client,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    contacts: client.contacts.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    projects: client.projects.map(p => ({
      ...p,
      startDate: p.startDate?.toISOString() || null,
      endDate: p.endDate?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      quotes: p.quotes.map(q => ({
        ...q,
        total: q.total.toString(),
      })),
      invoices: p.invoices.map(i => ({
        ...i,
        total: i.total.toString(),
        amountPaid: i.amountPaid.toString(),
      })),
    })),
  }

  return (
    <div className="min-h-screen">
      <Header title={client.companyName} subtitle={`Client ${client.code}`} />
      <ClientDetail client={serializedClient} />
    </div>
  )
}
