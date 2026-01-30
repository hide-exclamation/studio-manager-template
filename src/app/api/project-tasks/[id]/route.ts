import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/project-tasks/[id] - Récupère une tâche
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const task = await prisma.projectTask.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Tâche non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...task,
      dueDate: task.dueDate?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la tâche' },
      { status: 500 }
    )
  }
}

// PATCH /api/project-tasks/[id] - Met à jour une tâche
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, status, dueDate, sortOrder, parentId } = body

    const existingTask = await prisma.projectTask.findUnique({
      where: { id },
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Tâche non trouvée' },
        { status: 404 }
      )
    }

    const updateData: {
      title?: string
      status?: 'TODO' | 'IN_PROGRESS' | 'DONE'
      dueDate?: Date | null
      sortOrder?: number
      parentId?: string | null
      depth?: number
    } = {}

    if (title !== undefined) updateData.title = title
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    // Changement de parent (indentation)
    if (parentId !== undefined && parentId !== existingTask.parentId) {
      if (parentId === null) {
        updateData.parentId = null
        updateData.depth = 0
      } else {
        const newParent = await prisma.projectTask.findUnique({
          where: { id: parentId },
        })
        if (!newParent) {
          return NextResponse.json(
            { error: 'Nouvelle tâche parente non trouvée' },
            { status: 404 }
          )
        }
        if (newParent.depth >= 2) {
          return NextResponse.json(
            { error: 'Profondeur maximale atteinte' },
            { status: 400 }
          )
        }
        updateData.parentId = parentId
        updateData.depth = newParent.depth + 1
      }
    }

    // Changement de statut avec cascade
    if (status !== undefined && status !== existingTask.status) {
      updateData.status = status

      // Si on marque comme DONE, marquer tous les enfants comme DONE aussi
      if (status === 'DONE') {
        await prisma.projectTask.updateMany({
          where: {
            OR: [
              { parentId: id },
              {
                parent: {
                  parentId: id,
                },
              },
            ],
          },
          data: { status: 'DONE' },
        })
      }
    }

    const task = await prisma.projectTask.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      ...task,
      dueDate: task.dueDate?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la tâche' },
      { status: 500 }
    )
  }
}

// DELETE /api/project-tasks/[id] - Supprime une tâche
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Compter les enfants pour la confirmation
    const childrenCount = await prisma.projectTask.count({
      where: {
        OR: [
          { parentId: id },
          {
            parent: {
              parentId: id,
            },
          },
        ],
      },
    })

    // La suppression cascade automatiquement grâce à onDelete: Cascade
    await prisma.projectTask.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, childrenDeleted: childrenCount })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la tâche' },
      { status: 500 }
    )
  }
}
