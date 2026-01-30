import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/projects/next-number?clientId=xxx - Suggère le prochain numéro de projet
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId requis' },
        { status: 400 }
      )
    }

    const lastProject = await prisma.project.findFirst({
      where: { clientId },
      orderBy: { projectNumber: 'desc' },
      select: { projectNumber: true }
    })

    const nextNumber = (lastProject?.projectNumber || 0) + 1

    return NextResponse.json({ nextNumber })
  } catch (error) {
    console.error('Error fetching next project number:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du numéro' },
      { status: 500 }
    )
  }
}
