import { Header } from '@/components/layout/Header'
import { ClientForm } from '../../ClientForm'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      },
      emailPreferences: true,
    },
  })

  if (!client) {
    notFound()
  }

  // Transformer les données pour le formulaire
  const initialData = {
    id: client.id,
    code: client.code,
    companyName: client.companyName,
    address: client.address || '',
    businessNumber: client.businessNumber || '',
    status: client.status,
    googleDriveUrl: client.googleDriveUrl || '',
    notes: client.notes || '',
    emailPreferences: client.emailPreferences ? {
      quoteSend: client.emailPreferences.quoteSend,
      quoteApproved: client.emailPreferences.quoteApproved,
      invoiceSend: client.emailPreferences.invoiceSend,
      invoiceReminder1: client.emailPreferences.invoiceReminder1,
      invoiceReminder2: client.emailPreferences.invoiceReminder2,
      invoiceOverdue: client.emailPreferences.invoiceOverdue,
      paymentReceived: client.emailPreferences.paymentReceived,
    } : {
      quoteSend: true,
      quoteApproved: true,
      invoiceSend: true,
      invoiceReminder1: true,
      invoiceReminder2: true,
      invoiceOverdue: true,
      paymentReceived: true,
    },
    contacts: client.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      role: c.role || '',
      isPrimary: c.isPrimary,
      notes: c.notes || '',
    })),
  }

  return (
    <div className="min-h-screen">
      <Header
        title={`Modifier ${client.companyName}`}
        subtitle={`Client ${client.code}`}
      />
      <ClientForm initialData={initialData} isEditing />
    </div>
  )
}
