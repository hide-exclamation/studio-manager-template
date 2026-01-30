import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/clients/[id] - Récupère un client avec tous ses détails
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        contacts: {
          orderBy: [
            { isPrimary: 'desc' },
            { name: 'asc' }
          ]
        },
        emailPreferences: true,
        projects: {
          include: {
            quotes: {
              select: { id: true, quoteNumber: true, status: true, total: true }
            },
            invoices: {
              select: { id: true, invoiceNumber: true, status: true, total: true, amountPaid: true }
            },
          },
          orderBy: { createdAt: 'desc' }
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du client' },
      { status: 500 }
    )
  }
}

// PATCH /api/clients/[id] - Met à jour un client
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, companyName, address, businessNumber, status, googleDriveUrl, notes, emailPreferences, contacts } = body

    // Si le code change, vérifier qu'il est unique
    if (code) {
      const existingClient = await prisma.client.findFirst({
        where: {
          code: code.toUpperCase(),
          NOT: { id }
        }
      })

      if (existingClient) {
        return NextResponse.json(
          { error: 'Ce code client existe déjà' },
          { status: 400 }
        )
      }
    }

    // Mettre à jour le client
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(companyName && { companyName }),
        ...(address !== undefined && { address }),
        ...(businessNumber !== undefined && { businessNumber }),
        ...(status && { status }),
        ...(googleDriveUrl !== undefined && { googleDriveUrl }),
        ...(notes !== undefined && { notes }),
      },
    })

    // Mettre à jour les préférences d'email si fournies
    if (emailPreferences) {
      await prisma.clientEmailPreferences.upsert({
        where: { clientId: id },
        create: {
          clientId: id,
          quoteSend: emailPreferences.quoteSend ?? true,
          quoteApproved: emailPreferences.quoteApproved ?? true,
          invoiceSend: emailPreferences.invoiceSend ?? true,
          invoiceReminder1: emailPreferences.invoiceReminder1 ?? true,
          invoiceReminder2: emailPreferences.invoiceReminder2 ?? true,
          invoiceOverdue: emailPreferences.invoiceOverdue ?? true,
          paymentReceived: emailPreferences.paymentReceived ?? true,
        },
        update: {
          quoteSend: emailPreferences.quoteSend,
          quoteApproved: emailPreferences.quoteApproved,
          invoiceSend: emailPreferences.invoiceSend,
          invoiceReminder1: emailPreferences.invoiceReminder1,
          invoiceReminder2: emailPreferences.invoiceReminder2,
          invoiceOverdue: emailPreferences.invoiceOverdue,
          paymentReceived: emailPreferences.paymentReceived,
        },
      })
    }

    // Mettre à jour les contacts si fournis
    if (contacts && Array.isArray(contacts)) {
      // Récupérer les contacts existants
      const existingContacts = await prisma.contact.findMany({
        where: { clientId: id }
      })
      const existingContactIds = existingContacts.map(c => c.id)

      // IDs des contacts à garder (ceux qui ont un id dans le body)
      const contactIdsToKeep = contacts.filter(c => c.id).map(c => c.id)

      // Supprimer les contacts qui ne sont plus dans la liste
      const contactsToDelete = existingContactIds.filter(id => !contactIdsToKeep.includes(id))
      if (contactsToDelete.length > 0) {
        await prisma.contact.deleteMany({
          where: { id: { in: contactsToDelete } }
        })
      }

      // Mettre à jour ou créer les contacts
      for (const contact of contacts) {
        if (contact.id && existingContactIds.includes(contact.id)) {
          // Mettre à jour le contact existant
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              name: contact.name,
              email: contact.email || null,
              phone: contact.phone || null,
              role: contact.role || null,
              isPrimary: contact.isPrimary,
              notes: contact.notes || null,
            }
          })
        } else {
          // Créer un nouveau contact
          await prisma.contact.create({
            data: {
              clientId: id,
              name: contact.name,
              email: contact.email || null,
              phone: contact.phone || null,
              role: contact.role || null,
              isPrimary: contact.isPrimary,
              notes: contact.notes || null,
            }
          })
        }
      }
    }

    // Récupérer le client mis à jour avec ses contacts et préférences
    const updatedClient = await prisma.client.findUnique({
      where: { id },
      include: { contacts: true, emailPreferences: true }
    })

    return NextResponse.json(updatedClient)
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du client' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Supprime un client
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Vérifier si le client a des projets
    const client = await prisma.client.findUnique({
      where: { id },
      include: { projects: { select: { id: true } } }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    if (client.projects.length > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un client avec des projets. Archivez-le plutôt.' },
        { status: 400 }
      )
    }

    await prisma.client.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du client' },
      { status: 500 }
    )
  }
}
