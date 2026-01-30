import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/projects/[id]/tasks - Liste toutes les tâches d'un projet
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    const tasks = await prisma.projectTask.findMany({
      where: { projectId },
      orderBy: [
        { depth: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    // Sérialiser les dates
    const serializedTasks = tasks.map(t => ({
      ...t,
      dueDate: t.dueDate?.toISOString() || null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    // Construire l'arbre hiérarchique
    type SerializedTask = typeof serializedTasks[0] & { children: typeof serializedTasks }
    const taskMap = new Map(serializedTasks.map(t => [t.id, { ...t, children: [] as typeof serializedTasks }]))
    const rootTasks: SerializedTask[] = []

    for (const task of serializedTasks) {
      const taskWithChildren = taskMap.get(task.id)!
      if (task.parentId) {
        const parent = taskMap.get(task.parentId)
        if (parent) {
          parent.children.push(taskWithChildren)
        }
      } else {
        rootTasks.push(taskWithChildren)
      }
    }

    return NextResponse.json(rootTasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tâches' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/tasks - Crée une nouvelle tâche
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()
    const { title, parentId, dueDate } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Le titre est requis' },
        { status: 400 }
      )
    }

    // Calculer la profondeur
    let depth = 0
    if (parentId) {
      const parent = await prisma.projectTask.findUnique({
        where: { id: parentId },
      })
      if (!parent) {
        return NextResponse.json(
          { error: 'Tâche parente non trouvée' },
          { status: 404 }
        )
      }
      if (parent.depth >= 2) {
        return NextResponse.json(
          { error: 'Profondeur maximale atteinte (3 niveaux)' },
          { status: 400 }
        )
      }
      depth = parent.depth + 1
    }

    // Calculer le sortOrder (dernier de son niveau)
    const lastTask = await prisma.projectTask.findFirst({
      where: {
        projectId,
        parentId: parentId || null,
      },
      orderBy: { sortOrder: 'desc' },
    })
    const sortOrder = (lastTask?.sortOrder ?? -1) + 1

    const task = await prisma.projectTask.create({
      data: {
        projectId,
        parentId: parentId || null,
        title,
        dueDate: dueDate ? new Date(dueDate) : null,
        depth,
        sortOrder,
      },
    })

    return NextResponse.json({
      ...task,
      dueDate: task.dueDate?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la tâche' },
      { status: 500 }
    )
  }
}
