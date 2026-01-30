import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

// GET /api/clients/[id]/credentials - Liste les credentials d'un client
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params

    const credentials = await prisma.credential.findMany({
      where: { clientId },
      select: {
        id: true,
        serviceName: true,
        serviceUrl: true,
        username: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        // Ne pas retourner le mot de passe dans la liste
      },
      orderBy: { serviceName: 'asc' },
    })

    return NextResponse.json(credentials)
  } catch (error) {
    console.error('Error fetching credentials:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des identifiants' },
      { status: 500 }
    )
  }
}

// POST /api/clients/[id]/credentials - Crée un nouveau credential
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const body = await request.json()
    const { serviceName, serviceUrl, username, password, notes } = body

    if (!serviceName || !password) {
      return NextResponse.json(
        { error: 'Le nom du service et le mot de passe sont requis' },
        { status: 400 }
      )
    }

    // Chiffrer le mot de passe
    const encryptedPassword = encrypt(password)

    const credential = await prisma.credential.create({
      data: {
        clientId,
        serviceName,
        serviceUrl,
        username,
        password: encryptedPassword,
        notes,
      },
      select: {
        id: true,
        serviceName: true,
        serviceUrl: true,
        username: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(credential, { status: 201 })
  } catch (error) {
    console.error('Error creating credential:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'identifiant' },
      { status: 500 }
    )
  }
}
