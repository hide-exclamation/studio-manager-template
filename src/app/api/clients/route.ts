import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/clients - Liste tous les clients
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const clients = await prisma.client.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
            ]
          } : {},
          status ? { status: status as any } : {},
        ]
      },
      include: {
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
        projects: {
          select: { id: true, status: true }
        },
      },
      orderBy: { companyName: 'asc' },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des clients' },
      { status: 500 }
    )
  }
}

// POST /api/clients - Crée un nouveau client
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, companyName, address, businessNumber, status, googleDriveUrl, notes, contacts } = body

    // Vérifier que le code est unique
    const existingClient = await prisma.client.findUnique({
      where: { code }
    })

    if (existingClient) {
      return NextResponse.json(
        { error: 'Ce code client existe déjà' },
        { status: 400 }
      )
    }

    const client = await prisma.client.create({
      data: {
        code: code.toUpperCase(),
        companyName,
        address,
        businessNumber,
        status: status || 'PROSPECT',
        googleDriveUrl,
        notes,
        contacts: contacts?.length ? {
          create: contacts.map((contact: any, index: number) => ({
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            role: contact.role,
            isPrimary: index === 0, // Premier contact = principal
            notes: contact.notes,
          }))
        } : undefined,
      },
      include: {
        contacts: true,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du client' },
      { status: 500 }
    )
  }
}
