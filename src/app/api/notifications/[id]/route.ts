import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/notifications/[id] - Marquer comme lu
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { isRead } = body

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: isRead ?? true,
        readAt: isRead !== false ? new Date() : null,
      },
    })

    return NextResponse.json({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() || null,
    })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la notification' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - Supprimer une notification
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.notification.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la notification' },
      { status: 500 }
    )
  }
}
