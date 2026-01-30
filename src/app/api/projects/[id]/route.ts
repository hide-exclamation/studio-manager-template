import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/projects/[id] - Récupère un projet avec tous ses détails
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            contacts: {
              where: { isPrimary: true },
              take: 1,
            }
          }
        },
        category: true,
        quotes: {
          orderBy: { createdAt: 'desc' }
        },
        invoices: {
          orderBy: { createdAt: 'desc' }
        },
        projectTasks: {
          orderBy: { sortOrder: 'asc' }
        },
        timeEntries: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du projet' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id] - Met à jour un projet
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, status, categoryId, startDate, endDate, googleDriveUrl } = body

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(googleDriveUrl !== undefined && { googleDriveUrl }),
      },
      include: {
        client: {
          select: { id: true, code: true, companyName: true }
        },
        category: true,
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du projet' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Supprime un projet
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Vérifier si le projet existe et compter les éléments associés
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        quotes: { select: { id: true } },
        invoices: { select: { id: true } },
        projectTasks: { select: { id: true } },
        timeEntries: { select: { id: true } }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      )
    }

    const hasAssociatedData = project.quotes.length > 0 || project.invoices.length > 0

    // Si pas de force et a des données associées, demander confirmation
    if (!force && hasAssociatedData) {
      return NextResponse.json(
        {
          error: 'Ce projet contient des devis ou factures.',
          requiresConfirmation: true,
          counts: {
            quotes: project.quotes.length,
            invoices: project.invoices.length,
            projectTasks: project.projectTasks.length,
            timeEntries: project.timeEntries.length
          }
        },
        { status: 400 }
      )
    }

    // Supprimer le projet (les relations en cascade seront supprimées automatiquement)
    await prisma.project.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du projet' },
      { status: 500 }
    )
  }
}
