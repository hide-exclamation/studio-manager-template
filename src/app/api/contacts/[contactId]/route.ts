import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/contacts/[contactId] - Met à jour un contact
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params
    const body = await request.json()
    const { name, email, phone, role, isPrimary, notes } = body

    // Récupérer le contact pour avoir le clientId
    const existingContact = await prisma.contact.findUnique({
      where: { id: contactId }
    })

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Contact non trouvé' },
        { status: 404 }
      )
    }

    // Si ce contact devient principal, retirer le flag des autres
    if (isPrimary) {
      await prisma.contact.updateMany({
        where: {
          clientId: existingContact.clientId,
          NOT: { id: contactId }
        },
        data: { isPrimary: false }
      })
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(role !== undefined && { role }),
        ...(isPrimary !== undefined && { isPrimary }),
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du contact' },
      { status: 500 }
    )
  }
}

// DELETE /api/contacts/[contactId] - Supprime un contact
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params

    await prisma.contact.delete({
      where: { id: contactId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du contact' },
      { status: 500 }
    )
  }
}
