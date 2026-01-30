import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// GET /api/time-entries/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true }
        },
      }
    })

    if (!timeEntry) {
      return NextResponse.json(
        { error: 'Entrée de temps non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(serializeDecimal(timeEntry))
  } catch (error) {
    console.error('Error fetching time entry:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'entrée de temps' },
      { status: 500 }
    )
  }
}

// PATCH /api/time-entries/[id] - Met à jour ou arrête le timer
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { description, durationMinutes, billable, stopTimer } = body

    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Entrée de temps non trouvée' },
        { status: 404 }
      )
    }

    // Si on arrête le timer, calculer la durée
    let finalDuration = durationMinutes
    let endTime = null
    let isRunning = existingEntry.isRunning

    if (stopTimer && existingEntry.isRunning && existingEntry.startTime) {
      endTime = new Date()
      const elapsedMs = endTime.getTime() - existingEntry.startTime.getTime()
      finalDuration = Math.round(elapsedMs / 60000) // Convertir en minutes
      isRunning = false
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(finalDuration !== undefined && { durationMinutes: finalDuration }),
        ...(billable !== undefined && { billable }),
        ...(endTime && { endTime }),
        isRunning,
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
      }
    })

    return NextResponse.json(serializeDecimal(timeEntry))
  } catch (error) {
    console.error('Error updating time entry:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'entrée de temps' },
      { status: 500 }
    )
  }
}

// DELETE /api/time-entries/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.timeEntry.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'entrée de temps' },
      { status: 500 }
    )
  }
}
