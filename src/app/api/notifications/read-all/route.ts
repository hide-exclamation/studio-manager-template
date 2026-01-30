import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/notifications/read-all - Marquer toutes les notifications comme lues
export async function POST() {
  try {
    const result = await prisma.notification.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      count: result.count,
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des notifications' },
      { status: 500 }
    )
  }
}
