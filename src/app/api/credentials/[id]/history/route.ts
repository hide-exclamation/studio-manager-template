import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/credentials/[id]/history - Récupère l'historique des modifications
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: credentialId } = await params

    const history = await prisma.credentialHistory.findMany({
      where: { credentialId },
      orderBy: { changedAt: 'desc' },
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching credential history:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique' },
      { status: 500 }
    )
  }
}
