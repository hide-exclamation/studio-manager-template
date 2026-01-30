import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// GET /api/time-entries - Liste les entrées de temps
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const isRunning = searchParams.get('isRunning')

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(isRunning === 'true' && { isRunning: true }),
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(serializeDecimal(timeEntries))
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des entrées de temps' },
      { status: 500 }
    )
  }
}

// POST /api/time-entries - Crée une entrée de temps ou démarre un timer
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, description, durationMinutes, billable = true, startTimer = false } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId est requis' },
        { status: 400 }
      )
    }

    // Vérifier qu'il n'y a pas déjà un timer en cours
    if (startTimer) {
      const runningTimer = await prisma.timeEntry.findFirst({
        where: { isRunning: true }
      })

      if (runningTimer) {
        return NextResponse.json(
          { error: 'Un timer est déjà en cours. Arrêtez-le avant d\'en démarrer un nouveau.' },
          { status: 400 }
        )
      }
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        projectId,
        description,
        durationMinutes: startTimer ? 0 : (durationMinutes || 0),
        billable,
        isRunning: startTimer,
        startTime: startTimer ? new Date() : null,
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
      }
    })

    return NextResponse.json(serializeDecimal(timeEntry), { status: 201 })
  } catch (error) {
    console.error('Error creating time entry:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'entrée de temps' },
      { status: 500 }
    )
  }
}
