import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'

// GET /api/credentials/[id] - Récupère un credential avec son mot de passe déchiffré
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const credential = await prisma.credential.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    })

    if (!credential) {
      return NextResponse.json(
        { error: 'Identifiant non trouvé' },
        { status: 404 }
      )
    }

    // Déchiffrer le mot de passe
    let decryptedPassword = ''
    try {
      decryptedPassword = decrypt(credential.password)
    } catch {
      console.error('Error decrypting password for credential:', id)
      decryptedPassword = '[Erreur de déchiffrement]'
    }

    return NextResponse.json({
      ...credential,
      password: decryptedPassword,
    })
  } catch (error) {
    console.error('Error fetching credential:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'identifiant' },
      { status: 500 }
    )
  }
}

// PUT /api/credentials/[id] - Met à jour un credential
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { serviceName, serviceUrl, username, password, notes } = body

    // Récupérer l'ancien credential pour l'historique
    const oldCredential = await prisma.credential.findUnique({
      where: { id },
    })

    if (!oldCredential) {
      return NextResponse.json(
        { error: 'Identifiant non trouvé' },
        { status: 404 }
      )
    }

    // Déchiffrer l'ancien mot de passe pour comparaison
    let oldPassword = ''
    try {
      oldPassword = decrypt(oldCredential.password)
    } catch {
      // Si on ne peut pas déchiffrer, on continue quand même
    }

    // Préparer les données de mise à jour
    const updateData: {
      serviceName?: string
      serviceUrl?: string | null
      username?: string | null
      password?: string
      notes?: string | null
    } = {}

    const historyEntries: { fieldName: string; oldValue: string | null; newValue: string }[] = []

    if (serviceName !== undefined && serviceName !== oldCredential.serviceName) {
      updateData.serviceName = serviceName
      historyEntries.push({
        fieldName: 'serviceName',
        oldValue: oldCredential.serviceName,
        newValue: serviceName,
      })
    }

    if (serviceUrl !== undefined && serviceUrl !== oldCredential.serviceUrl) {
      updateData.serviceUrl = serviceUrl
      historyEntries.push({
        fieldName: 'serviceUrl',
        oldValue: oldCredential.serviceUrl,
        newValue: serviceUrl || '',
      })
    }

    if (username !== undefined && username !== oldCredential.username) {
      updateData.username = username
      historyEntries.push({
        fieldName: 'username',
        oldValue: oldCredential.username,
        newValue: username || '',
      })
    }

    if (password !== undefined && password !== oldPassword) {
      updateData.password = encrypt(password)
      // Pour l'historique, on ne stocke pas les vrais mots de passe, juste une indication
      historyEntries.push({
        fieldName: 'password',
        oldValue: '[masqué]',
        newValue: '[modifié]',
      })
    }

    if (notes !== undefined && notes !== oldCredential.notes) {
      updateData.notes = notes
      historyEntries.push({
        fieldName: 'notes',
        oldValue: oldCredential.notes,
        newValue: notes || '',
      })
    }

    // Transaction pour mettre à jour et créer l'historique
    const [credential] = await prisma.$transaction([
      prisma.credential.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          serviceName: true,
          serviceUrl: true,
          username: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      ...historyEntries.map((entry) =>
        prisma.credentialHistory.create({
          data: {
            credentialId: id,
            fieldName: entry.fieldName,
            oldValue: entry.oldValue,
            newValue: entry.newValue,
          },
        })
      ),
    ])

    return NextResponse.json(credential)
  } catch (error) {
    console.error('Error updating credential:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'identifiant' },
      { status: 500 }
    )
  }
}

// DELETE /api/credentials/[id] - Supprime un credential
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.credential.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting credential:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'identifiant' },
      { status: 500 }
    )
  }
}
