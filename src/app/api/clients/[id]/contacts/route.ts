import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/clients/[id]/contacts - Ajoute un contact
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const body = await request.json()
    const { name, email, phone, role, isPrimary, notes } = body

    // Si ce contact est principal, retirer le flag des autres
    if (isPrimary) {
      await prisma.contact.updateMany({
        where: { clientId },
        data: { isPrimary: false }
      })
    }

    const contact = await prisma.contact.create({
      data: {
        clientId,
        name,
        email,
        phone,
        role,
        isPrimary: isPrimary || false,
        notes,
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du contact' },
      { status: 500 }
    )
  }
}
