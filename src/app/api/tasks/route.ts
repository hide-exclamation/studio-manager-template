import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const projectId = searchParams.get('projectId')
    const sortBy = searchParams.get('sortBy') || 'dueDate'

    const where: {
      status?: 'TODO' | 'IN_PROGRESS' | 'DONE'
      projectId?: string
    } = {}

    if (status && ['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
      where.status = status as 'TODO' | 'IN_PROGRESS' | 'DONE'
    }

    if (projectId) {
      where.projectId = projectId
    }

    const tasks = await prisma.projectTask.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
            client: {
              select: {
                code: true,
              },
            },
          },
        },
      },
      orderBy: sortBy === 'dueDate'
        ? [{ dueDate: 'asc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }],
    })

    // Serialize dates
    const serializedTasks = tasks.map(task => ({
      ...task,
      dueDate: task.dueDate?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      projectCode: `${task.project.client.code}-${String(task.project.projectNumber).padStart(3, '0')}`,
    }))

    return NextResponse.json(serializedTasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tâches' },
      { status: 500 }
    )
  }
}
