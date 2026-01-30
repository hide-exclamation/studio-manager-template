import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/projects - Liste tous les projets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const clientId = searchParams.get('clientId') || ''

    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
        { client: { code: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (status) {
      whereClause.status = status
    }

    if (clientId) {
      whereClause.clientId = clientId
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        client: {
          select: { id: true, code: true, companyName: true }
        },
        category: true,
        quotes: {
          select: { id: true, status: true, total: true }
        },
        invoices: {
          select: { id: true, status: true, total: true, amountPaid: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(projects)
  } catch (error: any) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des projets', details: error?.message },
      { status: 500 }
    )
  }
}

// POST /api/projects - Crée un nouveau projet
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clientId, categoryId, projectNumber: providedNumber, name, description, status, startDate, endDate, googleDriveUrl } = body

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    // Utiliser le numéro fourni ou en générer un
    let projectNumber = providedNumber

    if (!projectNumber) {
      const lastProject = await prisma.project.findFirst({
        where: { clientId },
        orderBy: { projectNumber: 'desc' },
        select: { projectNumber: true }
      })
      projectNumber = (lastProject?.projectNumber || 0) + 1
    } else {
      // Vérifier que le numéro n'existe pas déjà pour ce client
      const existingProject = await prisma.project.findUnique({
        where: {
          clientId_projectNumber: { clientId, projectNumber }
        }
      })

      if (existingProject) {
        return NextResponse.json(
          { error: `Le projet ${client.code}-${String(projectNumber).padStart(3, '0')} existe déjà` },
          { status: 400 }
        )
      }
    }

    const project = await prisma.project.create({
      data: {
        clientId,
        categoryId: categoryId || null,
        projectNumber,
        name,
        description,
        status: status || 'PROSPECT',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        googleDriveUrl,
      },
      include: {
        client: {
          select: { id: true, code: true, companyName: true }
        },
        category: true,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du projet' },
      { status: 500 }
    )
  }
}
